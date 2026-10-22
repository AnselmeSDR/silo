// THROWAWAY prototype (SIL-12): 2 000 instanced silhouettes, frame-time measure.
// Query params: mode=render|both, shadows=0|1, warmup=5, duration=60.
import {
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { World, entityCount, stats } from "../../engine/src/proto/sim";

const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? "render";
const shadows = params.get("shadows") === "1";
const warmup = Number(params.get("warmup") ?? 5) * 1000;
const duration = Number(params.get("duration") ?? 60) * 1000;

const scene = new Scene();
scene.background = new Color(0x1a1a1c);
const camera = new PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500);
camera.position.set(45, 55, 45);
camera.lookAt(0, 20, 0);
const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = shadows;
document.body.appendChild(renderer.domElement);

scene.add(new HemisphereLight(0xcfd6e0, 0x302820, 0.8));
const sun = new DirectionalLight(0xffe2b8, 1.2);
sun.position.set(30, 80, 20);
sun.castShadow = shadows;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -10;
scene.add(sun);

// Decor: 12 level slabs (ring floors), just enough geometry to light and shadow.
const slabGeometry = new CylinderGeometry(18.5, 18.5, 0.3, 48);
const slabMaterial = new MeshStandardMaterial({ color: 0x6b655d, roughness: 1 });
for (let l = 0; l < 12; l++) {
  const slab = new Mesh(slabGeometry, slabMaterial);
  slab.position.y = l * 4.2 - 0.15;
  slab.receiveShadow = shadows;
  scene.add(slab);
}
const core = new Mesh(new CylinderGeometry(2.65, 2.65, 50, 24), slabMaterial);
core.position.y = 25;
scene.add(core);

// Silhouette = body + head + legs, three instanced meshes sharing one matrix per entity.
const body = new InstancedMesh(
  new CapsuleGeometry(0.22, 0.7, 2, 6),
  new MeshStandardMaterial({ roughness: 0.9 }),
  entityCount,
);
const head = new InstancedMesh(
  new SphereGeometry(0.14, 8, 6),
  new MeshStandardMaterial({ color: 0xc9a98a, roughness: 0.9 }),
  entityCount,
);
const legs = new InstancedMesh(
  new CapsuleGeometry(0.16, 0.5, 2, 6),
  new MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.9 }),
  entityCount,
);
const jobColors = [0xe8604c, 0xf5a623, 0x2e86de, 0x9b6bd6, 0x7fd6e8, 0x6fbf73, 0xd6d64a, 0xbdbdbd];
const world = new World(42);
const color = new Color();
for (let i = 0; i < entityCount; i++) body.setColorAt(i, color.setHex(jobColors[world.job[i]!]!));
for (const m of [body, head, legs]) {
  m.castShadow = shadows;
  m.instanceMatrix.setUsage(35048); // DynamicDrawUsage
  m.frustumCulled = false;
  scene.add(m);
}

const matrix = new Matrix4();
const quat = new Quaternion();
const up = new Vector3(0, 1, 0);
const pos = new Vector3();
const scale = new Vector3(1, 1, 1);
function updateInstances(): void {
  for (let i = 0; i < entityCount; i++) {
    quat.setFromAxisAngle(up, world.heading[i]!);
    const x = world.x[i]!;
    const y = world.y[i]!;
    const z = world.z[i]!;
    matrix.compose(pos.set(x, y + 0.85, z), quat, scale);
    body.setMatrixAt(i, matrix);
    matrix.compose(pos.set(x, y + 1.6, z), quat, scale);
    head.setMatrixAt(i, matrix);
    matrix.compose(pos.set(x, y + 0.35, z), quat, scale);
    legs.setMatrixAt(i, matrix);
  }
  body.instanceMatrix.needsUpdate = true;
  head.instanceMatrix.needsUpdate = true;
  legs.instanceMatrix.needsUpdate = true;
}

// Warm the world so positions are spread, then freeze it in "render" mode.
for (let s = 0; s < 30; s++) world.step();

const frames: number[] = [];
const steps: number[] = [];
const intervals: number[] = [];
let prev = 0;
const start = performance.now();
let done = false;

renderer.setAnimationLoop((now) => {
  if (done) return;
  const t0 = performance.now();
  if (mode === "both") {
    world.step();
    steps.push(performance.now() - t0);
  }
  updateInstances();
  renderer.render(scene, camera);
  // Force the GPU to finish so the frame cost is not hidden by async submit.
  renderer.getContext().finish();
  const t1 = performance.now();
  const elapsed = now - start;
  if (elapsed >= warmup) {
    frames.push(t1 - t0);
    if (prev) intervals.push(now - prev);
  }
  prev = now;
  if (elapsed >= warmup + duration) {
    done = true;
    const gl = renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    (window as unknown as { __result: unknown }).__result = {
      kind: "render-instanced",
      mode,
      shadows,
      entities: entityCount,
      instances: entityCount * 3,
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown",
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      unit: "ms/frame (cpu update + submit + gl.finish)",
      frame: stats(frames),
      step: mode === "both" ? stats(steps) : null,
      interval: stats(intervals),
    };
  }
});
