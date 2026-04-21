from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    employee_id = models.CharField(unique=True, max_length=20, null=True, blank=True)
    role = models.CharField(max_length=20)

    title_prefix = models.CharField(max_length=10, null=True, blank=True) 
    middle_initial = models.CharField(max_length=5, null=True, blank=True) 
    position_title = models.CharField(max_length=100, null=True, blank=True)
    school_name = models.CharField(max_length=200, default="Mabini Colleges.Inc")
    department = models.ForeignKey('core.Department', on_delete=models.SET_NULL, null=True, blank=True)
    is_first_login = models.BooleanField(default=True)

    def __str__(self):
        prefix = f"{self.title_prefix} " if self.title_prefix else ""
        mi = f"{self.middle_initial} " if self.middle_initial else ""
        return f"{prefix}{self.first_name} {mi}{self.last_name} ({self.employee_id})"

class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    notifications_enabled = models.BooleanField(default=True)
    active_school_year = models.CharField(max_length=100, default="2025-2026")
    grading_system = models.CharField(max_length=50, default="75 (Standard)")
    language = models.CharField(max_length=20, default="English (PH)")

    def __str__(self):
        return f"Settings for {self.user.last_name}"