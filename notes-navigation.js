(function () {
  'use strict';

  const storageKey = 'dk-sidebar-state-v1';
  const keys = new Set(['home', 'notes', 'part-1', 'part-2', 'part-3']);
  const state = { open: {}, scroll: 0 };
  const rails = new WeakMap();
  const details = new WeakMap();

  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      if (saved.open && typeof saved.open === 'object' && !Array.isArray(saved.open)) {
        keys.forEach(key => {
          if (Object.prototype.hasOwnProperty.call(saved.open, key) &&
              typeof saved.open[key] === 'boolean') state.open[key] = saved.open[key];
        });
      }
      if (typeof saved.scroll === 'number' && Number.isFinite(saved.scroll) &&
          saved.scroll >= 0) state.scroll = saved.scroll;
    }
  } catch (_) {
    // The in-memory state also works when storage is unavailable.
  }

  const desktop = () => !window.matchMedia('(max-width:900px)').matches;

  function save() {
    try { window.localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {}
  }

  function init(rail) {
    if (!rail || !rail.querySelectorAll) return;
    let binding = rails.get(rail);
    if (!binding) {
      binding = { frame: null, timer: null, restoring: false, lastScroll: rail.scrollTop };
      rails.set(rail, binding);
      rail.addEventListener('scroll', () => {
        const top = Math.max(0, rail.scrollTop);
        if (!desktop() || binding.restoring || top === binding.lastScroll) return;
        binding.lastScroll = top;
        state.scroll = top;
        window.clearTimeout(binding.timer);
        binding.timer = window.setTimeout(save, 120);
      }, { passive: true });
    }

    binding.restoring = true;
    window.clearTimeout(binding.timer);
    if (binding.frame !== null) window.cancelAnimationFrame(binding.frame);

    let seeded = false;
    rail.querySelectorAll('details[data-nav-key]').forEach(node => {
      const key = node.dataset.navKey;
      if (!keys.has(key)) return;
      let detail = details.get(node);
      if (!detail) {
        detail = { expected: node.open };
        details.set(node, detail);
        node.addEventListener('toggle', () => {
          if (node.open === detail.expected) return;
          detail.expected = node.open;
          state.open[key] = node.open;
          save();
        });
      }
      const remembered = Object.prototype.hasOwnProperty.call(state.open, key);
      const desired = remembered ? state.open[key] : node.open;
      if (!remembered && node.open) {
        state.open[key] = true;
        seeded = true;
      }
      detail.expected = desired;
      if (node.open !== desired) node.open = desired;
    });

    if (seeded) save();
    binding.frame = window.requestAnimationFrame(() => {
      const maximum = Math.max(0, rail.scrollHeight - rail.clientHeight);
      if (desktop()) rail.scrollTop = Math.min(state.scroll, maximum);
      binding.lastScroll = rail.scrollTop;
      binding.restoring = false;
      binding.frame = null;
    });
  }

  window.addEventListener('pagehide', save);
  window.DKSidebar = { init };
  const initialize = () => document.querySelectorAll('.side-rail').forEach(init);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
}());
