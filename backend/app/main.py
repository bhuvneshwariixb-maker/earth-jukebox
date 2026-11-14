
from fastapi import FastAPI
from app.routes import nasa, gemini

app = FastAPI(
    title="Earth Jukebox API",
    description="NASA Earth Science Data, Sonification and Gemini Voice Assistant",
    version="1.1.0"
)

app.include_router(nasa.router)
app.include_router(gemini.router)


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

