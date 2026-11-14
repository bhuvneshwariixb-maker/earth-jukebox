
from app.services.vibration_service import get_vibration_pattern
from io import BytesIO
from fastapi.responses import StreamingResponse

from app.services.sound_engine import generate_wav
import requests
from datetime import date
from fastapi import APIRouter, HTTPException, Query

from app.services.nasa_service import get_climate_data

router = APIRouter(
    prefix="/api/nasa",
    tags=["NASA Earth Data"]
)


@router.get("/climate")
def climate_data(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    start_date: date = Query(...),
    end_date: date = Query(...)
):
    try:
        data = get_climate_data(
            latitude=latitude,
            longitude=longitude,
            start_date=start_date,
            end_date=end_date
        )

        return data

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve data from NASA POWER."
        )

    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=502,
            detail="Unexpected response received from NASA."
        )

from app.services.sonification_service import convert_climate_to_sound


@router.get("/sonify")
def sonify_climate(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    start_date: date = Query(...),
    end_date: date = Query(...)
):
    try:
        climate_data = get_climate_data(
            latitude=latitude,
            longitude=longitude,
            start_date=start_date,
            end_date=end_date
        )

        sound_data = convert_climate_to_sound(
            climate_data["records"]
        )

        return {
            "location": {
                "latitude": latitude,
                "longitude": longitude
            },
            "source": climate_data["source"],
            "sonification": sound_data
        }

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve NASA data."
        )

@router.get("/sonify/audio")
def generate_climate_audio(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    start_date: date = Query(...),
    end_date: date = Query(...)
):
    try:
        climate_data = get_climate_data(
            latitude=latitude,
            longitude=longitude,
            start_date=start_date,
            end_date=end_date
        )

        sound_data = convert_climate_to_sound(
            climate_data["records"]
        )

        audio_bytes = generate_wav(
            sound_data["sound_records"]
        )

        return StreamingResponse(
            BytesIO(audio_bytes),
            media_type="audio/wav",
            headers={
                "Content-Disposition":
                    'attachment; filename="earth_jukebox.wav"'
            }
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve NASA data."
        )
@router.get("/haptics")
def get_haptics(
    event_type: str = Query(...)
):
    try:
        return {
            "accessibility": "haptic_feedback",
            "haptics": get_vibration_pattern(event_type)
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

