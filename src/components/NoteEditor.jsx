import { useRef, useEffect, useState, useCallback } from 'react';
import { GripHorizontal, X, Maximize2 } from 'lucide-react';

const TEXT_COLOR_PRESETS = [
  { id: 'default', label: 'Theme Default', value: '' },
  { id: 'blue', label: 'Blue', value: '#2563eb' },
  { id: 'red', label: 'Red', value: '#dc2626' },
  { id: 'green', label: 'Emerald', value: '#16a34a' },
  { id: 'purple', label: 'Purple', value: '#9333ea' },
  { id: 'amber', label: 'Amber', value: '#d97706' },
];

function getStrokeBounds(item) {
  const tool = item.tool || 'pen';
  const pad = Math.max(6, (item.size || 3) + 4);

  if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
    if (!item.points || item.points.length === 0) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const pt of item.points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }

  if (!item.start || !item.end) return null;
  const { start, end } = item;

  if (tool === 'circle') {
    const r = Math.hypot(end.x - start.x, end.y - start.y);
    return { x: start.x - r - pad, y: start.y - r - pad, w: (r + pad) * 2, h: (r + pad) * 2 };
  }

  if (tool === 'square') {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    const endX = start.x + side * Math.sign(dx || 1);
    const endY = start.y + side * Math.sign(dy || 1);
    const minX = Math.min(start.x, endX);
    const minY = Math.min(start.y, endY);
    return {
      x: minX - pad,
      y: minY - pad,
      w: Math.abs(endX - start.x) + pad * 2,
      h: Math.abs(endY - start.y) + pad * 2,
    };
  }

  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.abs(end.x - start.x) + pad * 2,
    h: Math.abs(end.y - start.y) + pad * 2,
  };
}

function getTextBoxBounds(box) {
  const lines = (box.text || '').split('\n');
  const maxLen = Math.max(10, ...lines.map((l) => l.length));
  const w = Math.min(600, Math.max(210, maxLen * 9 + 40));
  const h = Math.max(1, lines.length) * 24 + 34;
  return { x: box.x, y: box.y, w, h };
}

function getImageBounds(img) {
  return { x: img.x, y: img.y, w: img.width || 240, h: img.height || 180 };
}

function boxesIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInBox(px, py, box) {
  return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h;
}

function translateStroke(item, dx, dy) {
  const tool = item.tool || 'pen';
  if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
    return {
      ...item,
      points: (item.points || []).map((pt) => ({ ...pt, x: pt.x + dx, y: pt.y + dy })),
    };
  }
  return {
    ...item,
    start: { x: item.start.x + dx, y: item.start.y + dy },
    end: { x: item.end.x + dx, y: item.end.y + dy },
  };
}

export function NoteEditor({
  notebook,
  mode,
  drawTool = 'pen',
  penColor,
  penSize,
  highlighterColor = '#fde047',
  highlighterSize = 22,
  eraserSize = 24,
  theme = 'light',
  onUpdate,
  onStrokeCommit,
  onInsertImageFile,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentItem = useRef(null);

  const [boardSize, setBoardSize] = useState({ width: 1200, height: 800 });
  const [eraserCursor, setEraserCursor] = useState(null);

  const [activeBoxId, setActiveBoxId] = useState(null);
  const [draggingBox, setDraggingBox] = useState(null);

  // Image states
  const [activeImageId, setActiveImageId] = useState(null);
  const [draggingImage, setDraggingImage] = useState(null);
  const [resizingImage, setResizingImage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Selection states
  const [selectedStrokeIndices, setSelectedStrokeIndices] = useState([]);
  const [selectedBoxIds, setSelectedBoxIds] = useState([]);
  const [selectedImageIds, setSelectedImageIds] = useState([]);
  const [marquee, setMarquee] = useState(null);
  const [selectionDrag, setSelectionDrag] = useState(null);

  const isDark = theme === 'dark';

  const textBoxes =
    notebook.textBoxes ||
    (notebook.content
      ? [{ id: 'legacy-1', x: 40, y: 40, text: notebook.content, color: '' }]
      : []);

  const strokes = notebook.strokes || [];
  const images = notebook.images || [];

  // Lock board size strictly to the visible container viewport (no vertical/horizontal page scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const nextW = Math.max(300, el.clientWidth);
      const nextH = Math.max(300, el.clientHeight);
      setBoardSize((prev) =>
        prev.width === nextW && prev.height === nextH ? prev : { width: nextW, height: nextH }
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSelectedStrokeIndices([]);
    setSelectedBoxIds([]);
    setSelectedImageIds([]);
    setMarquee(null);
    setSelectionDrag(null);
  }, [notebook.id, mode]);

  // Delete selected strokes, text boxes, or images
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (
          mode === 'select' &&
          (selectedStrokeIndices.length > 0 ||
            selectedBoxIds.length > 0 ||
            selectedImageIds.length > 0)
        ) {
          e.preventDefault();
          const nextStrokes = strokes.filter((_, idx) => !selectedStrokeIndices.includes(idx));
          const nextBoxes = textBoxes.filter((b) => !selectedBoxIds.includes(b.id));
          const nextImages = images.filter((img) => !selectedImageIds.includes(img.id));
          onUpdate({
            ...notebook,
            strokes: nextStrokes,
            textBoxes: nextBoxes,
            images: nextImages,
            content: '',
          });
          setSelectedStrokeIndices([]);
          setSelectedBoxIds([]);
          setSelectedImageIds([]);
        } else if (activeImageId) {
          e.preventDefault();
          const nextImages = images.filter((img) => img.id !== activeImageId);
          onUpdate({ ...notebook, images: nextImages });
          setActiveImageId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    selectedStrokeIndices,
    selectedBoxIds,
    selectedImageIds,
    activeImageId,
    strokes,
    textBoxes,
    images,
    notebook,
    onUpdate,
  ]);

  // Paste image directly from clipboard (Cmd/Ctrl + V)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items || !onInsertImageFile) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onInsertImageFile(file, 60, 60);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onInsertImageFile]);

  const getDisplayColor = useCallback(
    (color) => {
      if (isDark && color?.toLowerCase() === '#0f172a') return '#f8fafc';
      return color || '#0f172a';
    },
    [isDark]
  );

  const renderItem = useCallback(
    (ctx, item) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const tool = item.tool || 'pen';

      if (tool === 'eraser') {
        if (!item.points || item.points.length < 1) {
          ctx.restore();
          return;
        }
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = item.size;

        if (item.points.length === 1) {
          ctx.beginPath();
          ctx.arc(item.points[0].x, item.points[0].y, item.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(item.points[0].x, item.points[0].y);
          for (let i = 1; i < item.points.length; i++) {
            ctx.lineTo(item.points[i].x, item.points[i].y);
          }
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      if (tool === 'highlighter') {
        if (!item.points || item.points.length < 1) {
          ctx.restore();
          return;
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = item.color || '#fde047';
        ctx.fillStyle = item.color || '#fde047';
        ctx.lineWidth = item.size || 22;

        if (item.points.length === 1) {
          ctx.beginPath();
          ctx.arc(item.points[0].x, item.points[0].y, (item.size || 22) / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(item.points[0].x, item.points[0].y);
          for (let i = 1; i < item.points.length; i++) {
            ctx.lineTo(item.points[i].x, item.points[i].y);
          }
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      ctx.globalCompositeOperation = 'source-over';
      const color = getDisplayColor(item.color);
      ctx.strokeStyle = color;

      if (tool === 'pen') {
        if (!item.points || item.points.length < 2) {
          ctx.restore();
          return;
        }
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          const pt = item.points[i];
          ctx.lineWidth = item.size * (pt.pressure || 0.5) * 2;
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.restore();
        return;
      }

      if (!item.start || !item.end) {
        ctx.restore();
        return;
      }
      const { start, end } = item;
      ctx.lineWidth = item.size;
      ctx.beginPath();

      if (tool === 'line') {
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
      } else if (tool === 'rect') {
        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (tool === 'square') {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        ctx.rect(
          start.x,
          start.y,
          side * Math.sign(dx || 1),
          side * Math.sign(dy || 1)
        );
      } else if (tool === 'circle') {
        const radius = Math.hypot(end.x - start.x, end.y - start.y);
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      } else if (tool === 'triangle') {
        const topX = (start.x + end.x) / 2;
        ctx.moveTo(topX, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(start.x, end.y);
        ctx.closePath();
      }

      ctx.stroke();
      ctx.restore();
    },
    [getDisplayColor]
  );

  const redrawCanvas = useCallback(
    (previewItem = null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const item of strokes) {
        renderItem(ctx, item);
      }
      if (previewItem) {
        renderItem(ctx, previewItem);
      }
    },
    [strokes, renderItem]
  );

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas, boardSize.width, boardSize.height]);

  // Dragging Text Boxes (clamped inside visible viewport)
  useEffect(() => {
    if (!draggingBox) return;

    const handleWindowPointerMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxX = Math.max(8, rect.width - 120);
      const maxY = Math.max(8, rect.height - 48);
      const newX = Math.min(maxX, Math.max(8, e.clientX - rect.left - draggingBox.offsetX));
      const newY = Math.min(maxY, Math.max(8, e.clientY - rect.top - draggingBox.offsetY));

      const updatedBoxes = textBoxes.map((box) =>
        box.id === draggingBox.id ? { ...box, x: newX, y: newY } : box
      );
      onUpdate({ ...notebook, textBoxes: updatedBoxes, content: '' }, false);
    };

    const handleWindowPointerUp = () => {
      // Pointer moves are applied without history for smooth dragging. Commit one
      // undo snapshot only if the box actually moved.
      const originalBox = draggingBox.snapshotBoxes.find((box) => box.id === draggingBox.id);
      const currentBox = textBoxes.find((box) => box.id === draggingBox.id);
      if (originalBox && currentBox && (originalBox.x !== currentBox.x || originalBox.y !== currentBox.y)) {
        onUpdate(
          { ...notebook, textBoxes, content: '' },
          true,
          {
            strokes,
            textBoxes: draggingBox.snapshotBoxes,
            images,
            content: notebook.content || '',
          }
        );
      }
      setDraggingBox(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [draggingBox, textBoxes, strokes, images, notebook, onUpdate]);

  // Dragging Images (clamped inside visible viewport)
  useEffect(() => {
    if (!draggingImage) return;

    const handleWindowPointerMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxX = Math.max(8, rect.width - 60);
      const maxY = Math.max(8, rect.height - 60);
      const newX = Math.min(maxX, Math.max(8, e.clientX - rect.left - draggingImage.offsetX));
      const newY = Math.min(maxY, Math.max(8, e.clientY - rect.top - draggingImage.offsetY));

      const updatedImages = images.map((img) =>
        img.id === draggingImage.id ? { ...img, x: newX, y: newY } : img
      );
      onUpdate({ ...notebook, images: updatedImages }, false);
    };

    const handleWindowPointerUp = () => {
      if (draggingImage.snapshotImages) {
        onUpdate(
          { ...notebook, images },
          true,
          {
            strokes,
            textBoxes,
            images: draggingImage.snapshotImages,
            content: notebook.content || '',
          }
        );
      }
      setDraggingImage(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [draggingImage, images, strokes, textBoxes, notebook, onUpdate]);

  // Resizing Images (Aspect-Ratio Locked via Bottom-Right Handle)
  useEffect(() => {
    if (!resizingImage) return;

    const handleWindowPointerMove = (e) => {
      const dx = e.clientX - resizingImage.startX;
      const maxW = Math.max(120, boardSize.width - 32);
      const nextWidth = Math.max(60, Math.min(maxW, resizingImage.startWidth + dx));
      const nextHeight = Math.round(nextWidth / resizingImage.aspectRatio);

      const updatedImages = images.map((img) =>
        img.id === resizingImage.id
          ? { ...img, width: nextWidth, height: nextHeight }
          : img
      );
      onUpdate({ ...notebook, images: updatedImages }, false);
    };

    const handleWindowPointerUp = () => {
      onUpdate(
        { ...notebook, images },
        true,
        {
          strokes,
          textBoxes,
          images: resizingImage.snapshotImages,
          content: notebook.content || '',
        }
      );
      setResizingImage(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [resizingImage, images, strokes, textBoxes, boardSize.width, notebook, onUpdate]);

  // Drag-and-Drop Image Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer?.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0 || !onInsertImageFile) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dropX = Math.max(16, Math.min(rect.width - 120, e.clientX - rect.left));
    const dropY = Math.max(16, Math.min(rect.height - 120, e.clientY - rect.top));

    imageFiles.forEach((file, index) => {
      onInsertImageFile(file, dropX + index * 24, dropY + index * 24);
    });
  };

  const handleCanvasAreaClick = (e) => {
    if (e.target.closest('[data-imagebox="true"]')) return;
    setActiveImageId(null);

    if (mode !== 'type') return;
    if (e.target.closest('[data-textbox="true"]')) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(16, Math.min(rect.width - 220, e.clientX - rect.left - 8));
    const y = Math.max(16, Math.min(rect.height - 48, e.clientY - rect.top - 14));

    const nonEmptyBoxes = textBoxes.filter((b) => b.text.trim() !== '');
    const newBox = {
      id: `tb-${Date.now()}`,
      x,
      y,
      text: '',
      color: '',
    };

    onUpdate({
      ...notebook,
      textBoxes: [...nonEmptyBoxes, newBox],
      content: '',
    });
    setActiveBoxId(newBox.id);
  };

  const handleBoxTextChange = (id, newText) => {
    const updatedBoxes = textBoxes.map((box) =>
      box.id === id ? { ...box, text: newText } : box
    );
    onUpdate({ ...notebook, textBoxes: updatedBoxes, content: '' });
  };

  const handleBoxColorChange = (id, newColor) => {
    const updatedBoxes = textBoxes.map((box) =>
      box.id === id ? { ...box, color: newColor } : box
    );
    onUpdate({ ...notebook, textBoxes: updatedBoxes, content: '' });
  };

  const handleBoxBlur = (e, id) => {
    const parentBox = e.currentTarget.closest('[data-textbox="true"]');
    if (e.relatedTarget && parentBox && parentBox.contains(e.relatedTarget)) {
      return;
    }

    setActiveBoxId(null);
    const cleaned = textBoxes.filter((b) => b.id !== id || b.text.trim() !== '');
    if (cleaned.length !== textBoxes.length) {
      onUpdate({ ...notebook, textBoxes: cleaned, content: '' });
    }
  };

  const handleDeleteBox = (e, id) => {
    e.stopPropagation();
    const remaining = textBoxes.filter((b) => b.id !== id);
    onUpdate({ ...notebook, textBoxes: remaining, content: '' });
    if (activeBoxId === id) setActiveBoxId(null);
  };

  const startDraggingBox = (e, box) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    setDraggingBox({
      id: box.id,
      offsetX: pointerX - box.x,
      offsetY: pointerY - box.y,
      snapshotBoxes: textBoxes.map((item) => ({ ...item })),
    });
    setActiveBoxId(box.id);
  };

  const startDraggingImage = (e, img) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    setDraggingImage({
      id: img.id,
      offsetX: pointerX - img.x,
      offsetY: pointerY - img.y,
      snapshotImages: images,
    });
    setActiveImageId(img.id);
  };

  const startResizingImage = (e, img) => {
    e.stopPropagation();
    const w = img.width || 240;
    const h = img.height || 180;
    setResizingImage({
      id: img.id,
      startX: e.clientX,
      startWidth: w,
      aspectRatio: w / (h || 1),
      snapshotImages: images,
    });
    setActiveImageId(img.id);
  };

  const handleDeleteImage = (e, id) => {
    e.stopPropagation();
    const remaining = images.filter((img) => img.id !== id);
    onUpdate({ ...notebook, images: remaining });
    if (activeImageId === id) setActiveImageId(null);
  };

  const getSelectionGroupBounds = () => {
    const rects = [];
    selectedStrokeIndices.forEach((idx) => {
      if (strokes[idx]) {
        const b = getStrokeBounds(strokes[idx]);
        if (b) rects.push(b);
      }
    });
    selectedBoxIds.forEach((id) => {
      const box = textBoxes.find((b) => b.id === id);
      if (box) rects.push(getTextBoxBounds(box));
    });
    selectedImageIds.forEach((id) => {
      const img = images.find((im) => im.id === id);
      if (img) rects.push(getImageBounds(img));
    });
    if (rects.length === 0) return null;

    const minX = Math.min(...rects.map((r) => r.x));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxX = Math.max(...rects.map((r) => r.x + r.w));
    const maxY = Math.max(...rects.map((r) => r.y + r.h));
    return { x: minX - 4, y: minY - 4, w: maxX - minX + 8, h: maxY - minY + 8 };
  };

  const selectionBounds = mode === 'select' ? getSelectionGroupBounds() : null;

  const handlePointerDown = (e) => {
    if (mode !== 'draw' && mode !== 'select') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'select') {
      if (selectionBounds && pointInBox(x, y, selectionBounds)) {
        setSelectionDrag({
          lastX: x,
          lastY: y,
          snapshotStrokes: strokes,
          snapshotBoxes: textBoxes,
          snapshotImages: images,
          moved: false,
        });
        return;
      }

      for (let i = images.length - 1; i >= 0; i--) {
        const img = images[i];
        if (pointInBox(x, y, getImageBounds(img))) {
          setSelectedImageIds([img.id]);
          setSelectedBoxIds([]);
          setSelectedStrokeIndices([]);
          setActiveImageId(img.id);
          setSelectionDrag({
            lastX: x,
            lastY: y,
            snapshotStrokes: strokes,
            snapshotBoxes: textBoxes,
            snapshotImages: images,
            moved: false,
          });
          return;
        }
      }

      for (let i = textBoxes.length - 1; i >= 0; i--) {
        const box = textBoxes[i];
        if (pointInBox(x, y, getTextBoxBounds(box))) {
          setSelectedBoxIds([box.id]);
          setSelectedStrokeIndices([]);
          setSelectedImageIds([]);
          setSelectionDrag({
            lastX: x,
            lastY: y,
            snapshotStrokes: strokes,
            snapshotBoxes: textBoxes,
            snapshotImages: images,
            moved: false,
          });
          return;
        }
      }

      for (let i = strokes.length - 1; i >= 0; i--) {
        if ((strokes[i].tool || 'pen') === 'eraser') continue;
        const b = getStrokeBounds(strokes[i]);
        if (b && pointInBox(x, y, b)) {
          setSelectedStrokeIndices([i]);
          setSelectedBoxIds([]);
          setSelectedImageIds([]);
          setSelectionDrag({
            lastX: x,
            lastY: y,
            snapshotStrokes: strokes,
            snapshotBoxes: textBoxes,
            snapshotImages: images,
            moved: false,
          });
          return;
        }
      }

      setSelectedStrokeIndices([]);
      setSelectedBoxIds([]);
      setSelectedImageIds([]);
      setActiveImageId(null);
      setMarquee({ startX: x, startY: y, endX: x, endY: y });
      return;
    }

    setIsDrawing(true);

    if (drawTool === 'pen') {
      currentItem.current = {
        tool: 'pen',
        color: penColor,
        size: penSize,
        points: [{ x, y, pressure: e.pressure || 0.5 }],
      };
    } else if (drawTool === 'highlighter') {
      currentItem.current = {
        tool: 'highlighter',
        color: highlighterColor,
        size: highlighterSize,
        points: [{ x, y }],
      };
      redrawCanvas(currentItem.current);
    } else if (drawTool === 'eraser') {
      currentItem.current = {
        tool: 'eraser',
        size: eraserSize,
        points: [{ x, y }],
      };
      const ctx = canvasRef.current.getContext('2d');
      renderItem(ctx, currentItem.current);
    } else {
      currentItem.current = {
        tool: drawTool,
        color: penColor,
        size: penSize,
        start: { x, y },
        end: { x, y },
      };
    }
  };

  const handlePointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'select') {
      if (selectionDrag) {
        const dx = x - selectionDrag.lastX;
        const dy = y - selectionDrag.lastY;
        if (dx === 0 && dy === 0) return;

        const nextStrokes = strokes.map((item, idx) =>
          selectedStrokeIndices.includes(idx) ? translateStroke(item, dx, dy) : item
        );
        const nextBoxes = textBoxes.map((box) =>
          selectedBoxIds.includes(box.id)
            ? {
                ...box,
                x: Math.min(boardSize.width - 100, Math.max(8, box.x + dx)),
                y: Math.min(boardSize.height - 40, Math.max(8, box.y + dy)),
              }
            : box
        );
        const nextImages = images.map((img) =>
          selectedImageIds.includes(img.id)
            ? {
                ...img,
                x: Math.min(boardSize.width - 60, Math.max(8, img.x + dx)),
                y: Math.min(boardSize.height - 60, Math.max(8, img.y + dy)),
              }
            : img
        );

        setSelectionDrag((prev) => ({ ...prev, lastX: x, lastY: y, moved: true }));
        onUpdate(
          { ...notebook, strokes: nextStrokes, textBoxes: nextBoxes, images: nextImages, content: '' },
          false
        );
        return;
      }

      if (marquee) {
        setMarquee((prev) => ({ ...prev, endX: x, endY: y }));
      }
      return;
    }

    if (mode !== 'draw') return;

    if (drawTool === 'eraser') {
      setEraserCursor({ x, y });
    } else if (eraserCursor) {
      setEraserCursor(null);
    }

    if (!isDrawing || !currentItem.current) return;

    if (currentItem.current.tool === 'pen') {
      const point = { x, y, pressure: e.pressure || 0.5 };
      currentItem.current.points.push(point);

      const ctx = canvasRef.current.getContext('2d');
      const pts = currentItem.current.points;
      const prev = pts[pts.length - 2];
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getDisplayColor(currentItem.current.color);
      ctx.lineWidth = currentItem.current.size * point.pressure * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    } else if (currentItem.current.tool === 'highlighter') {
      currentItem.current.points.push({ x, y });
      redrawCanvas(currentItem.current);
    } else if (currentItem.current.tool === 'eraser') {
      const point = { x, y };
      currentItem.current.points.push(point);

      const ctx = canvasRef.current.getContext('2d');
      const pts = currentItem.current.points;
      const prev = pts[pts.length - 2];
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = currentItem.current.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    } else {
      currentItem.current.end = { x, y };
      redrawCanvas(currentItem.current);
    }
  };

  const handlePointerUp = () => {
    if (mode === 'select') {
      if (selectionDrag) {
        if (selectionDrag.moved) {
          onUpdate(
            { ...notebook, strokes, textBoxes, images, content: '' },
            true,
            {
              strokes: selectionDrag.snapshotStrokes,
              textBoxes: selectionDrag.snapshotBoxes,
              images: selectionDrag.snapshotImages,
            }
          );
        }
        setSelectionDrag(null);
      }

      if (marquee) {
        const selRect = {
          x: Math.min(marquee.startX, marquee.endX),
          y: Math.min(marquee.startY, marquee.endY),
          w: Math.abs(marquee.endX - marquee.startX),
          h: Math.abs(marquee.endY - marquee.startY),
        };

        if (selRect.w > 4 || selRect.h > 4) {
          const hitStrokes = [];
          strokes.forEach((item, idx) => {
            if ((item.tool || 'pen') === 'eraser') return;
            const b = getStrokeBounds(item);
            if (b && boxesIntersect(selRect, b)) hitStrokes.push(idx);
          });

          const hitBoxes = [];
          textBoxes.forEach((box) => {
            if (boxesIntersect(selRect, getTextBoxBounds(box))) hitBoxes.push(box.id);
          });

          const hitImages = [];
          images.forEach((img) => {
            if (boxesIntersect(selRect, getImageBounds(img))) hitImages.push(img.id);
          });

          setSelectedStrokeIndices(hitStrokes);
          setSelectedBoxIds(hitBoxes);
          setSelectedImageIds(hitImages);
        }
        setMarquee(null);
      }
      return;
    }

    if (!isDrawing || !currentItem.current) return;
    setIsDrawing(false);

    const item = currentItem.current;
    const isValidPen = item.tool === 'pen' && item.points?.length > 1;
    const isValidHighlighter = item.tool === 'highlighter' && item.points?.length >= 1;
    const isValidEraser = item.tool === 'eraser' && item.points?.length >= 1;
    const isValidShape =
      item.tool !== 'pen' &&
      item.tool !== 'highlighter' &&
      item.tool !== 'eraser' &&
      item.start &&
      item.end &&
      (Math.abs(item.end.x - item.start.x) > 2 ||
        Math.abs(item.end.y - item.start.y) > 2);

    if (isValidPen || isValidHighlighter || isValidEraser || isValidShape) {
      onUpdate({
        ...notebook,
        strokes: [...strokes, item],
      });
      if (onStrokeCommit && item.tool !== 'eraser' && item.tool !== 'highlighter') {
        onStrokeCommit(item.color);
      }
    } else {
      redrawCanvas();
    }
    currentItem.current = null;
  };

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasAreaClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex-1 overflow-hidden bg-transparent ${
        mode === 'type' ? 'cursor-text' : ''
      } ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
    >
      {/* Drag-and-Drop Overlay Indicator */}
      {isDragOver && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-indigo-600/15 backdrop-blur-[1px] border-4 border-dashed border-indigo-500 m-3 rounded-2xl">
          <div
            className={`px-6 py-4 rounded-xl shadow-xl font-semibold text-base ${
              isDark ? 'bg-slate-900 text-indigo-300' : 'bg-white text-indigo-600'
            }`}
          >
            Drop image anywhere on the page
          </div>
        </div>
      )}

      <div className="relative w-full h-full overflow-hidden">
        {textBoxes.length === 0 && images.length === 0 && mode === 'type' && (
          <div className="pointer-events-none select-none p-10 text-sm opacity-40">
            Click anywhere to type, or drag &amp; drop / paste an image...
          </div>
        )}

        {/* Floating Resizable Images Layer */}
        {images.map((img) => {
          const isSelected =
            activeImageId === img.id || selectedImageIds.includes(img.id);
          const canInteractWithImage = mode === 'type' || mode === 'select';

          return (
            <div
              key={img.id}
              data-imagebox="true"
              style={{
                left: `${img.x}px`,
                top: `${img.y}px`,
                width: `${img.width}px`,
                height: `${img.height}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (canInteractWithImage) setActiveImageId(img.id);
              }}
              className={`absolute group rounded-lg select-none ${
                canInteractWithImage ? 'pointer-events-auto' : 'pointer-events-none'
              } ${
                isSelected
                  ? 'ring-2 ring-indigo-500 z-12'
                  : 'hover:ring-1 hover:ring-indigo-400/60 z-5'
              }`}
            >
              <img
                src={img.src}
                alt={img.name || 'Note attachment'}
                draggable={false}
                onPointerDown={(e) => {
                  if (canInteractWithImage) startDraggingImage(e, img);
                }}
                className={`w-full h-full object-contain rounded-lg block ${
                  canInteractWithImage ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
              />

              {canInteractWithImage && (
                <div
                  className={`absolute -top-7 left-0 right-0 flex items-center justify-between px-1.5 py-0.5 rounded-t-md text-xs transition-opacity ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  } ${
                    isDark
                      ? 'bg-slate-800/95 text-slate-300'
                      : 'bg-slate-200/95 text-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onPointerDown={(e) => startDraggingImage(e, img)}
                    title="Drag to move image"
                    className="cursor-grab active:cursor-grabbing p-0.5 hover:text-indigo-500 flex items-center gap-1"
                  >
                    <GripHorizontal size={13} />
                    <span className="text-[10px] font-mono opacity-75">
                      {Math.round(img.width)}×{Math.round(img.height)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteImage(e, img.id)}
                    title="Delete image"
                    className="p-0.5 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {canInteractWithImage && (
                <button
                  type="button"
                  onPointerDown={(e) => startResizingImage(e, img)}
                  title="Drag to resize image"
                  className={`absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-indigo-600 text-white shadow-md flex items-center justify-center cursor-nwse-resize transition-opacity ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Maximize2 size={11} className="rotate-90" />
                </button>
              )}
            </div>
          );
        })}

        {/* Floating Positioned Text Boxes */}
        {textBoxes.map((box) => {
          const isFocused = activeBoxId === box.id;
          const lineCount = Math.max(1, box.text.split('\n').length);
          const defaultTextSwatch = isDark ? '#f1f5f9' : '#1e293b';

          return (
            <div
              key={box.id}
              data-textbox="true"
              style={{ left: `${box.x}px`, top: `${box.y}px` }}
              onClick={(e) => {
                e.stopPropagation();
                if (mode === 'type') setActiveBoxId(box.id);
              }}
              className={`absolute group rounded-lg transition-shadow ${
                mode === 'type' ? 'pointer-events-auto' : 'pointer-events-none'
              } ${
                isFocused
                  ? 'ring-1 ring-indigo-500/70 bg-indigo-500/[0.03] z-20'
                  : 'hover:ring-1 hover:ring-slate-400/40 z-10'
              }`}
            >
              {mode === 'type' && (
                <div
                  className={`flex items-center justify-between gap-2 px-1.5 py-1 rounded-t-md text-xs transition-opacity ${
                    isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  } ${
                    isDark
                      ? 'bg-slate-800/95 text-slate-400'
                      : 'bg-slate-200/90 text-slate-600'
                  }`}
                >
                  <button
                    type="button"
                    onPointerDown={(e) => startDraggingBox(e, box)}
                    title="Drag to move text"
                    className="cursor-grab active:cursor-grabbing p-0.5 hover:text-indigo-500 shrink-0"
                  >
                    <GripHorizontal size={13} />
                  </button>

                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-center gap-1"
                  >
                    {TEXT_COLOR_PRESETS.map((preset) => {
                      const swatchColor = preset.value || defaultTextSwatch;
                      const isSelected = (box.color || '') === preset.value;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBoxColorChange(box.id, preset.value);
                          }}
                          style={{ backgroundColor: swatchColor }}
                          title={preset.label}
                          className={`w-3.5 h-3.5 rounded-full border border-black/20 transition-transform ${
                            isSelected ? 'scale-125 ring-1 ring-indigo-500' : 'hover:scale-110'
                          }`}
                        />
                      );
                    })}

                    <label
                      title="Custom text color"
                      style={{
                        background:
                          'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)',
                      }}
                      className="w-3.5 h-3.5 rounded-full cursor-pointer hover:scale-110 transition-transform ml-0.5 ring-1 ring-black/20"
                    >
                      <input
                        type="color"
                        value={box.color || defaultTextSwatch}
                        onChange={(e) => handleBoxColorChange(box.id, e.target.value)}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteBox(e, box.id)}
                    title="Delete text box"
                    className="p-0.5 hover:text-red-500 shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <textarea
                autoFocus={isFocused}
                rows={lineCount}
                value={box.text}
                onFocus={() => setActiveBoxId(box.id)}
                onBlur={(e) => handleBoxBlur(e, box.id)}
                onChange={(e) => handleBoxTextChange(box.id, e.target.value)}
                placeholder="Type here..."
                style={{
                  width: `${Math.min(600, Math.max(210, box.text.length * 9 + 40))}px`,
                  color: box.color || 'inherit',
                }}
                className="px-2.5 py-1.5 text-base leading-6 bg-transparent resize focus:outline-none block"
              />
            </div>
          );
        })}

        {/* Fixed-Viewport Canvas Layer */}
        <canvas
          ref={canvasRef}
          width={boardSize.width}
          height={boardSize.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => setEraserCursor(null)}
          className={`absolute top-0 left-0 touch-none z-15 ${
            mode === 'draw'
              ? drawTool === 'eraser'
                ? 'pointer-events-auto cursor-none'
                : 'pointer-events-auto cursor-crosshair'
              : mode === 'select'
              ? 'pointer-events-auto cursor-default'
              : 'pointer-events-none'
          }`}
        />

        {/* Selection Bounding Box Overlay */}
        {mode === 'select' && selectionBounds && (
          <div
            style={{
              left: `${selectionBounds.x}px`,
              top: `${selectionBounds.y}px`,
              width: `${selectionBounds.w}px`,
              height: `${selectionBounds.h}px`,
            }}
            className="pointer-events-none absolute border-2 border-dashed border-indigo-500 bg-indigo-500/10 rounded-md z-25"
          >
            <span className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow">
              Drag to move • Del to delete
            </span>
          </div>
        )}

        {/* Drag Marquee Selection Rectangle */}
        {mode === 'select' && marquee && (
          <div
            style={{
              left: `${Math.min(marquee.startX, marquee.endX)}px`,
              top: `${Math.min(marquee.startY, marquee.endY)}px`,
              width: `${Math.abs(marquee.endX - marquee.startX)}px`,
              height: `${Math.abs(marquee.endY - marquee.startY)}px`,
            }}
            className="pointer-events-none absolute border border-indigo-500 bg-indigo-500/15 z-25"
          />
        )}

        {/* Live Circular Eraser Size Ring Preview */}
        {mode === 'draw' && drawTool === 'eraser' && eraserCursor && (
          <div
            style={{
              left: `${eraserCursor.x - eraserSize / 2}px`,
              top: `${eraserCursor.y - eraserSize / 2}px`,
              width: `${eraserSize}px`,
              height: `${eraserSize}px`,
            }}
            className={`pointer-events-none absolute rounded-full border z-30 ${
              isDark
                ? 'border-slate-300 bg-white/10'
                : 'border-slate-700 bg-black/5'
            }`}
          />
        )}
      </div>
    </div>
  );
}

export default NoteEditor;