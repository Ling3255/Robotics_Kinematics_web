export default function Page() {
  return <div className="p-8" />;
}
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>2-Link IK Demo — Click to set target</title>
  <style>
    body { margin: 0; font-family: system-ui, Arial; overflow: hidden; }
    #ui { position: absolute; left: 12px; top: 12px; background: rgba(255,255,255,0.94); padding: 10px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.18); z-index: 2; }
    #ui label { display: inline-flex; align-items: center; gap: 6px; user-select: none; }
    #status { margin-top: 8px; font-weight: 600; }
    #angles { margin-top: 6px; font-size: 13px; }
    button { margin-left: 8px; }
    canvas { display: block; }
  </style>
</head>
<body>
  <div id="ui">
    <div>
      <label><input id="elbow" type="checkbox"> Elbow Up</label>
      <button id="reset">Reset Target</button>
    </div>
    <div id="status">Click anywhere on the plane to set the target.</div>
    <div id="angles">θ1: <span id="t1">—</span>°, θ2: <span id="t2">—</span>°</div>
  </div>

  <script src="https://unpkg.com/three@0.152.2/build/three.min.js"></script>
  <script>
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f6f6);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, -160, 120);
    camera.up.set(0,0,1);
    camera.lookAt(0,0,0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(0,0,100);
    scene.add(dir);

    // Arm lengths
    const l1 = 50;
    const l2 = 80;

    // Workspace rings
    const rmax = l1 + l2;
    const rmin = Math.abs(l1 - l2);

    // Outer ring
    const outerGeo = new THREE.CircleGeometry(rmax, 256);
    // Remove center vertex from CircleGeometry to keep only perimeter: use the vertices from index 1 onward
    const outerMat = new THREE.LineDashedMaterial({ color: 0xcccccc, dashSize: 6, gapSize: 4, linewidth: 1 });
    const outerPoints = outerGeo.attributes.position.array;
    const outerPts = [];
    for (let i = 3; i < outerPoints.length; i += 3) outerPts.push(new THREE.Vector3(outerPoints[i], outerPoints[i+1], outerPoints[i+2]));
    const outerLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(outerPts), outerMat);
    outerLine.computeLineDistances();
    outerLine.rotation.x = Math.PI / 2;
    scene.add(outerLine);

    // Inner ring
    const innerGeo = new THREE.CircleGeometry(rmin, 256);
    const innerMat = new THREE.LineDashedMaterial({ color: 0xeeeeee, dashSize: 4, gapSize: 2, linewidth: 1 });
    const innerPoints = innerGeo.attributes.position.array;
    const innerPts = [];
    for (let i = 3; i < innerPoints.length; i += 3) innerPts.push(new THREE.Vector3(innerPoints[i], innerPoints[i+1], innerPoints[i+2]));
    const innerLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(innerPts), innerMat);
    innerLine.computeLineDistances();
    innerLine.rotation.x = Math.PI / 2;
    scene.add(innerLine);

    // Grid helper (on plane)
    const grid = new THREE.GridHelper(300, 30, 0xdddddd, 0xeeeeee);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    // Arm lines (two segments) created once and updated
    const armMat = new THREE.LineBasicMaterial({ color: 0x333399, linewidth: 3 });
    const geom1 = new THREE.BufferGeometry();
    const pos1 = new Float32Array(6); // 2 points * 3
    geom1.setAttribute('position', new THREE.BufferAttribute(pos1, 3));
    const line1 = new THREE.Line(geom1, armMat);
    scene.add(line1);

    const geom2 = new THREE.BufferGeometry();
    const pos2 = new Float32Array(6);
    geom2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
    const line2 = new THREE.Line(geom2, armMat);
    scene.add(line2);

    // Joints and end effector
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x333399 });
    const sphereGeo = new THREE.SphereGeometry(3.5, 16, 12);
    const joint0 = new THREE.Mesh(sphereGeo, jointMat);
    const joint1 = new THREE.Mesh(sphereGeo, jointMat);
    const eff = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshStandardMaterial({ color: 0x339933 }));
    scene.add(joint0, joint1, eff);

    // Target marker
    const targetMatReach = new THREE.MeshStandardMaterial({ color: 0x007700 });
    const targetMatUnreach = new THREE.MeshStandardMaterial({ color: 0xaa0000 });
    const targetSphere = new THREE.Mesh(new THREE.SphereGeometry(4.5, 12, 12), targetMatReach);
    targetSphere.position.set(80, 0, 0);
    scene.add(targetSphere);

    // UI elements
    const elCheckbox = document.getElementById('elbow');
    const t1span = document.getElementById('t1');
    const t2span = document.getElementById('t2');
    const status = document.getElementById('status');
    document.getElementById('reset').addEventListener('click', () => {
      target.set(80, 0, 0);
      updateFromTarget();
    });
    elCheckbox.addEventListener('change', () => updateFromTarget());

    // Raycaster & plane
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0,0,1), 0);

    function getPointerWorld(x, y) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((x - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((y - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const pos = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, pos);
      return pos;
    }

    renderer.domElement.addEventListener('pointerdown', (ev) => {
      const p = getPointerWorld(ev.clientX, ev.clientY);
      if (p) {
        target.copy(p);
        updateFromTarget();
      }
    });

    // IK solver for planar 2-link arm
    function solve2LinkIK(x, y, l1, l2, elbowUp) {
      const d = Math.hypot(x, y);
      const rmax = l1 + l2;
      const rmin = Math.abs(l1 - l2);
      // unreachable if outside annulus or at origin when rmin>0
      if (d > rmax || d < rmin || d === 0) return { reachable: false, d };
      let cos2 = (x*x + y*y - l1*l1 - l2*l2) / (2 * l1 * l2);
      cos2 = Math.max(-1, Math.min(1, cos2));
      let theta2 = Math.acos(cos2);
      if (elbowUp) theta2 = -theta2;
      const k1 = l1 + l2 * Math.cos(theta2);
      const k2 = l2 * Math.sin(theta2);
      const theta1 = Math.atan2(y, x) - Math.atan2(k2, k1);
      return { reachable: true, theta1, theta2, d };
    }

    // Update arm line positions in-place for better performance
    function setSegmentPositions(jx, jy, ex, ey) {
      // line1: origin -> elbow
      pos1[0] = 0; pos1[1] = 0; pos1[2] = 0;
      pos1[3] = jx; pos1[4] = jy; pos1[5] = 0;
      geom1.attributes.position.needsUpdate = true;
      // line2: elbow -> end
      pos2[0] = jx; pos2[1] = jy; pos2[2] = 0;
      pos2[3] = ex; pos2[4] = ey; pos2[5] = 0;
      geom2.attributes.position.needsUpdate = true;
    }

    // State
    let target = new THREE.Vector3(80, 0, 0);
    let reachable = true;

    function updateFromTarget() {
      const ik = solve2LinkIK(target.x, target.y, l1, l2, elCheckbox.checked);
      reachable = ik.reachable;
      // always move target marker to the clicked point (z=0)
      targetSphere.position.set(target.x, target.y, 0);
      if (!reachable) {
        status.textContent = 'Target unreachable';
        targetSphere.material = targetMatUnreach;
        // do not move the arm or update angles when unreachable
        t1span.textContent = '—';
        t2span.textContent = '—';
      } else {
        status.textContent = 'Target reachable';
        targetSphere.material = targetMatReach;
        const th1 = ik.theta1;
        const th2 = ik.theta2;
        t1span.textContent = (th1 * 180 / Math.PI).toFixed(1);
        t2span.textContent = (th2 * 180 / Math.PI).toFixed(1);

        // joint & end positions
        const jx = l1 * Math.cos(th1);
        const jy = l1 * Math.sin(th1);
        const ex = jx + l2 * Math.cos(th1 + th2);
        const ey = jy + l2 * Math.sin(th1 + th2);

        joint0.position.set(0,0,0);
        joint1.position.set(jx, jy, 0);
        eff.position.set(ex, ey, 0);

        setSegmentPositions(jx, jy, ex, ey);
      }
    }

    // Initialize arm: stretched along +X toward initial target
    (function initArm() {
      const ik = solve2LinkIK(target.x, target.y, l1, l2, false);
      if (ik.reachable) {
        const th1 = ik.theta1;
        const th2 = ik.theta2;
        const jx = l1 * Math.cos(th1);
        const jy = l1 * Math.sin(th1);
        const ex = jx + l2 * Math.cos(th1 + th2);
        const ey = jy + l2 * Math.sin(th1 + th2);
        joint0.position.set(0,0,0);
        joint1.position.set(jx, jy, 0);
        eff.position.set(ex, ey, 0);
        setSegmentPositions(jx, jy, ex, ey);
        t1span.textContent = (th1 * 180 / Math.PI).toFixed(1);
        t2span.textContent = (th2 * 180 / Math.PI).toFixed(1);
        status.textContent = 'Target reachable';
        targetSphere.material = targetMatReach;
      } else {
        status.textContent = 'Initial target unreachable';
        targetSphere.material = targetMatUnreach;
      }
    })();

    // Render loop
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Optional: allow dragging target while pointer moves with button pressed
    let dragging = false;
    renderer.domElement.addEventListener('pointerdown', (ev) => { dragging = true; });
    window.addEventListener('pointerup', () => { dragging = false; });
    renderer.domElement.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      const p = getPointerWorld(ev.clientX, ev.clientY);
      if (p) {
        target.copy(p);
        updateFromTarget();
      }
    });

    // prevent context menu on canvas to make interactions smoother
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  </script>
</body>
</html>
