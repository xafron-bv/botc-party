import { setupInteractiveElement } from '../utils/interaction.js';
import { settleAnimations } from '../utils/dom.js';
const storageKey = 'characterPanelOpen'; let setOpen = () => { };
export function openCharacterPanel() { setOpen(true); }
export function initCharacterPanel({ panel, toggle, closeButtons, sidebar, sidebarToggle, reposition, grimoireState }) {
  if (!panel || !toggle) return;
  const viewport = window.matchMedia('(max-width: 900px)');
  const syncSidebarToggle = () => {
    if (!sidebarToggle) return; const hidden = viewport.matches && document.body.classList.contains('character-panel-open');
    sidebarToggle.style.display = hidden ? 'none' : (document.body.classList.contains('sidebar-collapsed') ? 'inline-block' : 'none');
    sidebarToggle.style.visibility = hidden ? 'hidden' : ''; sidebarToggle.style.pointerEvents = hidden ? 'none' : '';
  };
  const applyState = (open) => {
    panel.setAttribute('aria-hidden', String(!open)); document.body.classList.toggle('character-panel-open', open);
    toggle.setAttribute('aria-pressed', String(open)); toggle.textContent = 'Script';
    try { localStorage.setItem(storageKey, open ? '1' : '0'); } catch (_) { }
    syncSidebarToggle();
    settleAnimations(panel, 360, true, () => reposition({ grimoireState }));
  }; setOpen = applyState; let initiallyOpen = false;
  try { initiallyOpen = localStorage.getItem(storageKey) === '1'; } catch (_) { }
  applyState(initiallyOpen);
  setupInteractiveElement({
    element: toggle,
    onTap: () => applyState(!document.body.classList.contains('character-panel-open')),
    stopClickPropagation: true
  });
  closeButtons.filter(Boolean).forEach((button) => setupInteractiveElement({
    element: button,
    onTap: () => applyState(false),
    stopClickPropagation: true
  }));
  document.addEventListener('click', ({ target }) => {
    if (!document.body.classList.contains('character-panel-open')) return; if (!panel.contains(target) && !toggle.contains(target) && !sidebar?.contains(target)) applyState(false);
  });
  document.addEventListener('keydown', ({ key }) => {
    if (key === 'Escape' && document.body.classList.contains('character-panel-open')) applyState(false);
  }); viewport.addEventListener('change', syncSidebarToggle); window.addEventListener('resize', syncSidebarToggle);
  syncSidebarToggle();
}
