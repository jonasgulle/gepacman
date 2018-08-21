const gameWidth = 1080;
const gameHeight = 1920;

// Spelplanen är 250 meter bred och 350 meter hög

// Distance in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
	var R = 6371000; // m
	var dLat = (lat2 - lat1).toRad();
	var dLon = (lon2 - lon1).toRad();
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
			Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c;
	return d;
}

Number.prototype.toRad = function() {
	return this * Math.PI / 180;
}

function lerp(v0, v1, t) {
	return v0 * (1 - t) + v1 * t;
}

// Calculate snapGrid:
function calculateSnapGrid() {
	/*
		Det kommer att bli en naiv approach genom att jag kommer att interpolera
		alla gators lat/lng i tusen punkter, fem verticala linjer och fem horisontella
		linjer med hundra punkter vardera. Pacman kommer sedan att "snappa" till den
		närmaste punkten. Detta kommer göra att man inte kan gömma sig i parker etc.

		Miniature map

		  G  I  K
		xx|xx|xx|xxx
		xx|xx|xx|xxx
	   A--+--+--+---B
		xx|xx|xx|xxx
		xx|xx|pp|xxx
		xx|xx|pp|xxx
	   C--+--+--+---D
		xx|xx|xx|xxx
		xx|xx|xx|xxx
	   E--+--+--+---F
		xx|pp|xx|ttt
		xx|pp|xx|ttt
		  H  J  L
	*/	
	var a = { x: 37,   y: 861,  lat: 62.389415, lon: 17.301815 },
		b = { x: 1053, y: 861,  lat: 62.391632, lon: 17.302909 },
		c = { x: 37,   y: 1279, lat: 62.389211, lon: 17.303724 },
		d = { x: 1053, y: 1279, lat: 62.391394, lon: 17.304851 },
		e = { x: 37,   y: 1605, lat: 62.389052, lon: 17.305226 },
		f = { x: 1053, y: 1605, lat: 62.39123,  lon: 17.306374 },

		g = { x: 269,  y: 593,  lat: 62.390056, lon: 17.30087 },
		h = { x: 269,  y: 1891, lat: 62.38945,  lon: 17.306793 },
		i = { x: 514,  y: 593,  lat: 62.390573, lon: 17.301106 },
		j = { x: 514,  y: 1891, lat: 62.389917, lon: 17.307104 },
		k = { x: 731,  y: 593,  lat: 62.391085, lon: 17.301332 },
		l = { x: 731,  y: 1891, lat: 62.390374, lon: 17.307372 };

	const POINTS = 100;

	// Interpolate everyting between these points
	var snapPoints = [[a, b], [c, d], [e, f], [g, h], [i, j], [k, l]],
		snapGridResult = [];

	for (var p = 0; p < snapPoints.length; p++) {
		var p1 = snapPoints[p][0],
			p2 = snapPoints[p][1];

		for (var i = 0; i <= POINTS; i++) {
			var gridPoint = {
				lat: lerp(p1.lat, p2.lat, i / POINTS),
				lon: lerp(p1.lon, p2.lon, i / POINTS),
				  x: Math.round(lerp(p1.x, p2.x, i / POINTS)),
				  y: Math.round(lerp(p1.y, p2.y, i / POINTS))
			};
			snapGridResult.push(gridPoint);
		}
	}

	return snapGridResult;
}

$(function() {
	// Sprites
	var board,
		pacman,
		gameover,
		pacdots = [],
		ghosts = [],
		pacmanSpeed = 2;

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
		Sprite = PIXI.Sprite,
		snapGrid = calculateSnapGrid();

	if (navigator.geolocation) {
		navigator.geolocation.watchPosition(
			newPosition,
			errorPosition,
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 0
			}
		);
	} else {
		alert("Sorry! Cannot access the GPS on your device");
	}

	/*let keyRight = keyboard(39),
		keyLeft = keyboard(37),
		keyUp = keyboard(38),
		keyDown = keyboard(40);

	keyRight.press = () => {
		pacman.vx = pacmanSpeed;
		pacman.vy = 0;
	};

	keyRight.release = () => {
		if (!keyLeft.isDown && pacman.vy === 0) {
			pacman.vx = 0;
		}
	}

	keyLeft.press = () => {
		pacman.vx = -pacmanSpeed;
		pacman.vy = 0;
	};

	keyLeft.release = () => {
		if (!keyRight.isDown && pacman.vy === 0) {
			pacman.vx = 0;
		}
	}

	keyUp.press = () => {
		pacman.vx = 0;
		pacman.vy = -pacmanSpeed;
	};

	keyUp.release = () => {
		if (!keyDown.isDown && pacman.vx === 0) {
			pacman.vy = 0;
		}
	}

	keyDown.press = () => {
		pacman.vx = 0;
		pacman.vy = pacmanSpeed;
	};

	keyDown.release = () => {
		if (!keyUp.isDown && pacman.vx === 0) {
			pacman.vy = 0;
		}
	}*/

	let app = new Application({width: gameWidth, height: gameHeight});
	app.renderer.autoResize = true;
	document.body.appendChild(app.view);

	window.addEventListener('resize', resize);
	function resize() {
		scaleScene(app.renderer, app.stage);
	}

	resize();
	/*setInterval(function() {
		resize();
	}, 2000);*/

	/*setTimeout(function() {
		newPosition({ coords: { latitude: 62.390703, longitude: 17.304507, heading: 270 } });
	}, 3000);*/

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
		let ghostSpeed = 1;
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
		pacman.position.set(894, 1432);
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

		setInterval(function() { resize(); }, 2000);

		startTime = new Date();
	}

	function gameLoop(delta) {
		//pacman.x += pacman.vx;
		//pacman.y += pacman.vy;
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
				//gameover.visible = true;
				//pacman.visible = false;
			}
		});

		timeElapsed = (Date.parse(new Date()) - Date.parse(startTime)) / 1000;
		timeText.text = ('0' + Math.floor(timeElapsed / 60)).slice(-2) + ":"
					  + ('0' + (timeElapsed % 60)).slice(-2);
	}

	/*function keyboard(keyCode) {
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
	}*/

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

	function newPosition(position) {
		var closestDistance = 10000,
			closestPoint;

		console.log(position.coords);

		for (var i = 0; i < snapGrid.length; i++) {
			var gp = snapGrid[i];
			var distance = calculateDistance(gp.lat, gp.lon, position.coords.latitude, position.coords.longitude);
			if (distance < closestDistance) {
				closestPoint = gp;
				closestDistance = distance;
			}
		}

		pacman.position.set(closestPoint.x, closestPoint.y);
		pacman.rotation = (position.coords.heading / 360.0);
	}

	function errorPosition(error) {
		alert("Error getting GPS position");
	}

	loadAssets();

});
