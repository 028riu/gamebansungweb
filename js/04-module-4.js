'use strict';

/* =====================================================================
   [4] INPUT — bàn phím + chuột + 2 JOYSTICK cảm ứng
   ===================================================================== */

const Input = {
  keys: {},
  mouse: { x: innerWidth / 2, y: innerHeight / 2, down: false, rdown: false },
  pressed: {},
  wheel: 0,

  // joystick trái: di chuyển (vec -1..1)
  moveVec: { x: 0, y: 0 },
  // joystick phải: ngắm (góc) + độ lớn > ngưỡng thì tự động bắn
  aimVec: { x: 0, y: 0 },
  aimActive: false,

  // nút cảm ứng
  tbtn: { reload: false, swap: false, dash: false, aim: false },

  swapQueued: false,
  meleeQueued: false,
};

window.addEventListener('keydown', e => {
  if (e.repeat) return;
  Input.keys[e.code] = true;
  Input.pressed[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { Input.keys[e.code] = false; });

const gameCanvas = document.getElementById('game');

window.addEventListener('mousemove', e => {
  Input.mouse.x = e.clientX;
  Input.mouse.y = e.clientY;
});
window.addEventListener('mousedown', e => {
  if (e.target.closest('button')) return;
  if (e.button === 0) Input.mouse.down = true;
  if (e.button === 2) Input.mouse.rdown = true;
  Sound.resume();
});
window.addEventListener('mouseup', e => {
  if (e.button === 0) Input.mouse.down = false;
  if (e.button === 2) Input.mouse.rdown = false;
});
window.addEventListener('contextmenu', e => {
  if (Game.state === 'playing') e.preventDefault();
});
window.addEventListener('blur', () => {
  Input.mouse.down = false;
  Input.mouse.rdown = false;
  Input.keys = {};
});
window.addEventListener('wheel', e => { Input.wheel = Math.sign(e.deltaY); }, { passive: true });

function consumePressed(code) {
  if (Input.pressed[code]) { Input.pressed[code] = false; return true; }
  return false;
}

/* ---------- Joystick cảm ứng ---------- */

class TouchJoy {
  constructor(baseId, knobId, onChange) {
    this.base = document.getElementById(baseId);
    this.knob = document.getElementById(knobId);
    this.onChange = onChange || function () {};
    this.touchId = null;
    this.cx = 0;
    this.cy = 0;
    this.maxR = 46;

    const opts = { passive: false };
    this.base.addEventListener('touchstart', e => this.start(e), opts);
    window.addEventListener('touchmove', e => this.move(e), opts);
    window.addEventListener('touchend',   e => this.end(e), opts);
    window.addEventListener('touchcancel',e => this.end(e), opts);
  }
  start(e) {
    e.preventDefault();
    if (this.touchId !== null) return;
    const t = e.changedTouches[0];
    this.touchId = t.identifier;
    const r = this.base.getBoundingClientRect();
    this.cx = r.left + r.width / 2;
    this.cy = r.top + r.height / 2;
    this.updateKnob(t.clientX, t.clientY);
    Sound.resume();
  }
  move(e) {
    if (this.touchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === this.touchId) {
        e.preventDefault();
        this.updateKnob(t.clientX, t.clientY);
        return;
      }
    }
  }
  end(e) {
    if (this.touchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === this.touchId) {
        this.touchId = null;
        this.knob.style.transform = 'translate(0px,0px)';
        this.onChange(0, 0);
        return;
      }
    }
  }
  updateKnob(x, y) {
    let dx = x - this.cx, dy = y - this.cy;
    const d = Math.hypot(dx, dy);
    if (d > this.maxR) { dx = dx / d * this.maxR; dy = dy / d * this.maxR; }
    this.knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const nx = dx / this.maxR, ny = dy / this.maxR;
    const mag = Math.hypot(nx, ny);
    if (mag < 0.16) this.onChange(0, 0);
    else this.onChange(nx, ny);
  }
}

let joyMove = null, joyAim = null;

function initTouchControls() {
  if (!Device.isTouch) return;
  joyMove = new TouchJoy('joy-move', 'knob-move', (x, y) => {
    Input.moveVec.x = x;
    Input.moveVec.y = y;
  });
  joyAim = new TouchJoy('joy-aim', 'knob-aim', (x, y) => {
    Input.aimVec.x = x;
    Input.aimVec.y = y;
    Input.aimActive = Math.hypot(x, y) > 0.28;
  });

  // các nút bấm
  const bindHold = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      el.classList.add('on');
      Input.tbtn[key] = true;
      Sound.resume();
    }, { passive: false });
    const off = e => { e.preventDefault(); el.classList.remove('on'); Input.tbtn[key] = false; };
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
  };
  bindHold('tb-reload', 'reload');
  bindHold('tb-aim', 'aim');
  bindHold('tb-dash', 'dash');

  // nút nhấp một lần
  const bindTap = (id, fn) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      Sound.resume();
      fn();
    }, { passive: false });
  };
  bindTap('tb-swap', () => { Input.swapQueued = true; });
  document.getElementById('tb-pause').addEventListener('touchstart', e => {
    e.preventDefault();
    if (Game.state === 'playing') Game.pause();
  }, { passive: false });
}

initTouchControls();
