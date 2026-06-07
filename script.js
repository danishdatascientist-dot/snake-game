/* ═══════════════════════════════════════════════════════════════════
   SERPENT-X  |  Cyberpunk Snake Game  |  script.js
   Full game engine — no external frameworks
═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────────────────
   1.  CONSTANTS & CONFIG
───────────────────────────────────────────────────────────────── */
const CELL = 20;       // px per grid cell
const COLS = 30;
const ROWS = 28;
const W = COLS * CELL;
const H = ROWS * CELL;

const DIFFICULTY_SPEEDS = {
  easy:   180,
  medium: 130,
  hard:   80,
  insane: 45
};

// Points
const FOOD_TYPES = {
  normal:  { emoji:'🟩', pts:1,  color:'#39ff14', glowColor:'rgba(57,255,20,0.6)',  prob:0.55, label:'Normal' },
  golden:  { emoji:'🟡', pts:5,  color:'#ffd700', glowColor:'rgba(255,215,0,0.7)',  prob:0.20, label:'Golden' },
  diamond: { emoji:'💎', pts:10, color:'#00e5ff', glowColor:'rgba(0,229,255,0.8)',  prob:0.08, label:'Diamond' },
  poison:  { emoji:'💀', pts:-3, color:'#ff003c', glowColor:'rgba(255,0,60,0.7)',   prob:0.10, label:'Poison' },
  speed:   { emoji:'⚡', pts:1,  color:'#ff9500', glowColor:'rgba(255,149,0,0.7)',  prob:0.035,label:'Speed+' },
  slow:    { emoji:'❄️', pts:1,  color:'#00cfff', glowColor:'rgba(0,207,255,0.7)',  prob:0.035,label:'Slow' }
};

const POWERUP_TYPES = {
  shield:       { emoji:'🛡',  label:'SHIELD',        duration:15000, color:'#00ffc8' },
  ghost:        { emoji:'👻', label:'GHOST',          duration:10000, color:'#b39ddb' },
  magnet:       { emoji:'🧲', label:'MAGNET',         duration:8000,  color:'#ff80ab' },
  doublePoints: { emoji:'✖2', label:'DOUBLE PTS',     duration:12000, color:'#ffd740' },
  freeze:       { emoji:'⏸', label:'FREEZE',          duration:6000,  color:'#80d8ff' }
};

const LEVEL_THRESHOLDS = Array.from({length:20},(_,i)=>(i+1)*10);

const ACHIEVEMENTS = [
  { id:'first_food',    label:'First Byte',       desc:'Eat your first food',               icon:'🐍' },
  { id:'score10',       label:'Score 10',          desc:'Reach score 10',                    icon:'⭐' },
  { id:'score50',       label:'Score 50',          desc:'Reach score 50',                    icon:'🌟' },
  { id:'score100',      label:'Score 100',         desc:'Reach score 100',                   icon:'💫' },
  { id:'level10',       label:'Level 10',          desc:'Reach level 10',                    icon:'🏆' },
  { id:'golden_food',   label:'Golden Touch',      desc:'Collect a golden food',             icon:'🥇' },
  { id:'diamond_food',  label:'Diamond Hands',     desc:'Collect a diamond food',            icon:'💎' },
  { id:'powerup',       label:'Power Up!',         desc:'Collect your first power-up',       icon:'⚡' },
  { id:'ghost_mode',    label:'Phantom',           desc:'Activate ghost mode',               icon:'👻' },
  { id:'length20',      label:'Macro Serpent',     desc:'Reach snake length 20',             icon:'🐉' }
];

/* ─────────────────────────────────────────────────────────────────
   2.  STATE
───────────────────────────────────────────────────────────────── */
const state = {
  // Game state
  running: false,
  paused:  false,
  aiMode:  false,
  gameLoopId: null,
  lastTime: 0,
  accumulator: 0,

  // Snake
  snake: [],
  dir:  { x:1, y:0 },
  nextDir: { x:1, y:0 },

  // Food & obstacles
  foods: [],
  obstacles: [],
  powerupOnField: null,  // single powerup item on board

  // Active powerups
  activePowerups: {},   // { type: { expiry } }

  // Scoring
  score:     0,
  hiScore:   0,
  level:     1,
  foodEaten: 0,

  // Settings
  difficulty: 'easy',
  theme: 'cyberpunk',

  // Interval timing
  baseSpeed: 180,  // ms per tick
  currentSpeed: 180,

  // Stats (persisted)
  stats: {
    totalGames:    0,
    totalFood:     0,
    bestScore:     0,
    bestLevel:     1,
    scores:        []
  },

  // Achievements
  unlockedAchievements: new Set(),
  leaderboard: []
};

/* ─────────────────────────────────────────────────────────────────
   3.  DOM REFS
───────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const screens = {
  main:        $('mainMenu'),
  game:        $('gameScreen'),
  over:        $('gameOverScreen'),
  leaderboard: $('leaderboardScreen'),
  stats:       $('statsScreen')
};

const canvas  = $('gameCanvas');
const ctx     = canvas.getContext('2d');
const pCanvas = $('particleCanvas');
const pCtx    = pCanvas.getContext('2d');
const bgC     = $('bgCanvas');
const bgCtx   = bgC.getContext('2d');

/* ─────────────────────────────────────────────────────────────────
   4.  CANVAS SETUP
───────────────────────────────────────────────────────────────── */
function setupCanvas() {
  canvas.width = pCanvas.width = W;
  canvas.height = pCanvas.height = H;
  bgC.width  = window.innerWidth;
  bgC.height = window.innerHeight;
}

/* ─────────────────────────────────────────────────────────────────
   5.  ANIMATED BACKGROUND
───────────────────────────────────────────────────────────────── */
const bgGrid = { offset: 0, particles: [] };

const BG_COLORS = [
  'rgba(255,215,0,0.12)',   // gold
  'rgba(255,107,53,0.10)',  // orange
  'rgba(107,203,119,0.10)', // green
  'rgba(78,205,196,0.10)',  // teal
  'rgba(199,125,255,0.10)', // purple
  'rgba(255,107,157,0.10)'  // pink
];

function initBgParticles() {
  bgGrid.particles = Array.from({length:40},()=>({
    x: Math.random()*bgC.width,
    y: Math.random()*bgC.height,
    r: 20+Math.random()*60,
    speed: 0.15+Math.random()*0.3,
    color: BG_COLORS[Math.floor(Math.random()*BG_COLORS.length)],
    phase: Math.random()*Math.PI*2
  }));
}

function animateBg(ts) {
  bgC.width = window.innerWidth;
  bgC.height = window.innerHeight;
  bgCtx.clearRect(0,0,bgC.width,bgC.height);

  // Floating soft orbs
  const t = ts/1000;
  bgGrid.particles.forEach(p=>{
    p.y -= p.speed;
    if(p.y+p.r < 0){ p.y = bgC.height+p.r; p.x = Math.random()*bgC.width; }
    const wobble = Math.sin(t*0.7+p.phase)*8;
    bgCtx.beginPath();
    bgCtx.arc(p.x+wobble, p.y, p.r, 0, Math.PI*2);
    bgCtx.fillStyle = p.color;
    bgCtx.fill();
  });

  requestAnimationFrame(animateBg);
}

function getCSSVar(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}

/* ─────────────────────────────────────────────────────────────────
   6.  PARTICLES
───────────────────────────────────────────────────────────────── */
const particles = [];

function spawnParticles(gx, gy, color, count=12) {
  const cx = gx*CELL + CELL/2;
  const cy = gy*CELL + CELL/2;
  for(let i=0;i<count;i++){
    const angle = (Math.PI*2/count)*i + Math.random()*0.5;
    const speed = 1.5+Math.random()*3;
    particles.push({
      x:cx, y:cy,
      vx: Math.cos(angle)*speed,
      vy: Math.sin(angle)*speed,
      r: 3+Math.random()*3,
      color,
      life:1, decay: 0.025+Math.random()*0.02
    });
  }
}

function spawnExplosion(gx, gy) {
  spawnParticles(gx, gy, '#ff003c', 30);
  spawnParticles(gx, gy, '#ff9500', 20);
}

function updateParticles() {
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.08;
    p.vx *= 0.97;
    p.life -= p.decay;
    if(p.life <= 0) particles.splice(i,1);
  }
}

function drawParticles() {
  pCtx.clearRect(0,0,W,H);
  particles.forEach(p=>{
    pCtx.globalAlpha = p.life;
    pCtx.beginPath();
    pCtx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2);
    pCtx.fillStyle = p.color;
    pCtx.fill();
  });
  pCtx.globalAlpha = 1;
}

/* ─────────────────────────────────────────────────────────────────
   7.  SOUND (Web Audio API generated sounds)
───────────────────────────────────────────────────────────────── */
const audioCtx = (() => {
  try { return new (window.AudioContext||window.webkitAudioContext)(); } catch(e){ return null; }
})();

function playTone(freq, type, duration, vol=0.3, attack=0.01, decay=0.1) {
  if(!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  } catch(e){}
}

const SFX = {
  eat:     ()=> { playTone(440,'sine',0.1,0.2); playTone(660,'sine',0.08,0.15); },
  golden:  ()=> { [440,554,660,880].forEach((f,i)=>setTimeout(()=>playTone(f,'sine',0.12,0.25),i*40)); },
  diamond: ()=> { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,'triangle',0.15,0.3),i*50)); },
  poison:  ()=> { playTone(200,'sawtooth',0.3,0.3); },
  powerup: ()=> { [523,659,784].forEach((f,i)=>setTimeout(()=>playTone(f,'square',0.15,0.2),i*60)); },
  levelup: ()=> { [262,330,392,523].forEach((f,i)=>setTimeout(()=>playTone(f,'sine',0.2,0.25),i*80)); },
  gameover:()=> { [400,300,200,150].forEach((f,i)=>setTimeout(()=>playTone(f,'sawtooth',0.3,0.35),i*100)); },
  click:   ()=>  playTone(600,'square',0.05,0.15),
  shield:  ()=>  playTone(800,'triangle',0.2,0.2)
};

/* ─────────────────────────────────────────────────────────────────
   8.  PERSISTENCE
───────────────────────────────────────────────────────────────── */
function loadData() {
  try {
    const s = JSON.parse(localStorage.getItem('serpentx_stats')||'{}');
    Object.assign(state.stats, s);
    state.hiScore = state.stats.bestScore || 0;

    const ach = JSON.parse(localStorage.getItem('serpentx_ach')||'[]');
    state.unlockedAchievements = new Set(ach);

    state.leaderboard = JSON.parse(localStorage.getItem('serpentx_lb')||'[]');
  } catch(e){}
}

function saveData() {
  try {
    localStorage.setItem('serpentx_stats', JSON.stringify(state.stats));
    localStorage.setItem('serpentx_ach', JSON.stringify([...state.unlockedAchievements]));
    localStorage.setItem('serpentx_lb', JSON.stringify(state.leaderboard));
  } catch(e){}
}

function recordScore() {
  state.stats.totalGames++;
  state.stats.totalFood += state.foodEaten;
  if(state.score > state.stats.bestScore) {
    state.stats.bestScore = state.score;
    state.hiScore = state.score;
    $('goHiScore').textContent = state.hiScore;
    $('newRecordBadge').style.display='block';
  }
  if(state.level > state.stats.bestLevel) state.stats.bestLevel = state.level;
  state.stats.scores.push(state.score);
  if(state.stats.scores.length > 50) state.stats.scores.shift();

  // Leaderboard
  state.leaderboard.push({
    score: state.score,
    difficulty: state.difficulty.toUpperCase(),
    date: new Date().toLocaleDateString()
  });
  state.leaderboard.sort((a,b)=>b.score-a.score);
  if(state.leaderboard.length > 10) state.leaderboard.splice(10);

  saveData();
}

/* ─────────────────────────────────────────────────────────────────
   9.  ACHIEVEMENTS
───────────────────────────────────────────────────────────────── */
function checkAchievements() {
  const unlock = (id) => {
    if(state.unlockedAchievements.has(id)) return;
    state.unlockedAchievements.add(id);
    const ach = ACHIEVEMENTS.find(a=>a.id===id);
    if(ach) showAchievement(ach);
    saveData();
  };

  if(state.foodEaten >= 1) unlock('first_food');
  if(state.score >= 10)    unlock('score10');
  if(state.score >= 50)    unlock('score50');
  if(state.score >= 100)   unlock('score100');
  if(state.level >= 10)    unlock('level10');
  if(state.snake.length >= 20) unlock('length20');
}

function showAchievement(ach) {
  const popup = $('achievementPopup');
  const div = document.createElement('div');
  div.className = 'ach-toast';
  div.innerHTML = `<span>${ach.icon}</span><div><strong>${ach.label}</strong><br>${ach.desc}</div>`;
  popup.appendChild(div);
  setTimeout(()=>{
    div.classList.add('fade-out');
    setTimeout(()=>div.remove(), 500);
  }, 3000);
}

/* ─────────────────────────────────────────────────────────────────
   10. GRID UTILITIES
───────────────────────────────────────────────────────────────── */
function randomCell() {
  return { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };
}

function cellFree(pos) {
  if(state.snake.some(s=>s.x===pos.x&&s.y===pos.y)) return false;
  if(state.foods.some(f=>f.x===pos.x&&f.y===pos.y)) return false;
  if(state.obstacles.some(o=>o.x===pos.x&&o.y===pos.y)) return false;
  if(state.powerupOnField&&state.powerupOnField.x===pos.x&&state.powerupOnField.y===pos.y) return false;
  return true;
}

function randomFreeCell() {
  let pos, tries=0;
  do { pos=randomCell(); tries++; } while(!cellFree(pos)&&tries<200);
  return pos;
}

/* ─────────────────────────────────────────────────────────────────
   11. FOOD & POWERUPS
───────────────────────────────────────────────────────────────── */
function pickFoodType() {
  const r = Math.random();
  let acc = 0;
  for(const [type, data] of Object.entries(FOOD_TYPES)) {
    acc += data.prob;
    if(r < acc) return type;
  }
  return 'normal';
}

function spawnFood(count=1) {
  for(let i=0;i<count;i++){
    const pos = randomFreeCell();
    const type = pickFoodType();
    state.foods.push({...pos, type, pulse:Math.random()*Math.PI*2});
  }
}

function spawnPowerup() {
  if(state.powerupOnField) return;
  if(Math.random() > 0.15) return; // 15% chance each food eaten
  const types = Object.keys(POWERUP_TYPES);
  const type = types[Math.floor(Math.random()*types.length)];
  const pos = randomFreeCell();
  state.powerupOnField = {...pos, type, pulse:0};
}

function activatePowerup(type) {
  const data = POWERUP_TYPES[type];
  state.activePowerups[type] = { expiry: Date.now()+data.duration };
  if(type==='ghost')  checkAchievements();
  updatePowerupBar();
  SFX.powerup();
  if(!state.unlockedAchievements.has('powerup')) {
    state.unlockedAchievements.add('powerup');
    showAchievement(ACHIEVEMENTS.find(a=>a.id==='powerup'));
    saveData();
  }
}

function tickPowerups() {
  const now = Date.now();
  let changed = false;
  for(const [k,v] of Object.entries(state.activePowerups)){
    if(now > v.expiry){ delete state.activePowerups[k]; changed=true; }
  }
  if(changed) updatePowerupBar();
}

function hasPowerup(type) {
  return !!state.activePowerups[type] && Date.now() < state.activePowerups[type].expiry;
}

function updatePowerupBar() {
  const bar = $('powerupBar');
  bar.innerHTML = '';
  const now = Date.now();
  for(const [type, v] of Object.entries(state.activePowerups)){
    const data = POWERUP_TYPES[type];
    const rem = Math.max(0, Math.ceil((v.expiry-now)/1000));
    const badge = document.createElement('div');
    badge.className='pu-badge';
    badge.style.borderColor = data.color;
    badge.style.color = data.color;
    badge.innerHTML=`${data.emoji} ${data.label} ${rem}s`;
    bar.appendChild(badge);
  }
}

/* ─────────────────────────────────────────────────────────────────
   12. OBSTACLES
───────────────────────────────────────────────────────────────── */
function generateObstacles() {
  state.obstacles = [];
  const count = Math.min(state.level*2, 20);
  // static walls in cross/L patterns
  for(let i=0;i<count;i++){
    const pos = randomFreeCell();
    state.obstacles.push({...pos, moving:false});
    // Occasionally add a 2nd adjacent cell for wall segments
    if(Math.random()<0.4) {
      const adj = {x:pos.x+(Math.random()<0.5?1:0), y:pos.y+(Math.random()<0.5?1:0)};
      if(cellFree(adj)) state.obstacles.push({...adj, moving:false});
    }
  }

  // Moving obstacles (level 4+)
  if(state.level >= 4) {
    const mcount = Math.floor((state.level-3)/2);
    for(let i=0;i<mcount;i++){
      const pos = randomFreeCell();
      const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
      state.obstacles.push({
        ...pos,
        moving: true,
        moveDir: dirs[Math.floor(Math.random()*dirs.length)],
        moveTick: 0, moveRate: 3  // moves every 3 game ticks
      });
    }
  }
}

function tickObstacles() {
  state.obstacles.forEach(o=>{
    if(!o.moving) return;
    o.moveTick = (o.moveTick||0)+1;
    if(o.moveTick < o.moveRate) return;
    o.moveTick=0;
    const nx = (o.x+o.moveDir.x+COLS)%COLS;
    const ny = (o.y+o.moveDir.y+ROWS)%ROWS;
    // Bounce off snake/food
    if(state.snake.some(s=>s.x===nx&&s.y===ny)||state.foods.some(f=>f.x===nx&&f.y===ny)){
      o.moveDir={x:-o.moveDir.x, y:-o.moveDir.y};
    } else {
      o.x=nx; o.y=ny;
    }
  });
}

/* ─────────────────────────────────────────────────────────────────
   13. LEVEL SYSTEM
───────────────────────────────────────────────────────────────── */
function checkLevel() {
  const newLevel = LEVEL_THRESHOLDS.findIndex(t=>state.score < t) + 1;
  const clamped = Math.min(newLevel, LEVEL_THRESHOLDS.length+1);
  if(clamped > state.level) {
    state.level = clamped;
    $('levelDisplay').textContent = state.level;
    bumpHud('levelDisplay');
    SFX.levelup();
    showLevelUp(state.level);
    generateObstacles();
    // Speed up per level (but not below insane limit)
    updateSpeed();
    checkAchievements();
  }
}

function updateSpeed() {
  const base = DIFFICULTY_SPEEDS[state.difficulty];
  // Each level reduces interval by 3ms
  state.currentSpeed = Math.max(base - (state.level-1)*3, base*0.4);
  if(hasPowerup('freeze')) state.currentSpeed *= 1.6;
  if(hasPowerup('speed'))  state.currentSpeed *= 0.6;
  if(hasPowerup('slow'))   state.currentSpeed *= 1.5;
}

function showLevelUp(level) {
  const banner = $('levelUpBanner');
  $('lupLevel').textContent = level;
  banner.style.display='flex';
  setTimeout(()=>{ banner.style.display='none'; }, 1500);
}

/* ─────────────────────────────────────────────────────────────────
   14. SNAKE INIT
───────────────────────────────────────────────────────────────── */
function initSnake() {
  const sx = Math.floor(COLS/2), sy = Math.floor(ROWS/2);
  state.snake = [
    {x:sx,   y:sy},
    {x:sx-1, y:sy},
    {x:sx-2, y:sy}
  ];
  state.dir = {x:1, y:0};
  state.nextDir = {x:1, y:0};
}

/* ─────────────────────────────────────────────────────────────────
   15. MOVEMENT & COLLISION
───────────────────────────────────────────────────────────────── */
function moveSnake() {
  state.dir = {...state.nextDir};
  const head = state.snake[0];
  let nx = head.x + state.dir.x;
  let ny = head.y + state.dir.y;

  const ghost = hasPowerup('ghost');

  // Wall collision
  if(ghost) {
    nx = (nx+COLS)%COLS;
    ny = (ny+ROWS)%ROWS;
  } else {
    if(nx<0||nx>=COLS||ny<0||ny>=ROWS) { triggerDeath(); return; }
  }

  const newHead = {x:nx, y:ny};

  // Self collision
  if(state.snake.slice(1).some(s=>s.x===nx&&s.y===ny)) {
    if(hasPowerup('shield')) {
      delete state.activePowerups['shield'];
      updatePowerupBar();
      SFX.shield();
      return; // save snake
    }
    triggerDeath(); return;
  }

  // Obstacle collision
  if(state.obstacles.some(o=>o.x===nx&&o.y===ny)) {
    if(hasPowerup('shield')) {
      delete state.activePowerups['shield'];
      updatePowerupBar();
      SFX.shield();
      return;
    }
    triggerDeath(); return;
  }

  state.snake.unshift(newHead);

  // Magnet: pull nearby food toward snake
  if(hasPowerup('magnet')) {
    state.foods.forEach(f=>{
      const dist = Math.abs(f.x-nx)+Math.abs(f.y-ny);
      if(dist <= 3) {
        f.x += Math.sign(nx-f.x)||0;
        f.y += Math.sign(ny-f.y)||0;
      }
    });
  }

  // Check food
  const foodIdx = state.foods.findIndex(f=>f.x===nx&&f.y===ny);
  if(foodIdx >= 0) {
    const food = state.foods[foodIdx];
    eatFood(food);
    state.foods.splice(foodIdx,1);
    spawnFood(1);
    // Occasionally spawn powerup
    spawnPowerup();
    // Maintain multiple foods based on level
    while(state.foods.length < Math.min(1+Math.floor(state.level/3), 4)) spawnFood(1);
  } else {
    state.snake.pop(); // no growth
  }

  // Check powerup pickup
  if(state.powerupOnField) {
    const pu = state.powerupOnField;
    if(pu.x===nx&&pu.y===ny) {
      activatePowerup(pu.type);
      state.powerupOnField = null;
    }
  }

  updateHud();
  tickObstacles();
  tickPowerups();
  updateSpeed();
  checkLevel();
  checkAchievements();
}

function eatFood(food) {
  const fdata = FOOD_TYPES[food.type];
  let pts = fdata.pts;
  if(hasPowerup('doublePoints')) pts *= 2;

  state.score = Math.max(0, state.score + pts);
  state.foodEaten++;

  // Track achievement-specific food
  if(food.type==='golden') {
    SFX.golden();
    if(!state.unlockedAchievements.has('golden_food')) {
      state.unlockedAchievements.add('golden_food');
      showAchievement(ACHIEVEMENTS.find(a=>a.id==='golden_food'));
      saveData();
    }
  } else if(food.type==='diamond') {
    SFX.diamond();
    if(!state.unlockedAchievements.has('diamond_food')) {
      state.unlockedAchievements.add('diamond_food');
      showAchievement(ACHIEVEMENTS.find(a=>a.id==='diamond_food'));
      saveData();
    }
  } else if(food.type==='poison') {
    SFX.poison();
    screenShake();
  } else {
    SFX.eat();
  }

  // Special effects
  if(food.type==='speed') activatePowerup('speed');
  if(food.type==='slow')  activatePowerup('slow');

  spawnParticles(food.x, food.y, fdata.color, 15);
  bumpHud('scoreDisplay');
}

/* ─────────────────────────────────────────────────────────────────
   16. DEATH
───────────────────────────────────────────────────────────────── */
function triggerDeath() {
  state.running = false;
  SFX.gameover();
  spawnExplosion(state.snake[0].x, state.snake[0].y);
  screenShake();

  setTimeout(()=>{
    $('goScore').textContent = state.score;
    $('goHiScore').textContent = state.hiScore;
    $('goLevel').textContent  = state.level;
    $('goFood').textContent   = state.foodEaten;
    $('newRecordBadge').style.display='none';
    recordScore();
    showScreen('over');
  }, 600);
}

/* ─────────────────────────────────────────────────────────────────
   17. HUD
───────────────────────────────────────────────────────────────── */
function updateHud() {
  $('scoreDisplay').textContent  = state.score;
  $('hiScoreDisplay').textContent= state.hiScore;
  $('levelDisplay').textContent  = state.level;
  $('foodDisplay').textContent   = state.foodEaten;
  $('lengthDisplay').textContent = state.snake.length;
}

function bumpHud(id) {
  const el = $(id);
  el.classList.add('bump');
  setTimeout(()=>el.classList.remove('bump'), 200);
}

function screenShake() {
  const wrapper = $('canvasWrapper');
  wrapper.classList.add('shake');
  setTimeout(()=>wrapper.classList.remove('shake'),350);
}

/* ─────────────────────────────────────────────────────────────────
   18. DRAWING
───────────────────────────────────────────────────────────────── */
function draw() {
  // Bright grass-green game board
  ctx.fillStyle = 'rgba(0,60,20,0.92)';
  ctx.fillRect(0,0,W,H);

  // Checkerboard lighter/darker cells (classic snake board)
  for(let x=0;x<COLS;x++){
    for(let y=0;y<ROWS;y++){
      if((x+y)%2===0){
        ctx.fillStyle='rgba(0,80,25,0.6)';
        ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
      }
    }
  }

  // Grid lines subtle
  ctx.strokeStyle='rgba(255,255,255,0.04)';
  ctx.lineWidth=0.5;
  for(let x=0;x<=COLS;x++){
    ctx.beginPath(); ctx.moveTo(x*CELL,0); ctx.lineTo(x*CELL,H); ctx.stroke();
  }
  for(let y=0;y<=ROWS;y++){
    ctx.beginPath(); ctx.moveTo(0,y*CELL); ctx.lineTo(W,y*CELL); ctx.stroke();
  }

  // Obstacles
  drawObstacles();

  // Powerup on field
  if(state.powerupOnField) drawPowerupItem(state.powerupOnField);

  // Food
  const t = Date.now()/600;
  state.foods.forEach(f=>drawFood(f,t));

  // Snake
  drawSnake();

  // Particles
  updateParticles();
  drawParticles();
}

function drawObstacles() {
  state.obstacles.forEach(o=>{
    const x=o.x*CELL, y=o.y*CELL;
    // Brick wall color
    ctx.fillStyle = o.moving ? '#E65100' : '#8B4513';
    ctx.shadowColor = o.moving ? 'rgba(255,120,0,0.7)' : 'rgba(100,50,10,0.5)';
    ctx.shadowBlur = o.moving ? 10 : 5;
    ctx.fillRect(x+1, y+1, CELL-2, CELL-2);
    // Brick mortar lines
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(0,0,0,0.35)';
    ctx.lineWidth=1;
    // Horizontal mortar
    ctx.beginPath(); ctx.moveTo(x+1,y+CELL/2); ctx.lineTo(x+CELL-1,y+CELL/2); ctx.stroke();
    // Vertical mortar (offset per row)
    const off = (o.y%2===0) ? CELL*0.5 : 0;
    ctx.beginPath(); ctx.moveTo(x+off,y+1); ctx.lineTo(x+off,y+CELL/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+off,y+CELL/2); ctx.lineTo(x+off,y+CELL-1); ctx.stroke();
    // Highlight top edge
    ctx.fillStyle='rgba(255,255,255,0.12)';
    ctx.fillRect(x+1,y+1,CELL-2,3);
    // Moving indicator — orange glow outline
    if(o.moving){
      ctx.strokeStyle='rgba(255,180,0,0.8)';
      ctx.lineWidth=1.5;
      ctx.strokeRect(x+1.5, y+1.5, CELL-3, CELL-3);
    }
  });
}

function drawFood(food, t) {
  const fd = FOOD_TYPES[food.type];
  const pulse = 0.85 + Math.sin(t + food.pulse)*0.15;
  const cx = food.x*CELL+CELL/2;
  const cy = food.y*CELL+CELL/2;
  const r  = (CELL/2-2)*pulse;

  ctx.save();
  ctx.shadowColor = fd.glowColor;
  ctx.shadowBlur  = 12*pulse;
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle = fd.color;
  ctx.fill();

  // Inner highlight
  ctx.beginPath();
  ctx.arc(cx-r*0.25, cy-r*0.25, r*0.35,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,0.25)';
  ctx.fill();

  ctx.restore();
}

function drawPowerupItem(pu) {
  const pd = POWERUP_TYPES[pu.type];
  const t  = Date.now()/400;
  const pulse = 0.8+Math.sin(t+pu.pulse)*0.2;
  const cx = pu.x*CELL+CELL/2;
  const cy = pu.y*CELL+CELL/2;
  const r  = (CELL/2-1)*pulse;

  ctx.save();
  ctx.shadowColor = pd.color;
  ctx.shadowBlur  = 18*pulse;
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle = pd.color+'33';
  ctx.fill();
  ctx.strokeStyle = pd.color;
  ctx.lineWidth=2;
  ctx.stroke();

  ctx.font=`${CELL*0.7}px serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#fff';
  ctx.shadowBlur=0;
  ctx.fillText(pd.emoji, cx, cy);
  ctx.restore();
}

/* ── Rainbow palette cycling through the snake body ── */
const SNAKE_COLORS = [
  { main:'#FF4444', dark:'#CC0000', light:'#FF8888' },  // red
  { main:'#FF8C00', dark:'#CC5500', light:'#FFBB55' },  // orange
  { main:'#FFD700', dark:'#CC9900', light:'#FFE866' },  // yellow
  { main:'#32CD32', dark:'#008800', light:'#88EE88' },  // lime
  { main:'#00BFFF', dark:'#007ACC', light:'#66D9FF' },  // sky
  { main:'#8A2BE2', dark:'#5500AA', light:'#C088FF' },  // violet
  { main:'#FF69B4', dark:'#CC2277', light:'#FFB0D0' },  // pink
];

function snakeSegColor(i) {
  return SNAKE_COLORS[i % SNAKE_COLORS.length];
}

function drawSnake() {
  if(!state.snake.length) return;
  const ghost  = hasPowerup('ghost');
  const shield = hasPowerup('shield');
  const now    = Date.now();

  // Draw tail → head (so head renders on top)
  for(let i = state.snake.length-1; i >= 0; i--) {
    const seg = state.snake[i];
    const isHead = i === 0;
    const isTail = i === state.snake.length - 1;
    const col = snakeSegColor(i);

    ctx.save();
    ctx.globalAlpha = ghost ? 0.45 : 1;

    const cx = seg.x * CELL + CELL/2;
    const cy = seg.y * CELL + CELL/2;

    if(isHead) {
      drawSnakeHead(seg, col, now, shield);
    } else if(isTail) {
      drawSnakeTail(seg, col, i);
    } else {
      drawSnakeBody(seg, col, i, now);
    }
    ctx.restore();
  }

  // Draw tongue last (on top of everything)
  drawTongue(state.snake[0], now);
}

function drawSnakeHead(seg, col, now, shield) {
  const cx = seg.x * CELL + CELL/2;
  const cy = seg.y * CELL + CELL/2;
  const R  = CELL/2 - 1;
  const dx = state.dir.x, dy = state.dir.y;

  // Pulsing aura
  ctx.save();
  ctx.globalAlpha *= 0.35;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 3 + Math.sin(now/200)*2, 0, Math.PI*2);
  ctx.fillStyle = shield ? '#00FFFF' : col.main;
  ctx.fill();
  ctx.restore();

  // Head body — large oval
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.atan2(dy, dx));
  // Elongate head in movement direction
  ctx.scale(1.2, 1.0);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI*2);
  // Main color
  ctx.fillStyle = col.main;
  ctx.shadowColor = col.main;
  ctx.shadowBlur = 14;
  ctx.fill();

  // Head top highlight — lighter dome
  ctx.beginPath();
  ctx.ellipse(-R*0.15, -R*0.2, R*0.55, R*0.4, -0.3, 0, Math.PI*2);
  ctx.fillStyle = col.light;
  ctx.shadowBlur = 0;
  ctx.fill();

  // Snout bump
  ctx.beginPath();
  ctx.arc(R*0.6, 0, R*0.42, 0, Math.PI*2);
  ctx.fillStyle = col.dark;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(R*0.65, 0, R*0.28, 0, Math.PI*2);
  ctx.fillStyle = col.main;
  ctx.fill();

  // Nostril dots
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  [[-1],[1]].forEach(([s])=>{
    ctx.beginPath();
    ctx.arc(R*0.78, s*R*0.18, 1.5, 0, Math.PI*2);
    ctx.fill();
  });

  // Scale pattern on head
  ctx.strokeStyle = col.dark;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.45;
  for(let si=0; si<3; si++) {
    ctx.beginPath();
    ctx.arc(-R*0.1 - si*R*0.25, 0, R*0.35 - si*R*0.05, Math.PI*0.1, Math.PI*0.9);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // Eyes (drawn in world space)
  const perpX = -dy, perpY = dx;
  const eyeOff = R * 0.42;
  const eyeFwdX = dx * R * 0.25, eyeFwdY = dy * R * 0.25;

  [-1,1].forEach(side=>{
    const ex = cx + eyeFwdX + perpX*eyeOff*side;
    const ey = cy + eyeFwdY + perpY*eyeOff*side;
    const eyeR = R * 0.32;

    // White sclera
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI*2);
    ctx.fillStyle = '#FFF8DC';
    ctx.shadowBlur = 0;
    ctx.fill();

    // Iris — bright color
    ctx.beginPath();
    ctx.arc(ex + dx*1.5, ey + dy*1.5, eyeR*0.68, 0, Math.PI*2);
    ctx.fillStyle = '#FF8C00';
    ctx.fill();

    // Pupil — vertical slit (like a real snake!)
    ctx.save();
    ctx.translate(ex + dx*1.5, ey + dy*1.5);
    ctx.scale(0.28, 1);
    ctx.beginPath();
    ctx.arc(0, 0, eyeR*0.7, 0, Math.PI*2);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.restore();

    // Eye shine
    ctx.beginPath();
    ctx.arc(ex + dx*0.5 - 1.5, ey + dy*0.5 - 1.5, eyeR*0.22, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  });

  // Shield ring
  if(shield) {
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(now/150)*0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, R+5, 0, Math.PI*2);
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4,3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawTongue(seg, now) {
  if(!seg) return;
  const flickSpeed = 400;
  const flickPhase = Math.sin(now / flickSpeed);
  if(flickPhase < 0.3) return; // tongue only visible part of the time
  const flick = flickPhase;

  const cx = seg.x * CELL + CELL/2;
  const cy = seg.y * CELL + CELL/2;
  const dx = state.dir.x, dy = state.dir.y;
  const R  = CELL/2;

  // Base of tongue at snout
  const bx = cx + dx * (R * 1.05);
  const by = cy + dy * (R * 1.05);
  const tipLen = R * 0.9 * flick;
  const forkLen = R * 0.45 * flick;
  const perpX = -dy * R * 0.18 * flick;
  const perpY =  dx * R * 0.18 * flick;

  // Tongue tip point
  const tx = bx + dx * tipLen;
  const ty = by + dy * tipLen;

  ctx.save();
  ctx.globalAlpha = ghost => hasPowerup('ghost') ? 0.35 : 0.9;
  ctx.strokeStyle = '#FF1744';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#FF1744';
  ctx.shadowBlur = 4;

  // Main tongue shaft
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  // Fork left
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + dx*forkLen + perpX, ty + dy*forkLen + perpY);
  ctx.stroke();

  // Fork right
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + dx*forkLen - perpX, ty + dy*forkLen - perpY);
  ctx.stroke();

  ctx.restore();
}

function drawSnakeBody(seg, col, i, now) {
  const cx = seg.x * CELL + CELL/2;
  const cy = seg.y * CELL + CELL/2;
  const R  = CELL/2 - 2;

  // Main body circle
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI*2);
  ctx.fillStyle = col.main;
  ctx.shadowColor = col.main;
  ctx.shadowBlur = 8;
  ctx.fill();

  // Scale overlay — gives texture
  ctx.save();
  ctx.shadowBlur = 0;

  // Top lighter dome (like a real scale)
  ctx.beginPath();
  ctx.ellipse(cx - R*0.1, cy - R*0.18, R*0.62, R*0.46, 0, 0, Math.PI*2);
  ctx.fillStyle = col.light;
  ctx.globalAlpha *= 0.75;
  ctx.fill();

  // Scale edge arc (darker crescent at bottom)
  ctx.beginPath();
  ctx.arc(cx, cy + R*0.1, R*0.8, Math.PI*0.15, Math.PI*0.85);
  ctx.strokeStyle = col.dark;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 1;
  ctx.stroke();

  // Secondary scale line
  ctx.beginPath();
  ctx.arc(cx, cy + R*0.35, R*0.55, Math.PI*0.2, Math.PI*0.8);
  ctx.strokeStyle = col.dark;
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = 0.55;
  ctx.stroke();

  // Center shine dot
  ctx.beginPath();
  ctx.arc(cx - R*0.25, cy - R*0.25, R*0.18, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.globalAlpha = 1;
  ctx.fill();

  ctx.restore();
}

function drawSnakeTail(seg, col, i) {
  const cx = seg.x * CELL + CELL/2;
  const cy = seg.y * CELL + CELL/2;

  // Tail is a smaller pointed oval
  ctx.save();
  ctx.translate(cx, cy);

  // Point direction based on neighbor
  let tdx = 0, tdy = 0;
  if(state.snake.length > 1) {
    const prev = state.snake[i-1];
    tdx = seg.x - prev.x;
    tdy = seg.y - prev.y;
  }
  ctx.rotate(Math.atan2(tdy, tdx));

  // Tapered ellipse
  ctx.beginPath();
  ctx.ellipse(0, 0, CELL/2-3, CELL/2-5, 0, 0, Math.PI*2);
  ctx.fillStyle = col.main;
  ctx.shadowColor = col.main;
  ctx.shadowBlur = 6;
  ctx.fill();

  // Highlight
  ctx.beginPath();
  ctx.ellipse(-2, -2, CELL/5, CELL/6, 0, 0, Math.PI*2);
  ctx.fillStyle = col.light;
  ctx.shadowBlur = 0;
  ctx.fill();

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

/* ─────────────────────────────────────────────────────────────────
   19. AI MODE  (BFS pathfinding)
───────────────────────────────────────────────────────────────── */
function aiTick() {
  if(!state.aiMode || !state.running) return;

  // Find nearest food
  const head = state.snake[0];
  let target = state.foods.reduce((best,f)=>{
    const d = Math.abs(f.x-head.x)+Math.abs(f.y-head.y);
    const bd= best ? Math.abs(best.x-head.x)+Math.abs(best.y-head.y): Infinity;
    return (d<bd&&FOOD_TYPES[f.type].pts>0) ? f : best;
  }, null);

  if(!target) return;

  // BFS
  const path = bfs(head, target, state.snake, state.obstacles);
  if(path && path.length > 1) {
    const next = path[1];
    const dx = next.x-head.x, dy = next.y-head.y;
    // Prevent reverse
    if(!(dx===-state.dir.x && dy===-state.dir.y)) {
      state.nextDir = {x:dx, y:dy};
    }
  } else {
    // Fallback: try any safe direction
    const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    for(const d of dirs) {
      if(d.x===-state.dir.x&&d.y===-state.dir.y) continue;
      const nx=(head.x+d.x+COLS)%COLS, ny=(head.y+d.y+ROWS)%ROWS;
      if(!state.snake.some(s=>s.x===nx&&s.y===ny)&&!state.obstacles.some(o=>o.x===nx&&o.y===ny)){
        state.nextDir=d; break;
      }
    }
  }
}

function bfs(start, goal, snake, obstacles) {
  const snakeSet = new Set(snake.map(s=>`${s.x},${s.y}`));
  const obsSet   = new Set(obstacles.map(o=>`${o.x},${o.y}`));
  const queue = [[{...start}]];
  const visited = new Set([`${start.x},${start.y}`]);

  while(queue.length) {
    const path = queue.shift();
    const node = path[path.length-1];
    if(node.x===goal.x&&node.y===goal.y) return path;

    const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    for(const d of dirs){
      const nx=(node.x+d.x+COLS)%COLS, ny=(node.y+d.y+ROWS)%ROWS;
      const key=`${nx},${ny}`;
      if(visited.has(key)||snakeSet.has(key)||obsSet.has(key)) continue;
      visited.add(key);
      queue.push([...path,{x:nx,y:ny}]);
    }
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────
   20. GAME LOOP
───────────────────────────────────────────────────────────────── */
function gameLoop(ts) {
  if(!state.running||state.paused) return;
  state.gameLoopId = requestAnimationFrame(gameLoop);

  const dt = ts - (state.lastTime||ts);
  state.lastTime = ts;
  state.accumulator += dt;

  aiTick();

  if(state.accumulator >= state.currentSpeed) {
    state.accumulator -= state.currentSpeed;
    moveSnake();
  }

  draw();
}

function startGameLoop() {
  if(state.gameLoopId) cancelAnimationFrame(state.gameLoopId);
  state.lastTime=0; state.accumulator=0;
  state.gameLoopId = requestAnimationFrame(gameLoop);
}

/* ─────────────────────────────────────────────────────────────────
   21. GAME INIT / START
───────────────────────────────────────────────────────────────── */
function startGame() {
  state.score=0; state.foodEaten=0; state.level=1;
  state.foods=[]; state.obstacles=[]; state.powerupOnField=null;
  state.activePowerups={};
  state.baseSpeed = DIFFICULTY_SPEEDS[state.difficulty];
  state.currentSpeed = state.baseSpeed;
  state.running=true; state.paused=false;
  state.aiMode=false;
  particles.length=0;

  initSnake();
  spawnFood(2);
  generateObstacles();
  updateHud();
  updatePowerupBar();
  $('diffDisplay').textContent = state.difficulty.toUpperCase();
  $('aiToggleBtn').textContent='AI: OFF';
  $('aiToggleBtn').classList.remove('active');
  $('newRecordBadge').style.display='none';
  $('pauseOverlay').style.display='none';

  showScreen('game');
  startGameLoop();
}

/* ─────────────────────────────────────────────────────────────────
   22. PAUSE
───────────────────────────────────────────────────────────────── */
function togglePause() {
  if(!state.running) return;
  state.paused = !state.paused;
  $('pauseOverlay').style.display = state.paused ? 'flex' : 'none';
  if(!state.paused) startGameLoop();
}

/* ─────────────────────────────────────────────────────────────────
   23. INPUT HANDLING
───────────────────────────────────────────────────────────────── */
const KEY_MAP = {
  ArrowUp:   {x:0,y:-1}, w:{x:0,y:-1}, W:{x:0,y:-1},
  ArrowDown: {x:0,y:1},  s:{x:0,y:1},  S:{x:0,y:1},
  ArrowLeft: {x:-1,y:0}, a:{x:-1,y:0}, A:{x:-1,y:0},
  ArrowRight:{x:1,y:0},  d:{x:1,y:0},  D:{x:1,y:0}
};

function setDir(d) {
  if(!state.running||state.paused) return;
  if(state.aiMode) return;
  // Prevent reversing
  if(d.x===-state.dir.x && d.y===-state.dir.y) return;
  state.nextDir = d;
}

document.addEventListener('keydown', e=>{
  if(KEY_MAP[e.key]) { e.preventDefault(); setDir(KEY_MAP[e.key]); return; }
  if(e.key==='Escape'||e.key==='p'||e.key==='P') togglePause();
});

// Mobile d-pad
['Up','Down','Left','Right'].forEach(dir=>{
  $('m'+dir).addEventListener('click', ()=>{
    SFX.click();
    const map={Up:{x:0,y:-1},Down:{x:0,y:1},Left:{x:-1,y:0},Right:{x:1,y:0}};
    setDir(map[dir]);
  });
});

// Swipe support
let touchStart={x:0,y:0};
document.addEventListener('touchstart', e=>{ touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY}; },{passive:true});
document.addEventListener('touchend', e=>{
  const dx=e.changedTouches[0].clientX-touchStart.x;
  const dy=e.changedTouches[0].clientY-touchStart.y;
  if(Math.abs(dx)<20&&Math.abs(dy)<20) return;
  if(Math.abs(dx)>Math.abs(dy)) setDir(dx>0?{x:1,y:0}:{x:-1,y:0});
  else setDir(dy>0?{x:0,y:1}:{x:0,y:-1});
},{passive:true});

/* ─────────────────────────────────────────────────────────────────
   24. THEME SWITCHING
───────────────────────────────────────────────────────────────── */
function applyTheme(theme) {
  const tmap = {cyberpunk:'',retro:'theme-retro',jungle:'theme-jungle',candy:'theme-candy',ocean:'theme-ocean',sunset:'theme-sunset'};
  document.body.className = tmap[theme] || '';
  state.theme = theme;
}

/* ─────────────────────────────────────────────────────────────────
   25. SCREEN MANAGEMENT
───────────────────────────────────────────────────────────────── */
function showScreen(name) {
  Object.entries(screens).forEach(([k,el])=>{
    el.classList.toggle('active', k===name);
  });
}

/* ─────────────────────────────────────────────────────────────────
   26. LEADERBOARD & STATS RENDER
───────────────────────────────────────────────────────────────── */
function renderLeaderboard() {
  const list = $('lbList');
  if(!state.leaderboard.length) {
    list.innerHTML='<div style="color:var(--text-dim);text-align:center;padding:2rem;font-size:0.7rem">NO RECORDS YET — START PLAYING!</div>';
    return;
  }
  list.innerHTML = state.leaderboard.map((e,i)=>`
    <div class="lb-row">
      <span class="lb-rank">${i+1}</span>
      <span></span>
      <span class="lb-score">${e.score}</span>
      <span class="lb-diff">${e.difficulty}</span>
      <span class="lb-date">${e.date}</span>
    </div>`).join('');
}

function renderStats() {
  const s = state.stats;
  const avg = s.scores.length ? Math.round(s.scores.reduce((a,b)=>a+b,0)/s.scores.length) : 0;
  const rows = [
    ['GAMES PLAYED',  s.totalGames],
    ['BEST SCORE',    s.bestScore],
    ['BEST LEVEL',    s.bestLevel],
    ['TOTAL FOOD',    s.totalFood],
    ['AVG SCORE',     avg],
    ['ACHIEVEMENTS',  `${state.unlockedAchievements.size}/${ACHIEVEMENTS.length}`]
  ];
  $('statsList').innerHTML = rows.map(([k,v])=>`
    <div class="stat-item">
      <span class="stat-key">${k}</span>
      <span class="stat-val">${v}</span>
    </div>`).join('');
}

/* ─────────────────────────────────────────────────────────────────
   27. EVENT LISTENERS — BUTTONS
───────────────────────────────────────────────────────────────── */
$('playBtn').addEventListener('click', ()=>{ SFX.click(); startGame(); });

$('restartBtn').addEventListener('click',  ()=>{ SFX.click(); startGame(); });
$('goMenuBtn').addEventListener('click',   ()=>{ SFX.click(); showScreen('main'); });
$('resumeBtn').addEventListener('click',   ()=>{ SFX.click(); togglePause(); });
$('menuFromPauseBtn').addEventListener('click', ()=>{ SFX.click(); state.running=false; showScreen('main'); });

$('leaderboardBtn').addEventListener('click', ()=>{ SFX.click(); renderLeaderboard(); showScreen('leaderboard'); });
$('lbBackBtn').addEventListener('click',      ()=>{ SFX.click(); showScreen('main'); });

$('statsBtn').addEventListener('click', ()=>{ SFX.click(); renderStats(); showScreen('stats'); });
$('stBackBtn').addEventListener('click', ()=>{ SFX.click(); showScreen('main'); });

$('howToBtn').addEventListener('click', ()=>{
  SFX.click();
  const inst = $('menuInstructions');
  inst.style.display = inst.style.display==='none' ? 'block' : 'none';
});

$('pauseMobileBtn').addEventListener('click', ()=>{ SFX.click(); togglePause(); });

// AI toggle
function toggleAI() {
  state.aiMode = !state.aiMode;
  $('aiToggleBtn').textContent = state.aiMode ? 'AI: ON' : 'AI: OFF';
  $('aiToggleBtn').classList.toggle('active', state.aiMode);
  SFX.click();
}
$('aiToggleBtn').addEventListener('click', toggleAI);
$('aiMobileBtn').addEventListener('click', toggleAI);

// Difficulty selector
document.querySelectorAll('#difficultySelector .sel-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#difficultySelector .sel-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.value;
    SFX.click();
  });
});

// Theme selector
document.querySelectorAll('#themeSelector .sel-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#themeSelector .sel-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    applyTheme(btn.dataset.value);
    SFX.click();
  });
});

/* ─────────────────────────────────────────────────────────────────
   28. RESIZE HANDLER
───────────────────────────────────────────────────────────────── */
window.addEventListener('resize', ()=>{
  bgC.width=window.innerWidth;
  bgC.height=window.innerHeight;
});

/* ─────────────────────────────────────────────────────────────────
   29. BOOT
───────────────────────────────────────────────────────────────── */
function boot() {
  setupCanvas();
  loadData();
  $('hiScoreDisplay').textContent = state.hiScore;
  initBgParticles();
  requestAnimationFrame(animateBg);
  showScreen('main');
  console.log('%cSERPENT-X v2.0.77 INITIALIZED', 'color:#00ffc8;font-family:monospace;font-size:14px');
}

boot();
