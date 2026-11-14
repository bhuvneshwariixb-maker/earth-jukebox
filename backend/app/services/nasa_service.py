
import requests
from datetime import date

NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"


def get_climate_data(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date
):
    # Validate the requested date range
    if start_date > end_date:
        raise ValueError("Start date must be before end date.")

    if end_date > date.today():
        raise ValueError("Future dates are not supported.")

    # NASA POWER API parameters
    params = {
        "parameters": "T2M,PRECTOTCORR",
        "community": "RE",
        "longitude": longitude,
        "latitude": latitude,
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "format": "JSON",
        "time-standard": "UTC"
    }

    response = requests.get(
        NASA_POWER_URL,
        params=params,
        timeout=30
    )

    response.raise_for_status()

    result = response.json()

    parameters = result["properties"]["parameter"]

    temperature = parameters["T2M"]
    rainfall = parameters["PRECTOTCORR"]

    dates = sorted(temperature.keys())

    climate_records = []

    for day in dates:
        temp = temperature[day]
        rain = rainfall.get(day)

        climate_records.append({
            "date": day,
            "temperature_celsius": (
                None if temp is None or temp == -999 else temp
            ),
            "rainfall_mm": (
                None if rain is None or rain == -999 else rain
            )
        })

    return {
        "source": "NASA POWER",
        "latitude": latitude,
        "longitude": longitude,
        "units": {
            "temperature": "Celsius",
            "rainfall": "mm/day"
        },
        "records": climate_records
    }
