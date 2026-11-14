
from fastapi import FastAPI
from app.routes import nasa

app = FastAPI(
    title="Earth Jukebox API",
    description="NASA Earth Science Data and Sonification Backend",
    version="1.0.0"
)

app.include_router(nasa.router)


@app.get("/")
def home():
    return {
        "app": "Earth Jukebox",
        "message": "Welcome to Earth Jukebox!",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "app": "Earth Jukebox"
    }
