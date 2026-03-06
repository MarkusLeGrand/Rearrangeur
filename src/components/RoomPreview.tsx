import { useState, useEffect } from 'react';

interface Furniture {
  x: number; y: number; w: number; h: number;
  label: string; color: string;
}

interface Room {
  walls: string;
  innerWalls?: { x1: number; y1: number; x2: number; y2: number }[];
  furniture: Furniture[];
}

const C = {
  lit: '#A8D8EA',
  canape: '#F4A261',
  table: '#DEB887',
  chaise: '#C8C8C0',
  armoire: '#D4A5A5',
  bureau: '#B5C99A',
  cuisine: '#95C8C8',
  tv: '#C9B1FF',
  biblio: '#FFB4B4',
  commode: '#B8D4E3',
  frigo: '#E0E0D8',
  etag: '#D5C9A6',
};

const rooms: Room[] = [
  // 1 — Petit studio carre
  {
    walls: '130,70 370,70 370,310 130,310',
    furniture: [
      { x: 140, y: 80, w: 100, h: 160, label: 'Lit', color: C.lit },
      { x: 260, y: 80, w: 100, h: 50, label: 'Bureau', color: C.bureau },
      { x: 260, y: 245, w: 100, h: 55, label: 'Armoire', color: C.armoire },
    ],
  },
  // 2 — Grand salon tres large
  {
    walls: '15,80 485,80 485,300 15,300',
    furniture: [
      { x: 25, y: 90, w: 200, h: 70, label: 'Canape', color: C.canape },
      { x: 80, y: 170, w: 100, h: 50, label: 'Table basse', color: C.table },
      { x: 25, y: 240, w: 130, h: 48, label: 'Meuble TV', color: C.tv },
      { x: 320, y: 95, w: 100, h: 80, label: 'Table', color: C.table },
      { x: 335, y: 183, w: 28, h: 28, label: '', color: C.chaise },
      { x: 387, y: 183, w: 28, h: 28, label: '', color: C.chaise },
      { x: 440, y: 95, w: 35, h: 190, label: '', color: C.biblio },
    ],
  },
  // 3 — L large a droite
  {
    walls: '40,30 280,30 280,150 460,150 460,350 40,350',
    furniture: [
      { x: 50, y: 40, w: 140, h: 40, label: 'Meuble TV', color: C.tv },
      { x: 50, y: 260, w: 180, h: 70, label: 'Canape', color: C.canape },
      { x: 85, y: 185, w: 105, h: 55, label: 'Table basse', color: C.table },
      { x: 412, y: 162, w: 38, h: 170, label: '', color: C.biblio },
      { x: 300, y: 270, w: 65, h: 65, label: 'Fauteuil', color: C.canape },
    ],
  },
  // 4 — Couloir long et etroit
  {
    walls: '30,100 470,100 470,270 30,270',
    furniture: [
      { x: 40, y: 112, w: 90, h: 145, label: 'Lit', color: C.lit },
      { x: 155, y: 112, w: 80, h: 42, label: 'Bureau', color: C.bureau },
      { x: 155, y: 215, w: 80, h: 42, label: 'Commode', color: C.commode },
      { x: 340, y: 115, w: 120, h: 60, label: 'Canape', color: C.canape },
      { x: 370, y: 195, w: 70, h: 55, label: 'Table', color: C.table },
    ],
  },
  // 5 — Piece en L inversee (haut-droite)
  {
    walls: '40,30 460,30 460,200 300,200 300,350 40,350',
    furniture: [
      { x: 310, y: 42, w: 138, h: 145, label: 'Lit', color: C.lit },
      { x: 55, y: 42, w: 150, h: 42, label: 'Cuisine', color: C.cuisine },
      { x: 55, y: 260, w: 150, h: 70, label: 'Canape', color: C.canape },
      { x: 55, y: 180, w: 90, h: 60, label: 'Table', color: C.table },
      { x: 210, y: 42, w: 50, h: 50, label: 'Frigo', color: C.frigo },
    ],
  },
  // 6 — Grande piece carree
  {
    walls: '60,20 440,20 440,360 60,360',
    furniture: [
      { x: 70, y: 260, w: 200, h: 80, label: 'Canape', color: C.canape },
      { x: 110, y: 180, w: 115, h: 60, label: 'Table basse', color: C.table },
      { x: 70, y: 30, w: 170, h: 42, label: 'Meuble TV', color: C.tv },
      { x: 310, y: 35, w: 115, h: 90, label: 'Table', color: C.table },
      { x: 325, y: 133, w: 28, h: 28, label: '', color: C.chaise },
      { x: 392, y: 133, w: 28, h: 28, label: '', color: C.chaise },
      { x: 300, y: 225, w: 65, h: 65, label: 'Fauteuil', color: C.canape },
      { x: 390, y: 300, w: 40, h: 50, label: '', color: C.biblio },
    ],
  },
  // 7 — Piece en T
  {
    walls: '120,25 380,25 380,130 465,130 465,350 35,350 35,130 120,130',
    furniture: [
      { x: 130, y: 37, w: 115, h: 82, label: 'Lit', color: C.lit },
      { x: 265, y: 37, w: 105, h: 50, label: 'Bureau', color: C.bureau },
      { x: 50, y: 145, w: 160, h: 65, label: 'Canape', color: C.canape },
      { x: 70, y: 230, w: 100, h: 60, label: 'Table', color: C.table },
      { x: 395, y: 145, w: 55, h: 55, label: 'Frigo', color: C.frigo },
      { x: 260, y: 145, w: 120, h: 42, label: 'Cuisine', color: C.cuisine },
    ],
  },
  // 8 — Salle de bain compacte
  {
    walls: '120,80 380,80 380,300 120,300',
    furniture: [
      { x: 130, y: 90, w: 150, h: 60, label: 'Baignoire', color: C.lit },
      { x: 305, y: 90, w: 65, h: 50, label: 'Lavabo', color: C.cuisine },
      { x: 305, y: 238, w: 45, h: 50, label: 'WC', color: C.frigo },
      { x: 130, y: 245, w: 100, h: 42, label: 'Meuble', color: C.commode },
    ],
  },
  // 9 — Studio avec cloison
  {
    walls: '25,50 475,50 475,330 25,330',
    innerWalls: [{ x1: 280, y1: 50, x2: 280, y2: 230 }],
    furniture: [
      { x: 300, y: 62, w: 150, h: 180, label: 'Lit', color: C.lit },
      { x: 37, y: 250, w: 160, h: 65, label: 'Canape', color: C.canape },
      { x: 80, y: 155, w: 80, h: 75, label: 'Table', color: C.table },
      { x: 37, y: 62, w: 225, h: 44, label: 'Cuisine', color: C.cuisine },
    ],
  },
  // 10 — Piece haute etroite
  {
    walls: '150,10 350,10 350,370 150,370',
    furniture: [
      { x: 160, y: 22, w: 130, h: 50, label: 'Armoire', color: C.armoire },
      { x: 160, y: 85, w: 90, h: 165, label: 'Lit', color: C.lit },
      { x: 265, y: 100, w: 40, h: 45, label: '', color: C.table },
      { x: 160, y: 275, w: 110, h: 55, label: 'Bureau', color: C.bureau },
      { x: 195, y: 340, w: 42, h: 42, label: '', color: C.chaise },
    ],
  },
  // 11 — U ouvert en haut
  {
    walls: '35,30 190,30 190,145 310,145 310,30 465,30 465,350 35,350',
    furniture: [
      { x: 47, y: 42, w: 130, h: 90, label: 'Lit', color: C.lit },
      { x: 322, y: 42, w: 130, h: 90, label: 'Lit', color: C.lit },
      { x: 47, y: 255, w: 175, h: 75, label: 'Canape', color: C.canape },
      { x: 85, y: 175, w: 100, h: 60, label: 'Table', color: C.table },
      { x: 385, y: 160, w: 65, h: 65, label: 'Fauteuil', color: C.canape },
      { x: 322, y: 285, w: 100, h: 48, label: 'Commode', color: C.commode },
    ],
  },
  // 12 — Chambre + dressing (cloison)
  {
    walls: '25,45 475,45 475,335 25,335',
    innerWalls: [{ x1: 340, y1: 45, x2: 340, y2: 240 }],
    furniture: [
      { x: 40, y: 57, w: 160, h: 200, label: 'Lit', color: C.lit },
      { x: 210, y: 67, w: 40, h: 45, label: '', color: C.table },
      { x: 40, y: 278, w: 90, h: 45, label: 'Commode', color: C.commode },
      { x: 355, y: 57, w: 108, h: 42, label: 'Penderie', color: C.armoire },
      { x: 355, y: 112, w: 108, h: 35, label: 'Etagere', color: C.etag },
      { x: 355, y: 160, w: 108, h: 42, label: 'Penderie', color: C.armoire },
    ],
  },
  // 13 — L inversee large en bas
  {
    walls: '50,30 310,30 310,170 460,170 460,350 50,350',
    innerWalls: [{ x1: 310, y1: 170, x2: 310, y2: 350 }],
    furniture: [
      { x: 62, y: 42, w: 145, h: 115, label: 'Lit', color: C.lit },
      { x: 215, y: 42, w: 82, h: 50, label: 'Bureau', color: C.bureau },
      { x: 240, y: 100, w: 42, h: 42, label: '', color: C.chaise },
      { x: 62, y: 195, w: 130, h: 55, label: 'Canape', color: C.canape },
      { x: 325, y: 182, w: 123, h: 45, label: 'Cuisine', color: C.cuisine },
      { x: 392, y: 240, w: 55, h: 55, label: 'Frigo', color: C.frigo },
      { x: 62, y: 280, w: 100, h: 55, label: 'Table', color: C.table },
    ],
  },
  // 14 — Pentagone (mur en biais)
  {
    walls: '80,60 420,60 460,200 380,340 100,340',
    furniture: [
      { x: 120, y: 72, w: 160, h: 42, label: 'Meuble TV', color: C.tv },
      { x: 130, y: 220, w: 170, h: 70, label: 'Canape', color: C.canape },
      { x: 165, y: 140, w: 100, h: 55, label: 'Table basse', color: C.table },
      { x: 320, y: 80, w: 65, h: 65, label: 'Fauteuil', color: C.canape },
    ],
  },
  // 15 — Tres grande piece ouverte
  {
    walls: '10,15 490,15 490,365 10,365',
    innerWalls: [
      { x1: 200, y1: 15, x2: 200, y2: 180 },
      { x1: 200, y1: 180, x2: 340, y2: 180 },
    ],
    furniture: [
      { x: 22, y: 27, w: 165, h: 140, label: 'Lit', color: C.lit },
      { x: 22, y: 200, w: 200, h: 45, label: 'Cuisine', color: C.cuisine },
      { x: 22, y: 270, w: 110, h: 75, label: 'Table', color: C.table },
      { x: 37, y: 255, w: 28, h: 28, label: '', color: C.chaise },
      { x: 100, y: 255, w: 28, h: 28, label: '', color: C.chaise },
      { x: 300, y: 240, w: 175, h: 75, label: 'Canape', color: C.canape },
      { x: 345, y: 30, w: 130, h: 45, label: 'Meuble TV', color: C.tv },
      { x: 395, y: 100, w: 55, h: 55, label: '', color: C.biblio },
    ],
  },
  // 16 — Piece biscornue 6 cotes
  {
    walls: '60,50 350,30 460,120 440,310 120,350 40,220',
    furniture: [
      { x: 130, y: 80, w: 140, h: 55, label: 'Bureau', color: C.bureau },
      { x: 180, y: 142, w: 42, h: 42, label: '', color: C.chaise },
      { x: 100, y: 200, w: 160, h: 65, label: 'Canape', color: C.canape },
      { x: 310, y: 140, w: 90, h: 80, label: 'Table', color: C.table },
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
    }, 1200);
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
        fill="#F5F5F0"
        stroke="#1A1A1A"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Inner walls */}
      {room.innerWalls?.map((w, i) => (
        <line
          key={i}
          x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
          stroke="#1A1A1A"
          strokeWidth="3"
        />
      ))}

      {/* Furniture */}
      {room.furniture.map((f, i) => (
        <g key={i}>
          <rect
            x={f.x} y={f.y}
            width={f.w} height={f.h}
            rx={3}
            fill={f.color}
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
          {f.label && (
            <text
              x={f.x + f.w / 2}
              y={f.y + f.h / 2 + 4}
              textAnchor="middle"
              fontSize="11"
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="500"
              fill="rgba(0,0,0,0.45)"
            >
              {f.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
