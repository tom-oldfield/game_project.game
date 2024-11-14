// public/client1.js
const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

socket.emit("setRole", "client1");

let players = {};

function drawPlayers() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const id in players) {
    const player = players[id];
    ctx.beginPath();
    // Change color based on shoot status
    if (player.shoot === 1) {
      ctx.fillStyle = "yellow";  // Color when shooting
      console.log(`Player ${id} is shooting!`);
    } else {
      ctx.fillStyle = player.shape === "circle" ? "blue" : "red";  // Default colors
      console.log(`Player ${id} is not shooting.`);
    }
    
    // Draw the player based on their shape
    if (player.shape === "circle") {
      ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.rect(player.x - 20, player.y - 20, 40, 40);
      ctx.fill();
    }
    ctx.closePath();
  }
}

socket.on("updatePlayers", (updatedPlayers) => {
  players = updatedPlayers;
  drawPlayers();  // Ensure this function is called to update the canvas and log shoot status
});

window.addEventListener("keydown", (event) => {
  const directions = {
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };
  const key = event.key.toLowerCase();
  if (directions[key]) {
    socket.emit("move", { direction: directions[key] });
  }
});
