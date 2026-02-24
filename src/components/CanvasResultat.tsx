import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Text, Arc } from 'react-konva';
import type Konva from 'konva';
import { useStore } from '../store';
import type { ElementMur, MeublePlacement, WallLine } from '../types';
import { pointSurSegment, angleSegment, polyBounds } from '../utils/geometry';

interface Props { stageRef: React.RefObject<Konva.Stage | null> }

export function CanvasResultat({ stageRef }: Props) {
  const piece = useStore((s) => s.piece)!;
  const echelle = useStore((s) => s.echelle);
  const elementsMur = useStore((s) => s.elementsMur);
  const fixes = useStore((s) => s.fixes);
  const placements = useStore((s) => s.placements);

  const containerRef = useRef<HTMLDivElement>(null);
  const [sz, setSz] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSz({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bounds = polyBounds(piece.contour);
  const ww = bounds.maxX - bounds.minX;
  const wh = bounds.maxY - bounds.minY;
  const pad = 50;
  const scale = Math.min((sz.w - pad * 2) / ww, (sz.h - pad * 2) / wh, echelle);

  const murs = piece.allWalls;

  const toSc = (x: number, y: number) => ({
    sx: pad + (x - bounds.minX) * scale,
    sy: pad + (y - bounds.minY) * scale,
  });

  // Grille
  const gridLines: React.JSX.Element[] = [];
  for (let cm = 0; cm <= ww; cm += 50) {
    const x = pad + cm * scale;
    gridLines.push(<Line key={`sv${cm}`} points={[x, pad, x, pad + wh * scale]} stroke="#F3F4F6" strokeWidth={0.5} />);
  }
  for (let cm = 0; cm <= wh; cm += 50) {
    const y = pad + cm * scale;
    gridLines.push(<Line key={`sh${cm}`} points={[pad, y, pad + ww * scale, y]} stroke="#F3F4F6" strokeWidth={0.5} />);
  }
  for (let cm = 0; cm <= ww; cm += 100) {
    const x = pad + cm * scale;
    gridLines.push(<Line key={`mv${cm}`} points={[x, pad, x, pad + wh * scale]} stroke="#E5E7EB" strokeWidth={1} />);
  }
  for (let cm = 0; cm <= wh; cm += 100) {
    const y = pad + cm * scale;
    gridLines.push(<Line key={`mh${cm}`} points={[pad, y, pad + ww * scale, y]} stroke="#E5E7EB" strokeWidth={1} />);
  }

  const labels: React.JSX.Element[] = [];
  for (let cm = 0; cm <= ww; cm += 100)
    labels.push(<Text key={`lx${cm}`} x={pad + cm * scale - 6} y={pad - 16} text={`${cm / 100}`} fontSize={10} fill="#9CA3AF" />);
  for (let cm = 100; cm <= wh; cm += 100)
    labels.push(<Text key={`ly${cm}`} x={pad - 22} y={pad + cm * scale - 5} text={`${cm / 100}`} fontSize={10} fill="#9CA3AF" />);

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-100">
      <Stage ref={stageRef} width={sz.w} height={sz.h}>
        <Layer>
          <Rect x={0} y={0} width={sz.w} height={sz.h} fill="#F9FAFB" />
          <Rect x={pad} y={pad} width={ww * scale} height={wh * scale} fill="#FFFFFF" stroke="#D1D5DB" strokeWidth={1} />
          {gridLines}
          {labels}

          <Line points={piece.contour.flatMap((p) => { const s = toSc(p.x, p.y); return [s.sx, s.sy]; })}
            closed fill="rgba(219,234,254,0.1)" stroke="transparent" />

          {murs.map((w, i) => {
            const a = toSc(w.debut.x, w.debut.y), b = toSc(w.fin.x, w.fin.y);
            const isInner = i >= piece.contour.length;
            return <Line key={`w${i}`} points={[a.sx, a.sy, b.sx, b.sy]}
              stroke={isInner ? '#DC2626' : '#374151'} strokeWidth={3} lineCap="round" />;
          })}

          {elementsMur.map((el) => (
            <ElMurResult key={el.id} el={el} murs={murs} scale={scale} bounds={bounds} pad={pad} />
          ))}

          {fixes.map((m, i) => (
            <MRect key={`f${i}`} m={m} scale={scale} bounds={bounds} pad={pad} fixe />
          ))}

          {placements.map((m, i) => (
            <MRect key={`p${i}`} m={m} scale={scale} bounds={bounds} pad={pad} fixe={false} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function MRect({ m, scale, bounds, pad, fixe }: {
  m: MeublePlacement; scale: number;
  bounds: { minX: number; minY: number }; pad: number; fixe: boolean;
}) {
  const w = (m.rotation === 90 ? m.hauteur : m.largeur) * scale;
  const h = (m.rotation === 90 ? m.largeur : m.hauteur) * scale;
  const sx = pad + (m.x - bounds.minX) * scale;
  const sy = pad + (m.y - bounds.minY) * scale;
  const fs = Math.max(8, Math.min(Math.min(w, h) * 0.18, 13));

  return (
    <>
      <Rect x={sx} y={sy} width={w} height={h}
        fill={m.couleur} opacity={0.85} cornerRadius={3}
        stroke={fixe ? '#1E40AF' : '#374151'}
        strokeWidth={fixe ? 2 : 1}
        dash={fixe ? [6, 3] : undefined} />
      <Text x={sx} y={sy} width={w} height={h} text={m.nom}
        align="center" verticalAlign="middle" fontSize={fs} fill="#FFFFFF" listening={false} />
    </>
  );
}

function ElMurResult({ el, murs, scale, bounds, pad }: {
  el: ElementMur; murs: WallLine[]; scale: number;
  bounds: { minX: number; minY: number }; pad: number;
}) {
  const mur = murs[el.murIndex];
  if (!mur) return null;

  const pt = pointSurSegment(mur.debut, mur.fin, el.position);
  const angle = angleSegment(mur.debut, mur.fin);
  const deg = (angle * 180) / Math.PI;
  const px = pad + (pt.x - bounds.minX) * scale;
  const py = pad + (pt.y - bounds.minY) * scale;
  const hw = (el.largeur / 2) * scale;

  const gap = (
    <Line points={[
      px - hw * Math.cos(angle), py - hw * Math.sin(angle),
      px + hw * Math.cos(angle), py + hw * Math.sin(angle),
    ]} stroke="#F9FAFB" strokeWidth={6} />
  );

  if (el.type === 'porte') {
    return (
      <>
        {gap}
        <Arc x={px - hw * Math.cos(angle)} y={py - hw * Math.sin(angle)}
          innerRadius={0} outerRadius={el.largeur * scale * 0.9}
          angle={90} rotation={deg - 90}
          fill="rgba(59,130,246,0.1)" stroke="#3B82F6" strokeWidth={1.5} />
      </>
    );
  }

  const nx = -Math.sin(angle), ny = Math.cos(angle);
  const off = 3 * scale;
  return (
    <>
      {gap}
      <Line points={[
        px - hw * Math.cos(angle) + nx * off, py - hw * Math.sin(angle) + ny * off,
        px + hw * Math.cos(angle) + nx * off, py + hw * Math.sin(angle) + ny * off,
      ]} stroke="#38BDF8" strokeWidth={2} />
      <Line points={[
        px - hw * Math.cos(angle) - nx * off, py - hw * Math.sin(angle) - ny * off,
        px + hw * Math.cos(angle) - nx * off, py + hw * Math.sin(angle) - ny * off,
      ]} stroke="#38BDF8" strokeWidth={2} />
    </>
  );
}
