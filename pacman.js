$(function() {
	const gameWidth = 1080;
	const gameHeight = 1920;
	var board,
		pacman,
		pacdots = [];

	let Application = PIXI.Application,
		resources = PIXI.loader.resources,
		Sprite = PIXI.Sprite;

	let keyRight = keyboard(39),
		keyLeft = keyboard(37),
		keyUp = keyboard(38),
		keyDown = keyboard(40);

	keyRight.press = () => {
		pacman.vx = 2;
		pacman.vy = 0;
	};

	keyRight.release = () => {
		if (!keyLeft.isDown && pacman.vy === 0) {
			pacman.vx = 0;
		}
	}

	keyLeft.press = () => {
		pacman.vx = -2;
		pacman.vy = 0;
	};

	keyLeft.release = () => {
		if (!keyRight.isDown && pacman.vy === 0) {
			pacman.vx = 0;
		}
	}

	keyUp.press = () => {
		pacman.vx = 0;
		pacman.vy = -2;
	};

	keyUp.release = () => {
		if (!keyDown.isDown && pacman.vx === 0) {
			pacman.vy = 0;
		}
	}

	keyDown.press = () => {
		pacman.vx = 0;
		pacman.vy = 2;
	};

	keyDown.release = () => {
		if (!keyUp.isDown && pacman.vx === 0) {
			pacman.vy = 0;
		}
	}

	let app = new Application({width: gameWidth, height: gameHeight});
	app.renderer.autoResize = true;
	document.body.appendChild(app.view);

	window.addEventListener('resize', resize);

	setTimeout(function() {
		resize();
	}, 2000);

	function resize() {
		scaleScene(app.renderer, app.stage);
	}
	resize();

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

	function drawPacDotsLineX(sx, dx, y, num, skipList) {
		for (var i = 0; i < num; i++) {
			if (skipList !== undefined && skipList.length > 0 && i === skipList[0]) {
				skipList.shift();
				continue;
			}
			dot = new Sprite(resources["assets/pacdot.png"].texture);
			dot.position.set(lerp(sx, dx, i / num), y);
			app.stage.addChild(dot);
			pacdots.push(dot);
		}
	}

	// Draw pac dots on a line, skip pac dots indices in skipList.
	function drawPacDotsLineY(sy, dy, x, num, skipList) {
		for (var i = 0; i < num; i++) {
			if (skipList !== undefined && skipList.length > 0 && i === skipList[0]) {
				skipList.shift();
				continue;
			}
			dot = new Sprite(resources["assets/pacdot.png"].texture);
			dot.position.set(x, lerp(sy, dy, i / num));
			app.stage.addChild(dot);
			pacdots.push(dot);
		}
	}

	function loadProgress() {
		let percentLoaded = this.progress.toFixed(0);
	}

	function setup() {
		board = new Sprite(resources["assets/board.png"].texture);
		app.stage.addChild(board);

		drawPacDotsLineX(60, 1060, 1600, 25);
		drawPacDotsLineX(60, 1060, 1273, 25);
		drawPacDotsLineX(60, 1060, 857, 25, [5, 11, 18]);

		drawPacDotsLineY(591, 1920, 265, 35);
		drawPacDotsLineY(591, 1920, 510, 35);
		drawPacDotsLineY(591, 1920, 728, 35, [7]);

		pacman = new Sprite(resources["assets/pacman.png"].texture);
		pacman.position.set(733, 1880);
		pacman.vx = 0;
		pacman.vy = 0;
		pacman.anchor.set(0.5, 0.5);

		app.stage.addChild(pacman);
		app.ticker.add(delta => gameLoop(delta));
	}

	function gameLoop(delta) {
		pacman.x += pacman.vx;
		pacman.y += pacman.vy;
		pacman.rotation += 0.1;
		pacdots.forEach(function(dot) {
			if (hitTestRectangle(dot, pacman)) {
				dot.visible = false;
			}
		});
	}

	function keyboard(keyCode) {
		let key = {};
		key.code = keyCode;
		key.isDown = false;
		key.isUp = true;
		key.press = undefined;
		key.release = undefined;

		key.downHandler = event => {
			if (event.keyCode === key.code) {
				if (key.isUp && key.press) key.press();
				key.isDown = true;
				key.isUp = false;
			}
			event.preventDefault();
		};

		key.upHandler = event => {
			if (event.keyCode === key.code) {
				if (key.isDown && key.release) key.release();
				key.isDown = false;
				key.isUp = true;
			}
			event.preventDefault();
		};

		//Attach event listeners
		window.addEventListener(
			"keydown", key.downHandler.bind(key), false
		);

		window.addEventListener(
			"keyup", key.upHandler.bind(key), false
		);

		return key;
	}

	function hitTestRectangle(r1, r2) {
		// Define the variables we'll need to calculate
		let hit, combinedHalfWidths, combinedHalfHeights, vx, vy;

		// Hit will determine whether there's a collision
		hit = false;

		// Find the center points of each sprite
		r1.centerX = r1.x + r1.width / 2 - r1.anchor.x * r1.width;
		r1.centerY = r1.y + r1.height / 2 - r1.anchor.y * r1.height;
		r2.centerX = r2.x + r2.width / 2 - r2.anchor.x * r2.width;
		r2.centerY = r2.y + r2.height / 2 - r2.anchor.y * r2.height;

		// Find the half-widths and half-heights of each sprite
		r1.halfWidth = r1.width / 2;
		r1.halfHeight = r1.height / 2;
		r2.halfWidth = r2.width / 2;
		r2.halfHeight = r2.height / 2;

		// Calculate the distance vector between the sprites
		vx = r1.centerX - r2.centerX;
		vy = r1.centerY - r2.centerY;

		// Figure out the combined half-widths and half-heights
		combinedHalfWidths = r1.halfWidth + r2.halfWidth;
		combinedHalfHeights = r1.halfHeight + r2.halfHeight;

		// Check for a collision on the x axis
		if (Math.abs(vx) < combinedHalfWidths) {

			// A collision might be occuring. Check for a collision on the y axis
			if (Math.abs(vy) < combinedHalfHeights) {
				// There's definitely a collision happening
				hit = true;
			} else {
				// There's no collision on the y axis
				hit = false;
			}
		} else {
			// There's no collision on the x axis
			hit = false;
		}

		//`hit` will be either `true` or `false`
		return hit;
	};

	function scaleScene(renderer, sceneContainer) {
		var r = calculateAspectRatioFit(gameWidth, gameHeight, window.innerWidth, window.innerHeight);
		console.log(r);
		sceneContainer.scale.x = r.width / gameWidth;
		sceneContainer.scale.y = r.height / gameHeight;
		renderer.resize(r.width, r.height);
	}

	function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
		var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
		return { width: srcWidth * ratio, height: srcHeight * ratio };
	}

	loadAssets();

});
