import { useState } from 'react';
import { catalogue, fixedCatalogue, categories, fixedCategories } from '../data/catalogue';
import { useStore } from '../store';
import type { MeubleCatalogue } from '../types';

export function Sidebar() {
  const mode = useStore((s) => s.mode);
  if (mode === 'dessin') return <SidebarDessin />;
  if (mode === 'amenagement') return <SidebarAmenagement />;
  return <SidebarResultat />;
}

function SidebarDessin() {
  const phase = useStore((s) => s.drawPhase);
  const contour = useStore((s) => s.contourPoints);
  const closed = useStore((s) => s.contourClosed);
  const innerWalls = useStore((s) => s.innerWalls);
  const closeContour = useStore((s) => s.closeContour);
  const undoContourPoint = useStore((s) => s.undoContourPoint);
  const clearContour = useStore((s) => s.clearContour);
  const undoInnerWall = useStore((s) => s.undoInnerWall);
  const setInnerWallStart = useStore((s) => s.setInnerWallStart);
  const validerPiece = useStore((s) => s.validerPiece);

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full p-4">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Dessiner la pièce</h2>

      {phase === 'contour' && !closed && (
        <>
          <div className="text-sm text-gray-600 space-y-2 mb-4">
            <p><b>Étape 1 :</b> Dessinez le contour extérieur.</p>
            <p>Cliquez point par point. Pour fermer, cliquez sur le premier point (rouge).</p>
          </div>
          <div className="bg-blue-50 rounded p-3 mb-4">
            <div className="text-sm font-medium text-blue-800">
              {contour.length} point{contour.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="space-y-2">
            {contour.length >= 3 && (
              <button onClick={closeContour}
                className="w-full px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded font-medium">
                Fermer le contour
              </button>
            )}
            <button onClick={undoContourPoint} disabled={contour.length === 0}
              className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-40">
              Annuler dernier point
            </button>
            <button onClick={clearContour} disabled={contour.length === 0}
              className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded disabled:opacity-40">
              Tout effacer
            </button>
          </div>
        </>
      )}

      {phase === 'murs_interieurs' && (
        <>
          <div className="text-sm text-gray-600 space-y-2 mb-4">
            <p><b>Étape 2 :</b> Ajoutez des murs intérieurs (optionnel).</p>
            <p>Cliquez 2 points pour tracer un mur. Ou passez directement à la validation.</p>
          </div>

          <div className="bg-blue-50 rounded p-3 mb-4">
            <div className="text-sm font-medium text-blue-800">
              Contour : {contour.length} points
            </div>
            <div className="text-sm text-red-600 mt-1">
              {innerWalls.length} mur{innerWalls.length !== 1 ? 's' : ''} intérieur{innerWalls.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={validerPiece}
              className="w-full px-3 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded font-medium">
              Valider la pièce
            </button>
            <button onClick={undoInnerWall} disabled={innerWalls.length === 0}
              className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-40">
              Annuler dernier mur intérieur
            </button>
            <button onClick={() => setInnerWallStart(null)}
              className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">
              Annuler point de départ
            </button>
            <button onClick={clearContour}
              className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded">
              Recommencer le dessin
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarAmenagement() {
  const [tab, setTab] = useState<'murs' | 'fixes' | 'meubles'>('murs');

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="flex border-b border-gray-200">
        {([
          { key: 'murs' as const, label: 'Murs' },
          { key: 'fixes' as const, label: 'Fixes' },
          { key: 'meubles' as const, label: 'Meubles' },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-2 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}>{t.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'murs' && <TabMurs />}
        {tab === 'fixes' && <TabFixes />}
        {tab === 'meubles' && <TabMeubles />}
      </div>
    </div>
  );
}

function TabMurs() {
  const elementsMur = useStore((s) => s.elementsMur);
  const supprimerElementMur = useStore((s) => s.supprimerElementMur);
  const setPlacingTool = useStore((s) => s.setPlacingTool);

  return (
    <div className="p-3 space-y-3">
      <p className="text-sm text-gray-600">Placez portes et fenêtres sur les murs.</p>
      <div className="flex gap-2">
        <button onClick={() => setPlacingTool('porte')}
          className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200">
          + Porte</button>
        <button onClick={() => setPlacingTool('fenetre')}
          className="flex-1 px-3 py-2 text-sm bg-sky-50 text-sky-700 hover:bg-sky-100 rounded border border-sky-200">
          + Fenêtre</button>
      </div>
      {elementsMur.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-500 uppercase">Placés</div>
          {elementsMur.map((el) => (
            <div key={el.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
              <span>{el.type === 'porte' ? 'Porte' : 'Fenêtre'} ({(el.largeur / 100).toFixed(1)} m)</span>
              <button onClick={() => supprimerElementMur(el.id)}
                className="text-red-500 hover:text-red-700 text-xs">Supprimer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabFixes() {
  const fixes = useStore((s) => s.fixes);
  const supprimerFixe = useStore((s) => s.supprimerFixe);
  const [catActive, setCatActive] = useState(fixedCategories[0]);
  const filtered = fixedCatalogue.filter((m) => m.categorie === catActive);

  const handleDragStart = (e: React.DragEvent, item: MeubleCatalogue) => {
    e.dataTransfer.setData('fixe', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="p-3 space-y-3">
      <p className="text-sm text-gray-600">Glissez les éléments fixes sur le plan.</p>
      <div className="flex gap-1">
        {fixedCategories.map((cat) => (
          <button key={cat} onClick={() => setCatActive(cat)}
            className={`px-2 py-1 text-xs rounded ${catActive === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cat}</button>
        ))}
      </div>
      <div className="space-y-1">
        {filtered.map((item) => (
          <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item)}
            className="flex items-center gap-2 p-2 rounded cursor-grab hover:bg-gray-50 active:cursor-grabbing border border-gray-100">
            <div className="w-6 h-6 rounded flex-shrink-0 border border-blue-300" style={{ backgroundColor: item.couleur }} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-700 truncate">{item.nom}</div>
              <div className="text-xs text-gray-400">{(item.largeur / 100).toFixed(1)} x {(item.hauteur / 100).toFixed(1)} m</div>
            </div>
          </div>
        ))}
      </div>
      {fixes.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-500 uppercase">Sur le plan</div>
          {fixes.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded text-sm">
              <span>{m.nom}</span>
              <button onClick={() => supprimerFixe(i)} className="text-red-500 hover:text-red-700 text-xs">Retirer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabMeubles() {
  const selectedIds = useStore((s) => s.selectedIds);
  const toggleMeuble = useStore((s) => s.toggleMeuble);
  const [catActive, setCatActive] = useState(categories[0]);
  const [recherche, setRecherche] = useState('');

  const filtered = catalogue.filter((m) =>
    m.categorie === catActive && (recherche === '' || m.nom.toLowerCase().includes(recherche.toLowerCase()))
  );

  return (
    <div className="p-3 space-y-3">
      <p className="text-sm text-gray-600">Cochez les meubles à placer.</p>
      <input type="text" placeholder="Rechercher..." value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500" />
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setCatActive(cat)}
            className={`px-2 py-1 text-xs rounded ${catActive === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cat}</button>
        ))}
      </div>
      <div className="space-y-1">
        {filtered.map((m) => {
          const checked = selectedIds.has(m.id);
          return (
            <label key={m.id}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-colors ${
                checked ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
              }`}>
              <input type="checkbox" checked={checked} onChange={() => toggleMeuble(m.id)}
                className="accent-blue-600 w-4 h-4 flex-shrink-0" />
              <div className="w-6 h-6 rounded flex-shrink-0" style={{ backgroundColor: m.couleur }} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate">{m.nom}</div>
                <div className="text-xs text-gray-400">{(m.largeur / 100).toFixed(1)} x {(m.hauteur / 100).toFixed(1)} m</div>
              </div>
            </label>
          );
        })}
      </div>
      <div className="text-sm text-gray-500 pt-2 border-t border-gray-200">
        {selectedIds.size} meuble{selectedIds.size !== 1 ? 's' : ''} sélectionné{selectedIds.size !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function SidebarResultat() {
  const piece = useStore((s) => s.piece);
  const fixes = useStore((s) => s.fixes);
  const placements = useStore((s) => s.placements);
  const nonPlaces = useStore((s) => s.nonPlaces);
  const elementsMur = useStore((s) => s.elementsMur);

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full p-4">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Résultat</h2>
      <div className="space-y-3 text-sm">
        {piece && <div className="bg-gray-50 rounded p-3"><div className="font-medium text-gray-800">Surface : {piece.surface} m²</div></div>}
        <div className="bg-green-50 rounded p-3">
          <div className="font-medium text-green-800">{placements.length} meuble{placements.length !== 1 ? 's' : ''} placé{placements.length !== 1 ? 's' : ''}</div>
        </div>
        {fixes.length > 0 && (
          <div className="bg-blue-50 rounded p-3">
            <div className="font-medium text-blue-800 mb-1">{fixes.length} fixe{fixes.length !== 1 ? 's' : ''}</div>
            {fixes.map((f, i) => <div key={i} className="text-blue-600 text-xs">{f.nom}</div>)}
          </div>
        )}
        {elementsMur.length > 0 && (
          <div className="bg-gray-50 rounded p-3">
            <div className="font-medium text-gray-700 mb-1">Ouvertures</div>
            {elementsMur.map((el) => (
              <div key={el.id} className="text-gray-500 text-xs">
                {el.type === 'porte' ? 'Porte' : 'Fenêtre'} ({(el.largeur / 100).toFixed(1)} m)
              </div>
            ))}
          </div>
        )}
        {nonPlaces.length > 0 && (
          <div className="bg-amber-50 rounded p-3">
            <div className="font-medium text-amber-800 mb-1">Non placés</div>
            {nonPlaces.map((n, i) => <div key={i} className="text-amber-600 text-xs">{n}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
