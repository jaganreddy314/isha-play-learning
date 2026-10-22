import * as THREE from 'three';
import { Puzzle, ItemSet, std, BRIGHTS } from './common.js';
import { textMesh } from '../text.js';
import { tween, ease } from '../tween.js';
import { sfx } from '../sound.js';

// Division as sharing: items in a pile get dealt into baskets.
// mode 'share': `groups` baskets, deal one to each per tap.
// mode 'group': fill bags of `per` items; a new bag appears per tap.
export class SharePuzzle extends Puzzle {
  constructor(q, ctx) {
    super(q, ctx);
    const { total, groups, mode = 'share', item } = this.v;
    this.total = total;
    this.groups = groups;
    this.mode = mode;
    this.per = total / groups;
    this.dealt = 0;

    const pc = Math.min(12, Math.ceil(Math.sqrt(total * 2.4)));
    const pr = Math.ceil(total / pc);
    const ps = (this.ps = Math.min(0.62, 9 / pc, 2.7 / pr));
    const topY = 1.6 + ((pr - 1) * ps) / 2;
    this.home = Array.from({ length: total }, (_, i) => new THREE.Vector3(((i % pc) - (pc - 1) / 2) * ps, topY - Math.floor(i / pc) * ps, 0));
    this.pileHit = new THREE.Mesh(new THREE.PlaneGeometry(pc * ps + 1, pr * ps + 1), new THREE.MeshBasicMaterial({ visible: false }));
    this.pileHit.position.set(0, 1.6, 0.3);
    this.group.add(this.pileHit);

    const bw = (this.bw = Math.min(1.7, 9.6 / groups));
    const cc = Math.ceil(Math.sqrt(this.per));
    this.bs = Math.min(ps, (bw * 0.75) / cc);
    this.baskets = [];
    this.counts = new Array(groups).fill(0);
    for (let b = 0; b < groups; b++) {
      const g = new THREE.Group();
      g.position.set((b - (groups - 1) / 2) * bw, -2.25, 0);
      const color = BRIGHTS[b % BRIGHTS.length];
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(bw * 0.42, bw * 0.3, bw * 0.34, 20, 1, true), std(color, { side: THREE.DoubleSide }));
      g.add(bowl);
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(bw * 0.3, 20), std(color));
      bottom.rotation.x = -Math.PI / 2;
      bottom.position.y = -bw * 0.17;
      g.add(bottom);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(bw * 0.42, 0.04, 8, 28), std('#ffffff'));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = bw * 0.17;
      g.add(rim);
      g.rotation.x = 0.35;
      const label = textMesh('?', Math.min(0.55, bw * 0.45), { color: '#3d2c5a', weight: 700 });
      label.position.set(g.position.x, -3.05, 0.3);
      this.group.add(g, label);
      if (mode === 'group') {
        g.scale.setScalar(0.001);
        label.visible = false;
      }
      this.baskets.push({ g, label });
    }
    this.items = new ItemSet(item, total, this.group);
    for (let i = 0; i < total; i++) {
      this.items.pos[i].copy(this.home[i]);
      this.items.scale[i] = 0;
    }
    this.queue = Promise.resolve();
  }

  slotFor(i) {
    const b = this.mode === 'share' ? i % this.groups : Math.floor(i / this.per);
    const k = this.mode === 'share' ? Math.floor(i / this.groups) : i % this.per;
    const cc = Math.ceil(Math.sqrt(this.per));
    const bx = this.baskets[b].g.position.x;
    const pos = new THREE.Vector3(bx + ((k % cc) - (cc - 1) / 2) * this.bs, -2.25 + this.bw * 0.1 + Math.floor(k / cc) * this.bs * 0.85, 0.2 + Math.floor(k / cc) * 0.02);
    return { b, pos };
  }

  update(dt) {
    super.update(dt);
    for (let i = this.dealt; i < this.total; i++) {
      const k = Math.min(1, Math.max(0, (this.time - i * 0.02) / 0.35));
      this.items.scale[i] = ease.back(k) * this.ps * 0.9;
    }
    this.items.sync(this.time * 0.4);
  }

  dealItem(i, speed = 1) {
    const { b, pos } = this.slotFor(i);
    const from = this.items.pos[i].clone();
    const s0 = this.ps * 0.9, s1 = this.bs * 0.9;
    const basket = this.baskets[b];
    if (this.mode === 'group' && basket.g.scale.x < 0.5) {
      basket.label.visible = true;
      tween(0.3, (k) => basket.g.scale.setScalar(Math.max(0.001, k)), ease.back);
    }
    return tween(0.45 / speed, (k) => {
      this.items.pos[i].lerpVectors(from, pos, k);
      this.items.pos[i].y += Math.sin(Math.PI * k) * 1.2;
      this.items.scale[i] = s0 + (s1 - s0) * k;
    }).then(() => {
      this.counts[b]++;
      basket.label.setText(String(this.counts[b]));
      sfx.pop();
    });
  }

  // One tap = one round: one item per basket (share) or one full bag (group).
  dealRound(speed = 1) {
    const n = this.mode === 'share' ? this.groups : this.per;
    const start = this.dealt;
    const end = Math.min(this.total, start + n);
    if (start >= end) return Promise.resolve();
    this.dealt = end;
    const jobs = [];
    for (let i = start; i < end; i++) jobs.push(tween(((i - start) * 0.08) / speed, () => {}).then(() => this.dealItem(i, speed)));
    return Promise.all(jobs);
  }

  pointer(type, ray) {
    if (type !== 'down' || this.locked) return false;
    if (!ray.intersectObject(this.pileHit).length) return false;
    this.dealRound(1.4);
    return true;
  }

  async dealAll() {
    const rounds = Math.ceil((this.total - this.dealt) / (this.mode === 'share' ? this.groups : this.per));
    const speed = Math.max(1, rounds / 5);
    while (this.dealt < this.total) {
      await this.dealRound(speed * 1.4);
      if (!this.group.parent) return;
    }
  }

  hint() {
    this.dealAll();
  }

  reveal() {
    this.locked = true;
    this.dealAll();
  }
}
