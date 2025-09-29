from typing import List, Annotated, TypedDict, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pathlib import Path
import os
from datetime import datetime
from decimal import Decimal

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


def json_serial(obj):
    """Сериализатор для объектов, не поддерживаемых json (например, datetime и Decimal)."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages] # сообщения о работе агента
    user_query: str
    user_id: int
    time: datetime
    generated_sql: Optional[str]
    db_result: Optional[List[str]]
    final_answer: Optional[str]
