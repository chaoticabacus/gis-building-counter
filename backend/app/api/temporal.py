"""Temporal analysis endpoints using Google Earth Engine and Overture Maps."""

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


@router.post("/temporal/count")
async def get_building_count(request: TemporalRequest):
    """
    Unified building count endpoint.
    
    Strategy (ordered by accuracy):
      1. GOB V3 polygons — most accurate (individual building footprints)
      2. Overture Maps — fills coverage gaps (Central Asia, Ukraine, Middle East)
      3. GOB Temporal — trend data only (2.5D raster, less accurate for counts)
      4. Dynamic World — built-up area percentage fallback
    """
    polygon = request.polygon
    start_year = request.start_year
    end_year = request.end_year

    result = {
        "count": None,
        "startCount": None,
        "endCount": None,
        "timeSeries": [],
        "features": [],
        "source": None,
        "builtUpPercent": None,
    }

    # Strategy 1: GOB V3 polygons — MOST ACCURATE (each polygon = one building)
    try:
        from app.services.gee_service import is_initialized, get_open_buildings
        if is_initialized():
            gob_v3 = get_open_buildings(polygon, end_year)
            if gob_v3 and gob_v3.get("count", 0) > 0:
                result["count"] = gob_v3["count"]
                result["endCount"] = gob_v3["count"]
                result["features"] = gob_v3.get("features", [])
                result["source"] = "google_open_buildings_v3"
                logger.info(f"GOB V3: {result['count']} buildings found")
    except Exception as e:
        logger.warning(f"GOB V3 query failed: {e}")

    # Strategy 2: If GOB V3 had no coverage, try Overture Maps
    if result["count"] is None or result["count"] == 0:
        try:
            from app.services.overture_service import get_microsoft_buildings
            overture = get_microsoft_buildings(polygon)
            if overture and overture.get("count", 0) > 0:
                result["count"] = overture["count"]
                result["endCount"] = overture["count"]
                result["features"] = overture.get("features", [])
                result["source"] = overture["source"]
                logger.info(f"Overture: {result['count']} buildings found")
        except Exception as e:
            logger.warning(f"Overture query failed: {e}")

    # Strategy 3: GOB Temporal for trend data (start + end year comparison)
    try:
        from app.services.gee_service import is_initialized, get_open_buildings_temporal
        if is_initialized():
            gob_temporal = get_open_buildings_temporal(polygon, start_year, end_year)
            if gob_temporal:
                result["timeSeries"] = gob_temporal.get("timeSeries", [])
                # Only use temporal counts if we have no better count
                if result["count"] is None or result["count"] == 0:
                    if gob_temporal.get("endCount") and gob_temporal["endCount"] > 0:
                        result["count"] = gob_temporal["endCount"]
                        result["endCount"] = gob_temporal["endCount"]
                        result["startCount"] = gob_temporal.get("startCount")
                        result["source"] = "google_open_buildings_temporal_v1"
                else:
                    # We have a better count — use temporal for start count estimate only
                    result["startCount"] = gob_temporal.get("startCount")
    except Exception as e:
        logger.warning(f"GOB Temporal query failed: {e}")

    # Strategy 4 (fallback): Dynamic World for built-up area %
    if result["count"] is None or result["count"] == 0:
        try:
            from app.services.gee_service import is_initialized, get_dynamic_world_timeseries
            if is_initialized():
                dw = get_dynamic_world_timeseries(polygon, start_year, end_year)
                result["builtUpPercent"] = dw.get("builtUpPercent")
                if not result["timeSeries"]:
                    result["timeSeries"] = dw.get("timeSeries", [])
                if not result["source"]:
                    result["source"] = "dynamic_world_v1"
                    result["startCount"] = dw.get("startCount")
                    result["endCount"] = dw.get("endCount")
        except Exception as e:
            logger.warning(f"Dynamic World query failed: {e}")

    # If we still have nothing
    if result["count"] is None and not result["timeSeries"]:
        raise HTTPException(
            status_code=404,
            detail="No building data available for this region. "
                   "GEE may not be initialized or the area has no coverage.",
        )

    return result


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
