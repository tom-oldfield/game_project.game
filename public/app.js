const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WHITE = 'white';
const BLACK = 'black';
const RED = 'red';
const BLUE = 'rgba(200, 200, 255, 1.0)';
const HEART_COLOR = 'rgba(255, 100, 100, 1.0)';
const TRIPLESHOT_COLOR = 'rgba(100, 255, 100, 1.0)';

const screenWidth = 800;
const screenHeight = 600;

const playerWidth = 50;
const playerHeight = 30;
const playerSpeed = 5;
const bulletWidth = 5;
const bulletHeight = 10;
const bulletSpeed = 7;

const tripleShotDuration = 10 * 1000; // Triple shot lasts 10 seconds in ms
const invincibleDuration = 5 * 1000; // Invincible duration in ms

let playerX, playerY, bullets, lives, invincible, invincibleStartTime, tripleShot, tripleShotStartTime, gameOver, obstacles, hearts, tripleshots, score;

const ws = new WebSocket('ws://localhost:3005');

let otherPlayers = {};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    otherPlayers[data.id] = data;
};

function resetGame() {
    playerX = (screenWidth - playerWidth) / 2;
    playerY = screenHeight - playerHeight - 10;
    bullets = [];
    lives = 3;
    invincible = false;
    invincibleStartTime = 0;
    tripleShot = false;
    tripleShotStartTime = 0;
    gameOver = false;
    obstacles = [];
    hearts = [];
    tripleshots = [];
    score = 0;
}

function setup() {
    resetGame();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.requestAnimationFrame(gameLoop);
}

function handleKeyDown(event) {
    if (event.code === 'Space' && !gameOver) {
        if (tripleShot) {
            bullets.push([playerX + playerWidth / 2 - bulletWidth / 2, playerY, 0]);
            bullets.push([playerX + playerWidth / 2 - bulletWidth / 2, playerY, -Math.PI / 4]);
            bullets.push([playerX + playerWidth / 2 - bulletWidth / 2, playerY, Math.PI / 4]);
        } else {
            bullets.push([playerX + playerWidth / 2 - bulletWidth / 2, playerY, 0]);
        }
        sendGameState();
    } else if (event.code === 'KeyR' && gameOver) {
        resetGame();
    } else {
        keys[event.code] = true;
        sendGameState();
    }
}

const keys = {};
function handleKeyDown(event) {
    keys[event.code] = true;
}

function handleKeyUp(event) {
    keys[event.code] = false;
    sendGameState();
}

function gameLoop() {
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    updateGame();
    drawGame();

    if (!gameOver) {
        window.requestAnimationFrame(gameLoop);
    }
}

function updateGame() {
    if (keys['KeyA'] && playerX > 0) {
        playerX -= playerSpeed;
    }
    if (keys['KeyD'] && playerX < screenWidth - playerWidth) {
        playerX += playerSpeed;
    }
    if (keys['KeyW'] && playerY > 0) {
        playerY -= playerSpeed;
    }
    if (keys['KeyS'] && playerY < screenHeight - playerHeight) {
        playerY += playerSpeed;
    }

    checkTripleShotDuration();
    if (!gameOver) {
        spawnObstaclesAndPowerUps();
        handleBulletMovement();
        if (invincible && Date.now() - invincibleStartTime > invincibleDuration) {
            invincible = false;
        }
        if (!invincible) {
            handleCollisionsWithObstacles();
        }
        handleCollisionsWithHearts();
        handleCollisionsWithTripleShots();
    }
}

function checkTripleShotDuration() {
    if (tripleShot && Date.now() - tripleShotStartTime > tripleShotDuration) {
        tripleShot = false;
    }
}

function spawnObstaclesAndPowerUps() {
    if (Math.random() < 1 / 50) {
        let obstacleWidth = Math.random() * 50 + 20;
        let obstacleHeight = obstacleWidth / 2;
        let obstacleX = Math.random() * (screenWidth - obstacleWidth);
        let speed = Math.max(1, 8 - obstacleWidth / 10);
        obstacles.push([obstacleX, 0, obstacleWidth, obstacleHeight, speed]);
    }
    if (Math.random() < 1 / 200) {
        let heartX = Math.random() * (screenWidth - 20);
        hearts.push([heartX, 0, 2]);
    }
    if (Math.random() < 1 / 300) {
        let tripleshotX = Math.random() * (screenWidth - 20);
        tripleshots.push([tripleshotX, 0, 2]);
    }
    obstacles.forEach(o => o[1] += o[4]);
    hearts.forEach(h => h[1] += h[2]);
    tripleshots.forEach(t => t[1] += t[2]);
}

function handleBulletMovement() {
    let bulletsToRemove = new Set();

    bullets.forEach((bullet, i) => {
        let dx = bulletSpeed * Math.sin(bullet[2]);
        let dy = -bulletSpeed * Math.cos(bullet[2]);
        bullet[0] += dx;
        bullet[1] += dy;

        obstacles.forEach((o, j) => {
            if (bullet[0] < o[0] + o[2] && bullet[0] + bulletWidth > o[0] && bullet[1] < o[1] + o[3] && bullet[1] + bulletHeight > o[1]) {
                obstacles.splice(j, 1);
                bulletsToRemove.add(i);
                score++;
            }
        });

        hearts.forEach((h, j) => {
            if (bullet[0] < h[0] + 20 && bullet[0] + bulletWidth > h[0] && bullet[1] < h[1] + 20 && bullet[1] + bulletHeight > h[1]) {
                hearts.splice(j, 1);
                bulletsToRemove.add(i);
            }
        });

        tripleshots.forEach((t, j) => {
            if (bullet[0] < t[0] + 20 && bullet[0] + bulletWidth > t[0] && bullet[1] < t[1] + 20 && bullet[1] + bulletHeight > t[1]) {
                tripleshots.splice(j, 1);
                bulletsToRemove.add(i);
            }
        });
    });

    bullets = bullets.filter((_, i) => !bulletsToRemove.has(i));
    obstacles = obstacles.filter(o => o[1] < screenHeight);
    hearts = hearts.filter(h => h[1] < screenHeight);
    tripleshots = tripleshots.filter(t => t[1] < screenHeight);
}

function handleCollisionsWithObstacles() {
    obstacles.forEach((o, i) => {
        if (playerX < o[0] + o[2] && playerX + playerWidth > o[0] && playerY < o[1] + o[3] && playerY + playerHeight > o[1]) {
            lives--;
            invincible = true;
            invincibleStartTime = Date.now();
            obstacles.splice(i, 1);
            if (lives <= 0) {
                gameOver = true;
            }
        }
    });
}

function handleCollisionsWithHearts() {
    hearts.forEach((h, i) => {
        if (playerX < h[0] + 20 && playerX + playerWidth > h[0] && playerY < h[1] + 20 && playerY + playerHeight > h[1]) {
            if (lives < 3) {
                lives++;
                hearts.splice(i, 1);
            }
        }
    });
}

function handleCollisionsWithTripleShots() {
    tripleshots.forEach((t, i) => {
        if (playerX < t[0] + 20 && playerX + playerWidth > t[0] && playerY < t[1] + 20 && playerY + playerHeight > t[1]) {
            tripleShot = true;
            tripleShotStartTime = Date.now();
            tripleshots.splice(i, 1);
        }
    });
}

function drawGame() {
    drawPlayer();
    drawOtherPlayers();
    drawObstacles();
    drawHearts();
    drawTripleShots();
    drawBullets();
    displayLivesAndScore();
    handleGameOver();
}

function drawPlayer() {
    ctx.fillStyle = WHITE;
    if (invincible && (Date.now() - invincibleStartTime) % 400 < 200) {
        ctx.fillRect(playerX, playerY, playerWidth, playerHeight);
    } else if (!invincible) {
        ctx.fillRect(playerX, playerY, playerWidth, playerHeight);
    }
}

function drawOtherPlayers() {
    ctx.fillStyle = 'green';
    for (let id in otherPlayers) {
        const otherPlayer = otherPlayers[id];
        ctx.fillRect(otherPlayer.x, otherPlayer.y, playerWidth, playerHeight);
        otherPlayer.bullets.forEach(bullet => ctx.fillRect(bullet.x, bullet.y, bulletWidth, bulletHeight));
    }
}

function drawObstacles() {
    ctx.fillStyle = RED;
    obstacles.forEach(o => ctx.fillRect(o[0], o[1], o[2], o[3]));
}

function drawHearts() {
    hearts.forEach(h => {
        let centerX = h[0] + 10;
        let centerY = h[1] + 10;
        ctx.fillStyle = HEART_COLOR;
        ctx.beginPath();
        ctx.arc(centerX - 5, centerY, 7, 0, Math.PI * 2);
        ctx.arc(centerX + 5, centerY, 7, 0, Math.PI * 2);
        ctx.moveTo(centerX - 8, centerY + 3);
        ctx.lineTo(centerX + 8, centerY + 3);
        ctx.lineTo(centerX, centerY + 15);
        ctx.closePath();
        ctx.fill();
    });
}

function drawTripleShots() {
    ctx.fillStyle = TRIPLESHOT_COLOR;
    tripleshots.forEach(t => ctx.fillRect(t[0], t[1], 20, 20));
}

function drawBullets() {
    ctx.fillStyle = BLUE;
    bullets.forEach(b => ctx.fillRect(b[0], b[1], bulletWidth, bulletHeight));
}

function displayLivesAndScore() {
    ctx.fillStyle = WHITE;
    ctx.textAlign = 'left';
    ctx.fillText(`Lives: ${lives}`, 10, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${score}`, screenWidth - 10, 30);
}

function handleGameOver() {
    if (gameOver) {
        ctx.fillStyle = RED;
        ctx.textAlign = 'center';
        ctx.fillText("Game Over, WOMP WOMP! Press 'R' to Restart", screenWidth / 2, screenHeight / 2);
    }
}

function sendGameState() {
    const gameState = {
        id: ws.id,
        x: playerX,
        y: playerY,
        bullets: bullets.map(b => ({ x: b[0], y: b[1], angle: b[2] }))
    };
    ws.send(JSON.stringify(gameState));
}

setup();
