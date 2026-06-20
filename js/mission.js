/**
 * mission.js — Sistem Misi & Objektif
 * Tantangan 1: Misi bervariasi setiap sesi bermain.
 */

export const MISSION_TYPES = {
    EXORCISE: 'exorcise',   // Usir X hantu
    CANDLE: 'candle',     // Nyalakan X lilin
    SURVIVE: 'survive',    // Bertahan X detik tanpa disentuh
    COLLECT: 'collect',    // Kumpulkan X jimat
    PERFECT: 'perfect',    // Usir hantu dengan akurasi 90%+
};

/**
 * Template misi yang bisa muncul.
 * difficulty: 1 (mudah) — 3 (sulit)
 */
const MISSION_TEMPLATES = [
    { id: 'ex5', type: MISSION_TYPES.EXORCISE, target: 5, label: 'Usir 5 Hantu', reward: 300, difficulty: 1 },
    { id: 'ex10', type: MISSION_TYPES.EXORCISE, target: 10, label: 'Usir 10 Hantu', reward: 800, difficulty: 2 },
    { id: 'sv60', type: MISSION_TYPES.SURVIVE, target: 60, label: 'Bertahan 60 Detik', reward: 200, difficulty: 1 },
    { id: 'sv180', type: MISSION_TYPES.SURVIVE, target: 180, label: 'Bertahan 3 Menit', reward: 500, difficulty: 2 },
    { id: 'ca3', type: MISSION_TYPES.CANDLE, target: 3, label: 'Nyalakan 3 Lilin', reward: 250, difficulty: 1 },
    { id: 'ca6', type: MISSION_TYPES.CANDLE, target: 6, label: 'Nyalakan 6 Lilin', reward: 500, difficulty: 2 },
    { id: 'co3', type: MISSION_TYPES.COLLECT, target: 3, label: 'Kumpulkan 3 Jimat', reward: 350, difficulty: 1 },
    { id: 'pf2', type: MISSION_TYPES.PERFECT, target: 2, label: 'Usir 2 Hantu (akurasi 90%)', reward: 400, difficulty: 2 },
    { id: 'pf5', type: MISSION_TYPES.PERFECT, target: 5, label: 'Usir 5 Hantu (akurasi 90%)', reward: 900, difficulty: 3 },
];

export class MissionSystem {
    constructor() {
        /** @type {Array<{template: object, progress: number, completed: boolean}>} */
        this.activeMissions = [];
        this._onComplete = null;
    }

    /**
     * Pilih 3 misi acak (1 mudah, 1 sedang, 1 sulit) untuk sesi ini.
     * @param {(mission: object, bonus: number) => void} onComplete
     */
    init(onComplete) {
        this._onComplete = onComplete;
        const easy = this._pickRandom(MISSION_TEMPLATES.filter(m => m.difficulty === 1));
        const medium = this._pickRandom(MISSION_TEMPLATES.filter(m => m.difficulty === 2));
        const hard = this._pickRandom(MISSION_TEMPLATES.filter(m => m.difficulty === 3));

        this.activeMissions = [easy, medium, hard]
            .filter(Boolean)
            .map(t => ({ template: t, progress: 0, completed: false }));
    }

    _pickRandom(arr) {
        if (!arr.length) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /** Catat event game ke sistem misi. */
    recordEvent(type, value = 1) {
        this.activeMissions.forEach(m => {
            if (m.completed) return;
            if (m.template.type === type) {
                m.progress = Math.min(m.template.target, m.progress + value);
                if (m.progress >= m.template.target) {
                    m.completed = true;
                    this._onComplete?.(m.template, m.template.reward);
                }
            }
        });
    }

    /** Khusus perfect exorcise: hanya hitung jika akurasi >= 90. */
    recordExorcise(accuracy) {
        this.recordEvent(MISSION_TYPES.EXORCISE, 1);
        if (accuracy >= 90) {
            this.recordEvent(MISSION_TYPES.PERFECT, 1);
        }
    }

    getMissions() { return this.activeMissions; }
}
