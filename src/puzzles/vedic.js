import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Puzzle, std } from './common.js';
import { textMesh } from '../text.js';
import { tween, ease } from '../tween.js';
import { sfx } from '../sound.js';

// The Vedic "cross" for 6–9 (Nikhilam, base 10):
//   8 │ 2      gaps from 10
//   7 │ 3
//   ──┼──      cross: 8 − 3 = 5 (tens), gaps: 2 × 3 = 6 (ones) → 56
// hint() plays the steps up to visual.stage (1 = gaps, 2 = cross, 3 = gaps multiplied + answer).
export class VedicPuzzle extends Puzzle {
  constructor(q, ctx) {
    super(q, ctx);
    const { a, b } = this.v;
    this.a = a;
    this.b = b;
    this.step = 0;
    const L = -1.3, R = 1.3, T = 1.9, M = 0.4, B = -1.6;
    this.at = { L, R, T, M, B };
    const num = (t, x, y, bg) => {
      const m = textMesh(t, 1.15, { color: bg ? '#ffffff' : '#3d2c5a', bg, weight: 700 });
      m.position.set(x, y, 0.2);
      this.group.add(m);
      return m;
    };
    const board = new THREE.Mesh(new RoundedBoxGeometry(6.4, 6.0, 0.2, 4, 0.4), std('#fffdf7'));
    board.position.set(0, 0.1, -0.3);
    this.group.add(board);
    num(String(a), L, T);
    num(String(b), L, M);
    this.gapA = num(String(10 - a), R, T, '#ff8fab');
    this.gapB = num(String(10 - b), R, M, '#ff8fab');
    const bar = (w, h, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), std('#3d2c5a'));
      m.position.set(x, y, 0);
      this.group.add(m);
    };
    bar(0.08, 3.9, 0, 0.6);
    bar(5.2, 0.08, 0, -0.55);
    this.cross = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.1), std('#3a86ff'));
    const dx = R - L, dy = M - T;
    this.cross.scale.x = Math.hypot(dx, dy) - 0.9;
    this.cross.rotation.z = Math.atan2(dy, dx);
    this.cross.position.set(0, (T + M) / 2, 0.15);
    this.tens = num(String(a + b - 10), L, B, '#3a86ff');
    this.ones = num(String((10 - a) * (10 - b)), R, B, '#ff8fab');
    this.note = textMesh(' ', 0.55, { color: '#ffffff', bg: '#9b5de5', weight: 600 });
    this.note.position.set(0, -2.75, 0.2);
    this.answer = textMesh(`${a} × ${b} = ${a * b}`, 0.8, { color: '#ffffff', bg: '#06a77d', weight: 700 });
    this.answer.position.set(0, 3.55, 0.2);
    this.group.add(this.cross, this.note, this.answer);
    for (const m of [this.gapA, this.gapB, this.cross, this.tens, this.ones, this.note, this.answer]) m.visible = false;
  }

  pop(m, delay = 0) {
    const s = m.scale.clone();
    return tween(0.4, (k) => {
      m.visible = true;
      m.scale.copy(s).multiplyScalar(Math.max(0.001, k));
    }, ease.back, delay).then(() => sfx.pop());
  }

  async play(upTo) {
    this.target = Math.max(this.target || 0, upTo);
    if (this.playing) return;
    this.playing = true;
    const { a, b } = this;
    while (this.step < this.target && this.group.parent) {
      this.step++;
      if (this.step === 1) {
        this.note.setText('How far from 10?');
        this.note.visible = true;
        await this.pop(this.gapA, 0.2);
        await this.pop(this.gapB, 0.2);
      } else if (this.step === 2) {
        this.note.setText(`Cross: ${a} − ${10 - b} = ${a + b - 10}`);
        await this.pop(this.cross, 0.2);
        await this.pop(this.tens, 0.3);
      } else {
        this.note.setText(`Gaps: ${10 - a} × ${10 - b} = ${(10 - a) * (10 - b)}`);
        await this.pop(this.ones, 0.3);
        await this.pop(this.answer, 0.4);
        sfx.star();
      }
    }
    this.playing = false;
  }

  hint() {
    this.play(this.v.stage || 3);
  }

  reveal() {
    this.play(3);
  }
}
