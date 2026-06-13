/**
 * save.js — LocalStorage wrapper untuk persistensi data game.
 */

const SAVE_KEY = 'kuburan_terlarang_save';
const OPTIONS_KEY = 'kuburan_terlarang_options';

/** Default options. */
export const DEFAULT_OPTIONS = {
    masterVolume: 80,
    musicVolume: 70,
    sfxVolume: 80,
    voiceVolume: 100,
    mouseSensitivity: 5,
    invertMouse: false,
    fogQuality: 'Medium',
    shadowQuality: 'Medium',
};

/**
 * Simpan opsi game ke LocalStorage.
 * @param {object} options
 */
export function saveOptions(options) {
    try {
        localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
    } catch (e) {
        console.warn('Gagal menyimpan options:', e);
    }
}

/**
 * Muat opsi game dari LocalStorage.
 * @returns {object}
 */
export function loadOptions() {
    try {
        const raw = localStorage.getItem(OPTIONS_KEY);
        if (!raw) return {...DEFAULT_OPTIONS };
        return {...DEFAULT_OPTIONS, ...JSON.parse(raw) };
    } catch (e) {
        return {...DEFAULT_OPTIONS };
    }
}

/**
 * Simpan data game (score, statistik).
 * @param {object} data
 */
export function saveGame(data) {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Gagal menyimpan game:', e);
    }
}

/**
 * Muat data game.
 * @returns {object|null}
 */
export function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

/** Hapus data game. */
export function clearGame() {
    localStorage.removeItem(SAVE_KEY);
}