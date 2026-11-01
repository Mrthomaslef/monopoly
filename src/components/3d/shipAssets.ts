import * as THREE from 'three';

/** Shared geometry and painted textures for the players' galleons (bow points to +Z). */

const HULL_STATIONS = 28;
const HULL_SECTION_STEPS = 8;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hullStation(t: number) {
  const eased = Math.min(t / 0.6, 1);
  const width =
    t < 0.6
      ? 0.25 * lerp(0.72, 1, eased * eased * (3 - 2 * eased))
      : 0.25 * Math.pow(Math.max(Math.cos(((t - 0.6) / 0.4) * (Math.PI / 2)), 0), 0.75);
  const sheer =
    t < 0.5
      ? 0.25 + 0.14 * Math.pow(1 - t / 0.5, 2)
      : 0.25 + 0.1 * Math.pow((t - 0.5) / 0.5, 2);
  return {
    z: lerp(-0.42, 0.46, t),
    width,
    sheer,
    keel: -0.03 + 0.2 * Math.pow(t, 5),
  };
}

function hullSectionPoint(t: number, a: number): [number, number, number] {
  const { z, width, sheer, keel } = hullStation(t);
  const phi = a * (Math.PI / 2);
  return [
    width * Math.pow(Math.sin(phi), 0.75),
    keel + (sheer - keel) * (1 - Math.cos(phi)),
    z,
  ];
}

function buildHullGeometry() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rows = HULL_SECTION_STEPS * 2 + 1;

  // Curved shell: each station is a U-shaped section running rail -> keel -> rail.
  for (let j = 0; j <= HULL_STATIONS; j++) {
    const t = j / HULL_STATIONS;
    for (let i = -HULL_SECTION_STEPS; i <= HULL_SECTION_STEPS; i++) {
      const a = Math.abs(i) / HULL_SECTION_STEPS;
      const [x, y, z] = hullSectionPoint(t, a);
      positions.push(i < 0 ? -x : x, y, z);
      uvs.push(t, a);
    }
  }
  for (let j = 0; j < HULL_STATIONS; j++) {
    for (let i = 0; i < rows - 1; i++) {
      const a = j * rows + i;
      const b = a + 1;
      const c = a + rows;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  // Flat transom closing the stern (vertices are duplicated to keep a crisp edge).
  const capCenter = positions.length / 3;
  const stern = hullStation(0);
  positions.push(0, (stern.keel + stern.sheer) / 2, stern.z);
  uvs.push(0.002, 0.45);
  for (let i = -HULL_SECTION_STEPS; i <= HULL_SECTION_STEPS; i++) {
    const a = Math.abs(i) / HULL_SECTION_STEPS;
    const [x, y, z] = hullSectionPoint(0, a);
    positions.push(i < 0 ? -x : x, y, z);
    uvs.push(0.002, a);
  }
  for (let i = 0; i < rows - 1; i++) {
    indices.push(capCenter, capCenter + 2 + i, capCenter + 1 + i);
  }
  // Closes the top of the transom between the two rail points.
  indices.push(capCenter, capCenter + 1, capCenter + rows);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildDeckGeometry() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= HULL_STATIONS; j++) {
    const t = j / HULL_STATIONS;
    const { z, width, sheer } = hullStation(t);
    const y = sheer - 0.035;
    positions.push(-width * 0.97, y, z, width * 0.97, y, z);
    uvs.push(0, t, 1, t);
  }
  for (let j = 0; j < HULL_STATIONS; j++) {
    const a = j * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Billowing square sail: the belly pushes toward the bow and the foot is arched. */
export function buildSailGeometry(
  width: number,
  height: number,
  bulge: number,
  taper = 0.14
) {
  const geo = new THREE.PlaneGeometry(width, height, 12, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (width / 2);
    const v = pos.getY(i) / (height / 2);
    const lift = ((1 - v) / 2) * u * u * height * 0.14;
    pos.setXYZ(
      i,
      pos.getX(i) * (1 - taper * ((v + 1) / 2)),
      pos.getY(i) + lift,
      bulge * (1 - u * u) * (1 - 0.45 * v * v)
    );
  }
  geo.computeVertexNormals();
  return geo;
}

function buildPennantGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.07);
  shape.lineTo(0.36, 0.055);
  shape.lineTo(0.27, 0);
  shape.lineTo(0.36, -0.055);
  shape.lineTo(0, -0.07);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export const hullGeometry = buildHullGeometry();
export const deckGeometry = buildDeckGeometry();
export const pennantGeometry = buildPennantGeometry();
export const mainSailGeometry = buildSailGeometry(0.58, 0.34, 0.13);
export const mainTopsailGeometry = buildSailGeometry(0.42, 0.24, 0.09);
export const foreSailGeometry = buildSailGeometry(0.46, 0.28, 0.11);

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') as CanvasRenderingContext2D };
}

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function paintHull(color: string) {
  const { canvas, ctx } = createCanvas(512, 128);
  // Canvas top = ship's rail, canvas bottom = keel.
  ctx.fillStyle = '#6b3512';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = 'rgba(30, 12, 2, 0.45)';
  ctx.lineWidth = 2;
  for (let y = 62; y < 128; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Bright player-coloured gunport strake
  ctx.fillStyle = color;
  ctx.fillRect(0, 14, 512, 40);

  // Gilded rail and wale
  ctx.fillStyle = '#fcd34d';
  ctx.fillRect(0, 0, 512, 14);
  ctx.fillRect(0, 54, 512, 7);

  // Gunports
  for (let x = 70; x < 440; x += 62) {
    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(x - 11, 21, 22, 26);
    ctx.fillStyle = '#1c0f06';
    ctx.fillRect(x - 8, 24, 16, 20);
  }
  return toTexture(canvas);
}

function paintSkullEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  ink: string,
  background: string
) {
  // Crossed bones
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = size * 0.17;
  [-1, 1].forEach((direction) => {
    ctx.beginPath();
    ctx.moveTo(cx - size * direction, cy + size * 0.1);
    ctx.lineTo(cx + size * direction, cy + size);
    ctx.stroke();
  });

  // Cranium and jaw
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - size * 0.32, cy + size * 0.4, size * 0.64, size * 0.42);

  // Eye sockets and nose
  ctx.fillStyle = background;
  [-1, 1].forEach((direction) => {
    ctx.beginPath();
    ctx.arc(cx + direction * size * 0.26, cy, size * 0.17, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.18);
  ctx.lineTo(cx - size * 0.09, cy + size * 0.36);
  ctx.lineTo(cx + size * 0.09, cy + size * 0.36);
  ctx.closePath();
  ctx.fill();
}

const SAIL_CREAM = '#fff4d6';

function paintEmblemSail(color: string) {
  const { canvas, ctx } = createCanvas(256, 160);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 160);

  // Shading seams give the cloth some life without adding geometry.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let x = 32; x < 256; x += 48) ctx.fillRect(x, 0, 3, 160);

  ctx.strokeStyle = SAIL_CREAM;
  ctx.lineWidth = 12;
  ctx.strokeRect(0, 0, 256, 160);

  paintSkullEmblem(ctx, 128, 68, 42, SAIL_CREAM, color);
  return toTexture(canvas);
}

function paintStripedSail(color: string) {
  const { canvas, ctx } = createCanvas(256, 128);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 128);
  // A single band keeps the player's colour dominant from the board camera.
  ctx.fillStyle = SAIL_CREAM;
  ctx.fillRect(0, 50, 256, 28);
  ctx.strokeStyle = SAIL_CREAM;
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, 256, 128);
  return toTexture(canvas);
}

export interface ShipTextures {
  hull: THREE.CanvasTexture;
  emblemSail: THREE.CanvasTexture;
  stripedSail: THREE.CanvasTexture;
}

export function createShipTextures(color: string, sailColor: string): ShipTextures {
  return {
    hull: paintHull(color),
    emblemSail: paintEmblemSail(sailColor),
    stripedSail: paintStripedSail(sailColor),
  };
}

let deckTexture: THREE.CanvasTexture | null = null;

export function getDeckTexture() {
  if (deckTexture) return deckTexture;
  const { canvas, ctx } = createCanvas(64, 64);
  ctx.fillStyle = '#d9a066';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(92, 45, 12, 0.55)';
  for (let x = 0; x < 64; x += 11) ctx.fillRect(x, 0, 2, 64);
  deckTexture = toTexture(canvas);
  return deckTexture;
}

let halo: THREE.CanvasTexture | null = null;

/** Soft radial falloff, tinted per player, that lifts the ship off the board. */
export function getHaloTexture() {
  if (halo) return halo;
  const { canvas, ctx } = createCanvas(128, 128);
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  halo = toTexture(canvas);
  return halo;
}
