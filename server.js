const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;

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

function resetGameData() {
  obstacles = [];
  hearts = [];
  tripleshots = [];
  gameStarted = false;
  startPressedCount = 0;
  countdown = 3;
  for (const id in players) {
    players[id].lives = 300;
    players[id].score = 0;
  }
}

function detectCollisions() {
  if (!gameStarted) return;

  for (let playerId in players) {
    let player = players[playerId];

    // Check collision with obstacles
    obstacles.forEach((obstacle, index) => {
      if (
        player.x < obstacle[0] + obstacle[2] &&
        player.x + 40 > obstacle[0] &&
        player.y < obstacle[1] + obstacle[2] &&
        player.y + 40 > obstacle[1]
      ) {
        // Collision detected
        player.lives--;
        obstacles.splice(index, 1);
        if (player.lives <= 0) {
          player.lives = 0; // No negative lives
          io.emit("gameOver", { players });
        }
        io.emit("updatePlayers", players);
      }
    });

    // Check collisions with hearts (to gain life)
    hearts.forEach((heart, index) => {
      if (
        player.x < heart[0] + 20 &&
        player.x + 40 > heart[0] &&
        player.y < heart[1] + 20 &&
        player.y + 40 > heart[1]
      ) {
        // Collision detected
        if (player.lives < 3) {
          player.lives++;
        }
        hearts.splice(index, 1);
        io.emit("updatePlayers", players);
      }
    });

    // Check collisions with tripleshots for scoring
    tripleshots.forEach((tripleshot, index) => {
      if (
        player.x < tripleshot[0] + 20 &&
        player.x + 40 > tripleshot[0] &&
        player.y < tripleshot[1] + 20 &&
        player.y + 40 > tripleshot[1]
      ) {
        // Collision detected, increase score
        player.score++;
        tripleshots.splice(index, 1);
        io.emit("updatePlayers", players);
      }
    });
  }
}

function spawnEntities() {
  if (!gameStarted) return;

  if (Math.random() < 1 / 20) {
    let obstacleDiameter = Math.random() * 50 + 20;
    let obstacleX = Math.random() * (800 - obstacleDiameter);
    let speed = Math.max(2, 8 - obstacleDiameter / 10);
    obstacles.push([obstacleX, 0, obstacleDiameter, speed]);
  }
  if (Math.random() < 1 / 100) {
    let heartX = Math.random() * (800 - 20);
    hearts.push([heartX, 0, 3]); // Adjust speed
  }
  if (Math.random() < 1 / 150) {
    let tripleshotX = Math.random() * (800 - 20);
    tripleshots.push([tripleshotX, 0, 3]); // Adjust speed
  }

  obstacles.forEach(o => (o[1] += o[3]));
  hearts.forEach(h => (h[1] += h[2]));
  tripleshots.forEach(t => (t[1] += t[2]));

  detectCollisions(); // Check for collisions

  io.emit("updateEntities", { obstacles, hearts, tripleshots });
}

setInterval(spawnEntities, 1000 / 30); // Smooth update frequency

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("setRole", (role) => {
    players[socket.id] = {
      id: socket.id,
      x: 400,
      y: 300,
      shape: role === "client1" ? "circle" : "triangle",
      lives: 300, // Initialize lives
      score: 0, // Initialize score
      shoot: 0,
    };
    io.emit("updatePlayers", players);
  });

  // Handle position updates
  socket.on("updatePosition", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      io.emit("updatePlayers", players);
    }
  });

  // Handle movement
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

  // Handle shoot status from EMG data
  socket.on("EMG", (data) => {
    const player = players[socket.id];
    if (player) {
      player.shoot = data.shoot; // Update the player's shoot status
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
    io.emit("restart"); // Notify clients to reset game
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});