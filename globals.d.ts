// webpack.config.js 에서 PIXI 를 전역으로 export 하고 있고 해당 파일은 ide 에서도 PIXI 를 사용할 수 있게 보조함.

declare const PIXI: typeof import('pixi.js');
