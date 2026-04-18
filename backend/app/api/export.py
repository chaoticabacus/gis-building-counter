"""Export endpoints for GeoJSON, CSV, and annotated images."""

import io
import json
import csv
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class ExportRequest(BaseModel):
    buildings: list[dict]
    count: int
    prompt: str = "building"
    image_width: int = 0
    image_height: int = 0


@router.post("/export/geojson")
async def export_geojson(request: ExportRequest):
    """Export building detections as GeoJSON FeatureCollection."""
    features = []
    for b in request.buildings:
        centroid = b.get("centroid", {})
        features.append({
            "type": "Feature",
            "properties": {
                "id": b.get("id"),
                "confidence": b.get("confidence"),
                "area_px": b.get("area", 0),
            },
            "geometry": {
                "type": "Point",
                "coordinates": [
                    centroid.get("x", 0),
                    centroid.get("y", 0),
                ],
            },
        })

    geojson = {
        "type": "FeatureCollection",
        "properties": {
            "total_count": request.count,
            "prompt": request.prompt,
            "analysis_date": datetime.utcnow().isoformat(),
            "image_dimensions": [request.image_width, request.image_height],
        },
        "features": features,
    }

    content = json.dumps(geojson, indent=2)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/geo+json",
        headers={
            "Content-Disposition": f"attachment; filename=buildings_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.geojson"
        },
    )


@router.post("/export/csv")
async def export_csv(request: ExportRequest):
    """Export building detections as CSV."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Building_ID", "Confidence", "Area_px", "Center_X", "Center_Y"])

    for b in request.buildings:
        centroid = b.get("centroid", {})
        writer.writerow([
            b.get("id"),
            f"{b.get('confidence', 0):.4f}",
            b.get("area", 0),
            centroid.get("x", 0),
            centroid.get("y", 0),
        ])

    content = output.getvalue()
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=buildings_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        },
    )
