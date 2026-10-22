import * as THREE from 'three';

export const FONT = "'Fredoka', 'Baloo 2', 'Trebuchet MS', system-ui, sans-serif";
const PX = 128; // canvas pixels per text line

function drawText(cv, text, { weight = 600, color = '#2b2d42', bg = null, stroke = null, pad = 0.18, minWidth = 0 }) {
  const g = cv.getContext('2d');
  g.font = `${weight} ${PX}px ${FONT}`;
  const w = Math.ceil(Math.max(g.measureText(text).width, minWidth * PX) + PX * pad * 2 + (bg ? PX * 0.4 : 0));
  const h = Math.ceil(PX * (1 + pad * 2));
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  g.clearRect(0, 0, w, h);
  if (bg) {
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect ? g.roundRect(2, 2, w - 4, h - 4, h * 0.3) : g.rect(2, 2, w - 4, h - 4);
    g.fill();
  }
  g.font = `${weight} ${PX}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (stroke) {
    g.lineJoin = 'round';
    g.lineWidth = PX * 0.12;
    g.strokeStyle = stroke;
    g.strokeText(text, w / 2, h / 2 + PX * 0.04);
  }
  g.fillStyle = color;
  g.fillText(text, w / 2, h / 2 + PX * 0.04);
  return cv;
}

// A flat text plane `height` world units tall (including padding). `mesh.userData.width` is its width.
export function textMesh(text, height = 0.6, opts = {}) {
  const cv = drawText(document.createElement('canvas'), String(text), opts);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geo, mat);
  const fit = () => {
    mesh.userData.width = (height * cv.width) / cv.height;
    mesh.scale.set(mesh.userData.width, height, 1);
  };
  fit();
  mesh.setText = (t, o = {}) => {
    drawText(cv, String(t), { ...opts, ...o });
    tex.dispose();
    mat.map = new THREE.CanvasTexture(cv);
    mat.map.colorSpace = THREE.SRGBColorSpace;
    mat.needsUpdate = true;
    fit();
  };
  mesh.renderOrder = 2;
  return mesh;
}

// Text label that always faces the camera (for place names above the island).
export function textSprite(text, height, opts = {}) {
  const cv = drawText(document.createElement('canvas'), text, opts);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  sp.scale.set((height * cv.width) / cv.height, height, 1);
  return sp;
}
