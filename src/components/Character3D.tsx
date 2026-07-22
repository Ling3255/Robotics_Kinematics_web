"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import type { Group } from "three";

const SPEED = 0.08;

type KeyMap = Record<string, boolean>;

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
  const logicalPosRef = useRef<CharacterPos>({ x: 0, y: 0, z: 0 });

  const { scene, animations } = useGLTF("/models/run2.glb");
  const { actions } = useAnimations(animations, groupRef);

  const [keys, setKeys] = useState<KeyMap>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  useEffect(() => {
    const action = actions?.[Object.keys(actions ?? {})[0]];
    if (action) {
      action.reset().play();
    }
  }, [actions]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    let dx = 0;
    let dy = 0;
    let dz = 0;

    if (keys["KeyW"] || keys["ArrowUp"]) dy -= SPEED;
    if (keys["KeyS"] || keys["ArrowDown"]) dy += SPEED;
    if (keys["KeyA"] || keys["ArrowLeft"]) dx -= SPEED;
    if (keys["KeyD"] || keys["ArrowRight"]) dx += SPEED;

    if (keys["Space"]) dz += SPEED;
    if (keys["ShiftLeft"] || keys["ShiftRight"]) dz -= SPEED;

    logicalPosRef.current.x += dx;
    logicalPosRef.current.y += dy;
    logicalPosRef.current.z += dz;

    group.position.set(
      logicalPosRef.current.x,
      logicalPosRef.current.z,
      logicalPosRef.current.y,
    );

    if (dx !== 0 || dy !== 0) {
      group.rotation.y = Math.atan2(dx, dy);
    }

    if (posRef) {
      posRef.current.x = logicalPosRef.current.x;
      posRef.current.y = logicalPosRef.current.y;
      posRef.current.z = logicalPosRef.current.z;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}