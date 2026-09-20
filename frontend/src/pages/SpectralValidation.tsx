import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Radio, RefreshCw } from "lucide-react";
import { getSpectralValidation } from "../services/api";
import { getActiveDemo } from "../services/projectState";

interface BandResult {
  band: string;
  rmse: number;
  status: string;
}

interface SpectralResult {
  status?: string;
  message?: string;
  spectral_fidelity?: number;
  sam_score?: number;
  rmse?: number;
  bands?: BandResult[];
}

export default function SpectralValidation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Checking...");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<SpectralResult | null>(null);

  const loadValidation = async () => {
    try {
      setLoading(true);

      const demo = getActiveDemo();
      if (demo?.validation?.spectral) {
        setData(demo.validation.spectral);
        setStatus("Ready");
        setMessage(demo.validation.spectral.message || "");
        setLoading(false);
        return;
      }

      const result = await getSpectralValidation();
      setData(result);
      setStatus(result.status === "ready" ? "Ready" : result.status || "Ready");
      setMessage(result.message || "");
    } catch (error) {
      setData(null);
      setStatus("Not Ready");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load spectral validation",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidation();
  }, []);

  const isReady = data?.status === "ready";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-600">
          <Radio className="h-4 w-4" /> VALIDATION
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Spectral Validation
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Check whether the AI-enhanced imagery preserves the spectral
          characteristics of the source imagery.
        </p>
        <button
          onClick={loadValidation}
          disabled={loading}
          className="mt-4 flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Checking..." : "Refresh Validation"}
        </button>
      </div>

      {/* API Status */}
      {!loading && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            status === "Not Ready"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-purple-200 bg-purple-50 text-purple-700"
          }`}
        >
          <p className="font-medium">Status: {status}</p>
          {message && <p className="mt-1">{message}</p>}
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Spectral Fidelity", isReady ? `${data?.spectral_fidelity}%` : "--"],
          ["SAM Score", isReady ? `${data?.sam_score}°` : "--"],
          ["RMSE", isReady ? `${data?.rmse}` : "--"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-text-primary">
              {value}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {isReady ? "Computed via self-consistency" : "Awaiting validation"}
            </p>
          </div>
        ))}
      </div>

      {/* Spectral Comparison */}
      <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-surface-secondary">
            <Activity className="h-5 w-5 text-text-secondary" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">
              Spectral Comparison
            </h2>
            <p className="text-sm text-text-secondary">
              Band-wise RMSE between the source and the AI output.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {(isReady && data?.bands
            ? data.bands
            : [
                { band: "B02 · Blue", rmse: null, status: "Pending" },
                { band: "B03 · Green", rmse: null, status: "Pending" },
                { band: "B04 · Red", rmse: null, status: "Pending" },
                { band: "B08 · NIR", rmse: null, status: "Pending" },
              ]
          ).map((b) => (
            <div
              key={b.band}
              className="flex items-center justify-between rounded-lg bg-bg-surface-secondary px-4 py-3"
            >
              <span className="text-sm font-medium text-text-secondary">
                {b.band}
              </span>
              <span
                className={`text-sm font-medium ${
                  b.status === "Pass"
                    ? "text-emerald-600"
                    : b.status === "Review"
                      ? "text-amber-600"
                      : "text-text-muted"
                }`}
              >
                {b.rmse !== null ? `RMSE ${b.rmse} · ${b.status}` : b.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Validation */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate("/validation/geographic")}
          className="rounded-lg bg-bg-surface px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Next: Geographic Check →
        </button>
      </div>
    </div>
  );
}
