from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import FirstLoginPasswordResetView, UserSettingsView, UserProfileView

router = DefaultRouter()
router.register(r'users', views.UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('settings/', UserSettingsView.as_view(), name='user-settings'),
    path('change-password/', FirstLoginPasswordResetView.as_view(), name='change-password'),
]