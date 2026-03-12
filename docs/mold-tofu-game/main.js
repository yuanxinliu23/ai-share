const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const tip = document.getElementById("tip");
const seasonPanel = document.getElementById("season-panel");
const seasonList = document.getElementById("season-list");
const shakeBtn = document.getElementById("shake");
const jarPanel = document.getElementById("jar-panel");
const pourBtn = document.getElementById("pour");
const doneModal = document.getElementById("done-modal");
const doneRestartBtn = document.getElementById("done-restart");
const restartBtn = document.getElementById("restart");
const toggleSfxBtn = document.getElementById("toggle-sfx");

const GRID = 4;
const TOTAL = GRID * GRID;

const SEASONS = [
  { id: "chili", name: "辣椒", color: "#ff3b3b" },
  { id: "baijiu", name: "白酒", color: "#7ad1ff" },
  { id: "salt", name: "盐", color: "#f5f7ff" },
];

let dpr = window.devicePixelRatio || 1;
let width = 0;
let height = 0;
let board = { x: 0, y: 0, size: 0, cell: 0 };
let bowl = { x: 0, y: 0, w: 0, h: 0 };
let jar = { x: 0, y: 0, w: 0, h: 0 };
let tofuGrid = [];
let blocks = [];
let slashes = [];
let seasoningParticles = [];
let pourParticles = [];
let jarSlots = [];
let jarFilled = 0;
let jarLiquid = 0;
let jarLiquidTarget = 0;
let pourQueue = [];
let activePours = [];
let pourCooldown = 0;
const POUR_BATCH = 3;
let jarMixParticles = [];
let cutProgress = { v: [false, false, false], h: [false, false, false] };
let cutLines = [];
let isCutIntoGrid = false;
let spoon = { x: 0, y: 0, angle: 0, visible: false };
let bambooCanvas = null;
let tofuPattern = null;
let bambooPattern = null;
const JAR_SCALE = 0.78;
let selectedSeasons = new Set();
let audioCtx = null;
let sfxEnabled = true;
let state = "cut"; // cut | season | shake | jar | pour | done
let shakeStart = 0;
let pourStart = 0;
let lastTime = 0;
let slicing = false;
let lastPointer = null;
let textureCanvas = null;

function setupTexture() {
  textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const tctx = textureCanvas.getContext("2d");
  tctx.fillStyle = "#fbfaf7";
  tctx.fillRect(0, 0, 256, 256);

  // 细绒感：大量微小柔点
  for (let i = 0; i < 2400; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 1.3;
    tctx.fillStyle = `rgba(240, 236, 230, ${0.08 + Math.random() * 0.12})`;
    tctx.shadowColor = "rgba(255, 255, 255, 0.6)";
    tctx.shadowBlur = 2;
    tctx.beginPath();
    tctx.arc(x, y, r, 0, Math.PI * 2);
    tctx.fill();
  }
  tctx.shadowBlur = 0;

  // 少量更柔和的团簇（避免气泡感）
  for (let i = 0; i < 120; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 6 + Math.random() * 10;
    const g = tctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, "rgba(255, 255, 255, 0.5)");
    g.addColorStop(1, "rgba(245, 241, 236, 0.0)");
    tctx.fillStyle = g;
    tctx.beginPath();
    tctx.arc(x, y, r, 0, Math.PI * 2);
    tctx.fill();
  }

  tofuPattern = ctx.createPattern(textureCanvas, "repeat");
}

function setupBambooTexture() {
  bambooCanvas = document.createElement("canvas");
  bambooCanvas.width = 240;
  bambooCanvas.height = 240;
  const bctx = bambooCanvas.getContext("2d");
  bctx.fillStyle = "#f2ddb7";
  bctx.fillRect(0, 0, 240, 240);

  const slatW = 44;
  const gap = 18;
  const step = slatW + gap;
  for (let x = 0; x < 240; x += step) {
    const grad = bctx.createLinearGradient(x, 0, x + slatW, 0);
    grad.addColorStop(0, "rgba(205, 155, 95, 0.22)");
    grad.addColorStop(0.5, "rgba(245, 218, 170, 0.95)");
    grad.addColorStop(1, "rgba(175, 125, 75, 0.18)");
    bctx.fillStyle = grad;
    bctx.fillRect(x, 0, slatW, 240);

    bctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    bctx.fillRect(x + 4, 0, 2, 240);
    bctx.fillStyle = "rgba(120, 80, 40, 0.12)";
    bctx.fillRect(x + slatW - 4, 0, 2, 240);
  }

  for (let y = 28; y < 240; y += 64) {
    bctx.fillStyle = "rgba(120, 80, 40, 0.12)";
    bctx.fillRect(0, y, 240, 3);
    bctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    bctx.fillRect(0, y + 3, 240, 1);
  }

  bambooPattern = ctx.createPattern(bambooCanvas, "repeat");
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  board.size = Math.min(width * 0.58, height * 0.48);
  board.x = width / 2 - board.size / 2;
  board.y = height * 0.18;
  board.cell = board.size / GRID;

  bowl.w = Math.min(width * 0.62, 520);
  bowl.h = bowl.w * 0.42;
  bowl.x = width / 2 - bowl.w / 2;
  bowl.y = height * 0.64;

  jar.w = Math.min(220, width * 0.28);
  jar.h = jar.w * 1.35;
  const jarMargin = Math.max(16, width * 0.04);
  jar.x = width - jar.w - jarMargin;
  jar.y = height * 0.42;
  if (width < 680) {
    jar.x = width * 0.65 - jar.w / 2;
    jar.y = height * 0.36;
  }
  buildJarSlots();

  tofuGrid.forEach((cell) => {
    cell.x = board.x + cell.col * board.cell;
    cell.y = board.y + cell.row * board.cell;
    cell.size = board.cell;
  });
}

function initGrid() {
  tofuGrid = [];
  for (let row = 0; row < GRID; row += 1) {
    for (let col = 0; col < GRID; col += 1) {
      tofuGrid.push({ row, col, scooped: false, x: 0, y: 0, size: 0 });
    }
  }
  resize();
}

function setTip(text) {
  tip.textContent = text;
}

function setState(next) {
  state = next;
  if (state === "cut") {
    seasonPanel.classList.remove("show");
    jarPanel.classList.remove("show");
    doneModal.classList.remove("show");
    setTip("用勺子切成16块");
  }
  if (state === "season") {
    seasonPanel.classList.add("show");
    jarPanel.classList.remove("show");
    doneModal.classList.remove("show");
    setTip("选调料～");
  }
  if (state === "shake") {
    seasonPanel.classList.remove("show");
    jarPanel.classList.remove("show");
    doneModal.classList.remove("show");
    setTip("摇一摇!");
  }
  if (state === "scoop") {
    seasonPanel.classList.remove("show");
    jarPanel.classList.remove("show");
    doneModal.classList.remove("show");
    setTip("用勺子撇进盆里");
  }
  if (state === "jar") {
    seasonPanel.classList.remove("show");
    jarPanel.classList.add("show");
    doneModal.classList.remove("show");
    setTip("倒进罐子~");
  }
  if (state === "pour") {
    seasonPanel.classList.remove("show");
    jarPanel.classList.remove("show");
    doneModal.classList.remove("show");
    setTip("装罐中…");
  }
  if (state === "done") {
    jarPanel.classList.remove("show");
    doneModal.classList.add("show");
    setTip("完成啦!");
  }
}

function resetGame() {
  blocks = [];
  slashes = [];
  seasoningParticles = [];
  pourParticles = [];
  buildJarSlots();
  jarFilled = 0;
  jarLiquid = 0;
  jarLiquidTarget = 0;
  pourQueue = [];
  activePours = [];
  pourCooldown = 0;
  jarMixParticles = [];
  cutProgress = { v: [false, false, false], h: [false, false, false] };
  cutLines = [];
  isCutIntoGrid = false;
  selectedSeasons.clear();
  shakeBtn.disabled = true;
  tofuGrid.forEach((cell) => (cell.scooped = false));
  setState("cut");
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSliceSfx() {
  if (!sfxEnabled) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(840, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

function playDropSfx() {
  if (!sfxEnabled) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.2);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.24);
}

function playShakeSfx() {
  if (!sfxEnabled) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.6, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.4;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1200;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  noise.connect(filter).connect(gain).connect(audioCtx.destination);
  noise.start(now);
}

function toggleSfx() {
  sfxEnabled = !sfxEnabled;
  toggleSfxBtn.textContent = `音效: ${sfxEnabled ? "开" : "关"}`;
}

function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  const { x, y, size } = rect;
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
  return (
    segmentsIntersect(x1, y1, x2, y2, x, y, x + size, y) ||
    segmentsIntersect(x1, y1, x2, y2, x + size, y, x + size, y + size) ||
    segmentsIntersect(x1, y1, x2, y2, x + size, y + size, x, y + size) ||
    segmentsIntersect(x1, y1, x2, y2, x, y + size, x, y)
  );
}

function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.size && py >= rect.y && py <= rect.y + rect.size;
}

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = direction(x3, y3, x4, y4, x1, y1);
  const d2 = direction(x3, y3, x4, y4, x2, y2);
  const d3 = direction(x1, y1, x2, y2, x3, y3);
  const d4 = direction(x1, y1, x2, y2, x4, y4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

function direction(ax, ay, bx, by, cx, cy) {
  return (cx - ax) * (by - ay) - (cy - ay) * (bx - ax);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function quadBezier(p0, p1, p2, t) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

function angleIsHorizontal(angle) {
  const a = Math.abs(angle);
  return a < Math.PI / 9 || a > (Math.PI * 8) / 9;
}

function angleIsVertical(angle) {
  const a = Math.abs(angle);
  return a > (Math.PI * 4) / 9 && a < (Math.PI * 5) / 9;
}

function handleSlice(p1, p2) {
  if (state !== "cut") return;
  const boardRect = { x: board.x, y: board.y, size: board.size };
  if (!segmentIntersectsRect(p1.x, p1.y, p2.x, p2.y, boardRect)) return;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dy, dx);
  let changed = false;
  const midX = (p1.x + p2.x) / 2 - board.x;
  const midY = (p1.y + p2.y) / 2 - board.y;
  const threshold = board.cell * 0.25;

  if (angleIsVertical(angle)) {
    for (let i = 1; i <= GRID - 1; i += 1) {
      const lineX = board.cell * i;
      if (Math.abs(midX - lineX) < threshold && !cutProgress.v[i - 1]) {
        cutProgress.v[i - 1] = true;
        changed = true;
      }
    }
  }
  if (angleIsHorizontal(angle)) {
    for (let i = 1; i <= GRID - 1; i += 1) {
      const lineY = board.cell * i;
      if (Math.abs(midY - lineY) < threshold && !cutProgress.h[i - 1]) {
        cutProgress.h[i - 1] = true;
        changed = true;
      }
    }
  }

  if (changed) {
    playSliceSfx();
    slashes.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, life: 0.25 });
  }
  const allV = cutProgress.v.every(Boolean);
  const allH = cutProgress.h.every(Boolean);
  if (allV && allH && !isCutIntoGrid) {
    isCutIntoGrid = true;
    setTimeout(() => {
      if (state === "cut") setState("scoop");
    }, 400);
  }
}

function spawnBlock(cell) {
  const size = cell.size * 0.95;
  blocks.push({
    x: cell.x + cell.size / 2,
    y: cell.y + cell.size / 2,
    size,
    vx: (Math.random() - 0.5) * 2.4,
    vy: -2 - Math.random() * 1.5,
    rot: Math.random() * Math.PI,
    rotSpeed: (Math.random() - 0.5) * 0.06,
    inJar: false,
    target: null,
  });
  playDropSfx();
}

function handleScoop(point) {
  if (state !== "scoop") return;
  tofuGrid.forEach((cell) => {
    if (cell.scooped) return;
    if (pointInRect(point.x, point.y, cell)) {
      cell.scooped = true;
      spawnBlock(cell);
    }
  });
  const allScooped = tofuGrid.every((cell) => cell.scooped);
  if (allScooped) {
    setTimeout(() => {
      if (state === "scoop") setState("season");
    }, 400);
  }
}

function createSeasonButtons() {
  seasonList.innerHTML = "";
  SEASONS.forEach((season) => {
    const btn = document.createElement("button");
    btn.className = "season-btn";
    btn.type = "button";
    btn.dataset.id = season.id;
    let icon = "";
    if (season.id === "chili") {
      icon = `
        <svg viewBox="0 0 64 64" class="season-icon" aria-hidden="true">
          <rect x="8" y="14" width="48" height="40" rx="6" fill="#d6453b" stroke="#a1332b" stroke-width="2"></rect>
          <rect x="18" y="8" width="28" height="10" rx="4" fill="#f2e6d8" stroke="#c9b39c" stroke-width="2"></rect>
          <text x="32" y="40" text-anchor="middle" font-size="14" fill="#fff" font-weight="700">辣椒</text>
        </svg>
      `;
    } else if (season.id === "baijiu") {
      icon = `
        <svg viewBox="0 0 64 64" class="season-icon" aria-hidden="true">
          <rect x="24" y="6" width="16" height="10" rx="3" fill="#c9b39c"></rect>
          <rect x="18" y="14" width="28" height="42" rx="10" fill="#f2f6f9" stroke="#b7c3cf" stroke-width="2"></rect>
          <text x="32" y="40" text-anchor="middle" font-size="14" fill="#9aa7b4" font-weight="700">茅台</text>
        </svg>
      `;
    } else if (season.id === "salt") {
      icon = `
        <svg viewBox="0 0 64 64" class="season-icon" aria-hidden="true">
          <rect x="12" y="18" width="40" height="36" rx="10" fill="#f5f1ea" stroke="#d2c9bf" stroke-width="2"></rect>
          <rect x="18" y="10" width="28" height="12" rx="6" fill="#e6dccf" stroke="#cbbfb1" stroke-width="2"></rect>
          <text x="32" y="42" text-anchor="middle" font-size="14" fill="#a79d92" font-weight="700">盐</text>
        </svg>
      `;
    }
    btn.innerHTML = `
      <span class="season-icon-wrap">${icon}</span>
    `;
    btn.addEventListener("click", () => toggleSeason(season.id));
    seasonList.appendChild(btn);
  });
}

function toggleSeason(id) {
  if (selectedSeasons.has(id)) {
    selectedSeasons.delete(id);
  } else if (selectedSeasons.size < 3) {
    selectedSeasons.add(id);
  }
  [...seasonList.children].forEach((btn) => {
    btn.classList.toggle("active", selectedSeasons.has(btn.dataset.id));
  });
  shakeBtn.disabled = selectedSeasons.size < 2;
}

function startShake() {
  if (selectedSeasons.size < 2) return;
  seasoningParticles = [];
  const bowlRect = getBowlRect();
  selectedSeasons.forEach((id) => {
    const season = SEASONS.find((s) => s.id === id);
    for (let i = 0; i < 140; i += 1) {
      seasoningParticles.push({
        x: bowlRect.x + Math.random() * bowlRect.w,
        y: bowlRect.y + Math.random() * bowlRect.h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random() * 0.4,
        r: 2 + Math.random() * 2,
        color: season.color,
        alpha: 0.8 + Math.random() * 0.2,
      });
    }
  });
  shakeStart = performance.now();
  setState("shake");
  playShakeSfx();
}

function startPour() {
  if (state !== "jar") return;
  pourStart = performance.now();
  pourParticles = [];
  jarFilled = 0;
  jarLiquid = 0;
  jarLiquidTarget = 0;
  pourQueue = blocks.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  pourQueue.forEach((block) => {
    block.inJar = false;
    block.pouring = false;
    block.target = null;
    block.pourT = 0;
    block.pourFrom = null;
    block.pourSpout = null;
    block.pourCtrl = null;
  });
  activePours = [];
  pourCooldown = 0;
  jarMixParticles = [];
  const inner = getJarInnerRect();
  const colors = Array.from(selectedSeasons).map((id) => {
    const season = SEASONS.find((s) => s.id === id);
    return season ? season.color : "#cda87a";
  });
  const mixCount = 180;
  for (let i = 0; i < mixCount; i += 1) {
    const color = colors[i % colors.length] || getSauceColor();
    jarMixParticles.push({
      x: inner.x + Math.random() * inner.w,
      y: inner.y + Math.random() * inner.h,
      r: 1.5 + Math.random() * 1.8,
      color,
      vy: 0.15 + Math.random() * 0.2,
    });
  }
  setState("pour");
}

function getBowlRect() {
  return {
    x: bowl.x + bowl.w * 0.14,
    y: bowl.y + bowl.h * 0.1,
    w: bowl.w * 0.72,
    h: bowl.h * 0.5,
  };
}

function getJarInnerRect() {
  return {
    x: jar.x + jar.w * 0.18,
    y: jar.y + jar.h * 0.18,
    w: jar.w * 0.64,
    h: jar.h * 0.68,
  };
}

function buildJarSlots() {
  jarSlots = [];
  const inner = getJarInnerRect();
  const cols = 4;
  const rows = 4;
  const cell = Math.min(inner.w / cols, inner.h / rows) * 0.92;
  const startX = inner.x + (inner.w - cell * cols) / 2;
  const startY = inner.y + inner.h - cell * rows + cell * 0.12;
  for (let r = rows - 1; r >= 0; r -= 1) {
    for (let c = 0; c < cols; c += 1) {
      jarSlots.push({
        x: startX + c * cell + cell / 2,
        y: startY + r * cell + cell / 2,
      });
    }
  }
}

function getSauceColor() {
  if (selectedSeasons.has("chili")) return "#c84a2b";
  if (selectedSeasons.has("baijiu") && selectedSeasons.has("salt")) return "#d7d0c6";
  if (selectedSeasons.has("baijiu")) return "#d5e8f6";
  return "#cda87a";
}

function getPourSpout() {
  const local = { x: bowl.x + bowl.w * 0.85, y: bowl.y + bowl.h * 0.15 };
  if (state !== "pour") return local;
  const pose = getBowlPose();
  return transformPoint(local.x, local.y, bowl.x + bowl.w / 2, bowl.y + bowl.h / 2, pose.rot, 0, pose.lift);
}

function getJarMouth() {
  const x = jar.x + jar.w * 0.5;
  const y = jar.y + jar.h * 0.08;
  return { x, y };
}

function emitSpiceBurst(from, to) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const speedBase = 4.6;
  for (let i = 0; i < 18; i += 1) {
    const speed = speedBase + Math.random() * 1.4;
    const spread = (Math.random() - 0.5) * 50;
    const targetX = to.x + spread;
    const targetY = to.y + 8 + Math.random() * 16;
    pourParticles.push({
      x: from.x + (Math.random() - 0.5) * 6,
      y: from.y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.8,
      vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.8,
      r: 1.4 + Math.random() * 2,
      life: 1,
      color: getSauceColor(),
      phase: "toMouth",
      tx: targetX,
      ty: targetY,
    });
  }
}

function getBowlPose() {
  if (state !== "pour") return { lift: 0, rot: 0 };
  const t = Math.min(1, (performance.now() - pourStart) / 450);
  const eased = easeInOut(t);
  return {
    lift: -230 * eased,
    rot: 0.42 * eased,
  };
}

function transformPoint(px, py, cx, cy, rot, dx, dy) {
  const x = px - cx;
  const y = py - cy;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return {
    x: cx + x * cos - y * sin + dx,
    y: cy + x * sin + y * cos + dy,
  };
}

function update(dt) {
  const gravity = 0.24;
  const bowlRect = getBowlRect();
  const jarCenter = { x: jar.x + jar.w / 2, y: jar.y + jar.h * 0.55 };
  const jarInner = getJarInnerRect();
  if (state === "pour") {
    pourCooldown = Math.max(0, pourCooldown - dt);
    while (activePours.length < POUR_BATCH && pourQueue.length > 0 && pourCooldown <= 0) {
      const block = pourQueue.shift();
      const spout = getPourSpout();
      const mouth = getJarMouth();
      const target = jarSlots[jarFilled] || jarCenter;
      const pose = getBowlPose();
      const posedStart = transformPoint(
        block.x,
        block.y,
        bowl.x + bowl.w / 2,
        bowl.y + bowl.h / 2,
        pose.rot,
        0,
        pose.lift
      );
      block.x = posedStart.x;
      block.y = posedStart.y;
      block.pouring = true;
      block.pourT = 0;
      block.rot = 0;
      block.rotSpeed = 0;
      block.jarScale = JAR_SCALE;
      block.pourFrom = { x: block.x, y: block.y };
      block.pourSpout = { x: spout.x, y: spout.y };
      block.pourMouth = { x: mouth.x, y: mouth.y };
      block.pourCtrl = {
        x: (spout.x + mouth.x) / 2 + 10,
        y: spout.y - 50,
      };
      block.target = target;
      block.spiceEmitted = false;
      activePours.push(block);
    }

    blocks.forEach((block) => {
      if (block.inJar && block.target) {
        block.x += (block.target.x - block.x) * 0.22;
        block.y += (block.target.y - block.y) * 0.22;
        block.rot += block.rotSpeed * 0.2;
        return;
      }
      if (block.pouring && block.target && block.pourSpout && block.pourCtrl && block.pourMouth) {
        block.pourT += dt * 2.25;
        const t = Math.min(1, block.pourT);
        if (t < 0.28) {
          const tt = easeInOut(t / 0.28);
          block.x = lerp(block.pourFrom.x, block.pourSpout.x, tt);
          block.y = lerp(block.pourFrom.y, block.pourSpout.y, tt);
        } else if (t < 0.62) {
          const tt = easeInOut((t - 0.28) / 0.34);
          block.x = quadBezier(block.pourSpout.x, block.pourCtrl.x, block.pourMouth.x, tt);
          block.y = quadBezier(block.pourSpout.y, block.pourCtrl.y, block.pourMouth.y, tt);
        } else {
          const tt = easeInOut((t - 0.62) / 0.38);
          block.x = lerp(block.pourMouth.x, block.target.x, tt);
          block.y = lerp(block.pourMouth.y, block.target.y, tt);
        }
        block.rot += block.rotSpeed * 2;
        if (!block.spiceEmitted && t > 0.3) {
          emitSpiceBurst(block.pourSpout, block.pourMouth);
          block.spiceEmitted = true;
        }
        if (t >= 1) {
          block.pouring = false;
          block.inJar = true;
          block.rot = 0;
          block.rotSpeed = 0;
          jarFilled += 1;
          jarLiquidTarget = Math.min(1, 0.2 + (jarFilled / TOTAL) * 0.75);
          const idx = activePours.indexOf(block);
          if (idx >= 0) activePours.splice(idx, 1);
          pourCooldown = 0.01;
        }
        return;
      }

      // 留在盆中的块，轻微抖动并被约束
      block.vy += gravity * 0.35;
      block.x += block.vx;
      block.y += block.vy;
      block.rot += block.rotSpeed * 0.3;
      block.vx *= 0.6;
      block.vy *= 0.6;

      if (block.x - block.size / 2 < bowlRect.x) {
        block.x = bowlRect.x + block.size / 2;
        block.vx *= -0.25;
      }
      if (block.x + block.size / 2 > bowlRect.x + bowlRect.w) {
        block.x = bowlRect.x + bowlRect.w - block.size / 2;
        block.vx *= -0.25;
      }
      if (block.y + block.size / 2 > bowlRect.y + bowlRect.h) {
        block.y = bowlRect.y + bowlRect.h - block.size / 2;
        block.vy *= -0.2;
      }
      if (block.y - block.size / 2 < bowlRect.y) {
        block.y = bowlRect.y + block.size / 2;
        block.vy *= -0.2;
      }
    });

    jarLiquid = lerp(jarLiquid, jarLiquidTarget, 0.08);
  } else {
    blocks.forEach((block) => {
      if (block.inJar && block.target) {
        block.x += (block.target.x - block.x) * 0.2;
        block.y += (block.target.y - block.y) * 0.2;
        block.rot += block.rotSpeed * 0.2;
        return;
      }
      block.vy += gravity;
      block.x += block.vx;
      block.y += block.vy;
      block.rot += block.rotSpeed;

      const floor = height - 30;
      if (block.y + block.size / 2 > floor) {
        block.y = floor - block.size / 2;
        block.vy *= -0.3;
        block.vx *= 0.7;
      }

      if (
        block.y + block.size / 2 > bowlRect.y &&
        block.y - block.size / 2 < bowlRect.y + bowlRect.h
      ) {
        if (block.x - block.size / 2 < bowlRect.x) {
          block.x = bowlRect.x + block.size / 2;
          block.vx *= -0.35;
        }
        if (block.x + block.size / 2 > bowlRect.x + bowlRect.w) {
          block.x = bowlRect.x + bowlRect.w - block.size / 2;
          block.vx *= -0.35;
        }
        if (block.y + block.size / 2 > bowlRect.y + bowlRect.h) {
          block.y = bowlRect.y + bowlRect.h - block.size / 2;
          block.vy *= -0.35;
          block.vx *= 0.8;
        }
      }
    });
  }

  if (jarMixParticles.length > 0 && (state === "pour" || state === "done")) {
    const inner = getJarInnerRect();
    jarMixParticles.forEach((p) => {
      p.y += p.vy;
      if (p.y > inner.y + inner.h) {
        p.y = inner.y + Math.random() * inner.h * 0.4;
      }
    });
  }

  slashes = slashes.filter((s) => (s.life -= dt) > 0);

  if (state === "shake") {
    seasoningParticles.forEach((p) => {
      p.x += p.vx + (Math.random() - 0.5) * 0.8;
      p.y += p.vy + (Math.random() - 0.5) * 0.6;
    });
    const elapsed = performance.now() - shakeStart;
    if (elapsed > 2400) {
      setState("jar");
    }
  }

  if (state === "pour") {
    const mouth = getJarMouth();
    pourParticles.forEach((p) => {
      if (p.phase === "toMouth") {
        p.vx += (mouth.x - p.x) * 0.004;
        p.vy += (mouth.y - p.y) * 0.004;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (Math.hypot(p.x - mouth.x, p.y - mouth.y) < 10) {
          p.phase = "inside";
          p.x = mouth.x + (Math.random() - 0.5) * 18;
          p.y = mouth.y + 6;
          p.vx = (Math.random() - 0.5) * 0.6;
          p.vy = 1 + Math.random() * 0.6;
        }
      } else if (p.phase === "inside") {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life -= 0.03;
        if (p.y > mouth.y + 28) {
          jarLiquidTarget = Math.min(1, jarLiquidTarget + 0.002);
        }
      }
    });
    pourParticles = pourParticles.filter((p) => p.life > 0 && p.y < height + 40);
    seasoningParticles.forEach((p) => {
      p.x += (jarCenter.x - p.x) * 0.03 + (Math.random() - 0.5) * 0.2;
      p.y += (jarCenter.y - p.y) * 0.03 + (Math.random() - 0.5) * 0.2;
      p.alpha *= 0.985;
    });
    const elapsed = performance.now() - pourStart;
    if (jarFilled >= TOTAL && activePours.length === 0 && pourQueue.length === 0 && elapsed > 900) {
      setState("done");
    }
  }
}

function drawBoard() {
  ctx.save();
  ctx.translate(board.x, board.y);
  ctx.fillStyle = "rgba(140, 110, 80, 0.14)";
  ctx.fillRect(10, 12, board.size, board.size);
  if (bambooPattern) {
    ctx.fillStyle = bambooPattern;
  } else if (bambooCanvas) {
    const pattern = ctx.createPattern(bambooCanvas, "repeat");
    ctx.fillStyle = pattern;
  } else {
    ctx.fillStyle = "#e1c190";
  }
  ctx.beginPath();
  roundedRectPath(0, 0, board.size, board.size, 18);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.fillRect(10, 10, board.size - 20, 4);
  ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
  ctx.lineWidth = 1;

  if (!isCutIntoGrid) {
    // 完整一块
    const x = 0;
    const y = 0;
    const s = board.size;
    ctx.fillStyle = "#fffdfb";
    ctx.beginPath();
    roundedRectPath(x + 6, y + 6, s - 12, s - 12, 20);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.45;
    if (tofuPattern) {
      ctx.fillStyle = tofuPattern;
      ctx.beginPath();
      roundedRectPath(x + 6, y + 6, s - 12, s - 12, 20);
      ctx.fill();
    } else if (textureCanvas) {
      ctx.drawImage(textureCanvas, x + 6, y + 6, s - 12, s - 12);
    }
    ctx.restore();
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.beginPath();
    roundedRectPath(x + 16, y + 14, s - 32, s * 0.16, 12);
    ctx.fill();
  } else {
    tofuGrid.forEach((cell) => {
      if (cell.scooped) return;
      const x = cell.x - board.x;
      const y = cell.y - board.y;
      const s = cell.size;
      ctx.fillStyle = "#fffdfb";
      ctx.beginPath();
      roundedRectPath(x + 2, y + 2, s - 4, s - 4, 10);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.45;
      if (tofuPattern) {
        ctx.fillStyle = tofuPattern;
        ctx.beginPath();
        roundedRectPath(x + 2, y + 2, s - 4, s - 4, 10);
        ctx.fill();
      } else if (textureCanvas) {
        ctx.drawImage(textureCanvas, x + 2, y + 2, s - 4, s - 4);
      }
      ctx.restore();
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      roundedRectPath(x + 6, y + 5, s - 12, s * 0.22, 8);
      ctx.fill();
    });
  }

  // 切割引导线
  if (state === "cut") {
    ctx.lineWidth = 2;
    for (let i = 1; i <= GRID - 1; i += 1) {
      const x = board.cell * i;
      ctx.strokeStyle = cutProgress.v[i - 1] ? "rgba(200, 160, 120, 0.8)" : "rgba(200, 170, 140, 0.35)";
      ctx.setLineDash(cutProgress.v[i - 1] ? [] : [6, 6]);
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, board.size - 10);
      ctx.stroke();
    }
    for (let i = 1; i <= GRID - 1; i += 1) {
      const y = board.cell * i;
      ctx.strokeStyle = cutProgress.h[i - 1] ? "rgba(200, 160, 120, 0.8)" : "rgba(200, 170, 140, 0.35)";
      ctx.setLineDash(cutProgress.h[i - 1] ? [] : [6, 6]);
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(board.size - 10, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawJar(layer = "full", glow = false) {
  ctx.save();
  const inner = getJarInnerRect();

  if (layer !== "front") {
    ctx.fillStyle = "rgba(255, 245, 235, 0.5)";
    ctx.beginPath();
    roundedRectPath(jar.x, jar.y, jar.w, jar.h, 24);
    ctx.fill();

    const glassGrad = ctx.createLinearGradient(inner.x, inner.y, inner.x + inner.w, inner.y + inner.h);
    glassGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    glassGrad.addColorStop(1, "rgba(235, 225, 210, 0.25)");
    ctx.fillStyle = glassGrad;
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h);

    if (jarLiquid > 0) {
      ctx.fillStyle = getSauceColor();
      ctx.globalAlpha = 0.5;
      const liquidH = inner.h * jarLiquid;
      ctx.fillRect(inner.x, inner.y + inner.h - liquidH, inner.w, liquidH);
      ctx.globalAlpha = 1;
    }

    if (jarMixParticles.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(inner.x, inner.y, inner.w, inner.h);
      ctx.clip();
      jarMixParticles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  if (layer !== "back") {
    ctx.strokeStyle = glow ? "rgba(175, 120, 78, 0.9)" : "rgba(150, 105, 70, 0.7)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(160, 110, 70, 0.2)";
    ctx.shadowBlur = glow ? 14 : 8;
    ctx.beginPath();
    roundedRectPath(jar.x, jar.y, jar.w, jar.h, 22);
    ctx.stroke();

    // 罐口与瓶盖
    ctx.fillStyle = "rgba(190, 130, 80, 0.7)";
    ctx.fillRect(jar.x + jar.w * 0.18, jar.y - 12, jar.w * 0.64, 14);
    ctx.fillStyle = "rgba(220, 190, 150, 0.8)";
    ctx.fillRect(jar.x + jar.w * 0.24, jar.y - 20, jar.w * 0.52, 10);

    // 玻璃高光
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(jar.x + jar.w * 0.2, jar.y + jar.h * 0.16);
    ctx.lineTo(jar.x + jar.w * 0.28, jar.y + jar.h * 0.86);
    ctx.stroke();

    // 罐底阴影
    ctx.fillStyle = "rgba(140, 95, 60, 0.16)";
    ctx.beginPath();
    ctx.ellipse(jar.x + jar.w * 0.52, jar.y + jar.h + 10, jar.w * 0.32, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundedRectPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function drawBowl(offsetX = 0) {
  ctx.save();
  if (state === "pour") {
    const pose = getBowlPose();
    ctx.translate(offsetX, pose.lift);
    ctx.translate(bowl.x + bowl.w / 2, bowl.y + bowl.h / 2);
    ctx.rotate(pose.rot);
    ctx.translate(-(bowl.x + bowl.w / 2), -(bowl.y + bowl.h / 2));
  } else {
    ctx.translate(offsetX, 0);
  }
  const cx = bowl.x + bowl.w / 2;
  const cy = bowl.y + bowl.h / 2;
  ctx.lineWidth = 16;
  ctx.strokeStyle = "#c79266";
  ctx.beginPath();
  ctx.ellipse(cx, cy, bowl.w / 2.05, bowl.h / 2.2, 0, Math.PI * 0.08, Math.PI * 0.92);
  ctx.stroke();

  const innerGrad = ctx.createRadialGradient(cx - 30, cy - 10, bowl.w * 0.1, cx, cy + 30, bowl.w * 0.55);
  innerGrad.addColorStop(0, "#f6e3cc");
  innerGrad.addColorStop(1, "#d8b08a");
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, bowl.w / 2.15, bowl.h / 2.35, 0, Math.PI, 0, true);
  ctx.fill();

  ctx.fillStyle = "rgba(160, 100, 60, 0.16)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16, bowl.w / 2.3, bowl.h / 3.1, 0, Math.PI, 0, true);
  ctx.fill();
  ctx.restore();
}

function drawBlock(block) {
  ctx.save();
  ctx.translate(block.x, block.y);
  ctx.rotate(block.rot);
  ctx.globalAlpha = block.inJar ? 0.9 : 1;
  const size = block.size * (block.jarScale || 1);
  const grad = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.5, "#f5f1ea");
  grad.addColorStop(1, "#e6ddd3");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
  ctx.lineWidth = 1;
  ctx.shadowColor = "rgba(120, 90, 60, 0.2)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  roundedRectPath(-size / 2, -size / 2, size, size, size * 0.18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  if (tofuPattern || textureCanvas) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    if (tofuPattern) {
      ctx.fillStyle = tofuPattern;
      roundedRectPath(-size / 2, -size / 2, size, size, size * 0.18);
      ctx.fill();
    } else if (textureCanvas) {
      ctx.drawImage(textureCanvas, -size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  roundedRectPath(-size / 2 + 4, -size / 2 + 4, size - 8, size * 0.2, size * 0.12);
  ctx.fill();
  ctx.fillStyle = "rgba(120, 90, 60, 0.12)";
  roundedRectPath(-size / 2 + 4, size / 2 - size * 0.18, size - 8, size * 0.16, size * 0.12);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBlocks(offsetX = 0) {
  if (state === "pour") {
    const pose = getBowlPose();
    ctx.save();
    ctx.translate(offsetX, pose.lift);
    ctx.translate(bowl.x + bowl.w / 2, bowl.y + bowl.h / 2);
    ctx.rotate(pose.rot);
    ctx.translate(-(bowl.x + bowl.w / 2), -(bowl.y + bowl.h / 2));
    blocks.forEach((block) => {
      if (!block.inJar && !block.pouring) {
        drawBlock(block);
      }
    });
    ctx.restore();

    ctx.save();
    ctx.translate(offsetX, 0);
    blocks.forEach((block) => {
      if (block.inJar || block.pouring) {
        drawBlock(block);
      }
    });
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(offsetX, 0);
  blocks.forEach((block) => drawBlock(block));
  ctx.restore();
}

function drawPourStream() {
  if (state !== "pour") return;
  pourParticles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawSeasoning(offsetX = 0) {
  if (seasoningParticles.length === 0) return;
  ctx.save();
  ctx.translate(offsetX, 0);
  seasoningParticles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSlashes() {
  slashes.forEach((s) => {
    ctx.strokeStyle = `rgba(200, 70, 48, ${s.life * 2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  });
}

function drawSpoon() {
  if (!spoon.visible || (state !== "cut" && state !== "scoop")) return;
  ctx.save();
  ctx.translate(spoon.x, spoon.y);
  ctx.rotate(spoon.angle);
  ctx.fillStyle = "#e9c59b";
  ctx.strokeStyle = "rgba(140, 95, 60, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundedRectPath(-68, -8, 70, 16, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f6dcc0";
  ctx.beginPath();
  ctx.ellipse(12, 0, 20, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.beginPath();
  ctx.ellipse(6, -4, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  for (let i = 0; i < 40; i += 1) {
    const x = (i * 83) % width;
    const y = (i * 139) % height;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawBoard();
  drawJar("back", state === "pour");
  drawSpoon();

  let shakeOffset = 0;
  if (state === "shake") {
    const t = (performance.now() - shakeStart) / 1000;
    shakeOffset = Math.sin(t * 18) * 10;
  }
  drawBowl(shakeOffset);
  drawBlocks(shakeOffset);
  drawPourStream();
  drawSeasoning(shakeOffset);
  drawJar("front", state === "pour");
  drawSlashes();
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function pointerPosition(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  if (state !== "cut" && state !== "scoop") return;
  slicing = true;
  lastPointer = pointerPosition(e);
  spoon.x = lastPointer.x;
  spoon.y = lastPointer.y;
  spoon.angle = -Math.PI / 4;
  spoon.visible = true;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!slicing || !lastPointer) return;
  const now = pointerPosition(e);
  const dx = now.x - lastPointer.x;
  const dy = now.y - lastPointer.y;
  if (Math.hypot(dx, dy) > 0.5) {
    spoon.angle = Math.atan2(dy, dx);
  }
  spoon.x = now.x;
  spoon.y = now.y;
  spoon.visible = true;
  if (state === "cut") {
    handleSlice(lastPointer, now);
  } else if (state === "scoop") {
    handleScoop(now);
  }
  lastPointer = now;
});

canvas.addEventListener("pointerup", (e) => {
  slicing = false;
  lastPointer = null;
  spoon.visible = false;
  canvas.releasePointerCapture(e.pointerId);
});

canvas.addEventListener("pointerleave", () => {
  slicing = false;
  lastPointer = null;
  spoon.visible = false;
});

shakeBtn.addEventListener("click", startShake);
pourBtn.addEventListener("click", startPour);
restartBtn.addEventListener("click", resetGame);
toggleSfxBtn.addEventListener("click", toggleSfx);
doneRestartBtn.addEventListener("click", resetGame);

window.addEventListener("resize", resize);

setupTexture();
setupBambooTexture();
initGrid();
createSeasonButtons();
setState("cut");
requestAnimationFrame(loop);
