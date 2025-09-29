from dotenv import load_dotenv
import os
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

def execute_sql(sql_query: str):
    """
    This function execute sql query
    """
    try:
        conn = psycopg2.connect(
            dbname=os.environ.get("POSTGRES_DB"),
            user=os.environ.get("POSTGRES_USER"),
            password=os.environ.get("POSTGRES_PASSWORD"),
            host=os.environ.get("POSTGRES_HOST"),
            port=os.environ.get("POSTGRES_PORT")
        )
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql_query)

        if cur.description:
            rows = cur.fetchall()
            result = [dict(row) for row in rows]
        else:
            conn.commit()
            result = {"status": "OK", "affected_rows": cur.rowcount}

        cur.close()
        conn.close()
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    while True:
        q = input("Введите SQL: ")
        print(execute_sql(q))