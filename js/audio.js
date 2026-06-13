/**
 * audio.js — AudioManager
 * Mengelola semua suara game dengan kategori volume terpisah.
 */

import { loadOptions } from './save.js';

class AudioManager {
    constructor() {
        /** @type {Map<string, HTMLAudioElement>} */
        this.sounds = new Map();
        /** @type {Map<string, HTMLAudioElement[]>} */
        this.playing = new Map();

        this.options = loadOptions();

        // Definisi semua suara
        this._registry = [
            { id: 'wind', src: 'assets/sounds/wind.mp3', category: 'music', loop: true },
            { id: 'graveyard', src: 'assets/sounds/graveyard.mp3', category: 'music', loop: true },
            { id: 'crow', src: 'assets/sounds/crow.mp3', category: 'music', loop: true },
            { id: 'whisper', src: 'assets/sounds/whisper.mp3', category: 'music', loop: true },
            { id: 'ghost', src: 'assets/sounds/ghost.mp3', category: 'sfx', loop: false },
            { id: 'footstep', src: 'assets/sounds/footstep.mp3', category: 'sfx', loop: false },
            { id: 'flashlight', src: 'assets/sounds/flashlight.mp3', category: 'sfx', loop: false },
            { id: 'thunder', src: 'assets/sounds/thunder.mp3', category: 'sfx', loop: false },
            { id: 'ui_hover', src: 'assets/sounds/ui_hover.mp3', category: 'sfx', loop: false },
            { id: 'ui_click', src: 'assets/sounds/ui_click.mp3', category: 'sfx', loop: false },
            { id: 'jumpscare', src: 'assets/sounds/jumpscare.mp3', category: 'sfx', loop: false },
            { id: 'victory', src: 'assets/sounds/victory.mp3', category: 'music', loop: false },
        ];
    }

    /** Load semua audio assets. */
    async loadAll() {
        const promises = this._registry.map(({ id, src, loop }) => {
            return new Promise((resolve) => {
                const audio = new Audio();
                audio.src = src;
                audio.loop = loop;
                audio.preload = 'auto';
                audio.oncanplaythrough = () => resolve();
                audio.onerror = () => resolve(); // Jangan block loading jika file tidak ada
                this.sounds.set(id, audio);
                setTimeout(resolve, 2000); // Timeout fallback
            });
        });
        await Promise.all(promises);
    }

    /**
     * Dapatkan volume efektif berdasarkan kategori.
     * @param {string} category — 'music' | 'sfx' | 'voice'
     * @returns {number} 0-1
     */
    _getVolume(category) {
        const master = this.options.masterVolume / 100;
        let cat = 1;
        if (category === 'music') cat = this.options.musicVolume / 100;
        if (category === 'sfx') cat = this.options.sfxVolume / 100;
        if (category === 'voice') cat = this.options.voiceVolume / 100;
        return master * cat;
    }

    /**
     * Putar suara.
     * @param {string} id
     * @returns {HTMLAudioElement|null}
     */
    play(id) {
        const audio = this.sounds.get(id);
        if (!audio) return null;
        const reg = this._registry.find(r => r.id === id);
        audio.volume = this._getVolume(reg?.category || 'sfx');
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return audio;
    }

    /** Stop suara. */
    stop(id) {
        const audio = this.sounds.get(id);
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
    }

    /** Stop semua suara. */
    stopAll() {
        this.sounds.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    /**
     * Update volume realtime saat options berubah.
     * @param {object} newOptions
     */
    updateOptions(newOptions) {
        this.options = newOptions;
        this.sounds.forEach((audio, id) => {
            const reg = this._registry.find(r => r.id === id);
            if (audio && !audio.paused) {
                audio.volume = this._getVolume(reg?.category || 'sfx');
            }
        });
    }

    /** Mulai ambient sounds untuk menu/game. */
    startAmbience() {
        ['wind', 'graveyard', 'crow', 'whisper'].forEach(id => this.play(id));
    }

    /** Stop ambient sounds. */
    stopAmbience() {
        ['wind', 'graveyard', 'crow', 'whisper'].forEach(id => this.stop(id));
    }
}

// Singleton
export const audioManager = new AudioManager();
