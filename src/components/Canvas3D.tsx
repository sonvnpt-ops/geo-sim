import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Move, RotateCw, Maximize2, Trash2 } from 'lucide-react';
import { buildSolidGeometry, SolidMeshBuildResult } from '../math/geometry3d';
import {
  Geo3DObject,
  Intersection3DSummary,
  TransformMode,
} from '../types/geometry';

export interface Canvas3DHandle {
  exportPng: () => void;
  setCameraPreset: (preset: 'iso' | 'front' | 'top' | 'side') => void;
}

interface Canvas3DProps {
  objects: Geo3DObject[];
  selectedIds: string[];
  transformMode: TransformMode;
  intersections: Intersection3DSummary;
  showGrid: boolean;
  showAxes: boolean;
  isDark: boolean;
  onChangeTransformMode: (mode: TransformMode) => void;
  onSelect: (ids: string[]) => void;
  onUpdateObjectTransform: (
    id: string,
    pos: { x: number; y: number; z: number },
    rot: { x: number; y: number; z: number },
    scale: { x: number; y: number; z: number },
    commitHistory: boolean,
  ) => void;
  onDeleteSelected: () => void;
}

interface LabelEntry {
  key: string;
  text: string;
  worldPos: THREE.Vector3;
  color?: string;
}

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh || (child as THREE.Line).isLine) {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material?.dispose();
      }
    }
  });
}

export const Canvas3D = forwardRef<Canvas3DHandle, Canvas3DProps>(function Canvas3D(
  {
    objects,
    selectedIds,
    transformMode,
    intersections,
    showGrid,
    showAxes,
    isDark,
    onChangeTransformMode,
    onSelect,
    onUpdateObjectTransform,
    onDeleteSelected,
  },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [labelItems, setLabelItems] = useState<{ key: string; text: string }[]>([]);
  const [contextLost, setContextLost] = useState(false);
  const [webglUnsupported, setWebglUnsupported] = useState(false);

  // Refs for stable access inside Three.js lifecycle
  const propsRef = useRef({
    objects,
    selectedIds,
    onSelect,
    onUpdateObjectTransform,
    onChangeTransformMode,
    onDeleteSelected,
  });
  propsRef.current = {
    objects,
    selectedIds,
    onSelect,
    onUpdateObjectTransform,
    onChangeTransformMode,
    onDeleteSelected,
  };

  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    orbit: OrbitControls;
    transform: TransformControls;
    objectsGroup: THREE.Group;
    intersectionsGroup: THREE.Group;
    gridHelper: THREE.GridHelper;
    axesGroup: THREE.Group;
    groundShadow: THREE.Mesh;
    objectMap: Map<
      string,
      {
        group: THREE.Group;
        pickTargets: THREE.Object3D[];
        solidData?: SolidMeshBuildResult;
        geomSig: string;
      }
    >;
    labelEntries: LabelEntry[];
    isDraggingGizmo: boolean;
    activeDragId: string | null;
    cameraTargetGoal: THREE.Vector3 | null;
    cameraPosGoal: THREE.Vector3 | null;
    requestRender: () => void;
  } | null>(null);

  const updateCameraPreset = useCallback((preset: 'iso' | 'front' | 'top' | 'side') => {
    const ctx = threeRef.current;
    if (!ctx) return;
    ctx.cameraTargetGoal = new THREE.Vector3(0, 1.4, 0);
    if (preset === 'iso') {
      ctx.cameraPosGoal = new THREE.Vector3(6.8, 5.4, 7.6);
    } else if (preset === 'front') {
      ctx.cameraPosGoal = new THREE.Vector3(0, 2.2, 10.5);
    } else if (preset === 'top') {
      ctx.cameraPosGoal = new THREE.Vector3(0.01, 11.5, 0.01);
    } else if (preset === 'side') {
      ctx.cameraPosGoal = new THREE.Vector3(10.5, 2.2, 0);
    }
    ctx.requestRender();
  }, []);

  useImperativeHandle(ref, () => ({
    exportPng: () => {
      const ctx = threeRef.current;
      if (!ctx) return;
      ctx.renderer.render(ctx.scene, ctx.camera);
      const link = document.createElement('a');
      link.download = `geosim-3d-${Date.now()}.png`;
      link.href = ctx.renderer.domElement.toDataURL('image/png');
      link.click();
    },
    setCameraPreset: updateCameraPreset,
  }));

  // Initialize Three.js Scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglUnsupported(true);
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F8FAFC');
    scene.fog = new THREE.Fog('#F8FAFC', 22, 52);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      44,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      120,
    );
    camera.position.set(6.8, 5.4, 7.6);

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x94a3b8, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    keyLight.position.set(7, 12, 8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.6);
    rimLight.position.set(-8, 6, -7);
    scene.add(rimLight);

    // Ground Grid & Axes
    const gridHelper = new THREE.GridHelper(20, 20, 0x94a3b8, 0xcbd5e1);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.45;
    scene.add(gridHelper);

    // Soft contact ground shadow receiver
    const shadowPlaneGeo = new THREE.PlaneGeometry(20, 20);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.1 });
    const groundShadow = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    groundShadow.position.y = -0.005;
    groundShadow.receiveShadow = true;
    scene.add(groundShadow);

    // Custom clean Oxyz Axes
    const axesGroup = new THREE.Group();
    const makeAxis = (dir: THREE.Vector3, color: number) => {
      const pts = [new THREE.Vector3(0, 0.01, 0), dir.clone().multiplyScalar(5.5)];
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.78 });
      const line = new THREE.Line(g, m);
      const coneGeo = new THREE.ConeGeometry(0.08, 0.28, 12);
      const coneMat = new THREE.MeshBasicMaterial({ color });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(dir.clone().multiplyScalar(5.5));
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      axesGroup.add(line, cone);
    };
    makeAxis(new THREE.Vector3(1, 0, 0), 0xef4444); // Ox Red
    makeAxis(new THREE.Vector3(0, 1, 0), 0x10b981); // Oy Green (Vertical height)
    makeAxis(new THREE.Vector3(0, 0, 1), 0x3b82f6); // Oz Blue
    scene.add(axesGroup);

    const objectsGroup = new THREE.Group();
    const intersectionsGroup = new THREE.Group();
    scene.add(objectsGroup, intersectionsGroup);

    // OrbitControls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 1.4, 0);
    orbit.enableDamping = !isSoftwareGl;
    orbit.dampingFactor = 0.08;
    orbit.minDistance = 2.5;
    orbit.maxDistance = 32;
    orbit.update();

    // TransformControls (Gizmo)
    const transform = new TransformControls(camera, renderer.domElement);
    transform.setSize(0.85);
    scene.add(transform.getHelper());

    // Coalesced On-Demand Render Loop
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    const _projVec = new THREE.Vector3();

    const updateProjectedLabels = () => {
      const state = threeRef.current;
      if (!state) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      for (const entry of state.labelEntries) {
        const el = labelRefs.current.get(entry.key);
        if (!el) continue;
        _projVec.copy(entry.worldPos).project(camera);
        if (_projVec.z > 1 || _projVec.z < -1) {
          el.style.opacity = '0';
          continue;
        }
        const sx = (_projVec.x * 0.5 + 0.5) * w;
        const sy = (-_projVec.y * 0.5 + 0.5) * h;
        el.style.opacity = '1';
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      }
    };

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        const st = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        renderDirty = false;
        const dt = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;

        const state = threeRef.current;
        let needsAnotherFrame = false;

        if (state && state.cameraPosGoal && state.cameraTargetGoal) {
          const factor = 1 - Math.exp(-8 * dt);
          camera.position.lerp(state.cameraPosGoal, factor);
          orbit.target.lerp(state.cameraTargetGoal, factor);
          if (
            camera.position.distanceTo(state.cameraPosGoal) < 0.02 &&
            orbit.target.distanceTo(state.cameraTargetGoal) < 0.02
          ) {
            camera.position.copy(state.cameraPosGoal);
            orbit.target.copy(state.cameraTargetGoal);
            state.cameraPosGoal = null;
            state.cameraTargetGoal = null;
          } else {
            needsAnotherFrame = true;
          }
        }

        const orbitMoved = orbit.update();
        if (orbitMoved && !isSoftwareGl) {
          needsAnotherFrame = true;
        }

        renderer.render(scene, camera);
        updateProjectedLabels();

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsAnotherFrame) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    threeRef.current = {
      renderer,
      scene,
      camera,
      orbit,
      transform,
      objectsGroup,
      intersectionsGroup,
      gridHelper,
      axesGroup,
      groundShadow,
      objectMap: new Map(),
      labelEntries: [],
      isDraggingGizmo: false,
      activeDragId: null,
      cameraTargetGoal: null,
      cameraPosGoal: null,
      requestRender,
    };

    orbit.addEventListener('change', requestRender);
    orbit.addEventListener('start', () => {
      if (threeRef.current) {
        threeRef.current.cameraPosGoal = null;
        threeRef.current.cameraTargetGoal = null;
      }
    });

    transform.addEventListener('dragging-changed', (event) => {
      const dragging = Boolean(event.value);
      orbit.enabled = !dragging;
      if (threeRef.current) {
        threeRef.current.isDraggingGizmo = dragging;
      }
    });

    transform.addEventListener('objectChange', () => {
      const state = threeRef.current;
      if (!state || !transform.object) return;
      const objId = transform.object.userData.geoId as string | undefined;
      if (!objId) return;
      state.activeDragId = objId;
      const p = transform.object.position;
      const r = transform.object.rotation;
      const s = transform.object.scale;
      propsRef.current.onUpdateObjectTransform(
        objId,
        { x: p.x, y: p.y, z: p.z },
        { x: r.x, y: r.y, z: r.z },
        { x: s.x, y: s.y, z: s.z },
        false,
      );
      requestRender();
    });

    transform.addEventListener('mouseUp', () => {
      const state = threeRef.current;
      if (!state || !transform.object) return;
      const objId = transform.object.userData.geoId as string | undefined;
      if (!objId) return;
      const p = transform.object.position;
      const r = transform.object.rotation;
      const s = transform.object.scale;
      state.activeDragId = null;
      propsRef.current.onUpdateObjectTransform(
        objId,
        { x: p.x, y: p.y, z: p.z },
        { x: r.x, y: r.y, z: r.z },
        { x: s.x, y: s.y, z: s.z },
        true,
      );
      requestRender();
    });

    // Raycast click-to-select (distinguish click vs orbit drag)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (threeRef.current?.isDraggingGizmo) return;
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const state = threeRef.current;
      if (!state) return;
      const pickables: THREE.Object3D[] = [];
      state.objectMap.forEach((entry) => {
        if (entry.group.visible) pickables.push(...entry.pickTargets);
      });

      const hits = raycaster.intersectObjects(pickables, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.geoId as string | undefined;
        if (hitId) {
          const curr = propsRef.current.selectedIds;
          if (e.shiftKey) {
            if (curr.includes(hitId)) {
              propsRef.current.onSelect(curr.filter((id) => id !== hitId));
            } else {
              propsRef.current.onSelect([...curr, hitId]);
            }
          } else {
            propsRef.current.onSelect([hitId]);
          }
          return;
        }
      }
      if (!e.shiftKey) {
        propsRef.current.onSelect([]);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // ResizeObserver for crisp viewport sizing
    const ro = new ResizeObserver(() => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    ro.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      transform.dispose();
      orbit.dispose();
      disposeObject3D(scene);
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      threeRef.current = null;
    };
  }, []);

  // Theme & Grid/Axes Sync
  useEffect(() => {
    const ctx = threeRef.current;
    if (!ctx) return;
    const bgHex = isDark ? '#0B1120' : '#F8FAFC';
    ctx.scene.background = new THREE.Color(bgHex);
    ctx.scene.fog = new THREE.Fog(bgHex, 22, 52);
    ctx.gridHelper.visible = showGrid;
    ctx.groundShadow.visible = showGrid;
    ctx.axesGroup.visible = showAxes;
    ctx.requestRender();
  }, [isDark, showGrid, showAxes]);

  // Sync TransformMode
  useEffect(() => {
    const ctx = threeRef.current;
    if (!ctx) return;
    ctx.transform.setMode(transformMode);
    ctx.requestRender();
  }, [transformMode]);

  // Sync Objects -> Three.js Scene
  useEffect(() => {
    const ctx = threeRef.current;
    if (!ctx) return;

    const currentIds = new Set(objects.map((o) => o.id));
    // Remove deleted objects
    ctx.objectMap.forEach((entry, id) => {
      if (!currentIds.has(id)) {
        if (ctx.transform.object === entry.group) {
          ctx.transform.detach();
        }
        ctx.objectsGroup.remove(entry.group);
        disposeObject3D(entry.group);
        ctx.objectMap.delete(id);
      }
    });

    const newLabelEntries: LabelEntry[] = [];

    for (const obj of objects) {
      const isSelected = selectedIds.includes(obj.id);
      const geomSig = `${obj.kind}|${JSON.stringify(obj.dimensions)}|${obj.color}|${obj.opacity}|${isSelected}|${isDark}`;
      let entry = ctx.objectMap.get(obj.id);

      if (!entry || entry.geomSig !== geomSig) {
        if (entry) {
          if (ctx.transform.object === entry.group) {
            ctx.transform.detach();
          }
          ctx.objectsGroup.remove(entry.group);
          disposeObject3D(entry.group);
        }

        const group = new THREE.Group();
        group.userData.geoId = obj.id;
        const pickTargets: THREE.Object3D[] = [];
        let solidData: SolidMeshBuildResult | undefined;

        const baseColor = new THREE.Color(obj.color);
        const edgeColor = isSelected
          ? new THREE.Color('#F59E0B')
          : isDark
            ? baseColor.clone().lerp(new THREE.Color('#FFFFFF'), 0.45)
            : baseColor.clone().lerp(new THREE.Color('#0F172A'), 0.35);

        if (obj.kind === 'point3d') {
          const sphereGeo = new THREE.SphereGeometry(0.14, 20, 16);
          const sphereMat = new THREE.MeshStandardMaterial({
            color: isSelected ? '#F59E0B' : baseColor,
            roughness: 0.3,
            metalness: 0.1,
          });
          const mesh = new THREE.Mesh(sphereGeo, sphereMat);
          mesh.userData.geoId = obj.id;
          group.add(mesh);
          pickTargets.push(mesh);
        } else if (obj.kind === 'line3d') {
          const halfLen = (obj.dimensions.height || 10) * 0.6;
          const pts = [new THREE.Vector3(0, -halfLen, 0), new THREE.Vector3(0, halfLen, 0)];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
          const lineMat = new THREE.LineBasicMaterial({
            color: isSelected ? '#F59E0B' : baseColor,
          });
          const line = new THREE.Line(lineGeo, lineMat);
          line.userData.geoId = obj.id;
          // Invisible cylinder hit proxy for easy clicking
          const hitCyl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, halfLen * 2, 8),
            new THREE.MeshBasicMaterial({ visible: false }),
          );
          hitCyl.userData.geoId = obj.id;
          group.add(line, hitCyl);
          pickTargets.push(hitCyl);
        } else if (obj.kind === 'plane3d') {
          const s = obj.dimensions.planeSize || 8;
          const hs = s / 2;
          const planeGeo = new THREE.PlaneGeometry(s, s);
          planeGeo.rotateX(-Math.PI / 2);
          const planeMat = new THREE.MeshPhysicalMaterial({
            color: baseColor,
            transparent: true,
            opacity: obj.opacity,
            roughness: 0.4,
            metalness: 0.05,
            side: THREE.DoubleSide,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
          });
          const planeMesh = new THREE.Mesh(planeGeo, planeMat);
          planeMesh.userData.geoId = obj.id;
          group.add(planeMesh);
          pickTargets.push(planeMesh);

          // Plane Grid & Crisp Border
          const gridPts: number[] = [];
          const div = 8;
          for (let i = 0; i <= div; i++) {
            const t = -hs + (s * i) / div;
            gridPts.push(-hs, 0, t, hs, 0, t);
            gridPts.push(t, 0, -hs, t, 0, hs);
          }
          const gridGeo = new THREE.BufferGeometry();
          gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
          const gridMat = new THREE.LineBasicMaterial({
            color: edgeColor,
            transparent: true,
            opacity: isSelected ? 0.85 : 0.45,
          });
          const gridLines = new THREE.LineSegments(gridGeo, gridMat);
          group.add(gridLines);

          // Border
          const borderGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-hs, 0, -hs),
            new THREE.Vector3(hs, 0, -hs),
            new THREE.Vector3(hs, 0, hs),
            new THREE.Vector3(-hs, 0, hs),
          ]);
          const borderMat = new THREE.LineBasicMaterial({
            color: isSelected ? '#F59E0B' : baseColor,
            transparent: true,
            opacity: 0.95,
          });
          group.add(new THREE.LineLoop(borderGeo, borderMat));
        } else {
          // 3D Solid (Polyhedron or Round Solid)
          solidData = buildSolidGeometry(obj);
          const faceMat = new THREE.MeshPhysicalMaterial({
            color: baseColor,
            transparent: true,
            opacity: obj.opacity,
            roughness: 0.35,
            metalness: 0.05,
            clearcoat: 0.25,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const solidMesh = new THREE.Mesh(solidData.geometry, faceMat);
          solidMesh.castShadow = true;
          solidMesh.userData.geoId = obj.id;
          group.add(solidMesh);
          pickTargets.push(solidMesh);

          // Visible edges (nét liền)
          const visEdgeMat = new THREE.LineBasicMaterial({
            color: edgeColor,
            transparent: true,
            opacity: 0.95,
            depthFunc: THREE.LessEqualDepth,
          });
          const visEdges = new THREE.LineSegments(solidData.edgeGeometry, visEdgeMat);
          group.add(visEdges);

          // Hidden occluded edges (nét đứt khuất)
          const hidEdgeMat = new THREE.LineDashedMaterial({
            color: edgeColor,
            transparent: true,
            opacity: 0.36,
            dashSize: 0.15,
            gapSize: 0.1,
            depthFunc: THREE.GreaterDepth,
            depthWrite: false,
          });
          const hidEdges = new THREE.LineSegments(solidData.edgeGeometry.clone(), hidEdgeMat);
          hidEdges.computeLineDistances();
          group.add(hidEdges);
        }

        ctx.objectsGroup.add(group);
        entry = { group, pickTargets, solidData, geomSig };
        ctx.objectMap.set(obj.id, entry);
      }

      // Update transform & visibility unless actively dragged by TransformControls
      entry.group.visible = obj.visible;
      if (!(ctx.isDraggingGizmo && ctx.activeDragId === obj.id)) {
        entry.group.position.set(obj.position.x, obj.position.y, obj.position.z);
        entry.group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z, 'XYZ');
        entry.group.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
        entry.group.updateMatrixWorld(true);
      } else {
        entry.group.updateMatrixWorld(true);
      }

      // Collect vertex labels for projection
      if (obj.visible && obj.showLabels) {
        if (obj.kind === 'point3d') {
          newLabelEntries.push({
            key: `${obj.id}_0`,
            text: obj.vertexLabels[0] ?? obj.name,
            worldPos: entry.group.position.clone().add(new THREE.Vector3(0, 0.22, 0)),
          });
        } else if (obj.kind === 'plane3d') {
          const hs = (obj.dimensions.planeSize || 8) * 0.44;
          const corner = new THREE.Vector3(hs, 0.08, hs).applyMatrix4(entry.group.matrixWorld);
          newLabelEntries.push({
            key: `${obj.id}_plane`,
            text: obj.name.replace('Mặt phẳng ', ''),
            worldPos: corner,
          });
        } else if (entry.solidData) {
          entry.solidData.vertices.forEach((v, idx) => {
            const worldV = v.localPos.clone().applyMatrix4(entry!.group.matrixWorld);
            newLabelEntries.push({
              key: `${obj.id}_${idx}`,
              text: v.label,
              worldPos: worldV,
            });
          });
        }
      }
    }

    // Attach TransformControls to primary selected object
    if (selectedIds.length >= 1) {
      const primary = ctx.objectMap.get(selectedIds[selectedIds.length - 1]);
      if (primary && primary.group.visible) {
        if (ctx.transform.object !== primary.group) {
          ctx.transform.attach(primary.group);
        }
      } else {
        ctx.transform.detach();
      }
    } else {
      ctx.transform.detach();
    }

    ctx.labelEntries = newLabelEntries;
    setLabelItems(newLabelEntries.map((e) => ({ key: e.key, text: e.text })));
    ctx.requestRender();
  }, [objects, selectedIds, isDark]);

  // Sync Real-Time Intersections -> Three.js IntersectionsGroup
  useEffect(() => {
    const ctx = threeRef.current;
    if (!ctx) return;

    while (ctx.intersectionsGroup.children.length > 0) {
      const child = ctx.intersectionsGroup.children[0];
      ctx.intersectionsGroup.remove(child);
      disposeObject3D(child);
    }

    // 1. Cross-Sections (Thiết diện Mặt phẳng ∩ Khối)
    for (const cs of intersections.crossSections) {
      // Filled cross-section polygon
      const csGeo = new THREE.BufferGeometry();
      csGeo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(cs.trianglePositions, 3),
      );
      csGeo.computeVertexNormals();
      const csMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.56,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const csMesh = new THREE.Mesh(csGeo, csMat);
      csMesh.renderOrder = 5;
      ctx.intersectionsGroup.add(csMesh);

      // Bold perimeter loops (visible solid + occluded dashed)
      for (const loop of cs.loops) {
        if (loop.length < 3) continue;
        const pts = loop.map((p) => new THREE.Vector3(p.x, p.y, p.z));
        pts.push(pts[0].clone());
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);

        const visLine = new THREE.Line(
          lineGeo,
          new THREE.LineBasicMaterial({
            color: 0xdc2626,
            depthFunc: THREE.LessEqualDepth,
          }),
        );
        visLine.renderOrder = 6;
        ctx.intersectionsGroup.add(visLine);

        const hidLine = new THREE.Line(
          lineGeo.clone(),
          new THREE.LineDashedMaterial({
            color: 0xdc2626,
            transparent: true,
            opacity: 0.55,
            dashSize: 0.14,
            gapSize: 0.09,
            depthFunc: THREE.GreaterDepth,
            depthWrite: false,
          }),
        );
        hidLine.computeLineDistances();
        hidLine.renderOrder = 6;
        ctx.intersectionsGroup.add(hidLine);

        // Corner markers for polyhedral vertices
        if (loop.length <= 10) {
          for (const v of loop) {
            const dot = new THREE.Mesh(
              new THREE.SphereGeometry(0.08, 12, 10),
              new THREE.MeshBasicMaterial({ color: 0xdc2626 }),
            );
            dot.position.set(v.x, v.y, v.z);
            dot.renderOrder = 7;
            ctx.intersectionsGroup.add(dot);
          }
        }
      }
    }

    // 2. Plane ∩ Plane Intersection Lines (Giao tuyến 2 mặt phẳng: nét liền + nét đứt khuất)
    for (const pl of intersections.planeLines) {
      const pts = [
        new THREE.Vector3(pl.start.x, pl.start.y, pl.start.z),
        new THREE.Vector3(pl.end.x, pl.end.y, pl.end.z),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const visLine = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color: 0xdc2626,
          depthFunc: THREE.LessEqualDepth,
        }),
      );
      visLine.renderOrder = 6;
      const hidLine = new THREE.Line(
        geo.clone(),
        new THREE.LineDashedMaterial({
          color: 0xdc2626,
          transparent: true,
          opacity: 0.5,
          dashSize: 0.18,
          gapSize: 0.12,
          depthFunc: THREE.GreaterDepth,
          depthWrite: false,
        }),
      );
      hidLine.computeLineDistances();
      hidLine.renderOrder = 6;
      ctx.intersectionsGroup.add(visLine, hidLine);
    }

    // 3. Line Hits (Giao điểm đường thẳng & mặt phẳng / khối)
    for (const lh of intersections.lineHits) {
      for (const pt of lh.points) {
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 14, 12),
          new THREE.MeshBasicMaterial({ color: 0xdc2626 }),
        );
        marker.position.set(pt.x, pt.y, pt.z);
        marker.renderOrder = 8;
        ctx.intersectionsGroup.add(marker);
      }
      for (const [sa, sb] of lh.interiorSegments) {
        const segGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(sa.x, sa.y, sa.z),
          new THREE.Vector3(sb.x, sb.y, sb.z),
        ]);
        const segLine = new THREE.Line(
          segGeo,
          new THREE.LineDashedMaterial({
            color: 0xdc2626,
            dashSize: 0.15,
            gapSize: 0.1,
            depthTest: false,
          }),
        );
        segLine.computeLineDistances();
        segLine.renderOrder = 7;
        ctx.intersectionsGroup.add(segLine);
      }
    }

    // 4. Solid ∩ Solid Seams
    for (const ss of intersections.solidSeams) {
      const pos: number[] = [];
      for (const [a, b] of ss.segments) {
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
      if (pos.length > 0) {
        const seamGeo = new THREE.BufferGeometry();
        seamGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const seamLines = new THREE.LineSegments(
          seamGeo,
          new THREE.LineBasicMaterial({ color: 0xdc2626 }),
        );
        seamLines.renderOrder = 7;
        ctx.intersectionsGroup.add(seamLines);
      }
    }

    ctx.requestRender();
  }, [intersections]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Isolated WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Projected Vertex Labels Overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {labelItems.map((item) => (
          <div
            key={item.key}
            ref={(el) => {
              if (el) labelRefs.current.set(item.key, el);
              else labelRefs.current.delete(item.key);
            }}
            className="absolute top-0 left-0 -ml-2 -mt-6 px-1.5 py-0.5 rounded text-[11px] font-display font-semibold bg-white/85 dark:bg-slate-900/85 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 shadow-xs will-change-transform"
            style={{ opacity: 0 }}
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* WebGL Context Lost / Unsupported Graceful Fallback */}
      {(contextLost || webglUnsupported) && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 p-6 text-center bg-slate-100/95 dark:bg-slate-900/95 text-sm text-slate-700 dark:text-slate-200">
          <span>
            {webglUnsupported
              ? 'Trình duyệt hoặc thiết bị hiện tại không hỗ trợ WebGL 3D. Vui lòng bật tăng tốc phần cứng hoặc chuyển sang chế độ 2D Phẳng.'
              : 'Đang khôi phục ngữ cảnh đồ họa 3D WebGL...'}
          </span>
        </div>
      )}

      {/* Contextual Floating Gizmo Toolbar when 3D object selected */}
      {selectedIds.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100%-1rem)] overflow-x-auto flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-sm text-xs">
          <button
            onClick={() => onChangeTransformMode('translate')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md font-medium whitespace-nowrap shrink-0 transition-colors ${
              transformMode === 'translate'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>
              Tịnh tiến <span className="hidden sm:inline">(G)</span>
            </span>
          </button>
          <button
            onClick={() => onChangeTransformMode('rotate')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md font-medium whitespace-nowrap shrink-0 transition-colors ${
              transformMode === 'rotate'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>
              Xoay <span className="hidden sm:inline">(R)</span>
            </span>
          </button>
          <button
            onClick={() => onChangeTransformMode('scale')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md font-medium whitespace-nowrap shrink-0 transition-colors ${
              transformMode === 'scale'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>
              Tỉ lệ <span className="hidden sm:inline">(S)</span>
            </span>
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />
          <button
            onClick={onDeleteSelected}
            title="Xóa đối tượng (Delete)"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 font-medium whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa
          </button>
        </div>
      )}

      {/* Compact Bottom-Left Camera View Presets */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 p-1 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm text-[11px] font-medium">
        <button
          onClick={() => updateCameraPreset('iso')}
          className="px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
        >
          Góc 3/4
        </button>
        <button
          onClick={() => updateCameraPreset('front')}
          className="px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
        >
          Trước
        </button>
        <button
          onClick={() => updateCameraPreset('top')}
          className="px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
        >
          Trên
        </button>
        <button
          onClick={() => updateCameraPreset('side')}
          className="px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
        >
          Cạnh
        </button>
      </div>
    </div>
  );
});
