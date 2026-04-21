from django.contrib import admin
from .models import ClassSchedule, TeacherSchedule, Enrollment, Attendance, GradingComponent, Assessment, StudentScore

admin.site.register(ClassSchedule)
admin.site.register(TeacherSchedule)
admin.site.register(Enrollment)
admin.site.register(Attendance)
admin.site.register(GradingComponent)
admin.site.register(Assessment)
admin.site.register(StudentScore)