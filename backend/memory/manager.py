from django.conf import settings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pgvector.django import L2Distance
from .models import UserMemory

def get_embeddings_model():
    api_key = settings.GEMINI_API_KEY if hasattr(settings, 'GEMINI_API_KEY') else 'dummy_key'
    return GoogleGenerativeAIEmbeddings(
        google_api_key=api_key,
        model="models/gemini-embedding-001"
    )

def generate_embedding(text):
    try:
        model = get_embeddings_model()
        return model.embed_query(text)
    except Exception as e:
        print(f"Embedding error: {e}")
        return None

def process_memory_actions(user, actions, source_message=None):
    for action_item in actions:
        action_type = action_item.get('action')
        content = action_item.get('content')
        category = action_item.get('category', 'other')
        importance = action_item.get('importance', 5)
        
        if action_type == 'create':
            embedding = generate_embedding(content)
            if embedding:
                UserMemory.objects.create(
                    user=user,
                    content=content,
                    category=category,
                    importance=importance,
                    embedding=embedding,
                    source_message=source_message
                )
        
        elif action_type == 'update':
            keyword = action_item.get('old_content_keyword')
            if keyword:
                # Semantic search to find the closest memory to update
                query_embedding = generate_embedding(keyword)
                if query_embedding:
                    # Find closest active memory
                    memory = UserMemory.objects.filter(user=user, status='active').order_by(
                        L2Distance('embedding', query_embedding)
                    ).first()
                    
                    if memory:
                        memory.status = 'inactive'
                        memory.save()
                        
                        # Create new updated memory
                        new_embedding = generate_embedding(content)
                        if new_embedding:
                            UserMemory.objects.create(
                                user=user,
                                content=content,
                                category=category,
                                importance=importance,
                                embedding=new_embedding,
                                source_message=source_message
                            )

        elif action_type == 'delete':
            keyword = action_item.get('old_content_keyword')
            if keyword:
                query_embedding = generate_embedding(keyword)
                if query_embedding:
                    memory = UserMemory.objects.filter(user=user, status='active').order_by(
                        L2Distance('embedding', query_embedding)
                    ).first()
                    if memory:
                        memory.status = 'inactive'
                        memory.save()

def retrieve_relevant_memories(user, query_text, limit=5):
    query_embedding = generate_embedding(query_text)
    if not query_embedding:
        return []
        
    # Retrieve top K similar active memories
    memories = UserMemory.objects.filter(user=user, status='active').order_by(
        L2Distance('embedding', query_embedding)
    )[:limit]
    
    # Update access count
    for m in memories:
        m.access_count += 1
        m.save(update_fields=['access_count'])
        
    return [m.content for m in memories]
