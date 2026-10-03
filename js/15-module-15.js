'use strict';

/* =====================================================================
   [15] WAVE SINH TỒN + CHIẾN DỊCH 8 MÀN
   ===================================================================== */

const Waves = {
  composition(n, diff) {
    const list = [], cm = diff.countMul;
    const push = (type, count) => { for (let i = 0; i < count; i++) list.push(type); };
    push('grunt', Math.round((2 + n * 0.9) * cm));
    if (n >= 2) push('drone', Math.round((1 + (n - 1) * 0.8) * cm));
    if (n >= 4) push('bomber', Math.round((1 + (n - 3) * 0.5) * cm));
    if (n >= 5) push('brute', Math.round((n - 4) * 0.4 * cm));
    if (n >= 6) push('sniper', Math.round(1 + (n - 5) * 0.35 * cm));
    if (n % 5 === 0) list.push('BOSS');
    return list;
  },
};

const LEVELS = [
  { name: 'Xâm nhập',       enemies: { grunt: 4 } },
  { name: 'Đội tuần tra',   enemies: { grunt: 5, drone: 3 } },
  { name: 'Vòng vây',       enemies: { grunt: 6, drone: 4, bomber: 2 } },
  { name: 'Hàng phòng thủ', enemies: { grunt: 6, drone: 4, sniper: 2, bomber: 3 } },
  { name: 'Thiết giáp',     enemies: { grunt: 5, brute: 2, drone: 5 } },
  { name: 'Đêm dài',        enemies: { grunt: 8, drone: 5, sniper: 3, bomber: 3 } },
  { name: 'Cửa tử',         enemies: { grunt: 8, brute: 3, sniper: 3, drone: 6, bomber: 4 } },
  { name: 'WARDEN',         enemies: { grunt: 5, drone: 4, BOSS: 1 } },
];

function findSpawn(game, margin) {
  const p = game.player;
  for (let i = 0; i < 40; i++) {
    const x = rand(margin, WORLD_W - margin), y = rand(margin, WORLD_H - margin);
    if (game.world.hitsAny(x, y, 30)) continue;
    if (dist(x, y, p.x, p.y) < 520) continue;
    return { x, y };
  }
  return { x: rand(200, WORLD_W - 200), y: rand(200, WORLD_H - 200) };
}
