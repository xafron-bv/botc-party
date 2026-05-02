export function initActionCluster() {
  const cluster = document.getElementById('action-cluster');
  const trigger = document.getElementById('action-cluster-toggle');
  if (!cluster || !trigger) return;

  const setState = (state) => {
    cluster.setAttribute('data-state', state);
    trigger.setAttribute('aria-expanded', state === 'expanded' ? 'true' : 'false');
    trigger.setAttribute(
      'aria-label',
      state === 'expanded' ? 'Hide grimoire actions' : 'Show grimoire actions'
    );
  };

  const collapse = () => setState('collapsed');
  const expand = () => setState('expanded');
  const isExpanded = () => cluster.getAttribute('data-state') === 'expanded';

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    if (isExpanded()) {
      collapse();
    } else {
      expand();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!isExpanded()) return;
    const target = event.target;
    if (!target) return;
    if (cluster.contains(target)) return;
    const settingsPanel = document.getElementById('display-settings-panel');
    if (settingsPanel && settingsPanel.contains(target)) return;
    const dayNightSlider = document.getElementById('day-night-slider');
    if (dayNightSlider && dayNightSlider.contains(target)) return;
    collapse();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isExpanded()) {
      collapse();
      try { trigger.focus(); } catch (_) { /* focus may fail in some contexts */ }
    }
  });
}
