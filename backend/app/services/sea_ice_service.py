import csv
import io
from datetime import date

import requests


SEA_ICE_URLS = {
    "north": (
        "https://noaadata.apps.nsidc.org/NOAA/G02135/"
        "north/daily/data/N_seaice_extent_daily_v4.0.csv"
    ),
    "south": (
        "https://noaadata.apps.nsidc.org/NOAA/G02135/"
        "south/daily/data/S_seaice_extent_daily_v4.0.csv"
    ),
}


def get_sea_ice_data(
    hemisphere: str,
    start_date: date,
    end_date: date
):
    hemisphere = hemisphere.lower().strip()

    if hemisphere not in SEA_ICE_URLS:
        raise ValueError("Hemisphere must be 'north' or 'south'.")

    if start_date > end_date:
        raise ValueError("Start date cannot be after end date.")

    url = SEA_ICE_URLS[hemisphere]

    response = requests.get(url, timeout=30)
    response.raise_for_status()

    csv_text = response.content.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(csv_text))

    # Find the actual column header, ignoring any introductory lines.
    header_found = False

    for row in reader:
        if row and row[0].strip().lower() == "year":
            header_found = True
            break

    if not header_found:
        raise ValueError("Could not find the Sea Ice CSV header.")

    # The next row contains units, not measurements.
    next(reader, None)

    records = []

    for row in reader:
        if len(row) < 5:
            continue

        try:
            year = int(row[0].strip())
            month = int(row[1].strip())
            day = int(row[2].strip())

            record_date = date(year, month, day)

            if record_date < start_date or record_date > end_date:
                continue

            extent = float(row[3].strip())
            missing = float(row[4].strip())

            if extent < 0:
                continue

            records.append({
                "date": record_date.isoformat(),
                "extent_million_sq_km": extent,
                "missing_million_sq_km": missing
            })

        except (ValueError, IndexError):
            continue

    return {
        "source": "NSIDC Sea Ice Index Version 4",
        "hemisphere": hemisphere,
        "unit": "million square kilometres",
        "records": records
    }