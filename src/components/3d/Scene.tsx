import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGameStore, getTileTransform, getShipSlotOffset } from '../../store/useGameStore';
import { Backdrop } from './Backdrop';
import { Ocean } from './Ocean';
import { Board } from './Board';

const MIN_TARGET_Y = 0.0;
const MIN_CAMERA_Y = 0.45;
const MAX_PAN_RADIUS = 14;

const SmartCameraRig: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, size, gl } = useThree();

  const cameraMode = useGameStore((s) => s.cameraMode);
  const phase = useGameStore((s) => s.phase);
  const players = useGameStore((s) => s.players);
  const activePlayerPosition = useGameStore(
    (s) => s.players[s.currentPlayerIndex]?.position ?? 0
  );
  const focusedTileIndex = useGameStore((s) => s.focusedTileIndex);
  const spotlightPlayerId = useGameStore((s) => s.spotlightPlayerId);
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
  const freeCamAnimatingRef = useRef<boolean>(false);
  const tileFocusAnimatingRef = useRef<boolean>(false);

  // Trigger smooth camera focus transition when spotlightPlayerId changes in free camera mode
  useEffect(() => {
    if (isFreeCamera && spotlightPlayerId !== null) {
      freeCamAnimatingRef.current = true;
    } else {
      freeCamAnimatingRef.current = false;
    }
  }, [isFreeCamera, spotlightPlayerId]);

  // Trigger smooth camera transition whenever a tile is clicked/inspected, landed on, or tracked
  useEffect(() => {
    tileFocusAnimatingRef.current = true;
  }, [
    focusedTileIndex,
    landedTilePopup?.tileId,
     Boolean(landedTilePopup),
    phase,
    cameraMode,
    showFortifyModal,
    navalBattle?.active,
  ]);

  // Two-finger twist gesture rotation (turntable rotation in free camera mode)
  useEffect(() => {
    const domElement = gl.domElement;
    if (!domElement) return;

    let lastAngle: number | null = null;

    const getTouchAngle = (touches: TouchList): number => {
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      return Math.atan2(dy, dx);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastAngle = getTouchAngle(e.touches);
      } else {
        lastAngle = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const controls = controlsRef.current;
      if (!controls || e.touches.length !== 2) {
        lastAngle = null;
        return;
      }

      const currentAngle = getTouchAngle(e.touches);
      if (lastAngle !== null) {
        let deltaAngle = currentAngle - lastAngle;
        if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

        // Ignore micro-jitter during pure pinch/pan; apply twist rotation around Y axis
        if (Math.abs(deltaAngle) > 0.002 && Math.abs(deltaAngle) < 0.5) {
          const offset = camera.position.clone().sub(controls.target);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaAngle);
          camera.position.copy(controls.target).add(offset);
        }
      }
      lastAngle = currentAngle;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastAngle = getTouchAngle(e.touches);
      } else {
        lastAngle = null;
      }
    };

    domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    domElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    domElement.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gl, camera]);

  // Smoothly orbits and zooms camera around controls.target toward desiredPosition
  // so clicking a tile from a rotated free-camera angle rotates cleanly to face the title right-side up
  const stepCameraTowardDesired = (
    controls: OrbitControlsImpl,
    delta: number,
    posSpeed: number,
    targetSpeed: number
  ) => {
    controls.target.lerp(desiredTarget.current, Math.min(1, delta * targetSpeed));

    const curDx = camera.position.x - controls.target.x;
    const curDz = camera.position.z - controls.target.z;
    const desDx = desiredPosition.current.x - desiredTarget.current.x;
    const desDz = desiredPosition.current.z - desiredTarget.current.z;

    const curRadius = Math.hypot(curDx, curDz);
    const desRadius = Math.hypot(desDx, desDz);

    // If camera was rotated behind or sideways in free camera, orbit smoothly around the Y axis to face +Z
    if (curRadius > 0.25 && desRadius > 0.25) {
      const curAngle = Math.atan2(curDx, curDz);
      const desAngle = Math.atan2(desDx, desDz);
      let angleDiff = desAngle - curAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const stepFactor = Math.min(1, delta * posSpeed);
      const nextAngle = curAngle + angleDiff * stepFactor;
      const nextRadius = curRadius + (desRadius - curRadius) * stepFactor;
      const nextY =
        camera.position.y +
        (desiredPosition.current.y - camera.position.y) * stepFactor;

      camera.position.set(
        controls.target.x + Math.sin(nextAngle) * nextRadius,
        nextY,
        controls.target.z + Math.cos(nextAngle) * nextRadius
      );
    } else {
      camera.position.lerp(desiredPosition.current, Math.min(1, delta * posSpeed));
    }
  };

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
      phase !== 'ROLLING' &&
      (cameraMode === 'FOLLOW' ||
        phase === 'MOVING' ||
        phase === 'TILE_ACTION' ||
        phase === 'END_TURN' ||
        Boolean(landedTilePopup) ||
        showFortifyModal);

    const spotlightPlayer =
      spotlightPlayerId !== null
        ? players.find((p) => p.id === spotlightPlayerId && !p.bankrupt) ?? null
        : null;

    if (phase === 'ROLLING') {
      // Keep camera steady while the dice roll and display their result in front of the player
    } else if (phase === 'NAVAL_BATTLE' && navalBattle?.active) {
      // Close-up dramatic Naval Battle camera facing the contested tile in the right direction of its title
      desiredTarget.current.set(tilePos[0], 0.35, tilePos[2]);
      desiredPosition.current.set(tilePos[0], 4.2, tilePos[2] + 3.6);
      stepCameraTowardDesired(controlsRef.current, delta, 4.5, 5.2);
    } else if (isFreeCamera && spotlightPlayer && freeCamAnimatingRef.current) {
      // In Free Camera mode, center and highlight the selected player's or opponent's ship facing the tile's title
      const pTilePos = getTileTransform(spotlightPlayer.position).position;
      const slotOffset = getShipSlotOffset(spotlightPlayer.id);
      const shipX = pTilePos[0] + slotOffset[0];
      const shipZ = pTilePos[2] + slotOffset[2];

      desiredTarget.current.set(shipX, 0.32, shipZ);
      desiredPosition.current.set(shipX, 4.2, shipZ + 3.4);

      stepCameraTowardDesired(controlsRef.current, delta, 4.8, 5.5);

      if (
        camera.position.distanceTo(desiredPosition.current) < 0.08 &&
        controlsRef.current.target.distanceTo(desiredTarget.current) < 0.05
      ) {
        freeCamAnimatingRef.current = false;
      }
    } else if (shouldStayOnTile) {
      // All 24 tiles have their 3D landmark & curved golden title oriented toward +Z.
      // Position the camera directly in front of the tile along +Z (x = tilePos[0]) so the island
      // is always presented upright in the exact reading direction of its title.
      // When the tile card popup is open, shift target forward (+Z) so the 3D island & its title
      // sit cleanly in the upper viewport without being overlapped by the card below.
      const hasPopup = Boolean(landedTilePopup);
      const targetY = hasPopup ? 0.0 : 0.25;
      const targetZOffset = hasPopup ? 1.25 : 0.0;
      const camY = hasPopup ? 4.35 : 4.8;
      const camZOffset = hasPopup ? 4.25 : 3.8;

      desiredTarget.current.set(tilePos[0], targetY, tilePos[2] + targetZOffset);
      desiredPosition.current.set(tilePos[0], camY, tilePos[2] + camZOffset);

      if (tileFocusAnimatingRef.current || phase === 'MOVING') {
        const movePosSpeed = phase === 'MOVING' ? 2.8 : 4.2;
        const moveTargetSpeed = phase === 'MOVING' ? 3.5 : 5.0;
        stepCameraTowardDesired(controlsRef.current, delta, movePosSpeed, moveTargetSpeed);

        if (
          phase !== 'MOVING' &&
          camera.position.distanceTo(desiredPosition.current) < 0.08 &&
          controlsRef.current.target.distanceTo(desiredTarget.current) < 0.05
        ) {
          tileFocusAnimatingRef.current = false;
        }
      }
    } else if (!isFreeCamera) {
      // Global overview tilted for mobile portrait readability (used during IDLE when dice are out)
      desiredTarget.current.set(0, 0.0, 0.35);
      desiredPosition.current.set(
        0,
        13.2 * portraitMultiplier,
        9.8 * portraitMultiplier
      );

      // Gentle interpolation back to global view when starting turn
      controlsRef.current.target.lerp(desiredTarget.current, Math.min(1, delta * 2.8));
      if (phase === 'IDLE') {
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

    // Prevent target & camera from ever dipping below the Caribbean ocean surface
    if (controlsRef.current.target.y < MIN_TARGET_Y) {
      const liftY = MIN_TARGET_Y - controlsRef.current.target.y;
      controlsRef.current.target.y = MIN_TARGET_Y;
      camera.position.y += liftY;
    }

    // Keep free-panning within the archipelago bounds
    const panDist = Math.hypot(
      controlsRef.current.target.x,
      controlsRef.current.target.z
    );
    if (panDist > MAX_PAN_RADIUS) {
      const scale = MAX_PAN_RADIUS / panDist;
      const dx = controlsRef.current.target.x * (scale - 1);
      const dz = controlsRef.current.target.z * (scale - 1);
      controlsRef.current.target.x += dx;
      controlsRef.current.target.z += dz;
      camera.position.x += dx;
      camera.position.z += dz;
    }

    if (camera.position.y < MIN_CAMERA_Y) {
      camera.position.y = MIN_CAMERA_Y;
    }
    camera.lookAt(controlsRef.current.target);
  });

  const canPanFreely =
    isFreeCamera || Boolean(diceStowed && landedTilePopup?.isInspect);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      enablePan={canPanFreely}
      screenSpacePanning={false}
      minDistance={3.2}
      maxDistance={26}
      minPolarAngle={0.28}
      maxPolarAngle={Math.PI / 2 - 0.14} // Never dip below the Caribbean ocean surface
      onStart={() => {
        freeCamAnimatingRef.current = false;
        tileFocusAnimatingRef.current = false;
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: canPanFreely ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.DOLLY_ROTATE,
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
        camera={{ position: [0, 15, 11.5], fov: 44, near: 0.1, far: 600 }}
      >
        {/* Warm Caribbean Sunset & Lagoon Lighting */}
        <color attach="background" args={['#ffd4a8']} />

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

        <Backdrop />
        <React.Suspense fallback={null}>
          <Ocean />
          <Board />
        </React.Suspense>
        <SmartCameraRig />
      </Canvas>
    </div>
  );
};
