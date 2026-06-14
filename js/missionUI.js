/**
 * missionUI.js — UI untuk misi bertahap (HUD atas kiri)
 */

export class MissionUI {
    constructor() {
        this._createPanel();
    }

    _createPanel() {
        const panel = document.createElement('div');
        panel.id = 'mission-panel';
        panel.style.cssText = `
      position: fixed;
      top: 70px;
      left: 20px;
      background: rgba(0,0,0,0.8);
      border: 1px solid rgba(100,0,200,0.6);
      box-shadow: 0 0 20px rgba(100,0,200,0.3);
      padding: 14px 20px;
      border-radius: 4px;
      color: #fff;
      font-family: 'Roboto', sans-serif;
      font-size: 0.85rem;
      z-index: 55;
      min-width: 220px;
      pointer-events: none;
    `;
        document.body.appendChild(panel);
        this.panel = panel;
    }

    /**
     * Update tampilan misi.
     * @param {number} phase — 1, 2, atau 3
     * @param {number} current — progress saat ini
     * @param {number} total — total yang dibutuhkan
     * @param {string} hint — petunjuk aksi (tombol apa yang ditekan)
     */
    update(phase, current, total, hint = '') {
        const phases = [
            { icon: '🕯️', label: 'Fase 1: Nyalakan Lilin' },
            { icon: '💎', label: 'Fase 2: Kumpulkan Jimat' },
            { icon: '📜', label: 'Fase 3: Ritual Altar' },
        ];
        const p = phases[phase - 1];
        const dots = Array.from({ length: total }, (_, i) =>
            `<span style="color:${i < current ? '#00ffcc' : '#444'};margin:0 3px;">●</span>`
        ).join('');

        this.panel.innerHTML = `
      <div style="color:rgba(180,150,255,0.9);font-size:0.75rem;letter-spacing:2px;margin-bottom:6px;">
        MISI AKTIF
      </div>
      <div style="font-size:1rem;margin-bottom:8px;">
        ${p.icon} <strong>${p.label}</strong>
      </div>
      <div style="margin-bottom:6px;">${dots} ${current}/${total}</div>
      ${hint ? `<div style="color:rgba(255,220,100,0.8);font-size:0.78rem;margin-top:4px;">${hint}</div>` : ''}
    `;
    }

    showPhaseComplete(text) {
        const flash = document.createElement('div');
        flash.style.cssText = `
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Creepster', cursive;
      font-size: 2.5rem;
      color: #00ffcc;
      text-shadow: 0 0 30px #00ffcc;
      letter-spacing: 4px;
      animation: resultFlash 2.5s ease forwards;
      pointer-events: none;
      z-index: 200;
    `;
        flash.textContent = text;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 2500);
    }

    hide() {
        this.panel.style.display = 'none';
    }
}