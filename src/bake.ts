/**
 * Dev-only bake page (bake.html), driven by `npm run models:bake`.
 * Renders every tier's thumbnail, exports .glb files, and composes the
 * tier-lineup readability sheet (colour and grayscale).
 */
import '@fontsource/big-shoulders-display/900';
import '@fontsource/architects-daughter/latin-400.css';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MAX_TIER, tier } from './core/tiers';
import { modelSize, modelTemplate } from './models';

const SIZE = 256;

function makeRenderer(w: number, h: number) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(w, h);
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 0.95;
  r.setClearColor(0x000000, 0);
  return r;
}

function lights(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.add(new THREE.HemisphereLight('#fff6e6', '#8a6f4a', 1.4));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.2);
  sun.position.set(-1.2, 3, 0.6);
  scene.add(sun);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
}

/** Bounding box of a model, ignoring the endless beam and cable of the top tier. */
function framingBox(obj: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(obj);
  box.max.y = Math.min(box.max.y, box.min.y + 2.6);
  return box;
}

function renderThumb(renderer: THREE.WebGLRenderer, tierId: number, tiltDeg = 42) {
  const scene = new THREE.Scene();
  lights(scene, renderer);
  const model = modelTemplate(tierId).clone();
  scene.add(model);
  const box = framingBox(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const tilt = THREE.MathUtils.degToRad(tiltDeg);
  const radius = Math.max(size.x, size.z) * 0.62 + size.y * 0.42;
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(15));
  cam.position.set(center.x + dist * 0.18, center.y + Math.sin(tilt) * dist, center.z + Math.cos(tilt) * dist);
  cam.lookAt(center);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

/** Triangles and draw calls for one instance of the tier. */
function stats(tierId: number) {
  let tris = 0;
  let draws = 0;
  modelTemplate(tierId).traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    draws++;
    const g = m.geometry;
    tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  });
  return { tris: Math.round(tris), draws };
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.src = src;
  });
}

async function lineup(thumbs: string[], trueScale: string) {
  const cols = 6;
  const cell = 190;
  const pad = 24;
  const header = 70;
  const gridH = 3 * (cell + 34);
  const W = cols * cell + pad * 2;
  const scaleImg = await loadImg(trueScale);
  const scaleH = Math.round((scaleImg.height / scaleImg.width) * (W - pad * 2));
  const H = header + (gridH + 40) * 2 + scaleH + 60;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1d4e89';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = '900 40px "Big Shoulders Display"';
  ctx.fillText('BLUEPRINT MERGE · TIER LINEUP', pad, 50);
  const imgs = await Promise.all(thumbs.map(loadImg));
  const grid = (y0: number, gray: boolean, label: string) => {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '22px "Architects Daughter"';
    ctx.filter = 'none';
    ctx.fillText(label, pad, y0 + 24);
    imgs.forEach((img, i) => {
      const x = pad + (i % cols) * cell;
      const y = y0 + 34 + Math.floor(i / cols) * (cell + 34);
      ctx.filter = gray ? 'grayscale(1)' : 'none';
      ctx.drawImage(img, x + 8, y, cell - 16, cell - 16);
      ctx.filter = 'none';
      ctx.fillStyle = '#fff';
      ctx.font = '900 20px "Big Shoulders Display"';
      ctx.fillText(`${i + 1}. ${tier(i + 1).name.toUpperCase()}`, x + 8, y + cell + 4);
    });
  };
  grid(header, false, 'Colour');
  grid(header + gridH + 40, true, 'Grayscale (silhouette check)');
  const sy = header + (gridH + 40) * 2;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '22px "Architects Daughter"';
  ctx.fillText('True relative size, game camera', pad, sy + 24);
  ctx.drawImage(scaleImg, pad, sy + 34, W - pad * 2, scaleH);
  return c.toDataURL('image/png');
}

/** All tiers in a row at true relative scale, seen from the game camera angle. */
function trueScaleRow(): string {
  const w = 1600;
  const h = 520;
  const renderer = makeRenderer(w, h);
  const scene = new THREE.Scene();
  lights(scene, renderer);
  let x = 0;
  const gap = 0.05;
  for (let i = 1; i <= MAX_TIER; i++) {
    const m = modelTemplate(i).clone();
    const d = modelSize(i).diameter;
    m.scale.setScalar(d);
    m.position.x = x + d / 2;
    x += d + gap;
    scene.add(m);
  }
  const cam = new THREE.PerspectiveCamera(20, w / h, 0.01, 100);
  const tilt = THREE.MathUtils.degToRad(35);
  const cx = x / 2;
  const hfov = Math.atan(Math.tan(THREE.MathUtils.degToRad(10)) * (w / h));
  const dist = (x / 2 / Math.tan(hfov)) * 1.08;
  cam.position.set(cx, 0.5 + Math.sin(tilt) * dist, Math.cos(tilt) * dist);
  cam.lookAt(cx, 0.45, 0);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.dispose();
  return url;
}

async function exportGlb(tierId: number): Promise<string> {
  const exporter = new GLTFExporter();
  const buf = (await exporter.parseAsync(modelTemplate(tierId), { binary: true })) as ArrayBuffer;
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function main() {
  await document.fonts.ready;
  await Promise.all([document.fonts.load('900 20px "Big Shoulders Display"'), document.fonts.load('22px "Architects Daughter"')]);
  const renderer = makeRenderer(SIZE, SIZE);
  const thumbs: string[] = [];
  const glbs: string[] = [];
  const st: { tier: number; name: string; tris: number; draws: number }[] = [];
  for (let i = 1; i <= MAX_TIER; i++) {
    thumbs.push(renderThumb(renderer, i));
    glbs.push(await exportGlb(i));
    st.push({ tier: i, name: tier(i).name, ...stats(i) });
  }
  const sheet = await lineup(thumbs, trueScaleRow());
  (window as unknown as { __bake: unknown }).__bake = { thumbs, glbs, sheet, stats: st };
}

main().catch((e) => {
  (window as unknown as { __bake: unknown }).__bake = { error: String(e?.stack ?? e) };
});
