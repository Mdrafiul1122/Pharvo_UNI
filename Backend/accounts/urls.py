from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, MeView, SignupView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/signup/', SignupView.as_view(), name='auth-signup'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
]
