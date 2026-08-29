import React, { useState, useEffect, useRef } from "react";
import {
  hsvToHex,
  hsvToRgb,
  hexToRgb,
  normalizeHex,
  rgbToHsv,
} from "@/lib/color";

export default function Index(): JSX.Element {
  const [selectedColor, setSelectedColor] = useState("#FF0000");
  const [hexInput, setHexInput] = useState("#FF0000");
  const [showPanel, setShowPanel] = useState(false);
  const [tempColor, setTempColor] = useState(selectedColor);
  const [tempBrightness, setTempBrightness] = useState(1);
  const [panelMode, setPanelMode] = useState<"wheel" | "presets" | "hex">(
    "wheel",
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPointerDown = useRef(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Light the room with the chosen color (the safelight aura).
  useEffect(() => {
    document.body.style.setProperty("--chosen", selectedColor);
    document.body.setAttribute("data-tinted", "true");
  }, [selectedColor]);

  // Compact HSL readout for the live-data line under the hero.
  const colorSpec = (() => {
    const [h, s, v] = rgbToHsv(hexToRgb(selectedColor));
    const l = ((2 - s) * v) / 2;
    const sHsl = v === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
    return `#${selectedColor.replace("#", "").toUpperCase()} · h${Math.round(h)} s${Math.round(sHsl * 100)} l${Math.round(l * 100)}`;
  })();

  // Preset colors for quick selection (moved into panel so they're hidden until interaction)
  const presetColors = [
    "#FF0000",
    "#FF6B00",
    "#FFD700",
    "#00FF00",
    "#00BFFF",
    "#0066FF",
    "#8A2BE2",
    "#FF1493",
    "#FF69B4",
    "#000000",
    "#FFFFFF",
    "#808080",
    "#FF4500",
    "#32CD32",
    "#1E90FF",
  ];

  // Keep tempColor + brightness in sync when opening the panel
  useEffect(() => {
    if (!showPanel) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    setTempColor(selectedColor);
    const [, , v] = rgbToHsv(hexToRgb(selectedColor));
    setTempBrightness(v);
  }, [showPanel, selectedColor]);

  // Focus the dialog on open; restore focus on close
  useEffect(() => {
    if (!showPanel) return;
    const node = dialogRef.current;
    const focusable = node?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? node)?.focus();
    return () => previouslyFocused.current?.focus();
  }, [showPanel]);

  // Close on Escape; trap Tab within the dialog
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setShowPanel(false);
      return;
    }
    if (e.key !== "Tab") return;
    const node = dialogRef.current;
    if (!node) return;
    const items = Array.from(
      node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled"));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Draw color wheel onto canvas (hue + saturation at full value)
  useEffect(() => {
    if (!canvasRef.current || panelMode !== "wheel" || !showPanel) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const image = ctx.createImageData(width, height);
    const data = image.data;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * width + x) * 4;
        if (dist <= radius) {
          let angle = Math.atan2(dy, dx);
          if (angle < 0) angle += Math.PI * 2;
          const hue = (angle * 180) / Math.PI;
          const sat = dist / radius;
          const [r, g, b] = hsvToRgb(hue, sat, 1);
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        } else {
          data[idx + 3] = 0;
        }
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [canvasRef, panelMode, showPanel]);

  const getColorFromPointer = (
    clientX: number,
    clientY: number,
    brightness: number,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(cx, cy);
    if (dist > radius) return null;
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;
    const hue = (angle * 180) / Math.PI;
    const sat = dist / radius;
    return hsvToHex(hue, sat, brightness);
  };

  const startPointer = (e: React.PointerEvent) => {
    isPointerDown.current = true;
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const c = getColorFromPointer(e.clientX, e.clientY, tempBrightness);
    if (c) setTempColor(c);
  };

  const movePointer = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    const c = getColorFromPointer(e.clientX, e.clientY, tempBrightness);
    if (c) setTempColor(c);
  };

  const endPointer = (e?: React.PointerEvent) => {
    isPointerDown.current = false;
    try {
      if (e) (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleApply = async () => {
    setSelectedColor(tempColor);
    setHexInput(tempColor);
    setShowPanel(false);
    await performSearch(tempColor);
  };

  const handleTempChange = (value: string) => {
    const normalized = normalizeHex(value);
    if (normalized) setTempColor(normalized);
    else setTempColor(value.startsWith("#") ? value : "#" + value);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);
    const normalized = normalizeHex(value);
    if (normalized) setSelectedColor(normalized);
  };

  const [images, setImages] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const generateRandomColor = () => {
    const randomColor =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
    setSelectedColor(randomColor);
    setHexInput(randomColor);
    void performSearch(randomColor);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(selectedColor);
      toast("Color copied", "success");
    } catch {
      toast("Copy failed", "error");
    }
  };

  const fetchImages = async (hex: string, pageToFetch = 1) => {
    setIsLoading(true);
    setError(null);
    if (pageToFetch === 1) setHasSearched(true);
    try {
      const res = await fetch(
        `/api/unsplash?hex=${encodeURIComponent(hex)}&page=${pageToFetch}`,
      );
      if (!res.ok) throw new Error("request");
      const data = await res.json();
      const results = data.results || [];
      if (pageToFetch === 1) setImages(results);
      else setImages((prev) => [...prev, ...results]);
      setPage(pageToFetch);
    } catch {
      setError("Couldn’t load images. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async (hex?: string) => {
    const target = (hex ?? selectedColor).toUpperCase();
    setImages([]);
    await fetchImages(target, 1);
  };

  const toast = (msg: string, type: "success" | "error" = "success") => {
    import("sonner").then(({ toast: t }) =>
      type === "success" ? t.success(msg) : t.error(msg),
    );
  };

  return (
    <>
      <div className="safelight" aria-hidden="true" />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full mx-auto flex flex-col items-center text-center">
          {/* Top bar — brand + live color spec */}
          <div className="w-full flex items-center justify-between mb-10">
            <div className="font-mono text-xs tracking-[0.35em] text-[#86868E] uppercase">
              La Imagen
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: selectedColor }}
                aria-hidden="true"
              />
              <span className="font-mono text-xs text-[#86868E]">
                {colorSpec}
              </span>
            </div>
          </div>

          {/* Title */}
          <h1
            className="font-display italic text-[#E8E9EC]"
            style={{
              fontSize: "clamp(3.5rem, 9vw, 8.5rem)",
              lineHeight: "0.9",
              letterSpacing: "-0.03em",
              marginBottom: "0.75rem",
              fontStyle: "italic",
            }}
          >
            La Imagen
          </h1>

          {/* Subtitle */}
          <p
            className="font-display"
            style={{
              fontSize: "clamp(1rem, 2.2vw, 1.25rem)",
              marginBottom: "1.5rem",
              color: "#86868E",
              maxWidth: "28rem",
            }}
          >
            Name a color. Get a contact sheet of photographs in that color.
          </p>

          {/* Color Circle (opens panel) */}
          <div className="flex flex-col items-center mb-8 md:mb-10 space-y-5">
            <button
              aria-label="Open color selector"
              onClick={() => setShowPanel(true)}
              className="rounded-full shadow-2xl flex items-center justify-center transition-transform transform hover:scale-105 ring-1 ring-white/10"
              style={{
                backgroundColor: selectedColor,
                width: "clamp(84px, 10vw, 128px)",
                height: "clamp(84px, 10vw, 128px)",
                boxShadow: "0 18px 48px rgba(0,0,0,0.6)",
              }}
            />

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={generateRandomColor}
                className="flex items-center justify-center px-5 py-2 rounded-full text-sm text-[#E8E9EC] transition border"
                style={{
                  minWidth: 96,
                  background: "#232329",
                  borderColor: "rgba(232,233,236,0.14)",
                }}
                title="Randomize color"
              >
                <span className="text-sm">Randomize</span>
              </button>

              <button
                aria-label="Search"
                onClick={() => performSearch()}
                className="flex items-center justify-center w-11 h-11 rounded-full text-[#E8E9EC] transition border"
                style={{
                  background: "#232329",
                  borderColor: "rgba(232,233,236,0.10)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 21l-4.35-4.35"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="11"
                    cy="11"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={copyToClipboard}
                className="font-mono text-xs text-[#86868E] hover:text-[#E8E9EC] transition"
              >
                {selectedColor}
              </button>
            </div>
          </div>

          {/* Color selector panel (modal) - only shown when interacted with */}
          {showPanel && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowPanel(false);
              }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" />
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Color selector"
                onKeyDown={onPanelKeyDown}
                className="relative z-10 w-full max-w-xl mx-4 bg-[#232329] rounded-2xl p-6 shadow-2xl border"
                style={{ borderColor: "rgba(232,233,236,0.10)" }}
              >
                <h3 className="font-display italic text-[#E8E9EC] text-2xl mb-4">
                  Color Selector
                </h3>

                <div className="flex gap-4 items-start mb-4">
                  <div className="flex-shrink-0">
                    <div className="mb-2 text-sm text-[#86868E]">Preview</div>
                    <div
                      style={{
                        backgroundColor: tempColor,
                        width: 84,
                        height: 84,
                        borderRadius: 12,
                        boxShadow: "inset 0 -2px 8px rgba(0,0,0,0.5)",
                      }}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="mb-3 flex gap-2">
                      <button
                        onClick={() => setPanelMode("wheel")}
                        className={
                          "px-3 py-1 rounded-md text-sm transition " +
                          (panelMode === "wheel"
                            ? "text-[#E8E9EC] bg-white/10"
                            : "text-[#E8E9EC] bg-transparent hover:bg-white/5")
                        }
                      >
                        Wheel
                      </button>
                      <button
                        onClick={() => setPanelMode("presets")}
                        className={
                          "px-3 py-1 rounded-md text-sm transition " +
                          (panelMode === "presets"
                            ? "text-[#E8E9EC] bg-white/10"
                            : "text-[#E8E9EC] bg-transparent hover:bg-white/5")
                        }
                      >
                        Presets
                      </button>
                      <button
                        onClick={() => setPanelMode("hex")}
                        className={
                          "px-3 py-1 rounded-md text-sm transition " +
                          (panelMode === "hex"
                            ? "text-[#E8E9EC] bg-white/10"
                            : "text-[#E8E9EC] bg-transparent hover:bg-white/5")
                        }
                      >
                        Hex
                      </button>
                    </div>

                    {/* Wheel mode */}
                    {panelMode === "wheel" && (
                      <div className="w-full flex items-center gap-4">
                        <canvas
                          ref={canvasRef}
                          width={260}
                          height={260}
                          className="rounded-md"
                          style={{ touchAction: "none", cursor: "crosshair" }}
                          aria-label="Color wheel. Drag to choose hue and saturation."
                          onPointerDown={(e) => startPointer(e)}
                          onPointerMove={(e) => movePointer(e)}
                          onPointerUp={() => endPointer()}
                          onPointerLeave={() => endPointer()}
                        />

                        <div className="flex-1">
                          <div className="mb-2">
                            <label
                              htmlFor="wheel-hex"
                              className="text-sm text-[#86868E]"
                            >
                              Hex
                            </label>
                            <input
                              id="wheel-hex"
                              value={tempColor.replace("#", "")}
                              onChange={(e) => handleTempChange(e.target.value)}
                              className="w-full bg-transparent text-[#E8E9EC] border rounded-md px-3 py-2 mt-1 font-mono"
                              style={{ borderColor: "rgba(232,233,236,0.12)" }}
                            />
                          </div>

                          <div className="mb-3">
                            <label
                              htmlFor="wheel-brightness"
                              className="text-sm text-[#86868E]"
                            >
                              Brightness
                            </label>
                            <input
                              id="wheel-brightness"
                              type="range"
                              min={0}
                              max={100}
                              value={Math.round(tempBrightness * 100)}
                              onChange={(e) => {
                                const v = Number(e.target.value) / 100;
                                setTempBrightness(v);
                                const [h, s] = rgbToHsv(hexToRgb(tempColor));
                                setTempColor(hsvToHex(h, s, v));
                              }}
                              className="w-full mt-1 accent-[color:var(--chosen)]"
                            />
                          </div>

                          <div className="mt-3 grid grid-cols-8 gap-2">
                            {presetColors.map((c) => (
                              <button
                                key={c}
                                aria-label={`Use color ${c}`}
                                onClick={() => handleTempChange(c)}
                                className="w-6 h-6 rounded-full border"
                                style={{
                                  backgroundColor: c,
                                  borderColor: "rgba(232,233,236,0.18)",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Presets mode */}
                    {panelMode === "presets" && (
                      <div className="grid grid-cols-6 gap-3">
                        {presetColors.map((c) => (
                          <button
                            key={c}
                            aria-label={`Use color ${c}`}
                            onClick={() => handleTempChange(c)}
                            className="w-10 h-10 rounded-full border-2 hover:border-[color:var(--chosen)]"
                            style={{
                              backgroundColor: c,
                              borderColor: "rgba(232,233,236,0.18)",
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Hex input mode */}
                    {panelMode === "hex" && (
                      <div>
                        <label
                          htmlFor="hex-input"
                          className="text-sm text-[#86868E]"
                        >
                          Hex
                        </label>
                        <input
                          id="hex-input"
                          value={tempColor.replace("#", "")}
                          onChange={(e) => handleTempChange(e.target.value)}
                          className="w-full bg-transparent text-[#E8E9EC] border rounded-md px-3 py-2 mt-1 font-mono"
                          style={{ borderColor: "rgba(232,233,236,0.12)" }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-4">
                  <button
                    onClick={() => setShowPanel(false)}
                    className="px-4 py-2 rounded-md text-sm text-[#E8E9EC] bg-transparent border"
                    style={{ borderColor: "rgba(232,233,236,0.12)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    className="px-4 py-2 rounded-md text-sm text-[#16161A] font-medium transition"
                    style={{
                      backgroundColor: tempColor,
                      boxShadow: `0 0 0 1px ${tempColor}, 0 8px 24px ${tempColor}55`,
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Images Grid */}
          <div className="w-full max-w-5xl mt-12">
            <div role="status" aria-live="polite" className="sr-only">
              {isLoading ? "Loading images" : error ? error : ""}
            </div>
            {isLoading && images.length === 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-full h-44 bg-[#232329] rounded-lg animate-pulse"
                  />
                ))}
              </div>
            )}
            {!isLoading && error && (
              <div className="text-[#E8E9EC] mb-4 flex flex-col items-center gap-3">
                <span className="text-[#86868E]">{error}</span>
                <button
                  onClick={() => performSearch()}
                  className="px-5 py-2 rounded-full text-sm text-[#E8E9EC] transition border"
                  style={{
                    background: "#232329",
                    borderColor: "rgba(232,233,236,0.14)",
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            {!isLoading && !error && images.length === 0 && hasSearched && (
              <div className="text-[#86868E] mb-4">
                No images found for{" "}
                <span className="font-mono text-[#E8E9EC]">
                  {selectedColor}
                </span>
                . Try another color.
              </div>
            )}
            {images.length > 0 && (
              <>
                <div
                  id="image-grid"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                >
                  {images.map((img) => (
                    <a
                      key={img.id}
                      href={img.links.html}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden shadow-lg bg-[#232329] ring-1 ring-white/5 transition hover:ring-[color:var(--chosen)]"
                    >
                      <div
                        className="w-full h-44 bg-center bg-cover relative"
                        style={{ backgroundImage: `url(${img.urls.thumb})` }}
                      >
                        <img
                          src={img.urls.regular}
                          alt={img.alt_description || "Image"}
                          className="w-full h-44 object-cover transition-opacity duration-500 opacity-0"
                          onLoad={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.opacity = "1";
                          }}
                          loading="lazy"
                          srcSet={`${img.urls.small} 480w, ${img.urls.regular} 800w`}
                        />
                      </div>
                    </a>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => fetchImages(selectedColor, page + 1)}
                    className="px-5 py-2 rounded-full text-sm text-[#E8E9EC] transition border flex items-center justify-center"
                    style={{
                      minWidth: 96,
                      background: "#232329",
                      borderColor: "rgba(232,233,236,0.14)",
                    }}
                  >
                    Load More
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer (show only when images loaded) */}
          {images.length > 0 && (
            <footer className="w-full mt-16 py-6 flex items-center justify-center footer-fade">
              <div className="max-w-4xl w-full flex items-center justify-between px-4 text-[#86868E]">
                <div className="font-mono text-xs tracking-[0.35em] uppercase">
                  La Imagen
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="opacity-70"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="3"
                        stroke="#E8E9EC"
                        strokeWidth="1.2"
                        opacity="0.16"
                      />
                    </svg>
                    <span>Powered by</span>
                    <span className="font-medium text-[#E8E9EC] ml-1">
                      Unsplash
                    </span>
                  </div>
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>
    </>
  );
}
