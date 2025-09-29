from typing import List, Annotated, TypedDict, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pathlib import Path
import os
from datetime import datetime

def get_filepath(filename, current_dir=Path(__file__).parent.resolve()):
    for root, dirs, files in os.walk(current_dir):
        if filename in files:
            return str(Path(root) / filename)
    return None

def read_file(filename):
    try:
        filepath = get_filepath(filename)
        with open(filepath, "r", encoding="utf-8") as f:
            prompt = f.read()
            return prompt
    except FileNotFoundError:
        print(f"Файл '{filename}' не был найден.")
        return ""
    except Exception as e:
        print("Ошибка при чтении файла:", e)
        return ""


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages] # сообщения о работе агента
    user_query: str
    user_id: int
    time: datetime
    generated_sql: Optional[str]
    db_result: Optional[str]
    final_answer: Optional[str]
