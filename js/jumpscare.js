// js/jumpscare.js

import { audioManager } from './audio.js';

// Mapping tipe hantu → gambar jumpscare
const JUMPSCARE_IMAGES = {
    'Pocong': 'assets/images/jumpscare_pocong.jpg',
    'Kuntilanak': 'assets/images/jumpscare_kuntilanak.jpg',
    'Tuyul': 'assets/images/jumpscare_tuyul.jpg',
    'Kuyang': 'assets/images/jumpscare_kuyang.jpg',
    'default': 'assets/images/jumpscare_default.jpg',
};

// Mapping tipe hantu → suara jumpscare
// (gunakan id yang sudah didaftarkan di audio.js)
const JUMPSCARE_SOUNDS = {
    'Kuntilanak': 'jumpscare', // ganti jika punya suara khusus
    'Pocong': 'jumpscare',
    'Tuyul': 'jumpscare',
    'Kuyang': 'jumpscare',
    'default': 'jumpscare',
};

export class JumpscareSystem {
    constructor() {
        this.el = document.getElementById('jumpscare');
        this.imgEl = document.getElementById('jumpscare-img');
        this._onDone = null;
    }

    /**
     * Jalankan jumpscare berdasarkan tipe hantu.
     * @param {Function} onDone — callback setelah selesai
     * @param {string} ghostType — tipe hantu (e.g. 'Kuntilanak')
     */
    trigger(onDone, ghostType = 'default') {
        this._onDone = onDone;

        // Pilih gambar sesuai tipe hantu
        const imgSrc = JUMPSCARE_IMAGES[ghostType] || JUMPSCARE_IMAGES['default'];
        this.imgEl.style.backgroundImage = `url('${imgSrc}')`;

        // Tampilkan overlay
        this.el.classList.remove('hidden');
        document.body.classList.add('shake');

        // ✅ Baris sound ada DI DALAM trigger(), bukan di luar!
        const soundId = JUMPSCARE_SOUNDS[ghostType] || JUMPSCARE_SOUNDS['default'];
        audioManager.play(soundId);

        setTimeout(() => document.body.classList.remove('shake'), 600);

        setTimeout(() => {
            this.el.classList.add('hidden');
            this._onDone?.();
        }, 2500);
    }
}