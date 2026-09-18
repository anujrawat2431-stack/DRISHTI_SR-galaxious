from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.routes.processing import processing_state, PROCESSED_DIR
from app.services import validation_service as vs

router = APIRouter(
    prefix="/validation",
    tags=["Validation"],
)


def _resolve_pair():
    """
    Returns (input_path, output_path, stem) for the currently processed
    scene, or raises HTTPException(409) if super-resolution hasn't been
    run yet (mirrors the existing "pending" behaviour but with a real reason).
    """
    input_filename = processing_state.get("input_filename")
    output_filename = processing_state.get("output_filename")

    if not input_filename or not output_filename:
        raise HTTPException(
            status_code=409,
            detail="Run Super Resolution first - no processed output available to validate yet.",
        )

    input_path = PROCESSED_DIR / input_filename
    output_path = PROCESSED_DIR / output_filename

    if not input_path.exists() or not output_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Expected input/output files are missing on disk. Re-run Super Resolution.",
        )

    return input_path, output_path, Path(output_filename).stem


@router.get("/confidence")
def confidence_map():
    input_path, output_path, stem = _resolve_pair()
    try:
        return vs.compute_confidence(input_path, output_path, PROCESSED_DIR, stem)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Confidence computation failed: {error}")


@router.get("/spectral")
def spectral_validation():
    input_path, output_path, _ = _resolve_pair()
    try:
        return vs.compute_spectral_validation(input_path, output_path)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Spectral validation failed: {error}")


@router.get("/geographic")
def geographic_validation():
    input_path, output_path, _ = _resolve_pair()
    try:
        return vs.compute_geographic_validation(input_path, output_path)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Geographic validation failed: {error}")


@router.get("/hallucination")
def hallucination_check():
    input_path, output_path, stem = _resolve_pair()
    try:
        return vs.compute_hallucination_check(input_path, output_path, PROCESSED_DIR, stem)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Hallucination check failed: {error}")


@router.get("/image/{filename}")
def get_validation_image(filename: str):
    safe_filename = Path(filename).name
    file_path = PROCESSED_DIR / safe_filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Validation image not found: {safe_filename}")

    return FileResponse(path=file_path, media_type="image/png", filename=safe_filename)
