"""
Google Earth Engine service.
Provides building footprint queries, Dynamic World time series, and satellite composites.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

_ee = None
_initialized = False


def init_gee(service_account_key_path: str):
    """Initialize Earth Engine with a service account."""
    global _ee, _initialized

    import ee

    try:
        credentials = ee.ServiceAccountCredentials(
            email=None,
            key_file=service_account_key_path,
        )
        ee.Initialize(credentials=credentials)
        _ee = ee
        _initialized = True
        logger.info("Earth Engine initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Earth Engine: {e}")
        raise


def _ensure_initialized():
    if not _initialized or _ee is None:
        raise RuntimeError("Earth Engine not initialized")


def _polygon_to_ee_geometry(polygon: dict):
    """Convert GeoJSON polygon to EE geometry."""
    _ensure_initialized()
    return _ee.Geometry.Polygon(polygon["coordinates"])


def get_open_buildings(polygon: dict, year: Optional[int] = None) -> dict:
    """
    Query Google Open Buildings v3 within a polygon.
    Returns building count and footprint GeoJSON.
    """
    _ensure_initialized()
    ee = _ee

    geometry = _polygon_to_ee_geometry(polygon)

    # Google Open Buildings v3
    buildings = ee.FeatureCollection("GOOGLE/Research/open-buildings/v3/polygons")
    filtered = buildings.filterBounds(geometry)

    count = filtered.size().getInfo()

    # Get footprints as GeoJSON (limit to prevent memory issues)
    if count > 10000:
        # Sample if too many
        features_info = filtered.limit(5000).getInfo()
    else:
        features_info = filtered.getInfo()

    return {
        "count": count,
        "features": features_info.get("features", []) if features_info else [],
        "source": "google_open_buildings_v3",
        "year": year,
    }


def get_dynamic_world_timeseries(polygon: dict, start_year: int, end_year: int) -> dict:
    """
    Get built-up area percentage time series from Dynamic World.
    Returns yearly built-up percentage within the polygon.
    """
    _ensure_initialized()
    ee = _ee

    geometry = _polygon_to_ee_geometry(polygon)
    time_series = []

    for year in range(start_year, end_year + 1):
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"

        try:
            dw = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1") \
                .filterDate(start_date, end_date) \
                .filterBounds(geometry)

            # Get the 'built' band probability
            built_prob = dw.select("built").mean()

            # Calculate mean built-up probability within the polygon
            stats = built_prob.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geometry,
                scale=10,
                maxPixels=1e8,
            ).getInfo()

            built_pct = (stats.get("built", 0) or 0) * 100

            time_series.append({
                "year": year,
                "value": round(built_pct, 2),
            })
        except Exception as e:
            logger.warning(f"Dynamic World query failed for {year}: {e}")
            time_series.append({"year": year, "value": None})

    # Calculate comparison stats
    start_values = [d["value"] for d in time_series if d["value"] is not None and d["year"] == start_year]
    end_values = [d["value"] for d in time_series if d["value"] is not None and d["year"] == end_year]

    return {
        "timeSeries": time_series,
        "startCount": start_values[0] if start_values else None,
        "endCount": end_values[0] if end_values else None,
        "builtUpPercent": {
            "start": start_values[0] if start_values else None,
            "end": end_values[0] if end_values else None,
        },
        "source": "dynamic_world_v1",
    }


def get_sentinel2_composite(polygon: dict, date_range: list[str]) -> dict:
    """
    Generate a Sentinel-2 true-color composite for a polygon and date range.
    Returns a tile URL for the composite.
    """
    _ensure_initialized()
    ee = _ee

    geometry = _polygon_to_ee_geometry(polygon)

    # Cloud-masked Sentinel-2
    s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
        .filterDate(date_range[0], date_range[1]) \
        .filterBounds(geometry) \
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20)) \
        .select(["B4", "B3", "B2"])

    composite = s2.median().clip(geometry)

    # Generate tile URL
    vis_params = {
        "min": 0,
        "max": 3000,
        "bands": ["B4", "B3", "B2"],
    }

    map_id = composite.getMapId(vis_params)

    return {
        "tile_url": map_id["tile_fetcher"].url_format,
        "date_range": date_range,
        "image_count": s2.size().getInfo(),
    }
