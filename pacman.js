$(function() {
	const gameWidth = 1080;
	const gameHeight = 1920;

	// Sprites
	var board,
		pacman,
		gameover,
		pacdots = [],
		ghosts = [];

	// Sounds
	var eating,
		die,
		siren;

	// Game state
	var score = 0,
		scoreText = new PIXI.Text("0", { fontFamily: "Courier", fontSize: 80, fill: "white", fontWeight: "bold" }),
		timeText = new PIXI.Text("00:00", { fontFamily: "Courier", fontSize: 80, fill: "white", fontWeight: "bold" }),
		startTime,
		timeElapsed;

	let Application = PIXI.Application,
		resources = PIXI.loader.resources,
		loader = PIXI.loader,
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
			"gameover.png",
			"pacman.png",
			"realmap.png",
			"ready.png",
			"yellowghost.png"
		];

		sounds.load([
			"assets/eat-pill.mp3",
			"assets/eat-fruit.mp3",
			"assets/eating.mp3",
			"assets/ready.mp3",
			"assets/siren.mp3",
			"assets/die.mp3"
		]);
		sounds.whenLoaded = function() {};

		eating = sounds["assets/eating.mp3"];
		siren = sounds["assets/siren.mp3"];
		die = sounds["assets/die.mp3"];

		loader.add(assets.map(a => directory + "/" + a))
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
		let ghostSpeed = 2;
		var ghostData = [
			{ name: "blue", x: 234, y: 580, vy: ghostSpeed, vx: 0 },
			{ name: "pink", x: 700, y: 880, vy: ghostSpeed, vx: 0 },
			{ name: "yellow", x: 480, y: 1240, vy: 0, vx: -ghostSpeed },
			{ name: "red", x: 20, y: 1564, vy: 0, vx: ghostSpeed }
		];

		board = new Sprite(resources["assets/board.png"].texture);
		app.stage.addChild(board);
		app.stage.addChild(scoreText);
		app.stage.addChild(timeText);

		scoreText.position.set(650, 390);
		timeText.position.set(184, 390);

		drawPacDotsLineX(60, 1060, 1600, 25, [5, 11, 17]);
		drawPacDotsLineX(60, 1060, 1273, 25, [5, 17]);
		drawPacDotsLineX(60, 1060, 857, 25, [5, 11]);

		drawPacDotsLineY(591, 1920, 265, 35);
		drawPacDotsLineY(591, 1920, 510, 35, [18]);
		drawPacDotsLineY(591, 1920, 728, 35, [7]);

		pacman = new Sprite(resources["assets/pacman.png"].texture);
		pacman.position.set(733, 1880);
		pacman.vx = 0;
		pacman.vy = 0;
		pacman.anchor.set(0.5, 0.5);
		app.stage.addChild(pacman);

		ghostData.forEach(function(g) {
			var ghost = new Sprite(resources["assets/" + g.name + "ghost.png"].texture);
			ghost.position.set(g.x, g.y);
			app.stage.addChild(ghost);
			ghost.data = g;
			ghosts.push(ghost);
		});

		gameover = new Sprite(resources["assets/gameover.png"].texture);
		gameover.position.set(350, 900);
		gameover.visible = false;
		app.stage.addChild(gameover);

		app.ticker.add(delta => gameLoop(delta));

		startTime = new Date();
	}

	function gameLoop(delta) {
		pacman.x += pacman.vx;
		pacman.y += pacman.vy;
		pacman.rotation += 0.1;
		pacdots.forEach(function(dot) {
			if (dot.visible && hitTestRectangle(dot, pacman)) {
				dot.visible = false;
				score += 100;
				scoreText.text = score;
				eating.play();
			}
		});

		// Update ghost position and bounds checking
		ghosts.forEach(function(ghost) {
			ghost.x += ghost.data.vx;
			ghost.y += ghost.data.vy;
			if (ghost.x < 20 || ghost.x > gameWidth - (ghost.width + 20))
				ghost.data.vx = -ghost.data.vx;
			if (ghost.y < 560 || ghost.y > gameHeight - (ghost.height + 20))
				ghost.data.vy = -ghost.data.vy;
		});

		ghosts.forEach(function(ghost) {
			if (die.playing === false && hitTestRectangle(ghost, pacman)) {
				die.play();
				ghost.visible = false;
				gameover.visible = true;
				pacman.visible = false;
			}
		});

		timeElapsed = (Date.parse(new Date()) - Date.parse(startTime)) / 1000;
		timeText.text = ('0' + Math.floor(timeElapsed / 60)).slice(-2) + ":"
					  + ('0' + (timeElapsed % 60)).slice(-2);
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
