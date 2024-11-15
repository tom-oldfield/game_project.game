const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const countdownDiv = document.getElementById("countdown");
const gameOverMessageDiv = document.getElementById("gameOverMessage");
const overlay = document.getElementById("overlay");

socket.emit("setRole", "client2");

let players = {};
let obstacles = [];
let hearts = [];
let tripleshots = [];
let bullets = [];
let gameOver = false;
let gameStarted = false;
let countdown = 3;
let winner = null;
let canShoot = true;

const INITIAL_LIVES = 3;
const MAX_LIVES = 5;
const MOVE_INCREMENT = 15;
const BULLET_SPEED = 5;
const HEART_COLOR = 'rgba(255, 100, 100, 1.0)';
const TRIPLESHOT_COLOR = 'rgba(100, 255, 100, 1.0)';

socket.on('updatePlayers', (updatedPlayers) => {
  players = updatedPlayers;
  drawScene();
});

socket.on('updateEntities', (entities) => {
  obstacles = entities.obstacles;
  hearts = entities.hearts;
  tripleshots = entities.tripleshots;
  drawScene();
});

socket.on('gameOver', (data) => {
  gameOver = true;
  gameStarted = false;
  winner = determineWinner(data.players);
  showGameOverScreen();
});

socket.on('startCountdown', (data) => {
  countdown = data.countdown;
  countdownDiv.innerText = countdown;
  overlay.style.display = "flex";
  restartButton.style.display = "none";
  startButton.style.display = "none";
  countdownDiv.style.display = "block";
  gameOverMessageDiv.style.display = "none";
});

socket.on('gameStart', () => {
  gameOver = false;
  gameStarted = true;
  overlay.style.display = "none";
  countdownDiv.style.display = "none";
  gameOverMessageDiv.style.display = "none";
});

socket.on('restart', () => {
  location.reload();
});

function determineWinner(players) {
  const player1 = Object.values(players).find(player => player.shape === 'circle');
  const player2 = Object.values(players).find(player => player.shape === 'triangle');

  if (player1.score > player2.score) {
    return 'Player 1 Wins!';
  } else if (player2.score > player1.score) {
    return 'Player 2 Wins!';
  } else {
    return 'It\'s a tie!';
  }
}

function showGameOverScreen() {
  overlay.style.display = "flex";
  restartButton.style.display = "block";
  startButton.style.display = "none";
  countdownDiv.style.display = "none";
  gameOverMessageDiv.innerText = `Game Over\n${winner}`;
  gameOverMessageDiv.style.display = "block";
}

function drawPlayers() {
  for (const id in players) {
    const player = players[id];
    if (player.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "green";
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 20);
      ctx.lineTo(player.x - 20, player.y + 20);
      ctx.lineTo(player.x + 20, player.y + 20);
      ctx.closePath();
      ctx.fillStyle = "green";
      ctx.fill();
    }
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(player.shape === 'circle' ? 'P1' : 'P2', player.x - 10, player.y - 30);
  }
}

function drawEntities() {
  ctx.fillStyle = 'red';
  obstacles.forEach(o => {
    ctx.beginPath();
    ctx.arc(o[0] + o[2] / 2, o[1] + o[2] / 2, o[2] / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  hearts.forEach(h => {
    let centerX = h[0] + 10;
    let centerY = h[1] + 10;
    ctx.fillStyle = HEART_COLOR;
    ctx.beginPath();
    ctx.arc(centerX - 5, centerY, 14, 0, Math.PI * 2);
    ctx.arc(centerX + 5, centerY, 14, 0, Math.PI * 2);
    ctx.moveTo(centerX - 8, centerY + 3);
    ctx.lineTo(centerX + 8, centerY + 3);
    ctx.lineTo(centerX, centerY + 17);
    ctx.closePath();
    ctx.fill();
  });

  ctx.fillStyle = TRIPLESHOT_COLOR;
  tripleshots.forEach(t => ctx.fillRect(t[0], t[1], 20, 20));
}

function drawBullets() {
  ctx.fillStyle = 'yellow';
  bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, 5, 10);
  });
}

function drawLivesAndScores() {
  ctx.font = "20px Arial";
  for (const id in players) {
    const player = players[id];
    ctx.fillStyle = "white";
    if (player.shape === "circle") {
      ctx.fillText(`Player 1 Lives: ${player.lives}`, 10, 30);
      ctx.fillText(`Player 1 Score: ${player.score}`, 10, 60);
    } else {
      ctx.fillText(`Player 2 Lives: ${player.lives}`, canvas.width - 180, 30);
      ctx.fillText(`Player 2 Score: ${player.score}`, canvas.width - 180, 60);
    }
  }
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayers();
  drawEntities();
  drawBullets();
  drawLivesAndScores();
}

function update() {
  if (!gameStarted || gameOver) return;

  bullets = bullets.filter(bullet => {
    bullet.y -= BULLET_SPEED;

    socket.emit("bulletHit", { bullet, playerId: socket.id });

    return bullet.y > 0;
  });

  drawScene();
}

function handleKeydown(event) {
  if (!gameStarted || gameOver) return;

  let moved = false;
  const player = players[socket.id];

  if (player) {
    if (event.key === "ArrowLeft" || event.key === "a") {
      player.x = Math.max(player.x - MOVE_INCREMENT, 0);
      moved = true;
    } else if (event.key === "ArrowRight" || event.key === "d") {
      player.x = Math.min(player.x + MOVE_INCREMENT, canvas.width - 20);
      moved = true;
    } else if (event.key === "ArrowUp" || event.key === "w") {
      player.y = Math.max(player.y - MOVE_INCREMENT, 0);
      moved = true;
    } else if (event.key === "ArrowDown" || event.key === "s") {
      player.y = Math.min(player.y + MOVE_INCREMENT, canvas.height - 20);
      moved = true;
    } else if (event.key === " ") { // Spacebar for shooting
      if (canShoot) {
        bullets.push({ x: player.x, y: player.y });
        canShoot = false;
        setTimeout(() => {
          canShoot = true;
        }, 200); // Shooting cooldown
      }
    }

    if (moved) {
      socket.emit('updatePosition', { x: player.x, y: player.y });
    }
  }
}

// Event Listeners
startButton.addEventListener('click', () => {
  socket.emit('startPressed');
  startButton.style.display = 'none';
  countdownDiv.style.display = 'block';
});

restartButton.addEventListener('click', () => {
  socket.emit('restartGame');
});

window.addEventListener('keydown', handleKeydown);
setInterval(update, 1000 / 60); // 60 FPS
