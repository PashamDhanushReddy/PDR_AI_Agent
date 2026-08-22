from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserMemoryViewSet

router = DefaultRouter()
router.register(r'', UserMemoryViewSet, basename='memory')

urlpatterns = [
    path('', include(router.urls)),
]
