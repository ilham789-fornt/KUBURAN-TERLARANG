/**
 * ui.js — UI Manager (versi update: Mission + Item + Challenge scaling)
 */

import { formatTime } from './utils.js';

export class UIManager {
    constructor() {
        this.hud = document.getElementById('hud');
        this.scoreVal = document.getElementById('score-val');
        this.ghostVal = document.getElementById('ghost-val');
        this.timerEl = document.getElementById('hud-time');
        this.timerVal = document.getElementById('timer-val');
        this.challengeUI = document.getElementById('challenge-ui');
        this.challengeText = document.getElementById('challenge-text');
        this.simFill = document.getElementById('similarity-fill');
        this.simPct = document.getElementById('similarity-pct');
        this.challengeTimer = document.getElementById('challenge-timer');
        this.micStatus = document.getElementById('mic-status');
        this.resultFlash = document.getElementById('result-flash');
        this.redFlash = document.getElementById('red-flash');
        this.pauseMenu = document.getElementById('pause-menu');
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.victoryScreen = document.getElementById('victory-screen');

        this.score = 0;
        this.ghostCount = 0;

        this._buildMissionPanel();
        this._buildItemToast();
        this._buildChainIndicator();
        this._buildDifficultyBadge();
    }

    // ============================================================
    // MISI PANEL (Tantangan 1)
    // ============================================================
    _buildMissionPanel() {
        const el = document.createElement('div');
        el.id = 'mission-panel';
        el.style.cssText = `
      position: fixed; top: 70px; right: 16px;
      background: rgba(0,0,0,0.82);
      border: 1px solid rgba(139,0,0,0.6);
      border-radius: 4px;
      padding: 10px 14px;
      min-width: 220px;
      z-index: 55;
      pointer-events: none;
      font-family: 'Roboto', sans-serif;
    `;
        el.innerHTML = '<div style="font-family:\'Creepster\',cursive;color:#ff4400;letter-spacing:2px;font-size:0.9rem;margin-bottom:6px">📜 MISI</div>';
        document.body.appendChild(el);
        this._missionPanel = el;
    }

    /** Render ulang daftar misi aktif. */
    updateMissionPanel(missions) {
        if (!this._missionPanel) return;
        let html = '<div style="font-family:\'Creepster\',cursive;color:#ff4400;letter-spacing:2px;font-size:0.9rem;margin-bottom:6px">📜 MISI</div>';
        missions.forEach(m => {
            const pct = Math.round((m.progress / m.template.target) * 100);
            const done = m.completed;
            html += `
        <div style="margin-bottom:8px;opacity:${done ? 0.5 : 1}">
          <div style="font-size:0.78rem;color:${done ? '#44ff88' : '#ddd'};margin-bottom:3px">
            ${done ? '\u2705' : '\u25b8'} ${m.template.label}
            <span style="color:#ffcc00;font-size:0.7rem">+${m.template.reward}</span>
          </div>
          <div style="background:rgba(255,255,255,0.1);height:5px;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${done ? '#44ff88' : '#8b0000'};transition:width 0.4s"></div>
          </div>
          <div style="font-size:0.65rem;color:rgba(255,255,255,0.4);text-align:right">${m.progress}/${m.template.target}</div>
        </div>
      `;
        });
        this._missionPanel.innerHTML = html;
    }

    // ============================================================
    // ITEM PICKUP TOAST (Tantangan 4)
    // ============================================================
    _buildItemToast() {
        const el = document.createElement('div');
        el.id = 'item-toast';
        el.style.cssText = `
      position: fixed;
      bottom: 80px; left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.9);
      border: 1px solid rgba(255,200,0,0.6);
      border-radius: 4px;
      padding: 10px 22px;
      font-family: 'Creepster', cursive;
      font-size: 1.2rem;
      letter-spacing: 2px;
      color: #ffcc00;
      z-index: 70;
      pointer-events: none;
      display: none;
      text-align: center;
    `;
        document.body.appendChild(el);
        this._itemToast = el;
    }

    /** Tampilkan notifikasi item terkumpul. */
    showItemPickup(label, desc) {
        if (!this._itemToast) return;
        this._itemToast.innerHTML = `${label}<br><span style="font-size:0.75rem;color:rgba(255,255,255,0.7)">${desc}</span>`;
        this._itemToast.style.display = 'block';
        if (this._itemToastTimer) clearTimeout(this._itemToastTimer);
        this._itemToastTimer = setTimeout(() => {
            this._itemToast.style.display = 'none';
        }, 2500);
    }

    // ============================================================
    // CHAIN CHALLENGE INDICATOR (Tantangan 2)
    // ============================================================
    _buildChainIndicator() {
        const el = document.createElement('div');
        el.id = 'chain-indicator';
        el.style.cssText = `
      position: fixed;
      top: 18px; left: 50%;
      transform: translateX(-50%);
      background: rgba(139,0,0,0.85);
      border: 1px solid #ff0000;
      border-radius: 20px;
      padding: 3px 16px;
      font-family: 'Creepster', cursive;
      font-size: 0.85rem;
      letter-spacing: 2px;
      color: #fff;
      z-index: 60;
      pointer-events: none;
      display: none;
    `;
        document.body.appendChild(el);
        this._chainIndicator = el;
    }

    /** Tampilkan indikator chain (mis: "Bacaan 1/2"). */
    showChainProgress(current, total) {
        if (!this._chainIndicator || total <= 1) { if (this._chainIndicator) this._chainIndicator.style.display = 'none'; return; }
        this._chainIndicator.textContent = `🔗 Bacaan ${current} dari ${total}`;
        this._chainIndicator.style.display = 'block';
    }

    hideChainProgress() {
        if (this._chainIndicator) this._chainIndicator.style.display = 'none';
    }

    // ============================================================
    // DIFFICULTY BADGE (Tantangan 2)
    // ============================================================
    _buildDifficultyBadge() {
        const el = document.createElement('div');
        el.id = 'diff-badge';
        el.style.cssText = `
      position: fixed;
      top: 70px; left: 16px;
      background: rgba(0,0,0,0.8);
      border: 1px solid rgba(100,100,100,0.4);
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 0.72rem;
      color: rgba(255,255,255,0.6);
      z-index: 55;
      pointer-events: none;
      letter-spacing: 1px;
    `;
        document.body.appendChild(el);
        this._diffBadge = el;
    }

    /** Update badge level kesulitan. */
    updateDifficulty(ghostsKilled) {
        if (!this._diffBadge) return;
        let level, color;
        if (ghostsKilled < 3) { level = '★☆☆ Normal'; color = '#88ff88'; }
        else if (ghostsKilled < 7) { level = '★★☆ Sedang'; color = '#ffcc00'; }
        else if (ghostsKilled < 10) { level = '★★★ Berbahaya'; color = '#ff6600'; }
        else { level = '☠️ Nightmare'; color = '#ff0000'; }
        this._diffBadge.innerHTML = `<span style="color:${color}">${level}</span>`;
    }

    // ============================================================
    // FUNGSI UI STANDAR
    // ============================================================
    showHUD() { this.hud.classList.remove('hidden'); }
    hideHUD() { this.hud.classList.add('hidden'); }

    updateScore(score) { this.score = score; this.scoreVal.textContent = score; }
    updateGhostCount(count) { this.ghostCount = count; this.ghostVal.textContent = count; this.updateDifficulty(count); }

    showChallenge(text, timeLimit) {
        this.challengeText.textContent = text;
        this.challengeUI.classList.remove('hidden');
        this.timerEl.style.display = 'flex';
        this.simFill.style.width = '0%';
        this.simPct.textContent = '0%';
        // Warna timer berubah sesuai kesulitan
        const timerColor = timeLimit <= 8 ? '#ff0000' : timeLimit <= 12 ? '#ff6600' : '#ff4400';
        this.challengeTimer.style.color = timerColor;
    }

    hideChallenge() {
        this.challengeUI.classList.add('hidden');
        this.timerEl.style.display = 'none';
        this.hideChainProgress();
    }

    updateSimilarity(pct) {
        this.simFill.style.width = pct + '%';
        this.simPct.textContent = pct + '%';
        this.simFill.classList.toggle('good', pct >= 60);
    }

    updateChallengeTimer(seconds) {
        this.challengeTimer.textContent = Math.ceil(seconds);
        this.timerVal.textContent = Math.ceil(seconds);
    }

    showResult(success) {
        this.resultFlash.classList.remove('hidden');
        if (success) {
            this.resultFlash.style.color = '#00ff88';
            this.resultFlash.textContent = '\u2705 HANTU BERHASIL DIUSIR!';
        } else {
            this.resultFlash.style.color = '#ff2200';
            this.resultFlash.textContent = '\u{1F480} GAGAL!';
        }
        setTimeout(() => this.resultFlash.classList.add('hidden'), 2200);
    }

    /** Notifikasi bonus misi selesai. */
    showMissionComplete(label, reward) {
        this.resultFlash.classList.remove('hidden');
        this.resultFlash.style.color = '#ffcc00';
        this.resultFlash.textContent = `\ud83d\udcdc ${label} (+${reward})`;
        setTimeout(() => this.resultFlash.classList.add('hidden'), 3000);
    }

    flashRed() {
        this.redFlash.classList.remove('hidden');
        this.redFlash.style.animation = 'none';
        requestAnimationFrame(() => { this.redFlash.style.animation = 'redFlash 0.4s ease forwards'; });
        setTimeout(() => this.redFlash.classList.add('hidden'), 500);
    }

    showPause() { this.pauseMenu.classList.remove('hidden'); this.pauseMenu.style.display = 'flex'; }
    hidePause() { this.pauseMenu.classList.add('hidden'); this.pauseMenu.style.display = 'none'; }

    showGameOver() {
        this.gameoverScreen.classList.remove('hidden');
        this.gameoverScreen.style.display = 'flex';
        this._startGoBackground();
    }
    hideGameOver() { this.gameoverScreen.classList.add('hidden'); this.gameoverScreen.style.display = 'none'; }

    showVictory(stats) {
        document.getElementById('v-ghosts').textContent = stats.ghosts;
        document.getElementById('v-accuracy').textContent = Math.round(stats.accuracy);
        document.getElementById('v-time').textContent = formatTime(stats.time);
        // Tampilkan bonus misi jika ada
        if (stats.missionBonus > 0) {
            const bonusEl = document.getElementById('v-mission-bonus');
            if (bonusEl) bonusEl.textContent = stats.missionBonus;
        }
        this.victoryScreen.classList.remove('hidden');
        this.victoryScreen.style.display = 'flex';
        this._createParticles();
    }
    hideVictory() { this.victoryScreen.classList.add('hidden'); this.victoryScreen.style.display = 'none'; }

    _createParticles() {
        const container = document.getElementById('victory-particles');
        container.innerHTML = '';
        for (let i = 0; i < 60; i++) {
            const p = document.createElement('div');
            p.style.cssText = `
        position:absolute;
        width:${4 + Math.random() * 8}px; height:${4 + Math.random() * 8}px;
        background:rgba(255,255,${150 + Math.random() * 100},${0.5 + Math.random() * 0.5});
        border-radius:50%;
        left:${Math.random() * 100}%; top:${Math.random() * 100}%;
        animation:particleFloat ${2 + Math.random() * 4}s ease-in-out ${Math.random() * 2}s infinite alternate;
        box-shadow:0 0 ${4 + Math.random() * 8}px rgba(255,255,200,0.8);
      `;
            container.appendChild(p);
        }
        if (!document.getElementById('particle-style')) {
            const style = document.createElement('style');
            style.id = 'particle-style';
            style.textContent = `@keyframes particleFloat { 0%{transform:translateY(0) scale(1);opacity:0.5} 100%{transform:translateY(-80px) scale(1.5);opacity:1} }`;
            document.head.appendChild(style);
        }
    }

    _startGoBackground() {
        const canvas = document.getElementById('go-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        const animate = () => {
            if (this.gameoverScreen.classList.contains('hidden')) return;
            ctx.fillStyle = 'rgba(5,0,0,0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < 3; i++) {
                const y = Math.random() * canvas.height;
                ctx.fillStyle = `rgba(${100 + Math.random() * 155},0,0,0.15)`;
                ctx.fillRect(0, y, canvas.width, 1 + Math.random() * 3);
            }
            requestAnimationFrame(animate);
        };
        animate();
    }
}
