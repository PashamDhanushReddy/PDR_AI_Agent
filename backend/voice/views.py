from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework import permissions, status
from django.http import HttpResponse
from .services import speech_to_text, text_to_speech

class SpeechToTextView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({"error": "Audio file is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        text = speech_to_text(audio_file)
        if text:
            return Response({"text": text})
        return Response({"error": "Failed to process audio"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TextToSpeechView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        text = request.data.get('text')
        if not text:
            return Response({"error": "Text is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        audio_content = text_to_speech(text)
        if audio_content:
            response = HttpResponse(audio_content, content_type='audio/mpeg')
            response['Content-Disposition'] = 'attachment; filename="response.mp3"'
            return response
        return Response({"error": "Failed to generate speech"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
