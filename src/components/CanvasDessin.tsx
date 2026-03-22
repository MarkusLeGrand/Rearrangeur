import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva';
import { useStore } from '../store';
import { snap, dist, douglasPeucker, distPointSegment, polyBounds, projeterSur, pointSurSegment, wallsSurface } from '../utils/geometry';
import { generateTemplate } from '../utils/templates';
import type { Point, WallLine, TemplateShape } from '../types';

const MAX_CM = 1000;
const GRID = 10;
const CLOSE_RADIUS = 30;
const ERASER_RADIUS = 20;

/** Convert drag position to parameter value (handles L/T inversions) */
function dragPosToParam(
  shape: TemplateShape,
  paramKey: string,
  pos: number,
  values: Record<string, number>,
): number {
  if (shape === 'L' && paramKey === 'cutoutW') {
    return Math.max(50, values.mainW - pos);
  }
  if (shape === 'T' && paramKey === 'stemW') {
    return Math.max(50, 2 * pos - values.totalW);
  }
  return pos;
}

export function CanvasDessin() {
  const phase = useStore((s) => s.drawPhase);
  const activeTool = useStore((s) => s.activeTool);
  const targetSurfaceM2 = useStore((s) => s.targetSurfaceM2);

  // Contour draw state
  const drawnWalls = useStore((s) => s.drawnWalls);
  const addDrawnWall = useStore((s) => s.addDrawnWall);
  const addDrawnWalls = useStore((s) => s.addDrawnWalls);
  const removeDrawnWall = useStore((s) => s.removeDrawnWall);
  const lineStart = useStore((s) => s.lineStart);
  const setLineStart = useStore((s) => s.setLineStart);
  const freehandStroke = useStore((s) => s.freehandStroke);
  const setFreehandStroke = useStore((s) => s.setFreehandStroke);
  // Template state
  const templateParams = useStore((s) => s.templateParams);
  const updateTemplateParam = useStore((s) => s.updateTemplateParam);

  // Contour (after closing)
  const contourPoints = useStore((s) => s.contourPoints);
  const contourClosed = useStore((s) => s.contourClosed);

  // Inner walls state
  const innerWalls = useStore((s) => s.innerWalls);
  const innerWallStart = useStore((s) => s.innerWallStart);
  const setInnerWallStart = useStore((s) => s.setInnerWallStart);
  const addInnerWall = useStore((s) => s.addInnerWall);

  // Validation
  const setDrawError = useStore((s) => s.setDrawError);

  // Zoom
  const echelle = useStore((s) => s.echelle);
  const setEchelle = useStore((s) => s.setEchelle);

  const containerRef = useRef<HTMLDivElement>(null);
  const [sz, setSz] = useState({ w: 800, h: 600 });
  const [mouse, setMouse] = useState<Point | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);

  // Pan state
  const [stagePos, setStagePos] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSz({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Coordinate system with zoom + pan — grid centered in free area ──
  const PAD = 40;
  const SIDEBAR_W = 290;
  const freeW = sz.w - SIDEBAR_W;
  const baseScale = Math.min((freeW - PAD * 2) / MAX_CM, (sz.h - PAD * 2) / MAX_CM);
  const scale = baseScale * echelle;
  const gridPx = MAX_CM * scale;
  const cx = SIDEBAR_W + (freeW - gridPx) / 2;
  const cy = (sz.h - gridPx) / 2;

  const toSc = (p: Point) => ({
    x: cx + p.x * scale + stagePos.x,
    y: cy + p.y * scale + stagePos.y,
  });

  const toCm = (sx: number, sy: number): Point => ({
    x: Math.max(0, Math.min(MAX_CM, snap((sx - cx - stagePos.x) / scale, GRID))),
    y: Math.max(0, Math.min(MAX_CM, snap((sy - cy - stagePos.y) / scale, GRID))),
  });

  const toCmRaw = (sx: number, sy: number): Point => ({
    x: Math.max(0, Math.min(MAX_CM, (sx - cx - stagePos.x) / scale)),
    y: Math.max(0, Math.min(MAX_CM, (sy - cy - stagePos.y) / scale)),
  });

  // Compute template offset to center it on the canvas
  const templateOffset = (): Point => {
    if (!templateParams) return { x: 0, y: 0 };
    const result = generateTemplate(templateParams);
    const bounds = polyBounds(result.contour);
    const shapeW = bounds.maxX - bounds.minX;
    const shapeH = bounds.maxY - bounds.minY;
    return {
      x: (MAX_CM - shapeW) / 2 - bounds.minX,
      y: (MAX_CM - shapeH) / 2 - bounds.minY,
    };
  };

  // Apply offset to a point for template rendering
  const toScTemplate = (p: Point) => {
    const off = templateOffset();
    return toSc({ x: p.x + off.x, y: p.y + off.y });
  };

  // Get first point of drawn walls chain
  const firstWallPoint = drawnWalls.length > 0 ? drawnWalls[0].debut : null;

  // Snap to existing wall endpoints
  const snapToWallPoints = (cm: Point): Point => {
    let best = cm;
    let bestD = CLOSE_RADIUS;
    // 1. Snap to wall endpoints (vertices)
    for (const w of drawnWalls) {
      for (const p of [w.debut, w.fin]) {
        const d = dist(cm, p);
        if (d < bestD) { bestD = d; best = { ...p }; }
      }
    }
    // 2. Snap to closest point on existing wall segments
    for (const w of drawnWalls) {
      const t = projeterSur(cm, w.debut, w.fin);
      const p = pointSurSegment(w.debut, w.fin, t);
      const d = dist(cm, p);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  };

  // Snap to any relevant point: contour vertices, inner wall endpoints,
  // and closest projection on contour/inner wall segments
  const snapToContour = (cm: Point): Point => {
    let best = cm;
    let bestD = CLOSE_RADIUS;
    // 1. Snap to contour vertices
    for (const p of contourPoints) {
      const d = dist(cm, p);
      if (d < bestD) { bestD = d; best = { ...p }; }
    }
    // 2. Snap to inner wall endpoints
    for (const w of innerWalls) {
      for (const p of [w.debut, w.fin]) {
        const d = dist(cm, p);
        if (d < bestD) { bestD = d; best = { ...p }; }
      }
    }
    // 3. Snap to closest point on contour segments
    for (let i = 0; i < contourPoints.length; i++) {
      const a = contourPoints[i];
      const b = contourPoints[(i + 1) % contourPoints.length];
      const t = projeterSur(cm, a, b);
      const p = pointSurSegment(a, b, t);
      const d = dist(cm, p);
      if (d < bestD) { bestD = d; best = p; }
    }
    // 4. Snap to closest point on inner wall segments
    for (const w of innerWalls) {
      const t = projeterSur(cm, w.debut, w.fin);
      const p = pointSurSegment(w.debut, w.fin, t);
      const d = dist(cm, p);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  };

  // ── WHEEL ZOOM ──
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const pointer = e.target.getStage()?.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const factor = 1.1;
    const newEchelle = Math.max(0.3, Math.min(5, echelle * (direction > 0 ? factor : 1 / factor)));

    const oldScale = baseScale * echelle;
    const newScale = baseScale * newEchelle;
    const newGridPx = MAX_CM * newScale;
    const newCx = (sz.w - newGridPx) / 2;
    const newCy = (sz.h - newGridPx) / 2;

    // Point in cm space under the mouse cursor
    const mouseXcm = (pointer.x - cx - stagePos.x) / oldScale;
    const mouseYcm = (pointer.y - cy - stagePos.y) / oldScale;

    // Adjust stagePos so that cm point stays under the mouse
    const newStagePosX = pointer.x - newCx - mouseXcm * newScale;
    const newStagePosY = pointer.y - newCy - mouseYcm * newScale;

    setStagePos({ x: newStagePosX, y: newStagePosY });
    setEchelle(newEchelle);
  };

  // ── CLICK HANDLERS ──

  const handleClick = (e: any) => {
    if (isPanning) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (phase === 'contour_draw') {
      const cm = toCm(pos.x, pos.y);
      switch (activeTool) {
        case 'line': handleLineTool(cm); break;
        case 'eraser': handleEraserTool(cm); break;
        default: break;
      }
    } else if (phase === 'murs_interieurs') {
      const cm = toCm(pos.x, pos.y);
      switch (activeTool) {
        case 'line': handleLineToolInner(cm); break;
        case 'eraser': handleEraserToolInner(cm); break;
        default: break;
      }
    }
  };

  const handleLineTool = (cm: Point) => {
    const snapped = snapToWallPoints(cm);
    if (!lineStart) {
      setLineStart(snapped);
    } else {
      addDrawnWall({ debut: lineStart, fin: snapped });
      // Auto-close: if snapped point matches any earlier wall start → closed loop
      const allWalls = [...drawnWalls, { debut: lineStart, fin: snapped }];
      let loopStartIdx = -1;
      for (let i = 0; i < allWalls.length - 1; i++) {
        if (dist(snapped, allWalls[i].debut) < 2) {
          loopStartIdx = i;
          break;
        }
      }
      if (loopStartIdx >= 0 && (allWalls.length - loopStartIdx) >= 3) {
        const loopWalls = allWalls.slice(loopStartIdx);
        useStore.setState({ drawnWalls: loopWalls });
        setLineStart(null);
        setDrawError(null);
        setTimeout(() => useStore.getState().validerContour(), 0);
      } else {
        setLineStart(snapped);
      }
    }
  };

  const handleEraserTool = (cm: Point) => {
    let minDist = Infinity;
    let minIdx = -1;
    drawnWalls.forEach((w, i) => {
      const d = distPointSegment(cm, w.debut, w.fin);
      if (d < minDist) { minDist = d; minIdx = i; }
    });
    if (minIdx >= 0 && minDist < ERASER_RADIUS) {
      removeDrawnWall(minIdx);
    }
  };

  // Inner wall tool handlers
  const handleLineToolInner = (cm: Point) => {
    const snapped = snapToContour(cm);
    if (!innerWallStart) {
      setInnerWallStart(snapped);
    } else {
      addInnerWall(snapped);
    }
  };

  const handleEraserToolInner = (cm: Point) => {
    let minDist = Infinity;
    let minIdx = -1;
    innerWalls.forEach((w, i) => {
      const d = distPointSegment(cm, w.debut, w.fin);
      if (d < minDist) { minDist = d; minIdx = i; }
    });
    if (minIdx >= 0 && minDist < ERASER_RADIUS) {
      const walls = [...innerWalls];
      walls.splice(minIdx, 1);
      useStore.setState({ innerWalls: walls });
    }
  };

  // ── MOUSE DOWN/MOVE/UP ──
  const handleMouseDown = (e: any) => {
    // Middle mouse button (button 1) for panning
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.evt.clientX - stagePos.x,
        y: e.evt.clientY - stagePos.y,
      };
      return;
    }

    if (activeTool !== 'freehand') return;
    if (phase !== 'contour_draw' && phase !== 'murs_interieurs') return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    setDrawing(true);
    const cm = toCmRaw(pos.x, pos.y);
    setFreehandStroke([cm]);
  };

  const handleMouseMove = (e: any) => {
    // Panning
    if (isPanning) {
      setStagePos({
        x: e.evt.clientX - panStartRef.current.x,
        y: e.evt.clientY - panStartRef.current.y,
      });
      return;
    }

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    setMouse(toCm(pos.x, pos.y));

    if (drawing && activeTool === 'freehand') {
      const cm = toCmRaw(pos.x, pos.y);
      setFreehandStroke([...freehandStroke, cm]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (drawing && activeTool === 'freehand' && freehandStroke.length > 1) {
      const simplified = douglasPeucker(freehandStroke, 20);
      const snapped = simplified.map(p => ({
        x: snap(p.x, GRID),
        y: snap(p.y, GRID),
      }));
      if (phase === 'contour_draw') {
        // Snap first & last points to existing wall endpoints for closure
        if (snapped.length > 0) {
          snapped[0] = snapToWallPoints(snapped[0]);
          snapped[snapped.length - 1] = snapToWallPoints(snapped[snapped.length - 1]);
        }
        const walls: WallLine[] = [];
        for (let i = 0; i < snapped.length - 1; i++) {
          if (dist(snapped[i], snapped[i + 1]) > 5) {
            walls.push({ debut: snapped[i], fin: snapped[i + 1] });
          }
        }
        if (walls.length > 0) addDrawnWalls(walls);
      } else if (phase === 'murs_interieurs') {
        // Snap first & last points to contour/inner wall points
        if (snapped.length > 0) {
          snapped[0] = snapToContour(snapped[0]);
          snapped[snapped.length - 1] = snapToContour(snapped[snapped.length - 1]);
        }
        for (let i = 0; i < snapped.length - 1; i++) {
          if (dist(snapped[i], snapped[i + 1]) > 5) {
            useStore.getState().setInnerWallStart(snapped[i]);
            useStore.getState().addInnerWall(snapped[i + 1]);
          }
        }
      }
      setFreehandStroke([]);
    }
    setDrawing(false);
    if (dragHandle) setDragHandle(null);
  };

  const handleRightClick = (e: any) => {
    e.evt.preventDefault();
    if (phase === 'contour_draw') {
      if (lineStart) setLineStart(null);
    } else if (phase === 'murs_interieurs') {
      if (innerWallStart) setInnerWallStart(null);
    }
  };

  // ── RENDERING ──

  const origin = toSc({ x: 0, y: 0 });

  // Grid lines — millimeter paper style (green)
  const grid: React.JSX.Element[] = [];
  // Finest level: every 10cm
  for (let cm = 0; cm <= MAX_CM; cm += 10) {
    if (cm % 50 === 0) continue; // drawn by next levels
    const vStart = toSc({ x: cm, y: 0 });
    const vEnd = toSc({ x: cm, y: MAX_CM });
    const hStart = toSc({ x: 0, y: cm });
    const hEnd = toSc({ x: MAX_CM, y: cm });
    grid.push(<Line key={`v${cm}`} points={[vStart.x, vStart.y, vEnd.x, vEnd.y]}
      stroke="rgba(26,26,26,0.08)" strokeWidth={0.3} />);
    grid.push(<Line key={`h${cm}`} points={[hStart.x, hStart.y, hEnd.x, hEnd.y]}
      stroke="rgba(26,26,26,0.08)" strokeWidth={0.3} />);
  }
  // Medium level: every 50cm
  for (let cm = 0; cm <= MAX_CM; cm += 50) {
    if (cm % 100 === 0) continue; // drawn by next level
    const vStart = toSc({ x: cm, y: 0 });
    const vEnd = toSc({ x: cm, y: MAX_CM });
    const hStart = toSc({ x: 0, y: cm });
    const hEnd = toSc({ x: MAX_CM, y: cm });
    grid.push(<Line key={`v${cm}`} points={[vStart.x, vStart.y, vEnd.x, vEnd.y]}
      stroke="rgba(26,26,26,0.15)" strokeWidth={0.5} />);
    grid.push(<Line key={`h${cm}`} points={[hStart.x, hStart.y, hEnd.x, hEnd.y]}
      stroke="rgba(26,26,26,0.15)" strokeWidth={0.5} />);
  }
  // Thick level: every 1m (100cm)
  for (let cm = 0; cm <= MAX_CM; cm += 100) {
    const vStart = toSc({ x: cm, y: 0 });
    const vEnd = toSc({ x: cm, y: MAX_CM });
    const hStart = toSc({ x: 0, y: cm });
    const hEnd = toSc({ x: MAX_CM, y: cm });
    grid.push(<Line key={`v${cm}`} points={[vStart.x, vStart.y, vEnd.x, vEnd.y]}
      stroke="rgba(26,26,26,0.25)" strokeWidth={0.8} />);
    grid.push(<Line key={`h${cm}`} points={[hStart.x, hStart.y, hEnd.x, hEnd.y]}
      stroke="rgba(26,26,26,0.25)" strokeWidth={0.8} />);
  }

  // Labels (0..10 m)
  const labels: React.JSX.Element[] = [];
  for (let m = 0; m <= 10; m++) {
    const px = toSc({ x: m * 100, y: 0 });
    const py = toSc({ x: 0, y: m * 100 });
    labels.push(<Text key={`lx${m}`} x={px.x - 4} y={px.y - 16} text={`${m}`} fontSize={10} fill="rgba(26,26,26,0.3)" fontFamily="Inter" />);
    if (m > 0) labels.push(<Text key={`ly${m}`} x={py.x - 18} y={py.y - 5} text={`${m}`} fontSize={10} fill="rgba(26,26,26,0.3)" fontFamily="Inter" />);
  }

  const mousePx = mouse ? toSc(mouse) : null;

  // ── Surface preview (surface_input / mode_choice) ──
  const renderSurfacePreview = () => {
    const sideCm = Math.sqrt(targetSurfaceM2 * 10000);
    const px = sideCm * scale;
    const center = toSc({ x: MAX_CM / 2, y: MAX_CM / 2 });
    const cx = center.x - px / 2;
    const cy = center.y - px / 2;
    return (
      <>
        <Rect x={cx} y={cy} width={px} height={px}
          fill="rgba(231,111,81,0.06)" stroke="rgba(231,111,81,0.5)" strokeWidth={1.5} dash={[8, 4]} />
        <Text x={cx + px / 2 - 30} y={cy + px / 2 - 10}
          text={`${targetSurfaceM2} m\u00B2`}
          fontSize={16} fontStyle="bold" fill="#E76F51" fontFamily="Inter" />
      </>
    );
  };

  // ── Drawn walls rendering ──
  const renderDrawnWalls = (walls: WallLine[], color: string, labelColor: string) => {
    return walls.map((w, i) => {
      const a = toSc(w.debut), b = toSc(w.fin);
      const len = dist(w.debut, w.fin);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      return (
        <React.Fragment key={`dw${i}`}>
          <Line points={[a.x, a.y, b.x, b.y]}
            stroke={color} strokeWidth={2.5} lineCap="round" lineJoin="round" />
          {len > 30 && (
            <Text x={mid.x - 16} y={mid.y - 18}
              text={`${(len / 100).toFixed(1)} m`}
              fontSize={10} fontStyle="600" fill={labelColor} fontFamily="Inter" />
          )}
        </React.Fragment>
      );
    });
  };

  // ── Wall endpoint dots ──
  const renderWallPoints = (walls: WallLine[], color: string) => {
    const pts = new Map<string, Point>();
    walls.forEach(w => {
      pts.set(`${w.debut.x},${w.debut.y}`, w.debut);
      pts.set(`${w.fin.x},${w.fin.y}`, w.fin);
    });
    return Array.from(pts.values()).map((p, i) => {
      const px = toSc(p);
      const isFirst = firstWallPoint && p.x === firstWallPoint.x && p.y === firstWallPoint.y;
      return (
        <Circle key={`wp${i}`} x={px.x} y={px.y}
          radius={isFirst ? 8 : 4}
          fill={isFirst ? '#E76F51' : color}
          stroke={isFirst ? 'rgba(231,111,81,0.3)' : 'rgba(0,0,0,0.15)'}
          strokeWidth={isFirst ? 3 : 1.5} />
      );
    });
  };

  // ── Template rendering (centered on canvas) ──
  const renderTemplate = () => {
    if (!templateParams) return null;
    const result = generateTemplate(templateParams);
    const pts = result.contour.map(toScTemplate);
    const flatPts = pts.flatMap(p => [p.x, p.y]);

    return (
      <>
        <Line points={flatPts} closed fill="rgba(231,111,81,0.06)"
          stroke="#1A1A1A" strokeWidth={2.5} lineCap="round" lineJoin="round" />
        {/* Dimension labels */}
        {result.contour.map((p, i) => {
          const next = result.contour[(i + 1) % result.contour.length];
          const a = toScTemplate(p), b = toScTemplate(next);
          const len = dist(p, next);
          if (len < 30) return null;
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          return (
            <Text key={`tl${i}`} x={mid.x - 16} y={mid.y - 18}
              text={`${(len / 100).toFixed(1)} m`}
              fontSize={10} fontStyle="600" fill="rgba(0,0,0,0.5)" fontFamily="Inter" />
          );
        })}
        {/* Draggable handles */}
        {result.handles.map(h => {
          const px = toScTemplate(h.position);
          return (
            <Circle key={h.id} x={px.x} y={px.y}
              radius={10}
              fill="#E76F51" stroke="rgba(231,111,81,0.3)" strokeWidth={3}
              draggable
              onDragStart={() => setDragHandle(h.id)}
              onDragMove={(e) => {
                const newPos = { x: e.target.x(), y: e.target.y() };
                const off = templateOffset();
                const cmRaw = toCmRaw(newPos.x, newPos.y);
                const cmNoOffset = { x: cmRaw.x - off.x, y: cmRaw.y - off.y };
                const rawAxisVal = snap(h.axis === 'x' ? cmNoOffset.x : cmNoOffset.y, GRID);

                const paramVal = dragPosToParam(templateParams!.shape, h.paramKey, rawAxisVal, templateParams!.values);
                const clamped = Math.max(h.min, Math.min(h.max, paramVal));
                updateTemplateParam(h.paramKey, clamped);

                const newParams = { ...templateParams!, values: { ...templateParams!.values, [h.paramKey]: clamped } };
                const result2 = generateTemplate(newParams);
                const h2 = result2.handles.find(hh => hh.id === h.id);
                if (h2) {
                  const newOff = (() => {
                    const bounds = polyBounds(result2.contour);
                    const shapeW = bounds.maxX - bounds.minX;
                    const shapeH = bounds.maxY - bounds.minY;
                    return { x: (MAX_CM - shapeW) / 2 - bounds.minX, y: (MAX_CM - shapeH) / 2 - bounds.minY };
                  })();
                  const newPx = toSc({ x: h2.position.x + newOff.x, y: h2.position.y + newOff.y });
                  e.target.x(newPx.x);
                  e.target.y(newPx.y);
                }
              }}
              onDragEnd={() => setDragHandle(null)}
            />
          );
        })}
        {/* Contour points */}
        {pts.map((p, i) => (
          <Circle key={`tp${i}`} x={p.x} y={p.y} radius={3.5}
            fill="rgba(0,0,0,0.6)" stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
        ))}
      </>
    );
  };

  // ── Contour fill (for murs_interieurs) ──
  const renderClosedContour = () => {
    if (!contourClosed || contourPoints.length < 3) return null;
    const pts = contourPoints.map(toSc);
    const flatPts = pts.flatMap(p => [p.x, p.y]);
    return (
      <>
        <Line points={flatPts} closed fill="#FFFFFF"
          stroke="#1A1A1A" strokeWidth={2.5} lineCap="round" lineJoin="round" />
        {contourPoints.map((p, i) => {
          const next = contourPoints[(i + 1) % contourPoints.length];
          const a = toSc(p), b = toSc(next);
          const len = dist(p, next);
          if (len < 30) return null;
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          return (
            <Text key={`cl${i}`} x={mid.x - 16} y={mid.y - 18}
              text={`${(len / 100).toFixed(1)} m`}
              fontSize={10} fontStyle="600" fill="rgba(0,0,0,0.4)" fontFamily="Inter" />
          );
        })}
      </>
    );
  };

  // ── Line preview ──
  const renderLinePreview = () => {
    if (!lineStart || !mousePx || !mouse) return null;
    const a = toSc(lineStart);
    const len = dist(lineStart, mouse);
    const mid = { x: (a.x + mousePx.x) / 2, y: (a.y + mousePx.y) / 2 };
    return (
      <>
        <Line points={[a.x, a.y, mousePx.x, mousePx.y]}
          stroke="rgba(231,111,81,0.5)" strokeWidth={1.5} dash={[8, 4]} />
        {len > 10 && (
          <Text x={mid.x - 20} y={mid.y - 22}
            text={`${(len / 100).toFixed(2)} m`}
            fontSize={11} fontStyle="600" fill="#E76F51" fontFamily="Inter" padding={2} />
        )}
      </>
    );
  };

  // ── Freehand stroke preview ──
  const renderFreehandStroke = () => {
    if (freehandStroke.length < 2) return null;
    const flatPts = freehandStroke.flatMap(p => { const px = toSc(p); return [px.x, px.y]; });
    return (
      <Line points={flatPts}
        stroke="rgba(0,0,0,0.5)" strokeWidth={2} lineCap="round" lineJoin="round" />
    );
  };

  // ── Close indicator (visual hint near first point) ──
  const renderCloseIndicator = () => {
    if (!mouse || !firstWallPoint || drawnWalls.length < 2) return null;
    if (dist(mouse, firstWallPoint) >= CLOSE_RADIUS) return null;
    const px = toSc(firstWallPoint);
    return (
      <Circle x={px.x} y={px.y} radius={16}
        fill="transparent" stroke="#E76F51" strokeWidth={1.5} dash={[4, 4]} />
    );
  };

  // ── Inner wall preview ──
  const renderInnerWallPreview = () => {
    if (phase !== 'murs_interieurs') return null;
    const elements: React.JSX.Element[] = [];
    if (innerWallStart && mousePx && mouse) {
      const a = toSc(innerWallStart);
      const len = dist(innerWallStart, mouse);
      const mid = { x: (a.x + mousePx.x) / 2, y: (a.y + mousePx.y) / 2 };
      elements.push(
        <Line key="iw-preview" points={[a.x, a.y, mousePx.x, mousePx.y]}
          stroke="rgba(231,111,81,0.5)" strokeWidth={1.5} dash={[8, 4]} />
      );
      if (len > 10) {
        elements.push(
          <Text key="iw-len" x={mid.x - 20} y={mid.y - 22}
            text={`${(len / 100).toFixed(2)} m`}
            fontSize={11} fontStyle="600" fill="#E76F51" fontFamily="Inter" padding={2} />
        );
      }
    }
    if (innerWallStart) {
      const p = toSc(innerWallStart);
      elements.push(
        <Circle key="iw-start" x={p.x} y={p.y} radius={6}
          fill="#E76F51" stroke="rgba(231,111,81,0.3)" strokeWidth={2.5} />
      );
    }
    return <>{elements}</>;
  };

  // ── Live surface computation from drawn walls ──
  const liveSurface = phase === 'contour_draw' ? (() => {
    // Include current mouse position as a virtual wall if line tool is active
    const walls = mouse && lineStart
      ? [...drawnWalls, { debut: lineStart, fin: mouse }]
      : drawnWalls;
    return wallsSurface(walls);
  })() : null;

  // ── Instructions ──
  let instruction = '';
  if (phase === 'surface_input' || phase === 'mode_choice') {
    instruction = `Apercu : ${targetSurfaceM2} m\u00B2`;
  } else if (phase === 'contour_draw') {
    if (activeTool === 'line') {
      instruction = lineStart ? 'Cliquez la fin du mur (clic droit = annuler)' : 'Cliquez pour commencer un mur';
    } else if (activeTool === 'freehand') {
      instruction = 'Maintenez et dessinez — relacher pour convertir en murs';
    } else {
      instruction = 'Cliquez pres d\'un mur pour le supprimer';
    }
  } else if (phase === 'contour_template') {
    instruction = 'Tirez les poignees orange pour ajuster les dimensions';
  } else if (phase === 'murs_interieurs') {
    instruction = activeTool === 'eraser'
      ? 'Cliquez pres d\'un mur interieur pour le supprimer'
      : 'Cliquez pour tracer un mur interieur';
  }

  // Cursor style
  let cursor = 'crosshair';
  if (isPanning) cursor = 'grabbing';
  else if (activeTool === 'eraser') cursor = 'pointer';
  else if (phase === 'contour_template') cursor = dragHandle ? 'grabbing' : 'default';
  else if (phase === 'surface_input' || phase === 'mode_choice') cursor = 'default';

  // Zoom percentage for display
  const zoomPct = Math.round(echelle * 100);

  return (
    <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#FFFFFF' }}>
      <Stage width={sz.w} height={sz.h}
        onClick={handleClick} onTap={handleClick}
        onContextMenu={handleRightClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setMouse(null); handleMouseUp(); }}
        onWheel={handleWheel}
        style={{ cursor }}>
        <Layer>
          {/* White background */}
          <Rect x={0} y={0} width={sz.w} height={sz.h} fill="#FFFFFF" />
          {/* Grid area */}
          <Rect x={origin.x} y={origin.y} width={gridPx} height={gridPx}
            fill="#f9f9f8" stroke="rgba(26,26,26,0.15)" strokeWidth={0.8} />
          {grid}
          {labels}
          <Text x={origin.x + gridPx + 6} y={origin.y - 16} text="m" fontSize={10} fill="rgba(26,26,26,0.3)" fontFamily="Inter" />

          {/* Phase: surface_input / mode_choice */}
          {(phase === 'surface_input' || phase === 'mode_choice') && renderSurfacePreview()}

          {/* Phase: contour_draw */}
          {phase === 'contour_draw' && (
            <>
              {renderDrawnWalls(drawnWalls, '#1A1A1A', 'rgba(0,0,0,0.5)')}
              {renderWallPoints(drawnWalls, 'rgba(0,0,0,0.6)')}
              {activeTool === 'line' && renderLinePreview()}
              {activeTool === 'freehand' && renderFreehandStroke()}
              {renderCloseIndicator()}
            </>
          )}

          {/* Phase: contour_template */}
          {phase === 'contour_template' && renderTemplate()}

          {/* Phase: murs_interieurs */}
          {phase === 'murs_interieurs' && (
            <>
              {renderClosedContour()}
              {renderDrawnWalls(innerWalls, '#E76F51', 'rgba(231,111,81,0.7)')}
              {activeTool === 'line' && renderInnerWallPreview()}
              {activeTool === 'freehand' && renderFreehandStroke()}
            </>
          )}

          {/* Cursor dot */}
          {mousePx && (phase === 'contour_draw' || phase === 'murs_interieurs') && (
            <Circle x={mousePx.x} y={mousePx.y} radius={3.5}
              fill="rgba(231,111,81,0.4)" stroke="rgba(231,111,81,0.6)" strokeWidth={1} />
          )}

          {/* Fixed instruction at bottom-left */}
          <Text x={16} y={sz.h - 32} text={instruction} fontSize={12} fill="rgba(0,0,0,0.35)" fontFamily="Inter" />
        </Layer>
      </Stage>

      {/* Live surface indicator */}
      {phase === 'contour_draw' && liveSurface !== null && liveSurface > 0 && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 12,
          border: `1.5px solid ${Math.abs(liveSurface - targetSurfaceM2) <= targetSurfaceM2 * 0.1 ? 'rgba(34,197,94,0.5)' : liveSurface > targetSurfaceM2 ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'}`,
          padding: '10px 14px',
          zIndex: 5,
          userSelect: 'none',
          backdropFilter: 'blur(8px)',
          minWidth: 120,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(0,0,0,0.4)',
            fontFamily: 'Inter',
            letterSpacing: '0.04em',
          }}>SURFACE</div>
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'Inter',
            color: Math.abs(liveSurface - targetSurfaceM2) <= targetSurfaceM2 * 0.1 ? '#22c55e' : liveSurface > targetSurfaceM2 ? '#ef4444' : '#1A1A1A',
          }}>{liveSurface} m²</div>
          <div style={{
            fontSize: 11,
            fontFamily: 'Inter',
            color: 'rgba(0,0,0,0.35)',
          }}>cible : {targetSurfaceM2} m²</div>
          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            background: 'rgba(0,0,0,0.06)',
            marginTop: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(100, (liveSurface / targetSurfaceM2) * 100)}%`,
              height: '100%',
              borderRadius: 2,
              background: Math.abs(liveSurface - targetSurfaceM2) <= targetSurfaceM2 * 0.1 ? '#22c55e' : liveSurface > targetSurfaceM2 ? '#ef4444' : '#3b82f6',
              transition: 'width 0.2s, background 0.2s',
            }} />
          </div>
        </div>
      )}

      {/* Zoom controls — light capsule */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'rgba(0,0,0,0.05)',
        borderRadius: 9999,
        border: '1px solid rgba(0,0,0,0.08)',
        padding: '3px 4px',
        zIndex: 5,
        userSelect: 'none',
        backdropFilter: 'blur(8px)',
      }}>
        <button
          onClick={() => setEchelle(Math.max(0.3, echelle / 1.2))}
          style={{
            width: 26, height: 26, borderRadius: '50%',
            border: 'none', background: 'rgba(0,0,0,0.05)',
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
            color: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Inter',
          }}
        >-</button>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.35)',
          minWidth: 38, textAlign: 'center',
          letterSpacing: '0.04em', fontFamily: 'Inter',
        }}>{zoomPct}%</span>
        <button
          onClick={() => setEchelle(Math.min(5, echelle * 1.2))}
          style={{
            width: 26, height: 26, borderRadius: '50%',
            border: 'none', background: 'rgba(0,0,0,0.05)',
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
            color: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Inter',
          }}
        >+</button>
        <button
          onClick={() => { setEchelle(1); setStagePos({ x: 0, y: 0 }); }}
          style={{
            height: 26, borderRadius: 9999,
            border: 'none',
            background: echelle !== 1 ? 'rgba(231,111,81,0.15)' : 'rgba(0,0,0,0.05)',
            cursor: 'pointer', fontSize: 9, fontWeight: 600,
            color: echelle !== 1 ? '#E76F51' : 'rgba(0,0,0,0.35)',
            padding: '0 10px',
            letterSpacing: '0.06em', fontFamily: 'Inter',
          }}
        >FIT</button>
      </div>
    </div>
  );
}
