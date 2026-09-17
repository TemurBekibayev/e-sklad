from django.urls import re_path
from apps.baskets.consumers import TenantBasketConsumer
from apps.cafe.consumers import CafeConsumer

websocket_urlpatterns = [
    re_path(r'^ws/tenant/baskets/?$', TenantBasketConsumer.as_asgi()),
    re_path(r'^ws/cafe/?$', CafeConsumer.as_asgi()),
]
