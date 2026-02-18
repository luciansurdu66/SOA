from django.urls import path
from ninja import NinjaAPI
from orders_service.api import api

urlpatterns = [
    path("api/", api.urls),
]
