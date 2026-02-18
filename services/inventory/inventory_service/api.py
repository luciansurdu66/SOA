from ninja import NinjaAPI
from ninja.errors import HttpError

from .models import Stock, Reservation
from .schemas import StockOut, ReserveIn, ReserveOut, StockIn

api = NinjaAPI(title="Inventory API", version="1.0")


@api.get("/stock", response=list[StockOut])
def list_stock(request):
    return [
        StockOut(
            product_id=s.product_id,
            quantity=s.quantity,
            reserved=s.reserved,
            available=s.quantity - s.reserved,
        )
        for s in Stock.objects.all()
    ]


@api.get("/stock/{product_id}", response=StockOut)
def get_stock(request, product_id: str):
    try:
        s = Stock.objects.get(product_id=product_id)
    except Stock.DoesNotExist:
        raise HttpError(404, "Product not found")
    return StockOut(
        product_id=s.product_id,
        quantity=s.quantity,
        reserved=s.reserved,
        available=s.quantity - s.reserved,
    )


@api.post("/stock", response=StockOut)
def create_or_update_stock(request, payload: StockIn):
    stock, _ = Stock.objects.update_or_create(
        product_id=payload.product_id,
        defaults={"quantity": payload.quantity},
    )
    return StockOut(
        product_id=stock.product_id,
        quantity=stock.quantity,
        reserved=stock.reserved,
        available=stock.quantity - stock.reserved,
    )


@api.post("/reserve", response=ReserveOut)
def reserve(request, payload: ReserveIn):
    try:
        stock = Stock.objects.get(product_id=payload.product_id)
    except Stock.DoesNotExist:
        return ReserveOut(success=False, message="Product not found")
    available = stock.quantity - stock.reserved
    if payload.quantity > available:
        return ReserveOut(success=False, message="Insufficient stock")
    stock.reserved += payload.quantity
    stock.save(update_fields=["reserved"])
    Reservation.objects.create(
        product_id=payload.product_id,
        order_id=payload.order_id,
        quantity=payload.quantity,
    )
    return ReserveOut(success=True)


@api.post("/release", response=ReserveOut)
def release(request, order_id: str):
    reservations = Reservation.objects.filter(order_id=order_id)
    for r in reservations:
        try:
            stock = Stock.objects.get(product_id=r.product_id)
            stock.reserved = max(0, stock.reserved - r.quantity)
            stock.save(update_fields=["reserved"])
        except Stock.DoesNotExist:
            pass
    reservations.delete()
    return ReserveOut(success=True)
