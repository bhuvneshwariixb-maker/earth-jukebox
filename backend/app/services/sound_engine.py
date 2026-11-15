
import io
import math
import wave
from array import array


def generate_wav(sound_records):
    """
    Convert sonification parameters into a playable WAV audio file.

    Temperature controls pitch.
    Rainfall influences note duration.
    """

    if not sound_records:
        raise ValueError("No sound records available.")

    if len(sound_records) > 500:
        raise ValueError("Too many sound records.")

    sample_rate = 22050
    audio_samples = array("h")

    for record in sound_records:

        frequency = float(record["frequency_hz"])
        duration = float(record["duration_seconds"])

        if not math.isfinite(frequency) or not math.isfinite(duration):
            raise ValueError("Invalid audio parameters.")

        if not 20 <= frequency <= 20000:
            raise ValueError("Frequency is outside the supported range.")

        if not 0.05 <= duration <= 5:
            raise ValueError("Duration is outside the supported range.")

        total_samples = int(sample_rate * duration)

        fade_samples = min(
            int(sample_rate * 0.01),
            total_samples // 2
        )

        for i in range(total_samples):

            # Smooth beginning and ending
            envelope = 1.0

            if fade_samples > 0:
                envelope = min(
                    1.0,
                    i / fade_samples,
                    (total_samples - 1 - i) / fade_samples
                )

            # Generate a sine wave
            amplitude = float(record.get("amplitude",0.25))*envelope

            sample = amplitude * math.sin(
                2 * math.pi * frequency * i / sample_rate
            )

            audio_samples.append(int(sample * 32767))

    # Convert generated samples into a WAV file
    audio_buffer = io.BytesIO()

    with wave.open(audio_buffer, "wb") as wav_file:

        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        wav_file.writeframes(audio_samples.tobytes())

    audio_buffer.seek(0)

    return audio_buffer.getvalue()
