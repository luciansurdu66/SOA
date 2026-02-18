from ninja import Schema


class RegisterIn(Schema):
    username: str
    email: str
    password: str


class LoginIn(Schema):
    username: str
    password: str


class TokenOut(Schema):
    access: str
    refresh: str
    user_id: int


class RefreshIn(Schema):
    refresh: str


class VerifyIn(Schema):
    access: str


class VerifyOut(Schema):
    user_id: int
