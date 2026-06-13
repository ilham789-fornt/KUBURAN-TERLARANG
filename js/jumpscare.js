/**
 * jumpscare.js — Sistem jumpscare profesional.
 */

import { audioManager } from './audio.js';

export class JumpscareSystem {
    constructor() {
        this.el = document.getElementById('jumpscare');
        this.imgEl = document.getElementById('jumpscare-img');
        this._onDone = null;
    }

    /**
     * Jalankan jumpscare.
     * @param {Function} onDone — callback setelah selesai
     */
    trigger(onDone) {
        this._onDone = onDone;

        // Tampilkan overlay
        this.el.classList.remove('hidden');
        document.body.classList.add('shake');
        audioManager.play('jumpscare');

        // Screen shake pada body
        setTimeout(() => document.body.classList.remove('shake'), 600);

        // Selesai setelah 2.5 detik
        setTimeout(() => {
            this.el.classList.add('hidden');
            this._onDone?.();
        }, 2500);
    }
}
