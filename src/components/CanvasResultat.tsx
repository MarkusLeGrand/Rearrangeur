import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Text, Arc, Group, Circle } from 'react-konva';
import type Konva from 'konva';
import { useStore } from '../store';
import type { ElementMur, MeublePlacement, WallLine } from '../types';
import { pointSurSegment, angleSegment, snap } from '../utils/geometry';
import { renderFurnitureSymbol } from './CanvasAmenagement';

const MAX_CM = 1000;
const SNAP = 10;
const FLOOR = '#FFFFFF';
const WALL_COLOR = '#1A1A1A';

interface Props { stageRef: React.RefObject<Konva.Stage | null> }

export function CanvasResultat({ stageRef }: Props) {
  const piece = useStore((s) => s.piece)!;
  const echelle = useStore((s) => s.echelle);
  const setEchelle = useStore((s) => s.setEchelle);
  const elementsMur = useStore((s) => s.elementsMur);
  const fixes = useStore((s) => s.fixes);
  const placements = useStore((s) => s.placements);
  const mettreAJourFixe = useStore((s) => s.mettreAJourFixe);
  const supprimerFixe = useStore((s) => s.supprimerFixe);
  const mettreAJourPlacement = useStore((s) => s.mettreAJourPlacement);
  const supprimerPlacement = useStore((s) => s.supprimerPlacement);
  const selectedPlacement = useStore((s) => s.selectedPlacement);
  const setSelectedPlacement = useStore((s) => s.setSelectedPlacement);

  const containerRef = useRef<HTMLDivElement>(null);
  const [sz, setSz] = useState({ w: 800, h: 600 });

  const [stagePos, setStagePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSz({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const PAD = 40;
  const freeW = sz.w;
  const baseScale = Math.min((freeW - PAD * 2) / MAX_CM, (sz.h - PAD * 2) / MAX_CM);
  const scale = baseScale * echelle;
  const cx = (freeW - MAX_CM * scale) / 2;
  const cy = (sz.h - MAX_CM * scale) / 2;

  const toSc = (x: number, y: number) => ({
    sx: cx + x * scale + stagePos.x,
    sy: cy + y * scale + stagePos.y,
  });
  const toCm = (sx: number, sy: number) => ({
    x: (sx - cx - stagePos.x) / scale,
    y: (sy - cy - stagePos.y) / scale,
  });

  const murs = piece.allWalls;

  // ── Wheel zoom ──
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const pointer = e.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const factor = 1.1;
    const newEchelle = Math.max(0.3, Math.min(5, echelle * (direction > 0 ? factor : 1 / factor)));
    const oldScale = baseScale * echelle;
    const newScale = baseScale * newEchelle;
    const newCx = (freeW - MAX_CM * newScale) / 2;
    const newCy = (sz.h - MAX_CM * newScale) / 2;
    const mouseXcm = (pointer.x - cx - stagePos.x) / oldScale;
    const mouseYcm = (pointer.y - cy - stagePos.y) / oldScale;
    setStagePos({
      x: pointer.x - newCx - mouseXcm * newScale,
      y: pointer.y - newCy - mouseYcm * newScale,
    });
    setEchelle(newEchelle);
  };

  const handleMouseDown = (e: any) => {
    if (e.evt.button === 2) {
      e.evt.preventDefault(); setIsPanning(true);
      panStartRef.current = { x: e.evt.clientX - stagePos.x, y: e.evt.clientY - stagePos.y };
    }
  };
  const handleMouseMove = (e: any) => {
    if (isPanning) setStagePos({ x: e.evt.clientX - panStartRef.current.x, y: e.evt.clientY - panStartRef.current.y });
  };
  const handleMouseUp = () => { if (isPanning) setIsPanning(false); };

  const zoomPct = Math.round(echelle * 100);

  return (
    <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#FFFFFF' }}>
      <Stage ref={stageRef} width={sz.w} height={sz.h}
        onContextMenu={(e: any) => e.evt.preventDefault()}
        onClick={(e: any) => {
          // Deselect when clicking empty area
          if (e.target === e.target.getStage()) setSelectedPlacement(null);
        }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}>
        <Layer>
          <Rect x={0} y={0} width={sz.w} height={sz.h} fill="#FFFFFF"
            onClick={() => setSelectedPlacement(null)} onTap={() => setSelectedPlacement(null)} />

          {/* Floor */}
          <Line points={piece.contour.flatMap((p) => { const s = toSc(p.x, p.y); return [s.sx, s.sy]; })}
            closed fill={FLOOR} stroke="transparent"
            onClick={() => setSelectedPlacement(null)} onTap={() => setSelectedPlacement(null)} />

          {/* Walls */}
          {murs.map((w, i) => {
            const a = toSc(w.debut.x, w.debut.y), b = toSc(w.fin.x, w.fin.y);
            return <Line key={`w${i}`} points={[a.sx, a.sy, b.sx, b.sy]}
              stroke={WALL_COLOR} strokeWidth={3} lineCap="round" lineJoin="round" />;
          })}

          {/* Wall dimensions */}
          {murs.map((w, i) => {
            const a = toSc(w.debut.x, w.debut.y), b = toSc(w.fin.x, w.fin.y);
            const len = Math.sqrt((w.fin.x - w.debut.x) ** 2 + (w.fin.y - w.debut.y) ** 2);
            if (len < 30) return null;
            const mx = (a.sx + b.sx) / 2, my = (a.sy + b.sy) / 2;
            return <Text key={`wl${i}`} x={mx - 16} y={my - 18}
              text={`${(len / 100).toFixed(1)} m`}
              fontSize={10} fontStyle="600" fill="rgba(0,0,0,0.3)" fontFamily="Inter" />;
          })}

          {/* Doors/Windows */}
          {elementsMur.map((el) => (
            <ElMurResultLight key={el.id} el={el} murs={murs} toSc={toSc} scale={scale} />
          ))}

          {/* Fixed elements */}
          {fixes.map((m, i) => (
            <DraggableFurniture key={`f${i}`} m={m} toSc={toSc} toCm={toCm} scale={scale} fixe
              onDelete={() => supprimerFixe(i)}
              onDragEnd={(x, y) => mettreAJourFixe(i, { x, y })}
              onSetRotation={(r) => mettreAJourFixe(i, { rotation: r })}
              onResize={(l, h) => mettreAJourFixe(i, { largeur: l, hauteur: h })} />
          ))}

          {/* Placed furniture */}
          {placements.map((m, i) => (
            <DraggableFurniture key={`p${i}`} m={m} toSc={toSc} toCm={toCm} scale={scale} fixe={false}
              selected={selectedPlacement === i}
              onSelect={() => setSelectedPlacement(i)}
              onDelete={() => supprimerPlacement(i)}
              onDragEnd={(x, y) => mettreAJourPlacement(i, { x, y })}
              onSetRotation={(r) => mettreAJourPlacement(i, { rotation: r })}
              onResize={(l, h) => mettreAJourPlacement(i, { largeur: l, hauteur: h })} />
          ))}
        </Layer>
      </Stage>

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'rgba(0,0,0,0.04)', borderRadius: 9999,
        border: '1px solid rgba(0,0,0,0.08)', padding: '3px 4px',
        zIndex: 5, userSelect: 'none', backdropFilter: 'blur(8px)',
      }}>
        <button onClick={() => setEchelle(Math.max(0.3, echelle / 1.2))} style={{
          width: 26, height: 26, borderRadius: '50%', border: 'none',
          background: 'rgba(0,0,0,0.04)', cursor: 'pointer', fontSize: 14,
          fontWeight: 600, color: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter',
        }}>-</button>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.3)',
          minWidth: 38, textAlign: 'center', letterSpacing: '0.04em', fontFamily: 'Inter',
        }}>{zoomPct}%</span>
        <button onClick={() => setEchelle(Math.min(5, echelle * 1.2))} style={{
          width: 26, height: 26, borderRadius: '50%', border: 'none',
          background: 'rgba(0,0,0,0.04)', cursor: 'pointer', fontSize: 14,
          fontWeight: 600, color: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter',
        }}>+</button>
        <button onClick={() => { setEchelle(1); setStagePos({ x: 0, y: 0 }); }} style={{
          height: 26, borderRadius: 9999, border: 'none',
          background: echelle !== 1 ? 'rgba(231,111,81,0.12)' : 'rgba(0,0,0,0.04)',
          cursor: 'pointer', fontSize: 9, fontWeight: 600,
          color: echelle !== 1 ? '#E76F51' : 'rgba(0,0,0,0.3)',
          padding: '0 10px', letterSpacing: '0.06em', fontFamily: 'Inter',
        }}>FIT</button>
      </div>
    </div>
  );
}

// ── Door/Window (light) ──

function ElMurResultLight({ el, murs, toSc, scale }: {
  el: ElementMur; murs: WallLine[];
  toSc: (x: number, y: number) => { sx: number; sy: number };
  scale: number;
}) {
  const mur = murs[el.murIndex];
  if (!mur) return null;

  const pt = pointSurSegment(mur.debut, mur.fin, el.position);
  const angle = angleSegment(mur.debut, mur.fin);
  const deg = (angle * 180) / Math.PI;
  const sc = toSc(pt.x, pt.y);
  const px = sc.sx, py = sc.sy;
  const hw = (el.largeur / 2) * scale;
  const sens = el.sens ?? 1;

  const wallGap = (
    <Line points={[
      px - hw * Math.cos(angle), py - hw * Math.sin(angle),
      px + hw * Math.cos(angle), py + hw * Math.sin(angle),
    ]} stroke={FLOOR} strokeWidth={6} />
  );

  // Endpoints of the opening on the wall
  const x1 = px - hw * Math.cos(angle), y1 = py - hw * Math.sin(angle);
  const x2 = px + hw * Math.cos(angle), y2 = py + hw * Math.sin(angle);

  if (el.type === 'porte') {
    const pivotDir = sens === 1 ? -1 : 1;
    const pivotX = px + pivotDir * hw * Math.cos(angle);
    const pivotY = py + pivotDir * hw * Math.sin(angle);
    const arcRotation = sens === 1 ? deg - 90 : deg + 90;
    const leafAngleRad = (arcRotation * Math.PI) / 180;
    const leafLen = el.largeur * scale * 0.9;
    const leafEndX = pivotX + leafLen * Math.cos(leafAngleRad);
    const leafEndY = pivotY + leafLen * Math.sin(leafAngleRad);
    return (
      <>
        {wallGap}
        <Line points={[pivotX, pivotY, leafEndX, leafEndY]}
          stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
        <Arc x={pivotX} y={pivotY}
          innerRadius={leafLen} outerRadius={leafLen}
          angle={90} rotation={arcRotation}
          stroke="rgba(0,0,0,0.2)" strokeWidth={0.8} dash={[4, 4]} />
      </>
    );
  }

  // Window
  const nx = -Math.sin(angle), ny = Math.cos(angle);
  const glassW = 3 * scale;

  return (
    <>
      {wallGap}
      <Line points={[
        x1 + nx * glassW, y1 + ny * glassW,
        x2 + nx * glassW, y2 + ny * glassW,
        x2 - nx * glassW, y2 - ny * glassW,
        x1 - nx * glassW, y1 - ny * glassW,
      ]} closed fill="rgba(56,189,248,0.15)" stroke="rgba(56,189,248,0.6)" strokeWidth={1} />
      <Line points={[x1, y1, x2, y2]}
        stroke="rgba(56,189,248,0.5)" strokeWidth={0.5} />
    </>
  );
}

// ── Draggable furniture ──

function DraggableFurniture({ m, toSc, toCm, scale, fixe, selected, onSelect, onDelete, onDragEnd, onSetRotation, onResize }: {
  m: MeublePlacement;
  toSc: (x: number, y: number) => { sx: number; sy: number };
  toCm: (sx: number, sy: number) => { x: number; y: number };
  scale: number; fixe: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onDelete: () => void;
  onDragEnd: (x: number, y: number) => void;
  onSetRotation: (angle: number) => void;
  onResize: (largeur: number, hauteur: number) => void;
}) {
  const [liveDims, setLiveDims] = useState<{ l: number; h: number } | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const rotBaseRef = useRef<number>(0);
  const centerScreenRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const curL = liveDims ? liveDims.l : m.largeur;
  const curH = liveDims ? liveDims.h : m.hauteur;
  const w = curL * scale;
  const h = curH * scale;
  const center = toSc(m.x + m.largeur / 2, m.y + m.hauteur / 2);

  // Rotation via pointer events on window (not Konva drag) to avoid feedback loop
  useEffect(() => {
    if (!isRotating) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - centerScreenRef.current.x;
      const dy = e.clientY - centerScreenRef.current.y;
      const rawAngle = Math.atan2(dy, dx) * 180 / Math.PI - rotBaseRef.current;
      const snapped = Math.round(rawAngle / 5) * 5;
      onSetRotation(((snapped % 360) + 360) % 360);
    };
    const onUp = () => setIsRotating(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isRotating, onSetRotation]);

  const startRotation = (e: any) => {
    e.cancelBubble = true;
    const stage = e.target.getStage();
    if (!stage) return;
    const container = stage.container().getBoundingClientRect();
    centerScreenRef.current = { x: container.left + center.sx, y: container.top + center.sy };
    const dx = e.evt.clientX - centerScreenRef.current.x;
    const dy = e.evt.clientY - centerScreenRef.current.y;
    rotBaseRef.current = Math.atan2(dy, dx) * 180 / Math.PI - m.rotation;
    setIsRotating(true);
  };

  return (
    <Group x={center.sx} y={center.sy} rotation={m.rotation}
      draggable={selected && !isRotating}
      onClick={(e) => { e.cancelBubble = true; onSelect?.(); }}
      onTap={(e) => { e.cancelBubble = true; onSelect?.(); }}
      onContextMenu={(e) => { e.evt.preventDefault(); e.cancelBubble = true; onDelete(); }}
      onDragEnd={(e) => {
        const newCm = toCm(e.target.x(), e.target.y());
        const nx = snap(newCm.x - m.largeur / 2, SNAP);
        const ny = snap(newCm.y - m.hauteur / 2, SNAP);
        const snapped = toSc(nx + m.largeur / 2, ny + m.hauteur / 2);
        e.target.x(snapped.sx); e.target.y(snapped.sy);
        onDragEnd(nx, ny);
      }}>
      {selected && (
        <Rect x={-w / 2 - 3} y={-h / 2 - 3} width={w + 6} height={h + 6}
          stroke="#E76F51" strokeWidth={2} dash={[6, 3]}
          fill="transparent" cornerRadius={3} />
      )}
      {renderFurnitureSymbol(m.catalogueId, w, h, m.nom, fixe)}
      {/* Delete handle (top-right) — only when selected */}
      {selected && (
        <Group x={w / 2} y={-h / 2}
          onClick={(e) => { e.cancelBubble = true; onDelete(); }}
          onTap={(e) => { e.cancelBubble = true; onDelete(); }}
          onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'pointer'; }}
          onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = 'default'; }}>
          <Circle radius={8} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
          <Text x={-4} y={-5.5} text="x" fontSize={10} fontStyle="700" fill="#fff" fontFamily="Inter" listening={false} />
        </Group>
      )}
      {/* Rotation handle (top-left) — only when selected */}
      {selected && (
        <Circle x={-w / 2} y={-h / 2} radius={7}
          fill="#E76F51" stroke="#fff" strokeWidth={1.5}
          onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'grab'; }}
          onMouseLeave={(e) => { if (!isRotating) e.target.getStage()!.container().style.cursor = 'default'; }}
          onMouseDown={startRotation}
          onTouchStart={startRotation} />
      )}
      {/* Resize handle (bottom-right) — only when selected */}
      {selected && (
        <Circle x={w / 2} y={h / 2} radius={6}
          fill="#264653" stroke="#fff" strokeWidth={1.5}
          draggable
          onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'nwse-resize'; }}
          onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = 'default'; }}
          onDragMove={(e) => {
            e.cancelBubble = true;
            const minPx = 20 * scale;
            const nx = Math.max(-w / 2 + minPx, e.target.x());
            const ny = Math.max(-h / 2 + minPx, e.target.y());
            e.target.x(nx); e.target.y(ny);
            const newL = snap(Math.max(20, (nx + w / 2) / scale), 5);
            const newH = snap(Math.max(20, (ny + h / 2) / scale), 5);
            setLiveDims({ l: newL, h: newH });
          }}
          onDragEnd={(e) => {
            e.cancelBubble = true;
            const newL = liveDims ? liveDims.l : m.largeur;
            const newH = liveDims ? liveDims.h : m.hauteur;
            setLiveDims(null);
            e.target.x(newL * scale / 2); e.target.y(newH * scale / 2);
            onResize(newL, newH);
          }} />
      )}
    </Group>
  );
}
