"""FastAPI main application."""

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import router as api_router
from .opencode import OpencodeClient
from .utils.config import get_settings
from .utils.errors import AppError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    settings = get_settings()

    # Initialize opencode client
    app.state.opencode_client = OpencodeClient(settings.opencode_server_url)

    yield

    # Cleanup
    await app.state.opencode_client.close()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Claude Skills Runtime",
        description="Runtime framework for testing Claude Skills",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.time()

        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"client={request.client.host if request.client else 'unknown'}"
        )

        # Process request
        response = await call_next(request)

        # Log response
        duration_ms = (time.time() - start_time) * 1000
        logger.info(
            f"Response: {request.method} {request.url.path} "
            f"status={response.status_code} duration={duration_ms:.2f}ms"
        )

        return response

    # Add error handler for AppError
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict(),
        )

    # Include API router
    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()
