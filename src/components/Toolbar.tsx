import type Konva from 'konva';
import type { AppMode } from '../types';
import { useStore } from '../store';

interface Props { stageRef: React.RefObject<Konva.Stage | null> }

export function Toolbar({ stageRef }: Props) {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const piece = useStore((s) => s.piece);
  const selectedIds = useStore((s) => s.selectedIds);
  const generer = useStore((s) => s.generer);
  const isGenerated = useStore((s) => s.isGenerated);
  const nonPlaces = useStore((s) => s.nonPlaces);
  const echelle = useStore((s) => s.echelle);
  const setEchelle = useStore((s) => s.setEchelle);
  const resetTout = useStore((s) => s.resetTout);

  const exportPNG = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const uri = stage.toDataURL({ pixelRatio: 2 });
    const a = document.createElement('a');
    a.download = 'plan.png';
    a.href = uri;
    a.click();
  };

  const steps: { key: AppMode; label: string; done: boolean }[] = [
    { key: 'dessin', label: '1. Pièce', done: piece !== null },
    { key: 'amenagement', label: '2. Aménagement', done: isGenerated },
    { key: 'resultat', label: '3. Résultat', done: false },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-wrap">
      <span className="text-sm font-bold text-gray-800 mr-2">Réarrangeur</span>
      {piece && <span className="text-sm text-gray-500">{piece.surface} m²</span>}
      <div className="w-px h-6 bg-gray-300" />

      {steps.map((s) => {
        const active = mode === s.key;
        const ok = s.key === 'dessin' || (s.key === 'amenagement' && piece !== null) || (s.key === 'resultat' && isGenerated);
        return (
          <button key={s.key} onClick={() => ok && setMode(s.key)} disabled={!ok}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              active ? 'bg-blue-600 text-white' : s.done ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500'
            } ${!ok ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
            {s.label}
          </button>
        );
      })}

      <div className="w-px h-6 bg-gray-300" />

      {mode === 'amenagement' && (
        <button onClick={generer} disabled={selectedIds.size === 0}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-40 disabled:cursor-not-allowed font-medium">
          Générer le plan</button>
      )}

      {mode === 'resultat' && (
        <>
          <button onClick={generer}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded font-medium">
            Réarranger</button>
          <button onClick={() => setMode('amenagement')}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            Modifier</button>
        </>
      )}

      {nonPlaces.length > 0 && mode === 'resultat' && (
        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          {nonPlaces.length} non placé{nonPlaces.length > 1 ? 's' : ''}
        </span>
      )}

      <div className="flex-1" />

      <label className="text-xs text-gray-500 flex items-center gap-1">
        Zoom
        <input type="range" min="0.5" max="3" step="0.1" value={echelle}
          onChange={(e) => setEchelle(parseFloat(e.target.value))} className="w-20" />
      </label>

      {mode === 'resultat' && (
        <button onClick={exportPNG}
          className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded">
          Export PNG</button>
      )}

      <button onClick={resetTout}
        className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded">
        Recommencer</button>
    </div>
  );
}
