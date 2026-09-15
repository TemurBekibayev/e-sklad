import json
from channels.generic.websocket import AsyncWebsocketConsumer

class CafeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated or not getattr(user, 'tenant', None):
            await self.close(code=4003)
            return

        self.tenant_id = str(user.tenant.id)
        self.room_group_name = f"cafe_tenant_{self.tenant_id}"

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

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({"type": "pong"}))
        except Exception:
            pass

    async def cafe_message(self, event):
        await self.send(text_data=json.dumps({
            "event": event.get("event"),
            "data": event.get("data")
        }))
