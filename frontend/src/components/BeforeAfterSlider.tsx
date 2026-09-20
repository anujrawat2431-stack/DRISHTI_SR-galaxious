import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** Fixed height in px for the comparison area. Defaults to 480. */
  height?: number;
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = "Before",
  afterAlt = "After",
  beforeLabel = "Before",
  afterLabel = "After",
  height = 480,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50); // percent, 0-100
  const [dragging, setDragging] = useState(false);
  const [beforeDims, setBeforeDims] = useState<string | null>(null);
  const [afterDims, setAfterDims] = useState<string | null>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => updateFromClientX(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) updateFromClientX(e.touches[0].clientX);
    };
    const stopDragging = () => setDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("touchend", stopDragging);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchend", stopDragging);
    };
  }, [dragging, updateFromClientX]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPosition(50)}
        title="Reset slider"
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      <div
        ref={containerRef}
        className="relative w-full select-none overflow-hidden rounded-xl bg-black/5"
        style={{ height }}
        onMouseDown={(e) => {
          setDragging(true);
          updateFromClientX(e.clientX);
        }}
        onTouchStart={(e) => {
          setDragging(true);
          if (e.touches[0]) updateFromClientX(e.touches[0].clientX);
        }}
      >
        {/* After image — full size, sits underneath */}
        <img
          src={afterSrc}
          alt={afterAlt}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            setAfterDims(`${img.naturalWidth}×${img.naturalHeight}`);
          }}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />

        {/* Before image — same full size, clipped via clip-path so it never
            squishes/stretches as the slider moves (no pixel math needed). */}
        <img
          src={beforeSrc}
          alt={beforeAlt}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            setBeforeDims(`${img.naturalWidth}×${img.naturalHeight}`);
          }}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />

        {/* Divider line + drag handle */}
        <div
          className="absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
          style={{ left: `${position}%` }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-white shadow-lg">
            <ChevronLeft className="-mr-1 h-3.5 w-3.5 text-slate-600" />
            <ChevronRight className="-ml-1 h-3.5 w-3.5 text-slate-600" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
          <span className="font-semibold">{beforeLabel}</span>
          {beforeDims && <span className="text-white/70">{beforeDims}</span>}
        </div>
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
          <span className="font-semibold">{afterLabel}</span>
          {afterDims && <span className="text-white/70">{afterDims}</span>}
        </div>
      </div>
    </div>
  );
}
