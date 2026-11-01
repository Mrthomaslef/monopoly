import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

/**
 * Distant Horizon Island Backdrop rendered with authentic Higgsfield Soul V2 transparent PNGs
 * placed far out on the ocean horizon to give depth without cluttering the board.
 */
function DistantHorizonIsland({
  position,
  scale = 1,
  variant = 'volcano',
}: {
  position: [number, number, number];
  scale?: number;
  variant?: 'volcano' | 'arch' | 'fortress' | 'atoll';
}) {
  const pngPath =
    variant === 'volcano'
      ? './assets/horizon_island_volcano.png'
      : variant === 'arch'
      ? './assets/horizon_island_arch.png'
      : variant === 'fortress'
      ? './assets/horizon_island_fortress.png'
      : './assets/horizon_island_atoll.png';

  const [islandTex, sandTex] = useTexture([
    pngPath,
    './assets/sand_beach.jpg',
  ]);

  // Orient the horizon island backdrop so it faces toward the center of the board / camera
  const angleToCenter = useMemo(
    () => Math.atan2(-position[0], -position[2]),
    [position]
  );

  return (
    <group
      position={position}
      rotation={[0, angleToCenter, 0]}
      scale={scale}
    >
      {/* Subtle submerged sandbar / reef shelf at water level */}
      <mesh
        position={[0, -0.05, 0.2]}
        rotation={[-Math.PI / 2, 0, 0]}
         scale={[1.45, 0.55, 1]}
      >
        <circleGeometry args={[3.4, 24]} />
        <meshStandardMaterial
          map={sandTex}
          color="#fef08a"
          roughness={0.9}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Distant Horizon Island PNG Backdrop with subtle 3D depth layer */}
      <group position={[0, 2.05, 0]} rotation={[-0.12, 0, 0]}>
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[7.8, 4.85]} />
          <meshStandardMaterial
            map={islandTex}
            color="#334155"
            transparent
            alphaTest={0.14}
            roughness={0.75}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[7.8, 4.85]} />
          <meshStandardMaterial
            map={islandTex}
            bumpMap={islandTex}
            bumpScale={0.02}
            transparent
            alphaTest={0.1}
            roughness={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
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
    vWorldXZ = worldPosition.xz;

    float w1 = sin(vWorldXZ.x * 0.65 + uTime * 1.45) * 0.055;
    float w2 = cos(vWorldXZ.y * 0.72 + uTime * 1.2) * 0.055;
    float w3 = sin((vWorldXZ.x + vWorldXZ.y) * 1.15 - uTime * 1.85) * 0.03;
    float elev = w1 + w2 + w3;

    vec3 pos = position;
    pos.z += elev;
    vElevation = elev;

    float dx = 0.65 * 0.055 * cos(vWorldXZ.x * 0.65 + uTime * 1.45)
             + 1.15 * 0.03 * cos((vWorldXZ.x + vWorldXZ.y) * 1.15 - uTime * 1.85);
    float dz = -0.72 * 0.055 * sin(vWorldXZ.y * 0.72 + uTime * 1.2)
             + 1.15 * 0.03 * cos((vWorldXZ.x + vWorldXZ.y) * 1.15 - uTime * 1.85);
    vNormalDir = normalize(vec3(-dx, 1.0, -dz));

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
  }
`;

const CARIBBEAN_WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vWorldXZ;
  varying float vElevation;
  varying vec3 vNormalDir;

  float causticPattern(vec2 uv, float t) {
    vec2 p = uv * 1.85;
    float c1 = sin(p.x * 2.3 + t * 1.6 + cos(p.y * 2.1 - t * 1.2));
    float c2 = cos(p.y * 2.7 - t * 1.4 + sin(p.x * 2.4 + t * 1.5));
    float val = (c1 * c2) * 0.5 + 0.5;
    return pow(val, 4.0);
  }

  void addIslandReef(vec2 pos, float radius, inout float shallowAcc, inout float foamAcc) {
    float d = length(vWorldXZ - pos);
    shallowAcc += 1.0 - smoothstep(radius * 0.85, radius * 1.65, d);
    float shore = abs(d - radius + sin(uTime * 2.3 + vWorldXZ.x * 2.0 + vWorldXZ.y * 2.0) * 0.12);
    foamAcc += 1.0 - smoothstep(0.0, 0.26, shore);
  }

  void main() {
    float distCenter = length(vWorldXZ);

    vec3 shallowTurquoise = vec3(0.16, 0.88, 0.86);
    vec3 lagoonCyan       = vec3(0.05, 0.66, 0.82);
    vec3 deepAzure        = vec3(0.04, 0.36, 0.58);
    vec3 foamWhite        = vec3(0.95, 0.99, 1.00);
    vec3 sunGold          = vec3(1.00, 0.94, 0.72);

    float periphShallow = 0.0;
    float periphFoam = 0.0;
    addIslandReef(vec2(-15.5, -16.5), 4.2, periphShallow, periphFoam);
    addIslandReef(vec2(15.8, -16.2),  4.2, periphShallow, periphFoam);
    addIslandReef(vec2(-18.5, -3.5),  3.8, periphShallow, periphFoam);
    addIslandReef(vec2(18.5, -3.2),   3.8, periphShallow, periphFoam);

    // Nearest of the 24 archipelago tile islands on the 7x7 perimeter ring (spacing 1.65)
    vec2 gridIdx = clamp(floor(vWorldXZ / 1.65 + 0.5), -3.0, 3.0);
    vec2 tileGrid = (abs(vWorldXZ.x) > abs(vWorldXZ.y))
      ? vec2(sign(vWorldXZ.x) * 3.0, gridIdx.y)
      : vec2(gridIdx.x, sign(vWorldXZ.y) * 3.0);
    vec2 nearestTileCenter = tileGrid * 1.65;
    float distToTile = length(vWorldXZ - nearestTileCenter);
    float tileRadius = (abs(tileGrid.x) == 3.0 && abs(tileGrid.y) == 3.0) ? 0.88 : 0.78;

    float shallowFactor = 1.0 - smoothstep(1.8, 5.0, distCenter);
    float boardReefFactor = 1.0 - smoothstep(tileRadius * 0.72, tileRadius * 1.55, distToTile);
    float totalShallow = clamp(shallowFactor + boardReefFactor * 0.85 + periphShallow * 0.75, 0.0, 1.0);

    vec3 waterColor = mix(deepAzure, lagoonCyan, smoothstep(26.0, 6.0, distCenter));
    waterColor = mix(waterColor, shallowTurquoise, totalShallow);

    float caustics1 = causticPattern(vWorldXZ + vec2(uTime * 0.15, -uTime * 0.1), uTime);
    float caustics2 = causticPattern(vWorldXZ * 1.4 - vec2(uTime * 0.12, uTime * 0.18), -uTime * 0.8);
    float causticMask = (caustics1 + caustics2 * 0.7) * (0.35 + totalShallow * 0.55);
    waterColor += vec3(0.18, 0.42, 0.45) * causticMask;

    float crest = smoothstep(0.02, 0.09, vElevation);
    waterColor = mix(waterColor, shallowTurquoise * 1.15, crest * 0.45);

    float islandShore = abs(distCenter - 2.15 + sin(uTime * 2.5 + vWorldXZ.x * 3.0) * 0.08);
    float islandFoam = 1.0 - smoothstep(0.0, 0.22, islandShore);

    // Animated circular white foam around each of the 24 tile islands
    float tileShore = abs(distToTile - tileRadius + sin(uTime * 2.4 + vWorldXZ.x * 3.5 + vWorldXZ.y * 3.5) * 0.06);
    float tileFoam = 1.0 - smoothstep(0.0, 0.17, tileShore);

    float foam = clamp(islandFoam + tileFoam * 0.85 + periphFoam * 0.75 + pow(crest, 2.5) * 0.35, 0.0, 1.0);
    waterColor = mix(waterColor, foamWhite, foam);

    vec3 lightDir = normalize(vec3(0.5, 0.85, 0.55));
    float spec = pow(max(dot(vNormalDir, lightDir), 0.0), 48.0);
    waterColor += sunGold * spec * 0.55;

    gl_FragColor = vec4(waterColor, 1.0);
  }
`;

export const Ocean: React.FC = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const skullCaveRef = useRef<THREE.Group>(null);
  const torchGlowRef = useRef<THREE.Mesh>(null);
  const tortugaJackpot = useGameStore((s) => s.tortugaJackpot);
  const [compassTexture, sandTexture, rockTexture, skullCaveTexture] =
    useTexture([
      './assets/compass_emblem.jpg',
      './assets/sand_beach.jpg',
      './assets/coastal_rock.jpg',
      './assets/center_skull_cave.png',
    ]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = t;
    }
    if (skullCaveRef.current) {
      skullCaveRef.current.position.y = 1.28 + Math.sin(t * 1.8) * 0.015;
    }
    if (torchGlowRef.current) {
      const pulse = 1 + Math.sin(t * 4.2) * 0.08;
      torchGlowRef.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group>
      {/* Custom Shader Caribbean Ocean */}
      <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[76, 76, 112, 112]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={CARIBBEAN_WATER_VERTEX}
          fragmentShader={CARIBBEAN_WATER_FRAGMENT}
          uniforms={uniforms}
        />
      </mesh>

      {/* Central Decorative Treasure Island with 3D Higgsfield Skull Cave */}
      <group position={[0, -0.08, 0]}>
        {/* Outer Submerged Golden Sandbar */}
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <cylinderGeometry args={[2.08, 2.38, 0.22, 28]} />
          <meshStandardMaterial
            map={sandTexture}
            color="#fde68a"
            roughness={0.85}
          />
        </mesh>

        {/* Upper Sandy Beach Terrace */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.72, 2.04, 0.28, 28]} />
          <meshStandardMaterial
            map={sandTexture}
            color="#fcd34d"
            roughness={0.8}
          />
        </mesh>

        {/* Engraved Compass Rose Stone Plaza on the Beach */}
        <mesh
          position={[0, 0.37, 0.18]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[1.45, 32]} />
          <meshStandardMaterial
            map={compassTexture}
            roughness={0.55}
            metalness={0.1}
          />
        </mesh>

        {/* 3D Sculpted Rocky Crag Backing behind the Skull Cave */}
        <mesh
          position={[0, 0.72, -0.58]}
          rotation={[0.08, 0.4, 0]}
          castShadow
          receiveShadow
        >
          <coneGeometry args={[1.18, 1.35, 7]} />
          <meshStandardMaterial
            map={rockTexture}
            bumpMap={rockTexture}
            bumpScale={0.04}
            color="#64748b"
            roughness={0.88}
          />
        </mesh>
        <mesh
          position={[-0.68, 0.54, -0.45]}
          rotation={[0.1, -0.5, -0.12]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[0.52, 1]} />
          <meshStandardMaterial
            map={rockTexture}
            color="#475569"
            roughness={0.9}
          />
        </mesh>
        <mesh
          position={[0.68, 0.52, -0.45]}
          rotation={[0.1, 0.6, 0.12]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[0.5, 1]} />
          <meshStandardMaterial
            map={rockTexture}
            color="#475569"
            roughness={0.9}
          />
        </mesh>

        {/* Golden Treasure Glow at the Mouth of the Skull Cave */}
        <mesh
          ref={torchGlowRef}
          position={[0, 0.385, -0.1]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.92, 24]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.32} />
        </mesh>

        {/* 3D HIGGSFIELD SOUL V2 SKULL CAVE MONUMENT (Multi-Layered 3D Relief Extrusion) */}
        <group
          ref={skullCaveRef}
          position={[0, 1.28, -0.22]}
          rotation={[-0.22, 0, 0]}
        >
          {/* Deep stone shadow silhouette layer */}
          <mesh position={[0, 0, -0.1]} castShadow>
            <planeGeometry args={[2.35, 2.35]} />
            <meshStandardMaterial
              map={skullCaveTexture}
              color="#1e293b"
              transparent
              alphaTest={0.16}
              roughness={0.85}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Mid-depth carved rock extrusion layer */}
          <mesh position={[0, 0, -0.05]} castShadow>
            <planeGeometry args={[2.35, 2.35]} />
            <meshStandardMaterial
              map={skullCaveTexture}
              color="#64748b"
              transparent
              alphaTest={0.16}
              roughness={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Front high-relief Higgsfield 3D Skull Cave layer with bump mapping */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <planeGeometry args={[2.35, 2.35]} />
            <meshStandardMaterial
              map={skullCaveTexture}
              bumpMap={skullCaveTexture}
              bumpScale={0.045}
              transparent
              alphaTest={0.12}
              roughness={0.42}
              metalness={0.08}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* Central Jackpot Banner in front of the Skull Cave */}
        <group position={[0, 0.62, 1.05]} rotation={[-0.35, 0, 0]}>
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

      {/* FEWER, MORE DISTANT HORIZON ISLAND PNG BACKDROPS (Higgsfield Soul V2) */}
      <DistantHorizonIsland
        position={[-15.5, -0.1, -16.5]}
        scale={1.15}
        variant="volcano"
      />
      <DistantHorizonIsland
        position={[15.8, -0.1, -16.2]}
        scale={1.15}
        variant="fortress"
      />
      <DistantHorizonIsland
        position={[-18.5, -0.1, -3.5]}
        scale={1.0}
        variant="arch"
      />
      <DistantHorizonIsland
        position={[18.5, -0.1, -3.2]}
        scale={1.0}
        variant="atoll"
      />
    </group>
  );
};
