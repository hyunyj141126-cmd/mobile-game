class AudioEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.isInitialized = true;
            this.startSynthwaveBGM();
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    playLaser() {
        if (!this.isInitialized || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playExplosion(isLarge = false) {
        if (!this.isInitialized || this.muted) return;
        const bufferSize = this.ctx.sampleRate * (isLarge ? 0.5 : 0.25);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isLarge ? 400 : 800, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + (isLarge ? 0.5 : 0.25));

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isLarge ? 0.4 : 0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (isLarge ? 0.5 : 0.25));

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        whiteNoise.start();
    }

    playPowerup() {
        if (!this.isInitialized || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playHit() {
        if (!this.isInitialized || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    startSynthwaveBGM() {
        if (!this.isInitialized) return;
        const playSynthNote = (freq, time, duration) => {
            if (this.muted) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, time);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, time);
            filter.frequency.exponentialRampToValueAtTime(200, time + duration);

            gain.gain.setValueAtTime(0.03, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(time);
            osc.stop(time + duration);
        };

        const bassNotes = [65.41, 65.41, 82.41, 73.42, 55.00, 55.00, 73.42, 65.41];
        let noteIndex = 0;

        setInterval(() => {
            if (!this.muted && this.ctx && this.ctx.state === 'running') {
                const now = this.ctx.currentTime;
                playSynthNote(bassNotes[noteIndex % bassNotes.length], now, 0.25);
                noteIndex++;
            }
        }, 250);
    }
}

const audio = new AudioEngine();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let isGameRunning = false;
let isPaused = false;
let score = 0;
let combo = 1;
let comboTimer = 0;
let maxCombo = 1;
let level = 1;
let frameCount = 0;
let screenShake = 0;

let nextBossScore = 15000; 
let isBossActive = false;

const keys = {};
const mouse = { x: width / 2, y: height / 2, isDown: false };

window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mousedown', () => { mouse.isDown = true; });
window.addEventListener('mouseup', () => { mouse.isDown = false; });

let touchJoystick = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };
const joystickZone = document.getElementById('joystickZone');
const joystickKnob = document.getElementById('joystickKnob');
const touchFireBtn = document.getElementById('touchFireBtn');

joystickZone.addEventListener('touchstart', e => {
    touchJoystick.active = true;
    const touch = e.touches[0];
    const rect = joystickZone.getBoundingClientRect();
    touchJoystick.startX = rect.left + rect.width / 2;
    touchJoystick.startY = rect.top + rect.height / 2;
});

window.addEventListener('touchmove', e => {
    if (!touchJoystick.active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchJoystick.startX;
    const dy = touch.clientY - touchJoystick.startY;
    const dist = Math.min(Math.hypot(dx, dy), 40);
    const angle = Math.atan2(dy, dx);
    
    touchJoystick.moveX = Math.cos(angle) * (dist / 40);
    touchJoystick.moveY = Math.sin(angle) * (dist / 40);

    joystickKnob.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
});

window.addEventListener('touchend', () => {
    touchJoystick.active = false;
    touchJoystick.moveX = 0;
    touchJoystick.moveY = 0;
    joystickKnob.style.transform = `translate(0px, 0px)`;
});

touchFireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); mouse.isDown = true; });
touchFireBtn.addEventListener('touchend', (e) => { e.preventDefault(); mouse.isDown = false; });

class Player {
    constructor() {
        this.x = width / 2;
        this.y = height / 2;
        this.radius = 18;
        this.speed = 7;
        this.hp = 150;
        this.maxHp = 150;
        this.shield = 150;
        this.maxShield = 150;
        this.shieldRechargeTimer = 0;
        this.angle = 0;
        this.fireCooldown = 0;
        this.weaponType = 'NORMAL';
        this.powerupTimer = 0;
    }

    update() {
        let dx = 0;
        let dy = 0;

        if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

        if (touchJoystick.active) {
            dx = touchJoystick.moveX;
            dy = touchJoystick.moveY;
        }

        if (dx !== 0 && dy !== 0 && !touchJoystick.active) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));

        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

        if ((mouse.isDown || keys['Space']) && this.fireCooldown <= 0) {
            this.shoot();
        }
        if (this.fireCooldown > 0) this.fireCooldown--;

        if (this.powerupTimer > 0) {
            this.powerupTimer--;
            if (this.powerupTimer <= 0) this.weaponType = 'NORMAL';
        }

        if (this.shield < this.maxShield) {
            this.shieldRechargeTimer++;
            if (this.shieldRechargeTimer > 100) {
                this.shield = Math.min(this.maxShield, this.shield + 0.4);
            }
        }

        if (Math.random() < 0.6) {
            const tailX = this.x - Math.cos(this.angle) * this.radius;
            const tailY = this.y - Math.sin(this.angle) * this.radius;
            particles.push(new Particle(tailX, tailY, '#00f3ff', (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, Math.random() * 3 + 1, 0.05));
        }
    }

    shoot() {
        audio.playLaser();
        const muzzleX = this.x + Math.cos(this.angle) * this.radius;
        const muzzleY = this.y + Math.sin(this.angle) * this.radius;

        if (this.weaponType === 'NORMAL') {
            bullets.push(new Bullet(muzzleX, muzzleY, this.angle, '#00f3ff', 14, 20));
            this.fireCooldown = 7;
        } else if (this.weaponType === 'SPREAD') {
            [-0.2, 0, 0.2].forEach(spreadAngle => {
                bullets.push(new Bullet(muzzleX, muzzleY, this.angle + spreadAngle, '#ff0055', 14, 16));
            });
            this.fireCooldown = 8;
        } else if (this.weaponType === 'RAPID') {
            bullets.push(new Bullet(muzzleX + (Math.random()-0.5)*4, muzzleY + (Math.random()-0.5)*4, this.angle + (Math.random()-0.5)*0.1, '#ffe600', 16, 12));
            this.fireCooldown = 3;
        }
    }

    takeDamage(amount) {
        this.shieldRechargeTimer = 0;
        audio.playHit();
        screenShake = 8;

        if (this.shield > 0) {
            this.shield -= amount;
            if (this.shield < 0) {
                this.hp += this.shield;
                this.shield = 0;
            }
        } else {
            this.hp -= amount;
        }

        for (let i = 0; i < 12; i++) {
            particles.push(new Particle(this.x, this.y, '#ff0055', (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, Math.random() * 4 + 2, 0.04));
        }

        if (this.hp <= 0) {
            this.hp = 0;
            endGame();
        }
        updateHUD();
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.shield > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 0, 85, ${0.3 + (this.shield / this.maxShield) * 0.4})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 10;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius * 0.8, -this.radius * 0.7);
        ctx.lineTo(-this.radius * 0.4, 0);
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.7);
        ctx.closePath();

        ctx.fillStyle = '#0a0a1a';
        ctx.fill();
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 12;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0055';
        ctx.fill();

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, angle, color, speed, damage, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.color = color;
        this.radius = isEnemy ? 4 : 3;
        this.damage = damage;
        this.isEnemy = isEnemy;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
    }
}

class GuidedBullet extends Bullet {
    constructor(x, y, angle, color, speed, damage) {
        super(x, y, angle, color, speed, damage, true);
        this.speed = speed;
        this.angle = angle;
        this.turnRate = 0.04;
        this.lifeTime = 180;
    }

    update() {
        if (this.lifeTime > 0) {
            this.lifeTime--;
            const targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
            let diff = targetAngle - this.angle;

            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            this.angle += Math.sign(diff) * Math.min(Math.abs(diff), this.turnRate);

            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
        }

        if (Math.random() < 0.4) {
            particles.push(new Particle(this.x, this.y, this.color, (Math.random() - 0.5), (Math.random() - 0.5), 2, 0.1));
        }

        super.update();
    }
}

class Enemy {
    constructor(type, customX, customY) {
        this.type = type;
        this.markedForDeletion = false;
        this.shootTimer = 0;

        if (customX !== undefined && customY !== undefined) {
            this.x = customX;
            this.y = customY;
        } else {
            if (Math.random() < 0.5) {
                this.x = Math.random() < 0.5 ? -30 : width + 30;
                this.y = Math.random() * height;
            } else {
                this.x = Math.random() * width;
                this.y = Math.random() < 0.5 ? -30 : height + 30;
            }
        }

        /* [수정] 일반 적 HP 하향 (빨간 원 BASIC, 노란 사각형 FAST는 1방에 처치) */
        if (type === 'BASIC') {
            this.radius = 16;
            this.speed = 2.0 + level * 0.1;
            this.hp = 1; // 1방에 파괴
            this.color = '#ff0055';
            this.scoreValue = 100;
        } else if (type === 'FAST') {
            this.radius = 12;
            this.speed = 3.2 + level * 0.15;
            this.hp = 1; // 1방에 파괴
            this.color = '#ffe600';
            this.scoreValue = 150;
        } else if (type === 'TANK') { 
            this.radius = 26;
            this.speed = 1.2 + level * 0.05;
            this.hp = 40 + (level * 10); // HP 하향
            this.color = '#a855f7';
            this.scoreValue = 300;
        }
        this.maxHp = this.hp;
    }

    update() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

        if (this.type === 'TANK') {
            this.shootTimer++;
            if (this.shootTimer > 150) {
                audio.playLaser();
                bullets.push(new GuidedBullet(this.x, this.y, angle, '#a855f7', 4, 10));
                this.shootTimer = 0;
            }
        }

        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < player.radius + this.radius) {
            player.takeDamage(this.type === 'TANK' ? 15 : 8);
            this.explode();
            this.markedForDeletion = true;
        }
    }

    explode() {
        audio.playExplosion(this.type === 'TANK');
        screenShake = this.type === 'TANK' ? 10 : 5;

        for (let i = 0; i < (this.type === 'TANK' ? 25 : 12); i++) {
            particles.push(new Particle(
                this.x, this.y,
                this.color,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                Math.random() * 5 + 2,
                0.03
            ));
        }

        /* [수정] 아이템 드롭율 증가 */
        if (Math.random() < 0.35) {
            powerups.push(new PowerUp(this.x, this.y));
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();

        if (this.type === 'BASIC') {
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        } else if (this.type === 'FAST') {
            ctx.moveTo(0, -this.radius * 1.3);
            ctx.lineTo(this.radius, 0);
            ctx.lineTo(0, this.radius * 1.3);
            ctx.lineTo(-this.radius, 0);
            ctx.closePath();
        } else if (this.type === 'TANK') {
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i;
                const px = Math.cos(a) * this.radius;
                const py = Math.sin(a) * this.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }

        ctx.fillStyle = '#0a0a1a';
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.restore();
    }
}

class Boss {
    constructor(type) {
        if (Math.random() < 0.5) {
            this.x = Math.random() < 0.5 ? -60 : width + 60;
            this.y = Math.random() * height;
        } else {
            this.x = Math.random() * width;
            this.y = Math.random() < 0.5 ? -60 : height + 60;
        }

        const types = ['HEAVY', 'RAPID', 'HIVE'];
        this.bossType = type || types[Math.floor(Math.random() * types.length)];

        this.radius = 50;
        this.markedForDeletion = false;
        this.shootTimer = 0;
        this.summonTimer = 0;

        if (this.bossType === 'HEAVY') {
            this.name = "HEAVY CORE";
            this.speed = 1.5 + level * 0.05;
            this.maxHp = 500 + (level * 150);
            this.color = '#ff0055';
        } else if (this.bossType === 'RAPID') {
            this.name = "RAPID CORE";
            this.speed = 2.0 + level * 0.1;
            this.maxHp = 350 + (level * 100);
            this.color = '#ffe600';
        } else if (this.bossType === 'HIVE') {
            this.name = "HIVE CORE";
            this.speed = 1.3 + level * 0.05;
            this.maxHp = 600 + (level * 200);
            this.color = '#a855f7';
        }

        this.hp = this.maxHp;
        isBossActive = true;
        
        const bossHud = document.getElementById('bossHud');
        bossHud.classList.remove('hidden');
        updateBossHUD();
    }

    update() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

        this.shootTimer++;

        if (this.bossType === 'HEAVY') {
            if (this.shootTimer > 80) {
                this.shootHeavy(angle);
                this.shootTimer = 0;
            }
        } else if (this.bossType === 'RAPID') {
            if (this.shootTimer > 14) {
                this.shootRapid(angle);
                this.shootTimer = 0;
            }
        } else if (this.bossType === 'HIVE') {
            if (this.shootTimer > 90) {
                this.shootHive(angle);
                this.shootTimer = 0;
            }
            this.summonTimer++;
            if (this.summonTimer > 280) {
                this.summonMinions();
                this.summonTimer = 0;
            }
        }

        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < player.radius + this.radius) {
            player.takeDamage(15);
        }
    }

    shootHeavy(baseAngle) {
        audio.playLaser();
        [-0.3, -0.15, 0, 0.15, 0.3].forEach(offset => {
            bullets.push(new Bullet(this.x, this.y, baseAngle + offset, '#ff0055', 6, 6, true));
        });
    }

    shootRapid(baseAngle) {
        audio.playLaser();
        const spread = (Math.random() - 0.5) * 0.15;
        bullets.push(new Bullet(this.x, this.y, baseAngle + spread, '#ffe600', 7.5, 4, true));
    }

    shootHive(baseAngle) {
        audio.playLaser();
        [-0.2, 0, 0.2].forEach(offset => {
            bullets.push(new Bullet(this.x, this.y, baseAngle + offset, '#a855f7', 5.5, 5, true));
        });
    }

    summonMinions() {
        const count = 3;
        for (let i = 0; i < count; i++) {
            const spawnAngle = (Math.PI * 2 / count) * i;
            const spawnX = this.x + Math.cos(spawnAngle) * (this.radius + 20);
            const spawnY = this.y + Math.sin(spawnAngle) * (this.radius + 20);
            
            enemies.push(new Enemy('BASIC', spawnX, spawnY));

            for (let j = 0; j < 6; j++) {
                particles.push(new Particle(
                    spawnX, spawnY, '#a855f7',
                    (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5,
                    Math.random() * 4 + 2, 0.05
                ));
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        updateBossHUD();
        if (this.hp <= 0) {
            this.explode();
            this.markedForDeletion = true;
            addScore(2500);

            setTimeout(() => {
                if (bosses.filter(b => !b.markedForDeletion).length === 0) {
                    isBossActive = false;
                    document.getElementById('bossHud').classList.add('hidden');
                    nextBossScore = score + 15000;
                }
            }, 0);
        }
    }

    explode() {
        audio.playExplosion(true);
        screenShake = 15;
        for (let i = 0; i < 50; i++) {
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 50,
                this.y + (Math.random() - 0.5) * 50,
                this.color,
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12,
                Math.random() * 6 + 3,
                0.02
            ));
        }
        powerups.push(new PowerUp(this.x, this.y));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a1a';
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

function updateBossHUD() {
    const activeBosses = bosses.filter(b => !b.markedForDeletion);
    if (activeBosses.length === 0) return;

    let currentHp = 0;
    let maxHp = 0;
    let names = [];

    activeBosses.forEach(b => {
        currentHp += Math.max(0, b.hp);
        maxHp += b.maxHp;
        names.push(b.name);
    });

    const pct = Math.max(0, (currentHp / maxHp) * 100);
    document.getElementById('bossNameText').innerHTML = `<i class="fas fa-skull mr-1"></i> ${names.join(' & ')}`;
    document.getElementById('bossHpBar').style.width = `${pct}%`;
    document.getElementById('bossHpText').innerText = `${Math.ceil(pct)}%`;
}

class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;

        /* [수정] BOMB(폭탄) 아이템 추가 */
        const types = ['SPREAD', 'RAPID', 'SHIELD', 'HEALTH', 'BOMB'];
        this.type = types[Math.floor(Math.random() * types.length)];
        this.markedForDeletion = false;
        this.pulse = 0;
    }

    update() {
        this.pulse += 0.05;
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < player.radius + this.radius) {
            this.applyEffect();
            this.markedForDeletion = true;
        }
    }

    applyEffect() {
        audio.playPowerup();
        if (this.type === 'SPREAD') {
            player.weaponType = 'SPREAD';
            player.powerupTimer = 600; 
        } else if (this.type === 'RAPID') {
            player.weaponType = 'RAPID';
            player.powerupTimer = 600;
        } else if (this.type === 'SHIELD') {
            player.shield = player.maxShield;
        } else if (this.type === 'HEALTH') {
            player.hp = Math.min(player.maxHp, player.hp + 60);
        } else if (this.type === 'BOMB') {
            /* [신규 기능] 폭탄 사용 시 보스를 제외한 화면의 모든 적 제거 */
            audio.playExplosion(true);
            screenShake = 20;

            enemies.forEach(enemy => {
                enemy.markedForDeletion = true;
                addScore(enemy.scoreValue);

                // 적 위치에 폭발 파티클 생성
                for (let i = 0; i < 15; i++) {
                    particles.push(new Particle(
                        enemy.x, enemy.y,
                        enemy.color,
                        (Math.random() - 0.5) * 10,
                        (Math.random() - 0.5) * 10,
                        Math.random() * 5 + 2,
                        0.03
                    ));
                }
            });
            // 적 탄환도 함께 제거
            bullets = bullets.filter(b => !b.isEnemy);
        }
        updateHUD();
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        const scale = 1 + Math.sin(this.pulse) * 0.15;
        ctx.scale(scale, scale);

        let color = '#00f3ff';
        let icon = '⚡';
        if (this.type === 'SPREAD') { color = '#ff0055'; icon = 'W'; }
        if (this.type === 'RAPID') { color = '#ffe600'; icon = 'R'; }
        if (this.type === 'SHIELD') { color = '#a855f7'; icon = 'S'; }
        if (this.type === 'HEALTH') { color = '#10b981'; icon = '+'; }
        if (this.type === 'BOMB') { color = '#ff4500'; icon = '💣'; }

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10, 10, 25, 0.8)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = 'bold 10px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 0, 1);

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, vx, vy, size, decay) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.alpha = 1;
        this.decay = decay;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        if (this.alpha <= 0) this.markedForDeletion = true;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
    }
}

let player = new Player();
let bullets = [];
let enemies = [];
let bosses = [];
let powerups = [];
let particles = [];

const starfield = Array.from({ length: 80 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.8 + 0.5,
    alpha: Math.random() * 0.7 + 0.3
}));

function drawBackground() {
    ctx.fillStyle = '#030308';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    starfield.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
}

/* [수정] 적 스폰 주기 및 한 번에 등장하는 잡몹 수 조정 */
function spawnEnemies() {
    if (score >= nextBossScore && !isBossActive && bosses.length === 0) {
        if (score >= 200000) {
            bosses.push(new Boss('RAPID'));
            bosses.push(new Boss('HIVE'));
        } else {
            bosses.push(new Boss());
        }
    }

    // 스폰 주기를 낮춤 (여유롭게 생성되도록 프레임 단위를 늘림)
    const spawnRate = Math.max(45, 90 - level * 3);
    
    if (frameCount % spawnRate === 0 && (!isBossActive || Math.random() < 0.3)) {
        // [수정] 한 번에 생성되는 잡몹 수를 정확히 2마리로 고정
        const spawnCount = 2;

        for (let i = 0; i < spawnCount; i++) {
            const rand = Math.random();
            let type = 'BASIC';
            
            if (rand > 0.7) {
                type = 'TANK';
            } else if (rand > 0.35) {
                type = 'FAST';
            }

            enemies.push(new Enemy(type));
        }
    }
}

function addScore(amount) {
    score += amount * combo;
    comboTimer = 180;
    combo++;
    if (combo > maxCombo) maxCombo = combo;

    level = Math.floor(score / 3500) + 1;

    updateHUD();
}

function updateHUD() {
    document.getElementById('hpBar').style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
    document.getElementById('hpText').innerText = `${Math.ceil(player.hp)}`;

    document.getElementById('shieldBar').style.width = `${Math.max(0, (player.shield / player.maxShield) * 100)}%`;
    document.getElementById('shieldText').innerText = `${Math.ceil(player.shield)}`;

    document.getElementById('scoreDisplay').innerText = score.toString().padStart(6, '0');
    document.getElementById('levelDisplay').innerText = level.toString().padStart(2, '0');

    const comboContainer = document.getElementById('comboContainer');
    if (combo > 1) {
        comboContainer.style.opacity = '1';
        comboContainer.style.transform = 'scale(1)';
        document.getElementById('comboMultiplier').innerText = `x${combo}`;
    } else {
        comboContainer.style.opacity = '0';
        comboContainer.style.transform = 'scale(0.75)';
    }
}

function animate() {
    if (!isGameRunning) return;

    if (!isPaused) {
        frameCount++;

        ctx.save();
        if (screenShake > 0) {
            const sx = (Math.random() - 0.5) * screenShake;
            const sy = (Math.random() - 0.5) * screenShake;
            ctx.translate(sx, sy);
            screenShake *= 0.9;
            if (screenShake < 0.5) screenShake = 0;
        }

        if (comboTimer > 0) {
            comboTimer--;
            if (comboTimer <= 0) {
                combo = 1;
                updateHUD();
            }
        }

        drawBackground();
        spawnEnemies();

        player.update();
        player.draw();

        bullets.forEach(bullet => {
            bullet.update();
            bullet.draw();

            if (bullet.isEnemy) {
                const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
                if (dist < bullet.radius + player.radius) {
                    bullet.markedForDeletion = true;
                    player.takeDamage(bullet.damage);
                }
            } else {
                enemies.forEach(enemy => {
                    if (!bullet.markedForDeletion && !enemy.markedForDeletion) {
                        const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
                        if (dist < bullet.radius + enemy.radius) {
                            bullet.markedForDeletion = true;
                            enemy.hp -= bullet.damage;
                            particles.push(new Particle(bullet.x, bullet.y, bullet.color, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 3, 0.08));

                            if (enemy.hp <= 0) {
                                enemy.explode();
                                enemy.markedForDeletion = true;
                                addScore(enemy.scoreValue);
                            }
                        }
                    }
                });

                bosses.forEach(boss => {
                    if (!bullet.markedForDeletion && !boss.markedForDeletion) {
                        const dist = Math.hypot(bullet.x - boss.x, boss.y - boss.y);
                        if (dist < bullet.radius + boss.radius) {
                            bullet.markedForDeletion = true;
                            boss.takeDamage(bullet.damage);
                            particles.push(new Particle(bullet.x, bullet.y, bullet.color, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 3, 0.08));
                        }
                    }
                });
            }
        });

        enemies.forEach(enemy => {
            enemy.update();
            enemy.draw();
        });

        bosses.forEach(boss => {
            boss.update();
            boss.draw();
        });

        powerups.forEach(pw => {
            pw.update();
            pw.draw();
        });

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        bullets = bullets.filter(b => !b.markedForDeletion);
        enemies = enemies.filter(e => !e.markedForDeletion);
        bosses = bosses.filter(b => !b.markedForDeletion);
        powerups = powerups.filter(p => !p.markedForDeletion);
        particles = particles.filter(p => !p.markedForDeletion);

        ctx.restore();
    }

    requestAnimationFrame(animate);
}

function startGame() {
    audio.init();
    score = 0;
    combo = 1;
    maxCombo = 1;
    level = 1;
    frameCount = 0;
    nextBossScore = 15000;
    isBossActive = false;
    player = new Player();
    bullets = [];
    enemies = [];
    bosses = [];
    powerups = [];
    particles = [];

    isGameRunning = true;
    isPaused = false;

    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('startCard').classList.add('hidden');
    document.getElementById('gameOverCard').classList.add('hidden');
    document.getElementById('bossHud').classList.add('hidden');

    const saveBtn = document.getElementById('saveScoreBtn');
    saveBtn.disabled = false;
    saveBtn.innerText = 'SAVE';

    updateHUD();
    animate();
}

function endGame() {
    isGameRunning = false;
    renderLeaderboard();

    document.getElementById('finalScore').innerText = score;
    document.getElementById('finalCombo').innerText = `x${maxCombo}`;

    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('gameOverCard').classList.remove('hidden');
}

function togglePause() {
    if (!isGameRunning) return;
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.innerHTML = isPaused ? `<i class="fas fa-play text-lg"></i>` : `<i class="fas fa-pause text-lg"></i>`;
}

function saveHighScore(name, newScore) {
    let leaderboard = JSON.parse(localStorage.getItem('neon_pulse_leaderboard') || '[]');
    leaderboard.push({ name: name || 'OPERATOR', score: newScore, date: new Date().toLocaleDateString() });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5);
    localStorage.setItem('neon_pulse_leaderboard', JSON.stringify(leaderboard));
}

function renderLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    const leaderboard = JSON.parse(localStorage.getItem('neon_pulse_leaderboard') || '[]');
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = `<div class="text-gray-500 text-center py-2">No records found</div>`;
        return;
    }

    leaderboardList.innerHTML = leaderboard.map((entry, i) => `
        <div class="flex justify-between items-center py-1 px-2 ${i === 0 ? 'text-yellow-400 font-bold' : 'text-gray-300'}">
            <span>#${i + 1} ${entry.name}</span>
            <span class="font-orbitron">${entry.score} PTS</span>
        </div>
    `).join('');
}

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('pauseBtn').addEventListener('click', togglePause);

document.getElementById('scoreForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('playerNameInput');
    const saveBtn = document.getElementById('saveScoreBtn');
    const name = input.value.trim().toUpperCase();
    if (name) {
        saveHighScore(name, score);
        renderLeaderboard();
        input.value = '';
        saveBtn.disabled = true;
        saveBtn.innerText = 'SAVED';
    }
});

const soundBtn = document.getElementById('soundBtn');
soundBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    soundBtn.innerHTML = audio.muted ? 
        `<i class="fas fa-volume-mute text-lg text-pink-500"></i>` : 
        `<i class="fas fa-volume-up text-lg text-cyan-400"></i>`;
});

window.onload = () => {
    drawBackground();
};