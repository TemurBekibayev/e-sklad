from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.cafe.views import HallViewSet, TableViewSet, OrderViewSet, ShiftViewSet

router = DefaultRouter()
router.register(r'halls', HallViewSet, basename='cafe-hall')
router.register(r'tables', TableViewSet, basename='cafe-table')
router.register(r'orders', OrderViewSet, basename='cafe-order')
router.register(r'shifts', ShiftViewSet, basename='cafe-shift')

urlpatterns = [
    path('', include(router.urls)),
]
