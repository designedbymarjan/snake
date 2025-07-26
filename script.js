// 🎮 Snake Game with Theme Support

// المان‌ها
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const muteBtn = document.getElementById("muteBtn");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const gameOverEl = document.getElementById("gameOver");
const finalScoreEl = document.getElementById("finalScore");
const powerUpMsg = document.getElementById("powerUpMsg");
const themeButtons = document.querySelectorAll(".themeBtn");

const eatSound = document.getElementById("eatSound");
const gameOverSound = document.getElementById("gameOverSound");
const powerUpSound = document.getElementById("powerUpSound");
const startSound = document.getElementById("startSound");
const bgMusic = document.getElementById("bgMusic");
const hissSound = document.getElementById("hissSound");

const boxSize = 25;
const canvasSize = 500;
let speed = 130;
let snake = [];
let direction = { x: 1, y: 0 };
let food = {};
let fleeingFood = null;
let score = 0;
let highScore = parseInt(localStorage.getItem("snakeHighScore")) || 0;
let gameLoop;
let isGameOver = false;
let muted = false;
let freezeTimer = 0;
let totalSeconds = 0;
let appleBounceOffset = 0;
let bounceDirection = 1;


// 🎨 مدیریت تغییر تم رنگی
const themeButtons1 = document.querySelectorAll(".themeBtn");

themeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const colors = btn.dataset.color.split(",");
    document.body.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;

    // تغییر رنگ منوی تنظیمات و دکمه‌ها
    const menuBox = document.querySelector(".menu-box");
    menuBox.style.backgroundColor = colors[0];

    document.querySelectorAll("button").forEach(button => {
      button.style.backgroundColor = colors[1];
      button.style.borderColor = colors[0];
      button.style.color = "#fff";
    });

    // ذخیره تم انتخاب‌شده در حافظه مرورگر
    localStorage.setItem("themeColor1", colors[0]);
    localStorage.setItem("themeColor2", colors[1]);
  });
});

// 🧠 لود تم ذخیره‌شده هنگام ورود دوباره
window.addEventListener("load", () => {
  const color1 = localStorage.getItem("themeColor1");
  const color2 = localStorage.getItem("themeColor2");

  if (color1 && color2) {
    document.body.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;

    const menuBox = document.querySelector(".menu-box");
    menuBox.style.backgroundColor = color1;

    document.querySelectorAll("button").forEach(button => {
      button.style.backgroundColor = color2;
      button.style.borderColor = color1;
      button.style.color = "#fff";
    });
  }
});


// موقعیت‌های تصادفی
function randomGrid() {
  return Math.floor(Math.random() * (canvasSize / boxSize));
}

function spawnFood() {
  food = {
    x: randomGrid(),
    y: randomGrid(),
    power: Math.random() < 0.15
  };
}

function drawBoard() {
  for (let i = 0; i < canvasSize / boxSize; i++) {
    for (let j = 0; j < canvasSize / boxSize; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? "#b2dfdb" : "#80cbc4";
      ctx.fillRect(i * boxSize, j * boxSize, boxSize, boxSize);
    }
  }
}

function drawSnake() {
  snake.forEach((seg, i) => {
    let grad = ctx.createLinearGradient(
      seg.x * boxSize,
      seg.y * boxSize,
      (seg.x + 1) * boxSize,
      (seg.y + 1) * boxSize
    );
    grad.addColorStop(0, "#66bb6a");
    grad.addColorStop(1, "#2e7d32");
    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 4;
    ctx.fillRect(seg.x * boxSize, seg.y * boxSize, boxSize, boxSize);
  });
  ctx.shadowBlur = 0;
  drawEyes(snake[0]);
}

function drawEyes(head) {
  const eyeSize = boxSize * 0.12;
  const offset = boxSize * 0.2;
  const x1 = head.x * boxSize + offset;
  const x2 = head.x * boxSize + boxSize - offset;
  const y = head.y * boxSize + offset;

  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x1, y, eyeSize, 0, 2 * Math.PI); ctx.fill();
  ctx.beginPath(); ctx.arc(x2, y, eyeSize, 0, 2 * Math.PI); ctx.fill();

  ctx.fillStyle = "#000";
  const dx = direction.x * 2;
  const dy = direction.y * 2;
  ctx.beginPath(); ctx.arc(x1 + dx, y + dy, eyeSize / 2, 0, 2 * Math.PI); ctx.fill();
  ctx.beginPath(); ctx.arc(x2 + dx, y + dy, eyeSize / 2, 0, 2 * Math.PI); ctx.fill();
}

function drawFoodItem(item, isPower, bounce = false) {
  const bounceOffset = bounce ? appleBounceOffset : 0;
  const x = item.x * boxSize + boxSize / 2;
  const y = item.y * boxSize + boxSize / 2 - bounceOffset;
  const r = boxSize / 2.6;

  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + 4, y - r - 8, x, y - r - 10);
  ctx.quadraticCurveTo(x - 4, y - r - 8, x, y - r);
  ctx.fillStyle = "#2e7d32";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = isPower ? "#ffd700" : "#d32f2f";
  ctx.fill();
  ctx.strokeStyle = "#000"; ctx.stroke();
}

function drawFood() {
  drawFoodItem(food, food.power, true);
  if (fleeingFood) drawFoodItem(fleeingFood, false);
}

function updateBounce() {
  appleBounceOffset += bounceDirection * 0.6;
  if (appleBounceOffset > 5 || appleBounceOffset < -2) bounceDirection *= -1;
  requestAnimationFrame(updateBounce);
}
updateBounce();

function update() {
  totalSeconds++;

  if (totalSeconds === 150) triggerFreeze();
  if (totalSeconds >= 100 && !fleeingFood) spawnFleeingFood();

  if (freezeTimer > 0) {
    freezeTimer--;
    draw(); return;
  }

  const newHead = { ...snake[0] };
  newHead.x += direction.x;
  newHead.y += direction.y;

  if (
    newHead.x < 0 || newHead.x >= canvasSize / boxSize ||
    newHead.y < 0 || newHead.y >= canvasSize / boxSize ||
    snake.some((seg, i) => i > 0 && seg.x === newHead.x && seg.y === newHead.y)
  ) {
    clearInterval(gameLoop);
    gameOver(); return;
  }

  snake.unshift(newHead);
  let ate = false;

  if (newHead.x === food.x && newHead.y === food.y) {
    ate = true;
    score += food.power ? 3 : 1;
    !muted && (food.power ? powerUpSound.play() : eatSound.play());
    spawnFood();
  }

  if (fleeingFood && newHead.x === fleeingFood.x && newHead.y === fleeingFood.y) {
    score += 2;
    fleeingFood = null;
    ate = true;
  }

  if (!ate) snake.pop();
  draw();
  scoreEl.textContent = score;
}

function spawnFleeingFood() {
  fleeingFood = { x: randomGrid(), y: randomGrid(), ttl: 100 };
}

function triggerFreeze() {
  freezeTimer = 90;
  powerUpMsg.textContent = "❄️ یخ زدی!";
  powerUpMsg.style.display = "block";
  setTimeout(() => powerUpMsg.style.display = "none", 2000);
}

function draw() {
  drawBoard();
  drawSnake();
  drawFood();
}

function startGame() {
  !muted && startSound.play();
  !muted && bgMusic.play();
  !muted && hissSound.play();
  snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 }
  ];
  direction = { x: 1, y: 0 };
  score = 0;
  totalSeconds = 0;
  freezeTimer = 0;
  isGameOver = false;
  spawnFood();
  fleeingFood = null;
  gameOverEl.style.display = "none";
  restartBtn.style.display = "none";
  gameLoop = setInterval(update, speed);
}

function gameOver() {
  isGameOver = true;
  bgMusic.pause();
  hissSound.pause();
  !muted && gameOverSound.play();
  gameOverEl.style.display = "block";
  finalScoreEl.textContent = score;
  restartBtn.style.display = "inline";
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("snakeHighScore", highScore);
  }
  highScoreEl.textContent = highScore;
}

// رویدادها
document.querySelectorAll(".difficultyBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    speed = parseInt(btn.dataset.speed);
    startBtn.disabled = false;
    document.querySelectorAll(".difficultyBtn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
muteBtn.addEventListener("click", () => {
  muted = !muted;
  muteBtn.textContent = muted ? "🔇 صدا قطع" : "🔊 صدا روشن";
  bgMusic.pause(); hissSound.pause();
});

document.addEventListener("keydown", e => {
  if (isGameOver || freezeTimer > 0) return;
  if (e.key === "ArrowUp" && direction.y !== 1) direction = { x: 0, y: -1 };
  else if (e.key === "ArrowDown" && direction.y !== -1) direction = { x: 0, y: 1 };
  else if (e.key === "ArrowLeft" && direction.x !== 1) direction = { x: -1, y: 0 };
  else if (e.key === "ArrowRight" && direction.x !== -1) direction = { x: 1, y: 0 };
});
