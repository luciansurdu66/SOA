from django.db import models


class Stock(models.Model):
    product_id = models.CharField(max_length=64, unique=True)
    quantity = models.PositiveIntegerField(default=0)
    reserved = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)


class Reservation(models.Model):
    product_id = models.CharField(max_length=64)
    order_id = models.CharField(max_length=64)
    quantity = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
