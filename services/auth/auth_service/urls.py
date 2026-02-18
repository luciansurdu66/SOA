from django.urls import path
from ninja import NinjaAPI
from auth_service.api import api

urlpatterns = [
    path("api/", api.urls),
]
