import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from gateway import routing as gateway_routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gateway.settings")
django_asgi = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi,
        "websocket": AuthMiddlewareStack(
            URLRouter(gateway_routing.websocket_urlpatterns)
        ),
    }
)
