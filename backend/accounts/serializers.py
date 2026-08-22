from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'display_name', 'password', 'date_joined')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # We use email as the username for AbstractUser
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            display_name=validated_data.get('display_name', '')
        )
        return user
