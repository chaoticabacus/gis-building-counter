"""
GIS Building Counter — FastAPI Backend
Provides endpoints for SAM 3 proxy, GEE temporal analysis, tile fetching, and export.
"""

import os
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import analyze, temporal, tiles, export

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, cleanup on shutdown."""
    logger.info("GIS Building Counter API starting...")

    # Initialize GEE if credentials are available
    if settings.gee_service_account_key:
        try:
            from app.services.gee_service import init_gee
            init_gee(settings.gee_service_account_key)
            logger.info("Google Earth Engine initialized")
        except Exception as e:
            logger.warning(f"GEE initialization failed: {e}")

    yield
    logger.info("GIS Building Counter API shutting down")


app = FastAPI(
    title="GIS Building Counter API",
    description="Backend API for satellite imagery building detection and temporal analysis",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(analyze.router, prefix="/api", tags=["analysis"])
app.include_router(temporal.router, prefix="/api", tags=["temporal"])
app.include_router(tiles.router, prefix="/api", tags=["tiles"])
app.include_router(export.router, prefix="/api", tags=["export"])


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "gee_initialized": settings.gee_service_account_key is not None,
        "version": "1.0.0",
    }
