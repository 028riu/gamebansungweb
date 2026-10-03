'use strict';

/* =====================================================================
   [8] VẾT BẨN PERSISTENT
   ===================================================================== */

const Stains = {
  canvas: null, ctx: null,
  reset() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = WORLD_W;
    this.canvas.height = WORLD_H;
    this.ctx = this.canvas.getContext('2d');
  },
  splat(x, y, r, color, alpha) {
    const c = this.ctx;
    c.fillStyle = rgba(color, alpha);
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    for (let i = 0; i < 4; i++) {
      const a = rand(0, TAU), d = rand(r * 0.6, r * 2.2);
      c.beginPath();
      c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rand(r * 0.15, r * 0.45), 0, TAU);
      c.fill();
    }
  },
  scorch(x, y, r) { this.splat(x, y, r, '#000', 0.22); },
  draw(ctx) { ctx.drawImage(this.canvas, 0, 0); },
};
