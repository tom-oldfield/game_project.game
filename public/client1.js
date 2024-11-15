// public/client1.js
const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const countdownDiv = document.getElementById("countdown");
const gameOverMessageDiv = document.getElementById("gameOverMessage");
const overlay = document.getElementById("overlay");

let players = {};
let obstacles = [];
let hearts = [];
let tripleshots = [];
let bullets = [];
let gameOver = false;
let gameStarted = false;
let countdown = 3;
let winner = null;
var canShoot = true

const MOVE_INCREMENT = 15;
const BULLET_SPEED = 5;

socket.on('updatePlayers', (updatedPlayers) => {
  players = updatedPlayers;
  drawPlayers();  // Ensure this function is called to update the canvas and log shoot status
});

socket.on('updateEntities', (entities) => {
  obstacles = entities.obstacles;
  hearts = entities.hearts;
  tripleshots = entities.tripleshots;
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
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 20);
    ctx.lineTo(player.x - 20, player.y + 20);
    ctx.lineTo(player.x + 20, player.y + 20);
    ctx.closePath();
    ctx.fillStyle = "green";
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(player.shape === 'circle' ? 'P1' : 'P2', player.x - 10, player.y - 30);

    // Check if the player should shoot
    if (player.shoot === 1 && canShoot) {
      bullets.push({ x: player.x, y: player.y });
      player.shoot = 0; // Reset shoot status after firing a bullet
      canShoot = false
      setTimeout(() => {
        canShoot = true
      }, 200);
    }
  }
}

function drawEntities() {
  ctx.fillStyle = 'red';
  obstacles.forEach(o => {
    ctx.beginPath();
    ctx.arc(o[0] + o[2]/2, o[1] + o[2]/2, o[2]/2, 0, Math.PI * 2);
    ctx.fill();
  });

  hearts.forEach(h => {
    let centerX = h[0] + 10;
    let centerY = h[1] + 10;
    ctx.fillStyle = 'rgba(255, 100, 100, 1.0)';
    ctx.beginPath();
    ctx.arc(centerX - 5, centerY, 14, 0, Math.PI * 2);
    ctx.arc(centerX + 5, centerY, 14, 0, Math.PI * 2);
    ctx.moveTo(centerX - 8, centerY + 3);
    ctx.lineTo(centerX + 8, centerY + 3);
    ctx.lineTo(centerX, centerY + 17);
    ctx.closePath();
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(100, 255, 100, 1.0)';
  tripleshots.forEach(t => ctx.fillRect(t[0], t[1], 20, 20));
}

function drawBullets() {
  ctx.fillStyle = 'yellow';
  bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, 5, 10); // Small rectangles to represent bullets
  });
}

function drawLivesAndScores() {
  ctx.font = "20px Arial";
  for (const id in players) {
    const player = players[id];
    ctx.fillStyle = "white";
    if (player.shape === "circle") { // Client 1
      ctx.fillText(`Player 1 Lives: ${player.lives}`, 10, 30);
      ctx.fillText(`Player 1 Score: ${player.score}`, 10, 60);
    } else { // Client 2
      ctx.fillText(`Player 2 Lives: ${player.lives}`, canvas.width - 180, 30);
      ctx.fillText(`Player 2 Score: ${player.score}`, canvas.width - 180, 60);
    }
  }
}

function update() {
  if (!gameStarted) return;

  if (gameOver) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayers();
  drawEntities();
  drawBullets();
  drawLivesAndScores();

  // Update bullets
  bullets = bullets.filter(bullet => {
    bullet.y -= BULLET_SPEED;

    // Check for collisions with obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      let o = obstacles[i];
      if (bullet.x > o[0] && bullet.x < o[0] + o[2] &&
          bullet.y > o[1] && bullet.y < o[1] + o[2]) {
        obstacles.splice(i, 1);
        players[socket.id].score++;
        socket.emit('updatePlayers', players); // Update server with new score
        return false; // Remove the bullet
      }
    }

    return bullet.y > 0; // Keep bullets that are still on screen
  });
}

function handleKeydown(event) {
  if (!gameStarted) return;
  if (gameOver) return;

  let moved = false;
  if (event.key === "ArrowLeft" || event.key === "a") {
    players[socket.id].x -= MOVE_INCREMENT;
    moved = true;
  } else if (event.key === "ArrowRight" || event.key === "d") {
    players[socket.id].x += MOVE_INCREMENT;
    moved = true;
  } else if (event.key === "ArrowUp" || event.key === "w") {
    players[socket.id].y -= MOVE_INCREMENT;
    moved = true;
  } else if (event.key === "ArrowDown" || event.key === "s") {
    players[socket.id].y += MOVE_INCREMENT;
    moved = true;
  }

  if (moved) {
    socket.emit('updatePosition', { x: players[socket.id].x, y: players[socket.id].y });
  }
}

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
