"""FastAPI main application."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import router as api_router
from .opencode import OpencodeClient
from .utils.config import get_settings
from .utils.errors import AppError


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
