from django.contrib import admin
from .models import UserMemory

@admin.register(UserMemory)
class UserMemoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'category', 'importance', 'status', 'access_count', 'created_at')
    list_filter = ('status', 'category')
    search_fields = ('content', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
