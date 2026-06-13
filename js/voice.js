/**
 * voice.js — Web Speech API + similarity engine.
 */

import { calculateSimilarity } from './utils.js';

/** Target bacaan challenge. */
export const CHALLENGE_TEXTS = [
    "A'udzu billahi minasy syaithanir rajim",
    "Bismillahirrahmanirrahim",
    "La haula wala quwwata illa billah",
    "Allahu Akbar",
];

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
        this._onEnd = null;

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
            // Restart jika masih listening
            if (this.isListening) {
                try { this.recognition.start(); } catch (e) {}
            }
        };

        this.recognition.onerror = (e) => {
            if (e.error === 'not-allowed') {
                console.error('Izin mikrofon ditolak.');
            }
        };
    }

    /**
     * Mulai challenge voice.
     * @param {string} target — teks target
     * @param {Function} onResult — callback(similarity, transcript)
     * @param {Function} onEnd — callback saat challenge selesai
     */
    start(target, onResult, onEnd) {
        if (!this.available) {
            // Simulasi jika API tidak tersedia
            this._simulateRecognition(onResult);
            return;
        }
        this.target = target;
        this.bestSimilarity = 0;
        this.isListening = true;
        this._onResult = onResult;
        this._onEnd = onEnd;
        try {
            this.recognition.start();
        } catch (e) {}
    }

    stop() {
        this.isListening = false;
        try {
            this.recognition.stop();
        } catch (e) {}
    }

    /** Simulasi untuk browser yang tidak mendukung. */
    _simulateRecognition(onResult) {
        let sim = 0;
        const interval = setInterval(() => {
            sim += Math.random() * 15;
            if (sim > 100) sim = 100;
            onResult?.(Math.round(sim), '[simulasi]');
            if (sim >= 100) clearInterval(interval);
        }, 500);
        this._simInterval = interval;
    }

    clearSimulation() {
        if (this._simInterval) clearInterval(this._simInterval);
    }
}
