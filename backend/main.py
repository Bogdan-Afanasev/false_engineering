from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deepthink import DeepThink
from executeSQL import execute_sql
import os
from datetime import datetime
from dotenv import load_dotenv
from sql_agent import SQLAgent

try:
    GLOBAL_SQL_AGENT = SQLAgent()
except Exception as e:
    print(f"FATAL: Не удалось инициализировать SQLAgent: {e}")
    GLOBAL_SQL_AGENT = None

load_dotenv()

app = FastAPI(title="SQL Chat Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#api_key = os.getenv("MISTRAL_API_KEY")
#model_name = os.getenv("MODEL_NAME")
#deepthink = DeepThink(model_name, api_key, "first_prompt.txt")

class QueryRequest(BaseModel):
    query: str
    username: str | None = None

class LoginRequest(BaseModel):
    username: str

@app.post("/auth/login")
def login_user(req: LoginRequest):
    try:
        sql_query = f"SELECT * FROM users WHERE username = '{req.username}' AND is_active = true"
        result = execute_sql(sql_query)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail="Database error")
            
        if not result["result"]:
            raise HTTPException(status_code=404, detail="User not found")
            
        user_data = result["result"][0]
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
def run_query(req: QueryRequest):
    if GLOBAL_SQL_AGENT is None:
        raise HTTPException(status_code=500, detail="SQL Agent not initialized")

    try:
        user_id = None
        if req.username:
            user_query = f"SELECT id FROM users WHERE username = '{req.username}' AND is_active = true"
            user_result = execute_sql(user_query)
            if user_result["success"] and user_result["result"]:
                user_id = user_result["result"][0]["id"]
        
        current_time = datetime.now()
        #sql_query = deepthink.to_sql(req.query)
        #db_result = execute_sql(sql_query)

        result = GLOBAL_SQL_AGENT.run(user_id, req.query, current_time)
        print("FINAL RESULT IN RUN QUERY")
        print(result)
        return {
            "success" : True,
            "result" : result
        }


    except Exception as ex:
        print(f"ОШИБКА В RUN QUERY: {ex}")
        return {
            "success": False, 
            "error": str(ex)
        }