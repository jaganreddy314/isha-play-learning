import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Puzzle, ItemSet, std, PASTELS } from './common.js';
import { textMesh } from '../text.js';
import { tween, ease } from '../tween.js';
import { sfx } from '../sound.js';

// Multiplication as an array: `rows` groups of `cols`. Tap items to count them.
export class ArrayPuzzle extends Puzzle {
  constructor(q, ctx) {
    super(q, ctx);
    const { rows, cols, item } = this.v;
    this.rows = rows;
    this.cols = cols;
    const s = (this.s = Math.min(1.05, 8.0 / cols, 5.4 / rows));
    this.x0 = -0.45 - ((cols - 1) * s) / 2;
    this.y0 = ((rows - 1) * s) / 2 - 0.2;
    for (let r = 0; r < rows; r++) {
      const tray = new THREE.Mesh(new RoundedBoxGeometry(cols * s + 0.2 * s, s * 0.86, 0.16, 2, 0.06), std(PASTELS[r % PASTELS.length]));
      tray.position.set(this.x0 + ((cols - 1) * s) / 2, this.y0 - r * s, -0.35);
      this.group.add(tray);
    }
    this.items = new ItemSet(item, rows * cols, this.group);
    this.tapped = new Set();
    this.pop = new Float32Array(rows * cols);
    this.counter = textMesh(' ', 0.62, { color: '#3d2c5a', weight: 700 });
    this.counter.position.set(-0.45, this.y0 + s * 0.5 + 0.5, 0.3);
    this.counter.visible = false;
    this.group.add(this.counter);
    this.rowLabels = [];
  }

  update(dt) {
    super.update(dt);
    const { s, items } = this;
    for (let i = 0; i < items.count; i++) {
      const r = Math.floor(i / this.cols), c = i % this.cols;
      const k = Math.min(1, Math.max(0, (this.time - r * 0.16 - c * 0.035) / 0.4));
      this.pop[i] = Math.max(0, this.pop[i] - dt * 3);
      items.scale[i] = ease.back(k) * s * 0.92 * (1 + this.pop[i] * 0.4);
      items.pos[i].set(this.x0 + c * s, this.y0 - r * s + Math.sin(this.time * 2 + i * 0.4) * 0.03 * s, 0);
    }
    items.sync(this.time);
  }

  pointer(type, ray) {
    if (type !== 'down') return false;
    const hit = ray.intersectObjects(this.items.meshes)[0];
    if (!hit) return false;
    const i = hit.instanceId;
    if (this.tapped.has(i)) {
      this.tapped.delete(i);
      this.items.setColor(i);
    } else {
      this.tapped.add(i);
      this.items.setColor(i, '#ffd60a');
    }
    this.pop[i] = 1;
    sfx.pop();
    this.counter.visible = this.tapped.size > 0;
    this.counter.setText(`Counted: ${this.tapped.size}`);
    return true;
  }

  hint() {
    if (this.rowLabels.length) return;
    const h = Math.min(0.6, this.s * 0.85);
    for (let r = 0; r < this.rows; r++) {
      const g = new THREE.Group();
      const m = textMesh(String((r + 1) * this.cols), h, { color: '#ffffff', bg: '#ef476f', weight: 700 });
      g.add(m);
      g.position.set(this.x0 + (this.cols - 1) * this.s + this.s * 0.55 + m.userData.width / 2, this.y0 - r * this.s, 0.3);
      g.scale.setScalar(0.001);
      this.group.add(g);
      this.rowLabels.push(g);
      tween(0.35, (k) => g.scale.setScalar(Math.max(0.001, k)), ease.back, r * 0.35).then(() => sfx.tick());
    }
  }

  reveal() {
    this.hint();
    this.counter.visible = true;
    this.counter.setText(`${this.rows} × ${this.cols} = ${this.rows * this.cols}`);
  }
}
