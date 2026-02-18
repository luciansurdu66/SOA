from decimal import Decimal
from ninja import Schema
from typing import List


class OrderItemIn(Schema):
    product_id: str
    quantity: int
    unit_price: Decimal


class OrderCreateIn(Schema):
    user_id: int
    items: List[OrderItemIn]


class OrderItemOut(Schema):
    product_id: str
    quantity: int
    unit_price: Decimal


class OrderOut(Schema):
    id: int
    user_id: int
    status: str
    total_amount: Decimal
    created_at: str
    items: List[OrderItemOut] = []


class OrderStatusIn(Schema):
    status: str
