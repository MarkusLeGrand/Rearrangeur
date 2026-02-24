import { useRef } from 'react';
import type Konva from 'konva';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { CanvasDessin } from './components/CanvasDessin';
import { CanvasAmenagement } from './components/CanvasAmenagement';
import { CanvasResultat } from './components/CanvasResultat';
import { useStore } from './store';

function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const mode = useStore((s) => s.mode);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toolbar stageRef={stageRef} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {mode === 'dessin' && <CanvasDessin />}
        {mode === 'amenagement' && <CanvasAmenagement />}
        {mode === 'resultat' && <CanvasResultat stageRef={stageRef} />}
      </div>
    </div>
  );
}

export default App;
