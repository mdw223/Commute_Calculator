import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.database import init_db
from app.middleware import SecurityHeadersMiddleware
from app.rate_limit import limiter
from app.routers import auth, conversations, cover_letters, documents, users

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


_docs_kwargs = (
    {"docs_url": None, "redoc_url": None, "openapi_url": None} if settings.is_production else {}
)

app = FastAPI(
    title="Cover Letter Studio API",
    version="1.0.0",
    lifespan=lifespan,
    **_docs_kwargs,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if settings.is_production:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(documents.router)
app.include_router(conversations.router)
app.include_router(cover_letters.router)


@app.get("/health")
@limiter.limit("60/minute")
async def health(request: Request):
    return {"status": "ok"}
