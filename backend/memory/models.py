import uuid
from django.db import models
from django.conf import settings
from pgvector.django import VectorField

class UserMemory(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memories')
    content = models.TextField()
    category = models.CharField(max_length=100)
    importance = models.IntegerField(default=5)
    
    # gemini-embedding-001 uses 3072 dimensions
    embedding = VectorField(dimensions=3072, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # We reference the message that generated this memory (optional, could be deleted)
    source_message = models.ForeignKey('conversations.Message', on_delete=models.SET_NULL, null=True, blank=True)
    
    access_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "User Memories"
        indexes = [
            # In PostgreSQL, this requires creating the extension pgvector first
            # We'll need a migration to execute 'CREATE EXTENSION IF NOT EXISTS vector'
        ]

    def __str__(self):
        return f"{self.user.email} - {self.category} - {self.content[:30]}"
