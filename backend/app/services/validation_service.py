"""
Validation service — real, computed metrics for the SR pipeline.

--------------------------------------------------------------------------
METHOD (read this before changing thresholds)

There is no ground-truth high-resolution image to compare the model's
output against (that's the whole point of super-resolution on real
satellite scenes). So every metric here is derived from a single,
well-established idea: SELF-CONSISTENCY.

  1. Take the AI output (4x the input size).
  2. Shrink it back down by averaging 4x4 pixel blocks (this is what the
     input WOULD look like if the SR output were "correct" and someone
     re-observed it at the original resolution).
  3. Compare that shrunk-down version to the actual original input.

Where they match closely, the model's added detail is consistent with
the real observed data -> high confidence. Where they diverge, the model
invented detail that isn't supported by the source pixels -> lower
confidence / possible hallucination.

This is a genuine, standard reference-free SR evaluation technique. It is
NOT a substitute for validation against real higher-resolution imagery
when that becomes available - the numbers below should be read as
self-consistency scores, not absolute accuracy.

The threshold constants below (MAX_EXPECTED_RESIDUAL, SUSPICIOUS_THRESHOLD)
are calibration knobs, not universal truths - tune them once you have a
few real scenes to eyeball.
--------------------------------------------------------------------------
"""

from pathlib import Path
from typing import Optional

import numpy as np
import rasterio
from PIL import Image

SCALE = 4

# Calibration constants (bands are normalized 0-1 by preprocess_raster).
# A residual of 0 = perfect self-consistency. These caps just control how
# residual values are scaled into the 0-100% ranges shown on screen.
MAX_EXPECTED_RESIDUAL = 0.18   # residual at/above this -> 0% confidence
SUSPICIOUS_THRESHOLD = 0.12   # per-pixel residual above this -> "suspicious"
MAX_EXPECTED_RMSE = 0.20      # RMSE at/above this -> 0% spectral fidelity
GEO_TOLERANCE_PIXELS = 1.5    # allowed corner drift, in output pixels

BAND_NAMES = ["B02 - Blue", "B03 - Green", "B04 - Red", "B08 - NIR"]


class ValidationInputMissing(Exception):
    """Raised when the input/output rasters needed for validation aren't ready yet."""
    pass


def _read_bands(path: Path) -> np.ndarray:
    with rasterio.open(path) as src:
        return src.read().astype(np.float32)


def _downsample_block_mean(image: np.ndarray, scale: int) -> np.ndarray:
    """Block-average downsample a (C, H, W) array by an integer factor."""
    c, h, w = image.shape
    h2, w2 = h - (h % scale), w - (w % scale)
    cropped = image[:, :h2, :w2]
    reshaped = cropped.reshape(c, h2 // scale, scale, w2 // scale, scale)
    return reshaped.mean(axis=(2, 4))


def _consistency_arrays(input_path: Path, output_path: Path):
    """
    Returns (input_crop, downsampled_output, residual) all shaped (bands, H, W)
    at the ORIGINAL (pre-SR) resolution, cropped to a common size.
    """
    input_bands = _read_bands(input_path)
    output_bands = _read_bands(output_path)

    n_bands = min(input_bands.shape[0], output_bands.shape[0])
    input_bands = input_bands[:n_bands]
    output_bands = output_bands[:n_bands]

    downsampled = _downsample_block_mean(output_bands, SCALE)

    h = min(input_bands.shape[1], downsampled.shape[1])
    w = min(input_bands.shape[2], downsampled.shape[2])

    input_crop = np.nan_to_num(input_bands[:, :h, :w])
    downsampled = np.nan_to_num(downsampled[:, :h, :w])

    residual = np.abs(input_crop - downsampled)
    return input_crop, downsampled, residual


def _heatmap_png(per_pixel_score: np.ndarray, path: Path, invert: bool = False):
    """
    Save a simple blue -> yellow -> red heatmap PNG for a (H, W) array
    already scaled to 0-1 (1 = "hot"/flagged, 0 = "cool"/fine unless invert).
    Avoids adding a matplotlib dependency for one colormap.
    """
    score = np.clip(per_pixel_score, 0.0, 1.0)
    if invert:
        score = 1.0 - score

    h, w = score.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)

    # blue (low) -> yellow (mid) -> red (high)
    rgb[..., 0] = np.clip(score * 2, 0, 1) * 255                     # R
    rgb[..., 1] = np.clip(1 - np.abs(score - 0.5) * 2, 0, 1) * 255   # G
    rgb[..., 2] = np.clip(1 - score * 2, 0, 1) * 255                 # B

    Image.fromarray(rgb, mode="RGB").save(path)


def compute_confidence(input_path: Path, output_path: Path, images_dir: Path, stem: str):
    input_crop, downsampled, residual = _consistency_arrays(input_path, output_path)

    per_pixel_residual = residual.mean(axis=0)  # (H, W)
    confidence_per_pixel = 1.0 - np.clip(per_pixel_residual / MAX_EXPECTED_RESIDUAL, 0, 1)

    overall_confidence = float(confidence_per_pixel.mean() * 100)
    high_confidence_pct = float((confidence_per_pixel >= 0.8).mean() * 100)
    uncertain_pct = float((confidence_per_pixel < 0.5).mean() * 100)

    image_filename = f"{stem}_confidence.png"
    _heatmap_png(1 - confidence_per_pixel, images_dir / image_filename)

    return {
        "status": "ready",
        "message": "Confidence computed from output/input self-consistency (no ground-truth HR image available).",
        "overall_confidence": round(overall_confidence, 1),
        "high_confidence_area": round(high_confidence_pct, 1),
        "uncertain_area": round(uncertain_pct, 1),
        "image": image_filename,
    }


def compute_spectral_validation(input_path: Path, output_path: Path):
    input_crop, downsampled, residual = _consistency_arrays(input_path, output_path)
    n_bands = input_crop.shape[0]

    overall_rmse = float(np.sqrt(np.mean(residual ** 2)))
    spectral_fidelity = float(max(0.0, 1 - overall_rmse / MAX_EXPECTED_RMSE) * 100)

    # Spectral Angle Mapper: angle (degrees) between each pixel's spectral
    # vector in the input vs. the downsampled output, averaged over all pixels.
    a = input_crop.reshape(n_bands, -1)
    b = downsampled.reshape(n_bands, -1)
    dot = np.sum(a * b, axis=0)
    norm_a = np.linalg.norm(a, axis=0)
    norm_b = np.linalg.norm(b, axis=0)
    denom = np.clip(norm_a * norm_b, 1e-8, None)
    cos_angle = np.clip(dot / denom, -1.0, 1.0)
    sam_degrees = float(np.degrees(np.arccos(cos_angle)).mean())

    bands = []
    for i in range(min(n_bands, len(BAND_NAMES))):
        band_rmse = float(np.sqrt(np.mean(residual[i] ** 2)))
        bands.append({
            "band": BAND_NAMES[i],
            "rmse": round(band_rmse, 4),
            "status": "Pass" if band_rmse < MAX_EXPECTED_RMSE * 0.6 else "Review",
        })

    return {
        "status": "ready",
        "message": "Spectral fidelity computed by comparing each band to the source imagery via self-consistency.",
        "spectral_fidelity": round(spectral_fidelity, 1),
        "sam_score": round(sam_degrees, 2),
        "rmse": round(overall_rmse, 4),
        "bands": bands,
    }


def compute_geographic_validation(input_path: Path, output_path: Path):
    with rasterio.open(input_path) as src_in, rasterio.open(output_path) as src_out:
        crs_in = str(src_in.crs)
        crs_out = str(src_out.crs)
        bounds_in = src_in.bounds
        bounds_out = src_out.bounds
        px_out = src_out.res[0]

    crs_match = crs_in == crs_out and crs_in != "None"

    corner_deltas = [
        abs(bounds_in.left - bounds_out.left),
        abs(bounds_in.bottom - bounds_out.bottom),
        abs(bounds_in.right - bounds_out.right),
        abs(bounds_in.top - bounds_out.top),
    ]
    max_delta = max(corner_deltas) if corner_deltas else 0.0
    tolerance = GEO_TOLERANCE_PIXELS * px_out if px_out else 0.0
    aligned = crs_match and max_delta <= tolerance

    fidelity = 100.0 if aligned else float(max(0.0, 100 - (max_delta / max(tolerance, 1e-6)) * 20))

    return {
        "status": "ready",
        "message": "Compared source and output GeoTIFF CRS and geographic bounds directly.",
        "geographic_fidelity": round(fidelity, 1),
        "crs": crs_in if crs_in != "None" else "Unknown",
        "alignment": "Aligned" if aligned else "Misaligned",
        "max_corner_drift_m": round(max_delta, 3),
    }


def compute_hallucination_check(input_path: Path, output_path: Path, images_dir: Path, stem: str):
    input_crop, downsampled, residual = _consistency_arrays(input_path, output_path)

    per_pixel_residual = residual.mean(axis=0)  # (H, W)
    suspicious_mask = per_pixel_residual > SUSPICIOUS_THRESHOLD
    suspicious_pct = float(suspicious_mask.mean() * 100)

    if suspicious_pct < 5:
        risk_level, trust_status = "Low", "Trusted"
    elif suspicious_pct < 15:
        risk_level, trust_status = "Medium", "Needs Review"
    else:
        risk_level, trust_status = "High", "Needs Review"

    image_filename = f"{stem}_hallucination.png"
    normalized = np.clip(per_pixel_residual / MAX_EXPECTED_RESIDUAL, 0, 1)
    _heatmap_png(normalized, images_dir / image_filename)

    return {
        "status": "ready",
        "message": "Suspicious regions are areas where the AI output is inconsistent with the original observed data.",
        "suspicious_regions": round(suspicious_pct, 1),
        "risk_level": risk_level,
        "trust_status": trust_status,
        "image": image_filename,
    }
