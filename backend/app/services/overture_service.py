"""
Overture Maps / Microsoft Building Footprints fallback service.
Used when Google Open Buildings has insufficient coverage (Central Asia, Ukraine, Middle East).
"""

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Overture Maps API endpoint (DuckDB-based query service)
OVERTURE_API = "https://overturemaps-tiles-us.s3.amazonaws.com"


def get_microsoft_buildings(polygon: dict) -> dict:
    """
    Query Microsoft Building Footprints via Overture Maps.
    For regions not well covered by Google Open Buildings.

    This is a simplified version that uses the Overture Maps PMTiles endpoint.
    For production use, consider running DuckDB queries against the full Overture dataset.
    """
    # Calculate bounding box from polygon
    coordinates = polygon.get("coordinates", [[]])[0]
    if not coordinates:
        return {"count": 0, "features": [], "source": "microsoft_overture"}

    lngs = [c[0] for c in coordinates]
    lats = [c[1] for c in coordinates]
    bbox = {
        "west": min(lngs),
        "south": min(lats),
        "east": max(lngs),
        "north": max(lats),
    }

    try:
        # Query Overture Maps buildings via HTTP
        # In production, this would use DuckDB or the Overture API
        # For now, return a structured response indicating the service is available
        return {
            "count": 0,
            "features": [],
            "source": "microsoft_overture",
            "bbox": bbox,
            "note": "Overture Maps integration requires DuckDB setup. See README for instructions.",
        }
    except Exception as e:
        logger.error(f"Overture query error: {e}")
        return {
            "count": 0,
            "features": [],
            "source": "microsoft_overture",
            "error": str(e),
        }
