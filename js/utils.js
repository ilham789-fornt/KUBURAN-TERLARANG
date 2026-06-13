/**
 * utils.js — Helper functions
 * Levenshtein Distance, fuzzy matching, random, easing, dll.
 */

/**
 * Hitung Levenshtein Distance antara dua string.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshteinDistance(a, b) {
    const m = a.length,
        n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ?
                dp[i - 1][j - 1] :
                1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Hitung similarity percentage antara dua string (0-100).
 * Menggabungkan Levenshtein dan token matching.
 * @param {string} input
 * @param {string} target
 * @returns {number}
 */
export function calculateSimilarity(input, target) {
    const normalize = (s) => s.toLowerCase()
        .replace(/[^a-z0-9\s']/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const a = normalize(input);
    const b = normalize(target);

    if (a === b) return 100;
    if (!a || !b) return 0;

    // Levenshtein similarity
    const dist = levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    const levenSim = ((maxLen - dist) / maxLen) * 100;

    // Token overlap similarity
    const tokA = new Set(a.split(' '));
    const tokB = new Set(b.split(' '));
    const intersection = [...tokA].filter(t => tokB.has(t)).length;
    const union = new Set([...tokA, ...tokB]).size;
    const tokenSim = union > 0 ? (intersection / union) * 100 : 0;

    // Weighted average
    return Math.min(100, Math.round(levenSim * 0.6 + tokenSim * 0.4));
}

/**
 * Random integer antara min dan max (inclusive).
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random float antara min dan max.
 */
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Clamp nilai antara min dan max.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Format detik menjadi mm:ss.
 */
export function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Lerp linear interpolation.
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Easing: ease out cubic.
 */
export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}