/**
 * flashlight.js — Sistem senter dengan baterai.
 */

import * as THREE from 'three';
import { clamp } from './utils.js';
import { audioManager } from './audio.js';

export class Flashlight {
    constructor(camera) {
        this.camera = camera;
        this.isOn = true;
        this.battery = 100; // 0-100
        this.drainRate = 3; // % per detik saat menyala
        this.rechargeRate = 5; // % per detik saat mati

        // Three.js SpotLight
        this.light = new THREE.SpotLight(0xfff5e0, 3, 25, Math.PI / 8, 0.4, 1.5);
        this.light.castShadow = true;
        this.light.shadow.mapSize.set(512, 512);

        // Target cahaya mengikuti kamera
        this.target = new THREE.Object3D();

        // Elemen HUD
        this.batteryFill = document.getElementById('battery-fill');
        this.batteryPct = document.getElementById('battery-pct');
    }

    /** Tambahkan flashlight ke scene dan camera. */
    addToScene(scene) {
        this.camera.add(this.light);
        this.camera.add(this.target);
        this.target.position.set(0, 0, -1);
        this.light.target = this.target;
        // JANGAN scene.add(this.camera) di sini!
        // Camera sudah menjadi child dari this.body di Player constructor.
        // Memanggil scene.add(this.camera) akan melepas camera dari body,
        // sehingga WASD dan yaw (rotasi kiri/kanan) tidak berfungsi.
    }

    /** Toggle senter ON/OFF. */
    toggle() {
        if (this.battery <= 0 && !this.isOn) return; // Tidak bisa nyalakan jika baterai habis
        this.isOn = !this.isOn;
        this.light.visible = this.isOn;
        audioManager.play('flashlight');
    }

    /**
     * Update setiap frame.
     * @param {number} delta — detik sejak frame terakhir
     */
    update(delta) {
        if (this.isOn) {
            this.battery -= this.drainRate * delta;
            if (this.battery <= 0) {
                this.battery = 0;
                this.isOn = false;
                this.light.visible = false;
            }
        } else {
            this.battery = Math.min(100, this.battery + this.rechargeRate * delta);
            // Auto nyala kembali jika baterai sudah 20%
            // (opsional — bisa dihapus)
        }
        this.battery = clamp(this.battery, 0, 100);
        this._updateHUD();
    }

    _updateHUD() {
        const pct = Math.round(this.battery);
        this.batteryFill.style.width = pct + '%';
        this.batteryPct.textContent = pct + '%';
        if (pct <= 20) {
            this.batteryFill.classList.add('low');
        } else {
            this.batteryFill.classList.remove('low');
        }
    }
}