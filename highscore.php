<?php

date_default_timezone_set("Europe/Stockholm");

$image = new Imagick();
$draw = new ImagickDraw();
$pixel = new ImagickPixel('transparent');

$image->newImage(650, 500, $pixel);
$draw->setFont('Courier');
$draw->setFontSize(14);

$now = date('Y-m-d H:i:s');
$image->annotateImage($draw, 0, 30, 0, 'Pac-Man Highscore '.$now);

$row_height = 23;

$db = new SQLite3('db/highscore.db', SQLITE3_OPEN_CREATE | SQLITE3_OPEN_READWRITE);
$results = $db->query('SELECT * FROM "highscore" ORDER BY "score" DESC LIMIT 20');

if ($results && count($results) > 0) {
	$row_num = 0;
	while ($row = $results->fetchArray()) {
		$row_content = sprintf(
			"%d. %s %dp (tid %d, %d liv) %s",
			$row_num + 1,
			$row["username"],
			$row["score"],
			$row["timespent"],
			$row["lives"],
			$row["created"]
		);
		$image->annotateImage($draw, 10, 60 + $row_num * $row_height, 0, $row_content);
		$row_num++;
	}
} else {
	$image->annotateImage($draw, 10, 60, 0, "Highscore-listan är tom!");	
	$image->annotateImage($draw, 10, 60 + $row_height, 0, "Den första att klara spelet får FTF!");	
}

$db->close();

$image->setImageFormat('png');

header('Content-type: image/png');
echo $image;

?>
