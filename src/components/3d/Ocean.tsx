import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

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
      crownRef.current.rotation.z = Math.sin(t * 1.6 + position[0]) * 0.05;
      crownRef.current.rotation.x = Math.cos(t * 1.3 + position[2]) * 0.04;
    }
  });

  const segments = [0, 1, 2, 3, 4];

  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      {segments.map((seg) => {
        const y = seg * 0.24;
        const xOffset = Math.pow(seg * 0.22, 1.4) * lean;
        const radiusBottom = 0.11 - seg * 0.014;
        const radiusTop = 0.095 - seg * 0.014;
        return (
          <mesh
            key={seg}
            position={[xOffset, y + 0.12, 0]}
            rotation={[0, 0, -lean * 0.35]}
            castShadow
          >
            <cylinderGeometry args={[radiusTop, radiusBottom, 0.26, 6]} />
            <meshStandardMaterial color="#78350f" roughness={0.85} />
          </mesh>
        );
      })}

      {/* Coconuts & Palm Fronds */}
      <group
        ref={crownRef}
        position={[Math.pow(4 * 0.22, 1.4) * lean, 1.22, 0]}
      >
        {[0, 1, 2].map((c) => (
          <mesh
            key={c}
            position={[
              Math.cos((c * Math.PI * 2) / 3) * 0.09,
              -0.04,
              Math.sin((c * Math.PI * 2) / 3) * 0.09,
            ]}
          >
            <sphereGeometry args={[0.055, 6, 6]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} />
          </mesh>
        ))}

        {[0, 1, 2, 3, 4, 5].map((f) => {
          const angle = (f * Math.PI * 2) / 6;
          return (
            <group key={f} rotation={[0, angle, 0]}>
              <mesh
                position={[0.38, 0.02, 0]}
                rotation={[0, 0, -0.42]}
                castShadow
              >
                <boxGeometry args={[0.75, 0.035, 0.18]} />
                <meshStandardMaterial color="#15803d" roughness={0.65} />
              </mesh>
              <mesh
                position={[0.72, -0.16, 0]}
                rotation={[0, 0, -0.78]}
                castShadow
              >
                <coneGeometry args={[0.1, 0.38, 4]} />
                <meshStandardMaterial color="#16a34a" roughness={0.65} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

function SkullRock() {
  return (
    <group position={[-0.55, 0.55, -0.35]} rotation={[0, 0.45, 0]}>
      {/* Main Crag / Skull Dome */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <dodecahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} flatShading />
      </mesh>
      {/* Jaw / Base Rock */}
      <mesh position={[0, 0.05, 0.18]} castShadow>
        <boxGeometry args={[0.7, 0.42, 0.65]} />
        <meshStandardMaterial color="#475569" roughness={0.9} flatShading />
      </mesh>
      {/* Left Glowing Eye Socket */}
      <mesh position={[-0.2, 0.42, 0.52]}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={1.6}
        />
      </mesh>
      {/* Right Glowing Eye Socket */}
      <mesh position={[0.2, 0.42, 0.52]}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={1.6}
        />
      </mesh>
      {/* Nose cavity */}
      <mesh position={[0, 0.25, 0.56]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.08, 0.18, 3]} />
        <meshStandardMaterial color="#334155" roughness={1} />
      </mesh>
    </group>
  );
}

function GiantTreasureChest() {
  const chestGlowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (chestGlowRef.current) {
      chestGlowRef.current.intensity =
        1.2 + Math.sin(clock.getElapsedTime() * 3) * 0.4;
    }
  });

  return (
    <group position={[0.55, 0.36, 0.35]} rotation={[0, -0.5, 0]}>
      <pointLight
        ref={chestGlowRef}
        position={[0, 0.45, 0]}
        color="#fbbf24"
        intensity={1.2}
        distance={3.5}
      />
      {/* Chest Wooden Base */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.78, 0.36, 0.52]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.7} />
      </mesh>
      {/* Gold Trim Bands */}
      <mesh position={[-0.28, 0.18, 0]} castShadow>
        <boxGeometry args={[0.07, 0.38, 0.55]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0.28, 0.18, 0]} castShadow>
        <boxGeometry args={[0.07, 0.38, 0.55]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Open Lid tilted back */}
      <group position={[0, 0.35, -0.24]} rotation={[-0.85, 0, 0]}>
        <mesh
          position={[0, 0.08, 0.24]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry
            args={[0.26, 0.26, 0.78, 8, 1, false, 0, Math.PI]}
          />
          <meshStandardMaterial color="#9a3412" roughness={0.65} />
        </mesh>
      </group>
      {/* Overflowing Gold Heap */}
      <mesh position={[0, 0.37, 0.02]}>
        <sphereGeometry args={[0.26, 10, 8]} />
        <meshStandardMaterial
          color="#facc15"
          emissive="#ca8a04"
          emissiveIntensity={0.45}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0.16, 0.38, 0.06]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#eab308"
          emissiveIntensity={0.4}
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>
      {/* Ruby Gem */}
      <mesh position={[-0.12, 0.48, 0.08]}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#dc2626"
          emissiveIntensity={0.7}
          metalness={0.3}
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

    // Multi-layered smooth swells & ripples
    float w1 = sin(xz.x * 0.75 + uTime * 1.6) * cos(xz.y * 0.65 + uTime * 1.2) * 0.055;
    float w2 = sin((xz.x + xz.y) * 1.15 - uTime * 2.1) * 0.035;
    float radial = sin(length(xz) * 1.8 - uTime * 2.4) * 0.025;
    float elevation = w1 + w2 + radial;

    worldPosition.y += elevation;

    // Analytical approximate normal for sun sparkles
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

  // Procedural animated water caustics
  float causticPattern(vec2 uv, float time) {
    vec2 p = uv * 1.35;
    float c1 = sin(p.x * 3.1 + time * 1.7 + cos(p.y * 2.7 - time * 1.3));
    float c2 = cos(p.y * 3.4 - time * 1.5 + sin(p.x * 2.9 + time * 1.9));
    float val = (c1 * c2) * 0.5 + 0.5;
    return pow(val, 3.2);
  }

  void main() {
    float distCenter = length(vWorldXZ);
    float squareDist = max(abs(vWorldXZ.x), abs(vWorldXZ.y));

    // Caribbean Color Palette (Zero dark/black tones!)
    vec3 shallowTurquoise = vec3(0.16, 0.88, 0.86);
    vec3 lagoonCyan       = vec3(0.05, 0.66, 0.82);
    vec3 deepAzure        = vec3(0.04, 0.36, 0.58);
    vec3 foamWhite        = vec3(0.95, 0.99, 1.00);
    vec3 sunGold          = vec3(1.00, 0.94, 0.72);

    // Blend from shallow turquoise around central island & board ring to deep azure outside
    float shallowFactor = 1.0 - smoothstep(1.8, 5.2, distCenter);
    float boardReefFactor = 1.0 - smoothstep(0.4, 1.4, abs(squareDist - 4.95));
    float totalShallow = clamp(shallowFactor + boardReefFactor * 0.65, 0.0, 1.0);

    vec3 waterColor = mix(deepAzure, lagoonCyan, smoothstep(16.0, 5.5, distCenter));
    waterColor = mix(waterColor, shallowTurquoise, totalShallow);

    // Dual-layer animated underwater caustics
    float caustics1 = causticPattern(vWorldXZ + vec2(uTime * 0.15, -uTime * 0.1), uTime);
    float caustics2 = causticPattern(vWorldXZ * 1.4 - vec2(uTime * 0.12, uTime * 0.18), -uTime * 0.8);
    float causticMask = (caustics1 + caustics2 * 0.7) * (0.35 + totalShallow * 0.55);
    waterColor += vec3(0.18, 0.42, 0.45) * causticMask;

    // Wave crest highlight
    float crest = smoothstep(0.02, 0.09, vElevation);
    waterColor = mix(waterColor, shallowTurquoise * 1.15, crest * 0.45);

    // Animated white foam rings around central Treasure Island (radius ~2.15)
    float islandShore = abs(distCenter - 2.15 + sin(uTime * 2.5 + vWorldXZ.x * 3.0) * 0.08);
    float islandFoam = 1.0 - smoothstep(0.0, 0.22, islandShore);

    // Animated white foam along the 24-tile wooden pier (square radius ~4.2 and ~5.7)
    float innerPierShore = abs(squareDist - 4.12 + cos(uTime * 2.2 + vWorldXZ.y * 2.5) * 0.07);
    float outerPierShore = abs(squareDist - 5.75 + sin(uTime * 2.0 + vWorldXZ.x * 2.5) * 0.08);
    float pierFoam = (1.0 - smoothstep(0.0, 0.16, innerPierShore)) * step(squareDist, 4.35)
                   + (1.0 - smoothstep(0.0, 0.18, outerPierShore)) * step(5.55, squareDist);

    float foam = clamp(islandFoam + pierFoam * 0.75 + pow(crest, 2.5) * 0.35, 0.0, 1.0);
    waterColor = mix(waterColor, foamWhite, foam);

    // Caribbean sun specular sparkle
    vec3 lightDir = normalize(vec3(0.5, 0.85, 0.55));
    float spec = pow(max(dot(vNormalDir, lightDir), 0.0), 48.0);
    waterColor += sunGold * spec * 0.55;

    gl_FragColor = vec4(waterColor, 1.0);
  }
`;

export const Ocean: React.FC = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const tortugaJackpot = useGameStore((s) => s.tortugaJackpot);

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
      {/* Custom Shader Caribbean Ocean (Caustics, Turquoise Gradients, Shoreline Foam, Sun Sparkles) */}
      <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[48, 48, 96, 96]} />
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
          <cylinderGeometry args={[1.95, 2.25, 0.22, 24]} />
          <meshStandardMaterial color="#fde68a" roughness={0.85} />
        </mesh>

        {/* Upper Sand Mound */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.52, 1.92, 0.32, 18]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.85} flatShading />
        </mesh>

        {/* Lush Grass Inner Plateau */}
        <mesh position={[-0.15, 0.42, -0.1]} castShadow receiveShadow>
          <cylinderGeometry args={[1.05, 1.35, 0.16, 14]} />
          <meshStandardMaterial color="#16a34a" roughness={0.8} flatShading />
        </mesh>

        {/* Skull Rock Formation */}
        <SkullRock />

        {/* Giant Overflowing Treasure Chest */}
        <GiantTreasureChest />

        {/* Low-Poly Caribbean Palm Trees */}
        <LowPolyPalmTree
          position={[0.85, 0.34, -0.65]}
          scale={0.95}
          lean={0.22}
          rotationY={0.6}
        />
        <LowPolyPalmTree
          position={[-0.95, 0.32, 0.65]}
          scale={0.85}
          lean={-0.2}
          rotationY={-0.8}
        />
        <LowPolyPalmTree
          position={[0.1, 0.44, -0.95]}
          scale={0.75}
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
    </group>
  );
};
