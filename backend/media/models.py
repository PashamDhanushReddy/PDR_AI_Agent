import uuid
from django.db import models
from django.conf import settings

class Media(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='media')
    public_id = models.CharField(max_length=255, unique=True)
    secure_url = models.URLField(max_length=1000)
    media_type = models.CharField(max_length=50) # e.g., 'image/png'
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.media_type} - {self.public_id}"

    class Meta:
        verbose_name_plural = "Media Files"
