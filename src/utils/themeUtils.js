function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/**
 * Smoothly interpolates every UI surface, control pill, and button color
 * across the 0–100 slider (0 = Crisp Light, 50 = Warm Sepia, 100 = Deep Dark).
 */
export function getThemePalette(level) {
  const clamped = Math.min(100, Math.max(0, Number(level) || 0));
  const isDark = clamped >= 65;

  let paperBg,
    paperText,
    headerBg,
    headerBorder,
    controlBg,
    controlBorder,
    controlActiveBg,
    controlActiveText,
    controlMutedText,
    clearBg,
    clearBorder,
    clearText,
    sidebarBg,
    sidebarBorder,
    sidebarText,
    sidebarMutedText,
    defaultInk;

  if (clamped <= 50) {
    const t = clamped / 50;
    paperBg = lerpColor('#ffffff', '#fbf5e9', t);
    paperText = lerpColor('#1e293b', '#3d3122', t);
    headerBg = lerpColor('#ffffff', '#f3ead8', t);
    headerBorder = lerpColor('#e2e8f0', '#e2d4b7', t);

    // Toolbar pills & active tabs
    controlBg = lerpColor('#f1f5f9', '#e8dcc4', t);
    controlBorder = lerpColor('#e2e8f0', '#d8c8a8', t);
    controlActiveBg = lerpColor('#ffffff', '#fbf5e9', t);
    controlActiveText = lerpColor('#4f46e5', '#78350f', t);
    controlMutedText = lerpColor('#475569', '#6b5842', t);

    // Clear button
    clearBg = lerpColor('#fef2f2', '#f7e4d4', t);
    clearBorder = lerpColor('#fecaca', '#e5c1a7', t);
    clearText = lerpColor('#dc2626', '#b91c1c', t);

    // Sidebar
    sidebarBg = lerpColor('#f8fafc', '#efe4ce', t);
    sidebarBorder = lerpColor('#e2e8f0', '#dfd0b2', t);
    sidebarText = lerpColor('#0f172a', '#3d3122', t);
    sidebarMutedText = lerpColor('#64748b', '#7c6850', t);

    defaultInk = '#0f172a';
  } else {
    const t = (clamped - 50) / 50;
    paperBg = lerpColor('#fbf5e9', '#0f172a', t);
    paperText = lerpColor('#3d3122', '#f1f5f9', t);
    headerBg = lerpColor('#f3ead8', '#020617', t);
    headerBorder = lerpColor('#e2d4b7', '#1e293b', t);

    // Toolbar pills & active tabs
    controlBg = lerpColor('#e8dcc4', '#0f172a', t);
    controlBorder = lerpColor('#d8c8a8', '#1e293b', t);
    controlActiveBg = lerpColor('#fbf5e9', '#1e293b', t);
    controlActiveText = lerpColor('#78350f', '#818cf8', t);
    controlMutedText = lerpColor('#6b5842', '#94a3b8', t);

    // Clear button
    clearBg = lerpColor('#f7e4d4', '#1e1018', t);
    clearBorder = lerpColor('#e5c1a7', '#7f1d1d', t);
    clearText = lerpColor('#b91c1c', '#f87171', t);

    // Sidebar
    sidebarBg = lerpColor('#efe4ce', '#090d16', t);
    sidebarBorder = lerpColor('#dfd0b2', '#1e293b', t);
    sidebarText = lerpColor('#3d3122', '#f1f5f9', t);
    sidebarMutedText = lerpColor('#7c6850', '#94a3b8', t);

    defaultInk = isDark ? '#f8fafc' : '#0f172a';
  }

  return {
    level: clamped,
    isDark,
    paperBg,
    paperText,
    headerBg,
    headerBorder,
    controlBg,
    controlBorder,
    controlActiveBg,
    controlActiveText,
    controlMutedText,
    clearBg,
    clearBorder,
    clearText,
    sidebarBg,
    sidebarBorder,
    sidebarText,
    sidebarMutedText,
    defaultInk,
  };
}