import React, { useMemo, useEffect, useState } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {
  TileData,
  Player,
  getTileTransform,
} from '../../store/useGameStore';

interface TileProps {
  tile: TileData;
  currentRent: number;
  owner: Player | null;
  isFocused: boolean;
  isFortifyCandidate?: boolean;
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
  plage: './assets/tile_plage.jpg?v=terrain3',
  lagon: './assets/tile_lagon.jpg?v=terrain3',
  falaise: './assets/tile_falaise.jpg?v=terrain3',
  temple: './assets/tile_temple.jpg?v=terrain3',
  volcan: './assets/tile_volcan.jpg?v=terrain3',
  eldorado: './assets/tile_eldorado.jpg?v=terrain3',
  port: './assets/tile_port.jpg?v=terrain3',
  taverne: './assets/tile_taverne.jpg?v=terrain3',
  tresor: './assets/tile_tresor.jpg?v=terrain3',
  malediction: './assets/tile_malediction.jpg?v=terrain3',
};

const LANDMARK_MODEL_MAP: Record<TerrainTheme, string> = {
  plage: './assets/models/tile_plage.glb',
  lagon: './assets/models/tile_lagon.glb',
  falaise: './assets/models/tile_falaise.glb',
  temple: './assets/models/tile_temple.glb',
  volcan: './assets/models/tile_volcan.glb',
  eldorado: './assets/models/tile_eldorado.glb',
  port: './assets/models/tile_port.glb',
  taverne: './assets/models/tile_taverne.glb',
  tresor: './assets/models/tile_tresor.glb',
  malediction: './assets/models/tile_malediction.glb',
};

Object.values(LANDMARK_MODEL_MAP).forEach((url) => useGLTF.preload(url));

const noRaycast = () => {};

/**
 * Textured 3D landmark of a tile, fitted to a width/height budget and resting on the ground at y = 0.
 * Clones share geometry and materials, so the 24 tiles only cost one GPU copy per theme.
 * Raycasting is off: clicks fall through to the terrace, and pointer moves don't test thousands of triangles per tile.
 */
const TileLandmark: React.FC<{
  theme: TerrainTheme;
  maxWidth: number;
  maxHeight: number;
}> = React.memo(({ theme, maxWidth, maxHeight }) => {
  const { scene } = useGLTF(LANDMARK_MODEL_MAP[theme]);

  const { model, scale, offset } = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      child.raycast = noRaycast;
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return {
      model: clone,
      scale: Math.min(maxWidth / Math.max(size.x, size.z), maxHeight / size.y),
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, maxWidth, maxHeight]);

  return (
    <group scale={scale}>
      <primitive object={model} position={offset} />
    </group>
  );
});

// Persistent cache of generated curved banner textures so moving the ship NEVER recreates canvases or uploads textures
const BANNER_TEXTURE_CACHE = new Map<
  string,
  { colorTexture: THREE.CanvasTexture; bumpTexture: THREE.CanvasTexture }
>();

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
  const depthSteps = variant === 'title' ? 6 : 3;
  for (const { ch, px, py, angle } of placements) {
    colorCtx.save();
    colorCtx.translate(px, py);
    colorCtx.rotate(angle);
    colorCtx.lineJoin = 'round';
    colorCtx.miterLimit = 2;
    colorCtx.lineWidth = variant === 'title' ? 11 : 7;

    for (let d = depthSteps; d >= 1; d--) {
      if (d === depthSteps) {
        colorCtx.shadowColor = 'rgba(0, 0, 0, 0.92)';
        colorCtx.shadowBlur = variant === 'title' ? 6 : 4;
        colorCtx.shadowOffsetX = 0;
        colorCtx.shadowOffsetY = variant === 'title' ? 5 : 3;
      } else {
        colorCtx.shadowColor = 'transparent';
        colorCtx.shadowBlur = 0;
        colorCtx.shadowOffsetY = 0;
      }
      colorCtx.strokeStyle =
        d > 4 ? '#120501' : d > 2 ? '#290f02' : '#451a03';
      colorCtx.strokeText(ch, 0, d * 1.2);
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

// Single global font readiness listener so we don't attach 24 separate Promise listeners
let globalFontsReady = false;
const fontListeners = new Set<() => void>();
if (typeof document !== 'undefined' && 'fonts' in document) {
  Promise.all([
    document.fonts.load('900 74px "CinzelBold"'),
    document.fonts.load('400 74px "PirataOne"'),
  ])
    .then(() => {
      globalFontsReady = true;
      fontListeners.forEach((fn) => fn());
      fontListeners.clear();
    })
    .catch(() => {});
}

/**
 * Curved 3D Embossed Golden-Brown Rim Banner ("Arrondi suivant le bord de la case en texte brun doré en relief")
 * Positioned cleanly above the front rim of each island with zero clipping into terrain, props, or neighboring tiles.
 * Cached by content key so ship movement (isFocused changes) NEVER regenerates canvases or re-uploads GPU textures.
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
  const [fontsLoadedTick, setFontsLoadedTick] = useState(
    globalFontsReady ? 1 : 0
  );

  useEffect(() => {
    if (globalFontsReady) {
      setFontsLoadedTick(1);
      return;
    }
    const listener = () => setFontsLoadedTick(1);
    fontListeners.add(listener);
    return () => {
      fontListeners.delete(listener);
    };
  }, []);

  // Notice: `isFocused` is intentionally NOT in this dependency array!
  // Focus highlighting is done via zero-cost Three.js material emissive props below.
  const { colorTexture, bumpTexture } = useMemo(() => {
    const cacheKey = `${tile.id}|${tile.name}|${tile.color}|${subtitleText}|${levelStars}|${ownerColor ?? ''}|${isCorner ? 1 : 0}|${fontsLoadedTick}`;
    const cached = BANNER_TEXTURE_CACHE.get(cacheKey);
    if (cached) {
      return cached;
    }

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

    // 1. Sleek Single-Line Curved Dark Espresso & Burnished Golden-Brown Plaque
    ctx.save();
    ctx.lineCap = 'round';

    // Outer Dark Espresso Rim & Drop Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius, startAngle, endAngle);
    ctx.lineWidth = 142;
    ctx.strokeStyle = '#120501';
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Sculpted Golden-Brown ("Brun Doré") Metallic Frame (tinted with owner's color when owned!)
    const frameGrad = ctx.createLinearGradient(0, 95, 0, 325);
    if (ownerColor) {
      frameGrad.addColorStop(0.0, '#fef08a');
      frameGrad.addColorStop(0.35, ownerColor);
      frameGrad.addColorStop(0.75, '#78350f');
      frameGrad.addColorStop(1.0, ownerColor);
    } else {
      frameGrad.addColorStop(0.0, '#fde047');
      frameGrad.addColorStop(0.32, '#d97706');
      frameGrad.addColorStop(0.68, '#78350f');
      frameGrad.addColorStop(1.0, '#f59e0b');
    }

    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius, startAngle, endAngle);
    ctx.lineWidth = 128;
    ctx.strokeStyle = frameGrad;
    ctx.stroke();

    // Inner Recessed Dark Roasted Walnut Plaque
    const innerGrad = ctx.createLinearGradient(0, 105, 0, 315);
    innerGrad.addColorStop(0.0, '#2a1004');
    innerGrad.addColorStop(0.5, '#170701');
    innerGrad.addColorStop(1.0, '#260e03');

    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius, startAngle, endAngle);
    ctx.lineWidth = 106;
    ctx.strokeStyle = innerGrad;
    ctx.stroke();

    // Property Color-Group Accent Ribbon along the upper inner curve
    ctx.beginPath();
    ctx.arc(cx, cy, bandRadius - 48, startAngle + 0.015, endAngle - 0.015);
    ctx.lineWidth = 12;
    ctx.strokeStyle = tile.color;
    ctx.stroke();

    // Owner Color Accent Stripe along the bottom outer curve when owned (with luminous glow)
    if (ownerColor) {
      ctx.save();
      ctx.shadowColor = ownerColor;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(cx, cy, bandRadius + 54, startAngle + 0.02, endAngle - 0.02);
      ctx.lineWidth = 16;
      ctx.strokeStyle = ownerColor;
      ctx.stroke();
      ctx.restore();
    }

    // Left & Right 3D Embossed Rivets (colored in Captain's Color if owned!)
    for (const sign of [-1, 1]) {
      const rAlpha = sign * (arcHalfSpan - 0.012);
      const rx = cx - bandRadius * Math.sin(rAlpha);
      const ry = cy + bandRadius * Math.cos(rAlpha);
      const rivGrad = ctx.createRadialGradient(rx - 4, ry - 4, 2, rx, ry, 16);
      rivGrad.addColorStop(0.0, '#ffffff');
      rivGrad.addColorStop(0.55, ownerColor ?? '#d97706');
      rivGrad.addColorStop(1.0, '#1c0701');
      ctx.beginPath();
      ctx.arc(rx, ry, 14, 0, Math.PI * 2);
      ctx.fillStyle = rivGrad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#140601';
      ctx.stroke();
    }
    ctx.restore();

    // Matching 3D Bump Map for the curved plaque
    bCtx.save();
    bCtx.lineCap = 'round';
    bCtx.beginPath();
    bCtx.arc(cx, cy, bandRadius, startAngle, endAngle);
    bCtx.lineWidth = 128;
    bCtx.strokeStyle = '#909090';
    bCtx.stroke();
    bCtx.beginPath();
    bCtx.arc(cx, cy, bandRadius, startAngle, endAngle);
    bCtx.lineWidth = 106;
    bCtx.strokeStyle = '#404040';
    bCtx.stroke();
    bCtx.restore();

    // 2. Centered Curved Embossed Golden-Brown Tile Name (Clean, no price clutter)
    const fullTitle = `${tile.name.toUpperCase()}${levelStars}`;
    drawCurvedEmbossedText(
      ctx,
      bCtx,
      fullTitle,
      cx,
      cy,
      bandRadius + 24,
      isCorner ? 84 : 80,
      arcHalfSpan * 1.9,
      'title'
    );

    const cTex = new THREE.CanvasTexture(colorCanvas);
    cTex.colorSpace = THREE.SRGBColorSpace;
    cTex.generateMipmaps = false;
    cTex.minFilter = THREE.LinearFilter;
    cTex.magFilter = THREE.LinearFilter;
    cTex.needsUpdate = true;

    const bTex = new THREE.CanvasTexture(bumpCanvas);
    bTex.generateMipmaps = false;
    bTex.minFilter = THREE.LinearFilter;
    bTex.magFilter = THREE.LinearFilter;
    bTex.needsUpdate = true;

    const entry = { colorTexture: cTex, bumpTexture: bTex };
    BANNER_TEXTURE_CACHE.set(cacheKey, entry);
    return entry;
  }, [
    tile.id,
    tile.name,
    tile.color,
    subtitleText,
    levelStars,
    ownerColor,
    isCorner,
    fontsLoadedTick,
  ]);

  // Compact width (< 1.65 tile spacing) and elevated front-rim placement so it never clips terrain or neighbors
  const planeW = isCorner ? 1.38 : 1.28;
  const planeH = planeW * (384 / 1024);
  const bannerY = tile.level > 0 ? 0.39 : 0.31;
  const bannerZ = baseRadius * (tile.level > 0 ? 0.58 : 0.52);

  return (
    <group
      position={[0, bannerY, bannerZ]}
      rotation={[-Math.PI / 2 + 0.44, 0, 0]}
    >
      {/* Subtle 3D Dark Carved Wood Backing Plate */}
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
          emissive={
            isFocused ? '#f59e0b' : ownerColor ? ownerColor : '#000000'
          }
          emissiveIntensity={isFocused ? 0.28 : ownerColor ? 0.18 : 0}
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

/**
 * NIVEAU 1 : Mur en Bois avec des Pics tout autour de l'île (3D X, Y, Z)
 * Laisse une ouverture dégagée à l'avant (+Z) pour que le nom de l'île reste parfaitement lisible.
 */
const WoodenSpikeWallRing3D: React.FC<{
  baseRadius: number;
  ownerColor: string;
}> = React.memo(({ baseRadius, ownerColor }) => {
  const wallRadius = baseRadius * 0.77;
  const postAngles = useMemo(() => {
    const angles: number[] = [];
    const totalPosts = 22;
    for (let i = 0; i < totalPosts; i++) {
      // Angle 0 is +Z (front banner side); leave a clear opening at the front [-0.66, +0.66] rad for the island name plaque
      const a = (i / totalPosts) * Math.PI * 2;
      const norm = a > Math.PI ? a - Math.PI * 2 : a;
      if (Math.abs(norm) < 0.66) continue;
      angles.push(a);
    }
    return angles;
  }, []);

  return (
    <group position={[0, 0.15, 0]}>
      {/* Halo de glow diffus sous la palissade à la couleur du joueur */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[wallRadius - 0.11, wallRadius + 0.11, 28]} />
        <meshBasicMaterial
          color={ownerColor}
          transparent
          opacity={0.42}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bandeau de territoire lumineux à la couleur du joueur au pied de la palissade */}
      <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[wallRadius - 0.055, wallRadius + 0.055, 28]} />
        <meshStandardMaterial
          color={ownerColor}
          emissive={ownerColor}
          emissiveIntensity={1.65}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Couronne de rondins en bois verticaux + traverses + pics taillés en pointe + pieux obliques externes */}
      {postAngles.map((angle, idx) => {
        const x = Math.sin(angle) * wallRadius;
        const z = Math.cos(angle) * wallRadius;
        const isTallPost = idx % 2 === 0;
        const postH = isTallPost ? 0.25 : 0.21;

        return (
          <group key={idx} position={[x, 0, z]} rotation={[0, angle, 0]}>
            {/* Traverses horizontales en bois reliant les rondins sans passer devant le nom de l'île */}
            <mesh position={[0, 0.08, 0]}>
              <boxGeometry args={[0.17, 0.028, 0.028]} />
              <meshStandardMaterial color="#5c2406" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <boxGeometry args={[0.17, 0.026, 0.026]} />
              <meshStandardMaterial
                color={ownerColor}
                emissive={ownerColor}
                emissiveIntensity={1.25}
                toneMapped={false}
                roughness={0.4}
              />
            </mesh>

            {/* Rondin vertical en bois */}
            <mesh position={[0, postH / 2, 0]}>
              <cylinderGeometry args={[0.036, 0.042, postH, 6]} />
              <meshStandardMaterial
                color={isTallPost ? '#78350f' : '#92400e'}
                roughness={0.78}
              />
            </mesh>

            {/* Anneau peint aux couleurs du capitaine sur les grands rondins */}
            {isTallPost && (
              <mesh position={[0, postH - 0.03, 0]}>
                <cylinderGeometry args={[0.041, 0.041, 0.04, 6]} />
                <meshStandardMaterial
                  color={ownerColor}
                  emissive={ownerColor}
                  emissiveIntensity={1.5}
                  toneMapped={false}
                />
              </mesh>
            )}

            {/* Pic supérieur taillé en pointe acérée */}
            <mesh position={[0, postH + 0.055, 0]}>
              <coneGeometry args={[0.038, 0.11, 6]} />
              <meshStandardMaterial color="#fde68a" roughness={0.55} />
            </mesh>

            {/* Pieux défensifs obliques à pics pointés vers l'extérieur (1 rondin sur 2) */}
            {isTallPost && (
              <group position={[0, 0.09, 0.045]} rotation={[0.95, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.018, 0.024, 0.14, 5]} />
                  <meshStandardMaterial color="#78350f" roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.095, 0]}>
                  <coneGeometry args={[0.02, 0.065, 5]} />
                  <meshStandardMaterial color="#fef08a" roughness={0.5} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
});

/**
 * NIVEAU 2 & 3 : Remparts en Pierre Taillée tout autour de l'île (remplace le mur en bois)
 * Dégage l'avant (+Z) pour laisser le nom de l'île bien visible.
 */
const CarvedStoneRampartRing3D: React.FC<{
  baseRadius: number;
  ownerColor: string;
}> = React.memo(({ baseRadius, ownerColor }) => {
  const wallRadius = baseRadius * 0.78;

  const { wallSegments, merlonAngles, bastionAngles } = useMemo(() => {
    const segs: number[] = [];
    const totalSegs = 22;
    for (let i = 0; i < totalSegs; i++) {
      const a = (i / totalSegs) * Math.PI * 2;
      const norm = a > Math.PI ? a - Math.PI * 2 : a;
      if (Math.abs(norm) < 0.66) continue;
      segs.push(a);
    }

    const merlons: number[] = [];
    const totalMerlons = 18;
    for (let i = 0; i < totalMerlons; i++) {
      const a = (i / totalMerlons) * Math.PI * 2;
      const norm = a > Math.PI ? a - Math.PI * 2 : a;
      if (Math.abs(norm) < 0.68) continue;
      merlons.push(a);
    }

    const bastions = [
      Math.PI * 0.36,
      Math.PI * 0.74,
      -Math.PI * 0.74,
      -Math.PI * 0.36,
    ];

    return {
      wallSegments: segs,
      merlonAngles: merlons,
      bastionAngles: bastions,
    };
  }, []);

  return (
    <group position={[0, 0.15, 0]}>
      {/* Halo de glow diffus autour des remparts */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[wallRadius - 0.13, wallRadius + 0.13, 28]} />
        <meshBasicMaterial
          color={ownerColor}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Assise de fondation circulaire en pierre taillée + liseré lumineux couleur du joueur */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[wallRadius - 0.075, wallRadius + 0.075, 28]} />
        <meshStandardMaterial
          color={ownerColor}
          emissive={ownerColor}
          emissiveIntensity={1.7}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Blocs de muraille continue en pierre taillée (Ashlar Stone) tout autour de l'île */}
      {wallSegments.map((angle, idx) => {
        const x = Math.sin(angle) * wallRadius;
        const z = Math.cos(angle) * wallRadius;
        return (
          <group key={idx} position={[x, 0.11, z]} rotation={[0, angle, 0]}>
            {/* Bloc de rempart en pierre de taille */}
            <mesh>
              <boxGeometry args={[0.16, 0.2, 0.095]} />
              <meshStandardMaterial
                color={idx % 2 === 0 ? '#e7e5e4' : '#d6d3d1'}
                roughness={0.45}
                metalness={0.08}
              />
            </mesh>
            {/* Liseré lumineux couleur du joueur incrusté sur le flanc du rempart */}
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.165, 0.032, 0.105]} />
              <meshStandardMaterial
                color={ownerColor}
                emissive={ownerColor}
                emissiveIntensity={1.45}
                toneMapped={false}
              />
            </mesh>
            {/* Corniche supérieure moulurée en pierre */}
            <mesh position={[0, 0.105, 0]}>
              <boxGeometry args={[0.17, 0.028, 0.115]} />
              <meshStandardMaterial color="#a8a29e" roughness={0.5} />
            </mesh>
          </group>
        );
      })}

      {/* Créneaux 3D (Merlons en pierre taillée) sur tout le pourtour du rempart */}
      {merlonAngles.map((angle, idx) => {
        const x = Math.sin(angle) * wallRadius;
        const z = Math.cos(angle) * wallRadius;
        return (
          <group key={idx} position={[x, 0.255, z]} rotation={[0, angle, 0]}>
            <mesh>
              <boxGeometry args={[0.095, 0.075, 0.105]} />
              <meshStandardMaterial color="#f5f5f4" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.044, 0]}>
              <boxGeometry args={[0.11, 0.026, 0.12]} />
              <meshStandardMaterial
                color={ownerColor}
                emissive={ownerColor}
                emissiveIntensity={1.65}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* 4 Tourelles / Bastions d'angle en pierre taillée autour de l'île */}
      {bastionAngles.map((angle, idx) => {
        const x = Math.sin(angle) * (wallRadius + 0.02);
        const z = Math.cos(angle) * (wallRadius + 0.02);
        return (
          <group key={idx} position={[x, 0, z]} rotation={[0, angle, 0]}>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.085, 0.1, 0.32, 8]} />
              <meshStandardMaterial color="#e7e5e4" roughness={0.42} />
            </mesh>
            {/* Anneau lumineux couleur du capitaine au sommet de chaque tourelle */}
            <mesh position={[0, 0.31, 0]}>
              <cylinderGeometry args={[0.104, 0.096, 0.065, 8]} />
              <meshStandardMaterial
                color={ownerColor}
                emissive={ownerColor}
                emissiveIntensity={1.7}
                toneMapped={false}
              />
            </mesh>
            {/* Toit conique de tourelle aux couleurs du capitaine + halo glow */}
            <mesh position={[0, 0.39, 0]}>
              <coneGeometry args={[0.11, 0.11, 8]} />
              <meshStandardMaterial
                color={ownerColor}
                emissive={ownerColor}
                emissiveIntensity={1.6}
                toneMapped={false}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, 0.39, 0]}>
              <coneGeometry args={[0.135, 0.135, 8]} />
              <meshBasicMaterial
                color={ownerColor}
                transparent
                opacity={0.35}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
});

/**
 * NIVEAU 3 : Vrai Château Pirate modélisé en 3D (X, Y, Z) au centre de l'île
 */
const True3DPirateCastleKeep: React.FC<{
  ownerColor: string;
}> = React.memo(({ ownerColor }) => {
  const cornerOffsets: [number, number][] = [
    [-0.22, -0.2],
    [0.22, -0.2],
    [-0.22, 0.2],
    [0.22, 0.2],
  ];

  return (
    <group position={[0, 0.15, -0.05]}>
      {/* 1. Soubassement octogonal en pierre taillée & double halo glow du Capitaine */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.38, 0.44, 0.08, 8]} />
        <meshStandardMaterial color="#a8a29e" roughness={0.55} />
      </mesh>
      {/* Halo de glow externe additif autour de la base du château */}
      <mesh position={[0, 0.082, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.56, 24]} />
        <meshBasicMaterial
          color={ownerColor}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.086, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.46, 20]} />
        <meshStandardMaterial
          color={ownerColor}
          emissive={ownerColor}
          emissiveIntensity={1.85}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Corps Principal du Donjon 3D (X=0.42, Y=0.38, Z=0.38) */}
      <mesh position={[0, 0.26, 0]}>
        <boxGeometry args={[0.42, 0.36, 0.38]} />
        <meshStandardMaterial
          color="#e7e5e4"
          emissive={ownerColor}
          emissiveIntensity={0.22}
          roughness={0.42}
          metalness={0.08}
        />
      </mesh>

      {/* Blasons / Bannières Murales Lumineuses aux couleurs du joueur sur les faces du Donjon */}
      <mesh position={[0, 0.24, -0.194]}>
        <boxGeometry args={[0.22, 0.24, 0.018]} />
        <meshStandardMaterial
          color={ownerColor}
          emissive={ownerColor}
          emissiveIntensity={1.65}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.214, 0.24, 0]}>
        <boxGeometry args={[0.018, 0.24, 0.2]} />
        <meshStandardMaterial
          color={ownerColor}
          emissive={ownerColor}
          emissiveIntensity={1.65}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.214, 0.24, 0]}>
        <boxGeometry args={[0.018, 0.24, 0.2]} />
        <meshStandardMaterial
          color={ownerColor}
          emissive={ownerColor}
          emissiveIntensity={1.65}
          toneMapped={false}
        />
      </mesh>

      {/* Ceinture architecturale en pierre sombre + Bandeau Glow Couleur du Joueur autour du Donjon */}
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[0.45, 0.04, 0.41]} />
        <meshStandardMaterial color="#78716c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.472, 0]}>
        <boxGeometry args={[0.468, 0.038, 0.428]} />
        <meshStandardMaterial
          color={ownerColor}
          emissive={ownerColor}
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
      {/* Halo glow autour de la couronne du donjon */}
      <mesh position={[0, 0.472, 0]}>
        <boxGeometry args={[0.51, 0.065, 0.47]} />
        <meshBasicMaterial
          color={ownerColor}
          transparent
          opacity={0.34}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Grande Porte Fortifiée & Herse sur la face avant (+Z) */}
      <mesh position={[0, 0.18, 0.195]}>
        <boxGeometry args={[0.14, 0.2, 0.025]} />
        <meshStandardMaterial color="#292524" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.28, 0.198]}>
        <boxGeometry args={[0.17, 0.032, 0.03]} />
        <meshStandardMaterial
          color="#fbbf24"
          metalness={0.7}
          roughness={0.28}
        />
      </mesh>

      {/* Fenêtres / Meurtrières illuminées sur les 4 faces (X et Z) */}
      <mesh position={[0, 0.35, 0.198]}>
        <boxGeometry args={[0.18, 0.045, 0.018]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#f59e0b"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.35, -0.198]}>
        <boxGeometry args={[0.18, 0.045, 0.018]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#f59e0b"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.218, 0.35, 0]}>
        <boxGeometry args={[0.018, 0.045, 0.16]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#f59e0b"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.218, 0.35, 0]}>
        <boxGeometry args={[0.018, 0.045, 0.16]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#f59e0b"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>

      {/* 3. Quatre Tours d'Angle Cylindriques 3D avec Toits Coniques Lumineux aux couleurs du Joueur */}
      {cornerOffsets.map(([cx, cz], idx) => (
        <group key={idx} position={[cx, 0, cz]}>
          {/* Fût de la tour en pierre taillée */}
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.095, 0.11, 0.48, 10]} />
            <meshStandardMaterial color="#f5f5f4" roughness={0.38} />
          </mesh>
          {/* Anneau central lumineux aux couleurs du joueur sur chaque tour */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.104, 0.106, 0.055, 10]} />
            <meshStandardMaterial
              color={ownerColor}
              emissive={ownerColor}
              emissiveIntensity={1.65}
              toneMapped={false}
            />
          </mesh>
          {/* Couronne crénelée de la tour */}
          <mesh position={[0, 0.53, 0]}>
            <cylinderGeometry args={[0.112, 0.1, 0.05, 8]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.48} />
          </mesh>
          {/* Toit conique 3D de la tour aux couleurs du joueur avec fort effet de glow */}
          <mesh position={[0, 0.64, 0]}>
            <coneGeometry args={[0.138, 0.195, 10]} />
            <meshStandardMaterial
              color={ownerColor}
              emissive={ownerColor}
              emissiveIntensity={1.75}
              toneMapped={false}
              roughness={0.28}
            />
          </mesh>
          {/* Aura de glow additive autour du toit conique de la tour */}
          <mesh position={[0, 0.64, 0]}>
            <coneGeometry args={[0.168, 0.23, 10]} />
            <meshBasicMaterial
              color={ownerColor}
              transparent
              opacity={0.42}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* Pointe dorée au sommet de chaque tour */}
          <mesh position={[0, 0.75, 0]}>
            <sphereGeometry args={[0.026, 8, 8]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={1.2}
              toneMapped={false}
              metalness={0.85}
            />
          </mesh>
        </group>
      ))}

      {/* 4. Tour Maîtresse Centrale (Beffroi Pirate 3D) au sommet du château aux couleurs du joueur */}
      <mesh position={[0, 0.56, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.2, 8]} />
        <meshStandardMaterial color="#f5f5f4" roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.155, 0.155, 0.045, 8]} />
        <meshStandardMaterial
          color={ownerColor}
          emissive={ownerColor}
          emissiveIntensity={1.75}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <coneGeometry args={[0.185, 0.165, 10]} />
        <meshStandardMaterial
          color={ownerColor}
          emissive={ownerColor}
          emissiveIntensity={1.85}
          toneMapped={false}
          roughness={0.25}
        />
      </mesh>
      {/* Halo de glow additif sur le toit principal du château */}
      <mesh position={[0, 0.72, 0]}>
        <coneGeometry args={[0.225, 0.2, 10]} />
        <meshBasicMaterial
          color={ownerColor}
          transparent
          opacity={0.46}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Canons 3D en bronze sur les flancs du Château Pirate */}
      <mesh position={[-0.25, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.028, 0.12, 6]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0.25, 0.22, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.028, 0.12, 6]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
});

export const Tile: React.FC<TileProps> = React.memo(
  ({
    tile,
    currentRent,
    owner,
    isFocused,
    isFortifyCandidate = false,
    onSelectTile,
  }) => {
    const { position, rotationY, side } = getTileTransform(tile.id);
    const isCorner = side === 'corner';

    const theme = useMemo(() => getTileTerrainTheme(tile), [tile]);
    const isRockyShore =
      theme === 'falaise' || theme === 'volcan' || theme === 'malediction';

    const [tileArtTexture, sandTexture, rockTexture] = useTexture([
      TERRAIN_TEXTURE_MAP[theme],
      './assets/sand_beach.jpg',
      './assets/coastal_rock.jpg',
    ]);

    const islandSeedAngle = useMemo(
      () => (tile.id * 1.17) % (Math.PI * 2),
      [tile.id]
    );

    // The landmark sits in a back corner of the terrace, inside the fortification ring,
    // leaving the center free for ships and the Level 3 castle. It retreats and shrinks once the castle stands.
    const hasCastle = tile.level >= 3;
    const propSideSign = isCorner
      ? tile.id === 0 || tile.id === 18
        ? 1
        : -1
      : tile.id % 2 === 0
      ? -1
      : 1;
    const propOffsetX = propSideSign * (hasCastle ? 0.38 : isCorner ? 0.28 : 0.25);
    const propOffsetZ = hasCastle ? -0.4 : isCorner ? -0.34 : -0.3;

    // Opposite back corner for the 3D Captain Ownership Flag (moves to top of Central 3D Castle at Level 3!)
    const flagOffsetX = tile.level >= 3 ? 0 : -propOffsetX * 0.95;
    const flagOffsetZ = tile.level >= 3 ? -0.05 : propOffsetZ * 0.88;

    const baseRadius = isCorner ? 0.88 : 0.78;
    const propWidth = (isCorner ? 0.62 : 0.52) * (hasCastle ? 0.55 : 1);
    const propHeight = (isCorner ? 0.84 : 0.72) * (hasCastle ? 0.65 : 1);

    const levelStars =
      tile.level >= 3
        ? ' ★★★'
        : tile.level > 0
        ? ` ${'★'.repeat(tile.level)}`
        : '';

    const ownerShortName = owner ? owner.name.split(' ')[0] : '';

    const trapBadge = tile.trapped && tile.level > 0 ? ' 💣' : '';

    const subtitleText =
      tile.type === 'island'
        ? owner
          ? `⚑ ${ownerShortName} • ${currentRent} Or${trapBadge}`
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
          if (e.delta > 6) return;
          onSelectTile?.(tile.id);
        }}
      >
        {/* 1. Shoreline Ring (Vibrant Captain Territory Halo when owned, or Cyan Fortify Target!) */}
        {owner && (
          <mesh
            position={[0, -0.088, 0]}
            rotation={[-Math.PI / 2, 0, islandSeedAngle]}
          >
            <ringGeometry args={[baseRadius * 0.92, baseRadius * 1.38, 28]} />
            <meshBasicMaterial
              color={owner.color}
              transparent
              opacity={0.46}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
        <mesh
          position={[0, -0.08, 0]}
          rotation={[-Math.PI / 2, 0, islandSeedAngle]}
        >
          <ringGeometry
            args={[
              baseRadius * 0.86,
              baseRadius * (owner || isFortifyCandidate ? 1.24 : 1.12),
              24,
            ]}
          />
          <meshStandardMaterial
            color={
              isFortifyCandidate
                ? '#22d3ee'
                : owner
                ? owner.color
                : isFocused
                ? '#fde047'
                : '#e0f2fe'
            }
            emissive={
              isFortifyCandidate
                ? '#06b6d4'
                : owner
                ? owner.color
                : isFocused
                ? '#f59e0b'
                : '#38bdf8'
            }
            emissiveIntensity={
              isFortifyCandidate ? 1.6 : owner ? 1.65 : isFocused ? 0.95 : 0.45
            }
            toneMapped={!owner && !isFortifyCandidate}
            transparent
            opacity={owner || isFortifyCandidate ? 0.98 : 0.88}
          />
        </mesh>

        {/* 2. Sculpted 3D Coastal Shore Base (Varied Beach vs Rocky Cliff vs Cove) */}
        <mesh
          position={[0, 0.02, 0]}
          rotation={[0, islandSeedAngle, 0]}
          receiveShadow
        >
          <cylinderGeometry
            args={[
              baseRadius * 0.86,
              baseRadius * 1.04,
              0.22,
              isRockyShore ? 9 : 16,
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

        {/* Prominent Raised Captain Ownership Territory Border Ring & 3D Glowing Contour around the Island Terrace */}
        {owner && (
          <group>
            {/* Outer Diffused Additive Glow Halo around the Island Rim */}
            <mesh position={[0, 0.161, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[baseRadius * 0.68, baseRadius * 1.08, 32]}
              />
              <meshBasicMaterial
                color={owner.color}
                transparent
                opacity={0.5}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* High-Visibility Luminous Territory Contour Ring on Top of the Terrace Rim */}
            <mesh position={[0, 0.163, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[baseRadius * 0.75, baseRadius * 0.95, 32]}
              />
              <meshStandardMaterial
                color={owner.color}
                emissive={owner.color}
                emissiveIntensity={1.85}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Sculpted 3D Glowing Bevel Cord Wrapping the Island Edge */}
            <mesh position={[0, 0.166, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[baseRadius * 0.83, 0.03, 10, 32]} />
              <meshStandardMaterial
                color={owner.color}
                emissive={owner.color}
                emissiveIntensity={1.95}
                toneMapped={false}
                roughness={0.2}
              />
            </mesh>
          </group>
        )}

        {/* Glowing Cyan/Gold Fortification Target Ring when player is choosing an island to fortify */}
        {isFortifyCandidate && (
          <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[baseRadius * 0.64, baseRadius * 1.05, 24]} />
            <meshStandardMaterial
              color="#67e8f9"
              emissive="#22d3ee"
              emissiveIntensity={1.5}
              transparent
              opacity={0.92}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* 3. Viewer-Aligned Island Surface, 3D Perimeter Fortifications (Wood Spikes -> Carved Stone) & 3D Center Pirate Castle */}
        <group rotation={[0, -rotationY, 0]}>
          {/* Open Central Island Terrace for Ship Circulation & Red Treasure Trail */}
          <mesh position={[0, 0.125, -0.02]} receiveShadow>
            <cylinderGeometry
              args={[baseRadius * 0.8, baseRadius * 0.89, 0.07, 20]}
            />
            <meshStandardMaterial
              map={tileArtTexture}
              bumpMap={tileArtTexture}
              bumpScale={0.035}
              roughness={0.68}
            />
          </mesh>

          {/* Ground contact shadow under the landmark */}
          <mesh
            position={[propOffsetX, 0.164, propOffsetZ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[propWidth * 0.52, 20]} />
            <meshBasicMaterial color="#020617" transparent opacity={0.16} />
          </mesh>

          {/* TEXTURED 3D LANDMARK (Higgsfield concept, Hunyuan 3D mesh) */}
          <group position={[propOffsetX, 0.16, propOffsetZ]}>
            <TileLandmark
              theme={theme}
              maxWidth={propWidth}
              maxHeight={propHeight}
            />
          </group>

          {/* 3D PERIMETER WALLS & CENTER 3D PIRATE CASTLE */}
          {owner && tile.level === 1 && (
            <WoodenSpikeWallRing3D
              baseRadius={baseRadius}
              ownerColor={owner.color}
            />
          )}

          {owner && tile.level >= 2 && (
            <CarvedStoneRampartRing3D
              baseRadius={baseRadius}
              ownerColor={owner.color}
            />
          )}

          {owner && tile.level >= 3 && (
            <True3DPirateCastleKeep ownerColor={owner.color} />
          )}

          {/* 3D CAPTAIN OWNERSHIP FLAG (At corner for Levels 0-2, or crowning the Central 3D Castle at Level 3!) */}
          {owner && (
            <group
              position={[
                flagOffsetX,
                tile.level >= 3 ? 0.74 : 0.16,
                flagOffsetZ,
              ]}
            >
              {tile.level < 3 && (
                <>
                  {/* Base Pedestal for Flag when Castle isn't built yet */}
                  <mesh position={[0, 0.045, 0]}>
                    <cylinderGeometry args={[0.18, 0.22, 0.095, 12]} />
                    <meshStandardMaterial
                      color={owner.color}
                      emissive={owner.color}
                      emissiveIntensity={1.45}
                      toneMapped={false}
                      roughness={0.35}
                    />
                  </mesh>

                  {/* Soft Additive Glow Aura around the Flag Pedestal */}
                  <mesh
                    position={[0, 0.02, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <ringGeometry args={[0.12, 0.34, 20]} />
                    <meshBasicMaterial
                      color={owner.color}
                      transparent
                      opacity={0.5}
                      blending={THREE.AdditiveBlending}
                      depthWrite={false}
                      toneMapped={false}
                      side={THREE.DoubleSide}
                    />
                  </mesh>

                  <mesh
                    position={[0, 0.094, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <ringGeometry args={[0.13, 0.24, 20]} />
                    <meshStandardMaterial
                      color={owner.color}
                      emissive={owner.color}
                      emissiveIntensity={1.85}
                      toneMapped={false}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                </>
              )}

              {/* Tall Wooden / Royal Flagstaff Mast */}
              <group position={[0, 0, 0]}>
                <mesh position={[0, 0.36, 0]}>
                  <cylinderGeometry args={[0.024, 0.035, 0.66, 8]} />
                  <meshStandardMaterial
                    color={tile.level >= 3 ? '#fbbf24' : '#451a03'}
                    emissive={owner.color}
                    emissiveIntensity={0.35}
                    metalness={tile.level >= 3 ? 0.65 : 0.15}
                    roughness={0.4}
                  />
                </mesh>

                {/* Golden Finial Sphere at the top of the Mast */}
                <mesh position={[0, 0.71, 0]}>
                  <sphereGeometry args={[0.056, 10, 10]} />
                  <meshStandardMaterial
                    color="#fde047"
                    emissive={owner.color}
                    emissiveIntensity={1.35}
                    toneMapped={false}
                    metalness={0.85}
                    roughness={0.2}
                  />
                </mesh>

                {/* Large Vibrant 3D Captain Flag / Pennant in the Player's Color with Luminous Glow Halo */}
                <group position={[0.19, 0.54, 0]}>
                  {/* Outer Additive Glow Aura around the Flag */}
                  <mesh>
                    <boxGeometry args={[0.46, 0.32, 0.09]} />
                    <meshBasicMaterial
                      color={owner.color}
                      transparent
                      opacity={0.46}
                      blending={THREE.AdditiveBlending}
                      depthWrite={false}
                      toneMapped={false}
                    />
                  </mesh>
                  {/* Golden Flag Trim Border */}
                  <mesh position={[0, 0, -0.009]}>
                    <boxGeometry args={[0.38, 0.25, 0.016]} />
                    <meshStandardMaterial
                      color="#fde047"
                      emissive="#f59e0b"
                      emissiveIntensity={0.85}
                      toneMapped={false}
                    />
                  </mesh>
                  {/* Player Colored Glowing Flag Cloth */}
                  <mesh>
                    <boxGeometry args={[0.34, 0.21, 0.032]} />
                    <meshStandardMaterial
                      color={owner.color}
                      emissive={owner.color}
                      emissiveIntensity={1.85}
                      toneMapped={false}
                      roughness={0.2}
                    />
                  </mesh>
                </group>
              </group>
            </group>
          )}

          {/* 4. CURVED GOLDEN-BROWN 3D RELIEF BANNER HUGGING THE ROUNDED TILE EDGE */}
          <CurvedGoldenReliefBanner
            tile={tile}
            subtitleText={subtitleText}
            levelStars={levelStars}
            ownerColor={owner?.color ?? null}
            isFocused={isFocused || isFortifyCandidate}
            isCorner={isCorner}
            baseRadius={baseRadius}
          />
        </group>
      </group>
    );
  },
  (prev, next) =>
    prev.tile === next.tile &&
    prev.tile.level === next.tile.level &&
    prev.currentRent === next.currentRent &&
    prev.owner?.id === next.owner?.id &&
    prev.owner?.color === next.owner?.color &&
    prev.isFocused === next.isFocused &&
    prev.isFortifyCandidate === next.isFortifyCandidate
);
