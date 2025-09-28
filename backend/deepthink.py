from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_mistralai import ChatMistralAI
from pathlib import Path
import os

class DeepThink:
    def __init__(self, model_name, api_key, full_prompt_file):
        llm = ChatMistralAI(model_name=model_name, api_key=api_key)
        full_prompt = Path(full_prompt_file).read_text(encoding="utf-8")
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", full_prompt),
                ("human", "{query}")
            ]
        )
        self._chain = prompt | llm | StrOutputParser()

    def to_sql(self, user_query: str) -> str:
        """
        Converts natural language into an SQL query
        """
        return self._chain.invoke({"query": user_query})


if __name__ == "__main__":
    import dotenv
    dotenv.load_dotenv()
    api_key = os.getenv("MISTRAL_API_KEY")
    model_name = os.getenv("MODEL_NAME")
    deepthink = DeepThink(model_name, api_key, "first_prompt.txt")

    while True:
        q = input("Введите запрос: ")
        print(deepthink.to_sql(q))
