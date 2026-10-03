'use strict';

/* =====================================================================
   [2] PHÁT HIỆN THIẾT BỊ
   ===================================================================== */

const Device = {
  isTouch: false,
  check() {
    this.isTouch = (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
    if (this.isTouch) document.body.classList.add('touch');
    this.updateOrientation();
  },
  updateOrientation() {
    const portrait = innerHeight > innerWidth;
    document.body.classList.toggle('portrait', portrait);
  },
};
Device.check();
window.addEventListener('resize', () => Device.updateOrientation());
window.addEventListener('orientationchange', () => setTimeout(() => Device.updateOrientation(), 120));
