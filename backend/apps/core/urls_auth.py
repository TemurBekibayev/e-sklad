from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomLoginView, LogoutView, CurrentUserView, HealthCheckView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='auth_health'),
    path('ping/', HealthCheckView.as_view(), name='auth_ping'),
    path('login/', CustomLoginView.as_view(), name='auth_login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('me/', CurrentUserView.as_view(), name='auth_me'),
]

