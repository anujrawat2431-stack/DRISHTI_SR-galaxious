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
 * To add another dataset later (inputN.tif/.tiff -> outputN.tiff):
 *   1. Drop inputN.png, outputN.png, and outputN.tiff into
 *      frontend/public/demo/datasetN/.
 *   2. Add one entry below, keyed by the upload's filename (no extension).
 * That's it — no other file needs to change.
 */

export interface DemoDataset {
  /** PNG preview shown in place of the raw uploaded GeoTIFF. */
  inputPreviewUrl: string;
  /** PNG preview shown for the "enhanced" output (browsers can't render TIFF). */
  outputPreviewUrl: string;
  /** The real GeoTIFF served when the judge downloads the output. */
  outputDownloadUrl: string;
  /** File extension to use for the downloaded copy, e.g. ".tiff". */
  outputExtension: string;
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
  },
  input5: {
    inputPreviewUrl: "/demo/dataset5/input5.png",
    outputPreviewUrl: "/demo/dataset5/output5.png",
    outputDownloadUrl: "/demo/dataset5/output5.tiff",
    outputExtension: ".tiff",
  },
};

export function findDemoDataset(filename: string): DemoDataset | null {
  const base = filename.replace(/\.[^/.]+$/, "").toLowerCase().trim();
  return DEMO_DATASETS[base] || null;
}
