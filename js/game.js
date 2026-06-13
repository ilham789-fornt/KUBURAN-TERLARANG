/**
 * game.js — Game engine utama.
 * Mengelola world 3D, game loop, dan state machine.
 */

import * as THREE from 'three';
import { Player } from './player.js';
import { GhostManager } from './ghost.js';
import { VoiceChallenge, CHALLENGE_TEXTS } from './voice.js';
import { UIManager } from './ui.js';
import { JumpscareSystem } from './jumpscare.js';
import { audioManager } from './audio.js';
import { randomInt } from './utils.js';

/** Total hantu yang harus diusir untuk menang. */
const GHOSTS_TO_WIN = 10;
/** Durasi challenge dalam detik. */
const CHALLENGE_DURATION = 15;

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();

        // Subsystems
        this.player = null;
        this.ghostMgr = null;
        this.voice = new VoiceChallenge();
        this.ui = new UIManager();
        this.jumpscare = new JumpscareSystem();

        // Game state
        this.state = 'idle'; // idle | playing | challenge | paused | gameover | victory
        this.score = 0;
        this.ghostsKilled = 0;
        this.playTime = 0;
        this.accuracySum = 0;
        this._animId = null;
        this._challengeGhost = null;
        this._challengeTimer = 0;
        this._challengeTimeout = null;

        // Resize
        window.addEventListener('resize', () => this._onResize());

        // Pause on ESC
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.state === 'playing') this._pause();
            else if (e.code === 'Escape' && this.state === 'paused') this._resume();
        });
    }

    /** Mulai game baru. */
    start() {
        this.canvas.classList.remove('hidden');
        this.ui.showHUD();
        this._buildWorld();
        this.player = new Player(this.scene, this.renderer);
        this.ghostMgr = new GhostManager(this.scene);

        this.score = 0;
        this.ghostsKilled = 0;
        this.playTime = 0;
        this.accuracySum = 0;
        this.ui.updateScore(0);
        this.ui.updateGhostCount(0);

        this.state = 'playing';
        this.clock.start();
        this._loop();
        audioManager.startAmbience();

        // Spawn hantu pertama setelah 5 detik
        setTimeout(() => {
            if (this.state === 'playing') {
                this.ghostMgr._spawn(this.player.getPosition());
            }
        }, 5000);
    }

    /** Hentikan game dan bersihkan resources. */
    stop() {
        this.state = 'idle';
        if (this._animId) cancelAnimationFrame(this._animId);
        this.canvas.classList.add('hidden');
        this.ui.hideHUD();
        this.voice.stop();
        audioManager.stopAll();
        // Bersihkan scene
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
    }

    /** Game loop utama. */
    _loop() {
        if (this.state === 'idle') return;
        this._animId = requestAnimationFrame(() => this._loop());
        const delta = Math.min(this.clock.getDelta(), 0.05); // Cap delta

        if (this.state === 'playing') {
            this.playTime += delta;
            this.player.update(delta);
            this.ghostMgr.update(delta, this.player.getPosition(), (ghost) => {
                this._startChallenge(ghost);
            });
        }

        if (this.state === 'challenge') {
            this._challengeTimer -= delta;
            this.ui.updateChallengeTimer(this._challengeTimer);
            if (this._challengeTimer <= 0) {
                this._onChallengeFail('timeout');
            }
        }

        this.renderer.render(this.scene, this.player?.camera || new THREE.PerspectiveCamera());
    }

    /** Mulai challenge saat hantu mendekat. */
    _startChallenge(ghost) {
        if (this.state !== 'playing') return;
        this.state = 'challenge';
        this._challengeGhost = ghost;
        this._challengeTimer = CHALLENGE_DURATION;
        this.player.freeze();

        // Pilih teks challenge acak
        const text = CHALLENGE_TEXTS[randomInt(0, CHALLENGE_TEXTS.length - 1)];
        this.ui.showChallenge(text);

        // Mulai voice recognition
        this.voice.start(text,
            (similarity, transcript) => {
                this.ui.updateSimilarity(similarity);
                if (similarity >= 80) {
                    this._onChallengeSuccess(similarity);
                }
            }
        );
    }

    /** Challenge berhasil. */
    _onChallengeSuccess(similarity) {
        if (this.state !== 'challenge') return;
        this.state = 'playing';

        this.voice.stop();
        this.ui.hideChallenge();
        this.ui.showResult(true);
        this.player.unfreeze();

        // Banish hantu
        this._challengeGhost?.banish();
        this.ghostMgr.challengeEnded();

        // Update statistik
        this.ghostsKilled++;
        this.score += 100 + Math.round(similarity);
        this.accuracySum += similarity;
        this.ui.updateScore(this.score);
        this.ui.updateGhostCount(this.ghostsKilled);

        // Re-lock pointer
        setTimeout(() => {
            this.renderer.domElement.requestPointerLock();
        }, 500);

        // Cek menang
        if (this.ghostsKilled >= GHOSTS_TO_WIN) {
            setTimeout(() => this._onVictory(), 1500);
        }
    }

    /** Challenge gagal. */
    _onChallengeFail(reason) {
        if (this.state !== 'challenge') return;
        this.state = 'gameover';

        this.voice.stop();
        this.ui.hideChallenge();
        this.ui.flashRed();
        this.ui.showResult(false);

        // Hantu menyerang
        this._challengeGhost?.attack();

        setTimeout(() => {
            this.jumpscare.trigger(() => {
                this._showGameOver();
            });
        }, 800);
    }

    _pause() {
        this.state = 'paused';
        this.clock.stop();
        document.exitPointerLock();
        this.ui.showPause();
    }

    _resume() {
        this.state = 'playing';
        this.clock.start();
        this.ui.hidePause();
        this.renderer.domElement.requestPointerLock();
    }

    _onVictory() {
        this.state = 'victory';
        this.stop();
        audioManager.play('victory');
        this.ui.showVictory({
            ghosts: this.ghostsKilled,
            accuracy: this.ghostsKilled > 0 ? this.accuracySum / this.ghostsKilled : 0,
            time: this.playTime,
        });
    }

    _showGameOver() {
        this.stop();
        this.ui.showGameOver();
    }

    /** Bangun world kuburan 3D. */
    _buildWorld() {
        const scene = this.scene;
        scene.background = new THREE.Color(0x010208);
        scene.fog = new THREE.FogExp2(0x050a14, 0.025);

        // Lighting
        scene.add(new THREE.AmbientLight(0x050810, 2));
        const moon = new THREE.DirectionalLight(0x3355aa, 1.2);
        moon.position.set(50, 80, -50);
        moon.castShadow = true;
        moon.shadow.mapSize.set(2048, 2048);
        moon.shadow.camera.near = 0.5;
        moon.shadow.camera.far = 300;
        moon.shadow.camera.left = -100;
        moon.shadow.camera.right = 100;
        moon.shadow.camera.top = 100;
        moon.shadow.camera.bottom = -100;
        scene.add(moon);

        // Ground
        const groundGeo = new THREE.PlaneGeometry(200, 200, 32, 32);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x0c1008 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Batu nisan
        for (let i = 0; i < 60; i++) {
            const x = (Math.random() - 0.5) * 120;
            const z = (Math.random() - 0.5) * 120;
            if (Math.sqrt(x * x + z * z) < 5) continue; // Jangan spawn di dekat player
            scene.add(this._makeGravestone(x, 0, z));
        }

        // Pohon mati
        for (let i = 0; i < 25; i++) {
            const x = (Math.random() - 0.5) * 150;
            const z = (Math.random() - 0.5) * 150;
            scene.add(this._makeDeadTree(x, 0, z));
        }

        // Pagar kuburan
        this._makeFence(scene);
    }

    _makeGravestone(x, y, z) {
        const group = new THREE.Group();
        const h = 0.8 + Math.random() * 0.7;

        // Badan nisan
        const stone = new THREE.Mesh(
            new THREE.BoxGeometry(0.4 + Math.random() * 0.3, h, 0.1),
            new THREE.MeshLambertMaterial({ color: new THREE.Color(0.15, 0.15, 0.2).offsetHSL(0, 0, Math.random() * 0.05) })
        );
        stone.position.y = h / 2;
        stone.castShadow = true;
        stone.receiveShadow = true;
        group.add(stone);

        // Bagian atas bulat
        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2 + Math.random() * 0.15, 0.2 + Math.random() * 0.15, 0.1, 8),
            stone.material
        );
        top.position.y = h;
        group.add(top);

        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        // Sedikit miring
        group.rotation.z = (Math.random() - 0.5) * 0.2;
        return group;
    }

    _makeDeadTree(x, y, z) {
        const group = new THREE.Group();
        const h = 4 + Math.random() * 4;

        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.2, h, 5),
            new THREE.MeshLambertMaterial({ color: 0x0f0a04 })
        );
        trunk.position.y = h / 2;
        trunk.castShadow = true;
        group.add(trunk);

        // Cabang-cabang
        const numBranches = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numBranches; i++) {
            const bl = 1 + Math.random() * 2;
            const branch = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.08, bl, 4),
                trunk.material
            );
            const angle = (i / numBranches) * Math.PI * 2 + Math.random() * 0.5;
            const bh = (h * 0.5) + Math.random() * h * 0.4;
            branch.position.set(
                Math.cos(angle) * bl * 0.5,
                bh,
                Math.sin(angle) * bl * 0.5
            );
            branch.rotation.z = (Math.cos(angle)) * Math.PI * 0.35;
            branch.rotation.x = (Math.sin(angle)) * Math.PI * 0.35;
            branch.castShadow = true;
            group.add(branch);
        }

        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        return group;
    }

    _makeFence(scene) {
        const postMat = new THREE.MeshLambertMaterial({ color: 0x0a0805 });
        const SIZE = 70;
        const STEP = 2.5;
        for (let i = -SIZE; i <= SIZE; i += STEP) {
            [
                [i, 0, -SIZE],
                [i, 0, SIZE],
                [-SIZE, 0, i],
                [SIZE, 0, i]
            ].forEach(([x, y, z]) => {
                const post = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 1.5, 0.1),
                    postMat
                );
                post.position.set(x, 0.75, z);
                post.castShadow = true;
                scene.add(post);
            });
        }
    }

    _onResize() {
        const w = window.innerWidth,
            h = window.innerHeight;
        this.renderer.setSize(w, h);
        if (this.player?.camera) {
            this.player.camera.aspect = w / h;
            this.player.camera.updateProjectionMatrix();
        }
    }
}
