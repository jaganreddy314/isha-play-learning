import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Puzzle, std } from './common.js';
import { textMesh } from '../text.js';
import { tween, ease } from '../tween.js';
import { sfx } from '../sound.js';

const TAU = Math.PI * 2;
const fmt = (total) => {
  const t = ((Math.round(total) % 720) + 720) % 720;
  return `${Math.floor(t / 60) || 12}:${String(t % 60).padStart(2, '0')}`;
};

// An analogue clock. In 'clock-set' questions the hands can be dragged:
// grab near the rim for the minute hand, near the middle for the hour hand.
export class ClockPuzzle extends Puzzle {
  constructor(q, ctx) {
    super(q, ctx);
    this.interactive = q.kind === 'clock-set';
    this.step = this.v.step || 5;
    this.total = ((this.v.h % 12) * 60 + this.v.m) % 720;
    this.shown = this.total;
    const R = 2.55;
    const c = (this.clock = new THREE.Group());
    c.position.set(-1.1, 0.05, 0);
    this.group.add(c);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.18, R + 0.18, 0.45, 64), std('#ff8fab'));
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.2;
    c.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.12, 0.17, 16, 64), std('#ffd166', { metalness: 0.3, roughness: 0.35 }));
    rim.position.z = 0.05;
    c.add(rim);
    const face = new THREE.Mesh(new THREE.CircleGeometry(R, 64), std('#fffdf7'));
    face.position.z = 0.06;
    c.add(face);

    const dark = std('#3d2c5a');
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      const a = (i / 60) * TAU;
      const t = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.08 : 0.035, big ? 0.3 : 0.15, 0.02), dark);
      const rr = R - (big ? 0.22 : 0.15);
      t.position.set(Math.sin(a) * rr, Math.cos(a) * rr, 0.08);
      t.rotation.z = -a;
      c.add(t);
    }
    for (let k = 1; k <= 12; k++) {
      const a = (k / 12) * TAU;
      const n = textMesh(String(k), 0.7, { color: '#2b2d42', weight: 700 });
      n.position.set(Math.sin(a) * (R - 0.72), Math.cos(a) * (R - 0.72), 0.09);
      c.add(n);
    }
    this.ring = new THREE.Group();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      const n = textMesh(k ? String(k * 5) : '00', 0.4, { color: '#118ab2', weight: 700 });
      n.position.set(Math.sin(a) * (R + 0.6), Math.cos(a) * (R + 0.6), 0.1);
      this.ring.add(n);
    }
    this.ring.scale.setScalar(0.001);
    this.ring.visible = false;
    c.add(this.ring);

    const hand = (len, w, color, z) => {
      const geo = new RoundedBoxGeometry(w, len, 0.08, 2, w * 0.45);
      geo.translate(0, len / 2 - 0.18, 0);
      const m = new THREE.Mesh(geo, std(color));
      m.position.z = z;
      c.add(m);
      return m;
    };
    this.hourHand = hand(1.5, 0.28, '#ef476f', 0.14);
    this.minuteHand = hand(2.2, 0.16, '#118ab2', 0.2);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 20), std('#ffd166', { metalness: 0.4 }));
    cap.rotation.x = Math.PI / 2;
    cap.position.z = 0.27;
    c.add(cap);

    if (this.interactive) {
      this.hit = new THREE.Mesh(new THREE.PlaneGeometry(2 * R + 2, 2 * R + 2), new THREE.MeshBasicMaterial({ visible: false }));
      this.hit.position.z = 0.3;
      c.add(this.hit);
    }

    this.display = new THREE.Group();
    this.display.position.set(3.75, 0.05, 0);
    const screen = new THREE.Mesh(new RoundedBoxGeometry(2.5, 1.2, 0.25, 3, 0.15), std('#22223b'));
    this.display.add(screen);
    this.readout = textMesh(fmt(this.total), 0.95, { color: '#80ffdb', weight: 700 });
    this.readout.position.z = 0.14;
    this.display.add(this.readout);
    this.display.visible = !!this.v.digital;
    this.group.add(this.display);
    this.applyHands();
  }

  applyHands() {
    const m = ((this.shown % 60) + 60) % 60;
    const h = ((((this.shown / 60) % 12) + 12) % 12);
    this.minuteHand.rotation.z = -(m / 60) * TAU;
    this.hourHand.rotation.z = -(h / 12) * TAU;
  }

  update(dt) {
    super.update(dt);
    if (!this.animating) this.shown = this.total;
    this.applyHands();
    if (!this.interactive && !this.revealed) this.clock.rotation.z = Math.sin(this.time * 1.2) * 0.02;
  }

  setTotal(t) {
    t = ((t % 720) + 720) % 720;
    if (t === this.total) return;
    this.total = t;
    this.readout.setText(fmt(t));
    sfx.tick();
    this.ctx.onChange?.();
  }

  local(ray) {
    const hit = ray.intersectObject(this.hit)[0];
    return hit ? this.clock.worldToLocal(hit.point.clone()) : null;
  }

  pointer(type, ray) {
    if (!this.interactive || this.locked) return false;
    if (type === 'up') {
      this.drag = null;
      return false;
    }
    const p = this.local(ray);
    if (!p) return false;
    if (type === 'down') {
      if (Math.hypot(p.x, p.y) > 3.6) return false;
      this.drag = Math.hypot(p.x, p.y) > 1.35 ? 'm' : 'h';
    }
    if (!this.drag) return false;
    let a = Math.atan2(p.x, p.y);
    if (a < 0) a += TAU;
    const m = this.total % 60;
    if (this.drag === 'm') {
      const nm = (Math.round(((a / TAU) * 60) / this.step) * this.step) % 60;
      let delta = nm - m;
      if (delta > 30) delta -= 60;
      if (delta < -30) delta += 60;
      this.setTotal(this.total + delta);
    } else {
      const hh = ((Math.round((a / TAU) * 12 - m / 60) % 12) + 12) % 12;
      this.setTotal(hh * 60 + m);
    }
    return true;
  }

  value() {
    return { h: Math.floor(this.total / 60) % 12 || 12, m: this.total % 60 };
  }

  showRing() {
    if (this.ring.visible) return;
    this.ring.visible = true;
    tween(0.5, (k) => this.ring.scale.setScalar(Math.max(0.001, k)), ease.back);
  }

  hint() {
    this.showRing();
    if (this.interactive && this.q.level === 1) this.display.visible = true;
  }

  reveal() {
    this.locked = true;
    this.revealed = true;
    this.showRing();
    const ans = this.q.answer && typeof this.q.answer === 'object' ? this.q.answer : null;
    if (!ans) {
      this.readout.setText(fmt(this.total));
      this.display.visible = true;
      return;
    }
    const target = (ans.h % 12) * 60 + ans.m;
    let diff = target - (((this.shown % 720) + 720) % 720);
    if (diff > 360) diff -= 720;
    if (diff < -360) diff += 720;
    const s0 = this.shown;
    this.animating = true;
    this.total = target;
    this.readout.setText(fmt(target));
    this.display.visible = true;
    tween(1.4, (k) => (this.shown = s0 + diff * k)).then(() => (this.animating = false));
  }
}
