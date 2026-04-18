"""Temporal analysis endpoints using Google Earth Engine."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class PolygonRequest(BaseModel):
    polygon: dict  # GeoJSON Polygon geometry
    year: Optional[int] = None


class TemporalRequest(BaseModel):
    polygon: dict
    start_year: int
    end_year: int


class ImageryRequest(BaseModel):
    polygon: dict
    date_range: list[str]  # [start_date, end_date] as ISO strings


@router.post("/temporal/buildings")
async def get_buildings(request: PolygonRequest):
    """
    Get building footprints within a polygon.
    Queries Google Open Buildings first, falls back to Overture/Microsoft.
    """
    try:
        from app.services.gee_service import get_open_buildings
        result = get_open_buildings(request.polygon, request.year)

        # If low coverage, try Overture fallback
        if result.get("count", 0) == 0:
            try:
                from app.services.overture_service import get_microsoft_buildings
                result = get_microsoft_buildings(request.polygon)
                result["source"] = "microsoft_overture"
            except Exception:
                pass

        return result
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="GEE not initialized. Set GEE_SERVICE_ACCOUNT_KEY environment variable.",
        )
    except Exception as e:
        logger.error(f"Building query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/temporal/landcover")
async def get_landcover(request: TemporalRequest):
    """
    Get built-up area percentage time series from Dynamic World.
    Returns yearly data for the polygon area.
    """
    try:
        from app.services.gee_service import get_dynamic_world_timeseries
        result = get_dynamic_world_timeseries(
            request.polygon,
            request.start_year,
            request.end_year,
        )
        return result
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="GEE not initialized. Set GEE_SERVICE_ACCOUNT_KEY environment variable.",
        )
    except Exception as e:
        logger.error(f"Landcover query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/temporal/imagery")
async def get_imagery(request: ImageryRequest):
    """
    Get satellite imagery composite for a polygon and date range.
    Returns a URL to the composite image tile.
    """
    try:
        from app.services.gee_service import get_sentinel2_composite
        result = get_sentinel2_composite(request.polygon, request.date_range)
        return result
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="GEE not initialized. Set GEE_SERVICE_ACCOUNT_KEY environment variable.",
        )
    except Exception as e:
        logger.error(f"Imagery query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
