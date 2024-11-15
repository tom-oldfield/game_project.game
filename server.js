const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;

const INITIAL_LIVES = 3;
const MAX_LIVES = 5;
let difficultyLevel = 0.5;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/client1", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "client1.html"));
});

app.get("/client2", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "client2.html"));
});

let players = {};
let obstacles = [];
let hearts = [];
let tripleshots = [];
let gameStarted = false;
let startPressedCount = 0;
let countdown = 3;
let invinciblePlayers = {};

function resetGameData() {
  obstacles = [];
  hearts = [];
  tripleshots = [];
  gameStarted = false;
  startPressedCount = 0;
  countdown = 3;
  difficultyLevel = 0.5;
  invinciblePlayers = {};
  for (const id in players) {
    players[id].lives = INITIAL_LIVES;
    players[id].score = 0;
    invinciblePlayers[id] = false;
  }
}

function increaseDifficulty() {
  difficultyLevel = Math.min(difficultyLevel + 0.05, 2.0);
}

function getMaxPoints(meteorSize) {
  return Math.min(10, Math.ceil(meteorSize / 10));
}

function makePlayerInvincible(playerId, duration = 3000) {
  invinciblePlayers[playerId] = true;
  setTimeout(() => {
    invinciblePlayers[playerId] = false;
  }, duration);
}

function detectCollisions() {
  if (!gameStarted) return;

  for (const playerId in players) {
    let player = players[playerId];

    if (!invinciblePlayers[playerId]) {
      obstacles.forEach((obstacle, index) => {
        if (
          player.x < obstacle[0] + obstacle[2] &&
          player.x + 40 > obstacle[0] &&
          player.y < obstacle[1] + obstacle[2] &&
          player.y + 40 > obstacle[1]
        ) {
          player.lives--;
          obstacles.splice(index, 1);
          if (player.lives <= 0) {
            player.lives = 0;
            io.emit("gameOver", { players });
            gameStarted = false;
          } else {
            makePlayerInvincible(playerId);
          }
          io.emit("updatePlayers", players);
        }
      });
    }

    hearts.forEach((heart, index) => {
      if (
        player.x < heart[0] + 20 &&
        player.x + 40 > heart[0] &&
        player.y < heart[1] + 20 &&
        player.y + 40 > heart[1]
      ) {
        if (player.lives < MAX_LIVES) {
          player.lives++;
        }
        hearts.splice(index, 1);
        io.emit("updatePlayers", players);
      }
    });

    tripleshots.forEach((tripleshot, index) => {
      if (
        player.x < tripleshot[0] + 20 &&
        player.x + 40 > tripleshot[0] &&
        player.y < tripleshot[1] + 20 &&
        player.y + 40 > tripleshot[1]
      ) {
        player.score++;
        tripleshots.splice(index, 1);
        io.emit("updatePlayers", players);
      }
    });
  }
}

function spawnEntities() {
  if (!gameStarted) return;

  if (Math.random() < 1 / (20 / difficultyLevel)) {
    let obstacleDiameter = Math.random() * 50 + 20;
    let obstacleX = Math.random() * (800 - obstacleDiameter);
    let speed = Math.max(1, 5 - obstacleDiameter / 10) * difficultyLevel;
    obstacles.push([obstacleX, 0, obstacleDiameter, speed, 0]);
  }
  if (Math.random() < 1 / 200) {
    let heartX = Math.random() * (800 - 20);
    hearts.push([heartX, 0, 1]);
  }
  if (Math.random() < 1 / 300) {
    let tripleshotX = Math.random() * (800 - 20);
    tripleshots.push([tripleshotX, 0, 1]);
  }

  obstacles.forEach(o => (o[1] += o[3]));
  hearts.forEach(h => (h[1] += h[2]));
  tripleshots.forEach(t => (t[1] += t[2]));

  detectCollisions();

  io.emit("updateEntities", { obstacles, hearts, tripleshots });
}

setInterval(spawnEntities, 1000 / 30);
setInterval(increaseDifficulty, 10000);

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("setRole", (role) => {
    players[socket.id] = {
      id: socket.id,
      x: 400,
      y: 300,
      shape: role === "client1" ? "circle" : "triangle",
      lives: INITIAL_LIVES,
      score: 0,
      shoot: 0,
    };
    invinciblePlayers[socket.id] = false;
    io.emit("updatePlayers", players);
  });

  socket.on("updatePosition", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      io.emit("updatePlayers", players);
    }
  });

  socket.on("move", (data) => {
    const player = players[socket.id];
    if (player) {
      if (data.direction === "left") player.x = Math.max(player.x - 5, 0);
      if (data.direction === "right") player.x = Math.min(player.x + 5, 800);
      if (data.direction === "up") player.y = Math.max(player.y - 5, 0);
      if (data.direction === "down") player.y = Math.min(player.y + 5, 600);

      io.emit("updatePlayers", players);
    }
  });

  socket.on("EMG", (data) => {
    const player = players[socket.id];
    if (player) {
      player.shoot = data.shoot;
      io.emit("updatePlayers", players);
    }
  });

  socket.on("startPressed", () => {
    startPressedCount++;
    if (startPressedCount === 2) {
      io.emit("startCountdown", { countdown });
      let countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          io.emit("startCountdown", { countdown });
        } else {
          clearInterval(countdownInterval);
          gameStarted = true;
          io.emit("gameStart");
        }
      }, 1000);
    }
  });

  socket.on("restartGame", () => {
    resetGameData();
    io.emit("restart");
  });

  socket.on("bulletHit", ({ bullet, playerId }) => {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      let o = obstacles[i];
      if (bullet.x > o[0] && bullet.x < o[0] + o[2] &&
          bullet.y > o[1] && bullet.y < o[1] + o[2]) {
        o[4]++;
        if (o[4] >= Math.ceil(o[2] / 10)) {
          players[playerId].score += getMaxPoints(o[2]);
          obstacles.splice(i, 1);
          io.emit("updatePlayers", players);
        }
        break;
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    delete players[socket.id];
    delete invinciblePlayers[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
