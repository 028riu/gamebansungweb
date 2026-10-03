'use strict';

/* =====================================================================
   [5] CAMERA — rung, zoom, chớp màn
   ===================================================================== */

const Camera = {
  x: 0, y: 0,
  trauma: 0,
  ox: 0, oy: 0,
  zoom: 1,
  zoomTarget: 1,
  flashT: 0,

  addTrauma(t) { this.trauma = clamp(this.trauma + t, 0, 1); },
  flash(a)     { this.flashT = Math.max(this.flashT, a); },
  punchZoom(z) { this.zoomTarget = clamp(this.zoomTarget * z, 0.82, 1.25); },

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    const s = this.trauma * this.trauma;
    this.ox = rand(-s * 26, s * 26);
    this.oy = rand(-s * 26, s * 26);
    this.zoomTarget = lerp(this.zoomTarget, 1, 1 - Math.pow(0.02, dt));
    this.zoom = lerp(this.zoom, this.zoomTarget, 1 - Math.pow(0.001, dt));
    this.flashT = Math.max(0, this.flashT - dt * 3.5);
  },

  follow(px, py, dt, vw, vh) {
    const k = 1 - Math.pow(0.0001, dt);
    this.x = lerp(this.x, clamp(px - vw / 2, -60, WORLD_W - vw + 60), k);
    this.y = lerp(this.y, clamp(py - vh / 2, -60, WORLD_H - vh + 60), k);
  },
};
