from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deepthink import DeepThink
from executeSQL import execute_sql
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SQL Chat Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("MISTRAL_API_KEY")
model_name = os.getenv("MODEL_NAME")
deepthink = DeepThink(model_name, api_key, "first_prompt.txt")

class QueryRequest(BaseModel):
    query: str

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
    try:
        sql_query = deepthink.to_sql(req.query)
        result = execute_sql(sql_query)
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}