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
    
    // Handle shooting based on EMG data
    if (data.shoot === 1 && !gameOver) {
        shootBullets();
        sendGameState();
    } else {
        otherPlayers[data.id] = data;
    }
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

// Modified function to handle shooting bullets
function shootBullets() {
    if (tripleShot) {
        bullets.push([playerX + playerWidth / 2 - bulletWidth / 2, playerY, 0]);
        bullets.push([playerX + playerWidth / 2 - bulletWidth / 2, playerY, -Math.PI / 4]);
        bullets.push([playerX + playerWidth / 2 - bulletWidth / 2, playerY, Math.PI / 4]);
    } else {
        bullets.push([playerX + playerWidth / 2 - bulletWidth / 2, playerY, 0]);
    }
}

function handleKeyDown(event) {
    if (event.code === 'Space' && !gameOver) {
        shootBullets();
        sendGameState();
    } else if (event.code === 'KeyR' && gameOver) {
        resetGame();
    } else {
        keys[event.code] = true;
        sendGameState();
    }
}

// Additional game logic...
// (Keep the rest of your functions, such as handleKeyUp, gameLoop, updateGame, etc., unchanged.)

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
