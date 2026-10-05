"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import "./pack-opener.css";

type Phase = "preload" | "tearing" | "burst" | "dealing" | "done";
type PackSize = 5 | 10 | 25 | 50 | 100;
export type PackOpenerProps = {
  tierIndex: number;
  size: PackSize;
  /** Exact decimal token IDs from a confirmed PackOpened event, never Number IDs. */
  ids: readonly string[];
  onClose: () => void;
  /** Return to pack selection only. The opener never starts another transaction. */
  onOpenAnother?: () => void;
  /** Optional existing image endpoint/CDN adapter; default is /api/image/<id>?w=256. */
  imageUrl?: (id: string) => string;
  /** Presentation label only; explicit SAMPLE labels can identify a fixture preview. */
  idLabel?: (id: string) => string;
  /** Parent directory containing the 5, 10, 25, 50 and 100 asset directories. */
  assetBase?: string;
  /** The mobile PNGs retain exactly the same normalized registration as masters. */
  assetVariant?: "master" | "mobile";
  /** Fixture demonstration only; changes copy so it never implies a purchase. */
  preview?: boolean;
};

const SIZES = [5, 10, 25, 50, 100] as const;
const LAYERS = ["01-body-back", "02-cards-stack", "03-glow", "04-body-front", "05-flap-top",
  "06-tear-left", "07-burst", "08-sheen", "card-back"] as const;
const PAGE_SIZE = 12;
const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const defaultImageUrl = (id: string) => `/api/image/${encodeURIComponent(id)}?w=256`;
const defaultIdLabel = (id: string) => `#${id}`;
type Anchors = { flap: [number, number]; origin: [number, number]; card: [number, number, number, number] };
const DEFAULT_ANCHORS: Anchors = { flap: [0.5, 226 / 1748], origin: [0.5, 0.38],
  card: [500 / 1440, 450 / 1748, 440 / 1440, 616 / 1748] };

function parseAnchors(value: unknown): Anchors {
  const data = value as Record<string, { pivot?: number[]; origin?: number[]; rect?: number[] }>;
  const flap = data?.["flap-top"]?.pivot;
  const origin = data?.cards?.origin;
  const card = data?.["card-back"]?.rect;
  const valid = (numbers: unknown, length: number): numbers is number[] => Array.isArray(numbers) &&
    numbers.length === length && numbers.every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1);
  if (!valid(flap, 2) || !valid(origin, 2) || !valid(card, 4) || card[2] <= 0 || card[3] <= 0 ||
      card[0] + card[2] > 1 || card[1] + card[3] > 1) throw new Error("Invalid pack anchors");
  return { flap: flap as [number, number], origin: origin as [number, number], card: card as [number, number, number, number] };
}

function preloadImage(url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
      error ? reject(error) : resolve();
    };
    const abort = () => { image.removeAttribute("src"); finish(new Error("Preload aborted")); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => {
      const decoded = typeof image.decode === "function" ? image.decode() : Promise.resolve();
      void decoded.then(() => signal.aborted ? abort() : finish(), () => finish(new Error("Image decode failed")));
    };
    image.onerror = () => finish(new Error("Image load failed"));
    image.src = url;
  });
}

function CardImage({ label, src }: { label: string; src: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="po-image-unavailable">Image unavailable<span>{label}</span></span> :
    <img src={src} alt={`Card ${label}`} decoding="async" loading="lazy" onError={() => setFailed(true)} />;
}

/** Presentation only. Mount after a confirmed receipt; key by transaction hash. */
export function PackOpener({ tierIndex, size, ids, onClose, onOpenAnother, imageUrl = defaultImageUrl,
  idLabel = defaultIdLabel, assetBase = "/poa/poc/pack-open", assetVariant = "mobile", preview = false }: PackOpenerProps) {
  const idsKey = ids.join(",");
  const stableIds = useMemo(() => idsKey ? idsKey.split(",") : [], [idsKey]);
  const valid = SIZES[tierIndex] === size && stableIds.length === size &&
    stableIds.every(id => /^(0|[1-9]\d*)$/.test(id)) && new Set(stableIds).size === stableIds.length;
  const [phase, setPhase] = useState<Phase>("preload");
  const [fallback, setFallback] = useState("");
  const [page, setPage] = useState(0);
  const [anchors, setAnchors] = useState<Anchors>(DEFAULT_ANCHORS);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipRef = useRef(false);
  const callbackRef = useRef({ onClose, imageUrl, idLabel });
  callbackRef.current = { onClose, imageUrl, idLabel };
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const titleId = useId();
  const statusId = useId();
  const tierDir = `${assetBase.replace(/\/+$/, "")}/${size}`;
  const dir = `${tierDir}${assetVariant === "mobile" ? "/mobile" : ""}`;
  const sceneIds = stableIds.slice(0, Math.min(size, PAGE_SIZE));
  const visibleIds = valid ? stableIds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];
  const pageCount = Math.ceil(stableIds.length / PAGE_SIZE);
  const skip = useCallback(() => {
    skipRef.current = true;
    abortRef.current?.abort();
    setPhase("done");
  }, []);
  const resolveImage = useCallback((id: string) => {
    try {
      const url = callbackRef.current.imageUrl(id);
      return typeof url === "string" && url.length > 0 ? url : defaultImageUrl(id);
    } catch { return defaultImageUrl(id); }
  }, []);
  const labelFor = useCallback((id: string) => {
    try {
      const label = callbackRef.current.idLabel(id);
      return typeof label === "string" && label.length > 0 ? label : defaultIdLabel(id);
    } catch { return defaultIdLabel(id); }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (phaseRef.current === "done") callbackRef.current.onClose(); else skip();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(element => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true");
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      const activeIndex = focusables.indexOf(document.activeElement as HTMLElement);
      // The result heading has tabIndex=-1. Shift+Tab there must still stay trapped.
      if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (activeIndex === -1 || document.activeElement === last)) {
        event.preventDefault(); first.focus();
      }
    };
    dialog.addEventListener("keydown", trap);
    return () => {
      dialog.removeEventListener("keydown", trap);
      if (dialog.open) dialog.close();
      document.body.style.overflow = oldOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [skip]);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    skipRef.current = false;
    setPage(0);
    setFallback("");
    setPhase("preload");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finishWithoutMotion = () => {
      if (current) { skipRef.current = true; controller.abort(); setPhase("done"); }
    };
    const motionChange = () => { if (reduced.matches) finishWithoutMotion(); };
    const visibilityChange = () => { if (document.hidden) finishWithoutMotion(); };
    reduced.addEventListener("change", motionChange);
    document.addEventListener("visibilitychange", visibilityChange);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (!valid) {
      setFallback(preview ? "This sample preview could not be displayed." :
        "The result could not be displayed. Your confirmed purchase is unchanged; view your collection.");
      finishWithoutMotion();
    } else if (reduced.matches || document.hidden) {
      finishWithoutMotion();
    } else {
      timeout = setTimeout(() => {
        if (current && !skipRef.current) {
          setFallback(preview ? "The animation was skipped. Sample cards are shown below." :
            "The animation was skipped so you can view your cards immediately.");
          finishWithoutMotion();
        }
      }, 6000);
      const urls = [...LAYERS.map(layer => `${dir}/${layer}.png`),
        ...stableIds.slice(0, PAGE_SIZE).map(resolveImage)];
      void Promise.all([
        ...urls.map(url => preloadImage(url, controller.signal)),
        fetch(`${tierDir}/anchors.json`, { signal: controller.signal }).then(response => {
          if (!response.ok) throw new Error("Missing pack anchors");
          return response.json();
        }).then(parseAnchors).then(value => { if (current && !skipRef.current) setAnchors(value); }),
      ]).then(() => {
        clearTimeout(timeout);
        if (current && !skipRef.current) setPhase("tearing");
      }).catch(() => {
        clearTimeout(timeout);
        if (current && !skipRef.current) {
          setFallback(preview ? "The animation was skipped. Sample cards are shown below." :
            "The animation was skipped. Your cards are ready below.");
          finishWithoutMotion();
        }
      });
    }
    return () => {
      current = false;
      clearTimeout(timeout);
      controller.abort();
      reduced.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, [dir, tierDir, stableIds, tierIndex, valid, resolveImage, preview]);

  useEffect(() => {
    const timing: Partial<Record<Phase, [number, Phase]>> = {
      tearing: [700, "burst"], burst: [420, "dealing"], dealing: [1400 + sceneIds.length * 40, "done"],
    };
    const next = timing[phase];
    if (!next) return;
    const timer = setTimeout(() => setPhase(next[1]), next[0]);
    return () => clearTimeout(timer);
  }, [phase, sceneIds.length]);

  useEffect(() => {
    if (phase === "done") { resultHeadingRef.current?.focus({ preventScroll: true }); return; }
    if (phase !== "tearing" && phase !== "burst" && phase !== "dealing") return;
    let frame = 0, previous = performance.now(), slowFrames = 0;
    const check = (now: number) => {
      slowFrames = now - previous > 100 ? slowFrames + 1 : 0;
      previous = now;
      if (slowFrames >= 4) { setFallback("Animation skipped for smoother performance."); skip(); return; }
      frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [phase, skip]);

  // The source back can occupy most of its canvas; the fan stays compact on mobile.
  const cardScale = Math.min(1, 0.28 / anchors.card[2]);
  const cardWidth = anchors.card[2] * cardScale;
  const cardHeight = anchors.card[3] * cardScale;
  const stageStyle = {
    "--flap-x": `${anchors.flap[0] * 100}%`, "--flap-y": `${anchors.flap[1] * 100}%`,
    "--card-x": `${(anchors.origin[0] - cardWidth / 2) * 100}%`,
    "--card-y": `${(anchors.origin[1] - cardHeight / 2) * 100}%`,
    "--card-width": `${cardWidth * 100}%`, "--card-height": `${cardHeight * 100}%`,
  } as CSSProperties;
  const backStyle: CSSProperties = {
    width: `${100 / anchors.card[2]}%`, height: `${100 / anchors.card[3]}%`,
    left: `${-100 * anchors.card[0] / anchors.card[2]}%`, top: `${-100 * anchors.card[1] / anchors.card[3]}%`,
  };

  return <dialog ref={dialogRef} className="po-overlay" aria-labelledby={titleId} aria-describedby={statusId}
    aria-modal="true" onCancel={event => { event.preventDefault(); phase === "done" ? onClose() : skip(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="po-panel" data-phase={phase} onClick={event => event.stopPropagation()}>
      <header className="po-header">
        <div><p className="po-eyebrow">Spirit cards{preview ? " · Preview only" : ""}</p>
          <h2 id={titleId}>{preview ? "Pack preview" : "Pack opened"} · {size} {preview ? "sample cards" : "cards"}</h2></div>
        <button className="po-button po-secondary" type="button" onClick={phase === "done" ? onClose : skip}>
          {phase === "done" ? preview ? "Close preview" : "Close" : preview ? "Show samples now" : "Show cards now"}
        </button>
      </header>
      <p id={statusId} className="po-status" role="status" aria-live="polite" aria-atomic="true">
        {phase === "preload" ? preview ? "Sample preview. Preparing cards…" : "Purchase confirmed. Preparing your cards…" : phase === "done" ?
          valid ? `${size} ${preview ? "sample cards shown" : "cards received"}: ${labelFor(stableIds[0])} to ${labelFor(stableIds[stableIds.length - 1])}.` :
            preview ? "Sample preview unavailable." : "View your collection to see the confirmed result." :
          preview ? "Opening a sample pack. No purchase is being made." : "Purchase confirmed. Opening your pack…"}
      </p>
      {phase === "preload" && <div className="po-loading" aria-hidden="true"><span />Preparing reveal</div>}
      {phase !== "preload" && phase !== "done" && <div className="po-stage-shell" aria-hidden="true">
        <div className={`po-stage po-${phase}`} style={stageStyle}>
          {LAYERS.filter(layer => layer !== "07-burst" && layer !== "card-back").map(layer =>
            <img key={layer} className={`po-layer po-${layer.slice(3)}`} src={`${dir}/${layer}.png`} alt="" draggable={false} />)}
          {(phase === "burst" || phase === "dealing") && <div className="po-burst-window">
            <img className="po-burst-strip" src={`${dir}/07-burst.png`} alt="" draggable={false} />
          </div>}
          {phase === "dealing" && sceneIds.map((id, index) => <div key={id} className="po-flying-card" style={{
            "--fan-x": `${(index - (sceneIds.length - 1) / 2) * 23}%`,
            "--fan-y": `${-32 + Math.abs(index - (sceneIds.length - 1) / 2) * 3}%`,
            "--fan-rotate": `${(index - (sceneIds.length - 1) / 2) * 4}deg`,
            "--delay": `${index * 40}ms`, zIndex: 20 + index,
          } as CSSProperties}>
            <div className="po-card-turn"><div className="po-card-back"><img src={`${dir}/card-back.png`} style={backStyle} alt="" /></div>
              <div className="po-card-front"><img src={resolveImage(id)} alt="" decoding="async" /></div></div>
          </div>)}
        </div>
        {size > sceneIds.length && <p className="po-more">+{size - sceneIds.length} more {preview ? "sample cards" : "cards in your result"}</p>}
      </div>}
      {phase === "done" && <section className="po-results" aria-labelledby={`${titleId}-result`}>
        <h3 id={`${titleId}-result`} ref={resultHeadingRef} tabIndex={-1}>{preview ? "Sample cards" : "Your cards"}</h3>
        {fallback && <p className="po-fallback">{fallback}</p>}
        <div className="po-grid">{visibleIds.map(id => <figure className="po-result-card" key={id}>
          <CardImage label={labelFor(id)} src={resolveImage(id)} /><figcaption>{labelFor(id)}</figcaption>
        </figure>)}</div>
        {valid && pageCount > 1 && <nav className="po-pagination" aria-label="Result pages">
          <button type="button" className="po-button po-secondary" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button>
          <span aria-live="polite">{page + 1} / {pageCount} · {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, size)} of {size}</span>
          <button type="button" className="po-button po-secondary" disabled={page === pageCount - 1} onClick={() => setPage(value => value + 1)}>Next</button>
        </nav>}
        <footer className="po-actions">{preview ? <button type="button" className="po-button" onClick={onClose}>Close preview</button> :
          <a className="po-button" href="/collection">View collection</a>}
          {onOpenAnother && <button type="button" className="po-button po-secondary" onClick={onOpenAnother}>{preview ? "Choose another preview" : "Choose another pack"}</button>}
        </footer>
      </section>}
    </section>
  </dialog>;
}
