import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Puzzle, std } from './common.js';
import { textMesh } from '../text.js';
import { tween, ease, wait } from '../tween.js';
import { makeCritter } from '../critters.js';
import { sfx } from '../sound.js';

const X0 = -4.5, LEN = 9, Y = -0.5;

// A number line: tap to place a flag, read an arrow, watch Freddie hop, or round a marked number.
export class LinePuzzle extends Puzzle {
  constructor(q, ctx) {
    super(q, ctx);
    const v = this.v;
    this.n = Math.round((v.max - v.min) / v.step);
    this.interactive = q.kind === 'line-tap';

    const bar = new THREE.Mesh(new RoundedBoxGeometry(LEN + 0.6, 0.2, 0.2, 2, 0.08), std('#3a86ff'));
    bar.position.set(0, Y, 0);
    this.group.add(bar);
    for (const s of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 12), std('#3a86ff'));
      tip.rotation.z = -s * Math.PI / 2;
      tip.position.set(s * (LEN / 2 + 0.45), Y, 0);
      this.group.add(tip);
    }
    this.ticks = [];
    this.small = new THREE.Group();
    this.small.visible = false;
    this.group.add(this.small);
    const dark = std('#1d3557');
    const smallH = this.n > 12 ? 0.32 : 0.4;
    for (let i = 0; i <= this.n; i++) {
      const major = i % v.labelEvery === 0;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.07, major ? 0.6 : 0.36, 0.12), dark.clone());
      t.position.set(this.xOf(i), Y, 0.06);
      this.group.add(t);
      this.ticks.push(t);
      if (major) {
        const l = textMesh(this.label(i), 0.55, { color: '#1d3557', weight: 700 });
        l.position.set(this.xOf(i), Y - 0.75, 0.1);
        this.group.add(l);
      } else {
        const l = textMesh(this.label(i), smallH, { color: '#6c757d', weight: 600 });
        l.position.set(this.xOf(i), Y - 0.7 - (this.n > 12 && i % 2 ? 0.34 : 0), 0.1);
        this.small.add(l);
      }
    }

    if (v.arrow != null) {
      this.arrow = new THREE.Group();
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 14), std('#ff9f1c'));
      c.rotation.x = Math.PI;
      this.arrow.add(c);
      this.arrowLabel = textMesh('?', 0.7, { color: '#ffffff', bg: '#ff9f1c', weight: 700 });
      this.arrowLabel.position.y = 0.75;
      this.arrow.add(this.arrowLabel);
      this.arrow.position.set(this.xv(v.arrow), Y + 0.8, 0.2);
      this.group.add(this.arrow);
    }
    if (v.mark != null) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), std('#ff006e'));
      dot.position.set(this.xv(v.mark), Y, 0.18);
      const l = textMesh(String(v.mark), 0.62, { color: '#ffffff', bg: '#ff006e', weight: 700 });
      l.position.set(this.xv(v.mark), Y + 0.75, 0.2);
      this.group.add(dot, l);
    }
    if (v.frog != null) {
      this.frog = makeCritter({ body: '#7ed957', belly: '#d8f5b0', ears: 'none', frog: true, scale: 0.42 });
      this.frogAt = v.frog;
      this.frog.position.set(this.xv(v.frog), Y + 0.1, 0.25);
      this.group.add(this.frog);
      const start = textMesh(String(v.frog), 0.5, { color: '#ffffff', bg: '#2d6a4f', weight: 700 });
      start.position.set(this.xv(v.frog), Y - 1.35, 0.15);
      this.group.add(start);
    }
    if (this.interactive) {
      this.hit = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 1.2, 3.4), new THREE.MeshBasicMaterial({ visible: false }));
      this.hit.position.set(0, Y + 0.2, 0.3);
      this.group.add(this.hit);
      this.pin = this.makePin('#ef233c');
      this.pin.visible = false;
      this.group.add(this.pin);
      this.sel = null;
    }
    this.extras = new THREE.Group();
    this.group.add(this.extras);
  }

  xOf(i) {
    return X0 + (i / this.n) * LEN;
  }
  xv(value) {
    return X0 + ((value - this.v.min) / (this.v.max - this.v.min)) * LEN;
  }
  label(i) {
    const v = this.v;
    if (v.fmt === 'frac') return i === 0 ? '0' : i === v.den ? '1' : `${i}/${v.den}`;
    return String(Math.round((v.min + i * v.step) * 1000) / 1000);
  }

  makePin(color) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8), std('#5c4033'));
    pole.position.y = 0.65;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.7, -0.22);
    shape.lineTo(0, -0.44);
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(shape), std(color, { side: THREE.DoubleSide }));
    flag.position.set(0.03, 1.28, 0);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), std('#ffd166'));
    knob.position.y = 1.32;
    g.add(pole, flag, knob);
    g.position.y = Y + 0.08;
    g.position.z = 0.25;
    return g;
  }

  update(dt) {
    super.update(dt);
    if (this.arrow) this.arrow.position.y = Y + 0.8 + Math.abs(Math.sin(this.time * 3)) * 0.18;
    if (this.pin?.visible && this.pinX != null) this.pin.position.x += (this.pinX - this.pin.position.x) * Math.min(1, dt * 18);
  }

  pointer(type, ray) {
    if (!this.interactive || this.locked) return false;
    if (type === 'up') {
      this.dragging = false;
      return false;
    }
    if (type === 'move' && !this.dragging) return false;
    const hit = ray.intersectObject(this.hit)[0];
    if (!hit) return false;
    const p = this.group.worldToLocal(hit.point.clone());
    const i = Math.max(0, Math.min(this.n, Math.round(((p.x - X0) / LEN) * this.n)));
    this.dragging = true;
    if (i !== this.sel) {
      if (this.sel == null) this.pin.position.x = this.xOf(i);
      this.sel = i;
      this.pin.visible = true;
      this.pinX = this.xOf(i);
      sfx.tick();
      this.ctx.onChange?.();
    }
    return true;
  }

  value() {
    return this.sel == null ? null : this.v.min + this.sel * this.v.step;
  }

  async playHops() {
    if (this.hopping || this.hopped) return;
    this.hopping = true;
    const { hop, hops } = this.v;
    for (let k = 0; k < hops; k++) {
      if (!this.group.parent) return;
      const from = this.frogAt, to = from + hop;
      const x1 = this.xv(from), x2 = this.xv(to);
      const hgt = 0.5 + Math.min(0.9, Math.abs(x2 - x1) * 0.5);
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x1, Y + 0.15, 0.12), new THREE.Vector3((x1 + x2) / 2, Y + 0.15 + hgt * 2, 0.12), new THREE.Vector3(x2, Y + 0.15, 0.12));
      const arc = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.035, 6), std('#ff006e'));
      this.extras.add(arc);
      if (Math.abs(hop) > 1 || hops <= 6) {
        const l = textMesh(`${hop > 0 ? '+' : '−'}${Math.abs(hop)}`, 0.4, { color: '#ff006e', weight: 700 });
        l.position.set((x1 + x2) / 2, Y + 0.45 + hgt, 0.15);
        this.extras.add(l);
      }
      sfx.hop();
      await tween(0.42, (t) => {
        this.frog.position.x = x1 + (x2 - x1) * t;
        this.frog.position.y = Y + 0.1 + Math.sin(Math.PI * t) * hgt;
      }, ease.linear);
      this.frogAt = to;
      await wait(0.08);
    }
    this.hopping = false;
    this.hopped = true;
  }

  showHalf() {
    if (this.halfShown) return;
    this.halfShown = true;
    const mid = this.n / 2;
    this.ticks[mid].material.color.set('#ff9f1c');
    this.ticks[mid].scale.set(1.5, 1.4, 1);
    const l = textMesh(`halfway ${this.label(mid)}`, 0.45, { color: '#ffffff', bg: '#ff9f1c', weight: 700 });
    l.position.set(this.xOf(mid), Y - 1.5, 0.15);
    this.extras.add(l);
    this.small.visible = true;
  }

  showFrac() {
    if (this.fracShown) return;
    this.fracShown = true;
    this.small.visible = true;
    const colors = ['#ffadad', '#caffbf', '#9bf6ff', '#ffd6a5', '#bdb2ff', '#fdffb6', '#ffc6ff', '#a0c4ff'];
    for (let i = 0; i < this.n; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(LEN / this.n - 0.06, 0.45, 0.05), std(colors[i % colors.length]));
      seg.position.set((this.xOf(i) + this.xOf(i + 1)) / 2, Y + 0.45, -0.05);
      this.extras.add(seg);
    }
  }

  hint() {
    const mode = this.v.hintMode;
    if (mode === 'hop') this.playHops();
    else if (mode === 'half') this.showHalf();
    else if (mode === 'frac') this.showFrac();
    else this.small.visible = true;
  }

  async reveal() {
    this.locked = true;
    this.small.visible = true;
    const q = this.q;
    if (this.interactive) {
      if (this.pin) this.pin.visible = false;
      const good = this.makePin('#06d6a0');
      good.position.x = this.xv(q.answer);
      const l = textMesh(q.answerText, 0.6, { color: '#ffffff', bg: '#06d6a0', weight: 700 });
      l.position.set(0.3, 1.75, 0);
      good.add(l);
      this.extras.add(good);
    }
    if (this.v.hintMode === 'half') this.showHalf();
    if (this.v.hintMode === 'frac') this.showFrac();
    if (this.arrowLabel) this.arrowLabel.setText(q.answerText);
    if (this.frog) {
      while (this.hopping) await wait(0.1);
      await this.playHops();
      const l = textMesh(q.answerText, 0.6, { color: '#ffffff', bg: '#06d6a0', weight: 700 });
      l.position.set(this.xv(Number(q.answer)), Y + 1.6, 0.2);
      this.extras.add(l);
    }
  }
}
