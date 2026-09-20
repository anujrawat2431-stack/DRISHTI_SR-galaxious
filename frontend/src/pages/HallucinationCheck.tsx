import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, RefreshCw, ShieldAlert } from "lucide-react";
import { getHallucinationCheck, getValidationImageUrl } from "../services/api";
import { getActiveDemo } from "../services/projectState";

interface HallucinationResult {
  status?: string;
  message?: string;
  suspicious_regions?: number;
  risk_level?: string;
  trust_status?: string;
  image?: string;
}

export default function HallucinationCheck() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Checking...");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<HallucinationResult | null>(null);

  const loadHallucinationCheck = async () => {
    try {
      setLoading(true);

      const demo = getActiveDemo();
      if (demo?.validation?.hallucination) {
        setData(demo.validation.hallucination);
        setStatus("Ready");
        setMessage(demo.validation.hallucination.message || "");
        setLoading(false);
        return;
      }

      const result = await getHallucinationCheck();
      setData(result);
      setStatus(result.status === "ready" ? "Ready" : result.status || "Ready");
      setMessage(result.message || "");
    } catch (error) {
      setData(null);
      setStatus("Not Ready");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load hallucination analysis",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHallucinationCheck();
  }, []);

  const isReady = data?.status === "ready";
  const riskColor =
    data?.risk_level === "Low"
      ? "text-emerald-600"
      : data?.risk_level === "Medium"
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-orange-600">
          <ShieldAlert className="h-4 w-4" /> AI SAFETY CHECK
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Hallucination Check
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          Identify suspicious details introduced by the super-resolution model
          that may not exist in the original imagery.
        </p>
        <button
          onClick={loadHallucinationCheck}
          disabled={loading}
          className="mt-4 flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Checking..." : "Refresh Analysis"}
        </button>
      </div>

      {/* API Status */}
      {!loading && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            status === "Not Ready"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-orange-200 bg-orange-50 text-orange-700"
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
            Suspicious Regions
          </p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {isReady ? `${data?.suspicious_regions}%` : "--"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {isReady ? "Of total image area" : "Awaiting AI analysis"}
          </p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Risk Level
          </p>
          <p className={`mt-2 text-2xl font-semibold ${isReady ? riskColor : "text-text-primary"}`}>
            {isReady ? data?.risk_level : "Pending"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">Model assessment</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Trust Status
          </p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {isReady ? data?.trust_status : "Pending"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Validation required
          </p>
        </div>
      </div>

      {/* Suspicious Detail Map */}
      <div className="rounded-2xl border border-border-subtle bg-bg-surface shadow-sm">
        <div className="border-b border-border-subtle px-5 py-4">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-text-secondary" />
            <div>
              <h2 className="font-semibold text-text-primary">
                Suspicious Detail Map
              </h2>
              <p className="text-sm text-text-secondary">
                Red areas show detail the model added that isn't backed by
                the original observation.
              </p>
            </div>
          </div>
        </div>
        <div className="flex aspect-video items-center justify-center bg-bg-surface-secondary">
          {isReady && data?.image ? (
            <img
              src={data.image.startsWith("/") ? data.image : getValidationImageUrl(data.image)}
              alt="Hallucination heatmap"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 font-medium text-text-secondary">
                Hallucination analysis pending
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Run Super Resolution first, then refresh this page.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Why this matters */}
      <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />
        <div>
          <p className="font-medium text-orange-900">Why this matters</p>
          <p className="mt-1 text-sm leading-6 text-orange-700">
            Super-resolution models can create visually plausible details that
            are not supported by the original satellite observation. Suspicious
            regions should therefore be reviewed before decision-making.
          </p>
        </div>
      </div>

      {/* Next Analysis */}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          onClick={() => navigate("/analysis/crop")}
          className="rounded-lg border border-border-subtle bg-bg-surface px-5 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-bg-surface-secondary"
        >
          Crop Analysis
        </button>
        <button
          onClick={() => navigate("/analysis/urban")}
          className="rounded-lg border border-border-subtle bg-bg-surface px-5 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-bg-surface-secondary"
        >
          Urban Analysis
        </button>
        <button
          onClick={() => navigate("/analysis/disaster")}
          className="rounded-lg bg-bg-surface px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Disaster Analysis →
        </button>
      </div>
    </div>
  );
}
