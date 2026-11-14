VIBRATION_PATTERNS = {
    "temperature_increase": {
        "label": "Temperature increasing",
        "pattern": [150, 100, 150]
    },
    "temperature_decrease": {
        "label": "Temperature decreasing",
        "pattern": [80, 80, 80, 80, 80]
    },
    "heavy_rainfall": {
        "label": "Heavy rainfall",
        "pattern": [300, 120, 300]
    },
    "forest_loss": {
        "label": "Forest loss",
        "pattern": [100, 100, 100, 100, 100]
    },
    "stable": {
        "label": "No significant change",
        "pattern": [100]
    }
}


def get_vibration_pattern(event_type: str):
    """
    Return vibration instructions for an Earth event.
    """

    event = VIBRATION_PATTERNS.get(event_type)

    if event is None:
        raise ValueError("Unknown Earth event type.")

    return {
        "event": event_type,
        "label": event["label"],
        "pattern_ms": event["pattern"],
        "unit": "milliseconds"
    }