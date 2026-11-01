import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {
  TileData,
  Player,
  getTileTransform,
  calculateIslandRent,
} from '../../store/useGameStore';

interface TileProps {
  tile: TileData;
  allTiles: TileData[];
  owner: Player | null;
  isFocused: boolean;
  onSelectTile?: (tileId: number) => void;
}

export type TerrainTheme =
  | 'plage'
  | 'lagon'
  | 'falaise'
  | 'temple'
  | 'volcan'
  | 'eldorado'
  | 'port'
  | 'taverne'
  | 'tresor'
  | 'malediction';

const PIRATA_FONT_URL = './assets/fonts/PirataOne-Regular.ttf';
const CINZEL_FONT_URL = './assets/fonts/Cinzel-Bold.ttf';

const TERRAIN_TEXTURE_MAP: Record<TerrainTheme, string> = {
  plage: './assets/tile_plage.jpg',
  lagon: './assets/tile_lagon.jpg',
  falaise: './assets/tile_falaise.jpg',
  temple: './assets/tile_temple.jpg',
  volcan: './assets/tile_volcan.jpg',
  eldorado: './assets/tile_eldorado.jpg',
  port: './assets/tile_port.jpg',
  taverne: './assets/tile_taverne.jpg',
  tresor: './assets/tile_tresor.jpg',
  malediction: './assets/tile_malediction.jpg',
};

const PROP_TEXTURE_MAP: Record<TerrainTheme, string> = {
  plage: './assets/prop_plage.png',
  lagon: './assets/prop_lagon.png',
  falaise: './assets/prop_falaise.png',
  temple: './assets/prop_temple.png',
  volcan: './assets/prop_volcan.png',
  eldorado: './assets/prop_eldorado.png',
  port: './assets/prop_port.png',
  taverne: './assets/prop_taverne.png',
  tresor: './assets/prop_tresor.png',
  malediction: './assets/prop_malediction.png',
};

/**
 * Maps each of the 24 tiles to its dedicated Higgsfield Soul V2 terrain & 3D relief prop
 */
export function getTileTerrainTheme(tile: TileData): TerrainTheme {
  if (tile.id === 0 || tile.id === 4) return 'port';
  if (tile.id === 12) return 'taverne';
  if (tile.type === 'chest') return 'tresor';
  if (tile.type === 'curse' || tile.id === 18) return 'malediction';
  if (tile.id === 5 || tile.id === 9) return 'lagon';
  if (tile.id === 16) return 'volcan';
  if (tile.id === 13 || tile.id === 17) return 'temple';
  if (tile.id === 22 || tile.id === 23) return 'eldorado';
  if (tile.id === 6 || tile.id === 10 || tile.id === 19 || tile.id === 20) {
    return 'falaise';
  }
  return 'plage';
}

export const Tile: React.FC<TileProps> = ({
  tile,
  allTiles,
  owner,
  isFocused,
  onSelectTile,
}) => {
  const { position, rotationY, side } = getTileTransform(tile.id);
  const isCorner = side === 'corner';
  const foamRef = useRef<THREE.Mesh>(null);
  const propGroupRef = useRef<THREE.Group>(null);

  const theme = useMemo(() => getTileTerrainTheme(tile), [tile]);
  const isRockyShore =
    theme === 'falaise' || theme === 'volcan' || theme === 'malediction';
  const isMixedCove =
    theme === 'port' || theme === 'temple' || theme === 'eldorado';

  const [
    tileArtTexture,
    propTexture,
    sandTexture,
    rockTexture,
    woodTexture,
  ] = useTexture([
    TERRAIN_TEXTURE_MAP[theme],
    PROP_TEXTURE_MAP[theme],
    './assets/sand_beach.jpg',
    './assets/coastal_rock.jpg',
    './assets/wood_planks.jpg',
  ]);

  const currentRent =
    tile.type === 'island' ? calculateIslandRent(tile, allTiles) : 0;

  const islandSeedAngle = useMemo(
    () => (tile.id * 1.17) % (Math.PI * 2),
    [tile.id]
  );

  // Place the 3D scenery prop on the BACK-OUTER periphery of the island
  // so the center of the tile is 100% open for the ships and the red treasure map path!
  const propOffsetX = useMemo(() => {
    if (isCorner) return tile.id === 0 || tile.id === 18 ? 0.36 : -0.36;
    return tile.id % 2 === 0 ? -0.34 : 0.34;
  }, [isCorner, tile.id]);
  const propOffsetZ = isCorner ? -0.52 : -0.46;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (foamRef.current) {
      const s = 1 + Math.sin(t * 2.4 + tile.id * 0.7) * 0.04;
      foamRef.current.scale.set(s, s, 1);
    }
    if (propGroupRef.current) {
      propGroupRef.current.position.y =
        0.44 + Math.sin(t * 2.0 + tile.id * 0.9) * 0.014;
    }
  });

  const baseRadius = isCorner ? 0.88 : 0.78;
  const ribbonWidth = isCorner ? 1.5 : 1.4;
  const propSize = isCorner ? 0.78 : 0.68;

  const levelStars =
    tile.level >= 4
      ? ' ★ FORTERESSE'
      : tile.level > 0
      ? ` ${'★'.repeat(tile.level)}`
      : '';

  const subtitleText =
    tile.type === 'island'
      ? owner
        ? `Loyer ${currentRent} Or${levelStars}`
        : `${tile.price} Or`
      : tile.type === 'start'
      ? '+200 Or'
      : tile.type === 'jail'
      ? 'La Cale'
      : tile.type === 'free_parking'
      ? 'Jackpot !'
      : tile.type === 'go_to_jail'
      ? 'Kraken !'
      : tile.type === 'tax'
      ? '-120 Or'
      : tile.type === 'chest'
      ? 'Trésor'
      : 'Malédiction';

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelectTile?.(tile.id);
      }}
    >
      {/* 1. Animated Shoreline Sea-Foam Ring */}
      <mesh
        ref={foamRef}
        position={[0, -0.09, 0]}
        rotation={[-Math.PI / 2, 0, islandSeedAngle]}
      >
        <ringGeometry args={[baseRadius * 0.88, baseRadius * 1.12, 24]} />
        <meshStandardMaterial
          color={isFocused ? '#fde047' : '#e0f2fe'}
          emissive={isFocused ? '#f59e0b' : '#38bdf8'}
          emissiveIntensity={isFocused ? 0.95 : 0.45}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* 2. Sculpted 3D Coastal Shore Base (Varied Beach vs Rocky Cliff vs Cove) */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[0, islandSeedAngle, 0]}
        receiveShadow
        castShadow
      >
        <cylinderGeometry
          args={[
            baseRadius * 0.86,
            baseRadius * 1.04,
            0.22,
            isRockyShore ? 9 : 20,
          ]}
        />
        <meshStandardMaterial
          map={isRockyShore ? rockTexture : sandTexture}
          bumpMap={isRockyShore ? rockTexture : sandTexture}
          bumpScale={0.03}
          color={isRockyShore ? '#94a3b8' : '#fde68a'}
          roughness={0.82}
        />
      </mesh>

      {/* Ownership Glowing Ring around the Island Perimeter */}
      {owner && (
        <mesh position={[0, 0.135, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseRadius * 0.84, baseRadius * 0.93, 24]} />
          <meshStandardMaterial
            color={owner.color}
            emissive={owner.color}
            emissiveIntensity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 3. Viewer-Aligned Island Surface, Off-Center Coastal Relief Prop & Border Ribbon */}
      <group rotation={[0, -rotationY, 0]}>
        {/* Open Central Island Terrace for Ship Circulation & Red Treasure Trail */}
        <mesh position={[0, 0.125, -0.02]} receiveShadow castShadow>
          <cylinderGeometry
            args={[baseRadius * 0.76, baseRadius * 0.86, 0.07, 28]}
          />
          <meshStandardMaterial
            map={tileArtTexture}
            bumpMap={tileArtTexture}
            bumpScale={0.035}
            roughness={0.62}
          />
        </mesh>

        {/* Off-Center Coastal Outcrop Lobe on the Back Rim supporting the 3D Landmark */}
        <mesh
          position={[propOffsetX, 0.09, propOffsetZ]}
          receiveShadow
          castShadow
        >
          <cylinderGeometry
            args={[
              baseRadius * 0.36,
              baseRadius * 0.48,
              0.22,
              isRockyShore || isMixedCove ? 8 : 16,
            ]}
          />
          <meshStandardMaterial
            map={isRockyShore || isMixedCove ? rockTexture : sandTexture}
            bumpMap={isRockyShore || isMixedCove ? rockTexture : sandTexture}
            bumpScale={0.035}
            color={isRockyShore || isMixedCove ? '#cbd5e1' : '#fef08a'}
            roughness={0.82}
          />
        </mesh>

        {/* Ground Contact Shadow under the Off-Center 3D Prop */}
        <mesh
          position={[propOffsetX, 0.205, propOffsetZ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[propSize * 0.38, 18]} />
          <meshBasicMaterial color="#020617" transparent opacity={0.32} />
        </mesh>

        {/* OFF-CENTER STANDING 3D RELIEF PROP GENERATED BY HIGGSFIELD SOUL V2 */}
        <group
          ref={propGroupRef}
          position={[propOffsetX, 0.44, propOffsetZ]}
          rotation={[-0.26, 0, 0]}
        >
          <mesh position={[0, 0, -0.03]} castShadow>
            <planeGeometry args={[propSize, propSize]} />
            <meshStandardMaterial
              map={propTexture}
              color="#475569"
              transparent
              alphaTest={0.18}
              roughness={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, -0.015]}>
            <planeGeometry args={[propSize, propSize]} />
            <meshStandardMaterial
              map={propTexture}
              color="#94a3b8"
              transparent
              alphaTest={0.18}
              roughness={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, 0]} castShadow>
            <planeGeometry args={[propSize, propSize]} />
            <meshStandardMaterial
              map={propTexture}
              bumpMap={propTexture}
              bumpScale={0.025}
              transparent
              alphaTest={0.12}
              roughness={0.42}
              metalness={0.06}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* 4. STYLIZED DRIFTWOOD & PARCHMENT COASTAL RIM BANNER ("EN BORD DE CASE") */}
        <group
          position={[0, 0.145, baseRadius * 0.72]}
          rotation={[-Math.PI / 2 + 0.34, 0, 0]}
        >
          {/* Thin Color-Group Crest Trim along the Top Edge of the Border */}
          <mesh position={[0, 0.165, -0.005]} castShadow>
            <boxGeometry args={[ribbonWidth, 0.05, 0.03]} />
            <meshStandardMaterial
              color={isFocused ? '#fde047' : tile.color}
              emissive={isFocused ? '#f59e0b' : tile.color}
              emissiveIntensity={isFocused ? 0.85 : 0.45}
              roughness={0.35}
            />
          </mesh>

          {/* Sculpted Weathered Driftwood Plank along the Tile Edge */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[ribbonWidth, 0.29, 0.032]} />
            <meshStandardMaterial
              map={woodTexture}
              color="#78350f"
              roughness={0.78}
            />
          </mesh>

          {/* Recessed Warm Parchment Scroll Strip inside the Driftwood Border */}
          <mesh position={[0, 0.03, 0.018]}>
            <planeGeometry args={[ribbonWidth - 0.08, 0.18]} />
            <meshStandardMaterial color="#fef3c7" roughness={0.65} />
          </mesh>

          {/* Left & Right Brass Corner Rivets on the Driftwood Border */}
          {[-ribbonWidth * 0.45, ribbonWidth * 0.45].map((xPos, idx) => (
            <mesh key={idx} position={[xPos, 0.03, 0.022]}>
              <sphereGeometry args={[0.024, 8, 8]} />
              <meshStandardMaterial
                color="#fbbf24"
                metalness={0.85}
                roughness={0.2}
              />
            </mesh>
          ))}

          {/* Stylized Calligraphic Pirate Font (Pirata One) for the Tile Name */}
          <Text
            font={PIRATA_FONT_URL}
            position={[0, 0.032, 0.024]}
            fontSize={isCorner ? 0.16 : 0.15}
            maxWidth={ribbonWidth - 0.14}
            lineHeight={0.95}
            textAlign="center"
            color="#271206"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.008}
            outlineColor="#fef3c7"
          >
            {tile.name}
          </Text>

          {/* Engraved Nautical Capitals (Cinzel Bold) on the Lower Mahogany Rim for #ID & Price */}
          <Text
            font={CINZEL_FONT_URL}
            position={[0, -0.1, 0.024]}
            fontSize={0.11}
            color={owner ? '#4ade80' : '#fde047'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.018}
            outlineColor="#1c0d04"
          >
            {`#${tile.id}  •  ${subtitleText}`}
          </Text>
        </group>
      </group>
    </group>
  );
};
