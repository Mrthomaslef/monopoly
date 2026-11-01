import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
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

const TERRAIN_TEXTURE_MAP: Record<TerrainTheme, string> = {
  plage: './assets/tile_plage.jpg?v=terrain2',
  lagon: './assets/tile_lagon.jpg?v=terrain2',
  falaise: './assets/tile_falaise.jpg?v=terrain2',
  temple: './assets/tile_temple.jpg?v=terrain2',
  volcan: './assets/tile_volcan.jpg?v=terrain2',
  eldorado: './assets/tile_eldorado.jpg?v=terrain2',
  port: './assets/tile_port.jpg?v=terrain2',
  taverne: './assets/tile_taverne.jpg?v=terrain2',
  tresor: './assets/tile_tresor.jpg?v=terrain2',
  malediction: './assets/tile_malediction.jpg?v=terrain2',
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

/**
 * Draws text character-by-character along a bottom circular arc centered at (cx, cy)
 * with multi-layered 3D embossed golden-brown ("texte brun doré en relief") styling.
 */
function drawCurvedEmbossedText(
  colorCtx: CanvasRenderingContext2D,
  bumpCtx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  baseFontSize: number,
  maxArcSpanRad: number,
  variant: 'title' | 'subtitle',
  accentColor?: string
) {
  const fontFamily =
    variant === 'title'
      ? '"CinzelBold", "PirataOne", Georgia, serif'
      : '"CinzelBold", Georgia, serif';

  let fontSize = baseFontSize;
  const letterSpacing = variant === 'title' ? 4.5 : 3.0;

  colorCtx.font = `900 ${fontSize}px ${fontFamily}`;
  const chars = Array.from(text);

  const measureTotalWidth = (
    fSize: number
  ): { widths: number[]; total: number } => {
    colorCtx.font = `900 ${fSize}px ${fontFamily}`;
    const widths = chars.map(
      (ch) => colorCtx.measureText(ch).width + letterSpacing
    );
    const total = widths.reduce((acc, w) => acc + w, 0);
    return { widths, total };
  };

  let { widths, total } = measureTotalWidth(fontSize);
  const maxArcLength = radius * maxArcSpanRad;
  if (total > maxArcLength && total > 0) {
    fontSize = Math.max(
      variant === 'title' ? 40 : 28,
      Math.floor(fontSize * (maxArcLength / total))
    );
    ({ widths, total } = measureTotalWidth(fontSize));
  }

  bumpCtx.font = `900 ${fontSize}px ${fontFamily}`;

  const totalAngle = total / radius;
  let currentAlpha = totalAngle / 2;

  colorCtx.textAlign = 'center';
  colorCtx.textBaseline = 'middle';
  bumpCtx.textAlign = 'center';
  bumpCtx.textBaseline = 'middle';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const w = widths[i];
    const charAlpha = currentAlpha - (w * 0.5) / radius;

    const px = cx - radius * Math.sin(charAlpha);
    const py = cy + radius * Math.cos(charAlpha);

    // 1. Render on Color Canvas with deep 3D Golden-Brown Relief ("Brun Doré en Relief")
    colorCtx.save();
    colorCtx.translate(px, py);
    colorCtx.rotate(charAlpha);

    // Cast shadow onto the dark carved wooden plaque
    colorCtx.shadowColor = 'rgba(0, 0, 0, 0.92)';
    colorCtx.shadowBlur = variant === 'title' ? 9 : 6;
    colorCtx.shadowOffsetX = 0;
    colorCtx.shadowOffsetY = variant === 'title' ? 7 : 5;

    // 3D Extruded Roasted-Brown & Bronze Block Depth Stack
    const depthSteps = variant === 'title' ? 7 : 4;
    for (let d = depthSteps; d >= 1; d--) {
      colorCtx.lineJoin = 'round';
      colorCtx.miterLimit = 2;
      colorCtx.lineWidth = variant === 'title' ? 11 : 7;
      colorCtx.strokeStyle =
        d > 4 ? '#160701' : d > 2 ? '#2e1103' : '#4a1d06';
      colorCtx.strokeText(ch, 0, d * 1.15);
    }

    colorCtx.shadowColor = 'transparent';
    colorCtx.shadowBlur = 0;
    colorCtx.shadowOffsetY = 0;

    // Outer Dark Burnished Umber Bevel Contour
    colorCtx.lineWidth = variant === 'title' ? 11 : 7.5;
    colorCtx.strokeStyle = '#290f02';
    colorCtx.strokeText(ch, 0, 0);

    // Warm Golden-Brown Mid-Bevel Rim
    colorCtx.lineWidth = variant === 'title' ? 5.5 : 3.8;
    colorCtx.strokeStyle = '#78350f';
    colorCtx.strokeText(ch, 0, -0.5);

    // Main Sculpted Golden-Brown ("Brun Doré") Metallic Gradient Fill
    const grad = colorCtx.createLinearGradient(
      0,
      -fontSize * 0.54,
      0,
      fontSize * 0.48
    );
    if (variant === 'title') {
      grad.addColorStop(0.0, '#fef9c3'); // Sunlit gold crest
      grad.addColorStop(0.24, '#fbbf24'); // Warm imperial gold
      grad.addColorStop(0.52, '#b45309'); // Rich golden-brown ("brun doré")
      grad.addColorStop(0.78, '#78350f'); // Deep burnished brown-gold core
      grad.addColorStop(1.0, '#f59e0b'); // Reflected gold bottom bevel
    } else if (accentColor) {
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.45, accentColor);
      grad.addColorStop(1.0, '#b45309');
    } else {
      grad.addColorStop(0.0, '#fef9c3');
      grad.addColorStop(0.45, '#fde047');
      grad.addColorStop(0.85, '#b45309');
      grad.addColorStop(1.0, '#78350f');
    }

    colorCtx.fillStyle = grad;
    colorCtx.fillText(ch, 0, -1);

    // Chiseled Specular Highlight along the top ridge of the letter
    colorCtx.lineWidth = variant === 'title' ? 1.8 : 1.2;
    colorCtx.strokeStyle = 'rgba(254, 249, 195, 0.85)';
    colorCtx.strokeText(ch, 0, -2.2);

    colorCtx.restore();

    // 2. Render matching 3D Height/Bump Map for Three.js Normal Lighting
    bumpCtx.save();
    bumpCtx.translate(px, py);
    bumpCtx.rotate(charAlpha);
    bumpCtx.lineJoin = 'round';
    bumpCtx.lineWidth = variant === 'title' ? 12 : 8;
    bumpCtx.strokeStyle = '#999999';
    bumpCtx.strokeText(ch, 0, 1);
    bumpCtx.lineWidth = variant === 'title' ? 5 : 3;
    bumpCtx.strokeStyle = '#dddddd';
    bumpCtx.strokeText(ch, 0, 0);
    bumpCtx.fillStyle = '#ffffff';
    bumpCtx.fillText(ch, 0, -1);
    bumpCtx.restore();

    currentAlpha -= w / radius;
  }
}

/**
 * Curved 3D Embossed Golden-Brown Rim Banner ("Arrondi suivant le bord de la case en texte brun doré en relief")
 */
const CurvedGoldenReliefBanner: React.FC<{
  tile: TileData;
  subtitleText: string;
  levelStars: string;
  ownerColor: string | null;
  isFocused: boolean;
  isCorner: boolean;
  baseRadius: number;
}> = ({
  tile,
  subtitleText,
  levelStars,
  ownerColor,
  isFocused,
  isCorner,
  baseRadius,
}) => {
  const [fontsLoadedTick, setFontsLoadedTick] = useState(0);

  useEffect(() => {
    let active = true;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      Promise.all([
        document.fonts.load('900 68px "CinzelBold"'),
        document.fonts.load('400 68px "PirataOne"'),
      ])
        .then(() => {
          if (active) setFontsLoadedTick((t) => t + 1);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  const { colorTexture, bumpTexture } = useMemo(() => {
    const W = 1024;
    const H = 560;

    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = W;
    colorCanvas.height = H;
    const ctx = colorCanvas.getContext('2d')!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = W;
    bumpCanvas.height = H;
    const bCtx = bumpCanvas.getContext('2d')!;

    ctx.clearRect(0, 0, W, H);
    bCtx.clearRect(0, 0, W, H);

    // Center of curvature matching the circular island tile
    const cx = W / 2;
    const cy = 44;
    const bandRadius = 402;
    const arcHalfSpan = 0.78; // ~44.7° on each side -> 89.4° curved arc hugging the tile rim
    const startAngle = Math.PI / 2 - arcHalfSpan;
    const endAngle = Math.PI / 2 + arcHalfSpan;

    // 1. Curved Dark Espresso & Burnished Golden-Brown Plaque following the circular tile edge
    ctx.save();
    ctx.lineCap = 'round';

    // Deep drop shadow under the curved rim plaque
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius, startAngle, endAngle);
    ctx.lineWidth = 148;
    ctx.strokeStyle = '#140601';
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Burnished Golden-Brown ("Brun Doré") Outer Bevel Frame along the curve
    const frameGrad = ctx.createLinearGradient(0, 260, 0, 520);
    frameGrad.addColorStop(0.0, isFocused ? '#fde047' : '#fbbf24');
    frameGrad.addColorStop(0.35, '#b45309');
    frameGrad.addColorStop(0.7, '#78350f');
    frameGrad.addColorStop(1.0, '#d97706');

    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius, startAngle, endAngle);
    ctx.lineWidth = 136;
    ctx.strokeStyle = frameGrad;
    ctx.stroke();

    // Inner Recessed Dark Roasted Walnut & Leather Channel (high contrast for golden-brown text)
    const innerGrad = ctx.createLinearGradient(0, 275, 0, 510);
    innerGrad.addColorStop(0.0, '#2e1205');
    innerGrad.addColorStop(0.5, '#1c0a02');
    innerGrad.addColorStop(1.0, '#2b1003');

    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius, startAngle, endAngle);
    ctx.lineWidth = 116;
    ctx.strokeStyle = innerGrad;
    ctx.stroke();

    // Curved Color-Group Accent Ribbon along the inner edge of the arc
    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius - 56, startAngle + 0.03, endAngle - 0.03);
    ctx.lineWidth = 12;
    ctx.strokeStyle = isFocused ? '#fde047' : tile.color;
    ctx.stroke();

    // Fine Golden Filigree Divider between Title Arc and Price/ID Arc
    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius + 14, startAngle + 0.06, endAngle - 0.06);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.55)';
    ctx.stroke();

    // Left & Right 3D Embossed Golden-Brown Rivets at the ends of the curved plaque
    for (const sign of [-1, 1]) {
      const rAlpha = sign * (arcHalfSpan - 0.02);
      const rx = cx - bandRadius * Math.sin(rAlpha);
      const ry = cy + bandRadius * Math.cos(rAlpha);
      const rivGrad = ctx.createRadialGradient(rx - 4, ry - 4, 2, rx, ry, 16);
      rivGrad.addColorStop(0.0, '#fef9c3');
      rivGrad.addColorStop(0.55, '#d97706');
      rivGrad.addColorStop(1.0, '#451a03');
      ctx.beginPath();
      ctx.arc(rx, ry, 15, 0, Math.PI * 2);
      ctx.fillStyle = rivGrad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1c0a02';
      ctx.stroke();
    }
    ctx.restore();

    // Bump map base for the curved plaque
    bCtx.save();
    bCtx.lineCap = 'round';
    bCtx.beginPath();
    bCtx.arc(cx, cy, bandRadius, startAngle, endAngle);
    bCtx.lineWidth = 136;
    bCtx.strokeStyle = '#888888';
    bCtx.stroke();
    bCtx.beginPath();
    bCtx.arc(cx, cy, bandRadius, startAngle, endAngle);
    bCtx.lineWidth = 116;
    bCtx.strokeStyle = '#444444';
    bCtx.stroke();
    bCtx.restore();

    // 2. Curved Embossed Golden-Brown Tile Name ("Texte brun doré en relief")
    const fullTitle = `${tile.name.toUpperCase()}${levelStars}`;
    drawCurvedEmbossedText(
      ctx,
      bCtx,
      fullTitle,
      cx,
      cy,
      bandRadius - 14, // Title arc radius = 388
      isCorner ? 64 : 60,
      arcHalfSpan * 1.86,
      'title'
    );

    // 3. Curved Embossed Subtitle (#ID • Price / Rent) along the outer concentric arc
    drawCurvedEmbossedText(
      ctx,
      bCtx,
      `#${tile.id} • ${subtitleText.toUpperCase()}`,
      cx,
      cy,
      bandRadius + 40, // Outer subtitle arc radius = 442
      36,
      arcHalfSpan * 1.72,
      'subtitle',
      ownerColor ? '#4ade80' : '#fde047'
    );

    const cTex = new THREE.CanvasTexture(colorCanvas);
    cTex.colorSpace = THREE.SRGBColorSpace;
    cTex.anisotropy = 8;
    cTex.needsUpdate = true;

    const bTex = new THREE.CanvasTexture(bumpCanvas);
    bTex.anisotropy = 4;
    bTex.needsUpdate = true;

    return { colorTexture: cTex, bumpTexture: bTex };
  }, [
    tile.id,
    tile.name,
    tile.color,
    subtitleText,
    levelStars,
    ownerColor,
    isFocused,
    isCorner,
    fontsLoadedTick,
  ]);

  const planeW = baseRadius * 2.28;
  const planeH = planeW * (560 / 1024);

  return (
    <group
      position={[0, 0.21, baseRadius * 0.24]}
      rotation={[-Math.PI / 2 + 0.28, 0, 0]}
    >
      {/* 4 Stacked 3D Relief Layers for true volumetric depth on the curved plaque & letters */}
      <mesh position={[0, 0, -0.036]} castShadow>
        <planeGeometry args={[planeW, planeH]} />
        <meshStandardMaterial
          map={colorTexture}
          color="#1c0a02"
          transparent
          alphaTest={0.12}
          roughness={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -0.024]} castShadow>
        <planeGeometry args={[planeW, planeH]} />
        <meshStandardMaterial
          map={colorTexture}
          color="#451a03"
          transparent
          alphaTest={0.12}
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -0.012]} castShadow>
        <planeGeometry args={[planeW, planeH]} />
        <meshStandardMaterial
          map={colorTexture}
          color="#92400e"
          transparent
          alphaTest={0.12}
          roughness={0.5}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[planeW, planeH]} />
        <meshStandardMaterial
          map={colorTexture}
          bumpMap={bumpTexture}
          bumpScale={0.055}
          transparent
          alphaTest={0.08}
          roughness={0.32}
          metalness={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

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

  const [tileArtTexture, propTexture, sandTexture, rockTexture] = useTexture([
    TERRAIN_TEXTURE_MAP[theme],
    PROP_TEXTURE_MAP[theme],
    './assets/sand_beach.jpg',
    './assets/coastal_rock.jpg',
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
  const propSize = isCorner ? 0.78 : 0.68;

  const levelStars =
    tile.level >= 4
      ? ' ★4'
      : tile.level > 0
      ? ` ${'★'.repeat(tile.level)}`
      : '';

  const subtitleText =
    tile.type === 'island'
      ? owner
        ? `Loyer ${currentRent} Or${levelStars}`
        : `${tile.price} Or`
      : tile.type === 'start'
      ? '+200 Or & +1 🪵'
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

      {/* 3. Viewer-Aligned Island Surface, Off-Center Coastal Relief Prop & Curved Golden-Brown Relief Title */}
      <group rotation={[0, -rotationY, 0]}>
        {/* Open Central Island Terrace for Ship Circulation & Red Treasure Trail */}
        <mesh position={[0, 0.125, -0.02]} receiveShadow castShadow>
          <cylinderGeometry
            args={[baseRadius * 0.8, baseRadius * 0.89, 0.07, 28]}
          />
          <meshStandardMaterial
            map={tileArtTexture}
            bumpMap={tileArtTexture}
            bumpScale={0.035}
            roughness={0.68}
          />
        </mesh>

        {/* Off-Center Elevated Coastal Mound under the 3D Landmark */}
        <mesh
          position={[propOffsetX, 0.175, propOffsetZ]}
          rotation={[0, islandSeedAngle, 0]}
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
            map={tileArtTexture}
            bumpMap={tileArtTexture}
            bumpScale={0.035}
            roughness={0.75}
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

        {/* 4. CURVED GOLDEN-BROWN 3D RELIEF BANNER HUGGING THE ROUNDED TILE EDGE */}
        <CurvedGoldenReliefBanner
          tile={tile}
          subtitleText={subtitleText}
          levelStars={levelStars}
          ownerColor={owner?.color ?? null}
          isFocused={isFocused}
          isCorner={isCorner}
          baseRadius={baseRadius}
        />
      </group>
    </group>
  );
};
