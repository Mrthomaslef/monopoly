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
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} flatShading />
      </mesh>
      {/* Jaw / Base Rock */}
      <mesh position={[0, 0.05, 0.18]} castShadow receiveShadow>
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
        <meshStandardMaterial color="#0f172a" roughness={1} />
      </mesh>
    </group>
  );
}

function GiantTreasureChest() {
  const chestGlowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (chestGlowRef.current) {
      chestGlowRef.current.intensity = 1.2 + Math.sin(clock.getElapsedTime() * 3) * 0.4;
    }
  });

  return (
    <group position={[0.55, 0.36, 0.35]} rotation={[0, -0.5, 0]}>
      <pointLight ref={chestGlowRef} position={[0, 0.45, 0]} color="#fbbf24" intensity={1.2} distance={3.5} />
      {/* Chest Wooden Base */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
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
        <mesh position={[0, 0.08, 0.24]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.78, 8, 1, false, 0, Math.PI]} />
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

export const Ocean: React.FC = () => {
  const waterMeshRef = useRef<THREE.Mesh>(null);
  const foamRingRef = useRef<THREE.Mesh>(null);
  const tortugaJackpot = useGameStore((s) => s.tortugaJackpot);

  // Create subdivided geometry for dynamic wave ripples inside the lagoon & ocean
  const waterGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(42, 42, 44, 44);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const basePositions = useMemo(() => {
    const attr = waterGeo.attributes.position;
    return new Float32Array(attr.array);
  }, [waterGeo]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (waterMeshRef.current) {
      const posAttr = waterMeshRef.current.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const x = basePositions[i];
        const z = basePositions[i + 2];
        const wave1 = Math.sin(x * 0.65 + t * 1.8) * 0.065;
        const wave2 = Math.cos(z * 0.75 + t * 1.4) * 0.055;
        const ripple = Math.sin(Math.sqrt(x * x + z * z) * 1.2 - t * 2.2) * 0.035;
        arr[i + 1] = wave1 + wave2 + ripple;
      }
      posAttr.needsUpdate = true;
      waterMeshRef.current.geometry.computeVertexNormals();
    }

    if (foamRingRef.current) {
      const s = 1 + Math.sin(t * 2.1) * 0.035;
      foamRingRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group>
      {/* Dynamic Caribbean Turquoise Water Plane */}
      <mesh
        ref={waterMeshRef}
        geometry={waterGeo}
        position={[0, -0.18, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#0891b2"
          emissive="#0e7490"
          emissiveIntensity={0.22}
          roughness={0.22}
          metalness={0.15}
          flatShading
        />
      </mesh>

      {/* Deep Seabed Layer underneath */}
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#083344" roughness={0.9} />
      </mesh>

      {/* Central Lagoon Shallow Turquoise Glow Ring */}
      <mesh
        ref={foamRingRef}
        position={[0, -0.09, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[2.15, 2.55, 32]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={0.35}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Central Decorative Treasure Island */}
      <group position={[0, -0.08, 0]}>
        {/* Shallow Reef Base */}
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <cylinderGeometry args={[2.05, 2.35, 0.18, 16]} />
          <meshStandardMaterial color="#22d3ee" roughness={0.4} />
        </mesh>

        {/* Golden Sand Island Mound */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.55, 1.98, 0.36, 14]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.85} flatShading />
        </mesh>

        {/* Lush Grass Inner Plateau */}
        <mesh position={[-0.15, 0.42, -0.1]} castShadow receiveShadow>
          <cylinderGeometry args={[1.05, 1.35, 0.16, 12]} />
          <meshStandardMaterial color="#16a34a" roughness={0.8} flatShading />
        </mesh>

        {/* Skull Rock Formation */}
        <SkullRock />

        {/* Giant Overflowing Treasure Chest */}
        <GiantTreasureChest />

        {/* Low-Poly Caribbean Palm Trees */}
        <LowPolyPalmTree position={[0.85, 0.34, -0.65]} scale={0.95} lean={0.22} rotationY={0.6} />
        <LowPolyPalmTree position={[-0.95, 0.32, 0.65]} scale={0.85} lean={-0.2} rotationY={-0.8} />
        <LowPolyPalmTree position={[0.1, 0.44, -0.95]} scale={0.75} lean={0.18} rotationY={2.1} />

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
