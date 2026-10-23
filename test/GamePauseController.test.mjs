import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { gsap } from "gsap";
import { Ticker, UPDATE_PRIORITY } from "pixi.js";
import GamePauseController from "../src/GamePauseController.js";

let now;
let nextFrame;
let frames;
let ticker;
const originalRAF = globalThis.requestAnimationFrame;
const originalCancelRAF = globalThis.cancelAnimationFrame;
const originalPerformance = globalThis.performance;

function frame(milliseconds) {
	now += milliseconds;
	const callbacks = [...frames.values()];
	frames.clear();
	callbacks.forEach((callback) => callback(now));
}

function tweenTo(target, options = {}) {
	return gsap.to(target, { value: 100, duration: 1, ease: "none", ...options });
}

beforeEach(() => {
	now = 1000;
	nextFrame = 0;
	frames = new Map();
	globalThis.requestAnimationFrame = (callback) => {
		frames.set(++nextFrame, callback);
		return nextFrame;
	};
	globalThis.cancelAnimationFrame = (id) => frames.delete(id);
	globalThis.performance = { now: () => now };
	ticker = new Ticker();
	GamePauseController.init(ticker);
});

afterEach(() => {
	gsap.globalTimeline.clear();
	GamePauseController.destroy();
	ticker.destroy();
	gsap.ticker.sleep();
	globalThis.requestAnimationFrame = originalRAF;
	globalThis.cancelAnimationFrame = originalCancelRAF;
	globalThis.performance = originalPerformance;
});

test("GSAP → game update → render 순서로 같은 프레임을 처리한다", () => {
	const target = { value: 0 };
	const order = [];
	tweenTo(target, { onUpdate: () => order.push("gsap") });
	ticker.add(() => {
		assert.equal(target.value, 5);
		order.push("update");
	});
	ticker.add(() => order.push("render"), null, UPDATE_PRIORITY.LOW);

	GamePauseController.resume();
	frame(50);

	assert.deepEqual(order, ["gsap", "update", "render"]);
});

test("static pause/resume으로 tween과 update를 정지하고 정지 시간을 제외한다", () => {
	const target = { value: 0 };
	let updates = 0;
	tweenTo(target);
	ticker.add(() => updates++);
	GamePauseController.resume();
	frame(50);
	GamePauseController.pause();
	GamePauseController.pause();

	frame(60_000);
	gsap.ticker.tick();
	assert.equal(target.value, 5);
	assert.equal(updates, 1);
	assert.equal(ticker.started, false);
	assert.equal(GamePauseController.isPaused, true);

	GamePauseController.resume();
	GamePauseController.resume();
	frame(50);
	assert.equal(target.value, 10);
	assert.equal(updates, 2);
	assert.equal(GamePauseController.isPaused, false);
});

test("배속은 PixiJS delta와 GSAP tween에 한 번씩 적용된다", () => {
	const target = { value: 0 };
	let gameTime = 0;
	tweenTo(target);
	ticker.add((tick) => {
		gameTime += tick.deltaMS;
	});
	GamePauseController.setSpeed(0.5).resume();
	frame(100);
	assert.equal(target.value, 5);
	assert.equal(gameTime, 50);

	GamePauseController.setSpeed(2);
	frame(100);
	assert.equal(target.value, 25);
	assert.equal(gameTime, 250);

	GamePauseController.setSpeed(0);
	frame(100);
	assert.equal(target.value, 25);
	assert.equal(gameTime, 250);
	assert.throws(() => GamePauseController.setSpeed(-1), RangeError);
	assert.throws(() => GamePauseController.setSpeed(NaN), RangeError);
});

test("개별 pause 상태를 유지하고 정지 중 생성된 tween과 delayedCall도 동기화한다", () => {
	const held = { value: 0 };
	const created = { value: 0 };
	tweenTo(held, { paused: true });
	GamePauseController.resume();
	frame(50);
	GamePauseController.pause();

	let calls = 0;
	tweenTo(created);
	gsap.delayedCall(0.1, () => calls++);
	frame(60_000);
	gsap.ticker.tick();
	assert.equal(created.value, 0);
	assert.equal(calls, 0);

	GamePauseController.resume();
	frame(100);
	assert.equal(held.value, 0);
	assert.equal(created.value, 10);
	assert.equal(calls, 1);
});

test("긴 프레임에서도 PixiJS의 delta 제한과 tween 진행량이 일치한다", () => {
	const target = { value: 0 };
	tweenTo(target);
	ticker.minFPS = 20;
	GamePauseController.resume();
	frame(5000);
	assert.equal(ticker.deltaMS, 50);
	assert.equal(target.value, 5);
});

test("전역 시계의 중복 소유를 막고 destroy 후 자동 구동을 복원한다", () => {
	const target = { value: 0 };
	tweenTo(target);
	GamePauseController.resume();
	frame(100);
	assert.throws(() => GamePauseController.init(ticker), /이미 초기화/);
	const time = gsap.globalTimeline.totalTime();

	GamePauseController.destroy();
	GamePauseController.destroy();
	assert.equal(ticker.count, 0);
	assert.equal(ticker.started, false);
	assert.equal(gsap.globalTimeline.totalTime(), time);
	gsap.updateRoot(gsap.ticker.time + 0.05);
	assert.ok(Math.abs(target.value - 15) < 0.001);

	GamePauseController.init(ticker);
	GamePauseController.resume();
	frame(50);
	assert.ok(Math.abs(target.value - 20) < 0.001);
});
