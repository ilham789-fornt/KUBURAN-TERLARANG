/**
 * voice.js — Web Speech API + similarity engine.
 * Tantangan 2: Variasi kesulitan bacaan berdasarkan progress pemain.
 */

import { calculateSimilarity } from './utils.js';

// ============================================================
// TANTANGAN 2: Bacaan dibagi 3 level kesulitan
// ============================================================

/** Level 1 (mudah) — pendek, 1-3 kata kunci */
const TEXTS_EASY = [
    "Allahu Akbar",
    "Bismillah",
    "La ilaha illallah",
    "Astaghfirullah",
];

/** Level 2 (sedang) — kalimat standar */
const TEXTS_MEDIUM = [
    "Bismillahirrahmanirrahim",
    "La haula wala quwwata illa billah",
    "Subhanallahi wa bihamdihi",
    "Allahu Akbar Walillahilhamd",
];

/** Level 3 (sulit) — kalimat panjang */
const TEXTS_HARD = [
    "A'udzu billahi minasy syaithanir rajim",
    "Laa ilaaha illallaahu wahdahu laa syariika lahu",
    "Bismillahi tawakkaltu alallahi wala hawla wala quwwata illa billah",
    "Rabbighfir lii warhamnii wa'aafinii warzuqnii",
];

/**
 * Pilih teks challenge berdasarkan jumlah hantu yang sudah diusir.
 * @param {number} ghostsKilled
 * @returns  text: string, timeLimit: number, chainCount: number 
 */
export function pickChallengeConfig(ghostsKilled) {
    let pool, timeLimit, chainCount;

    if (ghostsKilled < 3) {
        // Level 1: mudah, waktu 15 detik, 1 bacaan
        pool = TEXTS_EASY;
        timeLimit = 15;
        chainCount = 1;
    } else if (ghostsKilled < 7) {
        // Level 2: sedang, waktu 12 detik, 1 bacaan
        pool = TEXTS_MEDIUM;
        timeLimit = 12;
        chainCount = 1;
    } else if (ghostsKilled < 10) {
        // Level 3: sulit, waktu 10 detik, kadang 2 bacaan berantai
        pool = TEXTS_HARD;
        timeLimit = 10;
        chainCount = Math.random() > 0.5 ? 2 : 1;
    } else {
        // Level max: sangat sulit, waktu 8 detik, 2 bacaan berantai
        pool = TEXTS_HARD;
        timeLimit = 8;
        chainCount = 2;
    }

    // Pilih teks acak
    const text = pool[Math.floor(Math.random() * pool.length)];
    return { text, timeLimit, chainCount };
}

/** Semua teks (untuk kompatibilitas) */
export const CHALLENGE_TEXTS = [...TEXTS_EASY, ...TEXTS_MEDIUM, ...TEXTS_HARD];

export class VoiceChallenge {
    constructor() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Web Speech API tidak tersedia di browser ini.');
            this.available = false;
            return;
        }
        this.available = true;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'id-ID';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;

        this.isListening = false;
        this.bestSimilarity = 0;
        this.target = '';
        this._onResult = null;

        this.recognition.onresult = (event) => {
            let bestTranscript = '';
            let bestConf = 0;
            for (let i = event.resultIndex; i < event.results.length; i++) {
                for (let j = 0; j < event.results[i].length; j++) {
                    if (event.results[i][j].confidence >= bestConf) {
                        bestConf = event.results[i][j].confidence;
                        bestTranscript = event.results[i][j].transcript;
                    }
                }
            }
            if (!bestTranscript) return;
            const sim = calculateSimilarity(bestTranscript, this.target);
            if (sim > this.bestSimilarity) this.bestSimilarity = sim;
            this._onResult?.(sim, bestTranscript);
        };

        this.recognition.onend = () => {
            if (this.isListening) try { this.recognition.start(); } catch (e) { }
        };
        this.recognition.onerror = (e) => {
            if (e.error === 'not-allowed') console.error('Izin mikrofon ditolak.');
        };
    }

    start(target, onResult) {
        if (!this.available) { this._simulateRecognition(onResult); return; }
        this.target = target;
        this.bestSimilarity = 0;
        this.isListening = true;
        this._onResult = onResult;
        try { this.recognition.start(); } catch (e) { }
    }

    stop() {
        this.isListening = false;
        try { this.recognition.stop(); } catch (e) { }
    }

    _simulateRecognition(onResult) {
        let sim = 0;
        const iv = setInterval(() => {
            sim += Math.random() * 15;
            if (sim > 100) sim = 100;
            onResult?.(Math.round(sim), '[simulasi]');
            if (sim >= 100) clearInterval(iv);
        }, 500);
        this._simInterval = iv;
    }

    clearSimulation() {
        if (this._simInterval) clearInterval(this._simInterval);
    }
}
