// === script.js 수정 부분 ===

let touchJoystick = { active: false, touchId: null, startX: 0, startY: 0, moveX: 0, moveY: 0 };
const joystickZone = document.getElementById('joystickZone');
const joystickKnob = document.getElementById('joystickKnob');
const touchFireBtn = document.getElementById('touchFireBtn');

// 조이스틱 터치 시작
joystickZone.addEventListener('touchstart', e => {
    e.preventDefault();
    if (touchJoystick.active) return;
    const touch = e.changedTouches[0];
    touchJoystick.active = true;
    touchJoystick.touchId = touch.identifier;
    const rect = joystickZone.getBoundingClientRect();
    touchJoystick.startX = rect.left + rect.width / 2;
    touchJoystick.startY = rect.top + rect.height / 2;
}, { passive: false });

// 터치 이동 처리 (멀티터치 지원)
window.addEventListener('touchmove', e => {
    if (!touchJoystick.active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchJoystick.touchId) {
            const dx = touch.clientX - touchJoystick.startX;
            const dy = touch.clientY - touchJoystick.startY;
            const dist = Math.min(Math.hypot(dx, dy), 50);
            const angle = Math.atan2(dy, dx);
            
            touchJoystick.moveX = Math.cos(angle) * (dist / 50);
            touchJoystick.moveY = Math.sin(angle) * (dist / 50);

            joystickKnob.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
            break;
        }
    }
}, { passive: false });

// 조이스틱 터치 해제
const resetJoystick = (e) => {
    if (!touchJoystick.active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchJoystick.touchId) {
            touchJoystick.active = false;
            touchJoystick.touchId = null;
            touchJoystick.moveX = 0;
            touchJoystick.moveY = 0;
            joystickKnob.style.transform = `translate(0px, 0px)`;
            break;
        }
    }
};

window.addEventListener('touchend', resetJoystick);
window.addEventListener('touchcancel', resetJoystick);

// 발사 버튼 터치 이벤트
touchFireBtn.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    mouse.isDown = true; 
}, { passive: false });

touchFireBtn.addEventListener('touchend', (e) => { 
    e.preventDefault(); 
    mouse.isDown = false; 
}, { passive: false });


// Player 클래스의 update() 함수 개선
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

        // 터치 조이스틱 조작 시 조이스틱 진행 방향으로 기체 방향 설정
        if (touchJoystick.active && (dx !== 0 || dy !== 0)) {
            this.angle = Math.atan2(dy, dx);
        } else {
            this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        }

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
    
    // ... 이하 동일
