import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import {
  ARCH_POSITION,
  BACKDROP_GLSL,
  NEAR_ISLETS,
  OCEAN_RADIUS,
  WRECK_POSITION,
} from './Backdrop';

const reefCalls = [
  ...NEAR_ISLETS.map((i) => [i.x, i.z, i.radius] as const),
  [ARCH_POSITION.x, ARCH_POSITION.z, ARCH_POSITION.radius] as const,
  [WRECK_POSITION.x, WRECK_POSITION.z, WRECK_POSITION.radius] as const,
]
  .map(
    ([x, z, r]) =>
      `addIslandReef(vec2(${x.toFixed(2)}, ${z.toFixed(2)}), ${r.toFixed(2)}, periphShallow, periphFoam);`
  )
  .join('\n    ');

// Swell shared by both stages: the vertex shader displaces the mesh with it, while the fragment
// shader re-evaluates it per pixel so crests stay smooth on the coarse outer mesh.
const WATER_SWELL_GLSL = /* glsl */ `
  // x, y: domain warp that bends the crests; z: gust strength. All very low frequency, so they
  // are computed per vertex and interpolated.
  vec3 swellField(vec2 p, float t) {
    return vec3(
      valueNoise(p * 0.07 + vec2(t * 0.031, 3.1)) - 0.5,
      valueNoise(p * 0.07 + vec2(7.7, -t * 0.026)) - 0.5,
      0.55 + 0.9 * valueNoise(p * 0.05 + vec2(-t * 0.021, t * 0.015))
    );
  }

  // Returns height in x and its slope in yz. Directions and frequencies are incommensurate, and
  // exp(sin) gives peaked crests with wide troughs, so the pattern never visibly repeats.
  vec3 swell(vec2 p, vec3 field, float t) {
    vec2 q = p + field.xy * 9.0;
    float height = 0.0;
    vec2 slope = vec2(0.0);
    float amp = 0.05;
    float freq = 0.55;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float angle = 0.6 + 1.1 * sin(fi * 2.4);
      vec2 dir = vec2(cos(angle), sin(angle));
      float phase = dot(dir, q) * freq + t * (1.05 * sqrt(freq) + 0.2 * fi) + fi * 1.7;
      float crest = exp(sin(phase) - 1.0);
      height += amp * (crest - 0.47);
      slope += amp * crest * cos(phase) * freq * dir;
      amp *= 0.78;
      freq *= 1.3;
    }
    return vec3(height, slope) * field.z;
  }
`;

const CARIBBEAN_WATER_VERTEX = /* glsl */ `
  uniform float uTime;
  varying vec2 vWorldXZ;
  varying vec3 vSwellField;
  varying float vFogDepth;
  ${BACKDROP_GLSL}
  ${WATER_SWELL_GLSL}

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldXZ = worldPosition.xz;
    vSwellField = swellField(vWorldXZ, uTime);

    // Waves calm down with distance: the far mesh is too coarse to carry them without faceting
    float calm = 1.0 - smoothstep(30.0, 70.0, length(vWorldXZ));
    vec3 pos = position;
    pos.z += swell(vWorldXZ, vSwellField, uTime).x * calm;

    vec4 mvPosition = viewMatrix * modelMatrix * vec4(pos, 1.0);
    vFogDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const CARIBBEAN_WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vWorldXZ;
  varying vec3 vSwellField;
  varying float vFogDepth;
  ${BACKDROP_GLSL}
  ${WATER_SWELL_GLSL}

  const mat2 ROT_A = mat2(0.80, 0.60, -0.60, 0.80);
  const mat2 ROT_B = mat2(0.28, -0.96, 0.96, 0.28);

  // Set once per pixel, read by every shoreline
  float gShoreNoise;
  float gFoamTexture;

  // Value noise with its analytic gradient (x: value, yz: gradient)
  vec3 noiseGrad(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec2 du = 6.0 * f * (1.0 - f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    float k = a - b - c + d;
    return vec3(
      a + (b - a) * u.x + (c - a) * u.y + k * u.x * u.y,
      du.x * ((b - a) + k * u.y),
      du.y * ((c - a) + k * u.x)
    );
  }

  // Slope of the small wind ripples: rotated octaves hide the noise lattice
  vec2 rippleSlope(vec2 p, float t) {
    vec3 a = noiseGrad(ROT_A * p * 1.3 + vec2(t * 0.26, t * 0.11));
    vec3 b = noiseGrad(ROT_B * p * 3.1 + vec2(-t * 0.38, t * 0.21));
    vec3 c = noiseGrad(ROT_A * ROT_B * p * 7.3 + vec2(t * 0.55, -t * 0.47));
    return (a.yz * ROT_A) * 0.095 + (b.yz * ROT_B) * 0.075 + (c.yz * (ROT_A * ROT_B)) * 0.05;
  }

  // A web of light lines: contour lines of two noise layers drifting against each other
  float caustics(vec2 p, float t) {
    float n1 = valueNoise(ROT_A * p * 1.5 + vec2(t * 0.17, -t * 0.12));
    float n2 = valueNoise(ROT_B * p * 2.3 + vec2(-t * 0.14, t * 0.19));
    float r1 = 1.0 - abs(2.0 * n1 - 1.0);
    float r2 = 1.0 - abs(2.0 * n2 - 1.0);
    return pow(r1, 8.0) * (0.35 + 0.65 * n2) + pow(r2, 10.0) * 0.5;
  }

  // Irregular foam: a torn line hugging the shore, plus a band washing outward and dissolving.
  // lapMask lets callers fade the band where it would cross into a neighbour's cell.
  float shoreFoam(float d, float radius, float seed, float width, float lapMask) {
    float x = d - radius + (gShoreNoise - 0.5) * width * 1.6;
    float contact = 1.0 - smoothstep(0.0, width, abs(x));
    float phase = fract(uTime * 0.14 + seed + gShoreNoise * 0.35);
    float lap = 1.0 - smoothstep(0.0, width * 0.55, abs(x - phase * width * 3.0));
    float body = contact + lap * (1.0 - phase) * 0.75 * lapMask;
    return body * smoothstep(0.24, 0.62, gFoamTexture + contact * 0.32);
  }

  void addIslandReef(vec2 pos, float radius, inout float shallowAcc, inout float foamAcc) {
    float d = length(vWorldXZ - pos);
    shallowAcc += 1.0 - smoothstep(radius * 0.85, radius * 1.65, d);
    foamAcc += shoreFoam(d, radius, hash21(pos * 0.13), 0.26, 1.0);
  }

  void main() {
    vec2 p = vWorldXZ;
    float distCenter = length(p);
    // Fade fine detail with distance so it doesn't shimmer as moire near the horizon
    float detailFade = 1.0 - smoothstep(22.0, 60.0, distCenter);

    vec3 shallowTurquoise = vec3(0.16, 0.88, 0.86);
    vec3 lagoonCyan       = vec3(0.05, 0.66, 0.82);
    vec3 deepAzure        = vec3(0.04, 0.36, 0.58);
    vec3 abyssBlue        = vec3(0.02, 0.25, 0.47);
    vec3 foamWhite        = vec3(0.95, 0.99, 1.00);
    vec3 sunGold          = vec3(1.00, 0.94, 0.72);

    vec2 foamDrift = vec2(uTime * 0.05, -uTime * 0.035);
    gShoreNoise = valueNoise(p * 1.7 + vec2(uTime * 0.09, -uTime * 0.07));
    gFoamTexture = mix(
      0.6,
      valueNoise(ROT_A * p * 6.0 + foamDrift) * 0.6 + valueNoise(ROT_B * p * 14.0 - foamDrift * 2.0) * 0.4,
      detailFade
    );

    float periphShallow = 0.0;
    float periphFoam = 0.0;
    ${reefCalls}

    // Nearest of the 24 archipelago tile islands on the 7x7 perimeter ring (spacing 1.65)
    vec2 gridIdx = clamp(floor(p / 1.65 + 0.5), -3.0, 3.0);
    bool onSideX = abs(p.x) > abs(p.y);
    vec2 tileGrid = onSideX
      ? vec2(sign(p.x) * 3.0, gridIdx.y)
      : vec2(gridIdx.x, sign(p.y) * 3.0);
    vec2 nearestTileCenter = tileGrid * 1.65;
    float distToTile = length(p - nearestTileCenter);
    float tileRadius = (abs(tileGrid.x) == 3.0 && abs(tileGrid.y) == 3.0) ? 0.88 : 0.78;

    float shallowFactor = 1.0 - smoothstep(1.8, 5.0, distCenter);
    float boardReefFactor = 1.0 - smoothstep(tileRadius * 0.72, tileRadius * 1.55, distToTile);
    float totalShallow = clamp(shallowFactor + boardReefFactor * 0.85 + periphShallow * 0.75, 0.0, 1.0);

    // Motionless seabed: dark trenches and pale sandbanks scattered irregularly through open water
    float seabed = valueNoise(ROT_A * p * 0.055 + vSwellField.xy * 0.6) * 0.62
                 + valueNoise(ROT_B * p * 0.16 + vec2(4.3, 8.1)) * 0.38;
    float depthGradient = smoothstep(26.0, 6.0, distCenter);
    vec3 waterColor = mix(deepAzure, lagoonCyan, clamp(depthGradient + (seabed - 0.5) * 1.1, 0.0, 1.0));
    waterColor = mix(waterColor, abyssBlue, smoothstep(0.46, 0.26, seabed) * 0.8);
    waterColor = mix(waterColor, shallowTurquoise, smoothstep(0.58, 0.76, seabed) * 0.38);
    waterColor = mix(waterColor, shallowTurquoise, totalShallow);

    // Per-pixel surface: swell plus wind ripples, which themselves vary with the gusts
    vec3 swellHere = swell(p, vSwellField, uTime);
    float calm = 1.0 - smoothstep(30.0, 70.0, distCenter);
    float height = swellHere.x * calm;
    vec2 slope = swellHere.yz * calm * 2.6;
    vec2 ripple = vec2(0.0);
    if (detailFade > 0.001) {
      ripple = rippleSlope(p, uTime) * vSwellField.z * detailFade;
    }
    slope += ripple;
    vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));

    vec3 lightDir = normalize(vec3(0.5, 0.85, 0.55));
    // Sun-facing and shadowed wave flanks give the swell visible volume
    waterColor *= 1.0 + clamp(dot(slope, lightDir.xz) * 1.5, -0.2, 0.25);

    if (detailFade > 0.001) {
      float causticGlow = caustics(p + ripple * 1.2, uTime) * (0.1 + totalShallow * 0.9);
      waterColor += vec3(0.20, 0.44, 0.45) * causticGlow * (0.65 + seabed * 0.7) * detailFade;
    }

    float crest = smoothstep(0.02, 0.09, height);
    waterColor = mix(waterColor, shallowTurquoise * 1.15, crest * 0.3);

    float islandFoam = shoreFoam(distCenter, 2.15, 0.37, 0.22, 1.0);

    // Foam around each of the 24 tile islands, each lapping on its own rhythm. Its outgoing band
    // stops short of the cell edge, where the neighbouring tile's different rhythm takes over.
    float alongRing = onSideX ? abs(p.y - nearestTileCenter.y) : abs(p.x - nearestTileCenter.x);
    float tileFoam = shoreFoam(
      distToTile, tileRadius, hash21(tileGrid * 0.37 + 0.5), 0.17,
      1.0 - smoothstep(0.62, 0.82, alongRing)
    );

    // Whitecaps only break on the tallest crests, in patches wandering over the sea
    float capPatches = smoothstep(0.5, 0.75, valueNoise(p * 0.2 + vec2(uTime * 0.04, uTime * 0.025)));
    float whitecap = smoothstep(0.045, 0.1, height) * capPatches * smoothstep(0.42, 0.68, gFoamTexture);

    float foam = clamp(islandFoam + tileFoam * 0.85 + periphFoam * 0.75 + whitecap * 0.7 * detailFade, 0.0, 1.0);
    waterColor = mix(waterColor, foamWhite, foam);

    // Drifting cloud shadows break up the open water
    float cloudShadow = smoothstep(0.4, 0.8, fbm(p * 0.045 + vec2(uTime * 0.018, uTime * 0.006)));
    waterColor *= 1.0 - cloudShadow * 0.14;

    vec3 toCamera = normalize(cameraPosition - vec3(p.x, -0.14 + height, p.y));

    // The surface mirrors the sky at grazing angles
    vec3 reflected = reflect(-toCamera, normal);
    float fresnel = pow(1.0 - max(dot(normal, toCamera), 0.0), 4.0);
    vec3 skyTint = mix(FOG_COLOR, vec3(0.42, 0.56, 0.82), smoothstep(0.02, 0.45, reflected.y));
    waterColor = mix(waterColor, skyTint, fresnel * 0.65 * (1.0 - foam));

    // Scattered high-sun sparkles on ripples tilted just right
    float spec = pow(max(dot(normal, normalize(lightDir + toCamera)), 0.0), 220.0);
    waterColor += sunGold * spec * 0.8 * (1.0 - foam);

    // Sun glitter track running toward the low sun
    float glitter = pow(max(dot(reflected, SUN_DIR), 0.0), 90.0);
    waterColor += vec3(1.0, 0.72, 0.42) * glitter * 1.3;

    // Sea dissolves into the horizon haze, so the end of the ocean is never visible
    waterColor = mix(waterColor, FOG_COLOR, fogFactor(vFogDepth));

    gl_FragColor = vec4(waterColor, 1.0);
  }
`;

export const Ocean: React.FC = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const torchGlowRef = useRef<THREE.Mesh>(null);
  const caveLightRef = useRef<THREE.PointLight>(null);
  const tortugaJackpot = useGameStore((s) => s.tortugaJackpot);

  const [compassTexture, sandTexture, rockTexture, skullAlbedoTexture] =
    useTexture([
      './assets/compass_emblem.jpg',
      './assets/sand_beach.jpg',
      './assets/coastal_rock.jpg',
      './assets/skull_3d_albedo.jpg',
    ]);

  // Load the true 3D anatomical Skull model (26,202 vertices / 50,319 triangles in X, Y, Z)
  const { nodes } = useGLTF('./assets/center_skull_cave.glb') as unknown as {
    nodes: {
      HiggsfieldSkullCave3D: THREE.Mesh;
    };
  };

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  const oceanGeometry = useMemo(() => {
    const geometry = new THREE.RingGeometry(0.001, 1, 128, 90);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const r = Math.hypot(x, y);
      // Cubic radial spacing: about the old grid's density at the board, sparse out at the horizon
      const scale = r * r * OCEAN_RADIUS;
      position.setXY(i, x * scale, y * scale);
    }
    return geometry;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = t;
    }
    if (torchGlowRef.current) {
      const pulse = 1 + Math.sin(t * 4.2) * 0.08;
      torchGlowRef.current.scale.set(pulse, pulse, 1);
    }
    if (caveLightRef.current) {
      caveLightRef.current.intensity = 2.4 + Math.sin(t * 5.5) * 0.45;
    }
  });

  return (
    <group>
      {/* Custom Shader Caribbean Ocean: dense around the board, stretching far beyond the fog */}
      <mesh
        position={[0, -0.14, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={oceanGeometry}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={shaderRef}
          vertexShader={CARIBBEAN_WATER_VERTEX}
          fragmentShader={CARIBBEAN_WATER_FRAGMENT}
          uniforms={uniforms}
        />
      </mesh>

      {/* Central Decorative Treasure Island with True 3D Sculpted Skull Model */}
      <group position={[0, -0.08, 0]}>
        {/* Outer Submerged Golden Sandbar */}
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <cylinderGeometry args={[2.12, 2.42, 0.22, 24]} />
          <meshStandardMaterial
            map={sandTexture}
            bumpMap={sandTexture}
            bumpScale={0.025}
            color="#fde68a"
            roughness={0.85}
          />
        </mesh>

        {/* Upper Sandy Beach Terrace */}
        <mesh position={[0, 0.22, 0]} receiveShadow>
          <cylinderGeometry args={[1.76, 2.08, 0.28, 24]} />
          <meshStandardMaterial
            map={sandTexture}
            bumpMap={sandTexture}
            bumpScale={0.03}
            color="#fcd34d"
            roughness={0.8}
          />
        </mesh>

        {/* Engraved Compass Rose Stone Plaza on the Beach */}
        <mesh
          position={[0, 0.37, 0.22]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[1.48, 24]} />
          <meshStandardMaterial
            map={compassTexture}
            roughness={0.55}
            metalness={0.1}
          />
        </mesh>

        {/* 3D Sculpted Coastal Rock Formation flanking the 3D Skull */}
        <mesh
          position={[-0.86, 0.54, -0.28]}
          rotation={[0.12, -0.45, -0.15]}
          receiveShadow
        >
          <dodecahedronGeometry args={[0.52, 1]} />
          <meshStandardMaterial
            map={rockTexture}
            bumpMap={rockTexture}
            bumpScale={0.04}
            color="#57534e"
            roughness={0.9}
          />
        </mesh>
        <mesh
          position={[0.86, 0.52, -0.28]}
          rotation={[0.1, 0.55, 0.14]}
          receiveShadow
        >
          <dodecahedronGeometry args={[0.5, 1]} />
          <meshStandardMaterial
            map={rockTexture}
            bumpMap={rockTexture}
            bumpScale={0.04}
            color="#57534e"
            roughness={0.9}
          />
        </mesh>

        {/* TRUE 3D SCULPTED SKULL MODEL (with Baked 3D AO, Pitch-Black Interior Core & Stone/Bone Texture) */}
        {nodes?.HiggsfieldSkullCave3D && (
          <group position={[0, 0.32, -0.14]} rotation={[-0.08, 0, 0]}>
            {/* Solid Pitch-Black 3D Inner Core inside the Center of the Skull (blocks all see-through gaps in eye sockets, nose & jaw) */}
            <mesh position={[0, 0.94, -0.12]} scale={[0.48, 0.56, 0.58]}>
              <sphereGeometry args={[1, 20, 20]} />
              <meshBasicMaterial color="#02040a" />
            </mesh>
            <mesh position={[0, 0.36, 0.08]} scale={[0.38, 0.35, 0.48]}>
              <cylinderGeometry args={[0.92, 1.05, 1, 20]} />
              <meshBasicMaterial color="#02040a" />
            </mesh>

            {/* Inner Pitch-Black Backface Shell of the 3D Skull Cavern */}
            <mesh
              geometry={nodes.HiggsfieldSkullCave3D.geometry}
              scale={[1.26, 1.26, 1.26]}
            >
              <meshBasicMaterial color="#02040a" side={THREE.BackSide} />
            </mesh>

            {/* Outer 3D Sculpted Bone/Stone Skull Mesh */}
            <mesh
              geometry={nodes.HiggsfieldSkullCave3D.geometry}
              scale={[1.28, 1.28, 1.28]}
            >
              <meshStandardMaterial
                map={skullAlbedoTexture}
                bumpMap={skullAlbedoTexture}
                bumpScale={0.035}
                color="#f5ead6"
                roughness={0.58}
                metalness={0.08}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Deep Black Eye Socket Backing behind the Golden Orbs */}
            {[-0.25, 0.25].map((eyeX, idx) => (
              <group key={idx}>
                <mesh position={[eyeX, 0.82, 0.67]}>
                  <sphereGeometry args={[0.105, 12, 12]} />
                  <meshBasicMaterial color="#02040a" />
                </mesh>
                <mesh position={[eyeX, 0.82, 0.72]}>
                  <sphereGeometry args={[0.072, 12, 12]} />
                  <meshStandardMaterial
                    color="#fde047"
                    emissive="#f59e0b"
                    emissiveIntensity={2.2}
                  />
                </mesh>
              </group>
            ))}
          </group>
        )}

        {/* 3D Volumetric Treasure Chest & Gold Doubloon Mounds at the Jaw Entrance of the 3D Skull Cave */}
        <group position={[0, 0.38, 0.48]}>
          {/* Dynamic Flickering Torchlight inside the 3D Skull Jaw Cavern */}
          <pointLight
            ref={caveLightRef}
            position={[0, 0.35, 0.12]}
            color="#fbbf24"
            intensity={2.2}
            distance={4.5}
            decay={2}
          />

          {/* Golden Treasure Glow on the Sand */}
          <mesh
            ref={torchGlowRef}
            position={[0, 0.01, 0.08]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.85, 24]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.34} />
          </mesh>

          {/* 3D Overflowing Gold Doubloon Mounds (X, Y, Z) */}
          <mesh position={[-0.24, 0.06, 0.05]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.16, 1]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#d97706"
              emissiveIntensity={0.35}
              metalness={0.85}
              roughness={0.22}
            />
          </mesh>
          <mesh position={[0.24, 0.06, 0.06]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.15, 1]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#d97706"
              emissiveIntensity={0.35}
              metalness={0.85}
              roughness={0.22}
            />
          </mesh>

          {/* 3D Pirate Treasure Chest in the Center of the Skull Mouth */}
          <group position={[0, 0.11, 0.12]} rotation={[0, 0.12, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.32, 0.18, 0.22]} />
              <meshStandardMaterial color="#78350f" roughness={0.7} />
            </mesh>
            <mesh
              position={[0, 0.09, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.11, 0.11, 0.33, 12]} />
              <meshStandardMaterial
                color="#b45309"
                metalness={0.4}
                roughness={0.45}
              />
            </mesh>
            <mesh position={[0, 0.04, 0.115]}>
              <boxGeometry args={[0.07, 0.08, 0.02]} />
              <meshStandardMaterial
                color="#fde047"
                metalness={0.9}
                roughness={0.18}
              />
            </mesh>
          </group>
        </group>

        {/* Central Jackpot Banner in front of the 3D Skull Cave */}
        <group position={[0, 0.62, 1.14]} rotation={[-0.35, 0, 0]}>
          <Text
            font="./assets/fonts/PirataOne-Regular.ttf"
            position={[0, 0.2, 0]}
            fontSize={0.28}
            color="#fef08a"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.032}
            outlineColor="#451a03"
          >
            {`Grotte du Crâne : ${tortugaJackpot} Or`}
          </Text>
          <Text
            font="./assets/fonts/Cinzel-Bold.ttf"
            position={[0, -0.04, 0]}
            fontSize={0.13}
            color="#fed7aa"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#1e293b"
          >
            TRÉSOR DE TORTUGA
          </Text>
        </group>
      </group>
    </group>
  );
};
