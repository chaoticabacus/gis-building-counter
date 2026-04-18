"""Tile fetching and stitching endpoints."""

import io
import logging
import math
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from PIL import Image

from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"


class CaptureRequest(BaseModel):
    bounds: dict  # { north, south, east, west }
    zoom: int = 17


def lng_to_tile_x(lng: float, zoom: int) -> int:
    return int((lng + 180.0) / 360.0 * (1 << zoom))


def lat_to_tile_y(lat: float, zoom: int) -> int:
    lat_rad = math.radians(lat)
    n = 1 << zoom
    return int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * n)


@router.post("/tiles/capture")
async def capture_tiles(request: CaptureRequest):
    """
    Fetch and stitch satellite tiles for a bounding box.
    Returns a single composited image.
    """
    zoom = min(max(request.zoom, 1), 19)

    x_min = lng_to_tile_x(request.bounds["west"], zoom)
    x_max = lng_to_tile_x(request.bounds["east"], zoom)
    y_min = lat_to_tile_y(request.bounds["north"], zoom)
    y_max = lat_to_tile_y(request.bounds["south"], zoom)

    # Limit tile count to prevent abuse
    tile_count = (x_max - x_min + 1) * (y_max - y_min + 1)
    if tile_count > 100:
        raise HTTPException(
            status_code=400,
            detail=f"Area too large ({tile_count} tiles). Zoom in or select a smaller area.",
        )

    tile_size = 256
    width = (x_max - x_min + 1) * tile_size
    height = (y_max - y_min + 1) * tile_size
    composite = Image.new("RGB", (width, height))

    async with httpx.AsyncClient(timeout=30.0) as client:
        for ty in range(y_min, y_max + 1):
            for tx in range(x_min, x_max + 1):
                url = TILE_URL.format(z=zoom, y=ty, x=tx)
                try:
                    response = await client.get(url)
                    response.raise_for_status()
                    tile_img = Image.open(io.BytesIO(response.content))
                    px = (tx - x_min) * tile_size
                    py = (ty - y_min) * tile_size
                    composite.paste(tile_img, (px, py))
                except Exception as e:
                    logger.warning(f"Failed to fetch tile {tx},{ty},{zoom}: {e}")

    # Return as JPEG
    buf = io.BytesIO()
    composite.save(buf, format="JPEG", quality=90)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="image/jpeg",
        headers={"Content-Disposition": f"inline; filename=capture_z{zoom}.jpg"},
    )
