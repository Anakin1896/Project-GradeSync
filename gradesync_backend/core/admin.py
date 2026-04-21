from django.contrib import admin
from .models import Department, AcademicTerm, Program, Subject, Period

admin.site.register(Department)
admin.site.register(AcademicTerm)
admin.site.register(Program)
admin.site.register(Subject)
admin.site.register(Period)