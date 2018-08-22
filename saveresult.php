<?php

if (!isset($_POST["username"], $_POST["timespent"], $_POST["score"])) {
	echo "Bad request\n";
	die();
}

$db = new SQLite3('db/highscore.db', SQLITE3_OPEN_CREATE | SQLITE3_OPEN_READWRITE);
$db->query('CREATE TABLE IF NOT EXISTS "highscore" (
		"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
		"username" VARCHAR,
		"score" INTEGER,
		"timespent" INTEGER,
		"created" DATETIME
	)'
);

$statement = $db->prepare('INSERT INTO "highscore" ("username", "score", "timespent", "created")
	VALUES (:username, :score, :timespent, :created)');

$statement->bindValue(':username', $_POST["username"]);
$statement->bindValue(':score', $_POST["score"]);
$statement->bindValue(':timespent', $_POST["timespent"]);
$statement->bindValue(':created', date('Y-m-d G:i:s'));

$statement->execute();

$db->close();

?>