import {Application, Assets, Sprite} from 'pixi.js';

// PixiJS v8 앱 인스턴스 생성
const app = new Application({
    width: 500,
    height: 500,
    backgroundColor: 0x1099bb,
});

// PixiJS v8 비동기 초기화
await app.init({
    // background: '#1099bb',
    resizeTo: null
});

// 캔버스 엘리먼트를 DOM에 추가
document.body.appendChild(app.canvas);

// 샘플 텍스처 로드 및 스프라이트 생성
const texture = await Assets.load('https://pixijs.com/assets/bunny.png');
const bunny = new Sprite(texture);

// 스프라이트 중앙 배치 및 앵커 설정
bunny.anchor.set(0.5);
bunny.x = app.screen.width / 2;
bunny.y = app.screen.height / 2;

app.stage.addChild(bunny);

// 애니메이션 루프
app.ticker.add((time) => {
    bunny.rotation += 0.01 * time.deltaTime;
});
