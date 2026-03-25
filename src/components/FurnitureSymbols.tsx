import React from 'react';
import { Rect, Line, Circle, Arc, Text, Ellipse } from 'react-konva';
import { getPastelColor } from './CanvasAmenagement';

// ── Color helpers ──

function darken(hex: string, amount = 0.15): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((n >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (n & 0xff) * (1 - amount));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function lighten(hex: string, amount = 0.3): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount);
  const b = Math.min(255, (n & 0xff) + (255 - (n & 0xff)) * amount);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

const S = 'rgba(0,0,0,0.15)'; // standard stroke
const SL = 'rgba(0,0,0,0.08)'; // light stroke

// All symbols are centered at (0,0), w/h in screen pixels

type P = { w: number; h: number; c: string };

// ══════════════════════════════════════════════════════════
// SALON
// ══════════════════════════════════════════════════════════

function Canape({ w, h, c }: P) {
  const back = h * 0.2;
  const arm = w * 0.08;
  return (
    <>
      {/* Backrest */}
      <Rect x={-w / 2} y={-h / 2} width={w} height={back} fill={darken(c, 0.1)} stroke={S} strokeWidth={0.5} cornerRadius={[3, 3, 0, 0]} />
      {/* Seat */}
      <Rect x={-w / 2 + arm} y={-h / 2 + back} width={w - arm * 2} height={h - back} fill={c} stroke={S} strokeWidth={0.5} />
      {/* Left arm */}
      <Rect x={-w / 2} y={-h / 2 + back} width={arm} height={h - back} fill={darken(c, 0.05)} stroke={S} strokeWidth={0.5} cornerRadius={[0, 0, 0, 3]} />
      {/* Right arm */}
      <Rect x={w / 2 - arm} y={-h / 2 + back} width={arm} height={h - back} fill={darken(c, 0.05)} stroke={S} strokeWidth={0.5} cornerRadius={[0, 0, 3, 0]} />
      {/* Cushion lines */}
      <Line points={[0, -h / 2 + back, 0, h / 2]} stroke={S} strokeWidth={0.5} />
    </>
  );
}

function CanapeAngle({ w, h, c }: P) {
  const back = Math.min(w, h) * 0.15;
  const seat = Math.min(w, h) * 0.4;
  return (
    <>
      {/* L-shape body */}
      <Line points={[
        -w / 2, -h / 2, w / 2, -h / 2, w / 2, -h / 2 + seat,
        -w / 2 + seat, -h / 2 + seat, -w / 2 + seat, h / 2,
        -w / 2, h / 2,
      ]} closed fill={c} stroke={S} strokeWidth={0.5} />
      {/* Top backrest */}
      <Rect x={-w / 2} y={-h / 2} width={w} height={back} fill={darken(c, 0.1)} stroke={S} strokeWidth={0.5} />
      {/* Left backrest */}
      <Rect x={-w / 2} y={-h / 2 + back} width={back} height={h - back} fill={darken(c, 0.1)} stroke={S} strokeWidth={0.5} />
      {/* Corner cushion */}
      <Rect x={-w / 2 + back} y={-h / 2 + back} width={seat - back} height={seat - back} fill={lighten(c, 0.15)} stroke={SL} strokeWidth={0.5} />
    </>
  );
}

function Fauteuil({ w, h, c }: P) {
  const back = h * 0.22;
  const arm = w * 0.15;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={back} fill={darken(c, 0.1)} stroke={S} strokeWidth={0.5} cornerRadius={[4, 4, 0, 0]} />
      <Rect x={-w / 2 + arm} y={-h / 2 + back} width={w - arm * 2} height={h - back} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      <Rect x={-w / 2} y={-h / 2 + back} width={arm} height={h - back} fill={darken(c, 0.05)} stroke={S} strokeWidth={0.5} cornerRadius={[0, 0, 0, 4]} />
      <Rect x={w / 2 - arm} y={-h / 2 + back} width={arm} height={h - back} fill={darken(c, 0.05)} stroke={S} strokeWidth={0.5} cornerRadius={[0, 0, 4, 0]} />
    </>
  );
}

function Pouf({ w, h, c }: P) {
  return (
    <>
      <Ellipse x={0} y={0} radiusX={w / 2} radiusY={h / 2} fill={c} stroke={S} strokeWidth={0.5} />
      <Ellipse x={0} y={0} radiusX={w / 2 * 0.6} radiusY={h / 2 * 0.6} fill={lighten(c, 0.15)} stroke={SL} strokeWidth={0.5} />
    </>
  );
}

function TableBasse({ w, h, c }: P) {
  const inset = Math.min(w, h) * 0.1;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={3} />
      {/* Glass/surface top */}
      <Rect x={-w / 2 + inset} y={-h / 2 + inset} width={w - inset * 2} height={h - inset * 2}
        fill={lighten(c, 0.25)} stroke={SL} strokeWidth={0.5} cornerRadius={2} />
    </>
  );
}

function MeubleTV({ w, h, c }: P) {
  const sh = h * 0.15;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Shelf line */}
      <Line points={[-w / 2 + 2, -h / 2 + sh, w / 2 - 2, -h / 2 + sh]} stroke={S} strokeWidth={0.5} />
      {/* Compartments */}
      <Line points={[-w * 0.15, -h / 2 + sh, -w * 0.15, h / 2 - 1]} stroke={SL} strokeWidth={0.5} />
      <Line points={[w * 0.15, -h / 2 + sh, w * 0.15, h / 2 - 1]} stroke={SL} strokeWidth={0.5} />
    </>
  );
}

function Biblio({ w, h, c }: P) {
  const cols = Math.max(2, Math.round(w / (h * 0.8)));
  const cw = w / cols;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={1} />
      {/* Shelf dividers */}
      {Array.from({ length: cols - 1 }, (_, i) => (
        <Line key={i} points={[-w / 2 + cw * (i + 1), -h / 2 + 1, -w / 2 + cw * (i + 1), h / 2 - 1]}
          stroke={S} strokeWidth={0.5} />
      ))}
      {/* Middle shelf */}
      <Line points={[-w / 2 + 1, 0, w / 2 - 1, 0]} stroke={S} strokeWidth={0.5} />
    </>
  );
}

function Console({ w, h, c }: P) {
  const leg = w * 0.06;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h * 0.6} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Legs */}
      <Rect x={-w / 2 + 2} y={-h / 2 + h * 0.6} width={leg} height={h * 0.4} fill={darken(c, 0.1)} stroke={S} strokeWidth={0.3} />
      <Rect x={w / 2 - 2 - leg} y={-h / 2 + h * 0.6} width={leg} height={h * 0.4} fill={darken(c, 0.1)} stroke={S} strokeWidth={0.3} />
    </>
  );
}

// ══════════════════════════════════════════════════════════
// CHAMBRE
// ══════════════════════════════════════════════════════════

function Lit({ w, h, c }: P) {
  const pillowH = h * 0.18;
  const pillowPad = w * 0.06;
  const nbPillows = w > h * 0.6 ? 2 : 1;
  const pw = (w - pillowPad * (nbPillows + 1)) / nbPillows;
  return (
    <>
      {/* Mattress */}
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={3} />
      {/* Headboard */}
      <Rect x={-w / 2} y={-h / 2} width={w} height={h * 0.06} fill={darken(c, 0.2)} stroke={S} strokeWidth={0.5} cornerRadius={[3, 3, 0, 0]} />
      {/* Pillows */}
      {Array.from({ length: nbPillows }, (_, i) => (
        <Rect key={i}
          x={-w / 2 + pillowPad + i * (pw + pillowPad)}
          y={-h / 2 + h * 0.08}
          width={pw} height={pillowH}
          fill={lighten(c, 0.35)} stroke={SL} strokeWidth={0.5} cornerRadius={4} />
      ))}
      {/* Blanket fold line */}
      <Line points={[-w / 2 + 3, -h / 2 + h * 0.45, w / 2 - 3, -h / 2 + h * 0.45]}
        stroke={darken(c, 0.08)} strokeWidth={0.8} dash={[4, 3]} />
    </>
  );
}

function Chevet({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Drawer line */}
      <Line points={[-w / 2 + 2, 0, w / 2 - 2, 0]} stroke={S} strokeWidth={0.5} />
      {/* Handle dots */}
      <Circle x={0} y={-h * 0.15} radius={Math.min(w, h) * 0.06} fill={darken(c, 0.2)} />
      <Circle x={0} y={h * 0.2} radius={Math.min(w, h) * 0.06} fill={darken(c, 0.2)} />
    </>
  );
}

function Armoire({ w, h, c, doors }: P & { doors: number }) {
  const dw = w / doors;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Door divisions */}
      {Array.from({ length: doors - 1 }, (_, i) => (
        <Line key={i} points={[-w / 2 + dw * (i + 1), -h / 2 + 2, -w / 2 + dw * (i + 1), h / 2 - 2]}
          stroke={S} strokeWidth={0.5} />
      ))}
      {/* Handles */}
      {Array.from({ length: doors }, (_, i) => {
        const cx = -w / 2 + dw * i + dw / 2;
        return <Circle key={`h${i}`} x={cx} y={0} radius={Math.min(dw, h) * 0.06} fill={darken(c, 0.25)} />;
      })}
    </>
  );
}

function Commode({ w, h, c }: P) {
  const rows = 3;
  const rh = (h - 4) / rows;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {Array.from({ length: rows - 1 }, (_, i) => (
        <Line key={i} points={[-w / 2 + 2, -h / 2 + 2 + rh * (i + 1), w / 2 - 2, -h / 2 + 2 + rh * (i + 1)]}
          stroke={S} strokeWidth={0.5} />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <Circle key={`h${i}`} x={0} y={-h / 2 + 2 + rh * i + rh / 2} radius={Math.min(w, h) * 0.05} fill={darken(c, 0.2)} />
      ))}
    </>
  );
}

function Coiffeuse({ w, h, c }: P) {
  const mirrorR = Math.min(w * 0.2, h * 0.3);
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Mirror */}
      <Ellipse x={0} y={-h * 0.05} radiusX={mirrorR} radiusY={mirrorR * 0.8}
        fill={lighten(c, 0.4)} stroke='rgba(56,189,248,0.3)' strokeWidth={0.8} />
      {/* Drawer line */}
      <Line points={[-w / 2 + 2, h * 0.2, w / 2 - 2, h * 0.2]} stroke={S} strokeWidth={0.5} />
    </>
  );
}

// ══════════════════════════════════════════════════════════
// SALLE A MANGER
// ══════════════════════════════════════════════════════════

function TableRect({ w, h, c }: P) {
  const inset = Math.min(w, h) * 0.08;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={3} />
      <Rect x={-w / 2 + inset} y={-h / 2 + inset} width={w - inset * 2} height={h - inset * 2}
        fill={lighten(c, 0.12)} stroke={SL} strokeWidth={0.3} cornerRadius={2} />
    </>
  );
}

function TableRonde({ w, h, c }: P) {
  const r = Math.min(w, h) / 2;
  return (
    <>
      <Circle x={0} y={0} radius={r} fill={c} stroke={S} strokeWidth={0.5} />
      <Circle x={0} y={0} radius={r * 0.7} fill={lighten(c, 0.12)} stroke={SL} strokeWidth={0.3} />
    </>
  );
}

function Chaise({ w, h, c }: P) {
  const backH = h * 0.2;
  return (
    <>
      {/* Seat */}
      <Rect x={-w / 2} y={-h / 2 + backH} width={w} height={h - backH} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Backrest */}
      <Rect x={-w / 2} y={-h / 2} width={w} height={backH} fill={darken(c, 0.12)} stroke={S} strokeWidth={0.5} cornerRadius={[3, 3, 0, 0]} />
    </>
  );
}

function Tabouret({ w, h, c }: P) {
  return (
    <>
      <Circle x={0} y={0} radius={Math.min(w, h) / 2} fill={c} stroke={S} strokeWidth={0.5} />
      <Circle x={0} y={0} radius={Math.min(w, h) / 2 * 0.5} fill={lighten(c, 0.15)} stroke={SL} strokeWidth={0.3} />
    </>
  );
}

function Buffet({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* 2 doors */}
      <Line points={[0, -h / 2 + 2, 0, h / 2 - 2]} stroke={S} strokeWidth={0.5} />
      <Circle x={-w * 0.06} y={0} radius={Math.min(w, h) * 0.05} fill={darken(c, 0.2)} />
      <Circle x={w * 0.06} y={0} radius={Math.min(w, h) * 0.05} fill={darken(c, 0.2)} />
    </>
  );
}

function Vaisselier({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Shelves */}
      <Line points={[-w / 2 + 2, -h * 0.15, w / 2 - 2, -h * 0.15]} stroke={S} strokeWidth={0.5} />
      <Line points={[-w / 2 + 2, h * 0.15, w / 2 - 2, h * 0.15]} stroke={S} strokeWidth={0.5} />
      {/* Door division */}
      <Line points={[0, -h / 2 + 2, 0, h / 2 - 2]} stroke={SL} strokeWidth={0.5} />
    </>
  );
}

// ══════════════════════════════════════════════════════════
// BUREAU
// ══════════════════════════════════════════════════════════

function Bureau({ w, h, c }: P) {
  const drawerW = w * 0.35;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Drawer section (right side) */}
      <Rect x={w / 2 - drawerW - 2} y={-h / 2 + 2} width={drawerW} height={h - 4}
        fill={darken(c, 0.05)} stroke={S} strokeWidth={0.3} cornerRadius={1} />
      <Line points={[w / 2 - drawerW - 2, 0, w / 2 - 2, 0]} stroke={S} strokeWidth={0.3} />
      {/* Handles */}
      <Circle x={w / 2 - drawerW / 2 - 2} y={-h * 0.15} radius={2} fill={darken(c, 0.25)} />
      <Circle x={w / 2 - drawerW / 2 - 2} y={h * 0.15} radius={2} fill={darken(c, 0.25)} />
    </>
  );
}

function BureauAngle({ w, h, c }: P) {
  const d = Math.min(w, h) * 0.45;
  return (
    <>
      {/* L-shape desk */}
      <Line points={[
        -w / 2, -h / 2, w / 2, -h / 2, w / 2, -h / 2 + d,
        -w / 2 + d, -h / 2 + d, -w / 2 + d, h / 2,
        -w / 2, h / 2,
      ]} closed fill={c} stroke={S} strokeWidth={0.5} />
      {/* Edge line */}
      <Line points={[
        -w / 2 + 3, -h / 2 + 3, w / 2 - 3, -h / 2 + 3, w / 2 - 3, -h / 2 + d - 3,
        -w / 2 + d - 3, -h / 2 + d - 3, -w / 2 + d - 3, h / 2 - 3, -w / 2 + 3, h / 2 - 3,
      ]} closed stroke={SL} strokeWidth={0.5} fill="transparent" />
    </>
  );
}

function ChaiseBureau({ w, h, c }: P) {
  const r = Math.min(w, h) / 2;
  return (
    <>
      {/* Seat */}
      <Circle x={0} y={h * 0.05} radius={r * 0.75} fill={c} stroke={S} strokeWidth={0.5} />
      {/* Backrest arc */}
      <Arc x={0} y={-h * 0.05} innerRadius={r * 0.85} outerRadius={r}
        angle={140} rotation={-70} fill={darken(c, 0.1)} stroke={S} strokeWidth={0.5} />
    </>
  );
}

function Etagere({ w, h, c }: P) {
  const rows = Math.max(2, Math.round(h / (w * 0.3)));
  const rh = h / rows;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={1} />
      {Array.from({ length: rows - 1 }, (_, i) => (
        <Line key={i} points={[-w / 2 + 1, -h / 2 + rh * (i + 1), w / 2 - 1, -h / 2 + rh * (i + 1)]}
          stroke={S} strokeWidth={0.5} />
      ))}
    </>
  );
}

function Classeur({ w, h, c }: P) {
  const rows = 3;
  const pad = 2;
  const rh = (h - pad * 2) / rows;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={1} />
      {Array.from({ length: rows }, (_, i) => (
        <React.Fragment key={i}>
          <Rect x={-w / 2 + pad} y={-h / 2 + pad + rh * i} width={w - pad * 2} height={rh - 1}
            fill={lighten(c, 0.1)} stroke={S} strokeWidth={0.3} cornerRadius={1} />
          <Rect x={-w * 0.1} y={-h / 2 + pad + rh * i + rh * 0.3} width={w * 0.2} height={rh * 0.15}
            fill={darken(c, 0.25)} cornerRadius={1} />
        </React.Fragment>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════
// DIVERS
// ══════════════════════════════════════════════════════════

function Tapis({ w, h, c }: P) {
  const b = Math.min(w, h) * 0.08;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.3} cornerRadius={2} />
      {/* Inner border pattern */}
      <Rect x={-w / 2 + b} y={-h / 2 + b} width={w - b * 2} height={h - b * 2}
        fill="transparent" stroke={darken(c, 0.12)} strokeWidth={0.8} cornerRadius={1} />
      {/* Inner zone */}
      <Rect x={-w / 2 + b * 2} y={-h / 2 + b * 2} width={w - b * 4} height={h - b * 4}
        fill={lighten(c, 0.15)} stroke="transparent" cornerRadius={1} />
    </>
  );
}

function PorteManteaux({ w, h, c }: P) {
  const r = Math.min(w, h) / 2;
  return (
    <>
      <Circle x={0} y={0} radius={r} fill={c} stroke={S} strokeWidth={0.5} />
      {/* Center pole */}
      <Circle x={0} y={0} radius={r * 0.2} fill={darken(c, 0.15)} />
      {/* Hooks */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return <Circle key={deg} x={Math.cos(rad) * r * 0.6} y={Math.sin(rad) * r * 0.6}
          radius={r * 0.12} fill={darken(c, 0.2)} />;
      })}
    </>
  );
}

function MeubleChaussures({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Tilted shelf lines */}
      <Line points={[-w / 2 + 2, -h * 0.1, w / 2 - 2, -h * 0.15]} stroke={S} strokeWidth={0.5} />
      <Line points={[-w / 2 + 2, h * 0.2, w / 2 - 2, h * 0.15]} stroke={S} strokeWidth={0.5} />
    </>
  );
}

// ══════════════════════════════════════════════════════════
// CUISINE (fixed)
// ══════════════════════════════════════════════════════════

function Evier({ w, h, c }: P) {
  const basinW = w * 0.35;
  const basinH = h * 0.55;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Left basin */}
      <Rect x={-w / 2 + w * 0.08} y={-basinH / 2} width={basinW} height={basinH}
        fill={darken(c, 0.1)} stroke={S} strokeWidth={0.5} cornerRadius={3} />
      {/* Right basin */}
      <Rect x={w / 2 - w * 0.08 - basinW} y={-basinH / 2} width={basinW} height={basinH}
        fill={darken(c, 0.1)} stroke={S} strokeWidth={0.5} cornerRadius={3} />
      {/* Faucet dot */}
      <Circle x={0} y={-h * 0.15} radius={Math.min(w, h) * 0.06} fill={darken(c, 0.25)} />
    </>
  );
}

function PlanTravail({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={1} />
      {/* Surface grain lines */}
      <Line points={[-w * 0.3, -h / 2 + 2, -w * 0.3, h / 2 - 2]} stroke={SL} strokeWidth={0.3} />
      <Line points={[0, -h / 2 + 2, 0, h / 2 - 2]} stroke={SL} strokeWidth={0.3} />
      <Line points={[w * 0.3, -h / 2 + 2, w * 0.3, h / 2 - 2]} stroke={SL} strokeWidth={0.3} />
    </>
  );
}

function Ilot({ w, h, c }: P) {
  const inset = Math.min(w, h) * 0.08;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={3} />
      <Rect x={-w / 2 + inset} y={-h / 2 + inset} width={w - inset * 2} height={h - inset * 2}
        fill={lighten(c, 0.15)} stroke={SL} strokeWidth={0.3} cornerRadius={2} />
    </>
  );
}

function Frigo({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Door line */}
      <Line points={[-w / 2 + 2, -h * 0.1, w / 2 - 2, -h * 0.1]} stroke={S} strokeWidth={0.5} />
      {/* Handle */}
      <Rect x={w / 2 - w * 0.2} y={-h * 0.3} width={w * 0.05} height={h * 0.15}
        fill={darken(c, 0.2)} cornerRadius={1} />
      <Rect x={w / 2 - w * 0.2} y={h * 0.05} width={w * 0.05} height={h * 0.15}
        fill={darken(c, 0.2)} cornerRadius={1} />
    </>
  );
}

function Four({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Window */}
      <Rect x={-w * 0.3} y={-h * 0.15} width={w * 0.6} height={h * 0.45}
        fill={lighten(c, 0.3)} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Handle bar */}
      <Line points={[-w * 0.25, -h * 0.32, w * 0.25, -h * 0.32]} stroke={darken(c, 0.2)} strokeWidth={1.5} lineCap="round" />
      {/* Knobs */}
      {[-0.25, -0.08, 0.08, 0.25].map((f, i) => (
        <Circle key={i} x={w * f} y={h * 0.38} radius={Math.min(w, h) * 0.04} fill={darken(c, 0.15)} />
      ))}
    </>
  );
}

function LaveVaisselle({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Front panel line */}
      <Line points={[-w / 2 + 2, -h * 0.25, w / 2 - 2, -h * 0.25]} stroke={S} strokeWidth={0.5} />
      {/* Handle */}
      <Line points={[-w * 0.2, -h * 0.32, w * 0.2, -h * 0.32]} stroke={darken(c, 0.2)} strokeWidth={1.2} lineCap="round" />
    </>
  );
}

function MicroOndes({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Window */}
      <Rect x={-w * 0.4} y={-h * 0.3} width={w * 0.55} height={h * 0.6}
        fill={lighten(c, 0.25)} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Control panel (right side) */}
      <Circle x={w * 0.3} y={0} radius={Math.min(w, h) * 0.1} fill={darken(c, 0.1)} stroke={S} strokeWidth={0.3} />
    </>
  );
}

function Hotte({ w, h, c }: P) {
  return (
    <>
      {/* Trapezoid shape */}
      <Line points={[
        -w * 0.3, -h / 2, w * 0.3, -h / 2,
        w / 2, h / 2, -w / 2, h / 2,
      ]} closed fill={c} stroke={S} strokeWidth={0.5} />
      {/* Vent lines */}
      <Line points={[-w * 0.25, h * 0.1, w * 0.25, h * 0.1]} stroke={S} strokeWidth={0.3} />
      <Line points={[-w * 0.3, h * 0.25, w * 0.3, h * 0.25]} stroke={S} strokeWidth={0.3} />
    </>
  );
}

function Congelateur({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Handle */}
      <Rect x={w / 2 - w * 0.2} y={-h * 0.15} width={w * 0.05} height={h * 0.3}
        fill={darken(c, 0.2)} cornerRadius={1} />
      {/* Ice crystal */}
      <Text x={-w * 0.15} y={-h * 0.08} text="*" fontSize={Math.min(w, h) * 0.3}
        fill={darken(c, 0.12)} fontFamily="Inter" listening={false} />
    </>
  );
}

// ══════════════════════════════════════════════════════════
// SALLE DE BAIN (fixed)
// ══════════════════════════════════════════════════════════

function Baignoire({ w, h, c }: P) {
  const inset = Math.min(w, h) * 0.1;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={6} />
      {/* Inner basin */}
      <Rect x={-w / 2 + inset} y={-h / 2 + inset} width={w - inset * 2} height={h - inset * 2}
        fill={lighten(c, 0.3)} stroke={SL} strokeWidth={0.5} cornerRadius={4} />
      {/* Drain */}
      <Circle x={w * 0.3} y={0} radius={Math.min(w, h) * 0.05} fill={darken(c, 0.15)} />
      {/* Faucet */}
      <Circle x={-w * 0.35} y={0} radius={Math.min(w, h) * 0.07} fill={darken(c, 0.2)} />
    </>
  );
}

function Douche({ w, h, c }: P) {
  const pad = Math.min(w, h) * 0.06;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Shower tray */}
      <Rect x={-w / 2 + pad} y={-h / 2 + pad} width={w - pad * 2} height={h - pad * 2}
        fill={lighten(c, 0.2)} stroke={SL} strokeWidth={0.5} cornerRadius={2} />
      {/* Grid pattern (shower floor) */}
      <Line points={[0, -h / 2 + pad, 0, h / 2 - pad]} stroke={SL} strokeWidth={0.3} />
      <Line points={[-w / 2 + pad, 0, w / 2 - pad, 0]} stroke={SL} strokeWidth={0.3} />
      {/* Drain */}
      <Circle x={0} y={0} radius={Math.min(w, h) * 0.06} fill={darken(c, 0.12)} />
      {/* Shower head */}
      <Circle x={-w * 0.3} y={-h * 0.3} radius={Math.min(w, h) * 0.08} fill={darken(c, 0.08)} stroke={S} strokeWidth={0.3} />
    </>
  );
}

function Lavabo({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Basin */}
      <Ellipse x={0} y={h * 0.05} radiusX={w * 0.3} radiusY={h * 0.3}
        fill={lighten(c, 0.3)} stroke={S} strokeWidth={0.5} />
      {/* Faucet */}
      <Circle x={0} y={-h * 0.25} radius={Math.min(w, h) * 0.07} fill={darken(c, 0.2)} />
    </>
  );
}

function DoubleVasque({ w, h, c }: P) {
  const bw = w * 0.22;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Left basin */}
      <Ellipse x={-w * 0.22} y={h * 0.05} radiusX={bw} radiusY={h * 0.28}
        fill={lighten(c, 0.3)} stroke={S} strokeWidth={0.5} />
      {/* Right basin */}
      <Ellipse x={w * 0.22} y={h * 0.05} radiusX={bw} radiusY={h * 0.28}
        fill={lighten(c, 0.3)} stroke={S} strokeWidth={0.5} />
      {/* Faucets */}
      <Circle x={-w * 0.22} y={-h * 0.25} radius={Math.min(w, h) * 0.06} fill={darken(c, 0.2)} />
      <Circle x={w * 0.22} y={-h * 0.25} radius={Math.min(w, h) * 0.06} fill={darken(c, 0.2)} />
    </>
  );
}

function WC({ w, h, c }: P) {
  return (
    <>
      {/* Tank */}
      <Rect x={-w * 0.35} y={-h / 2} width={w * 0.7} height={h * 0.25}
        fill={darken(c, 0.05)} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Bowl */}
      <Ellipse x={0} y={h * 0.1} radiusX={w * 0.4} radiusY={h * 0.35}
        fill={c} stroke={S} strokeWidth={0.5} />
      {/* Seat opening */}
      <Ellipse x={0} y={h * 0.12} radiusX={w * 0.25} radiusY={h * 0.22}
        fill={lighten(c, 0.25)} stroke={SL} strokeWidth={0.5} />
    </>
  );
}

function LaveLinge({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {/* Control strip */}
      <Rect x={-w / 2 + 2} y={-h / 2 + 2} width={w - 4} height={h * 0.15}
        fill={darken(c, 0.05)} stroke={SL} strokeWidth={0.3} />
      {/* Door circle */}
      <Circle x={0} y={h * 0.08} radius={Math.min(w, h) * 0.28}
        fill={lighten(c, 0.15)} stroke={S} strokeWidth={0.5} />
      <Circle x={0} y={h * 0.08} radius={Math.min(w, h) * 0.18}
        fill={lighten(c, 0.25)} stroke={SL} strokeWidth={0.3} />
    </>
  );
}

function SecheServiettes({ w, h, c }: P) {
  const bars = Math.max(2, Math.round(w / (h * 1.5)));
  const gap = w / (bars + 1);
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={1} />
      {/* Horizontal bars */}
      {Array.from({ length: bars }, (_, i) => (
        <Line key={i} points={[-w / 2 + gap * (i + 1), -h / 2 + 2, -w / 2 + gap * (i + 1), h / 2 - 2]}
          stroke={darken(c, 0.15)} strokeWidth={1.2} lineCap="round" />
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════
// INSTALLATIONS (fixed)
// ══════════════════════════════════════════════════════════

function Radiateur({ w, h, c }: P) {
  const fins = Math.max(3, Math.round(w / (h * 0.8)));
  const gap = w / (fins + 1);
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={1} />
      {Array.from({ length: fins }, (_, i) => (
        <Line key={i} points={[-w / 2 + gap * (i + 1), -h / 2 + 1, -w / 2 + gap * (i + 1), h / 2 - 1]}
          stroke={darken(c, 0.12)} strokeWidth={0.8} />
      ))}
    </>
  );
}

function PriseCourant({ w, h, c }: P) {
  const r = Math.min(w, h) / 2;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={1} />
      {/* Two pin holes */}
      <Circle x={-r * 0.3} y={0} radius={r * 0.15} fill={darken(c, 0.3)} />
      <Circle x={r * 0.3} y={0} radius={r * 0.15} fill={darken(c, 0.3)} />
    </>
  );
}

function Interrupteur({ w, h, c }: P) {
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={1} />
      {/* Toggle */}
      <Rect x={-w * 0.15} y={-h * 0.25} width={w * 0.3} height={h * 0.5}
        fill={darken(c, 0.15)} cornerRadius={2} />
    </>
  );
}

function TableauElectrique({ w, h, c }: P) {
  const cols = 3;
  const rows = 2;
  const cw = (w - 4) / cols;
  const rh = (h - 4) / rows;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={2} />
      {Array.from({ length: cols * rows }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return <Rect key={i}
          x={-w / 2 + 2 + col * cw + 1} y={-h / 2 + 2 + row * rh + 1}
          width={cw - 2} height={rh - 2}
          fill={darken(c, 0.08)} stroke={SL} strokeWidth={0.3} cornerRadius={1} />;
      })}
    </>
  );
}

function Cheminee({ w, h, c }: P) {
  return (
    <>
      {/* Mantle (U shape) */}
      <Line points={[
        -w / 2, -h / 2, w / 2, -h / 2, w / 2, h / 2, w / 2 - w * 0.15, h / 2,
        w / 2 - w * 0.15, -h / 2 + h * 0.25, -w / 2 + w * 0.15, -h / 2 + h * 0.25,
        -w / 2 + w * 0.15, h / 2, -w / 2, h / 2,
      ]} closed fill={c} stroke={S} strokeWidth={0.5} />
      {/* Fire opening */}
      <Rect x={-w * 0.3} y={-h * 0.2} width={w * 0.6} height={h * 0.55}
        fill={darken(c, 0.15)} stroke={S} strokeWidth={0.3} cornerRadius={[4, 4, 0, 0]} />
    </>
  );
}

function Poele({ w, h, c }: P) {
  const r = Math.min(w, h) * 0.4;
  return (
    <>
      <Circle x={0} y={0} radius={r} fill={c} stroke={S} strokeWidth={0.5} />
      {/* Inner glow */}
      <Circle x={0} y={0} radius={r * 0.6} fill={darken(c, 0.1)} stroke={SL} strokeWidth={0.3} />
      {/* Chimney pipe */}
      <Rect x={-w * 0.05} y={-h / 2} width={w * 0.1} height={h / 2 - r}
        fill={darken(c, 0.15)} stroke={S} strokeWidth={0.3} />
    </>
  );
}

function Cumulus({ w, h, c }: P) {
  const r = Math.min(w, h) * 0.4;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={r} />
      {/* Temperature indicator */}
      <Circle x={0} y={0} radius={r * 0.3} fill={darken(c, 0.08)} stroke={S} strokeWidth={0.3} />
      {/* Pipes */}
      <Circle x={-w * 0.2} y={-h * 0.35} radius={Math.min(w, h) * 0.05} fill={darken(c, 0.2)} />
      <Circle x={w * 0.2} y={-h * 0.35} radius={Math.min(w, h) * 0.05} fill='#F87171' />
    </>
  );
}

function Climatiseur({ w, h, c }: P) {
  const vents = Math.max(3, Math.round(w / (h * 1.2)));
  const gap = (w - 4) / vents;
  return (
    <>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} fill={c} stroke={S} strokeWidth={0.5} cornerRadius={3} />
      {/* Vent slats */}
      {Array.from({ length: vents }, (_, i) => (
        <Line key={i} points={[-w / 2 + 2 + gap * (i + 0.5), -h * 0.2, -w / 2 + 2 + gap * (i + 0.5), h * 0.25]}
          stroke={darken(c, 0.12)} strokeWidth={0.8} />
      ))}
      {/* LED indicator */}
      <Circle x={w * 0.38} y={-h * 0.2} radius={Math.min(w, h) * 0.06} fill="#4ADE80" />
    </>
  );
}

// ══════════════════════════════════════════════════════════
// DISPATCH
// ══════════════════════════════════════════════════════════

const symbolMap: Record<string, (p: P) => React.JSX.Element> = {
  // Salon
  canape3: (p) => <Canape {...p} />,
  canape2: (p) => <Canape {...p} />,
  canapeangle: (p) => <CanapeAngle {...p} />,
  fauteuil: (p) => <Fauteuil {...p} />,
  pouf: (p) => <Pouf {...p} />,
  tablebasse: (p) => <TableBasse {...p} />,
  meubletv: (p) => <MeubleTV {...p} />,
  biblio: (p) => <Biblio {...p} />,
  console: (p) => <Console {...p} />,
  // Chambre
  litdouble: (p) => <Lit {...p} />,
  litsimple: (p) => <Lit {...p} />,
  lit140: (p) => <Lit {...p} />,
  chevet: (p) => <Chevet {...p} />,
  armoire: (p) => <Armoire {...p} doors={3} />,
  armoire2p: (p) => <Armoire {...p} doors={2} />,
  commode: (p) => <Commode {...p} />,
  coiffeuse: (p) => <Coiffeuse {...p} />,
  // Salle à manger
  table6: (p) => <TableRect {...p} />,
  table4: (p) => <TableRect {...p} />,
  tableronde: (p) => <TableRonde {...p} />,
  chaise: (p) => <Chaise {...p} />,
  tabouret: (p) => <Tabouret {...p} />,
  buffet: (p) => <Buffet {...p} />,
  vaisselier: (p) => <Vaisselier {...p} />,
  // Bureau
  bureau: (p) => <Bureau {...p} />,
  bureauangle: (p) => <BureauAngle {...p} />,
  chaisebureau: (p) => <ChaiseBureau {...p} />,
  etagere: (p) => <Etagere {...p} />,
  classeur: (p) => <Classeur {...p} />,
  // Divers
  canapelit: (p) => <Canape {...p} />,
  tapis: (p) => <Tapis {...p} />,
  porte_manteaux: (p) => <PorteManteaux {...p} />,
  meuble_chaussures: (p) => <MeubleChaussures {...p} />,
  // Cuisine
  evier: (p) => <Evier {...p} />,
  plantravail: (p) => <PlanTravail {...p} />,
  ilot: (p) => <Ilot {...p} />,
  frigo: (p) => <Frigo {...p} />,
  four: (p) => <Four {...p} />,
  lavevaisselle: (p) => <LaveVaisselle {...p} />,
  microondes: (p) => <MicroOndes {...p} />,
  hotte: (p) => <Hotte {...p} />,
  congelateur: (p) => <Congelateur {...p} />,
  // Salle de bain
  baignoire: (p) => <Baignoire {...p} />,
  douche: (p) => <Douche {...p} />,
  doucheitalienne: (p) => <Douche {...p} />,
  lavabo: (p) => <Lavabo {...p} />,
  doublevasque: (p) => <DoubleVasque {...p} />,
  wc: (p) => <WC {...p} />,
  lavelinge: (p) => <LaveLinge {...p} />,
  sechelinge: (p) => <LaveLinge {...p} />,
  secheserviettes: (p) => <SecheServiettes {...p} />,
  // Installations
  radiateur: (p) => <Radiateur {...p} />,
  radiateurpetit: (p) => <Radiateur {...p} />,
  prisecourant: (p) => <PriseCourant {...p} />,
  interrupteur: (p) => <Interrupteur {...p} />,
  tableauelectrique: (p) => <TableauElectrique {...p} />,
  cheminee: (p) => <Cheminee {...p} />,
  poele: (p) => <Poele {...p} />,
  cumulus: (p) => <Cumulus {...p} />,
  climatiseur: (p) => <Climatiseur {...p} />,
};

export function renderDetailedSymbol(catalogueId: string, w: number, h: number): React.JSX.Element | null {
  const render = symbolMap[catalogueId];
  if (!render) return null;
  const c = getPastelColor(catalogueId);
  return render({ w, h, c });
}
