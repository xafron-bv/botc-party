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
  const full = String(labelText || '');
  text.style.fontSize = '12.5px';
  text.style.letterSpacing = '2px';
  text.removeAttribute('lengthAdjust');
  textPath.textContent = full;
  text.appendChild(textPath);
  svg.appendChild(text);
  return svg;
}

export function createDeathRibbonSvg({ highlightNightKill = false } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 140');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.pointerEvents = 'none';
  if (highlightNightKill) {
    svg.classList.add('night-kill-pending');
  }
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  const patternId = highlightNightKill ? 'deathPatternNight' : 'deathPattern';
  pattern.setAttribute('id', patternId);
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  pattern.setAttribute('width', highlightNightKill ? '14' : '12');
  pattern.setAttribute('height', highlightNightKill ? '14' : '12');
  if (highlightNightKill) {
    pattern.setAttribute('patternTransform', 'rotate(45)');
  }
  const pbg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  pbg.setAttribute('width', highlightNightKill ? '14' : '12');
  pbg.setAttribute('height', highlightNightKill ? '14' : '12');
  pbg.setAttribute('fill', highlightNightKill ? '#0d0d10' : '#0f0f10');
  const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p1.setAttribute('d', 'M0 12 L12 0 M-3 9 L3 3 M9 15 L15 9');
  p1.setAttribute('stroke', highlightNightKill ? '#3e3f45' : '#1b1b1d');
  p1.setAttribute('stroke-width', highlightNightKill ? '3' : '2');
  let accent = null;
  if (highlightNightKill) {
    accent = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    accent.setAttribute('d', 'M0 0 L12 12 M-3 -3 L3 3 M9 9 L15 15');
    accent.setAttribute('stroke', '#6e6f75');
    accent.setAttribute('stroke-width', '1.6');
    accent.setAttribute('opacity', '0.55');
  }
  defs.appendChild(pattern);
  pattern.appendChild(pbg);
  if (accent) {
    pattern.appendChild(accent);
  }
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
  rect.setAttribute('fill', `url(#${patternId})`);
  rect.setAttribute('stroke', '#000');
  rect.setAttribute('stroke-width', '6');
  rect.setAttribute('pointer-events', 'visiblePainted');

  // Two separate true right triangles (90°) under the rectangle:
  // Each triangle has a right angle formed by the rectangle bottom horizontal (y=88) and a vertical leg.
  // Geometry choices:
  //  - Maintain a 6px gap: inner vertical edges at x=47 and x=53.
  //  - Depth: 24px (bottom y=112) for a slightly shorter drop.
  // Left triangle vertices: (22,88) -> (47,88) -> (22,112).
  //   Right angle at (22,88) (vertical leg down to (22,112), horizontal leg to (47,88)).
  // Right triangle vertices: (53,88) -> (78,88) -> (78,112).
  //   Right angle at (78,88) (vertical leg down to (78,112), horizontal leg to (53,88)).
  const notchGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const leftTri = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  leftTri.setAttribute('d', [
    'M22 88',    // right angle
    'L47 88',    // along top
    'L22 112',   // down vertical leg
    'Z'
  ].join(' '));
  const rightTri = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  rightTri.setAttribute('d', [
    'M53 88',    // along top
    'L78 88',    // right angle
    'L78 112',   // down vertical leg
    'Z'
  ].join(' '));
  [leftTri, rightTri].forEach(tri => {
    tri.setAttribute('fill', `url(#${patternId})`);
    tri.setAttribute('stroke', '#000');
    tri.setAttribute('stroke-width', '6');
    tri.setAttribute('pointer-events', 'visiblePainted');
    notchGroup.appendChild(tri);
  });

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
  svg.appendChild(notchGroup);
  svg.appendChild(shadow);
  return svg;
}

export function createDeathVoteIndicatorSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.classList.add('death-vote-indicator');

  // Create circle background
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '50');
  circle.setAttribute('cy', '50');
  circle.setAttribute('r', '40');
  circle.setAttribute('fill', '#8B0000');
  circle.setAttribute('stroke', '#000');
  circle.setAttribute('stroke-width', '4');

  // Create vote symbol (checkmark)
  const checkmark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  checkmark.setAttribute('d', 'M 25 50 L 40 65 L 75 30');
  checkmark.setAttribute('fill', 'none');
  checkmark.setAttribute('stroke', '#FFF');
  checkmark.setAttribute('stroke-width', '8');
  checkmark.setAttribute('stroke-linecap', 'round');
  checkmark.setAttribute('stroke-linejoin', 'round');

  svg.appendChild(circle);
  svg.appendChild(checkmark);
  return svg;
}
