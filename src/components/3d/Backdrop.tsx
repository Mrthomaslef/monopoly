import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Golden-hour backdrop: sky dome, procedural 3D islands, drifting sea mist, smoking volcano
 * and a ghost galleon. The Ocean, sky and everything here share one fog written in display
 * space (these ShaderMaterials skip tone mapping), so sea and sky melt into each other and the
 * ocean never shows an edge. The board itself stays unfogged and crisp.
 */

export const OCEAN_RADIUS = 420;
const SKY_RADIUS = 450;
const MIST_RADIUS = 85;

export const BACKDROP_GLSL = /* glsl */ `
  const vec3 FOG_COLOR = vec3(1.0, 0.83, 0.66);
  const vec3 SUN_DIR = normalize(vec3(-0.30, 0.13, -1.0));

  float fogFactor(float depth) {
    float d = max(depth - 22.0, 0.0) / 55.0;
    return 1.0 - exp(-d * d);
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += amp * valueNoise(p);
      p = p * 2.03 + vec2(17.1, 9.3);
      amp *= 0.5;
    }
    return sum;
  }
`;

/** Islets close enough to show in the default overview; the Ocean draws reefs and foam around them. */
export const NEAR_ISLETS = [
  { x: -11.5, z: -9.5, radius: 2.6, height: 2.0, seed: 3, palms: 5 },
  { x: 12.0, z: -8.5, radius: 2.2, height: 1.6, seed: 7, palms: 4 },
  { x: -13.0, z: 2.0, radius: 1.6, height: 2.8, seed: 11, palms: 0 },
  { x: 12.5, z: 2.5, radius: 1.4, height: 2.4, seed: 17, palms: 0 },
] as const;

export const ARCH_POSITION = { x: -3.0, z: -15.5, radius: 2.6 };
export const WRECK_POSITION = { x: 6.5, z: -12.0, radius: 1.15 };

const FAR_ISLANDS = [
  { x: 72, z: -70, radius: 26, height: 17, seed: 23 },
  { x: 30, z: -112, radius: 30, height: 13, seed: 29 },
  { x: -96, z: -8, radius: 28, height: 19, seed: 31 },
  { x: 92, z: 14, radius: 24, height: 15, seed: 37 },
  { x: 16, z: 104, radius: 32, height: 20, seed: 41 },
  { x: -64, z: 76, radius: 24, height: 13, seed: 43 },
  { x: 70, z: 78, radius: 20, height: 11, seed: 47 },
];

const VOLCANO = { x: -66, z: -88, radius: 30, height: 25, seed: 13 };

// Module-level so every backdrop shader shares one clock, advanced once per frame in <Backdrop />.
const uTime = { value: 0 };

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vDir;
  ${BACKDROP_GLSL}

  void main() {
    vec3 dir = normalize(vDir);
    float e = max(dir.y, 0.0);

    vec3 col = mix(FOG_COLOR, vec3(0.98, 0.62, 0.50), smoothstep(0.0, 0.09, e));
    col = mix(col, vec3(0.42, 0.56, 0.82), smoothstep(0.07, 0.30, e));
    col = mix(col, vec3(0.08, 0.21, 0.50), smoothstep(0.26, 0.85, e));

    // Sun and clouds fade out at the horizon, so its colour stays exactly FOG_COLOR for a seamless sea line
    float horizonMask = smoothstep(0.0, 0.035, e);
    float s = max(dot(dir, SUN_DIR), 0.0);
    col += vec3(1.0, 0.55, 0.25) * (pow(s, 7.0) * 0.32 + pow(s, 70.0) * 0.5) * horizonMask;
    col += vec3(1.0, 0.95, 0.80) * smoothstep(0.9982, 0.9992, s) * horizonMask;

    vec2 cloudUv = dir.xz / (e + 0.14) * 0.9 + vec2(uTime * 0.012, uTime * 0.004);
    float density = fbm(cloudUv);
    float cover = smoothstep(0.47, 0.72, density) * smoothstep(0.03, 0.18, e);
    float shade = smoothstep(0.45, 0.8, fbm(cloudUv + SUN_DIR.xz * 0.16));
    vec3 cloudCol = mix(vec3(1.0, 0.86, 0.72), vec3(0.50, 0.38, 0.52), shade);
    cloudCol += vec3(1.0, 0.55, 0.28) * pow(s, 5.0) * (1.0 - shade) * 0.7;
    col = mix(col, cloudCol, cover * 0.92);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const SOLID_VERTEX = /* glsl */ `
  attribute vec3 color;
  varying vec3 vColor;
  varying vec3 vNormalW;
  varying float vDepth;
  varying float vWorldY;
  void main() {
    vColor = color;
    vWorldY = (modelMatrix * vec4(position, 1.0)).y;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const SOLID_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vNormalW;
  varying float vDepth;
  varying float vWorldY;
  ${BACKDROP_GLSL}

  void main() {
    vec3 n = normalize(vNormalW);
    // Key matches the board's directional light, warm rim comes from the low sun
    float key = max(dot(n, normalize(vec3(9.0, 16.0, 10.0))), 0.0);
    float rim = pow(max(dot(n, SUN_DIR), 0.0), 2.0);
    vec3 lit = vColor * (0.48 + key * 0.72) + vColor * vec3(1.0, 0.55, 0.3) * rim * 0.75;
    // Fog hugs the sea: waterlines match the ocean's haze exactly while peaks rise clear of the bank
    float fog = fogFactor(vDepth) * (1.0 - smoothstep(0.0, 22.0, vWorldY) * 0.55);
    gl_FragColor = vec4(mix(lit, FOG_COLOR, fog), 1.0);
  }
`;

const MIST_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`;

const MIST_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${BACKDROP_GLSL}

  void main() {
    float n = fbm(vec2(vWorld.x + vWorld.z, vWorld.x - vWorld.z) * 0.035 + vec2(uTime * 0.03, vWorld.y * 0.09));
    float bank = 1.0 - smoothstep(0.05, 0.7, vUv.y - (n - 0.5) * 1.1);
    float alpha = bank * smoothstep(0.0, 0.1, vUv.y) * 0.88;
    gl_FragColor = vec4(FOG_COLOR, alpha);
  }
`;

const SMOKE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${BACKDROP_GLSL}

  void main() {
    float y = vUv.y;
    float x = vUv.x - 0.5 - sin(y * 3.2 + uTime * 0.12) * 0.08 * y - y * y * 0.16;
    float width = mix(0.035, 0.28, pow(y, 0.8));
    float shape = 1.0 - smoothstep(width * 0.35, width, abs(x));
    float n = fbm(vec2(vUv.x * 5.0, y * 6.0 - uTime * 0.16));
    float alpha = shape * smoothstep(0.22, 0.62, n) * smoothstep(0.0, 0.04, y) * (1.0 - smoothstep(0.55, 1.0, y));
    vec3 col = mix(vec3(0.30, 0.20, 0.22), vec3(0.74, 0.58, 0.54), y);
    // Lava lights the base of the column from below
    col += vec3(0.95, 0.32, 0.08) * (1.0 - smoothstep(0.0, 0.14, y)) * 0.9;
    gl_FragColor = vec4(col, alpha * 0.92);
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float pulse = 0.82 + 0.18 * sin(uTime * 1.7) * sin(uTime * 3.1);
    float a = pow(max(1.0 - d, 0.0), 2.2) * pulse;
    gl_FragColor = vec4(vec3(1.0, 0.38, 0.1) * a, a);
  }
`;

const makeSolidMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: SOLID_VERTEX,
    fragmentShader: SOLID_FRAGMENT,
  });

const makeOverlayMaterial = (
  fragmentShader: string,
  blending: THREE.Blending = THREE.NormalBlending,
  side: THREE.Side = THREE.FrontSide
) =>
  new THREE.ShaderMaterial({
    vertexShader: MIST_VERTEX,
    fragmentShader,
    uniforms: { uTime },
    transparent: true,
    depthWrite: false,
    blending,
    side,
  });

// Backdrop shaders write display-space colour directly, so hex values must skip sRGB-to-linear conversion
const raw = (hex: string) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);

const COLORS = {
  sand: raw('#e8cf94'),
  jungleLow: raw('#2f7d4b'),
  jungleHigh: raw('#1d5a3c'),
  rock: raw('#6d635c'),
  ash: raw('#40363a'),
  scorched: raw('#231c20'),
  lava: raw('#ff6a1f'),
  trunk: raw('#6b4a2c'),
  palm: raw('#3f9a55'),
  hull: raw('#3b2618'),
  wreck: raw('#57402c'),
  sail: raw('#d9c8a8'),
};

const bumps = (angle: number, radial: number, seed: number) =>
  Math.sin(angle * 3 + seed) * 0.5 +
  Math.sin(angle * 7 + seed * 1.7 + radial * 4) * 0.28 +
  Math.sin(angle * 13 + seed * 2.3 - radial * 7) * 0.14;

/** Displaced radial heightfield, coloured sand → jungle → rock (or ash for a volcano). */
function createIslandGeometry(
  radius: number,
  height: number,
  seed: number,
  volcano = false
): THREE.BufferGeometry {
  const rings = 18;
  const segments = 44;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const color = new THREE.Color();

  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = radius * t * (1 + bumps(angle, 0, seed) * 0.2);
      const noise = 1 + bumps(angle, t, seed + 5) * 0.32 * Math.sin(t * Math.PI);
      let y: number;
      if (volcano) {
        // Concave cone that opens onto a crater near the summit
        const cone = Math.pow(1 - Math.max(t, 0.07), 1.75);
        y = height * cone * noise * 1.14;
        if (t < 0.07) y -= (0.07 - t) * height * 1.6;
      } else {
        y = height * Math.pow(1 - t, 1.25) * noise;
      }
      if (j === rings) y = -1.5;
      positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);

      const h = Math.max(y, 0) / height;
      if (y < height * 0.035 + 0.05) {
        color.copy(COLORS.sand);
      } else if (volcano) {
        color
          .copy(COLORS.jungleHigh)
          .lerp(COLORS.ash, THREE.MathUtils.smoothstep(h, 0.12, 0.42))
          .lerp(COLORS.scorched, THREE.MathUtils.smoothstep(h, 0.55, 0.85));
        if (t < 0.1) color.copy(COLORS.lava);
      } else {
        color
          .copy(COLORS.jungleLow)
          .lerp(COLORS.jungleHigh, THREE.MathUtils.smoothstep(h, 0.15, 0.5))
          .lerp(COLORS.rock, THREE.MathUtils.smoothstep(h, 0.55, 0.85));
      }
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const a = j * segments + i;
      const b = j * segments + next;
      const c = (j + 1) * segments + i;
      const d = (j + 1) * segments + next;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Bakes a transform and a flat colour so parts can merge into one draw call. */
function paint(
  source: THREE.BufferGeometry,
  color: THREE.Color,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1]
): THREE.BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source;
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale)
  );
  geometry.applyMatrix4(matrix);
  geometry.deleteAttribute('uv');
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error('Backdrop: incompatible geometry parts');
  return merged;
}

function palmParts(x: number, y: number, z: number, lean: number): THREE.BufferGeometry[] {
  const parts = [
    paint(new THREE.CylinderGeometry(0.035, 0.07, 1.05, 5), COLORS.trunk, [x, y + 0.5, z], [0, 0, lean]),
  ];
  const topX = x - Math.sin(lean) * 0.52;
  const topY = y + 0.5 + Math.cos(lean) * 0.52;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const leaf = paint(
      new THREE.ConeGeometry(0.15, 0.72, 4),
      COLORS.palm,
      [0.28, -0.05, 0],
      [0, 0, -Math.PI / 2 - 0.42],
      [1, 1, 0.3]
    );
    leaf.applyMatrix4(new THREE.Matrix4().makeRotationY(angle));
    leaf.applyMatrix4(new THREE.Matrix4().makeTranslation(topX, topY, z));
    parts.push(leaf);
  }
  return parts;
}

function createPalmGrove(radius: number, count: number, seed: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const angle = seed + (i / count) * Math.PI * 2;
    const dist = radius * (0.52 + 0.12 * Math.sin(seed + i * 2.1));
    parts.push(
      ...palmParts(Math.cos(angle) * dist, 0.15, Math.sin(angle) * dist, 0.28 * Math.sin(i * 2.7 + seed))
    );
  }
  return merge(parts);
}

function createArch(): THREE.BufferGeometry {
  const torus = new THREE.TorusGeometry(2.0, 0.62, 8, 22, Math.PI);
  const position = torus.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const wobble =
      1 +
      0.14 * Math.sin(position.getX(i) * 3.1 + position.getY(i) * 2.3) +
      0.1 * Math.sin(position.getZ(i) * 4.4 + position.getX(i) * 1.7);
    position.setXYZ(i, position.getX(i) * wobble, position.getY(i) * wobble, position.getZ(i) * wobble);
  }
  const arch = paint(torus, COLORS.rock);
  arch.computeVertexNormals();
  return merge([
    arch,
    paint(new THREE.DodecahedronGeometry(0.8, 0), COLORS.rock, [-2.05, 0.05, 0], [0.5, 0.2, 0], [1, 1.1, 1]),
    paint(new THREE.DodecahedronGeometry(0.85, 0), COLORS.rock, [2.05, 0.02, 0], [0.1, 0.9, 0.3], [1, 1.05, 1]),
  ]);
}

function createWreck(): THREE.BufferGeometry {
  return merge([
    paint(new THREE.CylinderGeometry(0.45, 0.2, 2.5, 7, 1), COLORS.wreck, [0, 0.05, 0], [Math.PI / 2 - 0.3, 0, 0], [0.85, 1, 0.8]),
    paint(new THREE.BoxGeometry(0.8, 0.12, 0.9), COLORS.hull, [0, 0.72, 0.85], [-0.28, 0, 0.08]),
    paint(new THREE.CylinderGeometry(0.035, 0.05, 2.0, 5), COLORS.hull, [0.05, 1.05, 0.05], [0.28, 0, 0.32]),
    paint(new THREE.BoxGeometry(0.95, 0.035, 0.035), COLORS.hull, [0.2, 1.6, 0.18], [0, 0.3, 0.45]),
    paint(new THREE.BoxGeometry(0.42, 0.34, 0.012), COLORS.sail, [-0.08, 1.38, 0.2], [0.2, 0.3, 0.38]),
    paint(new THREE.DodecahedronGeometry(0.42, 0), COLORS.rock, [0.72, -0.02, -0.75], [0.3, 1.2, 0], [1, 0.75, 1]),
  ]);
}

function createGalleon(): THREE.BufferGeometry {
  const parts = [
    paint(new THREE.CylinderGeometry(0.72, 0.42, 5.6, 8, 1), COLORS.hull, [0, 0.55, 0], [Math.PI / 2, 0, 0], [0.95, 1, 0.85]),
    paint(new THREE.BoxGeometry(1.12, 1.15, 1.45), COLORS.hull, [0, 1.15, 2.2]),
    paint(new THREE.BoxGeometry(0.9, 0.7, 1.0), COLORS.hull, [0, 0.95, -2.3]),
    paint(new THREE.CylinderGeometry(0.03, 0.05, 1.8, 5), COLORS.hull, [0, 1.05, -3.4], [1.15, 0, 0]),
  ];
  ([
    [-1.9, 4.0],
    [0, 5.0],
    [1.7, 3.9],
  ] as const).forEach(([z, mastHeight]) => {
    parts.push(paint(new THREE.CylinderGeometry(0.04, 0.08, mastHeight, 5), COLORS.hull, [0, 1 + mastHeight / 2, z]));
    [0.42, 0.74].forEach((level, i) => {
      const y = 1 + mastHeight * level;
      const width = i === 0 ? 2.3 : 1.65;
      const sailHeight = mastHeight * (i === 0 ? 0.3 : 0.23);
      parts.push(paint(new THREE.SphereGeometry(1, 8, 5), COLORS.sail, [0, y, z - 0.12], [0, 0, 0], [width / 2, sailHeight / 2, 0.18]));
    });
  });
  return merge(parts);
}

const GhostGalleon: React.FC<{ material: THREE.Material }> = ({ material }) => {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(createGalleon, []);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const t = clock.getElapsedTime();
    const angle = 2.2 - t * 0.008;
    group.position.set(Math.cos(angle) * 54, -0.15 + Math.sin(t * 0.8) * 0.1, Math.sin(angle) * -54);
    group.rotation.set(Math.sin(t * 0.7) * 0.025, Math.atan2(-Math.sin(angle), -Math.cos(angle)), Math.sin(t * 0.55) * 0.035);
  });

  return (
    <group ref={groupRef} scale={1.25}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
};

export const Backdrop: React.FC = () => {
  const skyRef = useRef<THREE.Mesh>(null);

  const skyMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        uniforms: { uTime },
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    []
  );
  const solidMaterial = useMemo(makeSolidMaterial, []);
  const mistMaterial = useMemo(() => makeOverlayMaterial(MIST_FRAGMENT, THREE.NormalBlending, THREE.BackSide), []);
  const smokeMaterial = useMemo(() => makeOverlayMaterial(SMOKE_FRAGMENT), []);
  const glowMaterial = useMemo(() => makeOverlayMaterial(GLOW_FRAGMENT, THREE.AdditiveBlending), []);

  const farIslands = useMemo(
    () =>
      FAR_ISLANDS.map((island) => ({
        ...island,
        geometry: createIslandGeometry(island.radius, island.height, island.seed),
      })),
    []
  );
  const volcanoGeometry = useMemo(
    () => createIslandGeometry(VOLCANO.radius, VOLCANO.height, VOLCANO.seed, true),
    []
  );
  const nearIslets = useMemo(
    () =>
      NEAR_ISLETS.map((islet) => ({
        ...islet,
        geometry: createIslandGeometry(islet.radius, islet.height, islet.seed),
        grove: islet.palms > 0 ? createPalmGrove(islet.radius, islet.palms, islet.seed) : null,
      })),
    []
  );
  const archGeometry = useMemo(createArch, []);
  const wreckGeometry = useMemo(createWreck, []);

  useFrame(({ clock, camera }) => {
    uTime.value = clock.getElapsedTime();
    // The dome follows the camera so the horizon always sits at infinity
    skyRef.current?.position.copy(camera.position);
  });

  return (
    <group>
      <mesh ref={skyRef} material={skyMaterial} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[SKY_RADIUS, 32, 20]} />
      </mesh>

      {farIslands.map((island) => (
        <mesh
          key={island.seed}
          geometry={island.geometry}
          material={solidMaterial}
          position={[island.x, -0.14, island.z]}
        />
      ))}

      <group position={[VOLCANO.x, -0.14, VOLCANO.z]}>
        <mesh geometry={volcanoGeometry} material={solidMaterial} />
        <Billboard position={[0, VOLCANO.height + 2, 0]} lockX lockZ>
          <mesh material={glowMaterial} renderOrder={-1}>
            <planeGeometry args={[16, 16]} />
          </mesh>
        </Billboard>
        <Billboard position={[2, VOLCANO.height + 19, 0]} lockX lockZ>
          <mesh material={smokeMaterial} renderOrder={-1}>
            <planeGeometry args={[40, 40]} />
          </mesh>
        </Billboard>
      </group>

      <mesh position={[0, 11, 0]} material={mistMaterial} renderOrder={-2}>
        <cylinderGeometry args={[MIST_RADIUS, MIST_RADIUS, 26, 72, 1, true]} />
      </mesh>

      <GhostGalleon material={solidMaterial} />

      {nearIslets.map((islet) => (
        <group key={islet.seed} position={[islet.x, -0.14, islet.z]}>
          <mesh geometry={islet.geometry} material={solidMaterial} />
          {islet.grove && <mesh geometry={islet.grove} material={solidMaterial} />}
        </group>
      ))}

      <mesh
        geometry={archGeometry}
        material={solidMaterial}
        position={[ARCH_POSITION.x, -0.14, ARCH_POSITION.z]}
        rotation={[0, 0.35, 0]}
      />
      <mesh
        geometry={wreckGeometry}
        material={solidMaterial}
        position={[WRECK_POSITION.x, -0.05, WRECK_POSITION.z]}
        rotation={[0, -0.75, 0]}
      />
    </group>
  );
};
