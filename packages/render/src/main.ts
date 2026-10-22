import {
  AmbientLight,
  Color,
  DirectionalLight,
  FogExp2,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { starterSilo } from "@silo/engine";
import { buildShaft, createShaftLayout } from "./shaft";

// Static shaft decor generated from the scenario configuration (D-05 style, D-08 dimensions).
const config = starterSilo;
const layout = createShaftLayout(config);

const scene = new Scene();
scene.background = new Color(0x26333b);
scene.fog = new FogExp2(0x26333b, 0.005);
scene.add(new AmbientLight(0x9cbbcb, 0.9));
const key = new DirectionalLight(0xffedce, 2.1);
key.position.set(18, 45, 22);
scene.add(key);
scene.add(buildShaft(config));

const camera = new PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);
const target = new Vector3(0, layout.topY * 0.7, 0);
camera.position.set(0, layout.topY + 6, 30);
camera.lookAt(target);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => renderer.render(scene, camera));
