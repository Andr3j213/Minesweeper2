
// ======= DOM-Elemente aus dem HTML-Dokument holen =======
const gameContainer = document.getElementById("game");               // Container für das Spielfeld (Grid)
const messageDisplay = document.getElementById("message");           // Textanzeige für Sieg/Niederlage
const scoreDisplay = document.getElementById("endscore");            // Punktestand-Anzeige
const timerDisplay = document.getElementById("timer");               // Zeit-Anzeige
const remainingFlagsDisplay = document.getElementById("remainingFlags"); // Anzeige verbleibender Flaggen
const highscoreDisplay = document.getElementById("highscore");       // Highscore-Anzeige

// ======= Audio-Elemente (Soundeffekte) =======
const clickSound = document.getElementById("clickSound");            // Klick-Sound beim Aufdecken
const explosionSound = document.getElementById("explosionSound");    // Sound bei Explosion
const bgMusic = document.getElementById("bgMusic");                  // Hintergrundmusik

// ======= Spielvariablen =======
let rows, cols, minesCount;                // Dimensionen des Spielfelds & Minenanzahl
let board;                                 // 2D-Array für Spielfeldlogik
let mineLocations;                         // Set mit Positionen der Minen
let startTime, timerInterval;              // Zeitsteuerung
let revealedCount = 0;                     // Zähler für aufgedeckte Felder
let flagsLeft;                             // Anzahl noch platzierbarer Flaggen
let isMuted = false;                       // Steuerung, ob Sound stummgeschaltet ist
let gameActive = true;                     // Ist das Spiel aktiv?

// ======= Highscore-Verwaltung pro Schwierigkeitsgrad =======
const highScores = {
    easy: 0,
    medium: 0,
    hard: 0
};

// ======= Spielstart-Funktion =======
function startGame() {
    const difficulty = document.getElementById("level").value;
    // Holt den ausgewählten Schwierigkeitsgrad ("easy", "medium", "hard") aus dem Dropdown-Menü

    // Der if-else-Block entscheidet anhand der Schwierigkeit, wie groß das Spielfeld ist und wie viele Minen es gibt
    if (difficulty === "easy") {
        rows = cols = 8;        // Wenn "easy", dann 8x8 Feld
        minesCount = 10;        // und 10 Minen
    } else if (difficulty === "medium") {
        rows = cols = 12;       // Bei "medium" wird ein 12x12 Feld erstellt
        minesCount = 25;        // mit 25 Minen
    } else {
        rows = cols = 16;       // Bei "hard" gibt es ein 16x16 Feld
        minesCount = 40;        // mit 40 Minen
    }

    // Stellt sicher, dass das Spielfeld als CSS-Grid mit entsprechender Spaltenanzahl angezeigt wird
    gameContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    board = []; // Neues leeres Spielfeld
    mineLocations = new Set(); // Leere Menge zur Speicherung der Minenpositionen
    revealedCount = 0;         // Kein Feld ist zu Beginn aufgedeckt
    flagsLeft = minesCount;    // So viele Flaggen wie Minen erlaubt
    remainingFlagsDisplay.textContent = flagsLeft; // Flaggenanzeige im UI setzen

    messageDisplay.classList.add("hidden"); // Versteckt Gewinn-/Verlustnachricht
    scoreDisplay.classList.add("hidden");   // Versteckt Punktestand
    gameContainer.innerHTML = "";           // Leert vorheriges Spielfeld
    clearInterval(timerInterval);           // Stoppt alten Timer
    timerDisplay.textContent = "000";       // Setzt Zeit auf 000 zurück

    startTime = Date.now(); // Startzeit wird gespeichert
    timerInterval = setInterval(updateTimer, 1000); // Alle 1 Sekunde Zeit aktualisieren

    bgMusic.play(); // Spielmusik starten

    createBoard();   // Erstellt visuelles Spielfeld & verknüpft Logik
    placeMines();    // Platziert zufällig Minen
    updateNumbers(); // Berechnet Nachbar-Minenzahlen für jede Zelle

    updateHighScoreDisplay(); // Zeigt aktuellen Highscore an
    gameActive = true;        // Spielstatus: aktiv
}


// ======= Neustart = neuer Spielstart =======
function restartGame() {
    startGame(); // Startet das Spiel neu, indem es einfach die startGame-Funktion aufruft
}


// ======= Spielfeldzellen erzeugen und Event-Handler zuweisen =======
function createBoard() {
    for (let r = 0; r < rows; r++) { // Schleife über jede Zeile von 0 bis rows-1
        const row = [];
        for (let c = 0; c < cols; c++) { // Schleife über jede Spalte von 0 bis cols-1
            const cell = document.createElement("div"); // Erstelle ein neues DIV-Element
            cell.classList.add("cell"); // CSS-Klasse "cell" hinzufügen
            cell.dataset.row = r; // Speichere Zeilenindex als Attribut
            cell.dataset.col = c; // Speichere Spaltenindex als Attribut
            cell.addEventListener("click", handleCellClick);       // Linksklick: Zelle aufdecken
            cell.addEventListener("contextmenu", handleRightClick); // Rechtsklick: Flagge setzen
            gameContainer.appendChild(cell); // Zelle ins HTML-Dokument einfügen

            // Zellenobjekt zur Spiellogik hinzufügen
            row.push({ element: cell, mine: false, revealed: false, flagged: false, number: 0 });
        }
        board.push(row); // Ganze Zeile zur Spiellogik hinzufügen
    }
}


// ======= Zufällige Minen platzieren =======
function placeMines() {
    while (mineLocations.size < minesCount) { // Solange nicht genug Minen platziert sind
        const r = Math.floor(Math.random() * rows); // Zufällige Zeilennummer
        const c = Math.floor(Math.random() * cols); // Zufällige Spaltennummer
        const key = `${r},${c}`; // Kombiniere Zeile & Spalte als eindeutigen Schlüssel
        if (!mineLocations.has(key)) { // Nur platzieren, wenn dort noch keine Mine ist
            mineLocations.add(key); // Füge Position der Minenmenge hinzu
            board[r][c].mine = true; // Markiere Zelle im Spielfeld als Mine
        }
    }
}


// ======= Zahlenfelder je nach angrenzenden Minen berechnen =======
function updateNumbers() {
    const directions = [-1, 0, 1]; // Richtungswerte: oben (-1), mitte (0), unten (1)

    for (let r = 0; r < rows; r++) { // Gehe jede Zeile durch
        for (let c = 0; c < cols; c++) { // Gehe jede Spalte durch
            if (board[r][c].mine) continue; // Falls Zelle eine Mine ist → überspringen

            let count = 0;
            for (let dr of directions) {       // Zeilen-Richtungen durchgehen
                for (let dc of directions) {   // Spalten-Richtungen durchgehen
                    if (dr === 0 && dc === 0) continue; // Eigene Zelle überspringen
                    const nr = r + dr, nc = c + dc; // Nachbarzelle berechnen
                    // Ist Nachbar innerhalb des Spielfelds und eine Mine?
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) {
                        count++; // Mine gefunden → Zähler erhöhen
                    }
                }
            }

            board[r][c].number = count; // Speichere Anzahl der angrenzenden Minen
        }
    }
}


// ======= Linksklick: Zelle aufdecken =======
function handleCellClick(e) {
    if (!gameActive) return; // Wenn Spiel nicht aktiv → nichts tun

    const cellEl = e.currentTarget; // Das geklickte DOM-Element
    const r = parseInt(cellEl.dataset.row);
    const c = parseInt(cellEl.dataset.col);
    const cell = board[r][c]; // Logik-Zelle auslesen

    if (cell.revealed || cell.flagged) return; // Wenn schon aufgedeckt oder markiert → nichts tun

    clickSound.currentTime = 0; // Ton von vorn starten
    clickSound.play();          // Klick-Sound abspielen

    if (cell.mine) { // Wenn Mine aufgedeckt wurde
        revealAllMines();               // Zeige alle Minen
        cellEl.classList.add("mine-hit"); // Markiere getroffene Mine optisch
        explosionSound.play();          // Spiele Explosionssound
        gameOver(false);                // Spiel beenden – verloren
        return;
    }

    revealCell(r, c); // Feld aufdecken (auch rekursiv)
    checkWin();       // Prüfen, ob gewonnen
}


// ======= Rechtsklick: Flagge setzen oder entfernen =======
function handleRightClick(e) {
    if (!gameActive) return; // Wenn Spiel nicht aktiv → nichts tun
    e.preventDefault();      // Standard-Rechtsklickmenü verhindern

    const cellEl = e.currentTarget;
    const r = parseInt(cellEl.dataset.row);
    const c = parseInt(cellEl.dataset.col);
    const cell = board[r][c];

    if (cell.revealed) return; // Wenn schon sichtbar → keine Flagge setzen

    if (cell.flagged) {       // Wenn bereits markiert → Flagge entfernen
        cell.flagged = false;
        cellEl.textContent = "";
        flagsLeft++;
    } else if (flagsLeft > 0) { // Sonst Flagge setzen, wenn noch Flaggen übrig
        cell.flagged = true;
        cellEl.textContent = "🚩";
        flagsLeft--;
    }
    remainingFlagsDisplay.textContent = flagsLeft; // Flaggenanzahl anzeigen
}


// ======= Zelle aufdecken & bei 0 rekursiv umliegende aufdecken =======
function revealCell(r, c) {
    const cell = board[r][c];
    if (cell.revealed || cell.flagged) return; // Schon sichtbar oder markiert → abbrechen

    cell.revealed = true;       // Feld als sichtbar markieren
    revealedCount++;            // Zähler erhöhen
    const cellEl = cell.element;
    cellEl.classList.add("revealed"); // Optisch kennzeichnen

    if (cell.number > 0) {
        cellEl.textContent = cell.number; // Zahl anzeigen, wenn Nachbarminen vorhanden
    }

    if (cell.number === 0) { // Wenn 0 → alle Nachbarn ebenfalls aufdecken
        const directions = [-1, 0, 1];
        for (let dr of directions) {
            for (let dc of directions) {
                if (dr === 0 && dc === 0) continue; // Eigene Zelle überspringen
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    revealCell(nr, nc); // Rekursiv Nachbarn aufdecken
                }
            }
        }
    }
}


// ======= Alle Minen aufdecken (bei Verlust) =======
function revealAllMines() {
    mineLocations.forEach(loc => {                             // Für jede gespeicherte Minenposition:
        const [r, c] = loc.split(",").map(Number);             // Koordinaten als Zahlen extrahieren
        const cell = board[r][c];                              // Die entsprechende Zelle im Board holen
        const cellEl = cell.element;                           // Das zugehörige DOM-Element holen
        cellEl.textContent = "💣";                              // Bomben-Symbol anzeigen
        cellEl.classList.add("mine");                          // Zusätzliche CSS-Klasse für Darstellung
    });
}


// ======= Gewinn prüfen =======
function checkWin() {
    if (revealedCount === rows * cols - minesCount) {         // Wenn alle Nicht-Minen-Zellen aufgedeckt sind:
        gameOver(true);                                        // Spiel als gewonnen beenden
    }
}


// ======= Spiel beenden: Gewinn oder Verlust =======
function gameOver(won) {
    clearInterval(timerInterval);                             // Den laufenden Timer stoppen
    const seconds = Math.floor((Date.now() - startTime) / 1000); // Spielzeit in Sekunden berechnen
    timerDisplay.textContent = String(seconds).padStart(3, "0"); // Zeitanzeige aktualisieren (z.B. "007")

    const difficulty = getCurrentDifficulty();                // Schwierigkeitsgrad abfragen
    const multiplier = { easy: 1, medium: 2, hard: 3 }[difficulty]; // Punktmultiplikator basierend auf Schwierigkeit

    const totalSafeCells = rows * cols - minesCount;          // Anzahl sicherer Felder (ohne Minen)
    const progress = revealedCount / totalSafeCells;          // Anteil aufgedeckter sicherer Felder
    const baseScore = 1000 * progress;                        // Grundpunktzahl je nach Fortschritt
    const timePenalty = seconds * 5;                          // Zeitstrafe: 5 Punkte pro Sekunde
    const rawScore = baseScore - timePenalty;                // Punktzahl vor Multiplikator
    const score = Math.max(0, Math.floor(rawScore * multiplier)); // Endpunktzahl berechnet und auf 0 begrenzt

    setMessage(won ? "You Win! 🎉" : "Game Over 💥");          // Nachricht anzeigen

    saveHighScore(score);                                     // Highscore ggf. aktualisieren
    const highScore = getHighScore();                         // Aktuellen Highscore abrufen
    scoreDisplay.innerHTML = `Your Score: ${score}<br>🏆 High Score (${difficulty}): ${highScore}`; // Anzeige vorbereiten
    scoreDisplay.classList.remove("hidden");                  // Punktestand einblenden

    updateHighScoreDisplay();                                 // Highscore-Anzeige aktualisieren
    gameActive = false;                                       // Spiel deaktivieren
}


// ======= Zeit aktualisieren =======
function updateTimer() {
    const seconds = Math.floor((Date.now() - startTime) / 1000); // Sekunden seit Spielstart
    timerDisplay.textContent = String(seconds).padStart(3, "0"); // Anzeige aktualisieren, z.B. "005"
}


// ======= Nachricht anzeigen =======
function setMessage(msg) {
    messageDisplay.textContent = msg;                        // Den Text in das Nachrichtenfeld schreiben
    messageDisplay.classList.remove("hidden");               // Sichtbar machen
}


// ======= Theme zwischen hell/dunkel wechseln =======
function toggleTheme() {
    document.body.classList.remove("dark");                  // Erst dunkles Theme entfernen
    const selected = document.getElementById("theme").value; // Aktuell gewähltes Theme lesen
    if (selected === "dark") {                               // Falls dunkles Theme gewählt:
        document.body.classList.add("dark");                 // Klasse "dark" hinzufügen (CSS)
    }
}


// ======= Highscore-Logik =======
function getCurrentDifficulty() {
    return document.getElementById("level").value;           // Aktuell ausgewählte Schwierigkeit (Dropdown)
}

function getHighScore() {
    const difficulty = getCurrentDifficulty();               // Schwierigkeitsgrad holen
    return highScores[difficulty];                           // Highscore für diesen Schwierigkeitsgrad
}

function saveHighScore(score) {
    const difficulty = getCurrentDifficulty();               // Schwierigkeitsgrad holen
    if (score > highScores[difficulty]) {                    // Nur speichern, wenn neuer Rekord
        highScores[difficulty] = score;
    }
}

function updateHighScoreDisplay() {
    highscoreDisplay.textContent = getHighScore();           // Highscore-Anzeige mit aktuellem Wert aktualisieren
}


// ======= Hilfe anzeigen =======
function showHelp() {
    alert("🧩 How to play Minesweeper:\n\nLeft-click to reveal a cell.\nRight-click to place/remove a 🚩.\nNumbers show nearby mines.\nReveal all safe cells to win."); // Hilfetext anzeigen
}


// ======= Von Startbildschirm ins Spiel wechseln =======
function enterGame() {
    document.getElementById("homeScreen").classList.add("hidden");    // Startbildschirm ausblenden
    document.getElementById("gameUI").classList.remove("hidden");     // Spieloberfläche anzeigen
    startGame();                                                      // Spiel starten
}


// ======= Ton stummschalten/aktivieren =======
function toggleMute() {
    isMuted = !isMuted;                                               // Mute-Zustand umschalten
    const muteButton = document.getElementById("muteButton");         // Button-Element holen
    muteButton.textContent = isMuted ? "🔇 Muted" : "🔊 Sound";        // Symbol/Text je nach Zustand
    clickSound.muted = isMuted;                                       // Alle Sounds entsprechend stummschalten
    explosionSound.muted = isMuted;
    bgMusic.muted = isMuted;
}


// ======= Spiel direkt starten beim Laden =======
startGame();
