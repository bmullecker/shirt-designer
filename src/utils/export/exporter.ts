import { fabric } from 'fabric';
import { toPng } from 'html-to-image';
import { SharedState, ShirtDetails } from '../../context/DesignContext';

const OVERLAY_LAYERS = ['printableAreaOverlay', 'shirtBoundsOverlay', 'gridLine'];

export const generateHighResMockup = async (
  canvas: fabric.Canvas,
  shirtDetails: ShirtDetails
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    // 1. Hide unwanted overlays and deselect
    canvas.discardActiveObject();
    const hiddenObjects: fabric.Object[] = [];
    canvas.getObjects().forEach(obj => {
      if (OVERLAY_LAYERS.includes(obj.name || '')) {
        obj.visible = false;
        hiddenObjects.push(obj);
      }
    });
    
    // Force a render so overlays disappear before capture
    canvas.renderAll();

    // 2. Find the exact DOM wrapper that controls the CSS layout
    const node = document.querySelector('.canvas-wrapper') as HTMLElement;
    if (!node) {
      // Cleanup
      hiddenObjects.forEach(obj => obj.visible = true);
      canvas.renderAll();
      return reject(new Error("Canvas wrapper not found in DOM"));
    }

    try {
      // 3. Generate a 1:1 pixel-perfect PNG of the exact CSS layout
      // Multiply by 3 for a crisp 300DPI-equivalent High-Res output
      const dataUrl = await toPng(node, {
        pixelRatio: 4,
        skipAutoScale: true,
        // Wait for images to be fully painted just in case
        cacheBust: true, 
      });

      // 4. Restore the UI 
      hiddenObjects.forEach(obj => obj.visible = true);
      canvas.renderAll();

      resolve(dataUrl);
    } catch (err) {
      // Cleanup on failure
      hiddenObjects.forEach(obj => obj.visible = true);
      canvas.renderAll();
      reject(err);
    }
  });
};

export const downloadJsonSession = (state: SharedState) => {
  // Strip overlays from canvasObjects if any remained
  const cleanObjects = state.canvasObjects.filter((obj: any) => !OVERLAY_LAYERS.includes(obj.name || ''));
  const exportState = {
    ...state,
    canvasObjects: cleanObjects
  };
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportState, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `shirt_design_session_${Date.now()}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const exportProductionZip = async (
  canvas: fabric.Canvas,
  shirtDetails: ShirtDetails
): Promise<void> => {
  const zip = new JSZip();

  // 1. Generate full mockup (Flattened JPG/PNG over shirt)
  const mockupDataUrl = await generateHighResMockup(canvas, shirtDetails);
  zip.file("mockup_preview.png", mockupDataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""), {base64: true});

  // 2. Hide overlays for clean canvas graphic extraction
  canvas.discardActiveObject();
  const hiddenObjects: fabric.Object[] = [];
  canvas.getObjects().forEach(obj => {
    if (OVERLAY_LAYERS.includes(obj.name || '')) {
      obj.visible = false;
      hiddenObjects.push(obj);
    }
  });
  canvas.renderAll();

  // 3. Combined Graphic (Transparent background, exact user layout)
  // We use a StaticCanvas to render all design elements natively at high-res 
  // with transparency, bypassing DOM-related blurriness.
  const staticCanvas = new fabric.StaticCanvas(null, {
    width: canvas.width! * 4,
    height: canvas.height! * 4,
    backgroundColor: 'rgba(0,0,0,0)'
  });

  // Clone objects to the high-res canvas with 4x scale
  const objectsToClone = canvas.getObjects().filter(obj => !OVERLAY_LAYERS.includes(obj.name || ''));
  
  for (const obj of objectsToClone) {
    const cloned = await new Promise<fabric.Object>(resolve => {
      obj.clone((c: fabric.Object) => resolve(c), ['name', 'selectable', 'evented']);
    });
    
    cloned.set({
      left: (cloned.left || 0) * 4,
      top: (cloned.top || 0) * 4,
      scaleX: (cloned.scaleX || 1) * 4,
      scaleY: (cloned.scaleY || 1) * 4,
    });
    
    staticCanvas.add(cloned);
  }

  const combinedDataUrl = staticCanvas.toDataURL({ format: 'png' });
  zip.file("combined_design.png", combinedDataUrl.replace(/^data:image\/png;base64,/, ""), {base64: true});
  staticCanvas.dispose();

  // 4. Extract individual image layers and parse text layers
  let orderSummary = `ORDER SUMMARY\n`;
  orderSummary += `===============\n\n`;
  orderSummary += `Apparel Type: ${shirtDetails.type.toUpperCase()}\n`;
  orderSummary += `Apparel Size: ${shirtDetails.size}\n`;
  orderSummary += `Apparel Color: ${shirtDetails.color}\n\n`;
  orderSummary += `DESIGN ELEMENTS\n`;
  orderSummary += `---------------\n`;

  let textCount = 0;
  let imageCount = 0;

  canvas.getObjects().forEach((obj) => {
    // Skip overlays
    if (OVERLAY_LAYERS.includes(obj.name || '')) return;

    if (obj.type === 'image') {
      imageCount++;
      const imgDataUrl = obj.toDataURL({ format: 'png', multiplier: 4 });
      zip.file(`layer_${imageCount}.png`, imgDataUrl.replace(/^data:image\/png;base64,/, ""), {base64: true});
    }

    if (obj.type === 'i-text' || obj.type === 'text') {
      textCount++;
      const txt = obj as fabric.IText;
      orderSummary += `[Text Layer ${textCount}]\n`;
      orderSummary += `Content: "${txt.text}"\n`;
      orderSummary += `Font Handle: ${txt.fontFamily}\n`;
      orderSummary += `Styles: ${txt.fontWeight === 'bold' ? 'Bold' : 'Regular'}, ${txt.fontStyle === 'italic' ? 'Italic' : 'Normal'}, ${txt.underline ? 'Underline' : 'No Underline'}\n\n`;
    }
  });

  orderSummary += `Total Image Layers: ${imageCount}\n`;
  orderSummary += `Total Text Layers: ${textCount}\n`;

  zip.file("order_summary.txt", orderSummary);

  // Restore overlays
  hiddenObjects.forEach(obj => obj.visible = true);
  canvas.renderAll();

  // 5. Generate and download ZIP
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `production_package_${Date.now()}.zip`);
};
