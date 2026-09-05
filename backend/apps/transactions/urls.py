from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.core.views import TransactionViewSet

router = DefaultRouter()
router.register('', TransactionViewSet, basename='transactions')

urlpatterns = [
    path('', include(router.urls)),
]
