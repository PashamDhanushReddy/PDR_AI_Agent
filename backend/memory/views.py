from rest_framework import viewsets, permissions
from .models import UserMemory
from .serializers import UserMemorySerializer

class UserMemoryViewSet(viewsets.ModelViewSet):
    serializer_class = UserMemorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Strict user isolation, showing only active memories by default
        # The frontend can explicitly request inactive if needed, but usually we filter
        status_filter = self.request.query_params.get('status', 'active')
        return UserMemory.objects.filter(user=self.request.user, status=status_filter).order_by('-importance', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from langchain_core.messages import SystemMessage, HumanMessage
from agent.services import get_chat_model
import json

# Minimal prompt for extracting memories from documents
DOC_EXTRACTOR_PROMPT = """
You are a memory extraction assistant. Analyze the provided document about the User.
Extract long-term, durable information. Focus on: preferences, skills, goals, background, identity, and important facts.
Return a JSON array of extracted facts matching this schema exactly:
[
  {
    "action": "create",
    "content": "Detailed fact about the user",
    "category": "preference|skill|goal|project|personal|other",
    "importance": 1-10
  }
]
If there is no useful information, return []. Always return ONLY valid JSON.
"""

class UploadMemoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        filename = uploaded_file.name.lower()
        extracted_text = ""

        try:
            if filename.endswith('.txt') or filename.endswith('.csv'):
                extracted_text = uploaded_file.read().decode('utf-8', errors='replace')
            elif filename.endswith('.pdf'):
                import PyPDF2
                reader = PyPDF2.PdfReader(uploaded_file)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"
            else:
                return Response({"error": "Unsupported file format. Please upload TXT or PDF."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Failed to read file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        if not extracted_text.strip():
            return Response({"error": "File is empty or contains no readable text."}, status=status.HTTP_400_BAD_REQUEST)

        # Truncate text if it's too long (e.g., limit to ~50k chars for reasonable processing)
        extracted_text = extracted_text[:50000]

        # Extract memory using LLM
        messages = [
            SystemMessage(content=DOC_EXTRACTOR_PROMPT),
            HumanMessage(content=f"Document:\n{extracted_text}\nExtract memories.")
        ]
        
        llm = get_chat_model()
        try:
            response = llm.invoke(messages)
            content_raw = response.content
            
            if isinstance(content_raw, list):
                content = "".join([item.get("text", "") if isinstance(item, dict) else str(item) for item in content_raw]).strip()
            else:
                content = str(content_raw).strip()

            if content.startswith("```json"):
                content = content.replace("```json", "", 1).replace("```", "").strip()
            elif content.startswith("```"):
                content = content.replace("```", "", 1).strip()
            actions = json.loads(content)
            
            # Save the actions to the database
            memories_added = 0
            for action in actions:
                if action.get("action") == "create" and action.get("content"):
                    UserMemory.objects.create(
                        user=request.user,
                        content=action["content"],
                        category=action.get("category", "other"),
                        importance=action.get("importance", 5)
                    )
                    memories_added += 1
                    
            return Response({"success": f"Extracted {memories_added} memories successfully."})
        except Exception as e:
            print(f"File memory extraction error: {e}")
            return Response({"error": "Failed to process memories from file."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
