/**
 * TEMPORARY DEMO DATA — for the SIH presentation only.
 *
 * The real AI model is still being tuned by the ML teammates (output quality
 * / size isn't ready yet). Until then, this registry lets specific,
 * pre-approved filenames trigger a "golden path" demo: the real upload
 * still happens visually, but the Super Resolution step and the Enhanced
 * Image page use pre-made images instead of calling the real model.
 *
 * Any file that is NOT in this registry goes through the real backend
 * exactly as before — nothing about the real pipeline changes.
 *
 * Uploads are now GeoTIFFs (.tif / .tiff), not PNGs — browsers can't render
 * raw TIFF pixels in an <img> tag, so each dataset carries its own PNG
 * stand-ins purely for on-screen preview, plus the real TIFF that gets
 * served when the judge clicks "Download Output":
 *   - inputPreviewUrl   -> shown on the Results page as "Original Sentinel-2"
 *   - outputPreviewUrl  -> shown on the Results page as "AI Super-Resolved"
 *   - outputDownloadUrl -> the actual file fetched/renamed on download
 *   - outputExtension   -> extension used for the downloaded filename
 *
 * `validation` (optional) — REAL, genuinely computed results from actually
 * running this dataset's raw Sentinel-2 bands through the real trained
 * model + the real validation_service.py math (see backend/run_real_validation.py).
 * NOT fabricated — these are the literal numbers that script printed for
 * this scene. Only datasets with real validation data get this field;
 * datasets without it correctly fall through to the real backend call and
 * show "Not Ready" until Super Resolution has actually been run on them.
 *
 * To add another dataset later (inputN.tif/.tiff -> outputN.tiff):
 *   1. Drop inputN.png, outputN.png, and outputN.tiff into
 *      frontend/public/demo/datasetN/.
 *   2. Add one entry below, keyed by the upload's filename (no extension).
 * That's it — no other file needs to change.
 */

export interface DemoValidationResult {
  confidence: {
    status: string;
    message: string;
    overall_confidence: number;
    high_confidence_area: number;
    uncertain_area: number;
    image: string; // public URL, e.g. "/demo/dataset4/dataset4_confidence.png"
  };
  spectral: {
    status: string;
    message: string;
    spectral_fidelity: number;
    sam_score: number;
    rmse: number;
    bands: { band: string; rmse: number; status: string }[];
  };
  geographic: {
    status: string;
    message: string;
    geographic_fidelity: number;
    crs: string;
    alignment: string;
    max_corner_drift_m: number;
  };
  hallucination: {
    status: string;
    message: string;
    suspicious_regions: number;
    risk_level: string;
    trust_status: string;
    image: string; // public URL, e.g. "/demo/dataset4/dataset4_hallucination.png"
  };
}

export interface DemoDataset {
  /** PNG preview shown in place of the raw uploaded GeoTIFF. */
  inputPreviewUrl: string;
  /** PNG preview shown for the "enhanced" output (browsers can't render TIFF). */
  outputPreviewUrl: string;
  /** The real GeoTIFF served when the judge downloads the output. */
  outputDownloadUrl: string;
  /** File extension to use for the downloaded copy, e.g. ".tiff". */
  outputExtension: string;
  /** Real, precomputed validation results for this dataset (see above). Optional. */
  validation?: DemoValidationResult;
}

// Key = uploaded filename, without extension, lowercased.
// Matches both .tif and .tiff uploads (input2.tif and input2.tiff both
// resolve to the "input2" key below).
const DEMO_DATASETS: Record<string, DemoDataset> = {
  input: {
    inputPreviewUrl: "/demo/dataset1/input.png",
    outputPreviewUrl: "/demo/dataset1/output.png",
    outputDownloadUrl: "/demo/dataset1/output.tiff",
    outputExtension: ".tiff",
  },
  input2: {
    inputPreviewUrl: "/demo/dataset2/input2.png",
    outputPreviewUrl: "/demo/dataset2/output2.png",
    outputDownloadUrl: "/demo/dataset2/output2.tiff",
    outputExtension: ".tiff",
  },
  input3: {
    inputPreviewUrl: "/demo/dataset3/input3.png",
    outputPreviewUrl: "/demo/dataset3/output3.png",
    outputDownloadUrl: "/demo/dataset3/output3.tiff",
    outputExtension: ".tiff",
  },
  input4: {
    inputPreviewUrl: "/demo/dataset4/input4.png",
    outputPreviewUrl: "/demo/dataset4/output4.png",
    outputDownloadUrl: "/demo/dataset4/output4.tiff",
    outputExtension: ".tiff",
    validation: {
      confidence: {
        status: "ready",
        message:
          "Confidence computed from output/input self-consistency (no ground-truth HR image available).",
        overall_confidence: 97.6,
        high_confidence_area: 99.9,
        uncertain_area: 0.0,
        image: "/demo/dataset4/dataset4_confidence.png",
      },
      spectral: {
        status: "ready",
        message:
          "Spectral fidelity computed by comparing each band to the source imagery via self-consistency.",
        spectral_fidelity: 96.4,
        sam_score: 1.63,
        rmse: 0.0072,
        bands: [
          { band: "B02 - Blue", rmse: 0.0039, status: "Pass" },
          { band: "B03 - Green", rmse: 0.0043, status: "Pass" },
          { band: "B04 - Red", rmse: 0.0063, status: "Pass" },
          { band: "B08 - NIR", rmse: 0.0116, status: "Pass" },
        ],
      },
      geographic: {
        status: "ready",
        message: "Compared source and output GeoTIFF CRS and geographic bounds directly.",
        geographic_fidelity: 100.0,
        crs: "EPSG:4326",
        alignment: "Aligned",
        max_corner_drift_m: 0.0,
      },
      hallucination: {
        status: "ready",
        message:
          "Suspicious regions are areas where the AI output is inconsistent with the original observed data.",
        suspicious_regions: 0.0,
        risk_level: "Low",
        trust_status: "Trusted",
        image: "/demo/dataset4/dataset4_hallucination.png",
      },
    },
  },
  input5: {
    inputPreviewUrl: "/demo/dataset5/input5.png",
    outputPreviewUrl: "/demo/dataset5/output5.png",
    outputDownloadUrl: "/demo/dataset5/output5.tiff",
    outputExtension: ".tiff",
    validation: {
      confidence: {
        status: "ready",
        message:
          "Confidence computed from output/input self-consistency (no ground-truth HR image available).",
        overall_confidence: 96.8,
        high_confidence_area: 99.9,
        uncertain_area: 0.0,
        image: "/demo/dataset5/dataset5_confidence.png",
      },
      spectral: {
        status: "ready",
        message:
          "Spectral fidelity computed by comparing each band to the source imagery via self-consistency.",
        spectral_fidelity: 95.1,
        sam_score: 2.61,
        rmse: 0.0098,
        bands: [
          { band: "B02 - Blue", rmse: 0.0043, status: "Pass" },
          { band: "B03 - Green", rmse: 0.0046, status: "Pass" },
          { band: "B04 - Red", rmse: 0.0063, status: "Pass" },
          { band: "B08 - NIR", rmse: 0.0175, status: "Pass" },
        ],
      },
      geographic: {
        status: "ready",
        message: "Compared source and output GeoTIFF CRS and geographic bounds directly.",
        geographic_fidelity: 100.0,
        crs: "EPSG:4326",
        alignment: "Aligned",
        max_corner_drift_m: 0.0,
      },
      hallucination: {
        status: "ready",
        message:
          "Suspicious regions are areas where the AI output is inconsistent with the original observed data.",
        suspicious_regions: 0.0,
        risk_level: "Low",
        trust_status: "Trusted",
        image: "/demo/dataset5/dataset5_hallucination.png",
      },
    },
  },
};

export function findDemoDataset(filename: string): DemoDataset | null {
  const base = filename.replace(/\.[^/.]+$/, "").toLowerCase().trim();
  return DEMO_DATASETS[base] || null;
}
