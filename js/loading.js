/**
 * loading.js — Loading Screen controller.
 * Versi terintegrasi dengan preload model 3D nyata.
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

    /**
     * Tampilkan loading screen dengan preload model 3D nyata.
     * Progress bar mencerminkan jumlah model yang sudah dimuat.
     * @param {Function} onComplete - callback dipanggil setelah semua selesai
     */
    async show(onComplete) {
        this.screen.style.display = 'flex';
        this._progress = 0;
        this._updateBar();
        this._showRandomTip();
        this._tipInterval = setInterval(() => this._showRandomTip(), 3000);

        try {
            const { preloadModels } = await import('./modelLoader.js');
            await preloadModels((loaded, total) => {
                // 0–90% untuk loading model GLB
                this._progress = (loaded / total) * 90;
                this._updateBar();
            });
        } catch (err) {
            console.warn('[LoadingScreen] Gagal preload model, lanjut tanpa model 3D:', err);
            this._progress = 90;
            this._updateBar();
        }

        // 90–100% untuk inisialisasi scene
        const finish = () => {
            this._progress = Math.min(100, this._progress + 5);
            this._updateBar();
            if (this._progress < 100) {
                setTimeout(finish, 60);
            } else {
                clearInterval(this._tipInterval);
                setTimeout(() => {
                    this.hide();
                    onComplete?.();
                }, 600);
            }
        };
        finish();
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
