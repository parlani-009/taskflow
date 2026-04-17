from fastapi import FastAPI
from uvicorn import Server, Config

app = FastAPI()


if __name__ == "__main__":
    server = Server(Config("app.main:app", host="0.0.0.0", port=8000))
    server.run()