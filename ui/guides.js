// Radial guides overlay helpers (browser-native ES module)

export function ensureGuidesSvg() {
  const circleEl = document.getElementById('player-circle');
  if (!circleEl) return null;
  let svg = circleEl.querySelector('#radial-guides');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'radial-guides');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '-1';
    // Insert behind token <li> elements
    if (circleEl.firstChild) {
      circleEl.insertBefore(svg, circleEl.firstChild);
    } else {
      circleEl.appendChild(svg);
    }
  }
  return svg;
}

export function drawRadialGuides() {
  const circleEl = document.getElementById('player-circle');
  if (!circleEl) return;
  const svg = ensureGuidesSvg();
  if (!svg) return;

  const width = circleEl.offsetWidth || 0;
  const height = circleEl.offsetHeight || 0;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Clear previous
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // Center point
  const cx = width / 2;
  const cy = height / 2;

  // Add subtle center mark
  const centerOuter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  centerOuter.setAttribute('cx', String(cx));
  centerOuter.setAttribute('cy', String(cy));
  centerOuter.setAttribute('r', '10');
  centerOuter.setAttribute('fill', 'rgba(0,0,0,0.35)');
  centerOuter.setAttribute('stroke', '#D4AF37');
  centerOuter.setAttribute('stroke-width', '2');
  svg.appendChild(centerOuter);

  const centerInner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  centerInner.setAttribute('cx', String(cx));
  centerInner.setAttribute('cy', String(cy));
  centerInner.setAttribute('r', '3');
  centerInner.setAttribute('fill', '#D4AF37');
  svg.appendChild(centerInner);

  // Lines to each token
  const containerRect = circleEl.getBoundingClientRect();
  const lis = circleEl.querySelectorAll('li');
  lis.forEach((li) => {
    const token = li.querySelector('.player-token');
    const rect = token ? token.getBoundingClientRect() : li.getBoundingClientRect();
    const tx = rect.left - containerRect.left + rect.width / 2;
    const ty = rect.top - containerRect.top + rect.height / 2;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(cx));
    line.setAttribute('y1', String(cy));
    line.setAttribute('x2', String(tx));
    line.setAttribute('y2', String(ty));
    line.setAttribute('stroke', 'rgba(255,255,255,0.25)');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('shape-rendering', 'geometricPrecision');
    svg.appendChild(line);
  });
}

