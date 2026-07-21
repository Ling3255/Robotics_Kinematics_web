"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import type { Group } from "three";

/** Movement speed per frame */
const SPEED = 0.08;

/** Jump vertical speed per frame & gravity per frame */
const JUMP_SPEED = 0.25;
const GRAVITY = 0.012;

/** Keyboard key set */
type KeyMap = Record<string, boolean>;

/** Live position reported to the page overlay */
export interface CharacterPos {
  x: number;
  y: number;
  z: number;
}

export default function Character3D({
  posRef,
}: {
  posRef?: { current: CharacterPos };
}) {
  const groupRef = useRef<Group>(null!);

  // Vertical velocity for the jump
  const velYRef = useRef(0);

  // Load the GLTF model
  const { scene, animations } = useGLTF("/models/run2.glb");
  const { actions } = useAnimations(animations, groupRef);

  // Track pressed keys
  const [keys, setKeys] = useState<KeyMap>({});

  // --- Keyboard event listeners ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keep Space from scrolling the page
      if (e.code === "Space") e.preventDefault();
      setKeys((prev) => ({ ...prev, [e.code]: true }));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.code]: false }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- Auto-play the "run" animation ---
  useEffect(() => {
    const action = actions?.[Object.keys(actions ?? {})[0]];
    if (action) {
      action.reset().play();
    }
  }, [actions]);

  // --- Per-frame movement logic ---
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    let dx = 0;
    let dz = 0;

    // WASD
    if (keys["KeyW"] || keys["ArrowUp"]) dz -= SPEED;
    if (keys["KeyS"] || keys["ArrowDown"]) dz += SPEED;
    if (keys["KeyA"] || keys["ArrowLeft"]) dx -= SPEED;
    if (keys["KeyD"] || keys["ArrowRight"]) dx += SPEED;

    // Only move & rotate when there is actual input
    if (dx !== 0 || dz !== 0) {
      group.position.x += dx;
      group.position.z += dz;

      // Face the movement direction (radians)
      group.rotation.y = Math.atan2(dx, dz);
    }

    // --- Jump (Space): launch when on the ground, then apply gravity ---
    if (keys["Space"] && group.position.y <= 0) {
      velYRef.current = JUMP_SPEED;
    }
    if (group.position.y > 0 || velYRef.current !== 0) {
      group.position.y += velYRef.current;
      velYRef.current -= GRAVITY;
      if (group.position.y <= 0) {
        group.position.y = 0;
        velYRef.current = 0;
      }
    }

    // Report live position to the overlay
    if (posRef) {
      posRef.current.x = group.position.x;
      posRef.current.y = group.position.y;
      posRef.current.z = group.position.z;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}
