import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  RingGeometry,
  type Material,
} from "three";
import type { ScenarioConfig } from "@silo/engine";
import { SHAFT_DIMENSIONS as D, createShaftLayout, type ShaftLayout } from "./layout";

// Matte desaturated decor materials only (D-05): concrete, steel, rock.
const concrete = new MeshStandardMaterial({ color: 0x969080, roughness: 0.96, side: DoubleSide });
const slab = new MeshStandardMaterial({ color: 0x9faaa4, roughness: 0.96 });
const steel = new MeshStandardMaterial({ color: 0x3f4847, roughness: 0.85 });
const rock = new MeshStandardMaterial({ color: 0x4a4540, roughness: 1, side: DoubleSide });

type Vec3 = [number, number, number];

const addBox = (parent: Group, position: Vec3, size: Vec3, material: Material): Mesh => {
  const mesh = new Mesh(new BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
};

/** Full parapet along the helix: one continuous strip from the top to the bottom of the stair. */
const helicalParapet = (layout: ShaftLayout, radius: number): Mesh => {
  const half = 0.11;
  const segments = layout.totalSteps;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = i * layout.stepAngle;
    const y = layout.topY - (i / D.stepsPerLevel) * D.levelHeight;
    for (const r of [radius - half, radius + half])
      for (const yy of [y - 0.23, y - 0.23 + D.parapetHeight])
        positions.push(Math.cos(angle) * r, yy, Math.sin(angle) * r);
    if (i === segments) continue;
    const b = i * 4;
    indices.push(
      b, b + 4, b + 5, b, b + 5, b + 1,
      b + 2, b + 3, b + 7, b + 2, b + 7, b + 6,
      b + 1, b + 5, b + 7, b + 1, b + 7, b + 3,
      b, b + 2, b + 6, b, b + 6, b + 4,
    ); // prettier-ignore
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new Mesh(geometry, concrete);
};

const buildStairs = (layout: ShaftLayout): Group => {
  const group = new Group();
  // Wedge step (an annulus slice), instanced along the helix: 30 per level, a half turn per level.
  const half = layout.stepAngle * 0.51;
  const coords: number[] = [];
  for (const y of [-0.18, 0])
    for (const r of [D.stairInnerRadius, D.stairOuterRadius])
      for (const a of [-half, half]) coords.push(r * Math.cos(a), y, r * Math.sin(a));
  const stepGeometry = new BufferGeometry();
  stepGeometry.setAttribute("position", new Float32BufferAttribute(coords, 3));
  stepGeometry.setIndex([
    4, 7, 6, 4, 5, 7, 0, 2, 3, 0, 3, 1, 0, 5, 4, 0, 1, 5, 2, 7, 3, 2, 6, 7, 0, 6, 2, 0, 4, 6, 1, 7, 5, 1, 3, 7,
  ]); // prettier-ignore
  stepGeometry.computeVertexNormals();
  const steps = new InstancedMesh(stepGeometry, concrete, layout.totalSteps);
  const matrix = new Matrix4();
  for (let i = 0; i < layout.totalSteps; i++) {
    const y = layout.topY - (i / D.stepsPerLevel) * D.levelHeight;
    steps.setMatrixAt(i, matrix.makeRotationY(-i * layout.stepAngle).setPosition(0, y, 0));
  }
  group.add(steps);
  group.add(helicalParapet(layout, D.stairInnerRadius), helicalParapet(layout, D.stairOuterRadius));
  return group;
};

const buildLevel = (layout: ShaftLayout, level: number): Group => {
  const group = new Group();
  group.position.y = layout.levelY(level);
  // Annular walkway between the shaft void and the outer wall.
  group.add(
    new Mesh(new RingGeometry(D.shaftRadius, D.wallRadius, 72).rotateX(-Math.PI / 2), slab),
  );
  // Landing bridge, one per level, alternating 0 / 180 degrees (D-08).
  const bridge = new Group();
  bridge.rotation.y = -layout.bridgeAngle(level);
  const length = D.bridgeEnd - D.bridgeStart;
  const middle = (D.bridgeStart + D.bridgeEnd) / 2;
  addBox(
    bridge,
    [middle, -D.slabThickness / 2, 0],
    [length, D.slabThickness, D.bridgeWidth],
    concrete,
  );
  for (const side of [-1, 1])
    addBox(
      bridge,
      [middle, D.guardrailHeight / 2, (side * D.bridgeWidth) / 2],
      [length, D.guardrailHeight, 0.08],
      steel,
    );
  group.add(bridge);
  // Arteries: radial corridors from the outer wall, one per configured angle.
  const arteryMiddle = D.wallRadius + D.arteryLength / 2;
  for (const angle of layout.arteryAngles) {
    const artery = new Group();
    artery.rotation.y = -angle;
    addBox(
      artery,
      [arteryMiddle, -D.slabThickness / 2, 0],
      [D.arteryLength, D.slabThickness, D.arteryWidth],
      slab,
    );
    for (const side of [-1, 1])
      addBox(
        artery,
        [arteryMiddle, D.arteryHeight / 2, (side * D.arteryWidth) / 2],
        [D.arteryLength, D.arteryHeight, 0.2],
        concrete,
      );
    group.add(artery);
  }
  return group;
};

/** Builds the static shaft decor from the scenario: core, stair, landings, bridges, walkways, arteries. */
export const buildShaft = (config: ScenarioConfig): Group => {
  const layout = createShaftLayout(config);
  const shaft = new Group();
  const height = layout.topY + D.levelHeight;
  const centerY = layout.topY / 2;
  const core = new Mesh(new CylinderGeometry(D.coreRadius, D.coreRadius, height, 48), concrete);
  core.position.y = centerY;
  shaft.add(core);
  const wall = new Mesh(
    new CylinderGeometry(D.wallRadius, D.wallRadius, height, 64, 1, true),
    rock,
  );
  wall.position.y = centerY;
  shaft.add(wall);
  shaft.add(buildStairs(layout));
  for (let level = 0; level < layout.levels; level++) shaft.add(buildLevel(layout, level));
  return shaft;
};
