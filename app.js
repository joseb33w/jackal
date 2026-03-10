const gameArea = document.getElementById('gameArea');
const startBtn = document.getElementById('startBtn');
const scoreEl = document.getElementById('score');
const killsEl = document.getElementById('kills');
const comboEl = document.getElementById('combo');
const ammoEl = document.getElementById('ammo');
const timeEl = document.getElementById('time');
const statusEl = document.getElementById('status');

const state = {
  score: 0,
  kills: 0,
  combo: 0,
  ammo: 6,
  timeLeft: 60,
  running: false,
  enemyId: 0,
  spawnTimer: null,
  gameTimer: null,
  reloadTimer: null,
  lastKillAt: 0,
};

const enemyTypes = [
  { key: 'grunt', label: 'Grunt', speed: 5200, points: 100, radius: 32 },
  { key: 'runner', label: 'Runner', speed: 3600, points: 125, radius: 26 },
  { key: 'elite', label: 'Elite', speed: 4200, points: 175, radius: 30 },
];

function updateHud() {
  scoreEl.textContent = state.score;
  killsEl.textContent = state.kills;
  comboEl.textContent = `x${Math.max(1, state.combo)}`;
  ammoEl.textContent = state.ammo;
  timeEl.textContent = state.timeLeft;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function clearEnemies() {
  gameArea.querySelectorAll('.enemy, .floating-text').forEach((node) => node.remove());
}

function resetGame() {
  state.score = 0;
  state.kills = 0;
  state.combo = 0;
  state.ammo = 6;
  state.timeLeft = 60;
  state.enemyId = 0;
  state.lastKillAt = 0;
  updateHud();
  clearEnemies();
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnEnemy() {
  if (!state.running) return;

  const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  const enemy = document.createElement('button');
  enemy.className = `enemy ${type.key}`;
  enemy.type = 'button';
  enemy.dataset.type = type.key;
  enemy.dataset.points = type.points;
  enemy.dataset.radius = type.radius;
  enemy.dataset.id = String(++state.enemyId);

  const tag = document.createElement('span');
  tag.textContent = type.label;
  enemy.appendChild(tag);

  const areaRect = gameArea.getBoundingClientRect();
  const startY = randomBetween(70, areaRect.height - 180);
  const direction = Math.random() > 0.5 ? 1 : -1;
  const startX = direction > 0 ? -80 : areaRect.width + 20;
  const endX = direction > 0 ? areaRect.width + 80 : -100;

  enemy.style.left = `${startX}px`;
  enemy.style.top = `${startY}px`;
  gameArea.appendChild(enemy);

  const start = performance.now();
  const duration = type.speed + randomBetween(-800, 900);

  function animate(now) {
    if (!enemy.isConnected) return;
    const progress = Math.min((now - start) / duration, 1);
    const currentX = startX + (endX - startX) * progress;
    const wave = Math.sin(progress * Math.PI * 2) * (type.key === 'runner' ? 36 : 22);
    enemy.style.left = `${currentX}px`;
    enemy.style.top = `${startY + wave}px`;

    if (progress < 1 && state.running) {
      requestAnimationFrame(animate);
    } else if (enemy.isConnected) {
      enemy.remove();
      if (state.running) {
        state.combo = 0;
        updateHud();
        setStatus(`${type.label} escaped. Combo reset.`);
      }
    }
  }

  requestAnimationFrame(animate);
}

function spawnLoop() {
  spawnEnemy();
  const nextSpawn = Math.max(450, 1200 - (60 - state.timeLeft) * 8);
  state.spawnTimer = window.setTimeout(spawnLoop, nextSpawn);
}

function showFloatingText(x, y, text, color = '#ffd166') {
  const floater = document.createElement('div');
  floater.className = 'floating-text';
  floater.textContent = text;
  floater.style.left = `${x}px`;
  floater.style.top = `${y}px`;
  floater.style.color = color;
  gameArea.appendChild(floater);
  window.setTimeout(() => floater.remove(), 900);
}

function reload() {
  if (state.reloadTimer || !state.running) return;
  setStatus('Reloading...');
  state.reloadTimer = window.setTimeout(() => {
    state.ammo = 6;
    state.reloadTimer = null;
    updateHud();
    setStatus('Magazine reloaded. Get back on target.');
  }, 1200);
}

function endGame() {
  state.running = false;
  window.clearTimeout(state.spawnTimer);
  window.clearInterval(state.gameTimer);
  window.clearTimeout(state.reloadTimer);
  state.spawnTimer = null;
  state.gameTimer = null;
  state.reloadTimer = null;
  startBtn.textContent = 'Restart Mission';
  setStatus(`Mission complete. Final score ${state.score} with ${state.kills} kills.`);
}

function startGame() {
  resetGame();
  state.running = true;
  startBtn.textContent = 'Mission Active';
  setStatus('Mission live. Engage all hostile targets.');
  spawnLoop();
  state.gameTimer = window.setInterval(() => {
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateHud();
      endGame();
      return;
    }
    updateHud();
  }, 1000);
}

function scoreShot(enemy, event) {
  if (!state.running || state.ammo <= 0) return;

  state.ammo -= 1;
  updateHud();

  const rect = enemy.getBoundingClientRect();
  const hitX = event.clientX - rect.left;
  const hitY = event.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const distance = Math.hypot(hitX - centerX, hitY - centerY);
  const radius = Number(enemy.dataset.radius);

  let points = Number(enemy.dataset.points);
  let shotLabel = 'Body shot';

  if (distance < radius * 0.35) {
    points += 150;
    shotLabel = 'Headshot';
  } else if (distance > radius * 0.82) {
    points += 50;
    shotLabel = 'Edge shot';
  }

  if (enemy.dataset.type === 'elite') {
    points += 75;
  }

  const now = Date.now();
  if (now - state.lastKillAt < 1800) {
    state.combo += 1;
  } else {
    state.combo = 1;
  }
  state.lastKillAt = now;

  const multiplier = Math.min(4, 1 + (state.combo - 1) * 0.25);
  const awarded = Math.round(points * multiplier);

  state.score += awarded;
  state.kills += 1;
  updateHud();

  enemy.classList.add('hit');
  showFloatingText(event.clientX - gameArea.getBoundingClientRect().left, event.clientY - gameArea.getBoundingClientRect().top, `+${awarded}`, '#ffd166');
  setStatus(`${shotLabel}! ${enemy.dataset.type.toUpperCase()} eliminated for ${awarded} points.`);

  window.setTimeout(() => enemy.remove(), 90);

  if (state.ammo === 0) {
    reload();
  }
}

startBtn.addEventListener('click', () => {
  if (!state.running) {
    startGame();
  }
});

gameArea.addEventListener('click', (event) => {
  if (!state.running) return;

  const enemy = event.target.closest('.enemy');
  if (enemy) {
    scoreShot(enemy, event);
    return;
  }

  if (state.ammo > 0) {
    state.ammo -= 1;
    updateHud();
    setStatus('Missed shot. Steady your aim.');
    showFloatingText(event.clientX - gameArea.getBoundingClientRect().left, event.clientY - gameArea.getBoundingClientRect().top, 'MISS', '#ff8fab');
    if (state.ammo === 0) {
      reload();
    }
  }
});

gameArea.addEventListener('mousemove', (event) => {
  const rect = gameArea.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const scope = gameArea.querySelector('.scope');
  scope.style.setProperty('--x', `${x}px`);
  scope.style.setProperty('--y', `${y}px`);
  scope.querySelectorAll('.crosshair, .scope-ring').forEach((node) => {
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
  });
});

updateHud();