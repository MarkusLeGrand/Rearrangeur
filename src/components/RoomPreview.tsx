import React, { useState, useEffect } from 'react';

// ── SVG furniture symbols (architectural style) ──

function SvgLit({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const c = '#A8D8EA';
  const pw = (w - 12) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={c} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      <rect x={x} y={y} width={w} height={h * 0.06} rx={2} fill="#7BB8CC" />
      <rect x={x + 4} y={y + h * 0.08} width={pw} height={h * 0.16} rx={4} fill="#D4ECF4" stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      <rect x={x + 8 + pw} y={y + h * 0.08} width={pw} height={h * 0.16} rx={4} fill="#D4ECF4" stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      <line x1={x + 3} y1={y + h * 0.42} x2={x + w - 3} y2={y + h * 0.42} stroke="#7BB8CC" strokeWidth={0.8} strokeDasharray="4 3" />
    </g>
  );
}

function SvgCanape({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const c = '#F4A261';
  const back = h * 0.2;
  const arm = w * 0.08;
  return (
    <g>
      <rect x={x} y={y} width={w} height={back} rx={3} fill="#E8975A" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <rect x={x + arm} y={y + back} width={w - arm * 2} height={h - back} fill={c} stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <rect x={x} y={y + back} width={arm} height={h - back} rx={0} fill="#E8975A" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <rect x={x + w - arm} y={y + back} width={arm} height={h - back} fill="#E8975A" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <line x1={x + w / 2} y1={y + back} x2={x + w / 2} y2={y + h} stroke="rgba(0,0,0,0.08)" strokeWidth={0.5} />
    </g>
  );
}

function SvgTable({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const c = '#DEB887';
  const inset = Math.min(w, h) * 0.1;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={c} stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      <rect x={x + inset} y={y + inset} width={w - inset * 2} height={h - inset * 2} rx={2} fill="#E8D5B0" stroke="rgba(0,0,0,0.06)" strokeWidth={0.3} />
    </g>
  );
}

function SvgChaise({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h * 0.2} rx={2} fill="#B8B8B0" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <rect x={x} y={y + h * 0.2} width={w} height={h * 0.8} rx={2} fill="#C8C8C0" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
    </g>
  );
}

function SvgArmoire({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill="#D4A5A5" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      <line x1={x + w / 2} y1={y + 2} x2={x + w / 2} y2={y + h - 2} stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <circle cx={x + w / 2 - 4} cy={y + h / 2} r={1.5} fill="rgba(0,0,0,0.2)" />
      <circle cx={x + w / 2 + 4} cy={y + h / 2} r={1.5} fill="rgba(0,0,0,0.2)" />
    </g>
  );
}

function SvgBureau({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const dw = w * 0.35;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill="#B5C99A" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      <rect x={x + w - dw - 2} y={y + 2} width={dw} height={h - 4} rx={1} fill="#A5B98A" stroke="rgba(0,0,0,0.08)" strokeWidth={0.3} />
      <line x1={x + w - dw - 2} y1={y + h / 2} x2={x + w - 2} y2={y + h / 2} stroke="rgba(0,0,0,0.08)" strokeWidth={0.3} />
    </g>
  );
}

function SvgTV({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill="#C9B1FF" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      <line x1={x + 2} y1={y + h * 0.15} x2={x + w - 2} y2={y + h * 0.15} stroke="rgba(0,0,0,0.08)" strokeWidth={0.5} />
      <line x1={x + w * 0.35} y1={y + h * 0.15} x2={x + w * 0.35} y2={y + h - 1} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      <line x1={x + w * 0.65} y1={y + h * 0.15} x2={x + w * 0.65} y2={y + h - 1} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
    </g>
  );
}

function SvgCuisine({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1} fill="#95C8C8" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      <line x1={x + w * 0.3} y1={y + 2} x2={x + w * 0.3} y2={y + h - 2} stroke="rgba(0,0,0,0.06)" strokeWidth={0.3} />
      <line x1={x + w * 0.6} y1={y + 2} x2={x + w * 0.6} y2={y + h - 2} stroke="rgba(0,0,0,0.06)" strokeWidth={0.3} />
    </g>
  );
}

function SvgFrigo({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill="#E0E0D8" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      <line x1={x + 2} y1={y + h * 0.35} x2={x + w - 2} y2={y + h * 0.35} stroke="rgba(0,0,0,0.08)" strokeWidth={0.5} />
      <rect x={x + w - 6} y={y + h * 0.15} width={2} height={h * 0.12} rx={1} fill="rgba(0,0,0,0.15)" />
      <rect x={x + w - 6} y={y + h * 0.5} width={2} height={h * 0.12} rx={1} fill="rgba(0,0,0,0.15)" />
    </g>
  );
}

function SvgFauteuil({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const back = h * 0.22;
  const arm = w * 0.15;
  return (
    <g>
      <rect x={x} y={y} width={w} height={back} rx={4} fill="#E8975A" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <rect x={x + arm} y={y + back} width={w - arm * 2} height={h - back} rx={2} fill="#F4A261" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <rect x={x} y={y + back} width={arm} height={h - back} rx={4} fill="#E8975A" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <rect x={x + w - arm} y={y + back} width={arm} height={h - back} rx={4} fill="#E8975A" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
    </g>
  );
}

function SvgCommode({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const rh = (h - 4) / 3;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill="#B8D4E3" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      {[0, 1].map(i => (
        <line key={i} x1={x + 2} y1={y + 2 + rh * (i + 1)} x2={x + w - 2} y2={y + 2 + rh * (i + 1)} stroke="rgba(0,0,0,0.08)" strokeWidth={0.5} />
      ))}
      {[0, 1, 2].map(i => (
        <circle key={i} cx={x + w / 2} cy={y + 2 + rh * i + rh / 2} r={1.5} fill="rgba(0,0,0,0.15)" />
      ))}
    </g>
  );
}

function SvgBiblio({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1} fill="#FFB4B4" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      <line x1={x + 1} y1={y + h / 2} x2={x + w - 1} y2={y + h / 2} stroke="rgba(0,0,0,0.08)" strokeWidth={0.5} />
      <line x1={x + w / 3} y1={y + 1} x2={x + w / 3} y2={y + h - 1} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      <line x1={x + w * 2 / 3} y1={y + 1} x2={x + w * 2 / 3} y2={y + h - 1} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
    </g>
  );
}

function SvgBaignoire({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const ins = 5;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#A8D8EA" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      <rect x={x + ins} y={y + ins} width={w - ins * 2} height={h - ins * 2} rx={4} fill="#D4ECF4" stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      <circle cx={x + w * 0.75} cy={y + h / 2} r={2.5} fill="rgba(0,0,0,0.1)" />
      <circle cx={x + w * 0.15} cy={y + h / 2} r={3.5} fill="rgba(0,0,0,0.12)" />
    </g>
  );
}

function SvgLavabo({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill="#95C8C8" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      <ellipse cx={x + w / 2} cy={y + h * 0.55} rx={w * 0.3} ry={h * 0.28} fill="#C8E4E4" stroke="rgba(0,0,0,0.08)" strokeWidth={0.5} />
      <circle cx={x + w / 2} cy={y + h * 0.2} r={2.5} fill="rgba(0,0,0,0.15)" />
    </g>
  );
}

function SvgWC({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x + w * 0.15} y={y} width={w * 0.7} height={h * 0.25} rx={2} fill="#C8D4DE" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <ellipse cx={x + w / 2} cy={y + h * 0.6} rx={w * 0.4} ry={h * 0.35} fill="#D0D8E0" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      <ellipse cx={x + w / 2} cy={y + h * 0.62} rx={w * 0.25} ry={h * 0.2} fill="#E0E8F0" stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
    </g>
  );
}

// ── Dispatch ──
const RENDERERS: Record<string, (p: { x: number; y: number; w: number; h: number }) => React.JSX.Element> = {
  lit: (p) => <SvgLit {...p} />,
  canape: (p) => <SvgCanape {...p} />,
  table: (p) => <SvgTable {...p} />,
  chaise: (p) => <SvgChaise {...p} />,
  armoire: (p) => <SvgArmoire {...p} />,
  bureau: (p) => <SvgBureau {...p} />,
  tv: (p) => <SvgTV {...p} />,
  cuisine: (p) => <SvgCuisine {...p} />,
  frigo: (p) => <SvgFrigo {...p} />,
  fauteuil: (p) => <SvgFauteuil {...p} />,
  commode: (p) => <SvgCommode {...p} />,
  biblio: (p) => <SvgBiblio {...p} />,
  baignoire: (p) => <SvgBaignoire {...p} />,
  lavabo: (p) => <SvgLavabo {...p} />,
  wc: (p) => <SvgWC {...p} />,
  etagere: (p) => <SvgBiblio {...p} />,
  penderie: (p) => <SvgArmoire {...p} />,
  meuble: (p) => <SvgCommode {...p} />,
};

interface Furniture {
  x: number; y: number; w: number; h: number;
  type: string;
}

interface Room {
  walls: string;
  innerWalls?: { x1: number; y1: number; x2: number; y2: number }[];
  furniture: Furniture[];
}

const rooms: Room[] = [
  // 1 — Studio
  {
    walls: '130,70 370,70 370,310 130,310',
    furniture: [
      { x: 140, y: 80, w: 100, h: 160, type: 'lit' },
      { x: 260, y: 80, w: 100, h: 50, type: 'bureau' },
      { x: 260, y: 245, w: 100, h: 55, type: 'armoire' },
    ],
  },
  // 2 — Grand salon
  {
    walls: '15,80 485,80 485,300 15,300',
    furniture: [
      { x: 25, y: 90, w: 200, h: 70, type: 'canape' },
      { x: 80, y: 170, w: 100, h: 50, type: 'table' },
      { x: 25, y: 240, w: 130, h: 48, type: 'tv' },
      { x: 320, y: 95, w: 100, h: 80, type: 'table' },
      { x: 335, y: 183, w: 28, h: 28, type: 'chaise' },
      { x: 387, y: 183, w: 28, h: 28, type: 'chaise' },
      { x: 440, y: 95, w: 35, h: 190, type: 'biblio' },
    ],
  },
  // 3 — Piece en L
  {
    walls: '40,30 280,30 280,150 460,150 460,350 40,350',
    furniture: [
      { x: 50, y: 40, w: 140, h: 40, type: 'tv' },
      { x: 50, y: 260, w: 180, h: 70, type: 'canape' },
      { x: 85, y: 185, w: 105, h: 55, type: 'table' },
      { x: 412, y: 162, w: 38, h: 170, type: 'biblio' },
      { x: 300, y: 270, w: 65, h: 65, type: 'fauteuil' },
    ],
  },
  // 4 — Chambre + bureau
  {
    walls: '30,100 470,100 470,270 30,270',
    furniture: [
      { x: 40, y: 112, w: 90, h: 145, type: 'lit' },
      { x: 155, y: 112, w: 80, h: 42, type: 'bureau' },
      { x: 155, y: 215, w: 80, h: 42, type: 'commode' },
      { x: 340, y: 115, w: 120, h: 60, type: 'canape' },
      { x: 370, y: 195, w: 70, h: 55, type: 'table' },
    ],
  },
  // 5 — L inversee avec cuisine
  {
    walls: '40,30 460,30 460,200 300,200 300,350 40,350',
    furniture: [
      { x: 310, y: 42, w: 138, h: 145, type: 'lit' },
      { x: 55, y: 42, w: 150, h: 42, type: 'cuisine' },
      { x: 55, y: 260, w: 150, h: 70, type: 'canape' },
      { x: 55, y: 180, w: 90, h: 60, type: 'table' },
      { x: 210, y: 42, w: 50, h: 50, type: 'frigo' },
    ],
  },
  // 6 — Grande piece
  {
    walls: '60,20 440,20 440,360 60,360',
    furniture: [
      { x: 70, y: 260, w: 200, h: 80, type: 'canape' },
      { x: 110, y: 180, w: 115, h: 60, type: 'table' },
      { x: 70, y: 30, w: 170, h: 42, type: 'tv' },
      { x: 310, y: 35, w: 115, h: 90, type: 'table' },
      { x: 325, y: 133, w: 28, h: 28, type: 'chaise' },
      { x: 392, y: 133, w: 28, h: 28, type: 'chaise' },
      { x: 300, y: 225, w: 65, h: 65, type: 'fauteuil' },
    ],
  },
  // 7 — T avec cuisine
  {
    walls: '120,25 380,25 380,130 465,130 465,350 35,350 35,130 120,130',
    furniture: [
      { x: 130, y: 37, w: 115, h: 82, type: 'lit' },
      { x: 265, y: 37, w: 105, h: 50, type: 'bureau' },
      { x: 50, y: 145, w: 160, h: 65, type: 'canape' },
      { x: 70, y: 230, w: 100, h: 60, type: 'table' },
      { x: 395, y: 145, w: 55, h: 55, type: 'frigo' },
      { x: 260, y: 145, w: 120, h: 42, type: 'cuisine' },
    ],
  },
  // 8 — Salle de bain
  {
    walls: '120,80 380,80 380,300 120,300',
    furniture: [
      { x: 130, y: 90, w: 150, h: 60, type: 'baignoire' },
      { x: 305, y: 90, w: 65, h: 50, type: 'lavabo' },
      { x: 305, y: 238, w: 45, h: 50, type: 'wc' },
      { x: 130, y: 245, w: 100, h: 42, type: 'commode' },
    ],
  },
  // 9 — Studio avec cloison
  {
    walls: '25,50 475,50 475,330 25,330',
    innerWalls: [{ x1: 280, y1: 50, x2: 280, y2: 230 }],
    furniture: [
      { x: 300, y: 62, w: 150, h: 180, type: 'lit' },
      { x: 37, y: 250, w: 160, h: 65, type: 'canape' },
      { x: 80, y: 155, w: 80, h: 75, type: 'table' },
      { x: 37, y: 62, w: 225, h: 44, type: 'cuisine' },
    ],
  },
  // 10 — Piece etroite
  {
    walls: '150,10 350,10 350,370 150,370',
    furniture: [
      { x: 160, y: 22, w: 130, h: 50, type: 'armoire' },
      { x: 160, y: 85, w: 90, h: 165, type: 'lit' },
      { x: 265, y: 100, w: 40, h: 45, type: 'table' },
      { x: 160, y: 275, w: 110, h: 55, type: 'bureau' },
    ],
  },
];

export function RoomPreview() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % rooms.length);
        setVisible(true);
      }, 200);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const room = rooms[index];

  return (
    <svg
      viewBox="0 0 500 380"
      className="room-preview"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Floor */}
      <polygon
        points={room.walls}
        fill="#FAFAF8"
        stroke="#1A1A1A"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Inner walls */}
      {room.innerWalls?.map((w, i) => (
        <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
          stroke="#1A1A1A" strokeWidth="3" />
      ))}

      {/* Furniture — detailed SVG symbols */}
      {room.furniture.map((f, i) => {
        const renderer = RENDERERS[f.type];
        return <g key={i}>{renderer ? renderer(f) : (
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={3}
            fill="#D0D0D0" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
        )}</g>;
      })}
    </svg>
  );
}
