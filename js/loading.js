/**
 * loading.js — Loading Screen controller.
 */

const TIPS = [
    'Gunakan headset untuk pengalaman terbaik.',
    'Bacalah dengan lantang dan jelas saat challenge muncul.',
    'Jaga senter tetap menyala — kegelapan adalah musuh terbesarmu.',
    'Hantu tidak bisa diusir dengan berlari — hadapilah mereka.',
    'Ketenangan adalah kuncinya. Jangan panik saat challenge aktif.',
    'Akurasi 80% diperlukan untuk mengusir hantu.',
    'Matikan senter untuk menghemat baterai saat tidak diperlukan.',
    'Dengarkan suara-suara di sekitarmu — itu pertanda bahaya.',
];

export class LoadingScreen {
    constructor() {
        this.screen = document.getElementById('loading-screen');
        this.bar = document.getElementById('loading-bar');
        this.percent = document.getElementById('loading-percent');
        this.tip = document.getElementById('loading-tip');
        this._progress = 0;
        this._tipInterval = null;
    }

    /** Tampilkan loading screen dan mulai simulasi loading. */
    show(onComplete) {
        this.screen.style.display = 'flex';
        this._progress = 0;
        this._showRandomTip();
        this._tipInterval = setInterval(() => this._showRandomTip(), 3000);

        // Simulasi progress loading
        const step = () => {
            this._progress += randomProgress();
            if (this._progress >= 100) {
                this._progress = 100;
                this._updateBar();
                clearInterval(this._tipInterval);
                setTimeout(() => {
                    this.hide();
                    onComplete?.();
                }, 800);
                return;
            }
            this._updateBar();
            setTimeout(step, 80 + Math.random() * 120);
        };
        step();
    }

    _updateBar() {
        const p = Math.min(100, Math.round(this._progress));
        this.bar.style.width = p + '%';
        this.percent.textContent = p + '%';
    }

    _showRandomTip() {
        const idx = Math.floor(Math.random() * TIPS.length);
        this.tip.textContent = '💡 ' + TIPS[idx];
    }

    hide() {
        this.screen.style.opacity = '0';
        this.screen.style.transition = 'opacity 0.8s';
        setTimeout(() => {
            this.screen.style.display = 'none';
            this.screen.style.opacity = '1';
        }, 800);
    }
}

function randomProgress() {
    return Math.random() * 8 + 2;
}
