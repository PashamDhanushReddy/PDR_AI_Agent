from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserMemoryViewSet, UploadMemoryView

router = DefaultRouter()
router.register(r'list', UserMemoryViewSet, basename='memory')

urlpatterns = [
    path('upload/', UploadMemoryView.as_view(), name='memory-upload'),
    path('', include(router.urls)),
]
