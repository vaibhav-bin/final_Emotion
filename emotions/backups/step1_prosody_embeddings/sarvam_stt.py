import os

from sarvamai import SarvamAI


client = None

def get_sarvam_client():
    global client
    if client is not None:
        return client

    api_key = os.environ.get("SARVAM_API_KEY")
    if not api_key:
        raise RuntimeError("SARVAM_API_KEY environment variable is not set. Please set your Sarvam API key.")

    client = SarvamAI(api_subscription_key=api_key)
    return client


def transcribe_audio(
    audio_path: str,
    language_code: str = "unknown",
    mode: str = "transcribe",
):
    sarvam_client = get_sarvam_client()
    with open(audio_path, "rb") as audio_file:
        response = sarvam_client.speech_to_text.transcribe(
            file=audio_file,
            model="saaras:v3",
            language_code=language_code,
            mode=mode,
        )

    return {
        "transcript": response.transcript,
        "language_code": response.language_code,
        "request_id": response.request_id,
    }