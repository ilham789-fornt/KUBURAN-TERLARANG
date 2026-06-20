/**
 * player.js — First Person Controller
 * WASD movement, mouse look, sprint, collision.
 */

import * as THREE from 'three';
import { clamp } from './utils.js';
import { loadOptions } from './save.js';
import { audioManager } from './audio.js';
import { Flashlight } from './flashlight.js';

export class Player {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.options = loadOptions();

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 500
        );
        this.camera.position.set(0, 1.7, 0);

        // Player body (untuk collision)
        this.body = new THREE.Object3D();
        this.body.add(this.camera);
        scene.add(this.body);

        // Flashlight
        this.flashlight = new Flashlight(this.camera);
        this.flashlight.addToScene(scene);

        // State
        this.moveSpeed = 5;
        this.sprintSpeed = 10;
        this.isSprinting = false;
        this.isMoving = false;
        this.frozen = false; // True saat challenge aktif

        // Input state
        this.keys = {};
        this.pitch = 0; // Rotasi vertikal (kamera)
        this.yaw = 0; // Rotasi horizontal (body)

        // Footstep timer
        this._footTimer = 0;
        this._footInterval = 0.5;

        this._bindInput();
        this._bindPointerLock();
    }

    _bindInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyF') this.flashlight.toggle();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    _bindPointerLock() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                canvas.requestPointerLock();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement !== canvas) return;
            const sens = this.options.mouseSensitivity * 0.001;
            const invertY = this.options.invertMouse ? 1 : -1;

            this.yaw -= e.movementX * sens;
            this.pitch += e.movementY * sens * invertY;
            this.pitch = clamp(this.pitch, -Math.PI / 3, Math.PI / 3);

            this.body.rotation.y = this.yaw;
            this.camera.rotation.x = this.pitch;
        });
    }

    /**
     * Update player setiap frame.
     * @param {number} delta
     * @param {Array} obstacles — array {x, z, r} cylinder obstacles
     */
    update(delta, obstacles = []) {
        if (this.frozen) return;

        this.flashlight.update(delta);
        this.isSprinting = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];
        const speed = this.isSprinting ? this.sprintSpeed : this.moveSpeed;

        // Direction
        const dir = new THREE.Vector3();
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dir.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dir.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dir.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dir.x += 1;
        dir.normalize();

        this.isMoving = dir.length() > 0;

        if (this.isMoving) {
            // Rotasi arah sesuai orientasi player
            dir.applyEuler(new THREE.Euler(0, this.yaw, 0));
            const move = dir.clone().multiplyScalar(speed * delta);

            // ── Collision detection: cylinder vs cylinder ──────────────
            // Pisahkan sumbu X dan Z agar player bisa sliding di sepanjang dinding
            const PLAYER_RADIUS = 0.4;
            const px = this.body.position.x;
            const pz = this.body.position.z;

            let newX = px + move.x;
            let newZ = pz + move.z;
            let blockedX = false;
            let blockedZ = false;

            for (const obs of obstacles) {
                const minDist = PLAYER_RADIUS + obs.r;

                // Cek pergerakan pada sumbu X (Z tetap dari posisi sekarang)
                const dxTest = newX - obs.x;
                const dzCur  = pz   - obs.z;
                if (dxTest * dxTest + dzCur * dzCur < minDist * minDist) {
                    blockedX = true;
                }

                // Cek pergerakan pada sumbu Z (X tetap dari posisi sekarang)
                const dxCur  = px   - obs.x;
                const dzTest = newZ - obs.z;
                if (dxCur * dxCur + dzTest * dzTest < minDist * minDist) {
                    blockedZ = true;
                }
            }

            if (!blockedX) this.body.position.x = newX;
            if (!blockedZ) this.body.position.z = newZ;
            this.body.position.y = 0; // tetap di lantai
            // ── End collision ──────────────────────────────────────────

            // Footstep sound
            this._footTimer -= delta;
            if (this._footTimer <= 0) {
                audioManager.play('footstep');
                this._footTimer = this.isSprinting ? 0.3 : 0.5;
            }
        } else {
            this._footTimer = 0;
        }
    }

    /** Freeze player (saat challenge). */
    freeze() {
        this.frozen = true;
        document.exitPointerLock();
    }

    /** Unfreeze player. */
    unfreeze() {
        this.frozen = false;
    }

    getPosition() {
        return this.body.position.clone();
    }

    /** Update options (sensitivity dll). */
    updateOptions(options) {
        this.options = options;
    }
}