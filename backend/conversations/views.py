from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Strict user isolation
        return Conversation.objects.filter(user=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def chat(self, request, pk=None):
        conversation = self.get_object()
        user_message_content = request.data.get('message')
        
        if not user_message_content:
            return Response({"error": "Message content is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Save User Message
        user_msg = Message.objects.create(
            conversation=conversation,
            role='user',
            content=user_message_content
        )

        # 2. Call AI Agent
        from agent.services import process_chat_message
        ai_response_content = process_chat_message(request.user, conversation, user_message_content)

        # 3. Save Assistant Message
        ai_msg = Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_response_content
        )

        # 4. Extract Memories (Background)
        import threading
        from memory.extractor import extract_memories
        from memory.manager import process_memory_actions

        def extract_and_save():
            actions = extract_memories(request.user, conversation, user_message_content)
            if actions:
                process_memory_actions(request.user, actions, source_message=user_msg)

        threading.Thread(target=extract_and_save).start()

        return Response({
            "user_message": MessageSerializer(user_msg).data,
            "assistant_message": MessageSerializer(ai_msg).data
        })

    @action(detail=True, methods=['post'])
    def stream(self, request, pk=None):
        from django.http import StreamingHttpResponse
        import json
        conversation = self.get_object()
        user_message_content = request.data.get('message')
        
        if not user_message_content:
            return Response({"error": "Message content is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Save User Message
        user_msg = Message.objects.create(
            conversation=conversation,
            role='user',
            content=user_message_content
        )

        # 2. Call AI Agent in Streaming Mode
        from agent.services import process_chat_message
        ai_response_generator = process_chat_message(request.user, conversation, user_message_content, stream=True)

        def event_stream():
            full_content = ""
            try:
                for chunk in ai_response_generator:
                    full_content += chunk
                    # Server-Sent Events (SSE) format
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                
                # Save final message and extract memory
                ai_msg = Message.objects.create(
                    conversation=conversation,
                    role='assistant',
                    content=full_content
                )
                
                # Extract Memories
                import threading
                from memory.extractor import extract_memories
                from memory.manager import process_memory_actions

                def extract_and_save():
                    actions = extract_memories(request.user, conversation, user_message_content)
                    if actions:
                        process_memory_actions(request.user, actions, source_message=user_msg)

                threading.Thread(target=extract_and_save).start()
                
            except Exception as e:
                error_msg = f"\n[Stream Error: {str(e)}]"
                yield f"data: {json.dumps({'chunk': error_msg})}\n\n"
            
            yield "data: [DONE]\n\n"

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        return response

