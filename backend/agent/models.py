from django.db import models
from django.conf import settings
import uuid

class AIRequestLog(models.Model):
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_id = models.CharField(max_length=100, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_requests')
    conversation = models.ForeignKey('conversations.Conversation', on_delete=models.CASCADE, related_name='ai_requests')
    provider = models.CharField(max_length=50)
    model = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    latency = models.FloatField(help_text="Latency in seconds", null=True, blank=True)
    fallback_from = models.CharField(max_length=50, null=True, blank=True)
    error_type = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.provider} ({self.model}) - {self.status}"
