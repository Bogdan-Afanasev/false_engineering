import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.tools import tool
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END
from utils import read_file, AgentState
from langchain_mistralai import ChatMistralAI


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOTENV_PATH = os.path.join(BASE_DIR, 'agent', 'resources', '.env')

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
        self.pretty_answer_tool = tool(self._pretty_answer)
        self.agent = self._build_agent()

    def _build_agent(self):
        graph_builder = StateGraph(AgentState)
        graph_builder.add_node("generate_sql", self._call_generate_sql_node)
        graph_builder.add_node("pretty_answer", self._call_pretty_answer_node)

        graph_builder.set_entry_point("generate_sql")
        graph_builder.add_edge("generate_sql", "pretty_answer")
        graph_builder.add_edge("pretty_answer", END)

        try:
            conn = sqlite3.connect(checkpoints_path, check_same_thread=False)
            checkpointer = SqliteSaver(conn=conn)
            agent = graph_builder.compile(checkpointer=checkpointer)
        except Exception as ex:
            print(f"Ошибка при работе с SQLite: {ex}")
            raise
        return agent

    def run(self, request: dict):
        user_id, query = list(request.items())[0]
        initial_state = {
            "messages": [HumanMessage(content=query)],
            "user_query": query,
            "user_id": user_id,
            "current_result": "",
            "data": ""
        }
        config = {"configurable": {"thread_id": user_id}}
        try:
            result = self.agent.invoke(initial_state, config=config)
            message_ids = result.get("current_search_results", [])
            return message_ids
        except Exception as ex:
            print(f"Ошибка при вызове agent.invoke: {ex}")
            return []


    def _generate_sql(self, user_query : str) -> str:
        """
        This tool gets user's query and \n
        converts it into a PostgresQL query.
        """
        system_template = read_file(sql_prompt)
        db_tables = read_file(db_structure)
        full_system_template = f"{system_template}. This is database structure:\n {db_tables}"
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", full_system_template,),
                ("human", "{user_query}"),
            ]
        )
        chain = prompt | self._llm | StrOutputParser()
        try:
            response = chain.invoke({"user_query" : user_query})
            return response
        except Exception as ex:
            print(f"Ошибка при генерации sql запроса: {ex}")
            return ""

    def _call_generate_sql_node(self, state : AgentState) -> AgentState:
        try:
            user_query = state["user_query"]
            response = self.generate_sql_tool.invoke({"user_query" : user_query})
            print(f"_call_generate_sql_node: {response}")
            return {
                "current_result": response,
            }
        except Exception as ex:
            print(f"Ошибка при вызове _generate_sql: {ex}")
            return {
                "current_result" : "",
            }

    def _pretty_answer(self, user_query : str, data : str) -> str:
        """
        This tool generates an answer for a user's query based on data from database
        """
        system_template = read_file(answer_prompt)
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_template),
                ("human", "{user_query},{data}"),
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
            data = state["data"]
            pretty_answer = self.pretty_answer_tool.invoke({"user_query": user_query, "data" : data})
            return {
                "current_result" : pretty_answer,
            }
        except Exception as ex:
            print(f"Ошибка при вызове _pretty_answer: {ex}")
            return {
                "current_result" : ""
            }