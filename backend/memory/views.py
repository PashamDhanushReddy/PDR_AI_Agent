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
