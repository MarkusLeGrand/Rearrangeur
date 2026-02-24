import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Text, Arc } from 'react-konva';
import { useStore } from '../store';
import type { ElementMur, MeublePlacement, WallLine } from '../types';
import { pointSurSegment, angleSegment, projeterSur, snap, polyBounds } from '../utils/geometry';

const SNAP = 50;

export function CanvasAmenagement() {
  const piece = useStore((s) => s.piece)!;
  const echelle = useStore((s) => s.echelle);
  const elementsMur = useStore((s) => s.elementsMur);
  const ajouterElementMur = useStore((s) => s.ajouterElementMur);
  const supprimerElementMur = useStore((s) => s.supprimerElementMur);
  const fixes = useStore((s) => s.fixes);
  const ajouterFixe = useStore((s) => s.ajouterFixe);
  const supprimerFixe = useStore((s) => s.supprimerFixe);
  const mettreAJourFixe = useStore((s) => s.mettreAJourFixe);
  const placingTool = useStore((s) => s.placingTool);
  const setPlacingTool = useStore((s) => s.setPlacingTool);

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

  const handleClick = (e: any) => {
    if (!placingTool) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const cmX = (pos.x - pad) / scale + bounds.minX;
    const cmY = (pos.y - pad) / scale + bounds.minY;

    let bestI = 0, bestT = 0, bestD = Infinity;
    for (let i = 0; i < murs.length; i++) {
      const t = projeterSur({ x: cmX, y: cmY }, murs[i].debut, murs[i].fin);
      const pt = pointSurSegment(murs[i].debut, murs[i].fin, t);
      const d = Math.sqrt((cmX - pt.x) ** 2 + (cmY - pt.y) ** 2);
      if (d < bestD) { bestD = d; bestI = i; bestT = t; }
    }
    if (bestD > 50) return;

    ajouterElementMur({
      id: crypto.randomUUID(),
      type: placingTool,
      murIndex: bestI,
      position: bestT,
      largeur: placingTool === 'porte' ? 90 : 100,
    });
    setPlacingTool(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('fixe');
    if (!data) return;
    const item = JSON.parse(data);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    ajouterFixe({
      catalogueId: item.id, nom: item.nom,
      largeur: item.largeur, hauteur: item.hauteur, couleur: item.couleur,
      x: snap((e.clientX - rect.left - pad) / scale + bounds.minX, SNAP),
      y: snap((e.clientY - rect.top - pad) / scale + bounds.minY, SNAP),
      rotation: 0, fixe: true,
    });
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-100"
      onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <Stage width={sz.w} height={sz.h} onClick={handleClick}
        style={{ cursor: placingTool ? 'crosshair' : 'default' }}>
        <Layer>
          <Rect x={0} y={0} width={sz.w} height={sz.h} fill="#F9FAFB" />
          <Rect x={pad} y={pad} width={ww * scale} height={wh * scale} fill="#FFFFFF" stroke="#D1D5DB" strokeWidth={1} />
          {gridLines}
          {labels}

          {/* Fond contour */}
          <Line points={piece.contour.flatMap((p) => { const s = toSc(p.x, p.y); return [s.sx, s.sy]; })}
            closed fill="rgba(219,234,254,0.15)" stroke="transparent" />

          {/* Tous les murs */}
          {murs.map((w, i) => {
            const a = toSc(w.debut.x, w.debut.y), b = toSc(w.fin.x, w.fin.y);
            // Murs intérieurs en rouge, contour en gris foncé
            const isInner = i >= piece.contour.length;
            return <Line key={`w${i}`} points={[a.sx, a.sy, b.sx, b.sy]}
              stroke={isInner ? '#DC2626' : '#374151'} strokeWidth={3} lineCap="round" />;
          })}

          {/* Éléments sur murs */}
          {elementsMur.map((el) => (
            <ElMurShape key={el.id} el={el} murs={murs} scale={scale} bounds={bounds} pad={pad}
              onDelete={() => supprimerElementMur(el.id)} />
          ))}

          {/* Fixes */}
          {fixes.map((m, i) => (
            <FixeShape key={`f${i}`} m={m} scale={scale} bounds={bounds} pad={pad}
              onDelete={() => supprimerFixe(i)}
              onDragEnd={(x, y) => mettreAJourFixe(i, { x, y })} />
          ))}

          {placingTool && (
            <Text x={pad} y={pad + wh * scale + 10}
              text={`Cliquez sur un mur pour placer la ${placingTool === 'porte' ? 'porte' : 'fenêtre'}`}
              fontSize={13} fill="#2563EB" />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

function ElMurShape({ el, murs, scale, bounds, pad, onDelete }: {
  el: ElementMur; murs: WallLine[]; scale: number;
  bounds: { minX: number; minY: number }; pad: number; onDelete: () => void;
}) {
  const mur = murs[el.murIndex];
  if (!mur) return null;

  const pt = pointSurSegment(mur.debut, mur.fin, el.position);
  const angle = angleSegment(mur.debut, mur.fin);
  const deg = (angle * 180) / Math.PI;
  const px = pad + (pt.x - bounds.minX) * scale;
  const py = pad + (pt.y - bounds.minY) * scale;
  const hw = (el.largeur / 2) * scale;

  const wallGap = (
    <Line points={[
      px - hw * Math.cos(angle), py - hw * Math.sin(angle),
      px + hw * Math.cos(angle), py + hw * Math.sin(angle),
    ]} stroke="#F9FAFB" strokeWidth={6} />
  );

  if (el.type === 'porte') {
    return (
      <>
        {wallGap}
        <Arc x={px - hw * Math.cos(angle)} y={py - hw * Math.sin(angle)}
          innerRadius={0} outerRadius={el.largeur * scale * 0.9}
          angle={90} rotation={deg - 90}
          fill="rgba(59,130,246,0.1)" stroke="#3B82F6" strokeWidth={1.5} />
        <Text x={px - 6} y={py - 18} text="x" fontSize={14} fill="#EF4444" onClick={onDelete} />
      </>
    );
  }

  const nx = -Math.sin(angle), ny = Math.cos(angle);
  const off = 3 * scale;
  return (
    <>
      {wallGap}
      <Line points={[
        px - hw * Math.cos(angle) + nx * off, py - hw * Math.sin(angle) + ny * off,
        px + hw * Math.cos(angle) + nx * off, py + hw * Math.sin(angle) + ny * off,
      ]} stroke="#38BDF8" strokeWidth={2} />
      <Line points={[
        px - hw * Math.cos(angle) - nx * off, py - hw * Math.sin(angle) - ny * off,
        px + hw * Math.cos(angle) - nx * off, py + hw * Math.sin(angle) - ny * off,
      ]} stroke="#38BDF8" strokeWidth={2} />
      <Text x={px - 6} y={py - 18} text="x" fontSize={14} fill="#EF4444" onClick={onDelete} />
    </>
  );
}

function FixeShape({ m, scale, bounds, pad, onDelete, onDragEnd }: {
  m: MeublePlacement; scale: number;
  bounds: { minX: number; minY: number }; pad: number;
  onDelete: () => void; onDragEnd: (x: number, y: number) => void;
}) {
  const w = m.largeur * scale, h = m.hauteur * scale;
  const sx = pad + (m.x - bounds.minX) * scale;
  const sy = pad + (m.y - bounds.minY) * scale;
  const fs = Math.max(8, Math.min(Math.min(w, h) * 0.18, 13));

  return (
    <>
      <Rect x={sx} y={sy} width={w} height={h}
        fill={m.couleur} opacity={0.85} cornerRadius={3}
        stroke="#1E40AF" strokeWidth={2} dash={[6, 3]}
        draggable onDragEnd={(e) => {
          const nx = snap((e.target.x() - pad) / scale + bounds.minX, SNAP);
          const ny = snap((e.target.y() - pad) / scale + bounds.minY, SNAP);
          e.target.x(pad + (nx - bounds.minX) * scale);
          e.target.y(pad + (ny - bounds.minY) * scale);
          onDragEnd(nx, ny);
        }} />
      <Text x={sx} y={sy} width={w} height={h} text={m.nom}
        align="center" verticalAlign="middle" fontSize={fs} fill="#FFFFFF" listening={false} />
      <Text x={sx + w - 14} y={sy + 2} text="x" fontSize={14} fill="#EF4444"
        onClick={(e) => { e.cancelBubble = true; onDelete(); }} />
    </>
  );
}
