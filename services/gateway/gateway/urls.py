from django.urls import path
from ninja import NinjaAPI
from gateway.api import api

urlpatterns = [
    path("api/", api.urls),
]
