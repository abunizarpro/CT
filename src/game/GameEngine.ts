import { sounds } from '../services/audio';
import { CurrencyType, MinedRunStats, RigUpgrades } from '../types/game';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  shape?: 'circle' | 'square' | 'line';
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

interface LaserShot {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  power: number;
}

interface MiningBlock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  type: 'hash' | 'nonce' | 'eth' | 'genesis';
  rotation: number;
  vRot: number;
  pulseTimer: number;
}

interface ThreatHazard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  type: 'corrupted_packet' | 'sybil_drone' | 'ransomware_spike' | 'boss_51';
  timer: number;
  telegraphTimer: number; // For windup telegraphing
  telegraphTargetX?: number;
  color: string;
}

interface CollectibleCoin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  currency: CurrencyType;
  value: number;
  radius: number;
  spin: number;
}

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: 'overclock' | 'shield' | 'magnet';
  radius: number;
  timer: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Time & Simulation
  private lastTime: number = 0;
  private hitstopTimer: number = 0; // Brief freeze on heavy impact
  private cameraShakeIntensity: number = 0;
  private cameraShakeDecay: number = 0.9;
  private gameTime: number = 0;

  // Callbacks
  private onStatsUpdate: (stats: MinedRunStats) => void;
  private onGameOver: (stats: MinedRunStats) => void;
  private onHealthChange: (hp: number, maxHp: number, shield: number) => void;
  private onComboChange: (combo: number) => void;

  // Rig Upgrades applied to this run
  private upgrades: RigUpgrades;

  // Player Rig
  private player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 38,
    height: 48,
    hp: 100,
    maxHp: 100,
    shield: 50,
    maxShield: 50,
    speed: 420,
    fireCooldown: 0,
    fireRate: 0.14, // Seconds between shots
    hitFlash: 0,
    tilt: 0,
    invulnerableTimer: 0,
    overclockTimer: 0,
    magnetTimer: 0,
    magnetRadius: 130,
    combo: 1,
    comboTimer: 0,
  };

  // Input state
  private keys: { [key: string]: boolean } = {};
  private pointer = { x: 0, y: 0, isDown: false, active: false };

  // Game World Entities
  private lasers: LaserShot[] = [];
  private blocks: MiningBlock[] = [];
  private threats: ThreatHazard[] = [];
  private coins: CollectibleCoin[] = [];
  private powerups: PowerUp[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];

  // Spawn timers
  private blockSpawnTimer: number = 0;
  private threatSpawnTimer: number = 0;
  private powerupSpawnTimer: number = 0;
  private bossSpawned: boolean = false;

  // Stats for this round
  private runStats: MinedRunStats = {
    ctc: 0,
    btc: 0,
    eth: 0,
    hash: 0,
    score: 0,
    blocksCracked: 0,
    threatsNeutralized: 0,
    peakHashrate: 110.0,
    durationSeconds: 0,
  };

  constructor(
    canvas: HTMLCanvasElement,
    upgrades: RigUpgrades,
    callbacks: {
      onStatsUpdate: (stats: MinedRunStats) => void;
      onGameOver: (stats: MinedRunStats) => void;
      onHealthChange: (hp: number, maxHp: number, shield: number) => void;
      onComboChange: (combo: number) => void;
    }
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.upgrades = upgrades;
    this.onStatsUpdate = callbacks.onStatsUpdate;
    this.onGameOver = callbacks.onGameOver;
    this.onHealthChange = callbacks.onHealthChange;
    this.onComboChange = callbacks.onComboChange;

    this.applyUpgrades();
    this.resizeCanvas();
    this.initPlayer();
    this.bindEvents();
  }

  private applyUpgrades() {
    this.player.maxHp = 100 + (this.upgrades.shieldCapacity - 1) * 20;
    this.player.hp = this.player.maxHp;
    this.player.maxShield = 50 + (this.upgrades.shieldCapacity - 1) * 25;
    this.player.shield = this.player.maxShield;
    this.player.speed = 400 + (this.upgrades.engineSpeed - 1) * 45;
    this.player.fireRate = Math.max(0.08, 0.15 - (this.upgrades.overclockRate - 1) * 0.015);
    this.player.magnetRadius = 130 + (this.upgrades.magnetReach - 1) * 40;
  }

  public resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);

    if (w > 0 && h > 0) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.ctx.scale(dpr, dpr);
    }
  }

  private initPlayer() {
    const rect = this.canvas.getBoundingClientRect();
    this.player.x = rect.width / 2;
    this.player.y = rect.height * 0.78;
    this.player.vx = 0;
    this.player.vy = 0;
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    // Touch & Pointer events
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handleBlur = () => {
    this.keys = {};
    this.pointer.isDown = false;
  };

  private handlePointerDown = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
    this.pointer.isDown = true;
    this.pointer.active = true;
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.pointer.isDown) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
  };

  private handlePointerUp = () => {
    this.pointer.isDown = false;
  };

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (!this.isRunning) {
      this.start();
      return;
    }
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Core 60fps Loop
  private gameLoop = (timestamp: number) => {
    if (!this.isRunning) return;

    // Clamped Delta Time (preventing frame skip explosions)
    const rawDt = (timestamp - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = timestamp;

    if (!this.isPaused) {
      // Hitstop logic: freeze entities briefly on massive impact
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else {
        this.update(dt);
      }
    }

    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number) {
    this.gameTime += dt;
    this.runStats.durationSeconds = Math.floor(this.gameTime);

    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Camera shake decay
    if (this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity *= this.cameraShakeDecay;
      if (this.cameraShakeIntensity < 0.2) this.cameraShakeIntensity = 0;
    }

    // Dynamic Hashrate calculation
    const baseHash = 120 + (this.upgrades.laserPower * 8) + (this.player.combo * 4);
    const fluctuation = (Math.sin(this.gameTime * 3) * 3) + ((Math.random() - 0.5) * 4);
    this.runStats.peakHashrate = Math.max(this.runStats.peakHashrate, parseFloat((baseHash + fluctuation).toFixed(1)));

    // Combo Timer Decay
    if (this.player.combo > 1) {
      this.player.comboTimer -= dt;
      if (this.player.comboTimer <= 0) {
        this.player.combo = 1;
        this.onComboChange(1);
      }
    }

    // Power-up timers
    if (this.player.overclockTimer > 0) this.player.overclockTimer -= dt;
    if (this.player.magnetTimer > 0) this.player.magnetTimer -= dt;
    if (this.player.invulnerableTimer > 0) this.player.invulnerableTimer -= dt;
    if (this.player.hitFlash > 0) this.player.hitFlash -= dt;

    // Natural Shield Regeneration (if not hit recently)
    if (this.player.shield < this.player.maxShield && this.player.hitFlash <= 0) {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + dt * 4);
      this.onHealthChange(this.player.hp, this.player.maxHp, this.player.shield);
    }

    // 1. Player Movement & Input handling
    let moveX = 0;
    let moveY = 0;

    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY += 1;

    // Pointer / Touch direct following
    if (this.pointer.isDown && this.pointer.active) {
      const dx = this.pointer.x - this.player.x;
      const dy = (this.pointer.y - 40) - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        moveX = dx / dist;
        moveY = dy / dist;
      }
    }

    // Normalize diagonal velocity
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.7071;
      moveY *= 0.7071;
    }

    const currentSpeed = this.player.overclockTimer > 0 ? this.player.speed * 1.35 : this.player.speed;
    this.player.x += moveX * currentSpeed * dt;
    this.player.y += moveY * currentSpeed * dt;

    // Banking tilt animation
    const targetTilt = moveX * 0.35;
    this.player.tilt += (targetTilt - this.player.tilt) * 0.2;

    // Clamping player to screen bounds
    const margin = 20;
    this.player.x = Math.max(margin, Math.min(w - margin, this.player.x));
    this.player.y = Math.max(margin + 40, Math.min(h - margin, this.player.y));

    // Thruster engine particles
    if (Math.random() < 0.6) {
      this.particles.push({
        x: this.player.x + (Math.random() - 0.5) * 12,
        y: this.player.y + this.player.height / 2 - 4,
        vx: (Math.random() - 0.5) * 20,
        vy: 120 + Math.random() * 80,
        size: 3 + Math.random() * 3,
        color: this.player.overclockTimer > 0 ? '#ffaa00' : '#00f0ff',
        alpha: 0.8,
        decay: 3.5,
      });
    }

    // 2. Firing System (Space or Auto / Click)
    this.player.fireCooldown -= dt;
    const wantsToFire = this.keys['Space'] || this.pointer.isDown || true; // Auto-fire supported for slick arcade feel
    const effectiveFireRate = this.player.overclockTimer > 0 ? this.player.fireRate * 0.55 : this.player.fireRate;

    if (wantsToFire && this.player.fireCooldown <= 0) {
      this.fireLasers();
      this.player.fireCooldown = effectiveFireRate;
    }

    // 3. Update Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.y += l.vy * dt;
      if (l.y < -20) {
        this.lasers.splice(i, 1);
      }
    }

    // 4. Spawning Mechanics
    this.blockSpawnTimer -= dt;
    if (this.blockSpawnTimer <= 0) {
      this.spawnMiningBlock(w);
      this.blockSpawnTimer = Math.max(0.7, 1.8 - Math.min(1.0, this.gameTime * 0.01));
    }

    this.threatSpawnTimer -= dt;
    if (this.threatSpawnTimer <= 0) {
      this.spawnThreat(w);
      this.threatSpawnTimer = Math.max(1.5, 3.2 - Math.min(1.6, this.gameTime * 0.015));
    }

    this.powerupSpawnTimer -= dt;
    if (this.powerupSpawnTimer <= 0) {
      this.spawnPowerUp(w);
      this.powerupSpawnTimer = 18 + Math.random() * 10;
    }

    // Boss spawn at score >= 1200 or 90 seconds
    if (!this.bossSpawned && (this.runStats.score >= 1200 || this.gameTime >= 75)) {
      this.spawnBoss(w);
      this.bossSpawned = true;
    }

    // 5. Update Blocks
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rotation += b.vRot * dt;
      b.pulseTimer += dt;

      // Laser Collision with Blocks
      for (let j = this.lasers.length - 1; j >= 0; j--) {
        const l = this.lasers[j];
        if (Math.abs(l.x - b.x) < b.width / 2 + 5 && Math.abs(l.y - b.y) < b.height / 2 + 5) {
          // Hit block!
          b.hp -= l.power;
          this.lasers.splice(j, 1);

          // Spark particles
          this.spawnImpactParticles(l.x, l.y, '#00f0ff', 4);

          if (b.hp <= 0) {
            this.crackBlock(b);
            this.blocks.splice(i, 1);
            break;
          }
        }
      }

      // Despawn off bottom
      if (b.y > h + 60) {
        this.blocks.splice(i, 1);
      }
    }

    // 6. Update Threats
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const t = this.threats[i];
      t.timer += dt;

      if (t.type === 'sybil_drone') {
        // Telegraphs charge to player position
        t.telegraphTimer -= dt;
        if (t.telegraphTimer > 0) {
          t.telegraphTargetX = this.player.x;
          t.y += 25 * dt;
        } else {
          // Charge downwards towards telegraphed position
          const dx = (t.telegraphTargetX || this.player.x) - t.x;
          t.x += dx * 1.5 * dt;
          t.y += 180 * dt;
        }
      } else if (t.type === 'boss_51') {
        // Boss moves back and forth at top of screen
        t.x += t.vx * dt;
        if (t.x < 100 || t.x > w - 100) t.vx *= -1;
        t.y = 85 + Math.sin(this.gameTime * 2) * 20;

        // Boss telegraphed laser attack
        t.telegraphTimer -= dt;
        if (t.telegraphTimer <= 0) {
          t.telegraphTimer = 4.5;
          // Spawn minion bullets
          this.spawnBossBullets(t.x, t.y);
        }
      } else {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
      }

      // Laser collision with threats
      for (let j = this.lasers.length - 1; j >= 0; j--) {
        const l = this.lasers[j];
        if (Math.abs(l.x - t.x) < t.width / 2 + 8 && Math.abs(l.y - t.y) < t.height / 2 + 8) {
          t.hp -= l.power;
          this.lasers.splice(j, 1);
          this.spawnImpactParticles(l.x, l.y, '#ef4444', 5);

          if (t.hp <= 0) {
            this.neutralizeThreat(t);
            this.threats.splice(i, 1);
            break;
          }
        }
      }

      // Threat collision with player
      const distToPlayer = Math.hypot(t.x - this.player.x, t.y - this.player.y);
      if (distToPlayer < (t.width / 2 + this.player.width / 2 - 4)) {
        this.damagePlayer(t.type === 'boss_51' ? 35 : 20);
        if (t.type !== 'boss_51') {
          this.threats.splice(i, 1);
        }
      }

      if (t.y > h + 70 && t.type !== 'boss_51') {
        this.threats.splice(i, 1);
      }
    }

    // 7. Update Coins (Magnetic pull towards player)
    const activeMagnet = this.player.magnetTimer > 0 ? this.player.magnetRadius * 2.2 : this.player.magnetRadius;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.spin += 4 * dt;

      const dx = this.player.x - c.x;
      const dy = this.player.y - c.y;
      const dist = Math.hypot(dx, dy);

      if (dist < activeMagnet) {
        // Accelerate smoothly towards player
        const pullSpeed = 480 * (1 - dist / activeMagnet) + 160;
        c.vx += (dx / dist) * pullSpeed * dt * 4;
        c.vy += (dy / dist) * pullSpeed * dt * 4;
      } else {
        c.vy += 80 * dt; // Slow drift downwards
        c.vx *= 0.96;
      }

      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Collection
      if (dist < (this.player.width / 2 + c.radius)) {
        this.collectCoin(c);
        this.coins.splice(i, 1);
        continue;
      }

      if (c.y > h + 40) {
        this.coins.splice(i, 1);
      }
    }

    // 8. Update Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy * dt;
      p.timer += dt;

      const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (dist < this.player.width / 2 + p.radius) {
        this.applyPowerUp(p.type);
        this.powerups.splice(i, 1);
        continue;
      }

      if (p.y > h + 40) {
        this.powerups.splice(i, 1);
      }
    }

    // 9. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 10. Update Floating Text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= 0.8 * dt;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    this.onStatsUpdate({ ...this.runStats });
  }

  // Firing action
  private fireLasers() {
    sounds.playLaser();
    const pLevel = this.upgrades.laserPower;
    const x = this.player.x;
    const y = this.player.y - 20;

    if (pLevel === 1) {
      this.lasers.push({
        x,
        y,
        vy: -750,
        width: 4,
        height: 18,
        color: '#00f0ff',
        power: 10,
      });
    } else if (pLevel === 2) {
      // Dual lasers
      this.lasers.push(
        { x: x - 10, y, vy: -780, width: 4, height: 18, color: '#00f0ff', power: 12 },
        { x: x + 10, y, vy: -780, width: 4, height: 18, color: '#00f0ff', power: 12 }
      );
    } else {
      // Triple / Quad spread laser
      this.lasers.push(
        { x: x, y, vy: -820, width: 5, height: 22, color: '#00f0ff', power: 16 },
        { x: x - 12, y: y + 4, vy: -800, width: 4, height: 18, color: '#8b5cf6', power: 13 },
        { x: x + 12, y: y + 4, vy: -800, width: 4, height: 18, color: '#8b5cf6', power: 13 }
      );
    }
  }

  private spawnMiningBlock(canvasWidth: number) {
    const roll = Math.random();
    let type: 'hash' | 'nonce' | 'eth' | 'genesis' = 'hash';
    let hp = 20;
    let width = 36;
    let height = 36;

    if (roll < 0.6) {
      type = 'hash';
      hp = 20 + this.upgrades.laserPower * 4;
      width = 34;
      height = 34;
    } else if (roll < 0.85) {
      type = 'nonce';
      hp = 45;
      width = 40;
      height = 40;
    } else if (roll < 0.96) {
      type = 'eth';
      hp = 35;
      width = 36;
      height = 36;
    } else {
      type = 'genesis';
      hp = 120;
      width = 58;
      height = 58;
    }

    const margin = 40;
    const x = margin + Math.random() * (canvasWidth - margin * 2);

    this.blocks.push({
      x,
      y: -50,
      vx: (Math.random() - 0.5) * 30,
      vy: 80 + Math.random() * 45,
      width,
      height,
      hp,
      maxHp: hp,
      type,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 1.5,
      pulseTimer: Math.random() * 5,
    });
  }

  private spawnThreat(canvasWidth: number) {
    const roll = Math.random();
    let type: 'corrupted_packet' | 'sybil_drone' | 'ransomware_spike' = 'corrupted_packet';
    let hp = 20;
    let color = '#ef4444';
    let vy = 150;
    let width = 30;
    let height = 30;

    if (roll < 0.55) {
      type = 'corrupted_packet';
      hp = 20;
      vy = 160 + Math.random() * 60;
      color = '#ef4444';
    } else if (roll < 0.85) {
      type = 'sybil_drone';
      hp = 35;
      vy = 80;
      color = '#f97316';
      width = 34;
      height = 34;
    } else {
      type = 'ransomware_spike';
      hp = 50;
      vy = 120;
      color = '#ec4899';
      width = 38;
      height = 38;
    }

    const margin = 40;
    const x = margin + Math.random() * (canvasWidth - margin * 2);

    this.threats.push({
      x,
      y: -50,
      vx: (Math.random() - 0.5) * 50,
      vy,
      width,
      height,
      hp,
      maxHp: hp,
      type,
      timer: 0,
      telegraphTimer: 1.2,
      color,
    });
  }

  private spawnBoss(canvasWidth: number) {
    sounds.playSecurityAlert();
    this.threats.push({
      x: canvasWidth / 2,
      y: -90,
      vx: 110,
      vy: 40,
      width: 90,
      height: 70,
      hp: 450,
      maxHp: 450,
      type: 'boss_51',
      timer: 0,
      telegraphTimer: 3.5,
      color: '#dc2626',
    });

    this.floatingTexts.push({
      x: canvasWidth / 2,
      y: 180,
      vy: -15,
      text: '⚠️ 51% CONSENSUS ATTACK DETECTED!',
      color: '#ef4444',
      alpha: 1,
      scale: 1.4,
    });
  }

  private spawnBossBullets(x: number, y: number) {
    sounds.playShield();
    for (let i = -2; i <= 2; i++) {
      this.threats.push({
        x,
        y: y + 25,
        vx: i * 70,
        vy: 180,
        width: 16,
        height: 16,
        hp: 5,
        maxHp: 5,
        type: 'corrupted_packet',
        timer: 0,
        telegraphTimer: 0,
        color: '#f87171',
      });
    }
  }

  private spawnPowerUp(canvasWidth: number) {
    const types: ('overclock' | 'shield' | 'magnet')[] = ['overclock', 'shield', 'magnet'];
    const type = types[Math.floor(Math.random() * types.length)];
    const margin = 50;
    this.powerups.push({
      x: margin + Math.random() * (canvasWidth - margin * 2),
      y: -30,
      vy: 90,
      type,
      radius: 18,
      timer: 0,
    });
  }

  // Cracking a block drops coins and triggers hit feedback
  private crackBlock(b: MiningBlock) {
    this.runStats.blocksCracked++;
    this.increaseCombo();

    const isGenesis = b.type === 'genesis';
    sounds.playExplosion(isGenesis);

    // Hitstop & Camera shake
    this.hitstopTimer = isGenesis ? 0.07 : 0.035;
    this.cameraShakeIntensity = isGenesis ? 14 : 6;

    // Drop coins based on block type
    let coinCount = 2;
    let baseCurrency: CurrencyType = 'ctc';
    let baseVal = 2.5 * this.player.combo;

    if (b.type === 'hash') {
      coinCount = 3;
      baseCurrency = 'hash';
      baseVal = 5 * this.player.combo;
    } else if (b.type === 'nonce') {
      coinCount = 3;
      baseCurrency = 'btc';
      baseVal = 0.00004 * this.player.combo;
    } else if (b.type === 'eth') {
      coinCount = 3;
      baseCurrency = 'eth';
      baseVal = 0.0008 * this.player.combo;
    } else if (b.type === 'genesis') {
      coinCount = 8;
      baseCurrency = 'ctc';
      baseVal = 15 * this.player.combo;
    }

    for (let i = 0; i < coinCount; i++) {
      const angle = (Math.PI * 2 * i) / coinCount + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 90;
      this.coins.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        currency: i === 0 && b.type === 'genesis' ? 'btc' : baseCurrency,
        value: baseVal,
        radius: 9,
        spin: Math.random() * Math.PI,
      });
    }

    // Spawn block burst particles
    const color = b.type === 'hash' ? '#00f0ff' : b.type === 'nonce' ? '#eab308' : b.type === 'eth' ? '#a855f7' : '#10b981';
    this.spawnExplosionParticles(b.x, b.y, color, isGenesis ? 28 : 14);

    this.runStats.score += isGenesis ? 250 : 50;
  }

  private neutralizeThreat(t: ThreatHazard) {
    this.runStats.threatsNeutralized++;
    this.increaseCombo();

    const isBoss = t.type === 'boss_51';
    sounds.playExplosion(isBoss);

    this.hitstopTimer = isBoss ? 0.08 : 0.04;
    this.cameraShakeIntensity = isBoss ? 18 : 8;

    // Boss rewards massive tokens
    if (isBoss) {
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        this.coins.push({
          x: t.x,
          y: t.y,
          vx: Math.cos(angle) * 120,
          vy: Math.sin(angle) * 120,
          currency: i % 2 === 0 ? 'ctc' : 'btc',
          value: i % 2 === 0 ? 25 : 0.0001,
          radius: 11,
          spin: 0,
        });
      }
      this.runStats.score += 800;
      this.floatingTexts.push({
        x: t.x,
        y: t.y - 20,
        vy: -20,
        text: '51% ATTACK NEUTRALIZED! +800',
        color: '#10b981',
        alpha: 1,
        scale: 1.3,
      });
    } else {
      this.coins.push({
        x: t.x,
        y: t.y,
        vx: (Math.random() - 0.5) * 60,
        vy: -50,
        currency: 'ctc',
        value: 3 * this.player.combo,
        radius: 9,
        spin: 0,
      });
      this.runStats.score += 75;
    }

    this.spawnExplosionParticles(t.x, t.y, t.color, isBoss ? 35 : 16);
  }

  private collectCoin(c: CollectibleCoin) {
    sounds.playCoin();
    if (c.currency === 'ctc') this.runStats.ctc += c.value;
    else if (c.currency === 'btc') this.runStats.btc += c.value;
    else if (c.currency === 'eth') this.runStats.eth += c.value;
    else if (c.currency === 'hash') this.runStats.hash += c.value;

    this.runStats.score += 20;

    // Floating text indicator
    const textLabel = c.currency === 'btc' 
      ? `+${c.value.toFixed(5)} BTC` 
      : c.currency === 'eth' 
      ? `+${c.value.toFixed(4)} ETH` 
      : c.currency === 'hash' 
      ? `+${Math.round(c.value)} HASH` 
      : `+${c.value.toFixed(1)} CTC`;

    const textColor = c.currency === 'btc' ? '#eab308' : c.currency === 'eth' ? '#a855f7' : '#00f0ff';

    this.floatingTexts.push({
      x: c.x,
      y: c.y - 10,
      vy: -35,
      text: textLabel,
      color: textColor,
      alpha: 1,
      scale: 1.0,
    });

    this.spawnImpactParticles(c.x, c.y, textColor, 5);
  }

  private applyPowerUp(type: 'overclock' | 'shield' | 'magnet') {
    sounds.playCombo();
    if (type === 'overclock') {
      this.player.overclockTimer = 8;
      this.floatingTexts.push({
        x: this.player.x,
        y: this.player.y - 25,
        vy: -25,
        text: '⚡ OVERCLOCK BOOST (2X SPEED)!',
        color: '#ffaa00',
        alpha: 1,
        scale: 1.2,
      });
    } else if (type === 'shield') {
      this.player.shield = this.player.maxShield;
      this.player.invulnerableTimer = 6;
      this.floatingTexts.push({
        x: this.player.x,
        y: this.player.y - 25,
        vy: -25,
        text: '🛡️ QUANTUM FIREWALL RECHARGED!',
        color: '#00f0ff',
        alpha: 1,
        scale: 1.2,
      });
    } else if (type === 'magnet') {
      this.player.magnetTimer = 10;
      this.floatingTexts.push({
        x: this.player.x,
        y: this.player.y - 25,
        vy: -25,
        text: '🧲 STRATUM COIN VACUUM ACTIVATED!',
        color: '#10b981',
        alpha: 1,
        scale: 1.2,
      });
    }

    this.onHealthChange(this.player.hp, this.player.maxHp, this.player.shield);
  }

  private damagePlayer(amount: number) {
    if (this.player.invulnerableTimer > 0) return;

    sounds.playHurt();
    this.player.hitFlash = 0.25;
    this.cameraShakeIntensity = 12;

    // Absorb with shield first
    if (this.player.shield > 0) {
      if (this.player.shield >= amount) {
        this.player.shield -= amount;
        amount = 0;
      } else {
        amount -= this.player.shield;
        this.player.shield = 0;
      }
    }

    if (amount > 0) {
      this.player.hp = Math.max(0, this.player.hp - amount);
    }

    this.onHealthChange(this.player.hp, this.player.maxHp, this.player.shield);

    // Reset combo on hit
    this.player.combo = 1;
    this.onComboChange(1);

    if (this.player.hp <= 0) {
      this.triggerGameOver();
    }
  }

  private increaseCombo() {
    this.player.combo = Math.min(5, this.player.combo + 1);
    this.player.comboTimer = 2.8;
    this.onComboChange(this.player.combo);
    if (this.player.combo >= 3) {
      sounds.playCombo();
    }
  }

  private triggerGameOver() {
    this.isRunning = false;
    sounds.playExplosion(true);
    this.spawnExplosionParticles(this.player.x, this.player.y, '#00f0ff', 40);
    this.onGameOver({ ...this.runStats });
  }

  private spawnImpactParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        color,
        alpha: 0.9,
        decay: 3.0,
      });
    }
  }

  private spawnExplosionParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color,
        alpha: 1.0,
        decay: 2.0,
      });
    }
  }

  // --------------------------------------------------------------------------------
  // RENDERING (Ultra-clean cyber aesthetic, 60fps locked)
  // --------------------------------------------------------------------------------
  private render() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.save();

    // Camera shake offset
    if (this.cameraShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.cameraShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.ctx.translate(shakeX, shakeY);
    }

    // 1. Cyber background
    this.ctx.fillStyle = '#050814';
    this.ctx.fillRect(0, 0, w, h);

    // Dynamic grid scrolling
    this.renderCyberGrid(w, h);

    // 2. Lasers
    for (const l of this.lasers) {
      this.ctx.fillStyle = l.color;
      this.ctx.shadowColor = l.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(l.x - l.width / 2, l.y, l.width, l.height);
      this.ctx.shadowBlur = 0;
    }

    // 3. Mining Blocks
    for (const b of this.blocks) {
      this.renderBlock(b);
    }

    // 4. Threats & Boss
    for (const t of this.threats) {
      this.renderThreat(t);
    }

    // 5. Power-ups
    for (const p of this.powerups) {
      this.renderPowerUp(p);
    }

    // 6. Collectible Coins
    for (const c of this.coins) {
      this.renderCoin(c);
    }

    // 7. Player Ship
    if (this.player.hp > 0) {
      this.renderPlayer();
    }

    // 8. Particles
    for (const p of this.particles) {
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    // 9. Floating Text Callouts
    this.ctx.font = 'bold 13px "JetBrains Mono", monospace';
    this.ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      this.ctx.globalAlpha = Math.max(0, ft.alpha);
      this.ctx.fillStyle = ft.color;
      this.ctx.shadowColor = '#000000';
      this.ctx.shadowBlur = 6;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.shadowBlur = 0;
    }
    this.ctx.globalAlpha = 1.0;

    this.ctx.restore();
  }

  private renderCyberGrid(w: number, h: number) {
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
    this.ctx.lineWidth = 1;

    const gridSize = 40;
    const offset = (this.gameTime * 60) % gridSize;

    // Vertical lines
    for (let x = 0; x < w; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }

    // Horizontal moving lines
    for (let y = offset; y < h; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }
  }

  private renderBlock(b: MiningBlock) {
    this.ctx.save();
    this.ctx.translate(b.x, b.y);
    this.ctx.rotate(b.rotation);

    const colors = {
      hash: '#00f0ff',
      nonce: '#eab308',
      eth: '#a855f7',
      genesis: '#10b981',
    };
    const c = colors[b.type];

    // Glow
    this.ctx.shadowColor = c;
    this.ctx.shadowBlur = b.type === 'genesis' ? 16 : 8;

    // Box body
    this.ctx.fillStyle = '#0f172a';
    this.ctx.strokeStyle = c;
    this.ctx.lineWidth = 2;

    const hw = b.width / 2;
    const hh = b.height / 2;

    this.ctx.beginPath();
    this.ctx.rect(-hw, -hh, b.width, b.height);
    this.ctx.fill();
    this.ctx.stroke();

    // Inner holographic circuit mark
    this.ctx.strokeStyle = c;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, b.width * 0.28, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.restore();

    // Health bar above block if damaged
    if (b.hp < b.maxHp) {
      const barW = b.width + 4;
      const barH = 3;
      const pct = Math.max(0, b.hp / b.maxHp);
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(b.x - barW / 2, b.y - b.height / 2 - 8, barW, barH);
      this.ctx.fillStyle = c;
      this.ctx.fillRect(b.x - barW / 2, b.y - b.height / 2 - 8, barW * pct, barH);
    }
  }

  private renderThreat(t: ThreatHazard) {
    this.ctx.save();
    this.ctx.translate(t.x, t.y);

    // Telegraph line if charging
    if (t.type === 'sybil_drone' && t.telegraphTimer > 0) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      this.ctx.setLineDash([4, 4]);
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo((t.telegraphTargetX || this.player.x) - t.x, 300);
      this.ctx.stroke();
      this.ctx.restore();
    }

    if (t.type === 'boss_51') {
      // 51% Boss Body
      this.ctx.shadowColor = '#ef4444';
      this.ctx.shadowBlur = 18;
      this.ctx.fillStyle = '#1e1b4b';
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 2.5;

      // Hexagonal boss chassis
      this.ctx.beginPath();
      this.ctx.moveTo(0, -35);
      this.ctx.lineTo(45, -15);
      this.ctx.lineTo(45, 25);
      this.ctx.lineTo(0, 35);
      this.ctx.lineTo(-45, 25);
      this.ctx.lineTo(-45, -15);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Boss core
      this.ctx.fillStyle = '#ef4444';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.shadowBlur = 0;
    } else {
      // Regular threat drone / corrupted packet
      this.ctx.shadowColor = t.color;
      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = '#1e293b';
      this.ctx.strokeStyle = t.color;
      this.ctx.lineWidth = 1.8;

      // Diamond / Spike shape
      this.ctx.beginPath();
      this.ctx.moveTo(0, -t.height / 2);
      this.ctx.lineTo(t.width / 2, 0);
      this.ctx.lineTo(0, t.height / 2);
      this.ctx.lineTo(-t.width / 2, 0);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.shadowBlur = 0;
    }

    this.ctx.restore();

    // Boss large health bar on top
    if (t.type === 'boss_51') {
      const barW = 120;
      const barH = 5;
      const pct = Math.max(0, t.hp / t.maxHp);
      this.ctx.fillStyle = '#0f172a';
      this.ctx.fillRect(t.x - barW / 2, t.y - 48, barW, barH);
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillRect(t.x - barW / 2, t.y - 48, barW * pct, barH);
    }
  }

  private renderPowerUp(p: PowerUp) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);

    const colors = {
      overclock: '#ffaa00',
      shield: '#00f0ff',
      magnet: '#10b981',
    };
    const c = colors[p.type];

    this.ctx.shadowColor = c;
    this.ctx.shadowBlur = 12;

    this.ctx.fillStyle = '#0f172a';
    this.ctx.strokeStyle = c;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Power-up glyph
    this.ctx.fillStyle = c;
    this.ctx.font = 'bold 12px "Outfit", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const glyph = p.type === 'overclock' ? '⚡' : p.type === 'shield' ? '🛡️' : '🧲';
    this.ctx.fillText(glyph, 0, 1);

    this.ctx.restore();
  }

  private renderCoin(c: CollectibleCoin) {
    this.ctx.save();
    this.ctx.translate(c.x, c.y);

    const colors = {
      ctc: '#00f0ff',
      btc: '#eab308',
      eth: '#a855f7',
      hash: '#10b981',
    };
    const col = colors[c.currency];

    // Pulsing coin disc
    this.ctx.shadowColor = col;
    this.ctx.shadowBlur = 8;

    this.ctx.fillStyle = '#090d16';
    this.ctx.strokeStyle = col;
    this.ctx.lineWidth = 1.5;

    // Coin squished horizontally for 3D spin illusion
    const scaleX = Math.cos(c.spin);
    this.ctx.scale(scaleX, 1);

    this.ctx.beginPath();
    this.ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
  }

  private renderPlayer() {
    this.ctx.save();
    this.ctx.translate(this.player.x, this.player.y);
    this.ctx.rotate(this.player.tilt);

    // Hit flash or invulnerable blinking
    if (this.player.hitFlash > 0) {
      this.ctx.fillStyle = '#ffffff';
    } else {
      this.ctx.fillStyle = '#0f172a';
    }

    // Shield bubble
    if (this.player.shield > 0 || this.player.invulnerableTimer > 0) {
      this.ctx.strokeStyle = this.player.invulnerableTimer > 0 ? '#ffaa00' : 'rgba(0, 240, 255, 0.5)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 32, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // HashRig Vessel Chassis
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 10;
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(0, -26); // Nose
    this.ctx.lineTo(19, 16);  // Right wing tip
    this.ctx.lineTo(8, 22);   // Right engine
    this.ctx.lineTo(0, 15);   // Center aft
    this.ctx.lineTo(-8, 22);  // Left engine
    this.ctx.lineTo(-19, 16); // Left wing tip
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Cockpit / Stratum Core Gem
    this.ctx.fillStyle = this.player.overclockTimer > 0 ? '#ffaa00' : '#00f0ff';
    this.ctx.beginPath();
    this.ctx.arc(0, -2, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }
}
