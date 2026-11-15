
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


def convert_sea_ice_to_sound(records):
    sound_records = []
    previous_extent = None

    for record in records:
        extent = record.get("extent_million_sq_km")

        if extent is None:
            continue

        extent = float(extent)

        if extent < 0:
            continue

        # Higher sea-ice extent produces a higher pitch.
        normalized_extent = max(0, min(extent, 20))
        frequency = 220 + (normalized_extent / 20) * 660

        # Daily change controls note duration.
        if previous_extent is None:
            change = 0
        else:
            change = abs(extent - previous_extent)

        duration = 0.20 + min(change / 0.25, 1) * 0.60

        sound_records.append({
            "date": record["date"],
            "frequency_hz": round(frequency, 2),
            "duration_seconds": round(duration, 2),
            "amplitude": 0.20,
            "extent_million_sq_km": extent,
            "daily_change_million_sq_km": round(change, 3),
        })

        previous_extent = extent

    return {
        "sonification_method": "Sea-Ice-Extent-to-Pitch-and-Change",
        "dataset": "sea_ice",
        "sound_records": sound_records,
    }
