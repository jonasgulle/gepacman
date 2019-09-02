const gameWidth = 1080;
const gameHeight = 1920;
var gameStarted = false,
	noSleep = new NoSleep();

$(function() {
	let searchParams = new URLSearchParams(window.location.search)
	if (searchParams.has("gcname")) {
		$("#username").val(searchParams.get("gcname"));
		$("#startGame").text("Restart ("+ searchParams.get("lives") +")!");
	}
	$("#startGame").click(function() {
		$("#register").hide();
		noSleep.enable();
		startGame();
	});
});

// The game board is 250x350 meters IRL.

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

function calculateSnapGrid() {
	/*
		This is my naive approach for the GPS navigation.
		I'm interpolating lines (x, y, lat, lng) for all streets in the map.
		Pac-Man will then "snap" to the closest point from the actual position.

		Miniature map

		M--G--I--K---P
		|xx|xx|xx|xxx|
		|xx|xx|xx|xxx|
		A--+--+--+---B
		|xx|xx|xx|xxx|
		|xx|xx|pp|xxx|
		|xx|xx|pp|xxx|
		C--+--+--+---D
		|xx|xx|xx|xxx|
		|xx|xx|xx|xxx|
		E--+--+--+---F
		|xx|pp|xx|ppp|
		|xx|pp|xx|ppp|
		N--H--J--L---O
	*/

		// Horizontal lines
	var a = { x: 37,   y: 861,  lat: 62.389415, lon: 17.301815 },
		b = { x: 1053, y: 861,  lat: 62.391632, lon: 17.302909 },
		c = { x: 37,   y: 1279, lat: 62.389211, lon: 17.303724 },
		d = { x: 1053, y: 1279, lat: 62.391394, lon: 17.304851 },
		e = { x: 37,   y: 1605, lat: 62.389052, lon: 17.305226 },
		f = { x: 1053, y: 1605, lat: 62.39123,  lon: 17.306374 },
		// Vertical lines
		g = { x: 269,  y: 593,  lat: 62.390056, lon: 17.30087 },
		h = { x: 269,  y: 1891, lat: 62.38945,  lon: 17.306793 },
		i = { x: 514,  y: 593,  lat: 62.390573, lon: 17.301106 },
		j = { x: 514,  y: 1891, lat: 62.389917, lon: 17.307104 },
		k = { x: 731,  y: 593,  lat: 62.391085, lon: 17.301332 },
		l = { x: 731,  y: 1891, lat: 62.390374, lon: 17.307372 },
		// Bounding box
		m = { x: 37,   y: 593,  lat: 62.389549, lon: 17.300591 },
		n = { x: 37,   y: 1891, lat: 62.388898, lon: 17.306525 },
		o = { x: 1053, y: 1891, lat: 62.391066, lon: 17.307737 },
		p = { x: 1053, y: 593,  lat: 62.391752, lon: 17.301772 },
		// The parks/squares (marked as p's which is used as safe zones)
		q = { x: 495,  y: 1611, lat: 62.390026, lon: 17.305763 },
		r = { x: 282,  y: 1887, lat: 62.389484, lon: 17.306771 }, 
		s = { x: 525,  y: 1008, lat: 62.390399, lon: 17.303059 }, 
		t = { x: 729,  y: 1260, lat: 62.390683, lon: 17.304443 }; 

	const POINTS = 80;

	// Interpolate everyting between these points
	var snapPoints = [[a, b], [c, d], [e, f], [g, h], [i, j], [k, l], [m, n], [n, o], [p, o], [m, p], [q, r], [s, t]],
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

function startGame() {
	// Sprites
	var board,
		realMap,
		mapMarker,
		pacman,
		gameover,
		winner,
		pacdots = [],
		pacdotsLeft,
		bigDotsEaten = 0,
		ghosts = [];

	// Sounds
	var eating,
		die,
		siren,
		music,
		musicInstance;

	// Game state
	var score = 0,
		scoreText = new PIXI.Text("0", { fontFamily: "Courier", fontSize: 80, fill: "white", fontWeight: "bold" }),
		timeText = new PIXI.Text("00:00", { fontFamily: "Courier", fontSize: 80, fill: "white", fontWeight: "bold" }),
		nameText = new PIXI.Text($("#username").val(), { fontFamily: "Courier", fontSize: 80, fill: "white", fontWeight: "bold" }),
		startTime,
		timeElapsed;

	let Application = PIXI.Application,
		resources = PIXI.loader.resources,
		loader = PIXI.loader,
		Sprite = PIXI.Sprite,
		snapGrid = calculateSnapGrid();

	if (navigator.geolocation) {
		setTimeout(function() {
			navigator.geolocation.watchPosition(
				newPosition,
				errorPosition,
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 0
				}
			);
		}, 1000);
	} else {
		alert("Vi kan tyvärr inte få någon signal från din GPS!");
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
			"mapmarker.png",
			"gameover.png",
			"pacman.png",
			"realmap.png",
			"ready.png",
			"yellowghost.png",
			"geocache.png",
			"winner.png"
		];

		sounds.load([
			"assets/eat-pill.mp3",
			"assets/eat-fruit.mp3",
			"assets/eating.mp3",
			"assets/ready.mp3",
			"assets/siren.mp3",
			"assets/die.mp3",
			"assets/music.mp3"
		]);

		eating = sounds["assets/eating.mp3"];
		siren = sounds["assets/siren.mp3"];
		die = sounds["assets/die.mp3"];
		music = sounds["assets/music.mp3"];

		sounds.whenLoaded = function() {
			music.loop = true;
			music.play();
		};

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
		let ghostSpeed = 0.25;
		var bigPacDots = [0, 40, 120, 48, 65];
		var ghostData = [
			// Vertial ghosts
			{ name: "blue", x: 234, y: 580, vy: ghostSpeed, vx: 0 },
			{ name: "pink", x: 700, y: 880, vy: ghostSpeed, vx: 0 },
			// Horizontal ghosts
			{ name: "yellow", x: 480, y: 1240, vy: 0, vx: -ghostSpeed },
			{ name: "red", x: 20, y: 1564, vy: 0, vx: ghostSpeed }
		];

		board = new Sprite(resources["assets/board.png"].texture);
		realMap = new Sprite(resources["assets/realmap.png"].texture);
		realMap.position.set(0, gameHeight - realMap.height);
		realMap.alpha = 0.0;
		mapMarker = new Sprite(resources["assets/mapmarker.png"].texture);
		mapMarker.position.set((gameWidth - mapMarker.width) / 2 - 20, 300);
		mapMarker.interactive = true;
		mapMarker.buttonMode = true;
		mapMarker.on("pointerdown", function() {
			if (realMap.alpha > 0) {
				pacdots.forEach(function(dot) {
					if (dot.visible) {
						// Tint back to default.
						dot.tint = 0xffffffff;
					}
				});
				realMap.alpha = 0.0;
			}
			else {
				// Make the pacdots more visible in map mode.
				pacdots.forEach(function(dot) {
					if (dot.visible) {
						// Tint them blue.
						dot.tint = 0x000000ff;
					}
				});
				realMap.alpha = 1.0;
			}
		});

		app.stage.addChild(board);
		app.stage.addChild(realMap);
		app.stage.addChild(mapMarker);
		app.stage.addChild(scoreText);
		app.stage.addChild(timeText);
		app.stage.addChild(nameText);

		scoreText.position.set(650, 390);
		timeText.position.set(184, 390);
		nameText.position.set((gameWidth - nameText.width) / 2, 480);

		drawPacDotsLineX(60, 1060, 1600, 25, [5, 11, 17]);
		drawPacDotsLineX(60, 1060, 1273, 25, [5, 17]);
		drawPacDotsLineX(60, 1060, 857, 25, [5, 11]);

		drawPacDotsLineY(591, 1920, 265, 35);
		drawPacDotsLineY(591, 1920, 510, 35, [18]);
		drawPacDotsLineY(591, 1920, 728, 35, [7]);

		bigPacDots.forEach(function(i) {
			pacdots[i].scale.x = 2.5;
			pacdots[i].scale.y = 2.5;
			pacdots[i].x -= 8;
			pacdots[i].y -= 8;
		});

		pacman = new Sprite(resources["assets/pacman.png"].texture);
		pacman.position.set(-30, -30);
		pacman.vx = 0;
		pacman.vy = 0;
		pacman.anchor.set(0.5, 0.5);
		app.stage.addChild(pacman);

		/*document.addEventListener('keydown', function(key) {
			const pacmanSpeed = 10;
			if (key.keyCode === 40) {
				// Arrow down
				pacman.y += pacmanSpeed;
			} else if (key.keyCode === 38) {
				// Arrow up
				pacman.y -= pacmanSpeed;
			} else if (key.keyCode === 39) {
				// Arrow right
				pacman.x += pacmanSpeed;
			} else if (key.keyCode === 37) {
				// Arrow left
				pacman.x -= pacmanSpeed;
			}
		});*/

		geocache = new Sprite(resources["assets/geocache.png"].texture);
		geocache.position.set(850, 1645);
		geocache.visible = false;
		app.stage.addChild(geocache);

		ghostData.forEach(function(g) {
			var ghost = new Sprite(resources["assets/" + g.name + "ghost.png"].texture);
			ghost.position.set(g.x, g.y);
			app.stage.addChild(ghost);
			ghost.data = g;
			ghosts.push(ghost);
		});

		pacdotsLeft = pacdots.length;

		gameover = new Sprite(resources["assets/gameover.png"].texture);
		gameover.position.set(350, 900);
		gameover.visible = false;

		gameover.interactive = true;
		gameover.buttonMode = true;
		gameover.on("pointerdown", function() {
			let searchParams = new URLSearchParams(window.location.search);
			var lives = 1;
			if (searchParams.has("lives")) {
				lives = parseInt(searchParams.get("lives"), 10) + 1;
			}
			location.href = "index.html?gcname=" + encodeURIComponent($("#username").val()) + "&lives=" + encodeURIComponent(lives);
		});

		app.stage.addChild(gameover);

		winner = new Sprite(resources["assets/winner.png"].texture);
		winner.position.set((gameWidth - winner.width) / 2, 800);
		winner.visible = false;
		app.stage.addChild(winner);
		app.ticker.add(delta => gameLoop(delta));

		// Ugly hack to get the canvas to scale on my Android.
		setInterval(function() { resize(); }, 2000);
		startTime = new Date();
	}

	function gameLoop(delta) {
		pacdots.forEach(function(dot) {
			if (dot.visible && hitTestRectangle(dot, pacman)) {
				if (dot.scale.x > 1) {
					bigDotsEaten++;
					score += 900;
				}
				dot.visible = false;
				pacdotsLeft--;
				score += 100;
				scoreText.text = score;
				eating.play();
			}
		});

		// Win conditions
		if (pacdotsLeft === 0 || bigDotsEaten === 5) {
			app.ticker.stop();
			geocache.visible = true;
			winner.visible = true;

			let searchParams = new URLSearchParams(window.location.search);
			var lives = 1;
			if (searchParams.has("lives")) {
				lives = parseInt(searchParams.get("lives"), 10) + 1;
			}

			$.post(
				"saveresult.php",
				{
					username: $("#username").val(),
					timespent: timeElapsed,
					score: score,
					lives: lives
				}, function(response) {
					console.log(response);
				}
			);
		}

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
				music.restart();
				music.pause();
				ghost.visible = false;
				gameover.visible = true;
				pacman.visible = false;
				//app.ticker.stop();
			}
		});

		timeElapsed = (Date.parse(new Date()) - Date.parse(startTime)) / 1000;
		timeText.text = ('0' + Math.floor(timeElapsed / 60)).slice(-2) + ":"
					  + ('0' + (timeElapsed % 60)).slice(-2);
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

	function newPosition(position) {
		var closestDistance = 10000,
			closestPoint;

		for (var i = 0; i < snapGrid.length; i++) {
			var gp = snapGrid[i];
			var distance = calculateDistance(gp.lat, gp.lon, position.coords.latitude, position.coords.longitude);
			if (distance < closestDistance) {
				closestPoint = gp;
				closestDistance = distance;
			}
		}

		pacman.position.set(closestPoint.x, closestPoint.y);
		if (position.coords.heading !== null) {
			pacman.rotation = (position.coords.heading).toRad();
		}
	}

	function errorPosition(error) {
		alert("Kan ej hitta din position! OBS! Du måste öppna länken via din mobila webbläsare, det funkar ej via Messenger eller någon Geocaching app!\nFel: " + error.message);
	}

	loadAssets();
}
