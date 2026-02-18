from ninja import Schema


class StockOut(Schema):
    product_id: str
    quantity: int
    reserved: int
    available: int


class ReserveIn(Schema):
    product_id: str
    order_id: str
    quantity: int


class ReserveOut(Schema):
    success: bool
    message: str = ""


class StockIn(Schema):
    product_id: str
    quantity: int
