import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.tools import tool
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from utils import read_file, AgentState, json_serial
from langchain_mistralai import ChatMistralAI
from datetime import datetime
from executeSQL import execute_sql
import json


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOTENV_PATH = os.path.join(BASE_DIR, '.env')

try:
    if os.path.exists(DOTENV_PATH):
        load_dotenv(dotenv_path=DOTENV_PATH)
    api_key = os.getenv("MISTRAL_API_KEY")
    model_name = os.getenv("MODEL_NAME")
    sql_prompt = os.getenv("SQL_PROMPT")
    db_structure = os.getenv("DB_STRUCTURE")
    answer_prompt = os.getenv("ANSWER_PROMPT")
    checkpoints_path = os.getenv("CHECKPOINTS_DB_FILEPATH")
except Exception as e:
    print(f"Ошибка загрузки переменных окружения: {e}")
    exit(1)



class SQLAgent:
    def __init__(self):
        try:
            self._llm = ChatMistralAI(
                model_name=model_name,
                api_key=api_key,
            )
        except Exception as ex:
            print(f"Ошибка инициализации модели: {ex}")
            raise

        self.generate_sql_tool = tool(self._generate_sql)
        self.execute_sql = tool(execute_sql)
        self.pretty_answer_tool = tool(self._pretty_answer)
        self.agent = self._build_agent()

    def _build_agent(self):
        graph_builder = StateGraph(AgentState)
        graph_builder.add_node("generate_sql", self._call_generate_sql_node)
        graph_builder.add_node("execute_sql", self._call_execute_sql_node)
        graph_builder.add_node("pretty_answer", self._call_pretty_answer_node)

        graph_builder.set_entry_point("generate_sql")
        graph_builder.add_edge("generate_sql", "execute_sql")
        graph_builder.add_edge("execute_sql", "pretty_answer")
        graph_builder.add_edge("pretty_answer", END)

        try:
            conn = sqlite3.connect(checkpoints_path, check_same_thread=False)
            checkpointer = SqliteSaver(conn=conn)
            agent = graph_builder.compile(checkpointer=checkpointer)
        except Exception as ex:
            print(f"Ошибка при работе с SQLite: {ex}")
            raise
        return agent

    def run(self, user_id : int, query : str, time : datetime):
        initial_state = {
            "messages": [HumanMessage(content=query)],
            "user_query": query,
            "user_id": user_id,
            "time": time,
            "generated_sql": None,
            "db_result": None,
            "final_answer": None
        }
        config = {"configurable": {"thread_id": user_id}}
        try:
            result = self.agent.invoke(initial_state, config=config)
            final_answer = result.get("final_answer", [])
            return final_answer
        except Exception as ex:
            print(f"Ошибка при вызове agent.invoke: {ex}")
            return []


    def _generate_sql(self, user_id : int, user_query : str, query_time : datetime) -> str:
        """
        This tool gets user's query and \n
        converts it into a PostgresQL query.
        """
        system_template = read_file(sql_prompt)
        db_tables = read_file(db_structure)
        full_system_template = (f"{system_template} \n структура базы данных:\n {db_tables} \n "
                                f"Обрати внимание на структуру базы данных при генерации sql запроса."
                                f"ЕСЛИ пользователь упоминает НЕСУЩЕСТВУЮЩИЕ сущности или таблицы, верни пустую строку."
                                f"ИНАЧЕ вернуть нужно ТОЛЬКО один sql запрос, ничего лишнего")
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", full_system_template,),
                ("human", "{user_id}, {user_query}, {query_time}"),
            ]
        )
        chain = prompt | self._llm | StrOutputParser()
        try:
            response = chain.invoke({"user_id": user_id, "user_query" : user_query, "query_time" : query_time})
            return response
        except Exception as ex:
            print(f"Ошибка при генерации sql запроса: {ex}")
            return ""

    def _call_generate_sql_node(self, state : AgentState) -> AgentState:
        try:
            user_id = state["user_id"]
            user_query = state["user_query"]
            query_time = state["time"]
            response = self.generate_sql_tool.invoke({"user_id": user_id, "user_query" : user_query, "query_time" : query_time})
            return {
                "messages": [AIMessage(content="Выполнена генерация sql запроса")],
                "generated_sql": response,
            }
        except Exception as ex:
            print(f"Ошибка при вызове _generate_sql: {ex}")
            return {
                "messages": [AIMessage(content="Попытка генерации sql запроса")],
                "generated_sql" : None,
            }



    def _call_execute_sql_node(self, state : AgentState) -> AgentState:
        sql_query = state["generated_sql"]
        if isinstance(sql_query, str):
            sql_query = sql_query.strip()
            if sql_query.startswith("```sql"):
                sql_query = sql_query.strip("```sql").strip("```").strip()
        try:
            full_response = self.execute_sql.invoke({"sql_query" : sql_query})
            if full_response["success"]:
                response_data = full_response.get("result")
            else:
                error_msg = f"Ошибка БД: {full_response.get('error', 'Неизвестная ошибка')}"
                print(f"Ошибка при выполнении SQL: {error_msg}")
                return {
                    "messages": [AIMessage(content=f"SQL запрос не выполнен. {error_msg}")],
                    "db_result": None,
                    "final_answer": "Извините, произошла ошибка при обращении к базе данных. Попробуйте изменить запрос или проверить на корректность."
                }
            return {
                "messages": [AIMessage(content="sql запрос выполнен")],
                "db_result" : response_data
            }
        except Exception as ex:
            print(f"Ошибка при вызове execute_sql: {ex}")
            return {
                "messages": [AIMessage(content="Попытка выполнить sql запрос")],
                "db_result" : None,
                "final_answer": "Извините, произошла ошибка при обращении к базе данных. Попробуйте изменить запрос или проверить на корректность."
            }

    def _pretty_answer(self, user_query : str, data : str) -> str:
        """
        This tool generates an answer for a user's query based on data from database. \n
        It gets user's query and data from database as a list of strings
        """
        system_template = read_file(answer_prompt)
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_template),
                ("human", "{user_query}, {data}"),
            ]
        )
        chain = prompt | self._llm | StrOutputParser()
        try:
            response = chain.invoke({"user_query" : user_query, "data" : data})
            return response
        except Exception as ex:
            print(f"Ошибка при формировании красивого ответа: {ex}")
            return ""

    def _call_pretty_answer_node(self, state : AgentState) -> AgentState:
        try:
            user_query = state["user_query"]
            data = state["db_result"]
            if data is None:
                return {
                    "messages": [AIMessage(content="Ошибка при генерации понятного ответа")],
                    "final_answer": "Извините, произошла ошибка при обращении к базе данных. Попробуйте изменить запрос или проверить на корректность.",
                }
            data_string = json.dumps(
                data,
                ensure_ascii=False,
                indent=2,
                default=json_serial
            )
            pretty_answer = self.pretty_answer_tool.invoke({"user_query": user_query, "data" : data_string})
            return {
                "messages": [AIMessage(content="Выполнена генерация понятного ответа")],
                "final_answer" : pretty_answer,
            }
        except Exception as ex:
            print(f"Ошибка при вызове _pretty_answer: {ex}")
            return {
                "messages": [AIMessage(content="Попытка генерации понятного ответа")],
                "final_answer" : None
            }