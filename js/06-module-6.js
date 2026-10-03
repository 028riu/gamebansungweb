'use strict';

/* =====================================================================
   [6] 4 BẢN ĐỒ
   ===================================================================== */

const MAPS = {
  warehouse: {
    name: 'Kho hàng',
    build(w) {
      let placed = 0, guard = 0;
      while (placed < 34 && guard++ < 700) {
        const bx = rand(180, WORLD_W - 320), by = rand(180, WORLD_H - 320);
        if (dist(bx, by, WORLD_W / 2, WORLD_H / 2) < 330) continue;
        const n = randInt(2, 3);
        let ok = true;
        for (const o of w.obstacles) {
          if (bx < o.x + o.w + 60 && bx + 240 > o.x && by < o.y + o.h + 60 && by + 240 > o.y) { ok = false; break; }
        }
        if (!ok) continue;
        for (let i = 0; i < n; i++) {
          w.obstacles.push({ x: bx + rand(0, 110), y: by + rand(0, 110), w: randInt(48, 80), h: randInt(48, 80), kind: 'crate' });
        }
        placed++;
      }
    }
  },
  lab: {
    name: 'Phòng thí nghiệm',
    build(w) {
      const cx = WORLD_W / 2;
      const cols = 4, rows = 3;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (i === 1 && j === 1) continue;
          const x = WORLD_W * (0.18 + i * 0.215);
          const y = WORLD_H * (0.16 + j * 0.34);
          w.obstacles.push({ x, y, w: 170, h: 54, kind: 'block' });
          w.obstacles.push({ x: x + 40, y: y + 120, w: 90, h: 90, kind: 'crate' });
        }
      }
      w.obstacles.push({ x: cx - 320, y: 240, w: 40, h: 320, kind: 'wall2' });
      w.obstacles.push({ x: cx + 280, y: WORLD_H - 560, w: 40, h: 320, kind: 'wall2' });
    }
  },
  dunes: {
    name: 'Vành đai cát',
    build(w) {
      let placed = 0, guard = 0;
      while (placed < 12 && guard++ < 400) {
        const x = rand(240, WORLD_W - 420), y = rand(240, WORLD_H - 420);
        if (dist(x, y, WORLD_W / 2, WORLD_H / 2) < 380) continue;
        let ok = true;
        for (const o of w.obstacles) {
          if (x < o.x + o.w + 160 && x + 200 > o.x && y < o.y + o.h + 160 && y + 200 > o.y) { ok = false; break; }
        }
        if (!ok) continue;
        w.obstacles.push({ x, y, w: randInt(110, 190), h: randInt(110, 190), kind: 'rock' });
        placed++;
      }
      w.obstacles.push({ x: WORLD_W * 0.3, y: WORLD_H * 0.55, w: 260, h: 36, kind: 'wall2' });
      w.obstacles.push({ x: WORLD_W * 0.55, y: WORLD_H * 0.3, w: 36, h: 260, kind: 'wall2' });
    }
  },
  foundry: {
    name: 'Lò đúc',
    build(w) {
      // lưới phòng ô vuông với lối đi hình chữ thập
      const cellW = 520, cellH = 420;
      for (let ix = 0; ix < 5; ix++) {
        for (let iy = 0; iy < 4; iy++) {
          if (ix === 2 && iy === 1) continue; // chừa trung tâm spawn
          const ox = 120 + ix * cellW;
          const oy = 120 + iy * cellH;
          // 2 cạnh của ô (để tạo "cửa")
          const doorSide = randInt(0, 1);
          if (doorSide === 0) {
            w.obstacles.push({ x: ox, y: oy, w: cellW - 130, h: 34, kind: 'wall2' });
            w.obstacles.push({ x: ox, y: oy + cellH - 34, w: 130, h: 34, kind: 'wall2' });
          } else {
            w.obstacles.push({ x: ox + cellW - 34, y: oy, w: 34, h: cellH - 130, kind: 'wall2' });
            w.obstacles.push({ x: ox, y: oy + 130, w: 34, h: cellH - 130, kind: 'wall2' });
          }
          // thùng trong ô
          if ((ix + iy) % 2 === 0) {
            w.obstacles.push({ x: ox + cellW / 2 - 40, y: oy + cellH / 2 - 40, w: 80, h: 80, kind: 'crate' });
          }
        }
      }
    }
  },
};

class GameWorld {
  constructor(mapId) {
    this.obstacles = [];
    this.obstacles.push({ x: 0, y: 0, w: WORLD_W, h: WALL_T, kind: 'wall' });
    this.obstacles.push({ x: 0, y: WORLD_H - WALL_T, w: WORLD_W, h: WALL_T, kind: 'wall' });
    this.obstacles.push({ x: 0, y: 0, w: WALL_T, h: WORLD_H, kind: 'wall' });
    this.obstacles.push({ x: WORLD_W - WALL_T, y: 0, w: WALL_T, h: WORLD_H, kind: 'wall' });
    this.obstacles.push({ x: WORLD_W / 2 - 200, y: WORLD_H / 2 + 90, w: 170, h: 46, kind: 'block' });
    this.obstacles.push({ x: WORLD_W / 2 + 30,  y: WORLD_H / 2 + 90, w: 170, h: 46, kind: 'block' });
    (MAPS[mapId] || MAPS.warehouse).build(this);
  }

  hitsAny(x, y, pad) {
    for (const o of this.obstacles) {
      if (x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad) return true;
    }
    return false;
  }

  circlePush(ent) {
    for (const o of this.obstacles) {
      const nx = clamp(ent.x, o.x, o.x + o.w);
      const ny = clamp(ent.y, o.y, o.y + o.h);
      const dx = ent.x - nx, dy = ent.y - ny;
      const d = Math.hypot(dx, dy);
      if (d < ent.r) {
        if (d < 0.001) {
          const left = ent.x - o.x, right = o.x + o.w - ent.x;
          const top = ent.y - o.y, bot = o.y + o.h - ent.y;
          const m = Math.min(left, right, top, bot);
          if (m === left) ent.x = o.x - ent.r;
          else if (m === right) ent.x = o.x + o.w + ent.r;
          else if (m === top) ent.y = o.y - ent.r;
          else ent.y = o.y + o.h + ent.r;
        } else {
          const k = (ent.r - d) / d;
          ent.x += dx * k;
          ent.y += dy * k;
        }
      }
    }
    ent.x = clamp(ent.x, ent.r, WORLD_W - ent.r);
    ent.y = clamp(ent.y, ent.r, WORLD_H - ent.r);
  }

  static segRect(x1, y1, x2, y2, o) {
    const dx = x2 - x1, dy = y2 - y1;
    let tmin = 0, tmax = 1;
    if (Math.abs(dx) < 1e-9) {
      if (x1 < o.x || x1 > o.x + o.w) return null;
    } else {
      let t1 = (o.x - x1) / dx, t2 = (o.x + o.w - x1) / dx;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    if (Math.abs(dy) < 1e-9) {
      if (y1 < o.y || y1 > o.y + o.h) return null;
    } else {
      let t1 = (o.y - y1) / dy, t2 = (o.y + o.h - y1) / dy;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    return tmin;
  }

  raycast(x1, y1, x2, y2) {
    let best = null, bestT = 1;
    for (const o of this.obstacles) {
      const t = GameWorld.segRect(x1, y1, x2, y2, o);
      if (t !== null && t < bestT) { bestT = t; best = o; }
    }
    return best ? { o: best, t: bestT } : null;
  }
}
