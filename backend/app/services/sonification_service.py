
def convert_climate_to_sound(records, dataset="temperature"):
    if dataset not in ("temperature", "rain"):
        raise ValueError(
            "This dataset does not have a connected real-data source yet."
        )

    sound_records = []

    for record in records:
        temperature = record["temperature_celsius"]
        rainfall = record["rainfall_mm"]

        if dataset == "temperature":
            if temperature is None:
                continue

            # Higher temperature produces a higher pitch.
            normalized_temp = max(0, min(temperature, 40))
            frequency = 220 + (normalized_temp / 40) * 660

            sound_records.append({
                "date": record["date"],
                "frequency_hz": round(frequency, 2),
                "duration_seconds": 0.35,
                "amplitude": 0.25,
                "temperature_celsius": temperature,
            })

        elif dataset == "rain":
            if rainfall is None:
                continue

            # Rainfall intensity controls volume and note duration.
            normalized_rain = max(0, min(rainfall, 50))

            sound_records.append({
                "date": record["date"],
                "frequency_hz": 300,
                "duration_seconds": round(
                    0.15 + (normalized_rain / 50) * 0.85, 2
                ),
                "amplitude": round(
                    (normalized_rain / 50) * 0.25, 4
                ),
                "rainfall_mm": rainfall,
            })

    return {
        "sonification_method": (
            "Temperature-to-pitch"
            if dataset == "temperature"
            else "Rainfall-to-volume-and-duration"
        ),
        "dataset": dataset,
        "sound_records": sound_records,
    }
