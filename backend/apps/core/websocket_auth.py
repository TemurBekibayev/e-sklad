import urllib.parse
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token_string):
    try:
        access_token = AccessToken(token_string)
        user_id = access_token.get('user_id')
        user = User.objects.select_related('tenant').get(id=user_id, is_active=True)
        return user
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = urllib.parse.parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if not token:
            headers = dict(scope.get('headers', []))
            auth_header = headers.get(b'authorization', b'').decode('utf-8')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]

        if token:
            scope['user'] = await get_user_from_token(token)
            if hasattr(scope['user'], 'tenant'):
                scope['tenant'] = scope['user'].tenant
            else:
                scope['tenant'] = None
        else:
            scope['user'] = AnonymousUser()
            scope['tenant'] = None

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
