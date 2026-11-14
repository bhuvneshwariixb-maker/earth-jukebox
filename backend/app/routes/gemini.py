
from fastapi import APIRouter, HTTPException

from app.services.gemini_service import create_live_token

router = APIRouter(
    prefix="/api/gemini",
    tags=["Gemini Voice Assistant"]
)


@router.post("/live-token")
def get_live_token():
    try:
        return create_live_token()

    except RuntimeError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to create Gemini Live session token."
        )
