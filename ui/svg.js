// SVG helpers for curved text labels and death ribbon (browser-native ES module)

export function createCurvedLabelSvg(uniqueId, labelText) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.classList.add('icon-reminder-svg');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('id', uniqueId);
  // Perfect bottom half-circle inside the token rim
  path.setAttribute('d', 'M10,50 A40,40 0 0,0 90,50');
  defs.appendChild(path);
  svg.appendChild(defs);
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('class', 'icon-reminder-text');
  text.setAttribute('text-anchor', 'middle');
  const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
  textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${uniqueId}`);
  textPath.setAttribute('startOffset', '50%');
  // Truncate display on token to avoid overcrowding, but keep tooltip full
  const full = String(labelText || '');
  const maxChars = 14;
  const display = full.length > maxChars ? full.slice(0, maxChars - 1) + '…' : full;
  const len = display.length;
  // Dynamic font size based on length
  let fontSize = 12;
  if (len > 12 && len <= 16) fontSize = 11.5;
  else if (len > 16) fontSize = 11;
  text.style.fontSize = `${fontSize}px`;
  // For short labels, do NOT stretch spacing (prevents "h     i" look)
  // Only force-fit very long labels to avoid overflow
  if (len >= 10) {
    text.style.letterSpacing = '0.1px';
    text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    const targetLength = 92; // visual arc length
    textPath.setAttribute('textLength', String(targetLength));
  }
  textPath.textContent = display;
  text.appendChild(textPath);
  svg.appendChild(text);
  return svg;
}

export function createDeathRibbonSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 140');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.pointerEvents = 'none';
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  pattern.setAttribute('id', 'deathPattern');
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  pattern.setAttribute('width', '12');
  pattern.setAttribute('height', '12');
  const pbg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  pbg.setAttribute('width', '12');
  pbg.setAttribute('height', '12');
  pbg.setAttribute('fill', '#0f0f10');
  const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p1.setAttribute('d', 'M0 12 L12 0 M-3 9 L3 3 M9 15 L15 9');
  p1.setAttribute('stroke', '#1b1b1d');
  p1.setAttribute('stroke-width', '2');
  defs.appendChild(pattern);
  pattern.appendChild(pbg);
  pattern.appendChild(p1);
  svg.appendChild(defs);

  // Main banner
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '22');
  rect.setAttribute('y', '0');
  rect.setAttribute('rx', '6');
  rect.setAttribute('ry', '6');
  rect.setAttribute('width', '56');
  rect.setAttribute('height', '88');
  rect.setAttribute('fill', 'url(#deathPattern)');
  rect.setAttribute('stroke', '#000');
  rect.setAttribute('stroke-width', '6');
  rect.setAttribute('pointer-events', 'visiblePainted');

  // Notch
  const notch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  notch.setAttribute('d', 'M22 88 L50 120 L78 88 Z');
  notch.setAttribute('fill', 'url(#deathPattern)');
  notch.setAttribute('stroke', '#000');
  notch.setAttribute('stroke-width', '6');
  notch.setAttribute('pointer-events', 'visiblePainted');

  // Subtle inner shadow
  const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  shadow.setAttribute('x', '26');
  shadow.setAttribute('y', '4');
  shadow.setAttribute('rx', '6');
  shadow.setAttribute('ry', '6');
  shadow.setAttribute('width', '48');
  shadow.setAttribute('height', '78');
  shadow.setAttribute('fill', 'rgba(255,255,255,0.03)');
  shadow.setAttribute('pointer-events', 'none');

  svg.appendChild(rect);
  svg.appendChild(notch);
  svg.appendChild(shadow);
  return svg;
}

