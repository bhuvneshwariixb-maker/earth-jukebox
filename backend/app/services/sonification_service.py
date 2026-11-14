def convert_climate_to_sound(records):
    sound_records = []

    for record in records:
        temperature = record["temperature_celsius"]
        rainfall = record["rainfall_mm"]

        if temperature is None or rainfall is None:
            continue

        # Temperature controls musical pitch
        normalized_temp = max(0, min(temperature, 40))
        frequency = 220 + (normalized_temp / 40) * 660

        # Rainfall controls sound duration
        normalized_rain = max(0, min(rainfall, 50))
        duration = 0.2 + (normalized_rain / 50) * 1.3

        sound_records.append({
            "date": record["date"],
            "frequency_hz": round(frequency, 2),
            "duration_seconds": round(duration, 2),
            "temperature_celsius": temperature,
            "rainfall_mm": rainfall
        })

    return {
        "sonification_method": "Temperature-to-pitch and rainfall-to-duration",
        "sound_records": sound_records
    }