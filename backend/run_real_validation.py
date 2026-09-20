"""
run_real_validation.py

Runs your ACTUAL pipeline end-to-end on real raw Sentinel-2 bands, using
your ACTUAL trained model weights, then computes REAL validation metrics
(confidence, spectral, geographic, hallucination) on the genuine result.

No shortcuts: this reuses the exact same preprocessing math as
raster_service.preprocess_raster() and the exact same inference logic as
sr_service.run_super_resolution(), so the numbers you get out are the
same numbers your deployed backend would produce for this scene.

WHERE TO PUT THIS FILE
    Put it directly inside your `backend/` folder, next to `requirements.txt`
    (i.e. backend/run_real_validation.py), so it can import `app.ml.model`
    and `app.services.validation_service` the same way your real routes do.

HOW TO RUN
    Open a terminal in `backend/`, with your existing .venv active
    (the one that already has torch + rasterio installed), and run:

    python run_real_validation.py \
        --b02 "path/to/..._B02_(Raw).tiff" \
        --b03 "path/to/..._B03_(Raw).tiff" \
        --b04 "path/to/..._B04_(Raw).tiff" \
        --b08 "path/to/..._B08_(Raw).tiff" \
        --name dataset4

    Repeat with --name dataset5 for the second scene.

WHAT IT PRODUCES
    - real_output/<name>_processed.tif   (real preprocessed input)
    - real_output/<name>_sr_4x.tif       (real 4x super-resolved output)
    - real_output/<name>_confidence.png  (real confidence heatmap)
    - real_output/<name>_hallucination.png (real hallucination heatmap)
    - Printed JSON with the real confidence / spectral / geographic /
      hallucination numbers for that scene - paste these into your
      frontend's demo dataset registry, or use them directly.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import rasterio
import torch

from app.ml.model import Sentinel2SR
from app.services import validation_service as vs

IN_CHANNELS = 4
OUT_CHANNELS = 4
FEATURES = 64
NUM_BLOCKS = 8
SCALE = 4
TILE_SIZE = 256
EXPECTED_PARAMS = 927_876

WEIGHTS_PATH = Path("app/ml/weights/sentinel2_sr_inference.pth")
OUTPUT_DIR = Path("real_output")


def load_model():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = Sentinel2SR(
        in_channels=IN_CHANNELS,
        out_channels=OUT_CHANNELS,
        features=FEATURES,
        num_blocks=NUM_BLOCKS,
    ).to(device)

    state_dict = torch.load(WEIGHTS_PATH, map_location=device)
    model.load_state_dict(state_dict, strict=True)
    model.eval()

    params = sum(p.numel() for p in model.parameters())
    if params != EXPECTED_PARAMS:
        raise RuntimeError(
            f"Loaded model has {params:,} parameters, expected {EXPECTED_PARAMS:,}. "
            "app/ml/model.py doesn't match the trained checkpoint."
        )

    return model, device


def stack_bands(b02, b03, b04, b08):
    """Read 4 single-band GeoTIFFs and stack into (4, H, W), using B02's
    georeferencing (all 4 bands are expected to share the same grid)."""
    paths = [b02, b03, b04, b08]
    arrays = []
    profile = None

    for i, p in enumerate(paths):
        with rasterio.open(p) as src:
            arr = src.read(1).astype(np.float32)
            arrays.append(arr)
            if i == 0:
                profile = src.profile.copy()

    shapes = {a.shape for a in arrays}
    if len(shapes) != 1:
        raise ValueError(f"Bands have mismatched shapes: {shapes}")

    stacked = np.stack(arrays, axis=0)  # (4, H, W)
    return stacked, profile


def preprocess(stacked: np.ndarray, profile: dict, out_path: Path):
    """Exact reimplementation of raster_service.preprocess_raster()'s math."""
    image = np.nan_to_num(stacked, nan=0.0, posinf=0.0, neginf=0.0)
    normalized = np.zeros_like(image, dtype=np.float32)

    for i in range(image.shape[0]):
        band = image[i]
        band_min, band_max = float(band.min()), float(band.max())
        if band_max > band_min:
            normalized[i] = (band - band_min) / (band_max - band_min)
        else:
            normalized[i] = band

    write_profile = profile.copy()
    write_profile.update(dtype=rasterio.float32, count=normalized.shape[0], compress="lzw")

    with rasterio.open(out_path, "w", **write_profile) as dst:
        dst.write(normalized)

    return normalized


def run_inference(model, device, normalized: np.ndarray, profile: dict, out_path: Path):
    """Exact reimplementation of sr_service.run_super_resolution()'s tiling logic."""
    band_count, height, width = normalized.shape
    out_h, out_w = height * SCALE, width * SCALE
    output = np.zeros((OUT_CHANNELS, out_h, out_w), dtype=np.float32)

    for y0 in range(0, height, TILE_SIZE):
        y1 = min(y0 + TILE_SIZE, height)
        for x0 in range(0, width, TILE_SIZE):
            x1 = min(x0 + TILE_SIZE, width)

            tile = normalized[:, y0:y1, x0:x1]
            x = torch.from_numpy(tile).unsqueeze(0).to(device)
            with torch.no_grad():
                y = model(x)
            sr_tile = y.squeeze(0).cpu().numpy()

            oy0, oy1 = y0 * SCALE, y1 * SCALE
            ox0, ox1 = x0 * SCALE, x1 * SCALE
            output[:, oy0:oy1, ox0:ox1] = sr_tile

    src_transform = profile["transform"]
    new_transform = src_transform * src_transform.scale(width / out_w, height / out_h)

    out_profile = profile.copy()
    out_profile.update(
        width=out_w,
        height=out_h,
        count=OUT_CHANNELS,
        transform=new_transform,
        dtype=rasterio.float32,
        compress="lzw",
    )

    with rasterio.open(out_path, "w", **out_profile) as dst:
        dst.write(output)

    print(f"  SR output: {height}x{width} -> {out_h}x{out_w} (real {SCALE}x upscale)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--b02", required=True)
    parser.add_argument("--b03", required=True)
    parser.add_argument("--b04", required=True)
    parser.add_argument("--b08", required=True)
    parser.add_argument("--name", required=True, help="Output name, e.g. dataset4")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)

    print(f"[{args.name}] Loading model + real trained weights...")
    model, device = load_model()

    print(f"[{args.name}] Stacking real B02/B03/B04/B08 bands...")
    stacked, profile = stack_bands(args.b02, args.b03, args.b04, args.b08)

    processed_path = OUTPUT_DIR / f"{args.name}_processed.tif"
    print(f"[{args.name}] Preprocessing (real per-band normalization)...")
    normalized = preprocess(stacked, profile, processed_path)

    sr_path = OUTPUT_DIR / f"{args.name}_sr_4x.tif"
    print(f"[{args.name}] Running real model inference (this may take a few minutes on CPU)...")
    run_inference(model, device, normalized, profile, sr_path)

    print(f"[{args.name}] Computing real validation metrics...")
    confidence = vs.compute_confidence(processed_path, sr_path, OUTPUT_DIR, args.name)
    spectral = vs.compute_spectral_validation(processed_path, sr_path)
    geographic = vs.compute_geographic_validation(processed_path, sr_path)
    hallucination = vs.compute_hallucination_check(processed_path, sr_path, OUTPUT_DIR, args.name)

    result = {
        "dataset": args.name,
        "confidence": confidence,
        "spectral": spectral,
        "geographic": geographic,
        "hallucination": hallucination,
    }

    result_path = OUTPUT_DIR / f"{args.name}_validation_result.json"
    with open(result_path, "w") as f:
        json.dump(result, f, indent=2)

    print(f"\n[{args.name}] DONE. Real results:")
    print(json.dumps(result, indent=2))
    print(f"\nSaved to {result_path}")
    print(f"Heatmap images saved in {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
