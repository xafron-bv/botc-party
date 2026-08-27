import { byId } from './utils/dom.js';
export function trackPageLoad() {
  const overlay = byId('app-loading'); window.__overlayInitialVisible = Boolean(overlay); window.__overlayInitialMessage = byId('app-loading-message')?.textContent || '';
  let appReady = false; let windowReady = document.readyState === 'complete'; let removed = false;
  const complete = () => {
    if (!appReady || !windowReady || removed) return; removed = true;
    Object.assign(window, {
      __windowLoadCompleted: true,
      __windowLoadTimestamp: Date.now(),
      __overlayRemoved: true,
      __overlayRemovedAt: Date.now()
    }); if (overlay) { overlay.setAttribute('aria-hidden', 'true'); overlay.classList.add('hidden'); setTimeout(() => overlay.remove(), 350); }
  };
  if (!windowReady) window.addEventListener('load', () => { windowReady = true; complete(); }, { once: true });
  return () => { appReady = true; complete(); };
}
export async function showVersion() {
  const element = byId('app-version-value'); if (!element) return;
  try {
    const response = await fetch('./version.json', { cache: 'no-store' }); const data = response.ok ? await response.json() : null; element.textContent = data?.uiVersion || '?';
  } catch (_) { element.textContent = '?'; }
}
export function createGrimoireState() {
  return {
    includeTravellers: false, nightOrderSort: false, nightPhase: 'first-night', playerContextMenu: null,
    contextMenuTargetIndex: -1, longPressTimer: null, scriptLoadPromise: null, reminderContextMenu: null,
    reminderContextTarget: { playerIndex: -1, reminderIndex: -1 }, scriptData: null, scriptMetaName: '',
    playerSetupTable: [], allRoles: {}, baseRoles: {}, extraTravellerRoles: {}, players: [], selectedPlayerIndex: -1,
    editingReminder: { playerIndex: -1, reminderIndex: -1 }, isRestoringState: false,
    outsideCollapseHandlerInstalled: false, mode: 'player', grimoireHidden: false, tempSnapshot: null, gameStarted: false,
    displaySettings: { tokenScale: 1, playerNameScale: 1, circleScale: 1 },
    playerSetup: { bag: [], assignments: [], revealed: false }
  };
}
