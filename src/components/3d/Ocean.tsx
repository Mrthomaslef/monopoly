import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

/**
 * Peripheral Archipelago Island rendered with authentic Higgsfield Soul V2 artwork
 * and sculpted sandy/rocky shoreline bevels (zero ugly procedural primitives)
 */
function PeripheralTropicalIsland({
  position,
  scale = 1,
  variant = 'volcano',
}: {
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
  variant?: 'volcano' | 'mountain' | 'lagoon_arch' | 'temple';
}) {
  const artPath =
    variant === 'volcano'
      ? './assets/tile_volcan.jpg'
      : variant === 'temple'
      ? './assets/tile_temple.jpg'
      : variant === 'lagoon_arch'
      ? './assets/tile_lagon.jpg'
      : './assets/tile_falaise.jpg';

  const propPath =
    variant === 'volcano'
      ? './assets/prop_volcan.png'
      : variant === 'temple'
      ? './assets/prop_temple.png'
      : variant === 'lagoon_arch'
      ? './assets/prop_plage.png'
      : './assets/prop_falaise.png';

  const [artTex, propTex, sandTex, rockTex] = useTexture([
    artPath,
    propPath,
    './assets/sand_beach.jpg',
    './assets/coastal_rock.jpg',
  ]);

  const isRocky = variant === 'volcano' || variant === 'mountain';

  return (
    <group position={position} scale={scale}>
      {/* Sculpted 3D Shoreline Base */}
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.55, 3.15, 0.28, isRocky ? 12 : 28]} />
        <meshStandardMaterial
          map={isRocky ? rockTex : sandTex}
          bumpMap={isRocky ? rockTex : sandTex}
          bumpScale={0.04}
          color={isRocky ? '#94a3b8' : '#fde68a'}
          roughness={0.85}
        />
      </mesh>

      {/* Elevated 3D Island Mound with Higgsfield Artwork */}
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.2, 2.52, 0.14, 28]} />
        <meshStandardMaterial
          map={artTex}
          bumpMap={artTex}
          bumpScale={0.05}
          roughness={0.58}
        />
      </mesh>

      {/* Standing 3D Relief Prop from Higgsfield Soul V2 */}
      <group position={[0, 1.35, 0]} rotation={[-0.25, 0, 0]}>
        <mesh position={[0, 0, -0.06]} castShadow>
          <planeGeometry args={[2.7, 2.7]} />
          <meshStandardMaterial
            map={propTex}
            color="#475569"
            transparent
            alphaTest={0.18}
            roughness={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <planeGeometry args={[2.7, 2.7]} />
          <meshStandardMaterial
            map={propTex}
            bumpMap={propTex}
            bumpScale={0.03}
            transparent
            alphaTest={0.12}
            roughness={0.45}
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
    addIslandReef(vec2(-10.2, -9.8), 3.6, periphShallow, periphFoam);
    addIslandReef(vec2(10.5, -9.5),  3.4, periphShallow, periphFoam);
    addIslandReef(vec2(0.0, -11.5),  3.1, periphShallow, periphFoam);
    addIslandReef(vec2(-10.8, 0.5),  3.0, periphShallow, periphFoam);
    addIslandReef(vec2(10.8, 0.8),   3.0, periphShallow, periphFoam);
    addIslandReef(vec2(-9.8, 9.6),   2.9, periphShallow, periphFoam);
    addIslandReef(vec2(9.8, 9.6),    2.9, periphShallow, periphFoam);

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
    float totalShallow = clamp(shallowFactor + boardReefFactor * 0.85 + periphShallow * 0.85, 0.0, 1.0);

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

    // Animated circular white foam around each of the 24 tile islands
    float tileShore = abs(distToTile - tileRadius + sin(uTime * 2.4 + vWorldXZ.x * 3.5 + vWorldXZ.y * 3.5) * 0.06);
    float tileFoam = 1.0 - smoothstep(0.0, 0.17, tileShore);

    float foam = clamp(islandFoam + tileFoam * 0.85 + periphFoam * 0.85 + pow(crest, 2.5) * 0.35, 0.0, 1.0);
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
  const [compassTexture, sandTexture] = useTexture([
    './assets/compass_emblem.jpg',
    './assets/sand_beach.jpg',
  ]);

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

      {/* Central Decorative Treasure Island (Higgsfield Soul V2 Compass Emblem & Sand) */}
      <group position={[0, -0.08, 0]}>
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <cylinderGeometry args={[2.0, 2.32, 0.22, 28]} />
          <meshStandardMaterial
            map={sandTexture}
            color="#fde68a"
            roughness={0.85}
          />
        </mesh>

        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.65, 1.98, 0.28, 28]} />
          <meshStandardMaterial
            map={sandTexture}
            color="#fcd34d"
            roughness={0.8}
          />
        </mesh>

        <mesh
          position={[0, 0.37, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[1.62, 32]} />
          <meshStandardMaterial
            map={compassTexture}
            roughness={0.55}
            metalness={0.1}
          />
        </mesh>

        <group position={[0, 1.15, 0.9]}>
          <Text
            font="./assets/fonts/PirataOne-Regular.ttf"
            position={[0, 0.22, 0]}
            fontSize={0.28}
            color="#fef08a"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#451a03"
          >
            {`Coffre Central : ${tortugaJackpot} Or`}
          </Text>
          <Text
            font="./assets/fonts/Cinzel-Bold.ttf"
            position={[0, -0.04, 0]}
            fontSize={0.14}
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

      {/* SURROUNDING ARCHIPELAGO ON THE MAP BORDERS (Higgsfield Soul V2 Art) */}
      <PeripheralTropicalIsland
        position={[-10.2, -0.1, -9.8]}
        scale={1.15}
        variant="volcano"
      />
      <PeripheralTropicalIsland
        position={[10.5, -0.1, -9.5]}
        scale={1.1}
        variant="mountain"
      />
      <PeripheralTropicalIsland
        position={[0, -0.1, -11.5]}
        scale={0.98}
        variant="temple"
      />
      <PeripheralTropicalIsland
        position={[-10.8, -0.1, 0.5]}
        scale={0.95}
        variant="lagoon_arch"
      />
      <PeripheralTropicalIsland
        position={[10.8, -0.1, 0.8]}
        scale={0.95}
        variant="mountain"
      />
      <PeripheralTropicalIsland
        position={[-9.8, -0.1, 9.6]}
        scale={0.9}
        variant="lagoon_arch"
      />
      <PeripheralTropicalIsland
        position={[9.8, -0.1, 9.6]}
        scale={0.9}
        variant="temple"
      />
    </group>
  );
};
