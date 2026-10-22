import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Puzzle, ItemSet, std } from './common.js';
import { textMesh } from '../text.js';
import { tween, ease } from '../tween.js';
import { sfx } from '../sound.js';

const A = '#4cc9f0', B = '#ff8fab', GHOST = '#d9d6e8';

// An array split into two easy parts (7 = 5 + 2), or with "ghost" columns taken away (9 = 10 − 1).
export class SplitPuzzle extends Puzzle {
  constructor(q, ctx) {
    super(q, ctx);
    const { rows, cols, split = 0, ghost = 0 } = this.v;
    this.rows = rows;
    this.cols = cols;
    const cut = ghost ? cols - ghost : split;
    this.cut = cut;
    const gap = cut ? 0.45 : 0;
    const s = (this.s = Math.min(0.95, 7.6 / (cols + gap), 4.6 / rows));
    this.gap = gap * s;
    const width = cols * s + this.gap;
    this.x0 = -width / 2 + s / 2;
    this.y0 = ((rows - 1) * s) / 2;
    this.items = new ItemSet('berry', rows * cols, this.group);
    this.items.meshes[0].material.color.set('#ffffff'); // instance colours multiply the base colour
    for (let i = 0; i < rows * cols; i++) this.items.setColor(i, this.part(i % cols) ? (ghost ? GHOST : B) : A);
    // a coloured base under each part
    for (const [from, to, color] of [[0, cut || cols, A], [cut, cols, ghost ? GHOST : B]]) {
      if (to <= from) continue;
      const w = (to - from) * s;
      const base = new THREE.Mesh(new RoundedBoxGeometry(w + 0.1 * s, rows * s + 0.12 * s, 0.12, 2, 0.06), std(color, { transparent: true, opacity: 0.25 }));
      base.position.set(this.xOf(from) - s / 2 + w / 2, this.y0 - ((rows - 1) * s) / 2, -0.35);
      this.group.add(base);
    }
    this.labels = new THREE.Group();
    this.group.add(this.labels);
    this.shown = false;
  }

  part(c) {
    return this.cut && c >= this.cut ? 1 : 0;
  }
  xOf(c) {
    return this.x0 + c * this.s + (this.part(c) ? this.gap : 0);
  }

  update(dt) {
    super.update(dt);
    const { s, items, cols } = this;
    for (let i = 0; i < items.count; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const k = Math.min(1, Math.max(0, (this.time - r * 0.05 - c * 0.04) / 0.4));
      const ghost = this.v.ghost && this.part(c);
      items.scale[i] = ease.back(k) * s * (ghost ? 0.55 : 0.9);
      items.pos[i].set(this.xOf(c), this.y0 - r * s + Math.sin(this.time * 2 + i * 0.4) * 0.025 * s, 0);
    }
    items.sync(this.time);
  }

  // `left` anchors the label's left edge at x instead of its centre.
  addLabel(text, bg, x, y, left = false) {
    const m = textMesh(text, 0.62, { color: '#ffffff', bg, weight: 700 });
    const g = new THREE.Group();
    g.add(m);
    g.position.set(left ? x + m.userData.width / 2 : x, y, 0.3);
    g.scale.setScalar(0.001);
    this.labels.add(g);
    tween(0.35, (k) => g.scale.setScalar(Math.max(0.001, k)), ease.back, this.labels.children.length * 0.45).then(() => sfx.pop());
  }

  hint() {
    if (this.shown || !this.v.labels) return;
    this.shown = true;
    const { s, rows, cols, cut } = this;
    const [la, lb] = this.v.labels;
    const top = this.y0 + s * 0.5 + 0.45;
    const bottom = this.y0 - (rows - 0.5) * s - 0.45;
    if (this.v.ghost) {
      this.addLabel(la, '#3a86ff', 0, top);
      this.addLabel(lb, '#9b5de5', 0, bottom);
      return;
    }
    const mid = (from, to) => (this.xOf(from) + this.xOf(to - 1)) / 2;
    this.addLabel(la, '#1b98c9', mid(0, cut), top);
    const right = this.xOf(cols - 1) + s * 0.5;
    if ((cols - cut) * s > 1.4) this.addLabel(lb, '#e85d8c', mid(cut, cols), top);
    else this.addLabel(lb, '#e85d8c', right + 0.3, this.y0 - ((rows - 1) * s) / 2, true);
  }

  reveal() {
    this.hint();
    if (this.total) return;
    const { rows, cols, s } = this;
    const n = rows * (cols - (this.v.ghost || 0));
    const y = this.y0 - (rows - 0.5) * s - (this.v.ghost ? 1.3 : 0.6);
    const eq = `${rows} × ${cols - (this.v.ghost || 0)} = ${n}`;
    this.total = true;
    this.addLabel(eq, '#06a77d', 0, y);
  }
}
