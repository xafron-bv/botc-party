// Sidebar behaviors: resizer and toggle (browser-native ES module)
import { prefersOverlaySidebar, isTouchDevice } from '../constants.js';
import { setupInteractiveElement } from '../utils/interaction.js';

export function initSidebarResize(sidebarResizer, sidebarEl) {
  if (!sidebarResizer || !sidebarEl) return;
  const saved = localStorage.getItem('sidebarWidthPx');
  if (saved) {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      `${Math.max(220, Math.min(parseInt(saved, 10), 600))}px`
    );
  }
  let isDragging = false;
  let startX = 0;
  let startWidth = 0;
  const minW = 220;
  const maxW = 800;
  const onMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const newW = Math.max(minW, Math.min(startWidth + dx, maxW));
    document.documentElement.style.setProperty('--sidebar-width', `${newW}px`);
  };
  const onUp = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove('resizing');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    const val = getComputedStyle(sidebarEl).width;
    localStorage.setItem('sidebarWidthPx', parseInt(val, 10));
  };
  sidebarResizer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startWidth = sidebarEl.getBoundingClientRect().width;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.classList.add('resizing');
  });

  const onTouchMove = (e) => {
    if (!isDragging) return;
    if (e.touches && e.touches.length) {
      e.preventDefault();
      const dx = e.touches[0].clientX - startX;
      const newW = Math.max(minW, Math.min(startWidth + dx, maxW));
      document.documentElement.style.setProperty('--sidebar-width', `${newW}px`);
    }
  };
  const onTouchEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove('resizing');
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    const val = getComputedStyle(sidebarEl).width;
    localStorage.setItem('sidebarWidthPx', parseInt(val, 10));
  };
  sidebarResizer.addEventListener('touchstart', (e) => {
    if (!e.touches || !e.touches.length) return;
    isDragging = true;
    startX = e.touches[0].clientX;
    startWidth = sidebarEl.getBoundingClientRect().width;
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.body.classList.add('resizing');
  }, { passive: true });
}

export function initSidebarToggle({
  sidebarToggleBtn,
  sidebarCloseMobileBtn,
  sidebarBackdrop,
  sidebarEl,
  sidebarResizer,
  repositionPlayers,
  grimoireState,
  characterPanel,
  characterPanelToggleBtn
}) {
  if (!sidebarToggleBtn || !sidebarEl) return;
  const COLLAPSE_KEY = 'sidebarCollapsed';
  const ensureMutualExclusivity = () => {
    // If both somehow open, prefer character panel OR enforce collapse of the other.
    const panelOpen = document.body.classList.contains('character-panel-open');
    const sidebarCollapsed = document.body.classList.contains('sidebar-collapsed');
    if (panelOpen && !sidebarCollapsed) {
      // Collapse sidebar silently
      document.body.classList.add('sidebar-collapsed');
      document.body.classList.remove('sidebar-open');
      sidebarToggleBtn.style.display = 'inline-block';
      sidebarToggleBtn.setAttribute('aria-pressed', 'false');
    }
    if (!panelOpen && sidebarCollapsed) {
      // Toggle visibility rule remains handled in applyCollapsed; nothing extra.
    }
  };
  const applyCollapsed = (collapsed) => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    const useOverlay = prefersOverlaySidebar.matches;
    document.body.classList.toggle('sidebar-open', !collapsed && useOverlay);
    if (sidebarBackdrop) sidebarBackdrop.style.display = (!collapsed && useOverlay) ? 'block' : 'none';
    sidebarToggleBtn.textContent = 'Open Sidebar';
    // Show toggle whenever sidebar is collapsed. Desktop: always visible even if character panel open.
    // Mobile hiding when character panel open handled purely in CSS media query.
    sidebarToggleBtn.style.display = collapsed ? 'inline-block' : 'none';
    sidebarToggleBtn.setAttribute('aria-pressed', String(!collapsed));
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    requestAnimationFrame(() => repositionPlayers && repositionPlayers({ grimoireState }));
    if (!collapsed && document.body.classList.contains('character-panel-open')) {
      // Close character panel to honor mutual exclusivity
      document.body.classList.remove('character-panel-open');
      if (characterPanel) characterPanel.setAttribute('aria-hidden', 'true');
      if (characterPanelToggleBtn) characterPanelToggleBtn.setAttribute('aria-pressed', 'false');
    }
    ensureMutualExclusivity();
  };
  const stored = localStorage.getItem(COLLAPSE_KEY);
  const startCollapsed = stored === '1' || prefersOverlaySidebar.matches;
  applyCollapsed(startCollapsed);

  // Use setupInteractiveElement for consistent touch/click handling
  setupInteractiveElement({
    element: sidebarToggleBtn,
    onTap: () => applyCollapsed(false),
    stopClickPropagation: true
  });

  if (sidebarCloseMobileBtn) {
    setupInteractiveElement({
      element: sidebarCloseMobileBtn,
      onTap: () => applyCollapsed(true),
      stopClickPropagation: true
    });
  }

  if (sidebarBackdrop) {
    setupInteractiveElement({
      element: sidebarBackdrop,
      onTap: () => applyCollapsed(true),
      stopClickPropagation: false
    });
  }
  prefersOverlaySidebar.addEventListener('change', () => {
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    applyCollapsed(collapsed);
  });
  if (isTouchDevice()) {
    const handleOutsideClick = (event) => {
      const useOverlay = prefersOverlaySidebar.matches;
      if (useOverlay) return;
      if (document.body.classList.contains('sidebar-collapsed')) return;
      const clickedInSidebar = sidebarEl.contains(event.target);
      const clickedOnResizer = sidebarResizer && sidebarResizer.contains(event.target);
      const clickedOnToggleButton = sidebarToggleBtn.contains(event.target);
      if (!clickedInSidebar && !clickedOnResizer && !clickedOnToggleButton) applyCollapsed(true);
    };
    document.addEventListener('click', handleOutsideClick, true);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true, capture: true });
  }
  // Expose helper globally so panel code can request exclusivity after it opens
  try { window.ensureSidebarPanelExclusivity = ensureMutualExclusivity; } catch (_) { }
}

