import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

/**
 * Stylized Caribbean Palm Tree with curved organic trunk and arched 3D palm fronds
 */
function LowPolyPalmTree({
  position,
  scale = 1,
  lean = 0.15,
  rotationY = 0,
}: {
  position: [number, number, number];
  scale?: number;
  lean?: number;
  rotationY?: number;
}) {
  const crownRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (crownRef.current) {
      const t = clock.getElapsedTime();
      crownRef.current.rotation.z = Math.sin(t * 1.6 + position[0]) * 0.055;
      crownRef.current.rotation.x = Math.cos(t * 1.3 + position[2]) * 0.045;
    }
  });

  const segments = [0, 1, 2, 3, 4, 5];

  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      {/* Ringed Coconut Palm Trunk */}
      {segments.map((seg) => {
        const y = seg * 0.21;
        const xOffset = Math.pow(seg * 0.2, 1.45) * lean;
        const radiusBottom = 0.115 - seg * 0.013;
        const radiusTop = 0.098 - seg * 0.013;
        return (
          <mesh
            key={seg}
            position={[xOffset, y + 0.1, 0]}
            rotation={[0, 0, -lean * 0.35]}
            castShadow
          >
            <cylinderGeometry args={[radiusTop, radiusBottom, 0.23, 8]} />
            <meshStandardMaterial
              color={seg % 2 === 0 ? '#78350f' : '#92400e'}
              roughness={0.85}
            />
          </mesh>
        );
      })}

      {/* Coconuts & Curved Arched Palm Fronds */}
      <group
        ref={crownRef}
        position={[Math.pow(5 * 0.2, 1.45) * lean, 1.32, 0]}
      >
        {[0, 1, 2, 3].map((c) => (
          <mesh
            key={c}
            position={[
              Math.cos((c * Math.PI) / 2) * 0.095,
              -0.05,
              Math.sin((c * Math.PI) / 2) * 0.095,
            ]}
          >
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#451a03" roughness={0.85} />
          </mesh>
        ))}

        {/* 7 Graceful Arched Palm Fronds */}
        {[0, 1, 2, 3, 4, 5, 6].map((f) => {
          const angle = (f * Math.PI * 2) / 7;
          const isLower = f % 2 === 0;
          return (
            <group
              key={f}
              rotation={[isLower ? 0.12 : -0.05, angle, 0]}
            >
              {/* Inner arched frond segment */}
              <mesh
                position={[0.24, 0.06, 0]}
                rotation={[0, 0, -0.18]}
                castShadow
              >
                <boxGeometry args={[0.46, 0.03, 0.22]} />
                <meshStandardMaterial color="#15803d" roughness={0.6} />
              </mesh>
              {/* Mid drooping frond blade */}
              <mesh
                position={[0.58, -0.08, 0]}
                rotation={[0, 0, -0.58]}
                castShadow
              >
                <boxGeometry args={[0.38, 0.025, 0.18]} />
                <meshStandardMaterial color="#16a34a" roughness={0.6} />
              </mesh>
              {/* Tapered frond tip */}
              <mesh
                position={[0.82, -0.28, 0]}
                rotation={[0, 0, -0.95]}
                castShadow
              >
                <coneGeometry args={[0.09, 0.32, 4]} />
                <meshStandardMaterial color="#22c55e" roughness={0.6} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/**
 * Dense tropical jungle foliage cluster: canopy trees, giant ferns, and exotic flowers
 */
function TropicalJungleCluster({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <dodecahedronGeometry args={[0.48, 1]} />
        <meshStandardMaterial color="#15803d" roughness={0.75} flatShading />
      </mesh>
      <mesh position={[0.32, 0.22, 0.18]} castShadow>
        <dodecahedronGeometry args={[0.36, 1]} />
        <meshStandardMaterial color="#22c55e" roughness={0.7} flatShading />
      </mesh>
      <mesh position={[-0.28, 0.18, 0.22]} castShadow>
        <dodecahedronGeometry args={[0.34, 1]} />
        <meshStandardMaterial color="#166534" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0.15, 0.56, 0.22]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial
          color="#f43f5e"
          emissive="#e11d48"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[-0.22, 0.45, 0.12]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color="#fb923c"
          emissive="#ea580c"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

/**
 * Large Peripheral Island with multi-tiered mountain relief, cliffs, beaches, and lush tropical jungle
 */
function PeripheralTropicalIsland({
  position,
  scale = 1,
  rotationY = 0,
  variant = 'mountain',
}: {
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
  variant?: 'volcano' | 'mountain' | 'lagoon_arch' | 'temple';
}) {
  const smokeRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (smokeRef.current && variant === 'volcano') {
      const t = clock.getElapsedTime();
      smokeRef.current.children.forEach((child, idx) => {
        const yOffset = (t * 0.45 + idx * 0.35) % 1.2;
        child.position.y = 2.9 + yOffset * 1.1;
        const s = 0.22 + yOffset * 0.28;
        child.scale.setScalar(s);
      });
    }
  });

  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      {/* 1. Wide Golden Sandy Beach Base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[2.65, 3.25, 0.26, 20]} />
        <meshStandardMaterial color="#fde68a" roughness={0.85} flatShading />
      </mesh>

      {/* Secondary Cove Sandbar */}
      <mesh position={[1.45, 0.03, 0.95]} receiveShadow>
        <cylinderGeometry args={[1.25, 1.65, 0.2, 16]} />
        <meshStandardMaterial color="#fcd34d" roughness={0.85} flatShading />
      </mesh>

      {/* 2. Lush Tropical Foothills & Jungle Terrace */}
      <mesh position={[-0.1, 0.35, -0.05]} castShadow receiveShadow>
        <cylinderGeometry args={[2.05, 2.55, 0.52, 16]} />
        <meshStandardMaterial color="#16a34a" roughness={0.8} flatShading />
      </mesh>

      <mesh position={[0.95, 0.26, 0.65]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 1.25, 0.36, 12]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} flatShading />
      </mesh>

      {/* 3. High Relief Mountain / Volcano / Cliffs */}
      {variant === 'volcano' && (
        <group>
          <mesh position={[-0.25, 1.55, -0.25]} castShadow>
            <coneGeometry args={[1.65, 2.6, 10]} />
            <meshStandardMaterial color="#475569" roughness={0.88} flatShading />
          </mesh>
          <mesh position={[0.55, 1.05, 0.2]} rotation={[0.1, 0, -0.35]} castShadow>
            <coneGeometry args={[1.05, 1.65, 8]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[-0.25, 2.68, -0.25]}>
            <cylinderGeometry args={[0.38, 0.25, 0.18, 10]} />
            <meshStandardMaterial
              color="#f97316"
              emissive="#dc2626"
              emissiveIntensity={1.6}
            />
          </mesh>
          <group ref={smokeRef}>
            {[0, 1, 2].map((i) => (
              <mesh
                key={i}
                position={[-0.25 + (i - 1) * 0.12, 3.0 + i * 0.35, -0.25]}
              >
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                  color="#cbd5e1"
                  transparent
                  opacity={0.55}
                  flatShading
                />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {variant === 'mountain' && (
        <group>
          <mesh position={[-0.3, 1.45, -0.2]} castShadow>
            <coneGeometry args={[1.45, 2.35, 9]} />
            <meshStandardMaterial color="#64748b" roughness={0.85} flatShading />
          </mesh>
          <mesh position={[0.55, 1.15, 0.25]} castShadow>
            <coneGeometry args={[1.15, 1.75, 9]} />
            <meshStandardMaterial color="#166534" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0.05, 1.05, 0.68]} rotation={[-0.38, 0, 0]}>
            <boxGeometry args={[0.28, 1.45, 0.08]} />
            <meshStandardMaterial
              color="#67e8f9"
              emissive="#22d3ee"
              emissiveIntensity={0.65}
            />
          </mesh>
        </group>
      )}

      {variant === 'temple' && (
        <group>
          <mesh position={[-0.4, 1.25, -0.3]} castShadow>
            <coneGeometry args={[1.35, 1.95, 9]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} flatShading />
          </mesh>
          <group position={[0.35, 0.62, 0.1]}>
            <mesh position={[0, 0.15, 0]} castShadow>
              <boxGeometry args={[1.1, 0.3, 1.1]} />
              <meshStandardMaterial color="#d97706" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.42, 0]} castShadow>
              <boxGeometry args={[0.8, 0.28, 0.8]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.68, 0]} castShadow>
              <boxGeometry args={[0.5, 0.26, 0.5]} />
              <meshStandardMaterial
                color="#fbbf24"
                emissive="#d97706"
                emissiveIntensity={0.35}
              />
            </mesh>
          </group>
        </group>
      )}

      {variant === 'lagoon_arch' && (
        <group>
          <mesh position={[-0.85, 1.2, -0.15]} castShadow>
            <dodecahedronGeometry args={[1.05, 1]} />
            <meshStandardMaterial color="#64748b" roughness={0.85} flatShading />
          </mesh>
          <mesh position={[0.75, 1.05, 0.15]} castShadow>
            <dodecahedronGeometry args={[0.92, 1]} />
            <meshStandardMaterial color="#475569" roughness={0.85} flatShading />
          </mesh>
          <mesh position={[-0.05, 1.65, 0]} rotation={[0, 0, 0.1]} castShadow>
            <boxGeometry args={[1.85, 0.45, 0.75]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} flatShading />
          </mesh>
        </group>
      )}

      <TropicalJungleCluster position={[-1.15, 0.55, 0.75]} scale={1.15} />
      <TropicalJungleCluster position={[0.95, 0.48, -0.85]} scale={1.05} />
      <TropicalJungleCluster position={[1.35, 0.38, 0.75]} scale={0.95} />
      <TropicalJungleCluster position={[-0.35, 0.62, 1.15]} scale={1.0} />

      <LowPolyPalmTree
        position={[1.75, 0.22, 1.05]}
        scale={1.05}
        lean={0.26}
        rotationY={0.8}
      />
      <LowPolyPalmTree
        position={[-1.65, 0.35, 0.85]}
        scale={0.95}
        lean={-0.22}
        rotationY={-1.1}
      />
      <LowPolyPalmTree
        position={[0.45, 0.55, 1.45]}
        scale={0.88}
        lean={0.2}
        rotationY={1.9}
      />
      <LowPolyPalmTree
        position={[-1.1, 0.52, -1.25]}
        scale={1.1}
        lean={-0.18}
        rotationY={2.6}
      />
      <LowPolyPalmTree
        position={[1.35, 0.42, -1.15]}
        scale={0.92}
        lean={0.24}
        rotationY={-0.4}
      />
    </group>
  );
}

function SkullRock() {
  return (
    <group position={[-0.58, 0.52, -0.38]} rotation={[0, 0.45, 0]}>
      {/* Main Crag / Skull Cranium */}
      <mesh position={[0, 0.44, 0]} castShadow>
        <dodecahedronGeometry args={[0.58, 1]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.8} flatShading />
      </mesh>
      {/* Cheekbones & Jaw Cavern */}
      <mesh position={[0, 0.08, 0.16]} castShadow>
        <boxGeometry args={[0.68, 0.38, 0.6]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} flatShading />
      </mesh>
      {/* Crossed Gold Cutlasses / Torch Posts */}
      <mesh position={[-0.2, 0.44, 0.49]}>
        <sphereGeometry args={[0.11, 10, 10]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={1.8}
        />
      </mesh>
      <mesh position={[0.2, 0.44, 0.49]}>
        <sphereGeometry args={[0.11, 10, 10]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={1.8}
        />
      </mesh>
      {/* Nose cavity */}
      <mesh position={[0, 0.27, 0.52]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.08, 0.18, 3]} />
        <meshStandardMaterial color="#1e293b" roughness={1} />
      </mesh>
    </group>
  );
}

function GiantTreasureChest() {
  const chestGlowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (chestGlowRef.current) {
      chestGlowRef.current.intensity =
        1.4 + Math.sin(clock.getElapsedTime() * 3) * 0.45;
    }
  });

  return (
    <group position={[0.58, 0.38, 0.38]} rotation={[0, -0.5, 0]}>
      <pointLight
        ref={chestGlowRef}
        position={[0, 0.48, 0]}
        color="#fbbf24"
        intensity={1.4}
        distance={3.8}
      />
      {/* Chest Wooden Base */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.78, 0.36, 0.52]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.65} />
      </mesh>
      {/* Gold Trim Bands */}
      <mesh position={[-0.28, 0.18, 0]} castShadow>
        <boxGeometry args={[0.07, 0.38, 0.55]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.28, 0.18, 0]} castShadow>
        <boxGeometry args={[0.07, 0.38, 0.55]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Open Lid tilted back */}
      <group position={[0, 0.35, -0.24]} rotation={[-0.85, 0, 0]}>
        <mesh
          position={[0, 0.08, 0.24]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry
            args={[0.26, 0.26, 0.78, 10, 1, false, 0, Math.PI]}
          />
          <meshStandardMaterial color="#9a3412" roughness={0.6} />
        </mesh>
      </group>
      {/* Overflowing Gold Heap */}
      <mesh position={[0, 0.37, 0.02]}>
        <sphereGeometry args={[0.26, 12, 10]} />
        <meshStandardMaterial
          color="#facc15"
          emissive="#ca8a04"
          emissiveIntensity={0.5}
          metalness={0.85}
          roughness={0.18}
        />
      </mesh>
      <mesh position={[0.16, 0.38, 0.06]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#eab308"
          emissiveIntensity={0.45}
          metalness={0.85}
          roughness={0.18}
        />
      </mesh>
      {/* Ruby Gem */}
      <mesh position={[-0.12, 0.48, 0.08]}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#dc2626"
          emissiveIntensity={0.8}
          metalness={0.35}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

const CARIBBEAN_WATER_VERTEX = /* glsl */ `
  uniform float uTime;
  varying vec2 vWorldXZ;
  varying float vElevation;
  varying vec3 vNormalDir;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec2 xz = worldPosition.xz;

    float w1 = sin(xz.x * 0.75 + uTime * 1.6) * cos(xz.y * 0.65 + uTime * 1.2) * 0.055;
    float w2 = sin((xz.x + xz.y) * 1.15 - uTime * 2.1) * 0.035;
    float radial = sin(length(xz) * 1.8 - uTime * 2.4) * 0.025;
    float elevation = w1 + w2 + radial;

    worldPosition.y += elevation;

    float dx = cos(xz.x * 0.75 + uTime * 1.6) * 0.04 + cos((xz.x + xz.y) * 1.15 - uTime * 2.1) * 0.04;
    float dz = -sin(xz.y * 0.65 + uTime * 1.2) * 0.04 + cos((xz.x + xz.y) * 1.15 - uTime * 2.1) * 0.04;
    vNormalDir = normalize(vec3(-dx, 1.0, -dz));

    vWorldXZ = xz;
    vElevation = elevation;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const CARIBBEAN_WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vWorldXZ;
  varying float vElevation;
  varying vec3 vNormalDir;

  float causticPattern(vec2 uv, float time) {
    vec2 p = uv * 1.35;
    float c1 = sin(p.x * 3.1 + time * 1.7 + cos(p.y * 2.7 - time * 1.3));
    float c2 = cos(p.y * 3.4 - time * 1.5 + sin(p.x * 2.9 + time * 1.9));
    float val = (c1 * c2) * 0.5 + 0.5;
    return pow(val, 3.2);
  }

  void addIslandReef(vec2 pos, float radius, inout float shallowAcc, inout float foamAcc) {
    float d = length(vWorldXZ - pos);
    shallowAcc += 1.0 - smoothstep(radius * 0.85, radius * 1.65, d);
    float shore = abs(d - radius + sin(uTime * 2.3 + vWorldXZ.x * 2.0 + vWorldXZ.y * 2.0) * 0.12);
    foamAcc += 1.0 - smoothstep(0.0, 0.26, shore);
  }

  void main() {
    float distCenter = length(vWorldXZ);
    float squareDist = max(abs(vWorldXZ.x), abs(vWorldXZ.y));

    vec3 shallowTurquoise = vec3(0.16, 0.88, 0.86);
    vec3 lagoonCyan       = vec3(0.05, 0.66, 0.82);
    vec3 deepAzure        = vec3(0.04, 0.36, 0.58);
    vec3 foamWhite        = vec3(0.95, 0.99, 1.00);
    vec3 sunGold          = vec3(1.00, 0.94, 0.72);

    float periphShallow = 0.0;
    float periphFoam = 0.0;
    addIslandReef(vec2(-10.2, -9.8), 3.6, periphShallow, periphFoam);
    addIslandReef(vec2(10.5, -9.5),  3.4, periphShallow, periphFoam);
    addIslandReef(vec2(0.0, -11.5),  3.1, periphShallow, periphFoam);
    addIslandReef(vec2(-10.8, 0.5),  3.0, periphShallow, periphFoam);
    addIslandReef(vec2(10.8, 0.8),   3.0, periphShallow, periphFoam);
    addIslandReef(vec2(-9.8, 9.6),   2.9, periphShallow, periphFoam);
    addIslandReef(vec2(9.8, 9.6),    2.9, periphShallow, periphFoam);

    float shallowFactor = 1.0 - smoothstep(1.8, 5.2, distCenter);
    float boardReefFactor = 1.0 - smoothstep(0.4, 1.4, abs(squareDist - 4.95));
    float totalShallow = clamp(shallowFactor + boardReefFactor * 0.65 + periphShallow * 0.85, 0.0, 1.0);

    vec3 waterColor = mix(deepAzure, lagoonCyan, smoothstep(22.0, 6.0, distCenter));
    waterColor = mix(waterColor, shallowTurquoise, totalShallow);

    float caustics1 = causticPattern(vWorldXZ + vec2(uTime * 0.15, -uTime * 0.1), uTime);
    float caustics2 = causticPattern(vWorldXZ * 1.4 - vec2(uTime * 0.12, uTime * 0.18), -uTime * 0.8);
    float causticMask = (caustics1 + caustics2 * 0.7) * (0.35 + totalShallow * 0.55);
    waterColor += vec3(0.18, 0.42, 0.45) * causticMask;

    float crest = smoothstep(0.02, 0.09, vElevation);
    waterColor = mix(waterColor, shallowTurquoise * 1.15, crest * 0.45);

    float islandShore = abs(distCenter - 2.15 + sin(uTime * 2.5 + vWorldXZ.x * 3.0) * 0.08);
    float islandFoam = 1.0 - smoothstep(0.0, 0.22, islandShore);

    float innerPierShore = abs(squareDist - 4.12 + cos(uTime * 2.2 + vWorldXZ.y * 2.5) * 0.07);
    float outerPierShore = abs(squareDist - 5.75 + sin(uTime * 2.0 + vWorldXZ.x * 2.5) * 0.08);
    float pierFoam = (1.0 - smoothstep(0.0, 0.16, innerPierShore)) * step(squareDist, 4.35)
                   + (1.0 - smoothstep(0.0, 0.18, outerPierShore)) * step(5.55, squareDist);

    float foam = clamp(islandFoam + pierFoam * 0.75 + periphFoam * 0.85 + pow(crest, 2.5) * 0.35, 0.0, 1.0);
    waterColor = mix(waterColor, foamWhite, foam);

    vec3 lightDir = normalize(vec3(0.5, 0.85, 0.55));
    float spec = pow(max(dot(vNormalDir, lightDir), 0.0), 48.0);
    waterColor += sunGold * spec * 0.55;

    gl_FragColor = vec4(waterColor, 1.0);
  }
`;

export const Ocean: React.FC = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const tortugaJackpot = useGameStore((s) => s.tortugaJackpot);
  const compassTexture = useTexture('./assets/compass_emblem.jpg');

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <group>
      {/* Custom Shader Caribbean Ocean */}
      <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[64, 64, 112, 112]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={CARIBBEAN_WATER_VERTEX}
          fragmentShader={CARIBBEAN_WATER_FRAGMENT}
          uniforms={uniforms}
        />
      </mesh>

      {/* Central Decorative Treasure Island */}
      <group position={[0, -0.08, 0]}>
        {/* Golden Sand Beach Base */}
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <cylinderGeometry args={[2.0, 2.32, 0.22, 28]} />
          <meshStandardMaterial color="#fde68a" roughness={0.85} />
        </mesh>

        {/* Upper Sand Mound */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.65, 1.98, 0.28, 24]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.8} />
        </mesh>

        {/* Illustrated Pirate Compass Rose Medallion on the Central Island */}
        <mesh
          position={[0, 0.37, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[1.55, 32]} />
          <meshStandardMaterial
            map={compassTexture}
            roughness={0.55}
            metalness={0.1}
          />
        </mesh>

        {/* Skull Rock Formation */}
        <SkullRock />

        {/* Giant Overflowing Treasure Chest */}
        <GiantTreasureChest />

        {/* Curved Caribbean Palm Trees */}
        <LowPolyPalmTree
          position={[1.05, 0.34, -0.75]}
          scale={0.95}
          lean={0.22}
          rotationY={0.6}
        />
        <LowPolyPalmTree
          position={[-1.08, 0.32, 0.72]}
          scale={0.85}
          lean={-0.2}
          rotationY={-0.8}
        />
        <LowPolyPalmTree
          position={[0.15, 0.36, -1.15]}
          scale={0.78}
          lean={0.18}
          rotationY={2.1}
        />

        {/* Floating Butin de Tortuga Banner over the Central Treasure Island */}
        <group position={[0, 1.85, 0.7]}>
          <Text
            position={[0, 0.24, 0]}
            fontSize={0.24}
            color="#fef08a"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#451a03"
          >
            {`COFFRE CENTRAL : ${tortugaJackpot} OR`}
          </Text>
          <Text
            position={[0, -0.04, 0]}
            fontSize={0.16}
            color="#fed7aa"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#1e293b"
          >
            PIRATE'S PLUNDER
          </Text>
        </group>
      </group>

      {/* SURROUNDING ARCHIPELAGO ON THE MAP BORDERS */}
      <PeripheralTropicalIsland
        position={[-10.2, -0.1, -9.8]}
        scale={1.15}
        rotationY={0.5}
        variant="volcano"
      />
      <PeripheralTropicalIsland
        position={[10.5, -0.1, -9.5]}
        scale={1.1}
        rotationY={-0.6}
        variant="mountain"
      />
      <PeripheralTropicalIsland
        position={[0, -0.1, -11.5]}
        scale={0.98}
        rotationY={0.15}
        variant="temple"
      />
      <PeripheralTropicalIsland
        position={[-10.8, -0.1, 0.5]}
        scale={0.95}
        rotationY={1.2}
        variant="lagoon_arch"
      />
      <PeripheralTropicalIsland
        position={[10.8, -0.1, 0.8]}
        scale={0.95}
        rotationY={-1.3}
        variant="mountain"
      />
      <PeripheralTropicalIsland
        position={[-9.8, -0.1, 9.6]}
        scale={0.9}
        rotationY={2.1}
        variant="lagoon_arch"
      />
      <PeripheralTropicalIsland
        position={[9.8, -0.1, 9.6]}
        scale={0.9}
        rotationY={-2.2}
        variant="temple"
      />
    </group>
  );
};
