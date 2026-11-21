import { jsPDF } from 'jspdf';

const EXPORT_THEMES = {
  light: { bg: '#ffffff', text: '#1e293b', defaultInk: '#0f172a' },
  dark: { bg: '#0f172a', text: '#f1f5f9', defaultInk: '#f8fafc' },
};

function computeExportBounds(pageData) {
  let width = 1200;
  let height = 1200;

  const boxes =
    pageData.textBoxes ||
    (pageData.content ? [{ x: 40, y: 40, text: pageData.content }] : []);

  for (const box of boxes) {
    if (box.x + 620 > width) width = Math.ceil(box.x + 620);
    if (box.y + 200 > height) height = Math.ceil(box.y + 200);
  }

  for (const img of pageData.images || []) {
    const right = (img.x || 0) + (img.width || 240) + 60;
    const bottom = (img.y || 0) + (img.height || 180) + 60;
    if (right > width) width = Math.ceil(right);
    if (bottom > height) height = Math.ceil(bottom);
  }

  for (const item of pageData.strokes || []) {
    if (item.points) {
      for (const pt of item.points) {
        if (pt.x + 60 > width) width = Math.ceil(pt.x + 60);
        if (pt.y + 60 > height) height = Math.ceil(pt.y + 60);
      }
    }
    if (item.start && item.end) {
      const maxX = Math.max(item.start.x, item.end.x) + 150;
      const maxY = Math.max(item.start.y, item.end.y) + 150;
      if (maxX > width) width = Math.ceil(maxX);
      if (maxY > height) height = Math.ceil(maxY);
    }
  }

  return { width, height };
}

function loadImageElement(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderPageCanvas(pageData, theme = 'light') {
  const palette = theme === 'dark' ? EXPORT_THEMES.dark : EXPORT_THEMES.light;
  const { width, height } = computeExportBounds(pageData);
  const lineHeight = 24;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d');

  // 1. Background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  // 2. Embedded Images (drawn beneath text & ink)
  for (const imgItem of pageData.images || []) {
    if (!imgItem.src) continue;
    const loaded = await loadImageElement(imgItem.src);
    if (loaded) {
      ctx.drawImage(
        loaded,
        imgItem.x || 0,
        imgItem.y || 0,
        imgItem.width || loaded.naturalWidth,
        imgItem.height || loaded.naturalHeight
      );
    }
  }

  // 3. Positioned Text Boxes
  ctx.font = '16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'top';

  const boxes =
    pageData.textBoxes ||
    (pageData.content ? [{ x: 40, y: 40, text: pageData.content, color: '' }] : []);

  for (const box of boxes) {
    if (!box.text) continue;
    ctx.fillStyle = box.color || palette.text;
    const lines = box.text.split('\n');
    let cursorY = box.y + 22;

    for (const line of lines) {
      ctx.fillText(line, box.x + 10, cursorY);
      cursorY += lineHeight;
    }
  }

  // 4. Ink, Highlighter, Shapes & Eraser Layer
  const inkLayer = document.createElement('canvas');
  inkLayer.width = width;
  inkLayer.height = height;
  const inkCtx = inkLayer.getContext('2d');
  inkCtx.lineCap = 'round';
  inkCtx.lineJoin = 'round';

  for (const item of pageData.strokes || []) {
    const tool = item.tool || 'pen';

    if (tool === 'eraser') {
      if (!item.points || item.points.length < 1) continue;
      inkCtx.save();
      inkCtx.globalCompositeOperation = 'destination-out';
      inkCtx.strokeStyle = 'rgba(0,0,0,1)';
      inkCtx.fillStyle = 'rgba(0,0,0,1)';
      inkCtx.lineWidth = item.size;

      if (item.points.length === 1) {
        inkCtx.beginPath();
        inkCtx.arc(item.points[0].x, item.points[0].y, item.size / 2, 0, Math.PI * 2);
        inkCtx.fill();
      } else {
        inkCtx.beginPath();
        inkCtx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          inkCtx.lineTo(item.points[i].x, item.points[i].y);
        }
        inkCtx.stroke();
      }
      inkCtx.restore();
      continue;
    }

    if (tool === 'highlighter') {
      if (!item.points || item.points.length < 1) continue;
      inkCtx.save();
      inkCtx.globalCompositeOperation = 'source-over';
      inkCtx.globalAlpha = 0.35;
      inkCtx.strokeStyle = item.color || '#fde047';
      inkCtx.fillStyle = item.color || '#fde047';
      inkCtx.lineWidth = item.size || 22;

      if (item.points.length === 1) {
        inkCtx.beginPath();
        inkCtx.arc(item.points[0].x, item.points[0].y, (item.size || 22) / 2, 0, Math.PI * 2);
        inkCtx.fill();
      } else {
        inkCtx.beginPath();
        inkCtx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          inkCtx.lineTo(item.points[i].x, item.points[i].y);
        }
        inkCtx.stroke();
      }
      inkCtx.restore();
      continue;
    }

    inkCtx.save();
    inkCtx.globalCompositeOperation = 'source-over';
    inkCtx.strokeStyle = item.color === '#0f172a' ? palette.defaultInk : item.color;

    if (tool === 'pen') {
      if (!item.points || item.points.length < 2) {
        inkCtx.restore();
        continue;
      }
      inkCtx.beginPath();
      inkCtx.moveTo(item.points[0].x, item.points[0].y);
      for (let i = 1; i < item.points.length; i++) {
        const pt = item.points[i];
        inkCtx.lineWidth = item.size * (pt.pressure || 0.5) * 2;
        inkCtx.lineTo(pt.x, pt.y);
      }
      inkCtx.stroke();
    } else if (item.start && item.end) {
      const { start, end } = item;
      inkCtx.lineWidth = item.size;
      inkCtx.beginPath();

      if (tool === 'line') {
        inkCtx.moveTo(start.x, start.y);
        inkCtx.lineTo(end.x, end.y);
      } else if (tool === 'rect') {
        inkCtx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (tool === 'square') {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        inkCtx.rect(
          start.x,
          start.y,
          side * Math.sign(dx || 1),
          side * Math.sign(dy || 1)
        );
      } else if (tool === 'circle') {
        const radius = Math.hypot(end.x - start.x, end.y - start.y);
        inkCtx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      } else if (tool === 'triangle') {
        inkCtx.moveTo((start.x + end.x) / 2, start.y);
        inkCtx.lineTo(end.x, end.y);
        inkCtx.lineTo(start.x, end.y);
        inkCtx.closePath();
      }
      inkCtx.stroke();
    }
    inkCtx.restore();
  }

  ctx.drawImage(inkLayer, 0, 0);
  return exportCanvas;
}

function getNotebookPages(notebook) {
  if (Array.isArray(notebook.pages) && notebook.pages.length > 0) {
    return notebook.pages;
  }
  return [notebook];
}

function sanitizeFilename(title) {
  return (title || 'notebook').replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

export async function exportAsPNG(notebook, theme = 'light') {
  const pages = getNotebookPages(notebook);
  const pageIndex = Math.min(
    Math.max(0, notebook.activePageIndex || 0),
    pages.length - 1
  );
  const canvas = await renderPageCanvas(pages[pageIndex], theme);
  const link = document.createElement('a');
  const suffix = pages.length > 1 ? `_page_${pageIndex + 1}` : '';
  link.download = `${sanitizeFilename(notebook.title)}${suffix}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportAsPDF(notebook, theme = 'light') {
  const pages = getNotebookPages(notebook);
  let pdf = null;

  for (let idx = 0; idx < pages.length; idx++) {
    const canvas = await renderPageCanvas(pages[idx], theme);
    const imgData = canvas.toDataURL('image/png');
    const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';

    if (idx === 0) {
      pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
    } else {
      pdf.addPage([canvas.width, canvas.height], orientation);
    }

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  }

  if (pdf) {
    pdf.save(`${sanitizeFilename(notebook.title)}.pdf`);
  }
}