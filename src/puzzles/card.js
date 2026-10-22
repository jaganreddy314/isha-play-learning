import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Puzzle, std, BRIGHTS } from './common.js';
import { textMesh } from '../text.js';

// A floating word card for English questions (and anything without a special visual).
export class CardPuzzle extends Puzzle {
  constructor(q, ctx) {
    super(q, ctx);
    const v = this.v;
    const accent = v.color || '#9b5de5';
    this.card = new THREE.Group();
    this.group.add(this.card);
    const back = new THREE.Mesh(new RoundedBoxGeometry(8, 4, 0.2, 4, 0.4), std(accent));
    back.position.z = -0.12;
    const front = new THREE.Mesh(new RoundedBoxGeometry(7.5, 3.5, 0.3, 4, 0.3), std('#fffdf7'));
    this.card.add(back, front);
    let y = 0;
    if (v.emoji) {
      const e = textMesh(v.emoji, v.text ? 1.2 : 2.2);
      e.position.set(0, v.text ? 0.95 : 0, 0.2);
      this.card.add(e);
      y = v.text ? -0.35 : 0;
    }
    if (v.text) {
      this.word = textMesh(v.text, v.emoji ? 1.15 : 1.5, { color: '#2b2d42', weight: 700 });
      this.fitWord(y);
      this.card.add(this.word);
    }
    if (v.sub) {
      const s = textMesh(v.sub, 0.5, { color: '#ffffff', bg: accent, weight: 600 });
      s.position.set(0, -2.3, 0.15);
      this.card.add(s);
    }
    this.sparkles = Array.from({ length: 10 }, (_, i) => {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), std(BRIGHTS[i % BRIGHTS.length], { flatShading: true }));
      m.userData = { a: (i / 10) * Math.PI * 2, r: 4.6 + (i % 2) * 0.4 };
      this.group.add(m);
      return m;
    });
  }

  fitWord(y) {
    const w = this.word.userData.width;
    if (w > 7) this.word.scale.multiplyScalar(7 / w);
    this.word.position.set(0, y, 0.2);
  }

  update(dt) {
    super.update(dt);
    const t = this.time;
    this.card.rotation.y = Math.sin(t * 0.8) * 0.12;
    this.card.rotation.x = Math.sin(t * 0.6) * 0.05;
    this.card.position.y = Math.sin(t * 1.3) * 0.08;
    for (const s of this.sparkles) {
      const a = s.userData.a + t * 0.4;
      s.position.set(Math.cos(a) * s.userData.r, Math.sin(a) * s.userData.r * 0.62, 0.3);
      s.rotation.y += dt * 2;
    }
  }
}
