'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { FBXLoader, SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

// Simple test view: split layout with the model only
function TestModel() {
  const fbx = useLoader(FBXLoader, '/Silly Dancing.fbx');
  const clonedFbx = useMemo(() => SkeletonUtils.clone(fbx), [fbx]);

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedFbx);
    const size = box.getSize(new THREE.Vector3());
    return size.y > 0 ? 5 / size.y : 1;
  }, [clonedFbx]);

  useEffect(() => {
    const clip = clonedFbx.animations[0];
    if (clip) {
      const mixer = new THREE.AnimationMixer(clonedFbx);
      const action = mixer.clipAction(clip);
      action.play();

      const animate = () => {
        mixer.update(0.016);
      };

      return () => {
        mixer.stopAllAction();
      };
    }
  }, [clonedFbx]);

  return <primitive object={clonedFbx} scale={scale} />;
}

function CameraSetup() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(-2, 3, 8);
    camera.lookAt(-1, 2, 0);
  }, [camera]);

  return null;
}

export default function FbxViewer() {
  return (
    <div className="relative h-screen w-full">
      <div className="flex h-full w-full">
        {/* Left: 3D model */}
        <div className="relative h-full w-1/2 bg-gray-900">
          <Canvas>
            <CameraSetup />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <TestModel />
            <OrbitControls target={[-1, 2, 0]} />
          </Canvas>
        </div>

        {/* Right: reserved area */}
        <div className="flex h-full w-1/2 items-center justify-center border-l-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center text-gray-400">
            <div className="mb-4 text-6xl">📐</div>
            <p className="text-lg font-medium">Reserved Area</p>
            <p className="mt-2 text-sm">For placing another model</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute right-4 top-4 z-10 w-40 rounded-lg bg-white/90 p-4 text-sm shadow-lg backdrop-blur">
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded bg-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-300"
        >
          Replay
        </button>
      </div>
    </div>
  );
}
