import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Map as MapIcon,
  ShieldCheck,
  RefreshCw,
  FileImage,
} from "lucide-react";
import { getConfidence, getValidationImageUrl } from "../services/api";
import HeatmapLegend from "../components/HeatmapLegend";
import { getProcessedFile, getActiveDemo } from "../services/projectState";

interface ConfidenceResult {
  status?: string;
  message?: string;
  overall_confidence?: number;
  high_confidence_area?: number;
  uncertain_area?: number;
  image?: string;
}

export default function Confidence() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Checking...");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<ConfidenceResult | null>(null);
  const [processedFile, setProcessedFile] = useState(getProcessedFile() || "");

  const loadConfidence = async () => {
    try {
      setLoading(true);
      setMessage("");
      const currentFile = getProcessedFile();
      setProcessedFile(currentFile || "");

      const demo = getActiveDemo();
      if (demo?.validation?.confidence) {
        setData(demo.validation.confidence);
        setStatus("Ready");
        setMessage(demo.validation.confidence.message || "");
        setLoading(false);
        return;
      }

      const result = await getConfidence();
      setData(result);
      setStatus(result.status === "ready" ? "Ready" : result.status || "Ready");
      setMessage(result.message || "");
    } catch (error) {
      setData(null);
      setStatus("Not Ready");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load confidence data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfidence();
  }, []);

  const isReady = data?.status === "ready";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
          <ShieldCheck className="h-4 w-4" /> VALIDATION
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Confidence Map
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Visualize the model's confidence across the enhanced satellite
          image.
        </p>
        <button
          onClick={loadConfidence}
          disabled={loading}
          className="mt-4 flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Checking..." : "Refresh Confidence"}
        </button>
      </div>

      {/* Processed File */}
      {processedFile && (
        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-sm">
          <div className="rounded-lg bg-blue-50 p-2">
            <FileImage className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Validation Input
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary">
              {processedFile}
            </p>
          </div>
        </div>
      )}

      {/* API Status */}
      {!loading && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            status === "Not Ready"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          <p className="font-medium">Status: {status}</p>
          {message && <p className="mt-1">{message}</p>}
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Overall Confidence
          </p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {isReady ? `${data?.overall_confidence}%` : "--"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {isReady ? "Self-consistency score" : "Awaiting AI output"}
          </p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            High Confidence Area
          </p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {isReady ? `${data?.high_confidence_area}%` : "--"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Percentage of image
          </p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Uncertain Area
          </p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {isReady ? `${data?.uncertain_area}%` : "--"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Requires inspection
          </p>
        </div>
      </div>

      {/* Confidence Visualization */}
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface shadow-sm">
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
          <MapIcon className="h-5 w-5 text-text-secondary" />
          <div>
            <h2 className="font-semibold text-text-primary">
              Confidence Visualization
            </h2>
            <p className="text-sm text-text-secondary">
              Blue = high confidence, red = low confidence (self-consistency
              heatmap).
            </p>
          </div>
        </div>
        <div className="flex aspect-video items-center justify-center bg-bg-surface-secondary">
          {isReady && data?.image ? (
            <img
              src={data.image.startsWith("/") ? data.image : getValidationImageUrl(data.image)}
              alt="Confidence heatmap"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 font-medium text-text-secondary">
                Confidence map unavailable
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Run Super Resolution first, then refresh this page.
              </p>
            </div>
          )}
        </div>
        {isReady && data?.image && (
          <div className="border-t border-border-subtle px-5 py-4">
            <HeatmapLegend goodLabel="Blue = confident" badLabel="Red = uncertain" />
          </div>
        )}
      </div>

      {/* Plain-language explanation */}
      {isReady && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
          <p className="text-sm font-semibold text-blue-900">
            What am I looking at?
          </p>
          <p className="mt-2 text-sm leading-6 text-blue-800">
            To check its own work, the AI shrinks its sharpened image back
            down to the original size and compares it to the real satellite
            photo. Where the two still match, that part of the image is
            colored <strong>blue</strong> — the AI's added sharpness is
            backed by real data. Where they don't match as well, that area
            shifts toward <strong>yellow, orange, or red</strong> — meaning
            the AI guessed at detail that isn't fully confirmed by the
            original photo, so it's worth a closer look before relying on it.
          </p>
          <p className="mt-3 text-sm leading-6 text-blue-800">
            For this image, <strong>{data?.overall_confidence}%</strong> of
            the scene is high-confidence, and only{" "}
            <strong>{data?.uncertain_area}%</strong> falls into the uncertain
            range — meaning the AI's enhancements here are, on the whole,
            well supported by the real satellite data it started from.
          </p>
        </div>
      )}

      {/* Uncertainty Warning */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
        <div>
          <p className="font-medium text-amber-900">Uncertainty awareness</p>
          <p className="mt-1 text-sm leading-6 text-amber-700">
            Low-confidence regions should be reviewed before using the
            enhanced imagery for critical analysis.
          </p>
        </div>
      </div>

      {/* Next Validation */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate("/validation/spectral")}
          className="rounded-lg bg-bg-surface px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Next: Spectral Validation →
        </button>
      </div>
    </div>
  );
}
