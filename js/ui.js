/**
 * ui.js — UI Manager: HUD, Challenge UI, Victory, Game Over, Pause.
 */

import { formatTime } from './utils.js';

export class UIManager {
    constructor() {
        // HUD elements
        this.hud = document.getElementById('hud');
        this.scoreVal = document.getElementById('score-val');
        this.ghostVal = document.getElementById('ghost-val');
        this.timerEl = document.getElementById('hud-time');
        this.timerVal = document.getElementById('timer-val');

        // Challenge UI
        this.challengeUI = document.getElementById('challenge-ui');
        this.challengeText = document.getElementById('challenge-text');
        this.simFill = document.getElementById('similarity-fill');
        this.simPct = document.getElementById('similarity-pct');
        this.challengeTimer = document.getElementById('challenge-timer');
        this.micStatus = document.getElementById('mic-status');

        // Result flash
        this.resultFlash = document.getElementById('result-flash');

        // Red flash
        this.redFlash = document.getElementById('red-flash');

        // Screens
        this.pauseMenu = document.getElementById('pause-menu');
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.victoryScreen = document.getElementById('victory-screen');

        // State
        this.score = 0;
        this.ghostCount = 0;
    }

    /** Tampilkan HUD. */
    showHUD() {
        this.hud.classList.remove('hidden');
    }

    hideHUD() {
        this.hud.classList.add('hidden');
    }

    updateScore(score) {
        this.score = score;
        this.scoreVal.textContent = score;
    }

    updateGhostCount(count) {
        this.ghostCount = count;
        this.ghostVal.textContent = count;
    }

    /**
     * Tampilkan Challenge UI.
     * @param {string} text — teks bacaan target
     */
    showChallenge(text) {
        this.challengeText.textContent = text;
        this.challengeUI.classList.remove('hidden');
        this.timerEl.style.display = 'flex';
        this.simFill.style.width = '0%';
        this.simPct.textContent = '0%';
    }

    hideChallenge() {
        this.challengeUI.classList.add('hidden');
        this.timerEl.style.display = 'none';
    }

    /**
     * Update similarity bar realtime.
     * @param {number} pct — 0-100
     */
    updateSimilarity(pct) {
        this.simFill.style.width = pct + '%';
        this.simPct.textContent = pct + '%';
        if (pct >= 60) {
            this.simFill.classList.add('good');
        } else {
            this.simFill.classList.remove('good');
        }
    }

    /**
     * Update countdown timer challenge.
     * @param {number} seconds
     */
    updateChallengeTimer(seconds) {
        this.challengeTimer.textContent = Math.ceil(seconds);
        this.timerVal.textContent = Math.ceil(seconds);
    }

    /**
     * Tampilkan pesan hasil challenge.
     * @param {boolean} success
     */
    showResult(success) {
        this.resultFlash.classList.remove('hidden');
        if (success) {
            this.resultFlash.style.color = '#00ff88';
            this.resultFlash.textContent = '✅ HANTU BERHASIL DIUSIR!';
        } else {
            this.resultFlash.style.color = '#ff2200';
            this.resultFlash.textContent = '💀 GAGAL!';
        }
        setTimeout(() => this.resultFlash.classList.add('hidden'), 2200);
    }

    /** Flash layar merah. */
    flashRed() {
        this.redFlash.classList.remove('hidden');
        this.redFlash.style.animation = 'none';
        requestAnimationFrame(() => {
            this.redFlash.style.animation = 'redFlash 0.4s ease forwards';
        });
        setTimeout(() => this.redFlash.classList.add('hidden'), 500);
    }

    /** Tampilkan Pause Menu. */
    showPause() {
        this.pauseMenu.classList.remove('hidden');
        this.pauseMenu.style.display = 'flex';
    }

    hidePause() {
        this.pauseMenu.classList.add('hidden');
        this.pauseMenu.style.display = 'none';
    }

    /**
     * Tampilkan Game Over screen.
     */
    showGameOver() {
        this.gameoverScreen.classList.remove('hidden');
        this.gameoverScreen.style.display = 'flex';
        this._startGoBackground();
    }

    hideGameOver() {
        this.gameoverScreen.classList.add('hidden');
        this.gameoverScreen.style.display = 'none';
    }

    /**
     * Tampilkan Victory screen.
     * @param {object} stats
     */
    showVictory(stats) {
        document.getElementById('v-ghosts').textContent = stats.ghosts;
        document.getElementById('v-accuracy').textContent = Math.round(stats.accuracy);
        document.getElementById('v-time').textContent = formatTime(stats.time);
        this.victoryScreen.classList.remove('hidden');
        this.victoryScreen.style.display = 'flex';
        this._createParticles();
    }

    hideVictory() {
        this.victoryScreen.classList.add('hidden');
        this.victoryScreen.style.display = 'none';
    }

    /** Partikel cahaya untuk victory. */
    _createParticles() {
        const container = document.getElementById('victory-particles');
        container.innerHTML = '';
        for (let i = 0; i < 60; i++) {
            const p = document.createElement('div');
            p.style.cssText = `
        position: absolute;
        width: ${4 + Math.random() * 8}px;
        height: ${4 + Math.random() * 8}px;
        background: rgba(255, 255, ${150 + Math.random() * 100}, ${0.5 + Math.random() * 0.5});
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: particleFloat ${2 + Math.random() * 4}s ease-in-out ${Math.random() * 2}s infinite alternate;
        box-shadow: 0 0 ${4 + Math.random() * 8}px rgba(255,255,200,0.8);
      `;
            container.appendChild(p);
        }

        // Tambah keyframe animasi partikel
        if (!document.getElementById('particle-style')) {
            const style = document.createElement('style');
            style.id = 'particle-style';
            style.textContent = `
        @keyframes particleFloat {
          0%   { transform: translateY(0) scale(1); opacity: 0.5; }
          100% { transform: translateY(-${50 + Math.random() * 100}px) scale(1.5); opacity: 1; }
        }
      `;
            document.head.appendChild(style);
        }
    }

    /** Background animasi game over. */
    _startGoBackground() {
        const canvas = document.getElementById('go-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const animate = () => {
            if (this.gameoverScreen.classList.contains('hidden')) return;
            ctx.fillStyle = 'rgba(5,0,0,0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Efek glitch lines
            for (let i = 0; i < 3; i++) {
                const y = Math.random() * canvas.height;
                ctx.fillStyle = `rgba(${100 + Math.random()*155}, 0, 0, 0.15)`;
                ctx.fillRect(0, y, canvas.width, 1 + Math.random() * 3);
            }
            requestAnimationFrame(animate);
        };
        animate();
    }
}