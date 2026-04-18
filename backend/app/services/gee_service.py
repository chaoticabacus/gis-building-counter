"""
Google Earth Engine service.
Provides building footprint queries, Dynamic World time series, and satellite composites.
"""

import json
import logging
import os
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)

_ee = None
_initialized = False


def init_gee(service_account_key: str):
    """
    Initialize Earth Engine with a service account.
    Accepts either:
      - A file path to a JSON key file (local dev)
      - A raw JSON string (deployed on Render/etc)
    """
    global _ee, _initialized

    import ee

    try:
        # Detect whether we got a file path or raw JSON content
        if os.path.isfile(service_account_key):
            key_file = service_account_key
        else:
            # It's a JSON string — write to a temp file for the EE SDK
            key_data = json.loads(service_account_key)
            tmp = tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            )
            json.dump(key_data, tmp)
            tmp.close()
            key_file = tmp.name
            logger.info("GEE key loaded from environment variable")

        # Extract service account email from the key
        with open(key_file) as f:
            key_info = json.load(f)
        email = key_info.get("client_email")

        credentials = ee.ServiceAccountCredentials(
            email=email,
            key_file=key_file,
        )
        ee.Initialize(credentials=credentials)
        _ee = ee
        _initialized = True
        logger.info(f"Earth Engine initialized for {email}")
    except json.JSONDecodeError as e:
        logger.error(f"GEE key is not valid JSON: {e}")
        raise
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


def is_initialized() -> bool:
    """Check if GEE is initialized."""
    return _initialized


def get_open_buildings_temporal(polygon: dict, start_year: int, end_year: int) -> dict:
    """
    Query Google Open Buildings 2.5D Temporal dataset.
    Returns annual building count estimates from 2016–2023.
    Uses the `building_fractional_count` band summed over the polygon.
    """
    _ensure_initialized()
    ee = _ee

    geometry = _polygon_to_ee_geometry(polygon)
    time_series = []

    # Clamp to available range (2016–2023)
    actual_start = max(start_year, 2016)
    actual_end = min(end_year, 2023)

    for year in range(actual_start, actual_end + 1):
        try:
            dataset = ee.ImageCollection(
                "GOOGLE/Research/open-buildings-temporal/v1"
            ).filter(
                ee.Filter.calendarRange(year, year, "year")
            )

            mosaic = dataset.mosaic()
            count_band = mosaic.select("building_fractional_count")

            stats = count_band.reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=geometry,
                scale=4,  # 4m effective resolution
                maxPixels=1e10,
            ).getInfo()

            building_count = stats.get("building_fractional_count", 0) or 0

            time_series.append({
                "year": year,
                "count": round(building_count),
            })
        except Exception as e:
            logger.warning(f"Open Buildings Temporal query failed for {year}: {e}")
            time_series.append({"year": year, "count": None})

    start_counts = [d["count"] for d in time_series if d["count"] is not None and d["year"] == actual_start]
    end_counts = [d["count"] for d in time_series if d["count"] is not None and d["year"] == actual_end]

    return {
        "timeSeries": time_series,
        "startCount": start_counts[0] if start_counts else None,
        "endCount": end_counts[0] if end_counts else None,
        "source": "google_open_buildings_temporal_v1",
        "coverage": "africa_south_asia_se_asia_latam",
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
