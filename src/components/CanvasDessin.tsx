import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva';
import { useStore } from '../store';
import { snap, dist } from '../utils/geometry';
import type { Point } from '../types';

const MAX_CM = 800;
const GRID = 50;          // snap 50cm
const PAD = 50;
const CLOSE_RADIUS = 30;  // cm — rayon pour fermer le contour

export function CanvasDessin() {
  const phase = useStore((s) => s.drawPhase);
  const contour = useStore((s) => s.contourPoints);
  const closed = useStore((s) => s.contourClosed);
  const addContourPoint = useStore((s) => s.addContourPoint);
  const closeContour = useStore((s) => s.closeContour);
  const innerWalls = useStore((s) => s.innerWalls);
  const innerWallStart = useStore((s) => s.innerWallStart);
  const setInnerWallStart = useStore((s) => s.setInnerWallStart);
  const addInnerWall = useStore((s) => s.addInnerWall);

  const containerRef = useRef<HTMLDivElement>(null);
  const [sz, setSz] = useState({ w: 800, h: 600 });
  const [mouse, setMouse] = useState<Point | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSz({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = Math.min((sz.w - PAD * 2) / MAX_CM, (sz.h - PAD * 2) / MAX_CM);
  const toSc = useCallback((p: Point) => ({ x: PAD + p.x * scale, y: PAD + p.y * scale }), [scale]);
  const toCm = useCallback((sx: number, sy: number): Point => ({
    x: Math.max(0, Math.min(MAX_CM, snap((sx - PAD) / scale, GRID))),
    y: Math.max(0, Math.min(MAX_CM, snap((sy - PAD) / scale, GRID))),
  }), [scale]);

  const handleClick = (e: any) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const cm = toCm(pos.x, pos.y);

    if (phase === 'contour') {
      // Fermer si clic proche du premier point et ≥ 3 points
      if (contour.length >= 3 && dist(cm, contour[0]) < CLOSE_RADIUS) {
        closeContour();
        return;
      }
      addContourPoint(cm);
    } else {
      // Phase murs intérieurs
      const snapped = snapToContour(cm);
      if (!innerWallStart) {
        setInnerWallStart(snapped);
      } else {
        addInnerWall(snapped);
      }
    }
  };

  // Snap aux points du contour si proche
  const snapToContour = (cm: Point): Point => {
    for (const p of contour) {
      if (dist(cm, p) < CLOSE_RADIUS) return { ...p };
    }
    return cm;
  };

  const handleMove = (e: any) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    setMouse(toCm(pos.x, pos.y));
  };

  const zone = MAX_CM * scale;

  // Grille
  const grid: React.JSX.Element[] = [];
  for (let cm = 0; cm <= MAX_CM; cm += 50) {
    const isMeter = cm % 100 === 0;
    const p = PAD + cm * scale;
    grid.push(<Line key={`v${cm}`} points={[p, PAD, p, PAD + zone]} stroke={isMeter ? '#D1D5DB' : '#EBEBEB'} strokeWidth={isMeter ? 1 : 0.5} />);
    grid.push(<Line key={`h${cm}`} points={[PAD, p, PAD + zone, p]} stroke={isMeter ? '#D1D5DB' : '#EBEBEB'} strokeWidth={isMeter ? 1 : 0.5} />);
  }

  // Labels
  const labels: React.JSX.Element[] = [];
  for (let m = 0; m <= 8; m++) {
    const p = PAD + m * 100 * scale;
    labels.push(<Text key={`lx${m}`} x={p - 4} y={PAD - 18} text={`${m}`} fontSize={11} fill="#9CA3AF" />);
    if (m > 0) labels.push(<Text key={`ly${m}`} x={PAD - 20} y={p - 6} text={`${m}`} fontSize={11} fill="#9CA3AF" />);
  }

  // Points écran du contour
  const cPx = contour.map(toSc);
  const mousePx = mouse ? toSc(mouse) : null;
  const nearFirst = mouse && contour.length >= 3 && dist(mouse, contour[0]) < CLOSE_RADIUS;

  // Instructions
  let instruction = '';
  if (phase === 'contour') {
    if (contour.length === 0) instruction = 'Cliquez pour placer le premier point du contour';
    else if (contour.length < 3) instruction = 'Continuez à placer des points pour dessiner le contour';
    else instruction = 'Continuez ou cliquez le premier point (rouge) pour fermer le contour';
  } else {
    if (!innerWallStart) instruction = 'Cliquez pour placer le début d\'un mur intérieur — ou validez dans la sidebar';
    else instruction = 'Cliquez pour placer la fin du mur intérieur';
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-100">
      <Stage width={sz.w} height={sz.h}
        onClick={handleClick} onTap={handleClick}
        onMouseMove={handleMove} onMouseLeave={() => setMouse(null)}
        style={{ cursor: 'crosshair' }}>
        <Layer>
          <Rect x={0} y={0} width={sz.w} height={sz.h} fill="#F5F5F5" />
          <Rect x={PAD} y={PAD} width={zone} height={zone} fill="#FFFFFF" stroke="#D1D5DB" strokeWidth={1} />
          {grid}
          {labels}
          <Text x={PAD + zone + 6} y={PAD - 18} text="m" fontSize={11} fill="#9CA3AF" />

          {/* Remplissage du contour si fermé */}
          {closed && cPx.length >= 3 && (
            <Line
              points={cPx.flatMap((p) => [p.x, p.y])}
              closed fill="rgba(219,234,254,0.3)" stroke="transparent"
            />
          )}

          {/* Arêtes du contour */}
          {cPx.length >= 2 && (() => {
            const pts: number[] = [];
            for (const p of cPx) { pts.push(p.x, p.y); }
            if (closed) pts.push(cPx[0].x, cPx[0].y);
            return <Line points={pts} stroke="#2563EB" strokeWidth={3} lineCap="round" lineJoin="round" />;
          })()}

          {/* Preview arête vers curseur (phase contour) */}
          {phase === 'contour' && !closed && cPx.length > 0 && mousePx && (
            <Line
              points={[cPx[cPx.length - 1].x, cPx[cPx.length - 1].y, mousePx.x, mousePx.y]}
              stroke="#93C5FD" strokeWidth={2} dash={[8, 4]}
            />
          )}

          {/* Longueurs des arêtes */}
          {contour.length >= 2 && contour.map((_, i) => {
            const nextI = (i + 1) % contour.length;
            if (!closed && i === contour.length - 1) return null;
            const a = contour[i], b = contour[nextI];
            const mid = toSc({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
            const len = dist(a, b);
            return (
              <Text key={`len${i}`} x={mid.x - 16} y={mid.y - 18}
                text={`${(len / 100).toFixed(1)} m`}
                fontSize={11} fontStyle="bold" fill="#1E40AF" />
            );
          })}

          {/* Points du contour */}
          {cPx.map((p, i) => (
            <Circle key={`cp${i}`} x={p.x} y={p.y}
              radius={i === 0 && !closed ? 9 : 6}
              fill={i === 0 && !closed ? '#EF4444' : '#3B82F6'}
              stroke="#FFFFFF" strokeWidth={2}
            />
          ))}

          {/* Indicateur "fermer ici" */}
          {nearFirst && !closed && cPx.length > 0 && (
            <Circle x={cPx[0].x} y={cPx[0].y} radius={16}
              fill="transparent" stroke="#EF4444" strokeWidth={2} dash={[4, 4]} />
          )}

          {/* Murs intérieurs */}
          {innerWalls.map((w, i) => {
            const a = toSc(w.debut), b = toSc(w.fin);
            return <Line key={`iw${i}`} points={[a.x, a.y, b.x, b.y]}
              stroke="#DC2626" strokeWidth={3} lineCap="round" />;
          })}

          {/* Preview mur intérieur en cours */}
          {phase === 'murs_interieurs' && innerWallStart && mousePx && (() => {
            const a = toSc(innerWallStart);
            return <Line points={[a.x, a.y, mousePx.x, mousePx.y]}
              stroke="#F87171" strokeWidth={2} dash={[8, 4]} />;
          })()}

          {/* Point de départ mur intérieur */}
          {innerWallStart && (() => {
            const p = toSc(innerWallStart);
            return <Circle x={p.x} y={p.y} radius={7} fill="#DC2626" stroke="#FFFFFF" strokeWidth={2} />;
          })()}

          {/* Curseur */}
          {mousePx && (
            <Circle x={mousePx.x} y={mousePx.y} radius={4}
              fill="rgba(59,130,246,0.3)" stroke="#3B82F6" strokeWidth={1} />
          )}

          <Text x={PAD} y={PAD + zone + 12} text={instruction} fontSize={13} fill="#6B7280" />
        </Layer>
      </Stage>
    </div>
  );
}
