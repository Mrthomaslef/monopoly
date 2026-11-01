import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGameStore, getTileTransform } from '../../store/useGameStore';
import { Ocean } from './Ocean';
import { Board } from './Board';

const SmartCameraRig: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();

  const cameraMode = useGameStore((s) => s.cameraMode);
  const phase = useGameStore((s) => s.phase);
  const activePlayerPosition = useGameStore(
    (s) => s.players[s.currentPlayerIndex]?.position ?? 0
  );
  const focusedTileIndex = useGameStore((s) => s.focusedTileIndex);
  const landedTilePopup = useGameStore((s) => s.landedTilePopup);
  const showFortifyModal = useGameStore((s) => s.showFortifyModal);
  const navalBattle = useGameStore((s) => s.navalBattle);
  const cameraShake = useGameStore((s) => s.cameraShake);
  const diceStowed = useGameStore((s) => s.diceStowed);

  const isFreeCamera =
    phase === 'IDLE' &&
    diceStowed &&
    cameraMode === 'GLOBAL' &&
    !landedTilePopup &&
    !showFortifyModal;

  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPosition = useRef(new THREE.Vector3(0, 13.5, 11.5));

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    const aspect = size.width / Math.max(1, size.height);
    // Automatically scale global distance on narrow 9:16 portrait screens so all 24 tiles fit
    const portraitMultiplier = aspect < 0.75 ? 1.26 : aspect < 1.0 ? 1.12 : 0.95;

    const tileIndexToTrack =
      navalBattle?.active
        ? navalBattle.tileIndex
        : phase === 'MOVING'
        ? activePlayerPosition
        : focusedTileIndex;

    const tilePos = getTileTransform(tileIndexToTrack).position;

    // Keep camera focused on the landed/inspected tile after movement so the player is never disoriented
    const shouldStayOnTile =
      cameraMode === 'FOLLOW' ||
      phase === 'MOVING' ||
      phase === 'TILE_ACTION' ||
      phase === 'END_TURN' ||
      Boolean(landedTilePopup) ||
      showFortifyModal;

    if (phase === 'NAVAL_BATTLE' && navalBattle?.active) {
      // Close-up dramatic Naval Battle camera on the contested tile
      desiredTarget.current.set(tilePos[0], 0.35, tilePos[2]);
      desiredPosition.current.set(
        tilePos[0] * 1.35 + (tilePos[0] === 0 ? 2.4 : 0),
        4.2,
        tilePos[2] * 1.35 + 3.4
      );
      camera.position.lerp(desiredPosition.current, Math.min(1, delta * 4.2));
      controlsRef.current.target.lerp(desiredTarget.current, Math.min(1, delta * 5.0));
    } else if (shouldStayOnTile) {
      // Follow camera tracking the active ship and staying calmly on the landed tile
      // When the tile card popup is open, frame the 3D tile slightly higher in the viewport so both the 3D island and the card are clearly visible
      const targetY = landedTilePopup ? -0.35 : 0.25;
      const targetZOffset = landedTilePopup ? 0.65 : 0;
      desiredTarget.current.set(tilePos[0], targetY, tilePos[2] + targetZOffset);
      const radialX = tilePos[0] * 1.48;
      const radialZ = tilePos[2] * 1.48 + 3.2;
      desiredPosition.current.set(radialX, 5.6, radialZ);

      camera.position.lerp(desiredPosition.current, Math.min(1, delta * 3.8));
      controlsRef.current.target.lerp(desiredTarget.current, Math.min(1, delta * 5.0));
    } else if (!isFreeCamera) {
      // Global overview tilted for mobile portrait readability (used during IDLE / ROLLING when dice are out)
      desiredTarget.current.set(0, -0.2, 0.35);
      desiredPosition.current.set(
        0,
        13.2 * portraitMultiplier,
        9.8 * portraitMultiplier
      );

      // Gentle interpolation back to global view when rolling dice or starting turn
      controlsRef.current.target.lerp(desiredTarget.current, Math.min(1, delta * 2.8));
      if (phase === 'IDLE' || phase === 'ROLLING') {
        camera.position.lerp(desiredPosition.current, Math.min(1, delta * 2.2));
      }
    }

    // Apply cannon / Kraken camera shake
    if (cameraShake > 0) {
      camera.position.x += (Math.random() - 0.5) * 0.28 * cameraShake;
      camera.position.y += (Math.random() - 0.5) * 0.22 * cameraShake;
      camera.position.z += (Math.random() - 0.5) * 0.28 * cameraShake;
    }

    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      enablePan={isFreeCamera}
      minDistance={3.2}
      maxDistance={26}
      minPolarAngle={0.28}
      maxPolarAngle={Math.PI / 2 - 0.12} // Never dip below the Caribbean ocean surface
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: isFreeCamera ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.DOLLY_ROTATE,
      }}
    />
  );
};

export const Scene: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-b from-sky-900 via-cyan-900 to-slate-950">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ powerPreference: 'high-performance', antialias: true }}
        camera={{ position: [0, 15, 11.5], fov: 44, near: 0.1, far: 120 }}
      >
        {/* Warm Caribbean Sunset & Lagoon Lighting */}
        <color attach="background" args={['#0ea5e9']} />
        <fog attach="fog" args={['#0ea5e9', 30, 62]} />

        <ambientLight intensity={0.75} color="#fef3c7" />
        <hemisphereLight
          color="#bae6fd"
          groundColor="#083344"
          intensity={0.85}
        />
        <directionalLight
          castShadow
          position={[9, 16, 10]}
          intensity={1.65}
          color="#ffedd5"
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-camera-near={1}
          shadow-camera-far={40}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        <React.Suspense fallback={null}>
          <Ocean />
          <Board />
        </React.Suspense>
        <SmartCameraRig />
      </Canvas>
    </div>
  );
};
