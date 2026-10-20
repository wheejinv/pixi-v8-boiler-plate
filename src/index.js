import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";

// https://gsap.com/docs/v3/Plugins/PixiPlugin/
gsap.registerPlugin(PixiPlugin);

// main.js 를 동적 import하여 순서 보장
await import("./main.js");