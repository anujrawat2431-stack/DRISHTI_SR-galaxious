import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  Download,
  FileImage,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { getProcessingResults } from "../services/api";
import {
  getActiveDemo,
  getDemoInputPreviewUrl,
  getDemoSuperResolutionDone,
} from "../services/projectState";
interface ProcessingResult {
  status?: string;
  stage?: string;
  input_filename?: string | null;
  output_filename?: string | null;
  input_resolution?: string;
  target_resolution?: string;
}
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// TEMPORARY DEMO SETTING — see services/demoDatasets.ts. How long the
// enhanced output stays hidden behind a loading buffer after landing on
// this page, before it reveals. Purely cosmetic.
const DEMO_REVEAL_DELAY_MS = 3000;

// Persistent download counter so repeated downloads get sentinal2_4m_processed(1),
// (2), (3)... across the whole session (and across page reloads).
const DOWNLOAD_COUNTER_KEY = "sr_download_counter";
function getNextDownloadName(extension: string): string {
  const current =
    parseInt(localStorage.getItem(DOWNLOAD_COUNTER_KEY) || "0", 10) + 1;
  localStorage.setItem(DOWNLOAD_COUNTER_KEY, String(current));
  return `sentinal2_4m_processed(${current})${extension}`;
}

export default function Results() {
  const navigate = useNavigate();
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Demo-mode reveal state
  const demo = getActiveDemo();
  const [revealing, setRevealing] = useState(!!demo);
  const [revealed, setRevealed] = useState(false);

  const loadResults = async () => {
    if (demo) {
      // Demo datasets never touch the real backend for results.
      setLoading(false);
      setError("");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const data = await getProcessingResults();
      setResult(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load processing results",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!demo || !getDemoSuperResolutionDone()) return;
    setRevealing(true);
    setRevealed(false);
    const timer = window.setTimeout(() => {
      setRevealing(false);
      setRevealed(true);
    }, DEMO_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const demoInputUrl = demo ? getDemoInputPreviewUrl() : null;
  const demoOutputReady = demo && getDemoSuperResolutionDone();

  const inputFile = demo
    ? "Uploaded image (demo)"
    : result?.input_filename || "No input file";
  const outputFile = demo
    ? demoOutputReady
      ? "Enhanced output (demo)"
      : null
    : result?.output_filename || null;
  const inputResolution = result?.input_resolution || "10m";
  const targetResolution = result?.target_resolution || "≤4m";
  // Shown in the "AI Super-Resolved" <img> — always a PNG, since browsers
  // can't render a raw GeoTIFF. The real downloadable file is separate.
  const outputUrl = demo
    ? demo!.outputPreviewUrl
    : outputFile
      ? `${API_URL}/api/processing/output/${encodeURIComponent(outputFile)}`
      : "";

  // The actual file fetched when the judge clicks "Download Output" — the
  // real GeoTIFF for demo datasets, same as outputUrl for the real backend.
  const downloadSourceUrl = demo ? demo!.outputDownloadUrl : outputUrl;

  const handleDownload = async () => {
    if (!downloadSourceUrl) return;
    try {
      const extension = demo ? demo!.outputExtension : ".tif";
      const downloadName = getNextDownloadName(extension);
      const response = await fetch(downloadSourceUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fall back to opening the file directly if the fetch/blob approach
      // fails for any reason (e.g. cross-origin quirks).
      window.open(downloadSourceUrl, "_blank");
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {" "}
      {/* Header */}{" "}
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        {" "}
        <div>
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
              {" "}
              RESULTS{" "}
            </span>{" "}
            <span className="text-xs text-text-muted"> SIH 26142 </span>{" "}
          </div>{" "}
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary">
            {" "}
            Enhanced Satellite Image{" "}
          </h1>{" "}
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            {" "}
            Review the processed satellite imagery and prepare it for validation
            and downstream analysis.{" "}
          </p>{" "}
        </div>{" "}
        {!demo && (
          <button
            onClick={loadResults}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {" "}
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />{" "}
            {loading ? "Loading..." : "Refresh Results"}{" "}
          </button>
        )}{" "}
      </section>{" "}
      {/* Error */}{" "}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {" "}
          <p className="font-semibold"> Backend connection error </p>{" "}
          <p className="mt-1"> {error} </p>{" "}
        </div>
      )}{" "}
      {/* Summary */}{" "}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {" "}
        <SummaryCard
          icon={Upload}
          title="Input Resolution"
          value={inputResolution}
          subtitle="Sentinel-2 source"
        />{" "}
        <SummaryCard
          icon={Sparkles}
          title="Target Resolution"
          value={targetResolution}
          subtitle="Super-resolution target"
        />{" "}
        <SummaryCard
          icon={ShieldCheck}
          title="Processing Status"
          value={demo ? (demoOutputReady ? "completed" : "idle") : result?.status || "idle"}
          subtitle={demo ? "AI Super Resolution" : result?.stage || "Waiting for processing"}
        />{" "}
        <SummaryCard
          icon={CheckCircle2}
          title="Output"
          value={outputFile ? "Available" : "Pending"}
          subtitle={
            outputFile ? "Processed file ready" : "Waiting for AI model"
          }
        />{" "}
      </section>{" "}
      {/* Processing Information */}{" "}
      <section className="rounded-2xl border border-border-subtle bg-bg-surface p-6 shadow-sm">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            {" "}
            <FileImage className="h-5 w-5 text-blue-600" />{" "}
          </div>{" "}
          <div>
            {" "}
            <h2 className="font-semibold text-text-primary">
              {" "}
              Processing Information{" "}
            </h2>{" "}
            <p className="text-xs text-text-muted">
              {" "}
              Current project files{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {" "}
          <div className="rounded-xl border border-border-subtle bg-bg-surface-secondary p-4">
            {" "}
            <p className="text-xs font-medium text-text-muted">
              {" "}
              Input File{" "}
            </p>{" "}
            <p className="mt-2 break-all text-sm font-semibold text-text-primary">
              {" "}
              {inputFile}{" "}
            </p>{" "}
          </div>{" "}
          <div className="rounded-xl border border-border-subtle bg-bg-surface-secondary p-4">
            {" "}
            <p className="text-xs font-medium text-text-muted">
              {" "}
              Enhanced Output{" "}
            </p>{" "}
            <p className="mt-2 break-all text-sm font-semibold text-text-primary">
              {" "}
              {outputFile || "Waiting for AI output"}{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      {/* Image Comparison */}{" "}
      <section className="grid gap-6 lg:grid-cols-2">
        {" "}
        {/* Original */}{" "}
        <ImagePanel
          title="Original Sentinel-2"
          subtitle="10 m input imagery"
          icon={Upload}
        >
          {" "}
          {demoInputUrl ? (
            <div className="flex h-[360px] items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-black/5">
              <img
                src={demoInputUrl}
                alt="Original uploaded imagery"
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-bg-surface-secondary">
              {" "}
              <FileImage className="h-12 w-12 text-slate-300" />{" "}
              <p className="mt-4 text-sm font-semibold text-text-secondary">
                {" "}
                Original image preview{" "}
              </p>{" "}
              <p className="mt-1 max-w-sm text-center text-xs text-text-muted">
                {" "}
                GeoTIFF visualization will be connected here.{" "}
              </p>{" "}
            </div>
          )}{" "}
        </ImagePanel>{" "}
        {/* Enhanced */}{" "}
        <ImagePanel
          title="AI Super-Resolved"
          subtitle="Target output up to 4 m"
          icon={Sparkles}
        >
          {" "}
          {demo ? (
            demoOutputReady ? (
              revealing ? (
                <div className="flex h-[360px] flex-col items-center justify-center gap-3 rounded-xl border border-border-subtle bg-bg-surface-secondary">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                  <p className="text-sm font-medium text-text-secondary">
                    Finalizing enhanced image...
                  </p>
                </div>
              ) : (
                <div
                  className={`h-[360px] overflow-hidden rounded-xl border border-green-200 bg-black/5 transition-all duration-700 ${
                    revealed
                      ? "opacity-100 blur-0"
                      : "opacity-0 blur-md"
                  }`}
                >
                  <img
                    src={outputUrl}
                    alt="Enhanced super-resolved output"
                    className="h-full w-full object-contain"
                  />
                </div>
              )
            ) : (
              <div className="flex h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-bg-surface-secondary">
                {" "}
                <Sparkles className="h-12 w-12 text-slate-300" />{" "}
                <p className="mt-4 text-sm font-semibold text-text-secondary">
                  {" "}
                  Waiting for AI output{" "}
                </p>{" "}
                <p className="mt-1 max-w-sm text-center text-xs text-text-muted">
                  {" "}
                  Run Super Resolution first, then come back here.{" "}
                </p>{" "}
              </div>
            )
          ) : outputFile ? (
            <div className="flex h-[360px] flex-col items-center justify-center rounded-xl border border-green-200 bg-green-50">
              {" "}
              <CheckCircle2 className="h-12 w-12 text-green-500" />{" "}
              <p className="mt-4 text-sm font-semibold text-green-700">
                {" "}
                Enhanced output available{" "}
              </p>{" "}
              <p className="mt-1 max-w-sm break-all text-center text-xs text-green-600">
                {" "}
                {outputFile}{" "}
              </p>{" "}
            </div>
          ) : (
            <div className="flex h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-bg-surface-secondary">
              {" "}
              <Sparkles className="h-12 w-12 text-slate-300" />{" "}
              <p className="mt-4 text-sm font-semibold text-text-secondary">
                {" "}
                Waiting for AI output{" "}
              </p>{" "}
              <p className="mt-1 max-w-sm text-center text-xs text-text-muted">
                {" "}
                The enhanced GeoTIFF will appear here after the AI
                super-resolution model produces an output.{" "}
              </p>{" "}
            </div>
          )}{" "}
        </ImagePanel>{" "}
      </section>{" "}
      {/* Actions */}{" "}
      <section className="rounded-2xl border border-border-subtle bg-bg-surface p-6 shadow-sm">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
            {" "}
            <ShieldCheck className="h-5 w-5 text-purple-600" />{" "}
          </div>{" "}
          <div>
            {" "}
            <h2 className="font-semibold text-text-primary">
              {" "}
              Next Steps{" "}
            </h2>{" "}
            <p className="text-xs text-text-muted">
              {" "}
              Continue with validation{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="mt-6 flex flex-wrap gap-3">
          {" "}
          <button
            onClick={() => navigate("/validation/confidence")}
            disabled={!outputFile}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {" "}
            <ShieldCheck className="h-4 w-4" /> Run Validation
          </button>{" "}
          <button
            onClick={handleDownload}
            disabled={!outputFile}
            className="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {" "}
            <Download className="h-4 w-4" /> Download Output{" "}
          </button>{" "}
        </div>{" "}
      </section>{" "}
      {/* Integration Note */}{" "}
      <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
        {" "}
        <div className="flex items-start gap-3">
          {" "}
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />{" "}
          <div>
            {" "}
            <h3 className="text-sm font-semibold text-text-primary">
              {" "}
              AI Integration Ready{" "}
            </h3>{" "}
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {" "}
              The frontend is already connected to the processing API. When the
              AI team integrates the trained super-resolution model, the backend
              can return the generated GeoTIFF filename without requiring
              changes to this page.{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
    </div>
  );
}
/* -------------------------------------------------- Summary Card
-------------------------------------------------- */ function SummaryCard({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-sm">
      {" "}
      <div className="flex items-start justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-sm font-medium text-text-secondary">
            {" "}
            {title}{" "}
          </p>{" "}
          <h3 className="mt-2 break-all text-2xl font-bold tracking-tight text-text-primary">
            {" "}
            {value}{" "}
          </h3>{" "}
          <p className="mt-1 text-xs text-text-muted"> {subtitle} </p>{" "}
        </div>{" "}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          {" "}
          <Icon className="h-5 w-5 text-blue-600" />{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
/* -------------------------------------------------- Image Panel
-------------------------------------------------- */ function ImagePanel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6 shadow-sm">
      {" "}
      <div className="flex items-center gap-3">
        {" "}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          {" "}
          <Icon className="h-5 w-5 text-blue-600" />{" "}
        </div>{" "}
        <div>
          {" "}
          <h2 className="font-semibold text-text-primary"> {title} </h2>{" "}
          <p className="text-xs text-text-muted"> {subtitle} </p>{" "}
        </div>{" "}
      </div>{" "}
      <div className="mt-5"> {children} </div>{" "}
    </div>
  );
}
