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
 * using 3 separate passes (1: 3D Extrusion & Shadow, 2: Bevel Contour, 3: Golden-Brown Metallic Face)
 * so adjacent characters' shadows/strokes never overlap or clip each other's golden fill.
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
  const fontFamily = '"CinzelBold", "PirataOne", Georgia, serif';
  const chars = Array.from(text);
  if (chars.length === 0) return;

  // Adaptive letter spacing so long tile names stay large and legible
  const letterSpacing =
    variant === 'title'
      ? chars.length > 17
        ? 1.2
        : chars.length > 13
        ? 2.2
        : 3.5
      : 2.0;

  let fontSize = baseFontSize;

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
      variant === 'title' ? 52 : 36,
      Math.floor(fontSize * (maxArcLength / total))
    );
    ({ widths, total } = measureTotalWidth(fontSize));
  }

  colorCtx.font = `900 ${fontSize}px ${fontFamily}`;
  bumpCtx.font = `900 ${fontSize}px ${fontFamily}`;

  colorCtx.textAlign = 'center';
  colorCtx.textBaseline = 'middle';
  bumpCtx.textAlign = 'center';
  bumpCtx.textBaseline = 'middle';

  // Precompute each character's exact arc position & tangent angle
  const totalAngle = total / radius;
  let currentAlpha = totalAngle / 2;
  const placements: Array<{
    ch: string;
    px: number;
    py: number;
    angle: number;
  }> = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const w = widths[i];
    const charAlpha = currentAlpha - (w * 0.5) / radius;
    const px = cx - radius * Math.sin(charAlpha);
    const py = cy + radius * Math.cos(charAlpha);
    placements.push({ ch, px, py, angle: charAlpha });
    currentAlpha -= w / radius;
  }

  // PASS 1: 3D Extruded Roasted-Brown Block Depth & Drop Shadow (drawn behind all letters)
  const depthSteps = variant === 'title' ? 7 : 4;
  for (const { ch, px, py, angle } of placements) {
    colorCtx.save();
    colorCtx.translate(px, py);
    colorCtx.rotate(angle);
    colorCtx.lineJoin = 'round';
    colorCtx.miterLimit = 2;

    colorCtx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    colorCtx.shadowBlur = variant === 'title' ? 8 : 5;
    colorCtx.shadowOffsetX = 0;
    colorCtx.shadowOffsetY = variant === 'title' ? 6 : 4;

    for (let d = depthSteps; d >= 1; d--) {
      colorCtx.lineWidth = variant === 'title' ? 11 : 7;
      colorCtx.strokeStyle =
        d > 4 ? '#120501' : d > 2 ? '#290f02' : '#451a03';
      colorCtx.strokeText(ch, 0, d * 1.15);
    }
    colorCtx.restore();
  }

  // PASS 2: Sculpted Dark Umber & Warm Golden-Brown Bevel Contours (all letters)
  for (const { ch, px, py, angle } of placements) {
    colorCtx.save();
    colorCtx.translate(px, py);
    colorCtx.rotate(angle);
    colorCtx.lineJoin = 'round';
    colorCtx.miterLimit = 2;

    // Outer Dark Burnished Umber Bevel
    colorCtx.lineWidth = variant === 'title' ? 10 : 6.5;
    colorCtx.strokeStyle = '#230b01';
    colorCtx.strokeText(ch, 0, 0);

    // Mid Golden-Brown ("Brun Doré") Bronze Bevel
    colorCtx.lineWidth = variant === 'title' ? 5.0 : 3.2;
    colorCtx.strokeStyle = '#78350f';
    colorCtx.strokeText(ch, 0, -0.5);
    colorCtx.restore();
  }

  // PASS 3: Luminous Golden-Brown ("Brun Doré") Metallic Face & Top Specular Ridge (all letters)
  for (const { ch, px, py, angle } of placements) {
    colorCtx.save();
    colorCtx.translate(px, py);
    colorCtx.rotate(angle);
    colorCtx.lineJoin = 'round';
    colorCtx.miterLimit = 2;

    const grad = colorCtx.createLinearGradient(
      0,
      -fontSize * 0.52,
      0,
      fontSize * 0.48
    );
    if (variant === 'title') {
      grad.addColorStop(0.0, '#fef9c3'); // Bright sunlit gold crest
      grad.addColorStop(0.28, '#fde047'); // Warm imperial gold
      grad.addColorStop(0.58, '#d97706'); // Rich golden-amber
      grad.addColorStop(0.84, '#92400e'); // Sculpted golden-brown ("brun doré")
      grad.addColorStop(1.0, '#f59e0b'); // Reflected gold lower rim
    } else if (accentColor) {
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.48, accentColor);
      grad.addColorStop(1.0, '#d97706');
    } else {
      grad.addColorStop(0.0, '#fef9c3');
      grad.addColorStop(0.5, '#fde047');
      grad.addColorStop(1.0, '#b45309');
    }

    colorCtx.fillStyle = grad;
    colorCtx.fillText(ch, 0, -1);

    // Crisp Specular Highlight along the upper ridge
    colorCtx.lineWidth = variant === 'title' ? 1.5 : 1.0;
    colorCtx.strokeStyle = 'rgba(254, 249, 195, 0.9)';
    colorCtx.strokeText(ch, 0, -2.0);
    colorCtx.restore();

    // Matching 3D Height/Bump Map for Three.js Normal Lighting
    bumpCtx.save();
    bumpCtx.translate(px, py);
    bumpCtx.rotate(angle);
    bumpCtx.lineJoin = 'round';
    bumpCtx.lineWidth = variant === 'title' ? 11 : 7;
    bumpCtx.strokeStyle = '#909090';
    bumpCtx.strokeText(ch, 0, 1);
    bumpCtx.lineWidth = variant === 'title' ? 4.5 : 3;
    bumpCtx.strokeStyle = '#d8d8d8';
    bumpCtx.strokeText(ch, 0, 0);
    bumpCtx.fillStyle = '#ffffff';
    bumpCtx.fillText(ch, 0, -1);
    bumpCtx.restore();
  }
}

/**
 * Curved 3D Embossed Golden-Brown Rim Banner ("Arrondi suivant le bord de la case en texte brun doré en relief")
 * Positioned cleanly above the front rim of each island with zero clipping into terrain, props, or neighboring tiles.
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
        document.fonts.load('900 74px "CinzelBold"'),
        document.fonts.load('400 74px "PirataOne"'),
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
    const H = 384;

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

    // Gentle circular arc geometry that fills the 1024x384 canvas with zero edge clipping:
    // Center at (512, -810), radius = 1060, arcHalfSpan = 0.36 rad (~41.2° total curve)
    const cx = W / 2;
    const cy = -810;
    const bandRadius = 1060;
    const arcHalfSpan = 0.36;
    const startAngle = Math.PI / 2 - arcHalfSpan;
    const endAngle = Math.PI / 2 + arcHalfSpan;

    // 1. Curved Dark Espresso & Burnished Golden-Brown Plaque following the island rim
    ctx.save();
    ctx.lineCap = 'round';

    // Outer Dark Espresso Rim & Drop Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius, startAngle, endAngle);
    ctx.lineWidth = 188;
    ctx.strokeStyle = '#120501';
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Sculpted Golden-Brown ("Brun Doré") Metallic Frame
    const frameGrad = ctx.createLinearGradient(0, 75, 0, 355);
    frameGrad.addColorStop(0.0, isFocused ? '#fef08a' : '#fde047');
    frameGrad.addColorStop(0.32, '#d97706');
    frameGrad.addColorStop(0.68, '#78350f');
    frameGrad.addColorStop(1.0, '#f59e0b');

    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius, startAngle, endAngle);
    ctx.lineWidth = 172;
    ctx.strokeStyle = frameGrad;
    ctx.stroke();

    // Inner Recessed Dark Roasted Walnut Plaque (high contrast backdrop for golden-brown relief text)
    const innerGrad = ctx.createLinearGradient(0, 90, 0, 340);
    innerGrad.addColorStop(0.0, '#2a1004');
    innerGrad.addColorStop(0.5, '#170701');
    innerGrad.addColorStop(1.0, '#260e03');

    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius, startAngle, endAngle);
    ctx.lineWidth = 148;
    ctx.strokeStyle = innerGrad;
    ctx.stroke();

    // Property Color-Group Accent Ribbon along the upper inner curve
    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius - 68, startAngle + 0.015, endAngle - 0.015);
    ctx.lineWidth = 14;
    ctx.strokeStyle = isFocused ? '#fde047' : tile.color;
    ctx.stroke();

    // Subtle Golden Filigree Divider between Tile Name and Price/Rent
    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius + 18, startAngle + 0.03, endAngle - 0.03);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.stroke();

    // Left & Right 3D Embossed Golden-Brown Rivets
    for (const sign of [-1, 1]) {
      const rAlpha = sign * (arcHalfSpan - 0.012);
      const rx = cx - bandRadius * Math.sin(rAlpha);
      const ry = cy + bandRadius * Math.cos(rAlpha);
      const rivGrad = ctx.createRadialGradient(rx - 4, ry - 4, 2, rx, ry, 18);
      rivGrad.addColorStop(0.0, '#fef9c3');
      rivGrad.addColorStop(0.55, '#d97706');
      rivGrad.addColorStop(1.0, '#451a03');
      ctx.beginPath();
      ctx.arc(rx, ry, 16, 0, Math.PI * 2);
      ctx.fillStyle = rivGrad;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#140601';
      ctx.stroke();
    }
    ctx.restore();

    // Matching 3D Bump Map for the curved plaque
    bCtx.save();
    bCtx.lineCap = 'round';
    bCtx.beginPath();
    bCtx.arc(cx, cy, bandRadius, startAngle, endAngle);
    bCtx.lineWidth = 172;
    bCtx.strokeStyle = '#909090';
    bCtx.stroke();
    bCtx.beginPath();
    bCtx.arc(cx, cy, bandRadius, startAngle, endAngle);
    bCtx.lineWidth = 148;
    bCtx.strokeStyle = '#404040';
    bCtx.stroke();
    bCtx.restore();

    // 2. Prominent Curved Embossed Golden-Brown Tile Name ("Texte brun doré en relief")
    const fullTitle = `${tile.name.toUpperCase()}${levelStars}`;
    drawCurvedEmbossedText(
      ctx,
      bCtx,
      fullTitle,
      cx,
      cy,
      bandRadius - 18, // Main title arc radius = 1042
      isCorner ? 82 : 78,
      arcHalfSpan * 1.9,
      'title'
    );

    // 3. Curved Embossed Subtitle (Price / Rent / Bonus) along the lower concentric arc
    drawCurvedEmbossedText(
      ctx,
      bCtx,
      subtitleText.toUpperCase(),
      cx,
      cy,
      bandRadius + 48, // Subtitle arc radius = 1108
      48,
      arcHalfSpan * 1.8,
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

  // Compact width (< 1.65 tile spacing) and elevated front-rim placement so it never clips terrain or neighbors
  const planeW = isCorner ? 1.38 : 1.28;
  const planeH = planeW * (384 / 1024);

  return (
    <group
      position={[0, 0.31, baseRadius * 0.52]}
      rotation={[-Math.PI / 2 + 0.42, 0, 0]}
    >
      {/* Subtle 3D Dark Carved Wood Backing Plate (no text ghosting, no shadow map artifacts) */}
      <mesh position={[0, -0.008, -0.014]} renderOrder={9}>
        <planeGeometry args={[planeW, planeH]} />
        <meshStandardMaterial
          map={colorTexture}
          color="#1c0802"
          transparent
          alphaTest={0.25}
          roughness={0.85}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* Main High-Contrast Curved 3D Golden-Brown Relief Plaque */}
      <mesh position={[0, 0, 0]} renderOrder={10}>
        <planeGeometry args={[planeW, planeH]} />
        <meshStandardMaterial
          map={colorTexture}
          bumpMap={bumpTexture}
          bumpScale={0.065}
          transparent
          alphaTest={0.1}
          roughness={0.28}
          metalness={0.25}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
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
