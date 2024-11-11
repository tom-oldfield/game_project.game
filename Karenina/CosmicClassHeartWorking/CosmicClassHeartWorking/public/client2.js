const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

socket.emit("setRole", "client2");

let players = {};
let obstacles = [];
let hearts = [];
let tripleshots = [];

const MOVE_INCREMENT = 15; // Increase movement size
const MAX_LIVES = 3;

socket.on('updatePlayers', (updatedPlayers) => {
  players = updatedPlayers;
});

socket.on('updateEntities', (entities) => {
  obstacles = entities.obstacles;
  hearts = entities.hearts;
  tripleshots = entities.tripleshots;
});

function drawPlayers() {
  for (const id in players) {
    const player = players[id];
    ctx.beginPath();
    if (player.shape === "circle") {
      ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = "blue";
      ctx.fill();
    } else {
      ctx.rect(player.x - 20, player.y - 20, 40, 40);
      ctx.fillStyle = "red";
      ctx.fill();
    }
    ctx.closePath();
    ctx.fillStyle = "white"; // Text color
    ctx.font = "16px Arial";
    ctx.fillText(`Lives: ${player.lives}`, player.x, player.y - 30); // Display lives above player
  }
}

function drawEntities() {
  ctx.fillStyle = 'red';
  obstacles.forEach(o => ctx.fillRect(o[0], o[1], o[2], o[3]));

  hearts.forEach(h => {
    let centerX = h[0] + 10;
    let centerY = h[1] + 10;
    ctx.fillStyle = 'rgba(255, 100, 100, 1.0)';
    ctx.beginPath();
    ctx.arc(centerX - 5, centerY, 7, 0, Math.PI * 2);
    ctx.arc(centerX + 5, centerY, 7, 0, Math.PI * 2);
    ctx.moveTo(centerX - 8, centerY + 3);
    ctx.lineTo(centerX + 8, centerY + 3);
    ctx.lineTo(centerX, centerY + 15);
    ctx.closePath();
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(100, 255, 100, 1.0)';
  tripleshots.forEach(t => ctx.fillRect(t[0], t[1], 20, 20));
}

function drawLives() {
  ctx.font = "20px Arial";
  for (const id in players) {
    const player = players[id];
    ctx.fillStyle = "white";
    ctx.fillText(`Player ${id}: ${player.lives} lives`, player.shape === "circle" ? 10 : 650, 30 + (Object.keys(players).indexOf(id) * 30));
  }
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayers();
  drawEntities();
  drawLives();
}

function handleKeydown(event) {
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

window.addEventListener('keydown', handleKeydown);
setInterval(update, 1000 / 60); // 60 FPS
