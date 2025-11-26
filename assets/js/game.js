/* ============================================================
   GALAGA GAME ENGINE v2.0
   (C-1 구조용 단일 게임 엔진 파일)
============================================================ */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 게임 객체
window.game = {
    player: {
        x: canvas.width / 2 - 20,
        y: canvas.height - 60,
        width: 40,
        height: 28,
        speed: 5,
        color: "#0ff"
    },

    bullets: [],
    enemies: [],
    enemyBullets: [],
    particles: [],
    stars: [],

    score: 0,
    lives: 3,
    stage: 1,
    highScore: 0,
    isRunning: false,
    isPaused: false,
    keys: {},
    lastEnemyShot: 0,
    enemyShotDelay: 900,

    playerName: "",
    studentId: "",

    /* ======================================================
       초기 설정
    ====================================================== */
    init() {
        this.highScore = parseInt(localStorage.getItem("galagaHighScore")) || 0;
        document.getElementById("highScore").textContent = this.highScore;

        this.setupStars();
        this.setupControls();
        this.setupMobileControls();
    },

    setupStars() {
        this.stars = [];
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2
            });
        }
    },

    /* ======================================================
       입력 처리
    ====================================================== */
    setupControls() {
        document.addEventListener("keydown", (e) => {
            this.keys[e.key] = true;

            if (e.key === " " && this.isRunning && !this.isPaused) {
                e.preventDefault();
                this.shoot();
            }
            if (e.key === "p" || e.key === "P") {
                this.togglePause();
            }
        });

        document.addEventListener("keyup", (e) => {
            this.keys[e.key] = false;
        });
    },

    setupMobileControls() {
        const btnLeft = document.getElementById("btnLeft");
        const btnRight = document.getElementById("btnRight");
        const btnFire = document.getElementById("btnFire");

        const setBtn = (btn, key) => {
            btn.addEventListener("touchstart", (e) => {
                e.preventDefault();
                this.keys[key] = true;
            });
            btn.addEventListener("touchend", () => {
                this.keys[key] = false;
            });
        };

        setBtn(btnLeft, "ArrowLeft");
        setBtn(btnRight, "ArrowRight");

        btnFire.addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (this.isRunning && !this.isPaused) this.shoot();
        });
    },

    /* ======================================================
       게임 시작 / 재시작
    ====================================================== */
    start() {
        this.score = 0;
        this.lives = 3;
        this.stage = 1;

        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];

        this.player.x = canvas.width / 2 - 20;

        this.isRunning = true;
        this.isPaused = false;

        this.createEnemies();
        this.updateStats();
        this.loop();
    },

    restart() {
        document.getElementById("gameOverScreen").classList.remove("show");
        this.start();
    },

    /* ======================================================
       적 생성
    ====================================================== */
    createEnemies() {
        const rows = Math.min(4 + Math.floor(this.stage / 2), 7);
        const cols = 7;

        this.enemies = [];

        const w = 35;
        const h = 28;
        const pad = 12;
        const offsetX = (canvas.width - cols * (w + pad)) / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.enemies.push({
                    x: offsetX + c * (w + pad),
                    y: 60 + r * (h + pad),
                    width: w,
                    height: h,
                    speed: 1 + (this.stage - 1) * 0.25,
                    direction: 1,
                    color: r === 0 ? "#ff0" : "#0f0",
                    health: r === 0 ? 2 : 1,
                    points: r === 0 ? 30 : 10
                });
            }
        }

        this.enemyShotDelay = Math.max(550, 900 - this.stage * 70);
    },

    /* ======================================================
       Player Shoot
    ====================================================== */
    shoot() {
        this.bullets.push({
            x: this.player.x + this.player.width / 2 - 2,
            y: this.player.y,
            width: 4,
            height: 12,
            speed: 9,
            color: "#ff0"
        });
    },

    /* ======================================================
       Game Loop
    ====================================================== */
    loop() {
        if (!this.isRunning) return;

        if (!this.isPaused) {
            this.update();
            this.draw();
        }

        requestAnimationFrame(() => this.loop());
    },

    /* ======================================================
       Update Logic
    ====================================================== */
    update() {
        // Move stars
        this.stars.forEach(star => {
            star.y += 0.6;
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
        });

        // Player move
        if (this.keys["ArrowLeft"] && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys["ArrowRight"] && this.player.x < canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }

        // Bullets move
        this.bullets = this.bullets.filter(b => {
            b.y -= b.speed;
            return b.y > -10;
        });

        // Enemies movement
        let down = false;
        this.enemies.forEach(e => {
            e.x += e.speed * e.direction;
            if (e.x <= 0 || e.x >= canvas.width - e.width) down = true;
        });
        if (down) {
            this.enemies.forEach(e => {
                e.direction *= -1;
                e.y += 18;
            });
        }

        // Enemy bullets move
        this.enemyBullets = this.enemyBullets.filter(b => {
            b.y += b.speed;
            return b.y < canvas.height + 10;
        });

        // Collision: bullets → enemies
        this.bullets.forEach((b, bi) => {
            this.enemies.forEach((e, ei) => {
                if (this.hit(b, e)) {
                    e.health--;
                    this.bullets.splice(bi, 1);

                    if (e.health <= 0) {
                        this.score += e.points;
                        this.createExplosion(e.x, e.y);
                        this.enemies.splice(ei, 1);

                        this.updateStats();

                        if (this.enemies.length === 0) {
                            this.stageClear();
                        }
                    }
                }
            });
        });

        // Collision: enemy bullets → player
        this.enemyBullets.forEach((b, i) => {
            if (this.hit(b, this.player)) {
                this.enemyBullets.splice(i, 1);
                this.playerHit();
            }
        });

        // Enemy shoot
        const now = Date.now();
        if (now - this.lastEnemyShot > this.enemyShotDelay) {
            const shooters = this.enemies.filter(() => Math.random() < 0.25);
            shooters.forEach(e => {
                this.enemyBullets.push({
                    x: e.x + e.width / 2 - 2,
                    y: e.y + e.height,
                    width: 4,
                    height: 10,
                    speed: 3.5,
                    color: "#f00"
                });
            });

            this.lastEnemyShot = now;
        }
    },

    /* ======================================================
       Draw Everything
    ====================================================== */
    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Stars
        ctx.fillStyle = "#fff";
        this.stars.forEach(s => {
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });

        // Player
        ctx.fillStyle = this.player.color;
        ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

        // Bullets
        this.bullets.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });

        // Enemies
        this.enemies.forEach(e => {
            ctx.fillStyle = e.color;
            ctx.fillRect(e.x, e.y, e.width, e.height);
        });

        // Enemy bullets
        this.enemyBullets.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });

        // Particle explosions
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 3, 3);
        });
    },

    /* ======================================================
       Utility
    ====================================================== */
    hit(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    },

    playerHit() {
        this.lives--;
        this.updateStats();

        if (this.lives <= 0) {
            this.gameOver();
        }
    },

    createExplosion(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x,
                y,
                color: ["#ff0", "#f80", "#f00"][Math.floor(Math.random() * 3)],
                life: 20
            });
        }
    },

    /* ======================================================
       Game Over / Stage Clear
    ====================================================== */
    async gameOver() {
        this.isRunning = false;

        await window.saveScore(
            this.score,
            this.stage,
            this.playerName,
            this.studentId
        );

        document.getElementById("finalScore").textContent = this.score;
        document.getElementById("gameOverScreen").classList.add("show");
    },

    stageClear() {
        this.stage++;
        this.isPaused = true;

        document.getElementById("stageClearScreen").classList.add("show");

        setTimeout(() => {
            document.getElementById("stageClearScreen").classList.remove("show");
            this.isPaused = false;
            this.createEnemies();
        }, 1600);
    },

    /* ======================================================
       UI
    ====================================================== */
    updateStats() {
        document.getElementById("score").textContent = this.score;
        document.getElementById("stage").textContent = this.stage;
        document.getElementById("lives").textContent = "❤️".repeat(this.lives);
    },

    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
    }
};

// 자동 초기화
window.game.init();
