// public/client2.js
const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

socket.emit("setRole", "client2");

let players = {};

function drawPlayers() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  }
}

socket.on("updatePlayers", (updatedPlayers) => {
  players = updatedPlayers;
  drawPlayers();
});

window.addEventListener("keydown", (event) => {
  const directions = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };
  if (directions[event.key]) {
    socket.emit("move", { direction: directions[event.key] });
  }
});
