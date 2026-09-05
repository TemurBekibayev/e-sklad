import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class TenantBasketConsumer(AsyncJsonWebsocketConsumer):
    """
    Do'kon xodimlari va menejerlari uchun WebSocket real-vaqt kanali.
    Har bir tenant o'zining alohida 'tenant_{tenant_id}_baskets' guruhiga ulanadi.
    """
    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        tenant = getattr(user, 'tenant', None)
        if not tenant and not (user.role == 'admin' or user.is_superuser):
            await self.close(code=4002)
            return

        self.tenant_id = str(tenant.id) if tenant else 'admin_all'
        self.room_group_name = f'tenant_{self.tenant_id}_baskets'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        # Ping/pong yoki xodim holati
        msg_type = content.get('type')
        if msg_type == 'ping':
            await self.send_json({'type': 'pong'})

    async def basket_update(self, event):
        """
        Savat o'zgarganda (mahsulot qo'shildi, o'chirildi, yakunlandi) barcha ulangan
        menejer va xodimlarga yangilanish xabari yuboriladi.
        """
        await self.send_json({
            'event': 'basket:update',
            'data': event.get('data')
        })
