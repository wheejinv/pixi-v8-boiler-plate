import { gsap } from "gsap";
import GamePauseController from "./GamePauseController";

// PixiJS v8 앱 인스턴스 생성
const app = new PIXI.Application();

// PixiJS v8 비동기 초기화
await app.init({
	width: 500,
	height: 500,
	backgroundColor: 0x1099bb,
	resizeTo: null,
	autoStart: false,
	sharedTicker: false,
});

// tween과 게임 update를 등록하기 전에 공통 시계를 연결한다.
GamePauseController.init(app.ticker);

// 캔버스 엘리먼트를 DOM에 추가
document.body.appendChild(app.canvas);

// 샘플 텍스처 로드 및 스프라이트 생성
const texture = await PIXI.Assets.load("https://pixijs.com/assets/bunny.png");
const bunny = new PIXI.Sprite(texture);

// 스프라이트 중앙 배치 및 앵커 설정
bunny.anchor.set(0.5);
bunny.x = app.screen.width / 2;
bunny.y = app.screen.height / 2;

app.stage.addChild(bunny);

// gsap 와 ticker 와 속도 로직을 동기화 하고, pause, resume, 속도 조정기능등을 테스트 한다.
// GSAP은 좌우 이동, PixiJS update는 회전을 담당한다.
gsap.to(bunny, {
	x: app.screen.width - 50,
	duration: 2,
	repeat: -1,
	yoyo: true,
	ease: "sine.inOut",
});

// 애니메이션 루프
app.ticker.add((time) => {
	bunny.rotation += 0.01 * time.deltaTime;
});

document.querySelector("#game-speed").addEventListener("change", (event) => {
	GamePauseController.setSpeed(Number(event.target.value));
});

// 등록을 마친 뒤 최초 프레임을 시작한다.
GamePauseController.resume();
