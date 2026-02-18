from decimal import Decimal
from ninja import NinjaAPI
from ninja.errors import HttpError

from .models import Order, OrderItem
from .schemas import OrderCreateIn, OrderOut, OrderItemOut, OrderStatusIn

api = NinjaAPI(title="Orders API", version="1.0")


def _order_to_out(order: Order) -> OrderOut:
    items = [
        OrderItemOut(
            product_id=i.product_id, quantity=i.quantity, unit_price=i.unit_price
        )
        for i in order.items.all()
    ]
    return OrderOut(
        id=order.id,
        user_id=order.user_id,
        status=order.status,
        total_amount=order.total_amount,
        created_at=order.created_at.isoformat(),
        items=items,
    )


@api.get("/orders", response=list[OrderOut])
def list_orders(request, user_id: int):
    orders = Order.objects.filter(user_id=user_id).order_by("-created_at")
    return [_order_to_out(o) for o in orders]


@api.post("/orders", response=OrderOut)
def create_order(request, payload: OrderCreateIn):
    total = sum(Decimal(i.quantity) * i.unit_price for i in payload.items)
    order = Order.objects.create(user_id=payload.user_id, total_amount=total)
    for item in payload.items:
        OrderItem.objects.create(
            order=order,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
    return _order_to_out(order)


@api.get("/orders/{order_id}", response=OrderOut)
def get_order(request, order_id: int):
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        raise HttpError(404, "Order not found")
    return _order_to_out(order)


@api.patch("/orders/{order_id}", response=OrderOut)
def update_order_status(request, order_id: int, payload: OrderStatusIn):
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        raise HttpError(404, "Order not found")
    if payload.status not in dict(Order.Status.choices):
        raise HttpError(400, "Invalid status")
    order.status = payload.status
    order.save(update_fields=["status", "updated_at"])
    return _order_to_out(order)
