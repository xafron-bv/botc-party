// Sidebar behaviors: resizer and toggle (browser-native ES module)
import { prefersOverlaySidebar, isTouchDevice } from '../constants.js';

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
  sidebarCloseBtn,
  sidebarBackdrop,
  sidebarEl,
  sidebarResizer,
  repositionPlayers,
  players,
  grimoireState
}) {
  if (!sidebarToggleBtn || !sidebarEl) return;
  const COLLAPSE_KEY = 'sidebarCollapsed';
  const applyCollapsed = (collapsed) => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    const useOverlay = prefersOverlaySidebar.matches;
    document.body.classList.toggle('sidebar-open', !collapsed && useOverlay);
    if (sidebarBackdrop) sidebarBackdrop.style.display = (!collapsed && useOverlay) ? 'block' : 'none';
    sidebarToggleBtn.textContent = 'Open Sidebar';
    sidebarToggleBtn.style.display = collapsed ? 'inline-block' : 'none';
    sidebarToggleBtn.setAttribute('aria-pressed', String(!collapsed));
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    requestAnimationFrame(() => repositionPlayers && repositionPlayers({ grimoireState }));
  };
  const stored = localStorage.getItem(COLLAPSE_KEY);
  const startCollapsed = stored === '1' || prefersOverlaySidebar.matches;
  applyCollapsed(startCollapsed);
  sidebarToggleBtn.addEventListener('click', () => applyCollapsed(false));
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', () => applyCollapsed(true));
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', () => applyCollapsed(true));
  prefersOverlaySidebar.addEventListener('change', () => {
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    applyCollapsed(collapsed);
  });
  if (isTouchDevice) {
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
}

