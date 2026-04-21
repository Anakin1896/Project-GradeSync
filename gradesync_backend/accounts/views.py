from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import User, UserSettings
from .serializers import UserSerializer, UserSettingsSerializer
from core.models import AcademicTerm
from datetime import date

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request):
        
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserSettingsView(APIView):
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        settings, created = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request):
        settings, created = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()

            school_year_str = request.data.get('active_school_year')
            if school_year_str:
                AcademicTerm.objects.get_or_create(
                    school_year=school_year_str,
                    defaults={
                        'term_type': 'Semester',
                        'name': school_year_str,
                        'start_date': date.today(),
                        'end_date': date.today(),
                        'is_active': True
                    }
                )
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class FirstLoginPasswordResetView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        new_password = request.data.get('new_password')

        if not new_password:
            return Response({'error': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.is_first_login = False 
        user.save()

        return Response({'message': 'Password updated successfully.'}, status=status.HTTP_200_OK)