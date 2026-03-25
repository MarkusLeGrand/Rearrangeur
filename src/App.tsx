import { useState, useRef, useCallback } from 'react';
import type Konva from 'konva';
import { Toolbar } from './components/Toolbar';
import { Sidebar, InventoryPanel } from './components/Sidebar';
import { CanvasDessin } from './components/CanvasDessin';
import { CanvasAmenagement } from './components/CanvasAmenagement';
import { CanvasResultat } from './components/CanvasResultat';
import { LandingPage } from './components/LandingPage';
import { useStore } from './store';

function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const mode = useStore((s) => s.mode);
  const [showLanding, setShowLanding] = useState(true);

  const handleEnterApp = useCallback(() => {
    setShowLanding(false);
    window.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';
  }, []);

  const handleBackToLanding = useCallback(() => {
    setShowLanding(true);
    document.body.style.overflow = '';
  }, []);

  if (showLanding) {
    return <LandingPage onEnterApp={handleEnterApp} />;
  }

  return (
    <div className="app-shell">
      <Toolbar stageRef={stageRef} onBackToLanding={handleBackToLanding} />
      <div className="app-main">
        <Sidebar />
        {mode === 'dessin' && <CanvasDessin />}
        {mode === 'amenagement' && <CanvasAmenagement />}
        {mode === 'resultat' && <CanvasResultat stageRef={stageRef} />}
        {(mode === 'amenagement' || mode === 'resultat') && <InventoryPanel />}
      </div>
    </div>
  );
}

export default App;
