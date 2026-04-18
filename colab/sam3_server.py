"""
SAM 3 Inference Server for Google Colab
=======================================

Run this script in a Google Colab notebook with GPU runtime to expose
SAM 3 as an API endpoint for the GIS Building Counter dashboard.

Usage in Colab:
    1. Set runtime to GPU (T4)
    2. Run the setup cell (install dependencies)
    3. Run this script
    4. Copy the public URL and paste it into the dashboard settings

Setup cell (run first):
    !pip install -q git+https://github.com/facebookresearch/sam3.git
    !pip install -q flask pyngrok cloudflared
    !huggingface-cli login  # Enter your HF token
"""

import io
import time
import base64
import logging
from threading import Thread

import torch
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global model references
model = None
processor = None
device = None


def load_model():
    """Load SAM 3.1 model."""
    global model, processor, device

    logger.info("Loading SAM 3.1 model...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor

    model = build_sam3_image_model()
    processor = Sam3Processor(model)

    logger.info("Model loaded successfully")


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "device": str(device) if device else "unknown",
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    Run SAM 3 inference on an image.

    Accepts:
        - image: multipart file upload
        - prompt: text prompt (default: "building")
        - confidence_threshold: minimum score (default: 0.5)
        - min_area: minimum bounding box area in px² (optional)
        - max_area: maximum bounding box area in px² (optional)

    Returns:
        - masks: list of RLE-encoded masks
        - boxes: list of [x1, y1, x2, y2] bounding boxes
        - scores: list of confidence scores
        - processing_time: seconds taken
        - image_width: input image width
        - image_height: input image height
    """
    if model is None or processor is None:
        return jsonify({"error": "Model not loaded"}), 503

    start_time = time.time()

    # Get image
    if "image" in request.files:
        image_file = request.files["image"]
        image = Image.open(image_file.stream).convert("RGB")
    else:
        return jsonify({"error": "No image provided"}), 400

    # Get parameters
    prompt = request.form.get("prompt", "building")
    confidence_threshold = float(request.form.get("confidence_threshold", 0.5))
    min_area = request.form.get("min_area")
    max_area = request.form.get("max_area")

    if min_area:
        min_area = int(min_area)
    if max_area:
        max_area = int(max_area)

    width, height = image.size
    logger.info(f"Processing image {width}x{height} with prompt: '{prompt}'")

    try:
        # Run SAM 3 inference
        inference_state = processor.set_image(image)
        output = processor.set_text_prompt(state=inference_state, prompt=prompt)

        masks = output.get("masks", [])
        boxes = output.get("boxes", [])
        scores = output.get("scores", [])

        # Convert masks to serializable format
        mask_data = []
        box_data = []
        score_data = []

        for i, (mask, box, score) in enumerate(zip(masks, boxes, scores)):
            # Filter by confidence
            score_val = float(score) if hasattr(score, 'item') else float(score)
            if score_val < confidence_threshold:
                continue

            # Convert box
            if hasattr(box, 'tolist'):
                box_list = box.tolist()
            else:
                box_list = list(box)

            # Filter by area
            if len(box_list) >= 4:
                area = (box_list[2] - box_list[0]) * (box_list[3] - box_list[1])
                if min_area and area < min_area:
                    continue
                if max_area and max_area > 0 and area > max_area:
                    continue

            # Convert mask to RLE-like format (just store bounding box for now)
            # Full mask data would be too large for JSON response
            if hasattr(mask, 'cpu'):
                mask_np = mask.cpu().numpy()
            else:
                mask_np = np.array(mask)

            # Store mask summary
            mask_info = {
                "size": list(mask_np.shape) if mask_np.ndim >= 2 else [height, width],
                "area": int(mask_np.sum()) if mask_np.dtype == bool else int((mask_np > 0.5).sum()),
            }

            mask_data.append(mask_info)
            box_data.append(box_list)
            score_data.append(score_val)

        processing_time = time.time() - start_time
        logger.info(f"Found {len(box_data)} buildings in {processing_time:.2f}s")

        return jsonify({
            "masks": mask_data,
            "boxes": box_data,
            "scores": score_data,
            "processing_time": round(processing_time, 2),
            "image_width": width,
            "image_height": height,
        })

    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


def start_tunnel():
    """Start a public tunnel to expose the Flask server."""
    try:
        # Try cloudflared first (faster, no account needed)
        from subprocess import Popen, PIPE
        import json as _json
        import re

        proc = Popen(
            ["cloudflared", "tunnel", "--url", "http://localhost:5000", "--no-autoupdate"],
            stdout=PIPE,
            stderr=PIPE,
        )

        # Read URL from output
        for line in proc.stderr:
            line = line.decode()
            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
            if match:
                url = match.group()
                logger.info(f"\n{'='*60}")
                logger.info(f"  SAM 3 API is live at: {url}")
                logger.info(f"  Paste this URL into the dashboard settings")
                logger.info(f"{'='*60}\n")
                return url

    except (FileNotFoundError, ImportError):
        pass

    # Fallback to ngrok
    try:
        from pyngrok import ngrok
        tunnel = ngrok.connect(5000)
        url = tunnel.public_url
        logger.info(f"\n{'='*60}")
        logger.info(f"  SAM 3 API is live at: {url}")
        logger.info(f"  Paste this URL into the dashboard settings")
        logger.info(f"{'='*60}\n")
        return url
    except Exception as e:
        logger.warning(f"Could not start tunnel: {e}")
        logger.info("Server running on http://localhost:5000 (no public tunnel)")
        return None


if __name__ == "__main__":
    # Load model
    load_model()

    # Start tunnel in background
    tunnel_thread = Thread(target=start_tunnel, daemon=True)
    tunnel_thread.start()

    # Start Flask server
    app.run(host="0.0.0.0", port=5000, debug=False)
