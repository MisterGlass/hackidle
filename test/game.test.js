'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const logic = require(path.join(__dirname, '..', 'game-logic.js'));

describe('createState', () => {
  it('returns initial state with zero bits and base storage', () => {
    const state = logic.createState();
    assert.strictEqual(state.bits, 0);
    assert.strictEqual(state.maxBits, logic.BASE_STORAGE);
    assert.strictEqual(state.clickPower, 1);
    assert.strictEqual(state.perSecond, 0);
    assert.deepStrictEqual(state.counts, {});
  });
});

describe('formatBits', () => {
  it('formats small numbers as integers', () => {
    assert.strictEqual(logic.formatBits(0), '0');
    assert.strictEqual(logic.formatBits(42), '42');
    assert.strictEqual(logic.formatBits(999), '999');
  });
  it('formats thousands as K', () => {
    assert.strictEqual(logic.formatBits(1000), '1.00K');
    assert.strictEqual(logic.formatBits(1500), '1.50K');
  });
  it('formats millions as M', () => {
    assert.strictEqual(logic.formatBits(1e6), '1.00M');
  });
});

describe('getUpgradeCost', () => {
  it('returns base cost for first purchase', () => {
    const state = logic.createState();
    assert.strictEqual(logic.getUpgradeCost(state, 'keyboard'), 10);
    assert.strictEqual(logic.getUpgradeCost(state, 'script'), 50);
    assert.strictEqual(logic.getUpgradeCost(state, 'usb'), 100);
  });
  it('returns Infinity for unknown upgrade id', () => {
    const state = logic.createState();
    assert.strictEqual(logic.getUpgradeCost(state, 'nonexistent'), Infinity);
  });
});

describe('canAfford', () => {
  it('returns false when bits less than cost', () => {
    const state = logic.createState();
    state.bits = 5;
    assert.strictEqual(logic.canAfford(state, 'keyboard'), false);
  });
  it('returns true when bits equal cost', () => {
    const state = logic.createState();
    state.bits = 10;
    assert.strictEqual(logic.canAfford(state, 'keyboard'), true);
  });
});

describe('addBits', () => {
  it('increases bits up to max', () => {
    const state = logic.createState();
    logic.addBits(state, 100);
    assert.strictEqual(state.bits, 100);
  });
  it('caps at maxBits', () => {
    const state = logic.createState();
    state.bits = 900;
    logic.addBits(state, 200);
    assert.strictEqual(state.bits, state.maxBits);
  });
});

describe('recalcClickPower', () => {
  it('starts at 1', () => {
    const state = logic.createState();
    logic.recalcClickPower(state);
    assert.strictEqual(state.clickPower, 1);
  });
  it('increases with keyboard upgrades', () => {
    const state = logic.createState();
    state.counts.keyboard = 2;
    logic.recalcClickPower(state);
    assert.strictEqual(state.clickPower, 3);
  });
});

describe('recalcPerSecond', () => {
  it('starts at 0', () => {
    const state = logic.createState();
    logic.recalcPerSecond(state);
    assert.strictEqual(state.perSecond, 0);
  });
});

describe('recalcMaxBits', () => {
  it('starts at BASE_STORAGE', () => {
    const state = logic.createState();
    logic.recalcMaxBits(state);
    assert.strictEqual(state.maxBits, logic.BASE_STORAGE);
  });
  it('increases with storage upgrades', () => {
    const state = logic.createState();
    state.counts.usb = 1;
    state.counts.hdd = 1;
    logic.recalcMaxBits(state);
    assert.strictEqual(state.maxBits, logic.BASE_STORAGE + 500 + 2000);
  });
});

describe('buyUpgrade', () => {
  it('returns false when cannot afford', () => {
    const state = logic.createState();
    state.bits = 5;
    assert.strictEqual(logic.buyUpgrade(state, 'keyboard'), false);
    assert.strictEqual(state.bits, 5);
  });
  it('returns true and deducts cost for click upgrade', () => {
    const state = logic.createState();
    state.bits = 10;
    assert.strictEqual(logic.buyUpgrade(state, 'keyboard'), true);
    assert.strictEqual(state.bits, 0);
    assert.strictEqual(state.counts.keyboard, 1);
    assert.strictEqual(state.clickPower, 2);
  });
  it('returns true and increases maxBits for storage upgrade', () => {
    const state = logic.createState();
    state.bits = 100;
    assert.strictEqual(logic.buyUpgrade(state, 'usb'), true);
    assert.strictEqual(state.bits, 0);
    assert.strictEqual(state.counts.usb, 1);
    assert.strictEqual(state.maxBits, logic.BASE_STORAGE + 500);
  });
});
