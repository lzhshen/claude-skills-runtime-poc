"""API router configuration."""

from fastapi import APIRouter

from .health import router as health_router
from .skills import router as skills_router
from .executions import router as executions_router
from .config import router as config_router

router = APIRouter()

# Include sub-routers
router.include_router(health_router, tags=["system"])
router.include_router(skills_router)
router.include_router(executions_router)
router.include_router(config_router)
