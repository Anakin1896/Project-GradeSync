from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserSettings

class CustomUserAdmin(UserAdmin):

    fieldsets = UserAdmin.fieldsets + (
        ('School Profile', {
            'fields': (
                'title_prefix', 
                'middle_initial', 
                'employee_id', 
                'role', 
                'position_title', 
                'department', 
                'school_name'
            )
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('School Profile', {
            'fields': (
                'title_prefix', 
                'middle_initial', 
                'employee_id', 
                'role', 
                'position_title', 
                'department', 
                'school_name'
            )
        }),
    )

    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'department']

admin.site.register(User, CustomUserAdmin)
admin.site.register(UserSettings)