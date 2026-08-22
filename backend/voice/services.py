from django.conf import settings
from io import BytesIO
import tempfile
import os

def speech_to_text(audio_file):
    """Convert audio file to text using local Whisper"""
    try:
        import whisper
        # Load small model (downloads to ~/.cache/whisper on first run)
        model = whisper.load_model("base")
        
        # Save uploaded file to temp file to process
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            for chunk in audio_file.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name
            
        result = model.transcribe(temp_path)
        os.remove(temp_path)
        return result["text"]
    except Exception as e:
        print(f"STT Error: {e}")
        return None

def text_to_speech(text):
    """Convert text to speech audio using gTTS (free Google TTS)"""
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang='en', slow=False)
        fp = BytesIO()
        tts.write_to_fp(fp)
        return fp.getvalue()
    except Exception as e:
        print(f"TTS Error: {e}")
        return None
