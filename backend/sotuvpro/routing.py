from django.urls import re_path
from apps.baskets.consumers import TenantBasketConsumer

websocket_urlpatterns = [
    re_path(r'^ws/tenant/baskets/?$', TenantBasketConsumer.as_asgi()),
]
