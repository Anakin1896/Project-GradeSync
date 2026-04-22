from rest_framework import serializers
from .models import User, UserSettings
from grading.models import ClassSchedule

class UserSerializer(serializers.ModelSerializer):
    department = serializers.StringRelatedField()
    subjects_handled = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 
            'employee_id', 'role', 'department',
            'title_prefix', 'middle_initial', 'position_title', 'school_name',
            'is_first_login'
            'subjects_handled'
        ]

    def get_subjects_handled(self, obj):
        return ClassSchedule.objects.filter(teacher=obj, is_active=True).count()

class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ['notifications_enabled', 'active_school_year', 'grading_system', 'language']