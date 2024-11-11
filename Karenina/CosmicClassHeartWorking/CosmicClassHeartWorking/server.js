const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3001;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/client1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client1.html'));
});

app.get('/client2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client2.html'));
});

let players = {};
let obstacles = [];
let hearts = [];
let tripleshots = [];

function detectCollisions() {
  for (let playerId in players) {
    let player = players[playerId];

    // check collision with obstacles
    obstacles.forEach((obstacle, index) => {
      if (
        player.x < obstacle[0] + obstacle[2] &&
        player.x + 40 > obstacle[0] &&
        player.y < obstacle[1] + obstacle[3] &&
        player.y + 40 > obstacle[1]
      ) {
        // collision detected
        player.lives--;
        obstacles.splice(index, 1);
        if (player.lives <= 0) {
          player.lives = 0; // No negative lives
        }
        io.emit('updatePlayers', players);
      }
    });

    // check collisions with hearts (to gain life)
    hearts.forEach((heart, index) => {
      if (
        player.x < heart[0] + 20 &&
        player.x + 40 > heart[0] &&
        player.y < heart[1] + 20 &&
        player.y + 40 > heart[1]
      ) {
        // collision detected
        if (player.lives < 3) {
          player.lives++;
        }
        hearts.splice(index, 1);
        io.emit('updatePlayers', players);
      }
    });

    // check collisions with tripleshots
    tripleshots.forEach((tripleshot, index) => {
      if (
        player.x < tripleshot[0] + 20 &&
        player.x + 40 > tripleshot[0] &&
        player.y < tripleshot[1] + 20 &&
        player.y + 40 > tripleshot[1]
      ) {
        // collision detected
        tripleshots.splice(index, 1);
      }
    });
  }
}

function spawnEntities() {
  if (Math.random() < 1 / 20) {
    let obstacleWidth = Math.random() * 50 + 20;
    let obstacleHeight = obstacleWidth / 2;
    let obstacleX = Math.random() * (800 - obstacleWidth);
    let speed = Math.max(2, 8 - obstacleWidth / 10);
    obstacles.push([obstacleX, 0, obstacleWidth, obstacleHeight, speed]);
  }
  if (Math.random() < 1 / 100) {
    let heartX = Math.random() * (800 - 20);
    hearts.push([heartX, 0, 3]); // Adjust speed
  }
  if (Math.random() < 1 / 150) {
    let tripleshotX = Math.random() * (800 - 20);
    tripleshots.push([tripleshotX, 0, 3]); // Adjust speed
  }

  obstacles.forEach(o => o[1] += o[4]);
  hearts.forEach(h => h[1] += h[2]);
  tripleshots.forEach(t => t[1] += t[2]);

  detectCollisions(); // Check for collisions

  io.emit('updateEntities', { obstacles, hearts, tripleshots });
}

setInterval(spawnEntities, 1000 / 30); // Smooth update frequency

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('setRole', (role) => {
    players[socket.id] = {
      id: socket.id,
      x: 400,
      y: 300,
      shape: role === 'client1' ? 'circle' : 'square',
      lives: 3 // Initialize lives
    };
    io.emit('updatePlayers', players);
  });

  socket.on('updatePosition', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      io.emit('updatePlayers', players);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete players[socket.id];
    io.emit('updatePlayers', players);
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
