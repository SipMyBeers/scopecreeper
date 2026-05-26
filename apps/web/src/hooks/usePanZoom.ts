"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PanZoomState {
  vx: number;
  vy: number;
  vw: number;
  vh: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const KEY_PAN_STEP = 60; // svg-unit steps for arrow-key pan
const KEY_ZOOM_STEP = 1.25;

export function usePanZoom(initial: PanZoomState) {
  const baseRef = useRef(initial);
  const [vb, setVb] = useState<PanZoomState>(initial);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Re-anchor when the initial viewBox changes (e.g., tree grew after a drill).
  useEffect(() => {
    baseRef.current = initial;
    setVb((prev) => {
      // Preserve current zoom level if user has interacted; just expand the base.
      const baseW = initial.vw;
      const currentScale = baseRef.current.vw / prev.vw || 1;
      if (currentScale === 1) return initial; // no user zoom yet
      return prev;
    });
  }, [initial.vw, initial.vh, initial.vx, initial.vy]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    setVb(baseRef.current);
  }, []);

  const screenToSvg = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      return { x: vb.vx + px * vb.vw, y: vb.vy + py * vb.vh };
    },
    [vb]
  );

  const zoomBy = useCallback(
    (factor: number, anchorX?: number, anchorY?: number) => {
      setVb((prev) => {
        const newW = prev.vw / factor;
        const newH = prev.vh / factor;
        const baseW = baseRef.current.vw;
        const scale = baseW / newW;
        if (scale < MIN_SCALE || scale > MAX_SCALE) return prev;
        // Anchor: keep the point (anchorX, anchorY) stationary in svg coords.
        const ax = anchorX ?? prev.vx + prev.vw / 2;
        const ay = anchorY ?? prev.vy + prev.vh / 2;
        const tx = ax - ((ax - prev.vx) * newW) / prev.vw;
        const ty = ay - ((ay - prev.vy) * newH) / prev.vh;
        return { vx: tx, vy: ty, vw: newW, vh: newH };
      });
    },
    []
  );

  const panBy = useCallback((dxScreen: number, dyScreen: number) => {
    setVb((prev) => {
      const svg = svgRef.current;
      if (!svg) return prev;
      const rect = svg.getBoundingClientRect();
      const dx = (dxScreen / rect.width) * prev.vw;
      const dy = (dyScreen / rect.height) * prev.vh;
      return { ...prev, vx: prev.vx - dx, vy: prev.vy - dy };
    });
  }, []);

  // Pointer drag
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      // Don't pan if user grabbed a node (let click handlers run instead).
      const target = e.target as Element;
      if (target.closest("[data-pz-stop]")) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      svg.setPointerCapture(e.pointerId);
      svg.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      panBy(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      svg.releasePointerCapture(e.pointerId);
      svg.style.cursor = "grab";
    };
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", onUp);
    return () => {
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointercancel", onUp);
    };
  }, [panBy]);

  // Wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const anchor = screenToSvg(e.clientX, e.clientY);
      zoomBy(factor, anchor?.x, anchor?.y);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomBy, screenToSvg]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomBy(KEY_ZOOM_STEP);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomBy(1 / KEY_ZOOM_STEP);
      } else if (e.key === "0") {
        e.preventDefault();
        reset();
      } else if (e.key === "ArrowLeft") {
        setVb((p) => ({ ...p, vx: p.vx - KEY_PAN_STEP }));
      } else if (e.key === "ArrowRight") {
        setVb((p) => ({ ...p, vx: p.vx + KEY_PAN_STEP }));
      } else if (e.key === "ArrowUp") {
        setVb((p) => ({ ...p, vy: p.vy - KEY_PAN_STEP }));
      } else if (e.key === "ArrowDown") {
        setVb((p) => ({ ...p, vy: p.vy + KEY_PAN_STEP }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomBy, reset]);

  const viewBox = `${vb.vx} ${vb.vy} ${vb.vw} ${vb.vh}`;
  return { svgRef, viewBox, zoomBy, reset, scale: baseRef.current.vw / vb.vw };
}
