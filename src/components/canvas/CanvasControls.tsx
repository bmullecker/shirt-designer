import React, { useRef, useEffect, useState, useReducer } from 'react';
import { fabric } from 'fabric';
import { useDesign } from '../../context/DesignContext';
import { generateHighResMockup, downloadJsonSession, exportProductionZip } from '../../utils/export/exporter';

interface CanvasControlsProps {
  canvas: fabric.Canvas | null;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({ canvas }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const { state } = useDesign();
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [lowResImages, setLowResImages] = useState<{ id: string, name: string }[]>([]);

  const handleExport = async () => {
    if (!canvas) return;
    try {
      setIsExporting(true);
      const dataUrl = await generateHighResMockup(canvas, state.currentShirt);

      const link = document.createElement('a');
      link.download = `high_res_mockup_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSession = () => {
    if (!canvas) return;
    const rawObjects = canvas.getObjects().map(obj => obj.toJSON(['name', 'selectable', 'evented', 'strokeDashArray']));
    downloadJsonSession({ ...state, canvasObjects: rawObjects });
  };

  const toggleGrids = () => {
    if (canvas && (canvas as any).drawOverlays) {
      (canvas as any).showGrids = !(canvas as any).showGrids;
      (canvas as any).drawOverlays();
      forceUpdate();
    }
  };

  const hasGrids = (canvas as any)?.showGrids || false;

  useEffect(() => {
    if (!canvas) return;

    const updateHistoryState = () => {
      if (canvas) {
        setCanUndo((canvas as any).canUndo ? (canvas as any).canUndo() : false);
        setCanRedo((canvas as any).canRedo ? (canvas as any).canRedo() : false);
      }
    };

    const updateLowResList = () => {
      if (canvas) {
        const images = canvas.getObjects().filter(obj => obj.type === 'image' && (obj as any).isLowRes);
        setLowResImages(images.map(img => ({
          id: (img as any).id || Math.random().toString(36).substr(2, 9),
          name: (img as any).fileName || 'Uploaded Image'
        })));
      }
    };

    canvas.on('history:update', updateHistoryState);
    canvas.on('object:added', updateLowResList);
    canvas.on('object:removed', updateLowResList);
    updateHistoryState();
    updateLowResList();

    return () => {
      canvas.off('history:update', updateHistoryState);
      canvas.off('object:added', updateLowResList);
      canvas.off('object:removed', updateLowResList);
    };
  }, [canvas]);

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText('Your Text', {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontFamily: 'Outfit, sans-serif',
      fill: '#0f172a',
      fontSize: 40,
      originX: 'center',
      originY: 'center',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result as string;
      fabric.Image.fromURL(data, (img) => {
        const megapixels = (img.width! * img.height!) / 1000000;
        const isLowRes = megapixels < 1.0;
        const id = Math.random().toString(36).substr(2, 9);

        if (img.width && img.width > 200) {
          img.scaleToWidth(200);
        }
        img.set({
          left: canvas.width! / 2,
          top: canvas.height! / 2,
          originX: 'center',
          originY: 'center',
        });

        // Tag the object
        (img as any).id = id;
        (img as any).isLowRes = isLowRes;
        (img as any).fileName = file.name;

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const deleteSelected = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.discardActiveObject();
      activeObjects.forEach((obj) => {
        if (obj.name !== 'printableAreaOverlay') {
          canvas.remove(obj);
        }
      });
    }
  };

  const fonts = [
    'Roboto', 'Open Sans', 'Merriweather', 'Ultra', 'Bungee',
    'Bebas Neue', 'Orbitron', 'Press Start 2P', 'Dynapuff',
    'Special Elite', 'Schoolbell', 'Pirata One'
  ];

  const highlightImage = (id: string) => {
    if (!canvas) return;
    const obj = canvas.getObjects().find(o => (o as any).id === id);
    if (obj) {
      canvas.setActiveObject(obj);
      canvas.renderAll();
    }
  };

  return (
    <>
      <div className="warning-container" style={{
        position: 'absolute',
        top: '-10px',
        left: '0',
        right: '0',
        transform: 'translateY(-100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '0 10px',
        pointerEvents: 'none'
      }}>
        {lowResImages.map((img) => (
          <div
            key={img.id}
            onClick={() => highlightImage(img.id)}
            className="low-res-warning"
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span>
              <strong>Low Quality:</strong> {img.name} is low resolution and may be blurry.
              <span style={{ textDecoration: 'underline', marginLeft: '5px', opacity: 0.8 }}>Click to view</span>
            </span>
          </div>
        ))}
      </div>
      <div className="modern-toolbar">
        <div className="group">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden-input"
            accept="image/*"
            onChange={handleImageUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload Image"
            className="tool-btn icon"
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none" /><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3zM8 13h2.55v3h2.9v-3H16l-4-4z" /></svg>
          </button>
          <button
            onClick={addText}
            title="Add Text"
            className="tool-btn icon"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 16 2.536-7.328a1.02 1.02 1 0 1 1.928 0L22 16" /><path d="M15.697 14h5.606" /><path d="m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16" /><path d="M3.304 13h6.392" /></svg>
          </button>
          <button onClick={toggleGrids} title={hasGrids ? "Hide Grids" : "Show Grids"} className="tool-btn icon">
            <svg viewBox="0 -960 960 960" fill="currentColor"><path d="M320-160v-160H160v-80h160v-160H160v-80h160v-160h80v160h160v-160h80v160h160v80H640v160h160v80H640v160h-80v-160H400v160h-80Zm80-240h160v-160H400v160Z" /></svg>
          </button>
        </div>

        <div className="divider" />

        <div className="group">
          <button onClick={() => (canvas as any)?.undo()} disabled={!canUndo} title="Undo" className="tool-btn icon">
            <svg viewBox="0 0 512 512" fill="currentColor"><path d="M212.333 224.333H12c-6.627 0-12-5.373-12-12V12C0 5.373 5.373 0 12 0h48c6.627 0 12 5.373 12 12v78.112C117.773 39.279 184.26 7.47 258.175 8.007c136.906.994 246.448 111.623 246.157 248.532C504.041 393.258 393.12 504 256.333 504c-64.089 0-122.496-24.313-166.51-64.215-5.099-4.622-5.334-12.554-.467-17.42l33.967-33.967c4.474-4.474 11.662-4.717 16.401-.525C170.76 415.336 211.58 432 256.333 432c97.268 0 176-78.716 176-176 0-97.267-78.716-176-176-176-58.496 0-110.28 28.476-142.274 72.333h98.274c6.627 0 12 5.373 12 12v48c0 6.627-5.373 12-12 12z" /></svg>
          </button>
          <button onClick={() => (canvas as any)?.redo()} disabled={!canRedo} title="Redo" className="tool-btn icon">
            <svg viewBox="0 0 512 512" fill="currentColor"><path d="M500.33 0h-47.41a12 12 0 0 0-12 12.57l4 82.76A247.42 247.42 0 0 0 256 8C119.34 8 7.9 119.53 8 256.19 8.1 393.07 119.1 504 256 504a247.1 247.1 0 0 0 166.18-63.91 12 12 0 0 0 .48-17.43l-34-34a12 12 0 0 0-16.38-.55A176 176 0 1 1 402.1 157.8l-101.53-4.87a12 12 0 0 0-12.57 12v47.41a12 12 0 0 0 12 12h200.33a12 12 0 0 0 12-12V12a12 12 0 0 0-12-12z" /></svg>
          </button>
          <button onClick={() => {
            if (canvas) {
              const obj = canvas.getActiveObject();
              if (obj) { canvas.remove(obj); canvas.discardActiveObject(); canvas.renderAll(); (canvas as any).saveHistory?.(); }
            }
          }} title="Delete Selected" className="tool-btn icon danger">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none" opacity=".87" /><path d="M12 2C6.46 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59-8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z" /></svg>
          </button>
        </div>

        <div className="divider" />

        <div className="group" style={{ position: 'relative' }}>
          <button onClick={handleExport} disabled={isExporting} title="Export PNG" className="tool-btn icon">
            {isExporting ? (
              <svg className="animate-spin" width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none" /><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3zm-5.55-8h-2.9v3H8l4 4 4-4h-2.55z" /></svg>
            )}
          </button>
          <button
            onClick={async () => {
              if (!canvas) return;
              try { setIsExportingZip(true); await exportProductionZip(canvas, state.currentShirt); }
              catch (e) { console.error('Zip export failed:', e); }
              finally { setIsExportingZip(false); }
            }}
            disabled={isExportingZip || isExporting}
            title="Export Production ZIP"
            className="tool-btn icon">
            {isExportingZip ? (
              <svg className="animate-spin" width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" /></svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export const TypographyToolbar: React.FC<{ canvas: fabric.Canvas | null }> = ({ canvas }) => {
  const [selectedText, setSelectedText] = useState<fabric.IText | null>(null);
  const [textStyles, setTextStyles] = useState({
    fontFamily: 'Outfit',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    textAlign: 'left'
  });
  const [toolbarPos, setToolbarPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!canvas) return;

    const updateToolbarPos = () => {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const text = activeObj as fabric.IText;

        // Find the canvas-wrapper element to get its bounding box
        const wrapper = document.querySelector('.canvas-wrapper');
        if (wrapper) {
          const rect = wrapper.getBoundingClientRect();
          // Position toolbar at the top-left of the main toolbar within the container
          setToolbarPos({
            left: 0,
            top: -65 // Position above the main toolbar
          });
          setSelectedText(text);
          setTextStyles({
            fontFamily: (text.fontFamily as string) || 'Outfit',
            isBold: text.fontWeight === 'bold',
            isItalic: text.fontStyle === 'italic',
            isUnderline: !!text.underline,
            textAlign: text.textAlign || 'left'
          });
        }
      } else {
        setSelectedText(null);
      }
    };

    canvas.on('selection:created', updateToolbarPos);
    canvas.on('selection:updated', updateToolbarPos);
    canvas.on('selection:cleared', () => setSelectedText(null));
    canvas.on('object:moving', updateToolbarPos);
    canvas.on('object:scaling', updateToolbarPos);

    return () => {
      canvas.off('selection:created', updateToolbarPos);
      canvas.off('selection:updated', updateToolbarPos);
      canvas.off('selection:cleared');
      canvas.off('object:moving', updateToolbarPos);
      canvas.off('object:scaling', updateToolbarPos);
    };
  }, [canvas]);

  const toggleStyle = (style: 'bold' | 'italic' | 'underline') => {
    if (!selectedText || !canvas) return;

    // Apply to full block
    if (style === 'bold') {
      const isBold = selectedText.fontWeight === 'bold';
      selectedText.set('fontWeight', isBold ? 'normal' : 'bold');
      setTextStyles(prev => ({ ...prev, isBold: !isBold }));
    } else if (style === 'italic') {
      const isItalic = selectedText.fontStyle === 'italic';
      selectedText.set('fontStyle', isItalic ? 'normal' : 'italic');
      setTextStyles(prev => ({ ...prev, isItalic: !isItalic }));
    } else if (style === 'underline') {
      const isUnder = !!selectedText.underline;
      selectedText.set('underline', !isUnder);
      setTextStyles(prev => ({ ...prev, isUnderline: !isUnder }));
    }

    canvas.renderAll();
    canvas.fire('object:modified');
  };

  const changeFont = (font: string) => {
    if (!selectedText || !canvas) return;
    selectedText.set('fontFamily', font);
    setTextStyles(prev => ({ ...prev, fontFamily: font }));
    canvas.renderAll();
    canvas.fire('object:modified');
  };

  const changeTextAlign = (align: string) => {
    if (!selectedText || !canvas) return;
    selectedText.set('textAlign', align);
    setTextStyles(prev => ({ ...prev, textAlign: align }));
    canvas.renderAll();
    canvas.fire('object:modified');
  };

  if (!selectedText) return null;

  const fontsList = [
    'Roboto', 'Open Sans', 'Merriweather', 'Ultra', 'Bungee',
    'Bebas Neue', 'Orbitron', 'Press Start 2P', 'Dynapuff',
    'Special Elite', 'Schoolbell', 'Pirata One'
  ];

  return (
    <div className="text-edit-toolbar" style={{
      position: 'absolute',
      left: toolbarPos.left,
      top: '55px', // Sit directly below the main toolbar
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <select
        value={textStyles.fontFamily}
        onChange={(e) => changeFont(e.target.value)}
        className="font-select"
      >
        {fontsList.map(f => (
          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
        ))}
      </select>

      <div className="divider" />

      <button
        onClick={() => toggleStyle('bold')}
        className={`tool-btn icon small ${textStyles.isBold ? 'active' : ''}`}
        title="Bold"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>
      </button>

      <button
        onClick={() => toggleStyle('italic')}
        className={`tool-btn icon small ${textStyles.isItalic ? 'active' : ''}`}
        title="Italic"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
      </button>

      <button
        onClick={() => toggleStyle('underline')}
        className={`tool-btn icon small ${textStyles.isUnderline ? 'active' : ''}`}
        title="Underline"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>
      </button>

      <div className="divider" />

      <button
        onClick={() => changeTextAlign('left')}
        className={`tool-btn icon small ${textStyles.textAlign === 'left' ? 'active' : ''}`}
        title="Align Left"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 6H3M17 10H3M21 14H3M17 18H3" /></svg>
      </button>

      <button
        onClick={() => changeTextAlign('center')}
        className={`tool-btn icon small ${textStyles.textAlign === 'center' ? 'active' : ''}`}
        title="Align Center"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 6H3M19 10H5M21 14H3M19 18H5" /></svg>
      </button>

      <button
        onClick={() => changeTextAlign('right')}
        className={`tool-btn icon small ${textStyles.textAlign === 'right' ? 'active' : ''}`}
        title="Align Right"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 6H3M21 10H7M21 14H3M21 18H7" /></svg>
      </button>
    </div>
  );
};
