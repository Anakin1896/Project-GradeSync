from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'departments', views.DepartmentViewSet)
router.register(r'academic-terms', views.AcademicTermViewSet)
router.register(r'programs', views.ProgramViewSet)
router.register(r'subjects', views.SubjectViewSet)
router.register(r'periods', views.PeriodViewSet)

urlpatterns = [
    path('', include(router.urls)),
]