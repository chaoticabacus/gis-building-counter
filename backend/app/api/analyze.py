"""SAM 3 analysis proxy endpoints."""

import io
import base64
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analyze")
async def analyze_image(
    image: UploadFile = File(...),
    prompt: str = Form("building"),
    confidence_threshold: float = Form(0.5),
    min_area: Optional[int] = Form(None),
    max_area: Optional[int] = Form(None),
    colab_url: Optional[str] = Form(None),
):
    """
    Proxy an image to the SAM 3 Colab inference server.
    Accepts the image and parameters, forwards to Colab, returns results.
    """
    target_url = colab_url or settings.colab_url
    if not target_url:
        raise HTTPException(
            status_code=503,
            detail="SAM 3 Colab URL not configured. Set COLAB_URL env var or pass colab_url parameter.",
        )

    # Read image bytes
    image_bytes = await image.read()

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Forward to Colab server
            files = {"image": (image.filename, image_bytes, image.content_type)}
            data = {
                "prompt": prompt,
                "confidence_threshold": str(confidence_threshold),
            }
            if min_area is not None:
                data["min_area"] = str(min_area)
            if max_area is not None and max_area > 0:
                data["max_area"] = str(max_area)

            response = await client.post(
                f"{target_url}/predict",
                files=files,
                data=data,
            )
            response.raise_for_status()
            result = response.json()

            # Post-process: filter by confidence and area
            masks = result.get("masks", [])
            boxes = result.get("boxes", [])
            scores = result.get("scores", [])

            filtered_masks = []
            filtered_boxes = []
            filtered_scores = []

            for i, score in enumerate(scores):
                if score < confidence_threshold:
                    continue
                if i < len(boxes):
                    box = boxes[i]
                    area = (box[2] - box[0]) * (box[3] - box[1])
                    if min_area and area < min_area:
                        continue
                    if max_area and max_area > 0 and area > max_area:
                        continue

                filtered_masks.append(masks[i] if i < len(masks) else None)
                filtered_boxes.append(boxes[i] if i < len(boxes) else None)
                filtered_scores.append(score)

            return {
                "masks": filtered_masks,
                "boxes": filtered_boxes,
                "scores": filtered_scores,
                "processing_time": result.get("processing_time", 0),
                "image_width": result.get("image_width", 0),
                "image_height": result.get("image_height", 0),
            }

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to SAM 3 Colab server. Is the notebook running?",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="SAM 3 inference timed out. The image may be too large.",
        )
    except Exception as e:
        logger.error(f"SAM 3 proxy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/batch")
async def analyze_batch(
    images: list[UploadFile] = File(...),
    prompt: str = Form("building"),
    confidence_threshold: float = Form(0.5),
    colab_url: Optional[str] = Form(None),
):
    """Process multiple images sequentially."""
    results = []
    for img in images:
        try:
            result = await analyze_image(
                image=img,
                prompt=prompt,
                confidence_threshold=confidence_threshold,
                colab_url=colab_url,
            )
            results.append({"filename": img.filename, **result})
        except HTTPException as e:
            results.append({"filename": img.filename, "error": e.detail})

    return {"results": results, "total": len(results)}
