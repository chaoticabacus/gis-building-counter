"""
Overture Maps / Microsoft Building Footprints service.
Provides building count and footprints for regions not covered by Google Open Buildings
(Central Asia, Ukraine, Middle East, Europe, etc.).

Uses the `overturemaps` Python package + DuckDB to query GeoParquet data directly
from Overture's public S3/Azure storage — no API key needed.
"""

import json
import logging
import subprocess
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)


def _polygon_to_bbox(polygon: dict) -> dict:
    """Extract bounding box from GeoJSON polygon geometry."""
    coordinates = polygon.get("coordinates", [[]])[0]
    if not coordinates:
        return None

    lngs = [c[0] for c in coordinates]
    lats = [c[1] for c in coordinates]
    return {
        "west": min(lngs),
        "south": min(lats),
        "east": max(lngs),
        "north": max(lats),
    }


def _point_in_polygon(point: list, polygon_coords: list) -> bool:
    """Ray casting algorithm to check if a point is inside a polygon."""
    x, y = point[0], point[1]
    n = len(polygon_coords)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon_coords[i]
        xj, yj = polygon_coords[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def get_microsoft_buildings(polygon: dict) -> dict:
    """
    Query Overture Maps building footprints within a polygon.
    Uses DuckDB to query GeoParquet files from Overture's S3 bucket.
    
    Returns building count and simplified footprint data.
    """
    bbox = _polygon_to_bbox(polygon)
    if not bbox:
        return {"count": 0, "features": [], "source": "overture_maps"}

    try:
        import duckdb

        conn = duckdb.connect()
        conn.execute("INSTALL spatial; LOAD spatial;")
        conn.execute("INSTALL httpfs; LOAD httpfs;")
        conn.execute("SET s3_region='us-west-2';")

        # Query Overture Maps buildings within the bounding box
        # Use bbox filter for efficient Parquet row group pruning
        query = f"""
        SELECT
            id,
            ST_AsGeoJSON(geometry) as geojson,
            JSON_EXTRACT_STRING(names, '$.primary') as name,
            JSON_EXTRACT_STRING(sources, '$[0].dataset') as source_dataset,
            ST_Area(geometry) as area_degrees
        FROM read_parquet(
            's3://overturemaps-us-west-2/release/2024-12-18.0/theme=buildings/type=building/*',
            hive_partitioning=true
        )
        WHERE bbox.xmin >= {bbox['west']}
          AND bbox.xmax <= {bbox['east']}
          AND bbox.ymin >= {bbox['south']}
          AND bbox.ymax <= {bbox['north']}
        LIMIT 10000
        """

        result = conn.execute(query).fetchall()
        conn.close()

        # Filter to only buildings inside the actual polygon (not just bbox)
        polygon_coords = polygon.get("coordinates", [[]])[0]
        features = []

        for row in result:
            building_id, geojson_str, name, source_ds, area_deg = row

            # Parse the geometry to get centroid for point-in-polygon check
            try:
                geom = json.loads(geojson_str)
                if geom["type"] == "Polygon":
                    coords = geom["coordinates"][0]
                    cx = sum(c[0] for c in coords) / len(coords)
                    cy = sum(c[1] for c in coords) / len(coords)
                elif geom["type"] == "MultiPolygon":
                    first_ring = geom["coordinates"][0][0]
                    cx = sum(c[0] for c in first_ring) / len(first_ring)
                    cy = sum(c[1] for c in first_ring) / len(first_ring)
                else:
                    continue

                if not _point_in_polygon([cx, cy], polygon_coords):
                    continue

                # Approximate area in square meters (rough conversion near equator)
                area_m2 = area_deg * (111320 ** 2) if area_deg else 0

                features.append({
                    "type": "Feature",
                    "properties": {
                        "id": building_id,
                        "name": name,
                        "area_m2": round(area_m2, 1),
                        "source": source_ds or "overture",
                    },
                    "geometry": geom,
                })
            except (json.JSONDecodeError, KeyError, TypeError):
                continue

        return {
            "count": len(features),
            "features": features[:5000],  # Limit features sent to frontend
            "source": "overture_maps",
            "bbox": bbox,
        }

    except ImportError:
        logger.warning("DuckDB not installed — Overture Maps queries unavailable")
        return _fallback_overture_query(polygon, bbox)
    except Exception as e:
        logger.error(f"Overture DuckDB query error: {e}")
        return _fallback_overture_query(polygon, bbox)


def _fallback_overture_query(polygon: dict, bbox: dict) -> dict:
    """
    Fallback: use the `overturemaps` CLI tool to download buildings.
    """
    try:
        with tempfile.NamedTemporaryFile(suffix=".geojson", delete=False, mode="w") as f:
            tmp_path = f.name

        bbox_str = f"{bbox['west']},{bbox['south']},{bbox['east']},{bbox['north']}"
        result = subprocess.run(
            [
                "overturemaps", "download",
                "--bbox", bbox_str,
                "-f", "geojson",
                "--type", "building",
                "-o", tmp_path,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode == 0:
            with open(tmp_path) as f:
                data = json.load(f)

            features = data.get("features", [])
            polygon_coords = polygon.get("coordinates", [[]])[0]

            # Filter to polygon
            filtered = []
            for feat in features:
                geom = feat.get("geometry", {})
                coords = geom.get("coordinates", [[]])[0] if geom.get("type") == "Polygon" else []
                if coords:
                    cx = sum(c[0] for c in coords) / len(coords)
                    cy = sum(c[1] for c in coords) / len(coords)
                    if _point_in_polygon([cx, cy], polygon_coords):
                        filtered.append(feat)

            return {
                "count": len(filtered),
                "features": filtered[:5000],
                "source": "overture_maps_cli",
                "bbox": bbox,
            }
    except Exception as e:
        logger.error(f"Overture CLI fallback error: {e}")

    return {
        "count": 0,
        "features": [],
        "source": "overture_maps",
        "bbox": bbox,
        "error": "DuckDB and overturemaps CLI both unavailable. Install with: pip install duckdb",
    }
