from rest_framework import serializers
from .models import UserMemory

class UserMemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserMemory
        fields = ('id', 'content', 'category', 'importance', 'status', 'access_count', 'created_at', 'updated_at')
        read_only_fields = ('id', 'access_count', 'created_at', 'updated_at')
