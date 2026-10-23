import { gsap } from "gsap";
import { UPDATE_PRIORITY } from "pixi.js";

/**
 * PixiJS v8 ticker의 시간으로 GSAP 3 전역 timeline을 구동합니다.
 * 실행 순서: GSAP(HIGH: 25) → 게임 update(NORMAL: 0) → render(LOW: -25).
 * init(app.ticker) → tween/update 등록 → resume() 순서로 사용합니다.
 * gsap.ticker.add()의 별도 리스너는 연동 대상이 아닙니다.
 */
export default class GamePauseController {
	/** @type {import("pixi.js").Ticker | null} */
	static _ticker = null;
	static _isPaused = true;
	// GSAP에 전달할 누적 시각(초)입니다.
	static _time = 0;

	/** @param {import("pixi.js").Ticker} ticker app.init()이 완료된 앱의 ticker입니다. */
	static init(ticker) {
		if (this._ticker) {
			throw new Error("GamePauseController가 이미 초기화되어 있습니다.");
		}

		this._ticker = ticker;
		this._isPaused = !ticker.started;
		// 기존 GSAP 재생 위치에 해당하는 시각부터 누적합니다.
		const root = gsap.globalTimeline;
		this._time = root.startTime() + root.totalTime() / (root.timeScale() || 1);

		// GSAP 자동 갱신을 제거하고 PixiJS 프레임에서만 tween을 갱신합니다.
		gsap.ticker.remove(gsap.updateRoot);
		gsap.ticker.sleep();
		ticker.add(this._update, this, UPDATE_PRIORITY.HIGH);
		return this;
	}

	// speed가 0인 상태와 ticker가 정지된 상태는 구분합니다.
	static get isPaused() {
		return this._isPaused;
	}

	static get speed() {
		return this._ticker.speed;
	}

	// PixiJS update/render가 멈추면 GSAP 누적 시간도 증가하지 않습니다.
	static pause() {
		this._isPaused = true;
		this._ticker.stop();
		gsap.ticker.sleep();
		return this;
	}

	static resume() {
		this._isPaused = false;
		// ticker 기준 시각만 재설정하므로 정지 중의 시간은 누적하지 않습니다.
		this._ticker.start();
		return this;
	}

	static toggle() {
		return this._isPaused ? this.resume() : this.pause();
	}

	// 0.5: 절반, 1: 기본, 2: 두 배. 0은 update/render를 유지하며 시간만 멈춥니다.
	static setSpeed(speed) {
		if (!Number.isFinite(speed) || speed < 0) {
			throw new RangeError("speed는 0 이상의 유한한 숫자여야 합니다.");
		}

		// ticker.speed는 deltaTime과 deltaMS에 반영됩니다.
		// GSAP도 같은 deltaMS를 누적하므로 별도 timeScale을 적용하지 않습니다.
		this._ticker.speed = speed;
		return this;
	}

	// PixiJS 연결을 해제하고 GSAP 자동 구동을 복원합니다. tween은 별도로 kill합니다.
	static destroy() {
		if (!this._ticker) return;

		this.pause();
		this._ticker.remove(this._update, this);
		this._ticker = null;
		this._time = 0;

		// 시계 전환 시 재생 위치를 유지하고 콜백 재실행을 막습니다.
		const time = gsap.globalTimeline.totalTime();
		gsap.ticker.wake();
		gsap.globalTimeline.totalTime(time, true);
		gsap.ticker.add(gsap.updateRoot);
	}

	static _update(ticker) {
		if (this._isPaused || !this._ticker) return;

		// 배속과 minFPS 제한이 반영된 deltaMS를 초로 누적해 GSAP에 전달합니다.
		this._time += ticker.deltaMS / 1000;
		gsap.updateRoot(this._time);
	}
}
