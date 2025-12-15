// SVG helpers for curved text labels and death ribbon (browser-native ES module)

export function createSvgElement({
  viewBox = '0 0 100 100',
  preserveAspectRatio = 'xMidYMid meet',
  classes = [],
  styles = {},
  attributes = {}
} = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('preserveAspectRatio', preserveAspectRatio);

  if (Array.isArray(classes) && classes.length) {
    svg.classList.add(...classes);
  }

  if (styles) {
    Object.assign(svg.style, styles);
  }

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      svg.setAttribute(key, value);
    });
  }

  return svg;
}

export function createCurvedLabelSvg(uniqueId, labelText) {
  const svg = createSvgElement({
    classes: ['icon-reminder-svg']
  });
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
  const charCount = full.length;

  // Simple sizing heuristic: shrink font/spacing and squeeze width for long labels.
  let fontSize = 12.5;
  let letterSpacing = 1.6;
  let textLengthOverride = null;

  if (charCount >= 16) {
    fontSize = 10.5;
    letterSpacing = 1.1;
    textLengthOverride = 118; // ~94% of the arc length
  } else if (charCount >= 14) {
    fontSize = 11.5;
    letterSpacing = 1.3;
    textLengthOverride = 118;
  }

  text.style.fontSize = `${fontSize}px`;
  text.style.letterSpacing = `${letterSpacing}px`;
  text.removeAttribute('lengthAdjust');
  textPath.textContent = full;
  if (textLengthOverride) {
    textPath.setAttribute('textLength', String(textLengthOverride));
    textPath.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  } else {
    textPath.removeAttribute('textLength');
    textPath.removeAttribute('lengthAdjust');
  }
  text.appendChild(textPath);
  svg.appendChild(text);

  return svg;
}

export function createDeathRibbonSvg({ highlightNightKill = false, dead = false, voteUsed = false } = {}) {
  return createGhostVoteRibbonSvg({ highlightNightKill, dead, voteUsed });
}

export function createGhostVoteRibbonSvg({ highlightNightKill = false, dead = false, voteUsed = false } = {}) {
  const svg = createSvgElement({
    viewBox: '0 0 24 24',
    preserveAspectRatio: 'xMidYMid meet',
    classes: highlightNightKill ? ['night-kill-pending'] : [],
    attributes: {
      role: 'img',
      'aria-label': dead ? (voteUsed ? 'Ghost vote lost' : 'Ghost vote') : 'Mark dead'
    }
  });
  try {
    svg.dataset.ghostVote = dead ? (voteUsed ? 'used' : 'available') : 'alive';
  } catch (_) { }

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', 'assets/icons/ghost-unfilled.svg#ghost-unfilled');
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', 'assets/icons/ghost-unfilled.svg#ghost-unfilled');
  use.setAttribute('data-part', 'ghost');
  use.setAttribute('pointer-events', 'visiblePainted');
  svg.appendChild(use);

  if (!dead || (dead && !voteUsed)) {
    const mouthFill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    mouthFill.setAttribute('cx', '12');
    mouthFill.setAttribute('cy', '15.6');
    mouthFill.setAttribute('r', '3.1');
    mouthFill.setAttribute('fill', 'currentColor');
    mouthFill.setAttribute('data-part', 'mouth-fill');
    mouthFill.setAttribute('pointer-events', 'visiblePainted');
    svg.appendChild(mouthFill);
  }

  return svg;
}
