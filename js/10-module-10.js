'use strict';

/* =====================================================================
   [10] VŨ KHÍ — 8 khẩu súng + DAO mặc định vĩnh viễn
   Chỉ mang tối đa 2 khẩu súng; E để đổi.
   ===================================================================== */

const GUNS = [
  { id: 'pistol', name: 'Súng lục', slotLabel: '1',
    dmg: 15, rpm: 300, spread: 0.035, bulletSpeed: 1050,
    mag: 12, reserve: 96, reserveMax: 120, reload: 1.0,
    auto: false, pellets: 1, pierce: 0, kick: 0.05, shake: 0.05,
    r: 3, trail: 24, flash: 11, sfx: 'pistol' },
  { id: 'revolver', name: 'Súng ngắn nổ', slotLabel: '1',
    dmg: 52, rpm: 110, spread: 0.02, bulletSpeed: 1250,
    mag: 6, reserve: 42, reserveMax: 60, reload: 1.8,
    auto: false, pellets: 1, pierce: 1, kick: 0.16, shake: 0.16,
    r: 3.6, trail: 38, flash: 15, sfx: 'revolver' },
  { id: 'smg', name: 'Tiểu liên', slotLabel: '2',
    dmg: 9, rpm: 780, spread: 0.09, bulletSpeed: 980,
    mag: 32, reserve: 160, reserveMax: 224, reload: 1.4,
    auto: true, pellets: 1, pierce: 0, kick: 0.03, shake: 0.035,
    r: 2.4, trail: 20, flash: 9, sfx: 'smg' },
  { id: 'shotgun', name: 'Súng săn', slotLabel: '3',
    dmg: 9, rpm: 85, spread: 0.24, bulletSpeed: 900,
    mag: 6, reserve: 36, reserveMax: 48, reload: 2.0,
    auto: false, pellets: 8, pierce: 0, kick: 0.22, shake: 0.22,
    r: 2.6, trail: 16, flash: 16, sfx: 'shotgun' },
  { id: 'rifle', name: 'Trường thương', slotLabel: '4',
    dmg: 32, rpm: 300, spread: 0.028, bulletSpeed: 1250,
    mag: 20, reserve: 100, reserveMax: 140, reload: 1.6,
    auto: true, pellets: 1, pierce: 1, kick: 0.09, shake: 0.09,
    r: 3, trail: 34, flash: 13, sfx: 'rifle' },
  { id: 'lmg', name: 'Súng đại liên', slotLabel: '4',
    dmg: 18, rpm: 520, spread: 0.11, bulletSpeed: 1100,
    mag: 60, reserve: 180, reserveMax: 240, reload: 2.8,
    auto: true, pellets: 1, pierce: 0, kick: 0.05, shake: 0.07,
    r: 3, trail: 28, flash: 12, sfx: 'lmg' },
  { id: 'sniper', name: 'Bắn tỉa', slotLabel: '5',
    dmg: 130, rpm: 55, spread: 0.004, bulletSpeed: 2100,
    mag: 5, reserve: 25, reserveMax: 30, reload: 2.4,
    auto: false, pellets: 1, pierce: 3, kick: 0.3, shake: 0.3,
    r: 3.4, trail: 60, flash: 18, sfx: 'sniper' },
  { id: 'dualsmg', name: 'Song tiểu liên', slotLabel: '5',
    dmg: 8, rpm: 1000, spread: 0.13, bulletSpeed: 950,
    mag: 50, reserve: 200, reserveMax: 260, reload: 2.2,
    auto: true, pellets: 2, pierce: 0, kick: 0.04, shake: 0.05,
    r: 2.3, trail: 18, flash: 10, sfx: 'smg' },
  { id: 'plasma', name: 'Plasma Rifle', slotLabel: '6',
    dmg: 34, rpm: 230, spread: 0.025, bulletSpeed: 960,
    mag: 24, reserve: 96, reserveMax: 144, reload: 1.9,
    auto: true, pellets: 1, pierce: 0, kick: 0.08, shake: 0.1,
    r: 4.5, trail: 32, flash: 15, sfx: 'plasma', color: '#63e8ff', projectile: 'plasma' },
  { id: 'railgun', name: 'Railgun', slotLabel: '7',
    dmg: 215, rpm: 38, spread: 0.002, bulletSpeed: 2450,
    mag: 4, reserve: 20, reserveMax: 28, reload: 2.6,
    auto: true, pellets: 1, pierce: 30, kick: 0.34, shake: 0.48,
    r: 5, trail: 96, flash: 21, sfx: 'railgun', color: '#ff8eff', projectile: 'rail' },
];

const MELEE = {
  id: 'melee', name: 'Dao chiến thuật',
  dmg: 48, rpm: 130, reach: 78, arc: 1.1,
  knockback: 260, shake: 0.12, auto: false,
};

function gunById(id) {
  return GUNS.find(g => g.id === id);
}
