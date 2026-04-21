from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'grading-templates', views.GradingTemplateViewSet, basename='grading-template')
router.register(r'period-grades', views.PeriodGradeViewSet, basename='period-grade')
router.register(r'class-schedules', views.ClassScheduleViewSet)
router.register(r'teacher-schedules', views.TeacherScheduleViewSet)
router.register(r'enrollments', views.EnrollmentViewSet)
router.register(r'attendances', views.AttendanceViewSet)
router.register(r'grading-components', views.GradingComponentViewSet)
router.register(r'assessments', views.AssessmentViewSet)
router.register(r'student-scores', views.StudentScoreViewSet)

urlpatterns = [

    path('quick-enroll/', views.QuickEnrollView.as_view(), name='quick-enroll'),
    path('available-students/', views.AvailableStudentsView.as_view(), name='available-students'),
    path('available-subjects/', views.AvailableSubjectsView.as_view(), name='available-subjects'),
    path('class-activities/<int:class_id>/', views.ClassActivitiesView.as_view(), name='class-activities'),
    path('activity-scores/<int:assessment_id>/', views.ActivityScoringView.as_view(), name='activity-scores'),
    path('class-attendance/<int:class_id>/', views.ClassAttendanceView.as_view(), name='class-attendance'),
    path('class-attendance-summary/<int:class_id>/', views.ClassAttendanceSummaryView.as_view(), name='class-attendance-summary'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('schedule/<int:schedule_id>/', views.ScheduleManageView.as_view(), name='manage-schedule'),
    path('events/', views.EventListView.as_view(), name='events-list'),
    path('events/<int:event_id>/', views.EventDetailView.as_view(), name='event-detail'),
    path('class-components/<str:class_id>/', views.ClassComponentsView.as_view(), name='class-components'),
    path('student-breakdown/<str:class_id>/<str:student_number>/<str:period_name>/', views.StudentPeriodBreakdownView.as_view(), name='student-breakdown'),
    path('notifications/', views.NotificationView.as_view(), name='notifications'),
    path('', include(router.urls)),
]