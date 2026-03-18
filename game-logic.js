/**
 * Pure game logic for HackIdle. Usable in browser (window.gameLogic) and Node (module.exports).
 */
(function (root) {
  'use strict';

  var upgradesConfig = [
    { id: 'keyboard', name: 'Better keyboard', desc: '+1 bit per click', baseCost: 10, costScaling: 1.15, type: 'click', value: 1 },
    { id: 'script', name: 'Auto script', desc: '+0.5 bits/sec', baseCost: 50, costScaling: 1.2, type: 'passive', value: 0.5 },
    { id: 'bot', name: 'Simple bot', desc: '+2 bits/sec', baseCost: 200, costScaling: 1.25, type: 'passive', value: 2 },
    { id: 'vpn', name: 'VPN tunnel', desc: '+8 bits/sec', baseCost: 800, costScaling: 1.3, type: 'passive', value: 8 },
    { id: 'server', name: 'Rented server', desc: '+25 bits/sec', baseCost: 3000, costScaling: 1.35, type: 'passive', value: 25 },
    { id: 'datacenter', name: 'Mini datacenter', desc: '+100 bits/sec', baseCost: 12000, costScaling: 1.4, type: 'passive', value: 100 },
    { id: 'usb', name: 'USB stick', desc: '+500 storage', baseCost: 100, costScaling: 1.2, type: 'storage', value: 500 },
    { id: 'hdd', name: 'External HDD', desc: '+2K storage', baseCost: 500, costScaling: 1.25, type: 'storage', value: 2000 },
    { id: 'ssd', name: 'SSD', desc: '+10K storage', baseCost: 2500, costScaling: 1.3, type: 'storage', value: 10000 },
    { id: 'nas', name: 'NAS', desc: '+50K storage', baseCost: 15000, costScaling: 1.35, type: 'storage', value: 50000 },
    { id: 'server-rack', name: 'Server rack', desc: '+200K storage', baseCost: 75000, costScaling: 1.4, type: 'storage', value: 200000 },
  ];

  var BASE_STORAGE = 1000;

  function createState() {
    return { bits: 0, maxBits: BASE_STORAGE, clickPower: 1, perSecond: 0, counts: {} };
  }

  function getUpgradeCost(state, id) {
    var config = upgradesConfig.find(function (u) { return u.id === id; });
    if (!config) return Infinity;
    var count = state.counts[id] || 0;
    return Math.floor(config.baseCost * Math.pow(config.costScaling, count));
  }

  function canAfford(state, id) {
    return state.bits >= getUpgradeCost(state, id);
  }

  function recalcPerSecond(state) {
    state.perSecond = 0;
    upgradesConfig.forEach(function (config) {
      if (config.type !== 'passive') return;
      var count = state.counts[config.id] || 0;
      state.perSecond += count * config.value;
    });
  }

  function recalcClickPower(state) {
    state.clickPower = 1;
    upgradesConfig.forEach(function (config) {
      if (config.type !== 'click') return;
      var count = state.counts[config.id] || 0;
      state.clickPower += count * config.value;
    });
  }

  function recalcMaxBits(state) {
    state.maxBits = BASE_STORAGE;
    upgradesConfig.forEach(function (config) {
      if (config.type !== 'storage') return;
      var count = state.counts[config.id] || 0;
      state.maxBits += count * config.value;
    });
  }

  function addBits(state, amount) {
    state.bits = Math.min(state.maxBits, state.bits + amount);
  }

  function formatBits(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return Math.floor(n).toLocaleString();
  }

  function buyUpgrade(state, id) {
    var config = upgradesConfig.find(function (u) { return u.id === id; });
    if (!config || !canAfford(state, id)) return false;
    var cost = getUpgradeCost(state, id);
    state.bits -= cost;
    state.counts[id] = (state.counts[id] || 0) + 1;
    if (config.type === 'click') recalcClickPower(state);
    else if (config.type === 'storage') recalcMaxBits(state);
    else recalcPerSecond(state);
    return true;
  }

  var api = {
    upgradesConfig: upgradesConfig,
    BASE_STORAGE: BASE_STORAGE,
    createState: createState,
    getUpgradeCost: getUpgradeCost,
    canAfford: canAfford,
    addBits: addBits,
    recalcClickPower: recalcClickPower,
    recalcPerSecond: recalcPerSecond,
    recalcMaxBits: recalcMaxBits,
    formatBits: formatBits,
    buyUpgrade: buyUpgrade,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.gameLogic = api;
  }
})(typeof window !== 'undefined' ? window : global);
