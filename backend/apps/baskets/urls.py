from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BasketViewSet

router = DefaultRouter()
router.register('', BasketViewSet, basename='baskets')

urlpatterns = [
    path('', include(router.urls)),
]
