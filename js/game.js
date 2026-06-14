/**
 * game.js — Game engine utama.
 * Mengelola world 3D, game loop, dan state machine.
 * Versi lengkap: Sistem Misi Bertahap + Jumpscare Per Hantu
 */

import * as THREE from 'three';
import { Player } from './player.js';
import { GhostManager } from './ghost.js';
import { VoiceChallenge, CHALLENGE_TEXTS } from './voice.js';
import { UIManager } from './ui.js';
import { JumpscareSystem } from './jumpscare.js';
import { audioManager } from './audio.js';
import { randomInt } from './utils.js';
import { CandleSystem, FragmentSystem, AltarSystem } from './mission.js';
import { MissionUI } from './missionUI.js';

/** Durasi challenge normal dalam detik. */
const CHALLENGE_DURATION = 15;
/** Durasi challenge ritual altar dalam detik. */
const RITUAL_DURATION = 20;
/** Teks doa khusus untuk ritual Fase 3. */
const ALTAR_RITUAL_TEXT = "Bismillah, dengan nama Allah yang Maha Pengasih lagi Maha Penyayang, aku usir semua roh jahat dari tempat ini";

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

        // Mission systems (diinisialisasi di start())
        this.candleSystem = null;
        this.fragmentSystem = null;
        this.altarSystem = null;
        this.missionUI = null;
        this.missionPhase = 1;

        // Game state
        this.state = 'idle'; // idle | playing | challenge | ritual | paused | gameover | victory
        this.score = 0;
        this.ghostsKilled = 0;
        this.playTime = 0;
        this.accuracySum = 0;
        this._animId = null;
        this._challengeGhost = null;
        this._challengeTimer = 0;

        // Simpan listener agar bisa di-remove nanti
        this._keyListener = null;
        this._interactListener = null;

        // Resize
        window.addEventListener('resize', () => this._onResize());

        // Pause on ESC
        this._keyListener = (e) => {
            if (e.code === 'Escape' && this.state === 'playing') this._pause();
            else if (e.code === 'Escape' && this.state === 'paused') this._resume();
        };
        window.addEventListener('keydown', this._keyListener);
    }

    /** Mulai game baru. */
    start() {
        this.canvas.classList.remove('hidden');
        document.body.classList.remove('show-cursor');
        this.ui.showHUD();
        this._buildWorld();
        this.player = new Player(this.scene, this.renderer);
        this.ghostMgr = new GhostManager(this.scene);

        // Reset statistik
        this.score = 0;
        this.ghostsKilled = 0;
        this.playTime = 0;
        this.accuracySum = 0;
        this.missionPhase = 1;
        this.ui.updateScore(0);
        this.ui.updateGhostCount(0);

        // Inisialisasi sistem misi
        this.candleSystem = new CandleSystem(this.scene, 3);
        this.fragmentSystem = new FragmentSystem(this.scene, 3);
        this.altarSystem = new AltarSystem(this.scene);
        this.missionUI = new MissionUI();
        this.missionUI.update(1, 0, 3, '[ E ] Dekat lilin untuk menyalakan');

        // Set spawn rate awal (lambat di fase 1)
        this.ghostMgr.setPhase(1);

        // Binding tombol E untuk interaksi objek misi
        this._interactListener = (e) => {
            if (e.code === 'KeyE') this._handleInteract();
        };
        window.addEventListener('keydown', this._interactListener);

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
        document.body.classList.add('show-cursor');
        document.exitPointerLock();
        this.ui.hideHUD();
        this.missionUI?.hide();
        this.voice.stop();
        audioManager.stopAll();

        // Hapus listener interaksi agar tidak duplikat saat restart
        if (this._interactListener) {
            window.removeEventListener('keydown', this._interactListener);
            this._interactListener = null;
        }

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

            // Update sistem misi
            this.candleSystem?.update(delta);
            this.fragmentSystem?.update(delta);
            this.altarSystem?.update(delta);
        }

        // Timer untuk challenge biasa maupun ritual
        if (this.state === 'challenge' || this.state === 'ritual') {
            this._challengeTimer -= delta;
            this.ui.updateChallengeTimer(this._challengeTimer);
            if (this._challengeTimer <= 0) {
                if (this.state === 'ritual') {
                    this._onRitualFail();
                } else {
                    this._onChallengeFail('timeout');
                }
            }
        }

        this.renderer.render(this.scene, this.player?.camera || new THREE.PerspectiveCamera());
    }

    // ============================================================
    // SISTEM MISI — Interaksi Objek
    // ============================================================

    /** Dipanggil saat pemain menekan [E]. */
    _handleInteract() {
        if (this.state !== 'playing') return;
        const playerPos = this.player.getPosition();

        // FASE 1: Nyalakan lilin
        if (this.missionPhase === 1) {
            const candle = this.candleSystem.getNearbyUnlit(playerPos);
            if (candle) {
                this.candleSystem.lightCandle(candle);
                this.missionUI.update(1, this.candleSystem.lit, 3, '[ E ] Dekat lilin untuk menyalakan');
                this.score += 50;
                this.ui.updateScore(this.score);

                if (this.candleSystem.isComplete()) {
                    this.missionUI.showPhaseComplete('✅ SEMUA LILIN MENYALA!');
                    setTimeout(() => {
                        this.missionPhase = 2;
                        this.ghostMgr.setPhase(2); // Spawn lebih sering
                        this.missionUI.update(2, 0, 3, '[ E ] Dekat jimat untuk mengambil');
                    }, 2000);
                }
            }
        }

        // FASE 2: Ambil fragmen jimat
        else if (this.missionPhase === 2) {
            const frag = this.fragmentSystem.getNearbyUncollected(playerPos);
            if (frag) {
                this.fragmentSystem.collect(frag);
                this.missionUI.update(2, this.fragmentSystem.collected, 3, '[ E ] Dekat jimat untuk mengambil');
                this.score += 75;
                this.ui.updateScore(this.score);

                if (this.fragmentSystem.isComplete()) {
                    this.missionUI.showPhaseComplete('✅ SEMUA JIMAT TERKUMPUL!');
                    setTimeout(() => {
                        this.missionPhase = 3;
                        this.altarSystem.activate();
                        this.ghostMgr.setPhase(3); // Spawn sangat sering
                        this.missionUI.update(3, 0, 1, '[ E ] Pergi ke altar di tengah kuburan');
                    }, 2000);
                }
            }
        }

        // FASE 3: Ritual altar
        else if (this.missionPhase === 3) {
            if (this.altarSystem.isPlayerNear(playerPos)) {
                this._startRitualChallenge();
            }
        }
    }

    /** Mulai ritual challenge di Fase 3. */
    _startRitualChallenge() {
        if (this.state !== 'playing') return;
        this.state = 'ritual';
        this._challengeTimer = RITUAL_DURATION;
        this.player.freeze();

        this.ui.showChallenge(ALTAR_RITUAL_TEXT);
        this.voice.start(ALTAR_RITUAL_TEXT,
            (similarity) => {
                this.ui.updateSimilarity(similarity);
                if (similarity >= 70) { // Threshold sedikit lebih rendah untuk doa panjang
                    this._onRitualSuccess();
                }
            }
        );
    }

    /** Ritual berhasil → menang! */
    _onRitualSuccess() {
        if (this.state !== 'ritual') return;
        this.state = 'playing';

        this.voice.stop();
        this.ui.hideChallenge();
        this.player.unfreeze();
        this.missionUI.showPhaseComplete('🌟 RITUAL SELESAI — ANDA MENANG!');
        this.score += 500;
        this.ui.updateScore(this.score);

        setTimeout(() => this._onVictory(), 2000);
    }

    /** Ritual gagal → game over. */
    _onRitualFail() {
        if (this.state !== 'ritual') return;
        this.state = 'gameover';

        this.voice.stop();
        this.ui.hideChallenge();
        this.ui.flashRed();
        this.ui.showResult(false);

        setTimeout(() => {
            this.jumpscare.trigger(() => {
                this._showGameOver();
            }, 'default');
        }, 800);
    }

    // ============================================================
    // CHALLENGE BIASA (Hantu Mendekat)
    // ============================================================

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

        // Ambil tipe hantu untuk jumpscare yang sesuai
        const ghostType = this._challengeGhost?.type || 'default';

        setTimeout(() => {
            this.jumpscare.trigger(() => {
                this._showGameOver();
            }, ghostType);
        }, 800);
    }

    // ============================================================
    // PAUSE / RESUME
    // ============================================================

    _pause() {
        this.state = 'paused';
        this.clock.stop();
        document.exitPointerLock();
        document.body.classList.add('show-cursor');
        this.ui.showPause();
    }

    _resume() {
        this.state = 'playing';
        this.clock.start();
        document.body.classList.remove('show-cursor');
        this.ui.hidePause();
        this.renderer.domElement.requestPointerLock();
    }

    // ============================================================
    // MENANG / KALAH
    // ============================================================

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

    // ============================================================
    // BANGUN DUNIA 3D
    // ============================================================

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
            if (Math.sqrt(x * x + z * z) < 5) continue;
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

        const stone = new THREE.Mesh(
            new THREE.BoxGeometry(0.4 + Math.random() * 0.3, h, 0.1),
            new THREE.MeshLambertMaterial({ color: new THREE.Color(0.15, 0.15, 0.2).offsetHSL(0, 0, Math.random() * 0.05) })
        );
        stone.position.y = h / 2;
        stone.castShadow = true;
        stone.receiveShadow = true;
        group.add(stone);

        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2 + Math.random() * 0.15, 0.2 + Math.random() * 0.15, 0.1, 8),
            stone.material
        );
        top.position.y = h;
        group.add(top);

        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;
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
                [i, 0, -SIZE], [i, 0, SIZE],
                [-SIZE, 0, i], [SIZE, 0, i]
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
        const w = window.innerWidth, h = window.innerHeight;
        this.renderer.setSize(w, h);
        if (this.player?.camera) {
            this.player.camera.aspect = w / h;
            this.player.camera.updateProjectionMatrix();
        }
    }
}
