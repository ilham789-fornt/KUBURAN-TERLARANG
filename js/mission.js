/**
 * mission.js — Sistem Misi Bertahap
 * Fase 1: Nyalakan lilin → Fase 2: Kumpulkan jimat → Fase 3: Ritual altar
 */

import * as THREE from 'three';
import { audioManager } from './audio.js';

// ============================================================
// FASE 1 — Lilin Ritual
// ============================================================
export class CandleSystem {
    constructor(scene, count = 3) {
        this.scene = scene;
        this.candles = [];
        this.lit = 0;
        this.total = count;
        this._spawn(count);
    }

    _spawn(count) {
        const positions = [
            new THREE.Vector3(-15, 0, -20),
            new THREE.Vector3(20, 0, 10),
            new THREE.Vector3(-5, 0, 25),
            new THREE.Vector3(18, 0, -18),
            new THREE.Vector3(-22, 0, 5),
        ].slice(0, count);

        positions.forEach((pos, i) => {
            const candle = this._makeCandle(pos);
            this.candles.push({ mesh: candle, isLit: false, position: pos });
            this.scene.add(candle);
        });
    }

    _makeCandle(pos) {
        const group = new THREE.Group();

        // Batang lilin
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8),
            new THREE.MeshLambertMaterial({ color: 0xfff5cc })
        );
        body.position.y = 0.3;
        group.add(body);

        // Api (belum menyala — warna gelap)
        const flame = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        flame.position.y = 0.68;
        flame.name = 'flame';
        group.add(flame);

        // Marker glow (indikator bisa diinteraksi)
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 8, 8),
            new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 0.15,
                side: THREE.BackSide,
            })
        );
        glow.name = 'glow';
        group.add(glow);

        group.position.copy(pos);
        group.position.y = 0;
        return group;
    }

    /**
     * Cek apakah pemain dekat lilin yang belum dinyalakan.
     * @param {THREE.Vector3} playerPos
     * @returns {object|null} candle yang bisa dinyalakan
     */
    getNearbyUnlit(playerPos) {
        return this.candles.find(c =>
            !c.isLit &&
            c.position.distanceTo(playerPos) < 2.5
        ) || null;
    }

    /**
     * Nyalakan lilin.
     * @param {object} candle
     */
    lightCandle(candle) {
        candle.isLit = true;
        this.lit++;

        // Update visual — api menyala
        const flame = candle.mesh.getObjectByName('flame');
        if (flame) {
            flame.material.color.set(0xff8800);
        }

        // Tambah point light (cahaya api)
        const light = new THREE.PointLight(0xff6600, 1.5, 5);
        light.position.set(0, 0.7, 0);
        candle.mesh.add(light);

        // Hapus glow marker
        const glow = candle.mesh.getObjectByName('glow');
        if (glow) candle.mesh.remove(glow);

        audioManager.play('flashlight'); // Pakai suara klik sebagai placeholder
    }

    isComplete() {
        return this.lit >= this.total;
    }

    /** Animasi api berkedip setiap frame. */
    update(delta) {
        const t = Date.now() * 0.003;
        this.candles.forEach((c, i) => {
            if (!c.isLit) return;
            const flame = c.mesh.getObjectByName('flame');
            if (flame) {
                flame.scale.setScalar(0.9 + Math.sin(t * 3 + i) * 0.15);
                flame.position.y = 0.68 + Math.sin(t * 5 + i) * 0.03;
            }
        });
    }
}

// ============================================================
// FASE 2 — Fragmen Jimat
// ============================================================
export class FragmentSystem {
    constructor(scene, count = 3) {
        this.scene = scene;
        this.fragments = [];
        this.collected = 0;
        this.total = count;
        this._spawn(count);
    }

    _spawn(count) {
        const positions = [
            new THREE.Vector3(10, 0, -15),
            new THREE.Vector3(-18, 0, -8),
            new THREE.Vector3(5, 0, 20),
            new THREE.Vector3(-10, 0, 15),
            new THREE.Vector3(22, 0, -5),
        ].slice(0, count);

        positions.forEach(pos => {
            const mesh = this._makeFragment(pos);
            this.fragments.push({ mesh, collected: false, position: pos.clone() });
            this.scene.add(mesh);
        });
    }

    _makeFragment(pos) {
        const group = new THREE.Group();

        // Berlian berkilau
        const gem = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.25),
            new THREE.MeshBasicMaterial({
                color: 0x00ffcc,
                transparent: true,
                opacity: 0.85,
                wireframe: false,
            })
        );
        gem.name = 'gem';
        group.add(gem);

        // Glow
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 8, 8),
            new THREE.MeshBasicMaterial({
                color: 0x00ffcc,
                transparent: true,
                opacity: 0.12,
                side: THREE.BackSide,
            })
        );
        group.add(glow);

        // Cahaya
        const light = new THREE.PointLight(0x00ffcc, 1, 6);
        group.add(light);

        group.position.copy(pos);
        group.position.y = 0.8;
        return group;
    }

    /**
     * Cek apakah pemain dekat fragmen.
     * @param {THREE.Vector3} playerPos
     */
    getNearbyUncollected(playerPos) {
        return this.fragments.find(f =>
            !f.collected &&
            f.position.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z)) < 2.0
        ) || null;
    }

    collect(fragment) {
        fragment.collected = true;
        this.collected++;
        this.scene.remove(fragment.mesh);
        audioManager.play('ui_click');
    }

    isComplete() {
        return this.collected >= this.total;
    }

    update(delta) {
        const t = Date.now() * 0.001;
        this.fragments.forEach((f, i) => {
            if (f.collected) return;
            // Mengambang & berputar
            f.mesh.position.y = 0.8 + Math.sin(t * 2 + i) * 0.2;
            f.mesh.rotation.y += delta * 1.5;
        });
    }
}

// ============================================================
// FASE 3 — Altar Ritual
// ============================================================
export class AltarSystem {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.position = new THREE.Vector3(0, 0, 0); // Tengah kuburan
        this._mesh = this._makeAltar();
        scene.add(this._mesh);
    }

    _makeAltar() {
        const group = new THREE.Group();

        // Batu altar
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.3, 1.5),
            new THREE.MeshLambertMaterial({ color: 0x222230 })
        );
        base.position.y = 0.15;
        group.add(base);

        // Permukaan altar
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.1, 1.3),
            new THREE.MeshLambertMaterial({ color: 0x333345 })
        );
        top.position.y = 0.35;
        group.add(top);

        // Simbol altar (glow circle di tanah)
        const circle = new THREE.Mesh(
            new THREE.CircleGeometry(2.5, 32),
            new THREE.MeshBasicMaterial({
                color: 0x8800ff,
                transparent: true,
                opacity: 0.08,
                side: THREE.DoubleSide,
            })
        );
        circle.rotation.x = -Math.PI / 2;
        circle.position.y = 0.01;
        circle.name = 'circle';
        group.add(circle);

        // Cahaya ungu (tidak aktif dulu)
        const light = new THREE.PointLight(0x6600ff, 0, 8);
        light.name = 'light';
        group.add(light);

        group.position.copy(this.position);
        return group;
    }

    /**
     * Aktifkan altar (setelah fase 1 & 2 selesai).
     */
    activate() {
        this.isActive = true;
        const light = this._mesh.getObjectByName('light');
        if (light) light.intensity = 2;
        const circle = this._mesh.getObjectByName('circle');
        if (circle) circle.material.opacity = 0.25;
        audioManager.play('whisper');
    }

    isPlayerNear(playerPos) {
        return this.isActive &&
            this.position.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z)) < 3.0;
    }

    update(delta) {
        if (!this.isActive) return;
        const t = Date.now() * 0.001;
        const light = this._mesh.getObjectByName('light');
        if (light) light.intensity = 1.5 + Math.sin(t * 3) * 0.8;
        this._mesh.rotation.y += delta * 0.3;
    }
}