from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Using email as the primary identifier if needed, though username is kept by AbstractUser
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=255, blank=True)
    
    def __str__(self):
        return self.email
