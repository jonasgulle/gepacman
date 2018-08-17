$(function() {
	const width = 1080;
	const height = 1920;
	var board;

	let app = new PIXI.Application({width: width, height: height});
	app.renderer.autoResize = true;
	document.body.appendChild(app.view);

	window.addEventListener('resize', resize);

	function resize() {
		// Resize the renderer
		//app.renderer.resize(window.innerWidth, window.innerHeight);
	}

	function loadAssets() {
		let directory = "assets";
		let assets = [
			"blueghost.png",
			"cherry.png",
			"pacdot.png",
			"pinkghost.png",
			"redghost.png",
			"board.png",
			"pacman.png",
			"realmap.png",
			"yellowghost.png"
		];

		PIXI.loader
			.add(assets.map(a => directory + "/" + a))
			.on("progress", loadProgress)
			.load(setup);
	}

	function lerp(v0, v1, t) {
		return v0 * (1 - t) + v1 * t;
	}

	function drawPacDotsLineX(sx, dx, y, num) {
		for (var i = 0; i < num; i++) {
			dot = new PIXI.Sprite(PIXI.loader.resources["assets/pacdot.png"].texture);
			dot.x = lerp(sx, dx, i / num);
			dot.y = y;
			app.stage.addChild(dot);
		}
	}

	function drawPacDotsLineY(sy, dy, x, num) {
		for (var i = 0; i < num; i++) {
			dot = new PIXI.Sprite(PIXI.loader.resources["assets/pacdot.png"].texture);
			dot.x = x;
			dot.y = lerp(sy, dy, i / num);
			app.stage.addChild(dot);
		}
	}


	function loadProgress() {
		let percentLoaded = this.progress.toFixed(0);
	}

	function setup() {
		board = new PIXI.Sprite(PIXI.loader.resources["assets/board.png"].texture);
		app.stage.addChild(board);

		drawPacDotsLineX(60, 1060, 1600, 25);
		drawPacDotsLineX(60, 1060, 1273, 25);
		drawPacDotsLineX(60, 1060, 857, 25);

		drawPacDotsLineY(600, 1920, 265, 35);
		drawPacDotsLineY(600, 1920, 510, 35);
		drawPacDotsLineY(600, 1920, 728, 35);
	}

	loadAssets();

});
