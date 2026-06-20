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

        // ✅ Reset animasi CSS agar jumpscareZoom diputar ulang setiap kali trigger dipanggil
        this.imgEl.style.animation = 'none';
        // Paksa reflow browser agar reset animasi benar-benar terjadi
        void this.imgEl.offsetWidth;
        this.imgEl.style.animation = '';

        // ✅ Tampilkan overlay dengan paksa (override .hidden)
        this.el.classList.remove('hidden');
        this.el.style.display = 'flex';
        this.el.style.zIndex = '9999';
        document.body.classList.add('shake');

        // ✅ Sound dipanggil di dalam trigger()
        const soundId = JUMPSCARE_SOUNDS[ghostType] || JUMPSCARE_SOUNDS['default'];
        audioManager.play(soundId);

        setTimeout(() => document.body.classList.remove('shake'), 600);

        setTimeout(() => {
            this.el.classList.add('hidden');
            this.el.style.display = '';
            this.el.style.zIndex = '';
            this._onDone?.();
        }, 2500);
    }
}