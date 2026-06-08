// App.tsx
import React from 'react';
import { DesignProvider } from './context/DesignContext';
import { ShirtCanvas } from './components/canvas/ShirtCanvas';
import { CanvasControls, TypographyToolbar } from './components/canvas/CanvasControls';
import { ProductSelector } from './components/ui/ProductSelector';

function App() {
  const [activeCanvas, setActiveCanvas] = React.useState<any>(null);

  return (
    <DesignProvider>
      <div className="app-container">
        <div className="designer-wrapper">
          <aside className="sidebar">
            <div className="header">
              <h1>Designer</h1>
              <p>Premium custom apparel.</p>
            </div>
            
            <ProductSelector />
          </aside>

          <main className="workspace">
            <div className="toolbar-container">
              <CanvasControls canvas={activeCanvas} />
              <TypographyToolbar canvas={activeCanvas} />
            </div>
            <div className="builder-pane">
              <ShirtCanvas onCanvasReady={(c) => setActiveCanvas(c)} />
            </div>
          </main>
        </div>
      </div>
    </DesignProvider>
  );
}

export default App;
