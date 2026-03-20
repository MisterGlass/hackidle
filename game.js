(function () {
  'use strict';

  const STORAGE_KEY = 'hackidle_save';
  const BASE_STORAGE = 1000;

  const upgradesConfig = [
    { id: 'keyboard', name: 'Better keyboard', desc: '+1 bit per click', baseCost: 10, costScaling: 1.15, type: 'click', value: 1 },
    { id: 'script', name: 'Auto script', desc: '+0.5 bits/sec', baseCost: 50, costScaling: 1.2, type: 'passive', value: 0.5 },
    { id: 'bot', name: 'Simple bot', desc: '+2 bits/sec', baseCost: 200, costScaling: 1.25, type: 'passive', value: 2 },
    { id: 'vpn', name: 'VPN tunnel', desc: '+8 bits/sec', baseCost: 800, costScaling: 1.3, type: 'passive', value: 8 },
    { id: 'server', name: 'Rented server', desc: '+25 bits/sec', baseCost: 3000, costScaling: 1.35, type: 'passive', value: 25 },
    { id: 'datacenter', name: 'Mini datacenter', desc: '+100 bits/sec', baseCost: 12000, costScaling: 1.4, type: 'passive', value: 100 },
    { id: 'wordlist', name: 'Wordlist', desc: '+0.1 passwords/sec', baseCost: 200, costScaling: 1.2, type: 'passivePasswords', value: 0.1 },
    { id: 'hashcat', name: 'Hashcat', desc: '+0.5 passwords/sec', baseCost: 1500, costScaling: 1.25, type: 'passivePasswords', value: 0.5 },
    { id: 'backdoor', name: 'Backdoor', desc: '+5 bits/sec', baseCostPasswords: 10, costScaling: 1.3, type: 'passive', value: 5 },
    { id: 'usb', name: 'USB stick', desc: '+500 storage', baseCost: 100, costScaling: 1.2, type: 'storage', value: 500 },
    { id: 'hdd', name: 'External HDD', desc: '+2K storage', baseCost: 500, costScaling: 1.25, type: 'storage', value: 2000 },
    { id: 'ssd', name: 'SSD', desc: '+10K storage', baseCost: 2500, costScaling: 1.3, type: 'storage', value: 10000 },
    { id: 'nas', name: 'NAS', desc: '+50K storage', baseCost: 15000, costScaling: 1.35, type: 'storage', value: 50000 },
    { id: 'server-rack', name: 'Server rack', desc: '+200K storage', baseCost: 75000, costScaling: 1.4, type: 'storage', value: 200000 },
  ];

  const CRACK_COST_BITS = 100;

  let state = {
    bits: 0,
    maxBits: BASE_STORAGE,
    clickPower: 1,
    perSecond: 0,
    passwords: 0,
    passwordsPerSecond: 0,
    counts: {},
    /** Once true, upgrade row stays visible even if resources drop. */
    revealedUpgrades: {},
  };

  function getUpgradeCost(id) {
    const config = upgradesConfig.find((u) => u.id === id);
    if (!config || config.baseCostPasswords != null) return Infinity;
    const count = state.counts[id] || 0;
    return Math.floor(config.baseCost * Math.pow(config.costScaling, count));
  }

  function getUpgradeCostPasswords(id) {
    const config = upgradesConfig.find((u) => u.id === id);
    if (!config || config.baseCostPasswords == null) return Infinity;
    const count = state.counts[id] || 0;
    return Math.floor(config.baseCostPasswords * Math.pow(config.costScaling, count));
  }

  function canAfford(id) {
    const config = upgradesConfig.find((u) => u.id === id);
    if (!config) return false;
    if (config.baseCostPasswords != null) {
      return state.passwords >= getUpgradeCostPasswords(id);
    }
    return state.bits >= getUpgradeCost(id);
  }

  function markRevealedUpgrades() {
    upgradesConfig.forEach((config) => {
      if (state.revealedUpgrades[config.id]) return;
      const count = state.counts[config.id] || 0;
      if (count > 0) {
        state.revealedUpgrades[config.id] = true;
        return;
      }
      if (config.baseCostPasswords != null) {
        const cost = getUpgradeCostPasswords(config.id);
        if (isFinite(cost) && state.passwords >= cost * 0.5) state.revealedUpgrades[config.id] = true;
      } else {
        const cost = getUpgradeCost(config.id);
        if (isFinite(cost) && state.bits >= cost * 0.5) state.revealedUpgrades[config.id] = true;
      }
    });
  }

  function shouldShowUpgrade(config) {
    return !!state.revealedUpgrades[config.id];
  }

  let lastVisibleUpgradesKey = '';

  function computeVisibleUpgradesKey() {
    const normalTypes = ['click', 'passive', 'passivePasswords'];
    const mainIds = upgradesConfig
      .filter((c) => normalTypes.includes(c.type) && shouldShowUpgrade(c))
      .map((c) => c.id)
      .join(',');
    const storageIds = upgradesConfig
      .filter((c) => c.type === 'storage' && shouldShowUpgrade(c))
      .map((c) => c.id)
      .join(',');
    return mainIds + '|' + storageIds;
  }

  function syncUpgradesUI() {
    markRevealedUpgrades();
    const key = computeVisibleUpgradesKey();
    if (key !== lastVisibleUpgradesKey) {
      renderUpgrades();
    } else {
      updateUpgradeStates();
    }
  }

  function recalcPasswordsPerSecond() {
    state.passwordsPerSecond = 0;
    upgradesConfig.forEach((config) => {
      if (config.type !== 'passivePasswords') return;
      const count = state.counts[config.id] || 0;
      state.passwordsPerSecond += count * config.value;
    });
  }

  function recalcPerSecond() {
    state.perSecond = 0;
    upgradesConfig.forEach((config) => {
      if (config.type !== 'passive') return;
      const count = state.counts[config.id] || 0;
      state.perSecond += count * config.value;
    });
  }

  function recalcClickPower() {
    state.clickPower = 1;
    upgradesConfig.forEach((config) => {
      if (config.type !== 'click') return;
      const count = state.counts[config.id] || 0;
      state.clickPower += count * config.value;
    });
  }

  function recalcMaxBits() {
    state.maxBits = BASE_STORAGE;
    upgradesConfig.forEach((config) => {
      if (config.type !== 'storage') return;
      const count = state.counts[config.id] || 0;
      state.maxBits += count * config.value;
    });
  }

  function addBits(amount) {
    state.bits = Math.min(state.maxBits, state.bits + amount);
  }

  function formatBits(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return Math.floor(n).toLocaleString();
  }

  function formatPasswords(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return Math.floor(n).toLocaleString();
  }

  /** Rates (e.g. passwords/sec): always up to 2 decimal places. */
  function formatPasswordsPerSecond(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return Number(n).toFixed(2);
  }

  function buyUpgrade(id) {
    const config = upgradesConfig.find((u) => u.id === id);
    if (!config || !canAfford(id)) return;
    if (config.baseCostPasswords != null) {
      const cost = getUpgradeCostPasswords(id);
      state.passwords -= cost;
    } else {
      const cost = getUpgradeCost(id);
      state.bits -= cost;
    }
    state.counts[id] = (state.counts[id] || 0) + 1;
    state.revealedUpgrades[id] = true;
    if (config.type === 'click') recalcClickPower();
    else if (config.type === 'storage') recalcMaxBits();
    else if (config.type === 'passivePasswords') recalcPasswordsPerSecond();
    else recalcPerSecond();
    renderUpgrades();
    updateBitsDisplay();
  }

  function crackPassword() {
    if (state.bits < CRACK_COST_BITS) return;
    state.bits -= CRACK_COST_BITS;
    state.passwords += 1;
  }

  function updateBitsDisplay() {
    const bitsEl = document.getElementById('bits');
    const maxEl = document.getElementById('bits-max');
    const barEl = document.getElementById('storage-bar');
    const perSecEl = document.getElementById('per-second');
    const passwordsEl = document.getElementById('passwords');
    const passwordsPerSecEl = document.getElementById('passwords-per-second');
    const crackBtn = document.getElementById('crack-btn');
    if (bitsEl) bitsEl.textContent = formatBits(state.bits);
    if (maxEl) maxEl.textContent = formatBits(state.maxBits);
    if (perSecEl) perSecEl.textContent = formatBits(state.perSecond);
    if (passwordsEl) passwordsEl.textContent = formatPasswords(state.passwords);
    if (passwordsPerSecEl) passwordsPerSecEl.textContent = formatPasswordsPerSecond(state.passwordsPerSecond);
    if (barEl) {
      const pct = state.maxBits > 0 ? Math.min(100, (state.bits / state.maxBits) * 100) : 0;
      barEl.style.width = pct + '%';
    }
    if (crackBtn) {
      crackBtn.disabled = state.bits < CRACK_COST_BITS;
    }
  }

  function getUpgradeCostText(id) {
    const config = upgradesConfig.find((u) => u.id === id);
    if (!config) return '';
    if (config.baseCostPasswords != null) {
      const cost = getUpgradeCostPasswords(id);
      return formatPasswords(cost) + ' passwords';
    }
    return formatBits(getUpgradeCost(id)) + ' bits';
  }

  function renderUpgradeCard(config) {
    const count = state.counts[config.id] || 0;
    const afford = canAfford(config.id);
    const owned = count > 0;
    const classes = ['upgrade-card'];
    if (afford) classes.push('can-afford');
    if (owned) classes.push('owned');
    const costText = getUpgradeCostText(config.id);
    return (
      '<div class="' + classes.join(' ') + '" data-id="' + config.id + '">' +
        '<div class="upgrade-info">' +
          '<div class="upgrade-name">' + config.name + '</div>' +
          '<div class="upgrade-desc">' + config.desc + '</div>' +
          (count > 0 ? '<div class="upgrade-count">×' + count + '</div>' : '') +
        '</div>' +
        '<div class="upgrade-actions">' +
          '<div class="upgrade-cost ' + (afford ? '' : 'cant-afford') + '">' + costText + '</div>' +
          '<button type="button" class="upgrade-btn" data-id="' + config.id + '"' + (afford ? '' : ' disabled') + '>Buy</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderUpgrades() {
    const listEl = document.getElementById('upgrades-list');
    const storageListEl = document.getElementById('storage-upgrades-list');
    if (!listEl || !storageListEl) return;
    const normalTypes = ['click', 'passive', 'passivePasswords'];
    listEl.innerHTML = upgradesConfig
      .filter((c) => normalTypes.includes(c.type) && shouldShowUpgrade(c))
      .map(renderUpgradeCard)
      .join('');
    storageListEl.innerHTML = upgradesConfig
      .filter((c) => c.type === 'storage' && shouldShowUpgrade(c))
      .map(renderUpgradeCard)
      .join('');
    lastVisibleUpgradesKey = computeVisibleUpgradesKey();
  }

  function updateUpgradeStates() {
    ['upgrades-list', 'storage-upgrades-list'].forEach(function (listId) {
      const listEl = document.getElementById(listId);
      if (!listEl) return;
      listEl.querySelectorAll('.upgrade-card').forEach(function (card) {
        const id = card.getAttribute('data-id');
        if (!id) return;
        const afford = canAfford(id);
        const costText = getUpgradeCostText(id);
        const costEl = card.querySelector('.upgrade-cost');
        const btn = card.querySelector('.upgrade-btn');
        if (costEl) costEl.textContent = costText;
        if (costEl) costEl.classList.toggle('cant-afford', !afford);
        if (btn) btn.disabled = !afford;
        card.classList.toggle('can-afford', afford);
      });
    });
  }

  function tick(deltaSec) {
    addBits(state.perSecond * deltaSec);
    state.passwords += state.passwordsPerSecond * deltaSec;
    updateBitsDisplay();
    syncUpgradesUI();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bits: state.bits,
        passwords: state.passwords,
        counts: state.counts,
        revealedUpgrades: state.revealedUpgrades,
      }));
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.counts = parsed.counts ?? {};
        state.revealedUpgrades =
          parsed.revealedUpgrades && typeof parsed.revealedUpgrades === 'object'
            ? { ...parsed.revealedUpgrades }
            : {};
        Object.keys(state.counts).forEach(function (id) {
          if ((state.counts[id] || 0) > 0) state.revealedUpgrades[id] = true;
        });
        recalcClickPower();
        recalcPerSecond();
        recalcPasswordsPerSecond();
        recalcMaxBits();
        state.bits = Math.min(parsed.bits ?? 0, state.maxBits);
        state.passwords = parsed.passwords ?? 0;
        markRevealedUpgrades();
      }
    } catch (e) {
      console.warn('Load failed', e);
    }
  }

  function reset() {
    if (!confirm('Reset all progress? This cannot be undone.')) return;
    state = {
      bits: 0,
      maxBits: BASE_STORAGE,
      clickPower: 1,
      perSecond: 0,
      passwords: 0,
      passwordsPerSecond: 0,
      counts: {},
      revealedUpgrades: {},
    };
    localStorage.removeItem(STORAGE_KEY);
    lastVisibleUpgradesKey = '';
    renderUpgrades();
    updateBitsDisplay();
  }

  function init() {
    load();
    recalcPerSecond();
    recalcPasswordsPerSecond();
    markRevealedUpgrades();
    renderUpgrades();
    updateBitsDisplay();

    document.getElementById('hack-btn').addEventListener('click', () => {
      addBits(state.clickPower);
      updateBitsDisplay();
      syncUpgradesUI();
    });

    document.getElementById('crack-btn').addEventListener('click', () => {
      crackPassword();
      updateBitsDisplay();
      syncUpgradesUI();
    });

    document.getElementById('upgrades-columns').addEventListener('click', function (e) {
      const btn = e.target.closest('.upgrade-btn');
      if (btn && !btn.disabled && btn.getAttribute('data-id')) {
        buyUpgrade(btn.getAttribute('data-id'));
      }
    });

    document.getElementById('save-btn').addEventListener('click', save);
    document.getElementById('reset-btn').addEventListener('click', reset);

    let last = performance.now();
    function loop(now) {
      const delta = (now - last) / 1000;
      last = now;
      tick(Math.min(delta, 0.25));
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    setInterval(save, 30000);
  }

  init();
})();
