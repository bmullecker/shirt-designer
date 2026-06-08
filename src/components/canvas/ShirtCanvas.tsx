import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { useDesign, SharedState } from '../../context/DesignContext';

interface ShirtCanvasProps {
  onCanvasReady?: (canvas: fabric.Canvas) => void;
}

const OVERLAY_LAYERS = ['printableAreaOverlay', 'shirtBoundsOverlay', 'gridLine'];

export const ShirtCanvas: React.FC<ShirtCanvasProps> = ({ onCanvasReady }) => {
  const { state, setCanvasObjects } = useDesign() as {
    state: SharedState;
    setCanvasObjects: (objects: any[]) => void;
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 500,
      height: 500,
      selection: true,
      preserveObjectStacking: true
    });

    setFabricCanvas(canvas);
    if (onCanvasReady) onCanvasReady(canvas);

    if (state.canvasObjects && state.canvasObjects.length > 0) {
      fabric.util.enlivenObjects(state.canvasObjects, (objects: fabric.Object[]) => {
        objects.forEach((obj) => {
          if (!OVERLAY_LAYERS.includes(obj.name || '')) {
             canvas.add(obj);
          }
        });
        canvas.renderAll();
      }, "fabric");
    }

    canvas.on('object:moving', (e: any) => enforceBoundaries(e.target, canvas));
    canvas.on('object:scaling', (e: any) => enforceBoundaries(e.target, canvas));

    let history: string[] = [];
    let historyIndex = -1;
    let isHistoryUpdate = false;

    const serializeCanvas = () => {
      const tempCanvas = canvas.toObject(['name', 'selectable', 'evented', 'strokeDashArray']);
      tempCanvas.objects = tempCanvas.objects.filter((obj: any) => !OVERLAY_LAYERS.includes(obj.name || ''));
      return JSON.stringify(tempCanvas);
    };

    const saveState = () => {
      if (isHistoryUpdate) return;
      const json = serializeCanvas();
      if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
      }
      history.push(json);
      if (history.length > 6) history.shift();
      else historyIndex++;

      const objectsToSave = canvas.getObjects().filter(obj => !OVERLAY_LAYERS.includes(obj.name || '')).map(obj => obj.toJSON(['name', 'selectable', 'evented', 'strokeDashArray']));
      setCanvasObjects(objectsToSave);
      canvas.fire('history:update');
    };

    (canvas as any).undo = () => {
      if (historyIndex > 0) {
        isHistoryUpdate = true;
        historyIndex--;
        canvas.loadFromJSON(history[historyIndex], () => {
          isHistoryUpdate = false;
          if ((canvas as any).drawOverlays) (canvas as any).drawOverlays();
          canvas.discardActiveObject();
          canvas.renderAll();
          
          const objectsToSave = canvas.getObjects()
            .filter(obj => !OVERLAY_LAYERS.includes(obj.name || ''))
            .map(obj => obj.toJSON(['name', 'selectable', 'evented', 'strokeDashArray']));
          
          setCanvasObjects(objectsToSave);
          canvas.fire('history:update');
          canvas.fire('selection:cleared'); // Ensure toolbars hide
        });
      }
    };

    (canvas as any).redo = () => {
      if (historyIndex < history.length - 1) {
        isHistoryUpdate = true;
        historyIndex++;
        canvas.loadFromJSON(history[historyIndex], () => {
          isHistoryUpdate = false;
          if ((canvas as any).drawOverlays) (canvas as any).drawOverlays();
          canvas.discardActiveObject();
          canvas.renderAll();
          
          const objectsToSave = canvas.getObjects()
            .filter(obj => !OVERLAY_LAYERS.includes(obj.name || ''))
            .map(obj => obj.toJSON(['name', 'selectable', 'evented', 'strokeDashArray']));
          
          setCanvasObjects(objectsToSave);
          canvas.fire('history:update');
        });
      }
    };

    (canvas as any).canUndo = () => historyIndex > 0;
    (canvas as any).canRedo = () => historyIndex < history.length - 1;

    canvas.on('object:added', saveState);
    canvas.on('object:modified', saveState);
    canvas.on('object:removed', saveState);
    
    setTimeout(saveState, 50);

    return () => {
      canvas.dispose();
    };
  }, []);

  const enforceBoundaries = (obj: fabric.Object | undefined, canvas: fabric.Canvas) => {
    if (!obj || OVERLAY_LAYERS.includes(obj.name || '')) return;
    
    // Bounds are the entire visible canvas with a 10px margin
    const boundsArea = {
      left: 10,
      top: 10,
      width: canvas.width! - 20,
      height: canvas.height! - 20,
      right: canvas.width! - 10,
      bottom: canvas.height! - 10,
    };
    
    obj.setCoords();
    const bounds = obj.getBoundingRect();
    if (bounds.left < boundsArea.left) obj.left = boundsArea.left + (obj.left! - bounds.left);
    if (bounds.top < boundsArea.top) obj.top = boundsArea.top + (obj.top! - bounds.top);
    if (bounds.left + bounds.width > boundsArea.right) obj.left = boundsArea.right - bounds.width + (obj.left! - bounds.left);
    if (bounds.top + bounds.height > boundsArea.bottom) obj.top = boundsArea.bottom - bounds.height + (obj.top! - bounds.top);
  };

  useEffect(() => {
    if (!fabricCanvas) return;
    
    const drawOverlays = () => {
      const canvas = fabricCanvas;
      const { dimensions } = state.currentShirt;
      
      canvas.getObjects().forEach(obj => {
        if (OVERLAY_LAYERS.includes(obj.name || '')) canvas.remove(obj);
      });

      // 1. Blue dashed marquee (Chest Area)
      const chestLeft = (canvas.width! - dimensions.width) / 2;
      const chestTop = (canvas.height! - dimensions.height) / 2;
      
      const boundsOverlay = new fabric.Rect({
        left: chestLeft,
        top: chestTop,
        width: dimensions.width,
        height: dimensions.height,
        fill: 'transparent',
        stroke: 'rgba(99, 102, 241, 0.6)', // Indigo, more opaque for marquee
        strokeWidth: 2,
        strokeDashArray: [10, 5],
        selectable: false,
        evented: false,
        name: 'shirtBoundsOverlay'
      });
      canvas.add(boundsOverlay);
      boundsOverlay.sendToBack();

      // 2. Grid Lines (within chest area)
      if ((canvas as any).showGrids) {
        const createLine = (coords: number[]) => {
          return new fabric.Line(coords, {
            stroke: 'rgba(56, 189, 248, 0.4)', // Light Blue, thin
            strokeWidth: 1,
            selectable: false,
            evented: false,
            name: 'gridLine'
          });
        };

        const wStep = dimensions.width / 3;
        const hStep = dimensions.height / 3;

        const v1 = createLine([chestLeft + wStep, chestTop, chestLeft + wStep, chestTop + dimensions.height]);
        const v2 = createLine([chestLeft + 2*wStep, chestTop, chestLeft + 2*wStep, chestTop + dimensions.height]);
        const h1 = createLine([chestLeft, chestTop + hStep, chestLeft + dimensions.width, chestTop + hStep]);
        const h2 = createLine([chestLeft, chestTop + 2*hStep, chestLeft + dimensions.width, chestTop + 2*hStep]);

        [v1, v2, h1, h2].forEach(l => {
          canvas.add(l);
          l.sendToBack();
        });
        
        boundsOverlay.sendToBack();
      }
      
      canvas.requestRenderAll();
    };

    (fabricCanvas as any).drawOverlays = drawOverlays;
    drawOverlays();

  }, [state.currentShirt.dimensions, fabricCanvas]);

  return (
    <div className="canvas-wrapper" style={{ 
      '--shirt-color': state.currentShirt.color,
      '--shirt-mask': `url(/images/${state.currentShirt.type}.png)` 
    } as React.CSSProperties}>
      <div className="shirt-background">
        <div className="white-base" />
        <div className="color-layer" />
        <img
          src={`/images/${state.currentShirt.type}.png`}
          alt="Shirt Template"
          className="mockup-layer"
          onError={(e) => console.error("Failed to load image:", e)}
        />
      </div>
      
      <div className="fabric-container">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
