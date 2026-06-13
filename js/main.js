/**
 * main.js — Bootstrap aplikasi KUBURAN TERLARANG.
 * Menginisialisasi semua sistem dan menangani navigasi antar screen.
 */

import { Game } from './game.js';
import { MainMenu } from './menu.js';
import { OptionsManager } from './option.js';
import { LoadingScreen } from './loading.js';
import { audioManager } from './audio.js';
import { saveOptions, loadOptions } from './save.js';

// ========================
// STATE APLIKASI
// ========================
let currentGame = null;
let mainMenu = null;
let optionsManager = null;
let loadingScreen = null;
let fromPause = false;

// ========================
// INIT
// ========================
async function init() {
    // Load audio assets
    await audioManager.loadAll();

    // Inisialisasi systems
    mainMenu = new MainMenu();
    optionsManager = new OptionsManager();
    loadingScreen = new LoadingScreen();
    currentGame = new Game();

    // Binding navigasi
    _bindMenuButtons();
    _bindPauseButtons();
    _bindGameOverButtons();
    _bindVictoryButtons();
    // _bindTutorial();

    // Sembunyikan loading awal, tampilkan main menu
    document.getElementById('loading-screen').style.display = 'none';
    mainMenu.show();
}

// ========================
// MENU BINDING
// ========================
function _bindMenuButtons() {
    const addBtnEffects = (btn) => {
        btn.addEventListener('mouseenter', () => audioManager.play('ui_hover'));
        btn.addEventListener('click', () => audioManager.play('ui_click'));
    };

    const buttons = document.querySelectorAll('.menu-btn');
    buttons.forEach(addBtnEffects);

    // PLAY
    document.getElementById('btn-play').addEventListener('click', () => {
        mainMenu.hide();
        audioManager.stopAmbience();
        loadingScreen.show(() => {
            currentGame.start();
        });
    });

    // OPTIONS (dari main menu)
    document.getElementById('btn-options').addEventListener('click', () => {
        _showPanel('options-panel');
    });
    document.getElementById('btn-options-back').addEventListener('click', () => {
        _hidePanel('options-panel');
        if (!fromPause) mainMenu.show();
        else _showPause();
        fromPause = false;
    });

    // TUTORIAL
    document.getElementById('btn-tutorial').addEventListener('click', () => {
        _showPanel('tutorial-panel');
        _runTutorialTypeEffect();
    });
    document.getElementById('btn-tutorial-back').addEventListener('click', () => {
        _hidePanel('tutorial-panel');
        mainMenu.show();
    });

    // RULES
    document.getElementById('btn-rules').addEventListener('click', () => {
        _showPanel('rules-panel');
    });
    document.getElementById('btn-rules-back').addEventListener('click', () => {
        _hidePanel('rules-panel');
        mainMenu.show();
    });

    // EXIT
    document.getElementById('btn-exit').addEventListener('click', () => {
        if (confirm('Yakin ingin keluar dari game?')) {
            window.close();
            // Fallback jika window.close() diblokir browser
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#8b0000;font-family:Creepster,cursive;font-size:3rem;background:#000;">TERIMA KASIH TELAH BERMAIN</div>';
        }
    });
}

function _bindPauseButtons() {
    document.getElementById('btn-resume').addEventListener('click', () => {
        currentGame._resume();
    });

    document.getElementById('btn-pause-options').addEventListener('click', () => {
        currentGame.ui.hidePause();
        fromPause = true;
        _showPanel('options-panel');
    });

    document.getElementById('btn-pause-main').addEventListener('click', () => {
        currentGame.stop();
        currentGame.ui.hidePause();
        currentGame.ui.hideHUD();
        mainMenu.show();
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
        if (confirm('Yakin ingin keluar?')) {
            window.close();
        }
    });
}

function _bindGameOverButtons() {
    document.getElementById('btn-restart').addEventListener('click', () => {
        currentGame.ui.hideGameOver();
        loadingScreen.show(() => {
            currentGame = new Game();
            currentGame.start();
        });
    });

    document.getElementById('btn-go-main').addEventListener('click', () => {
        currentGame.ui.hideGameOver();
        mainMenu.show();
    });
}

function _bindVictoryButtons() {
    document.getElementById('btn-victory-main').addEventListener('click', () => {
        currentGame.ui.hideVictory();
        mainMenu.show();
    });

    document.getElementById('btn-play-again').addEventListener('click', () => {
        currentGame.ui.hideVictory();
        loadingScreen.show(() => {
            currentGame = new Game();
            currentGame.start();
        });
    });
}

function _showPanel(id) {
    mainMenu.hide();
    const el = document.getElementById(id);
    el.style.display = 'flex';
    el.classList.add('active');
}

function _hidePanel(id) {
    const el = document.getElementById(id);
    el.style.display = 'none';
    el.classList.remove('active');
}

function _showPause() {
    currentGame.ui.showPause();
}

// ========================
// TUTORIAL TYPEWRITER
// ========================
const TUTORIAL_HTML = `
<h3>Cara Bermain</h3>
<ul>
  <li>WASD — Bergerak</li>
  <li>Mouse — Lihat sekitar</li>
  <li>SHIFT — Sprint</li>
  <li>F — Nyalakan/matikan senter</li>
  <li>ESC — Pause</li>
  <li>Hindari hantu yang mendekat!</li>
</ul>
<h3>Sistem Challenge</h3>
<ul>
  <li>Saat hantu mendekat, pergerakanmu akan dihentikan</li>
  <li>Mikrofon akan aktif secara otomatis</li>
  <li>Baca bacaan yang tampil dengan lantang dan jelas</li>
  <li>Akurasi minimal 80% diperlukan untuk mengusir hantu</li>
  <li>Jika gagal — kamu mati</li>
</ul>
`;

function _runTutorialTypeEffect() {
    const container = document.getElementById('tutorial-content');
    container.innerHTML = '';

    const temp = document.createElement('div');
    temp.innerHTML = TUTORIAL_HTML;
    const text = temp.innerText;

    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'cursor-blink';
    container.appendChild(cursor);

    const type = () => {
        if (i < text.length) {
            container.insertBefore(document.createTextNode(text[i]), cursor);
            i++;
            setTimeout(type, 18);
        }
    };
    type();
}

// ========================
// START
// ========================
document.addEventListener('DOMContentLoaded', init);