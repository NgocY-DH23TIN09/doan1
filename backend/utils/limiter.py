from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared rate limiter instance cho toàn bộ ứng dụng
limiter = Limiter(key_func=get_remote_address)
