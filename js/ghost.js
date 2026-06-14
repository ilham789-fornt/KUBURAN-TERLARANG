/**
 * ghost.js — AI Ghost System
 * Spawn, animasi melayang, pathfinding sederhana, trigger challenge.
 */

import * as THREE from 'three';
import { randomFloat, randomInt } from './utils.js';
import { audioManager } from './audio.js';

/** Jarak minimum spawn dari player. */
const SPAWN_MIN_DIST = 20;
/** Jarak spawn maksimum. */
const SPAWN_MAX_DIST = 40;
/** Jarak trigger challenge (meter). */
const CHALLENGE_DIST = 5;
/** Kecepatan gerak hantu normal. */
const GHOST_SPEED = 2.5;
/** Kecepatan saat menyerang. */
const GHOST_ATTACK_SPEED = 10;

export class Ghost {
    constructor(scene, position) {
        this.scene = scene;
        this.isDead = false;
        this.isAttacking = false;
        this.type = 'HantuBiasa';

        // Buat mesh hantu procedural (glowing white figure)
        this.mesh = this._createMesh();
        this.mesh.position.copy(position);
        this.mesh.position.y = 1.5;
        scene.add(this.mesh);

        // Animasi melayang
        this._floatOffset = Math.random() * Math.PI * 2;
        this._floatSpeed = 0.8 + Math.random() * 0.5;
        this._floatAmp = 0.3;

        // Rotasi ke arah player
        this._angle = 0;

        // Suara
        this._soundTimer = randomFloat(2, 5);
    }

    _createMesh() {
        const group = new THREE.Group();

        // Body utama — silhouette putih transparan
        const bodyGeo = new THREE.ConeGeometry(0.5, 2.0, 8);
        bodyGeo.rotateX(Math.PI); // Kerucut terbalik (seperti pocong)
        const bodyMat = new THREE.MeshBasicMaterial({
            color: 0xeeeeff,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0;
        group.add(body);

        // Kepala
        const headGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const headMat = new THREE.MeshBasicMaterial({ color: 0xccccdd, transparent: true, opacity: 0.85 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.3;
        group.add(head);

        // Glow
        const glowGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide,
        });
        group.add(new THREE.Mesh(glowGeo, glowMat));

        // Point light hantu
        const light = new THREE.PointLight(0x3333ff, 1, 10);
        light.position.y = 1;
        group.add(light);
        this._light = light;

        return group;
    }

    /**
     * Update hantu setiap frame.
     * @param {number} delta
     * @param {THREE.Vector3} playerPos
     * @param {Function} onChallengeTriggered
     */
    update(delta, playerPos, onChallengeTriggered) {
        if (this.isDead) return;

        const t = Date.now() * 0.001;

        // Animasi melayang
        this.mesh.position.y = 1.5 + Math.sin(t * this._floatSpeed + this._floatOffset) * this._floatAmp;

        // Rotasi lambat
        this.mesh.rotation.y += 0.3 * delta;

        const distToPlayer = this.mesh.position.distanceTo(playerPos);

        if (this.isAttacking) {
            // Bergerak cepat ke wajah player
            const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
            this.mesh.position.addScaledVector(dir, GHOST_ATTACK_SPEED * delta);
            return;
        }

        if (distToPlayer < CHALLENGE_DIST) {
            // Hentikan gerak dan trigger challenge
            onChallengeTriggered?.(this);
            return;
        }

        // Gerak menuju player
        const dir = new THREE.Vector3()
            .subVectors(new THREE.Vector3(playerPos.x, 0, playerPos.z),
                new THREE.Vector3(this.mesh.position.x, 0, this.mesh.position.z))
            .normalize();
        this.mesh.position.addScaledVector(dir, GHOST_SPEED * delta);

        // Suara periodik
        this._soundTimer -= delta;
        if (this._soundTimer <= 0) {
            audioManager.play('ghost');
            this._soundTimer = randomFloat(3, 7);
        }

        // Glow flicker
        if (this._light) {
            this._light.intensity = 0.8 + Math.sin(t * 5) * 0.3;
        }
    }

    /** Efek hantu terusir — cahaya putih lalu menghilang. */
    async banish() {
        this.isDead = true;
        const mat = this.mesh.children[0]?.material;
        if (mat) {
            mat.color.set(0xffffff);
            mat.emissive?.set(0xffffff);
        }
        // Fade out
        let alpha = 1;
        const fade = () => {
            alpha -= 0.05;
            this.mesh.children.forEach(c => {
                if (c.material) c.material.opacity = Math.max(0, c.material.opacity - 0.05);
            });
            if (alpha > 0) requestAnimationFrame(fade);
            else this.scene.remove(this.mesh);
        };
        fade();
    }

    /** Mulai mode serangan. */
    attack() {
        this.isAttacking = true;
    }

    remove() {
        this.isDead = true;
        this.scene.remove(this.mesh);
    }
}

// ============================================================
// POCONG — melompat-lompat, terbungkus kain putih
// ============================================================
export class Pocong extends Ghost {
    constructor(scene, position) {
        super(scene, position);
        this.type = 'Pocong';
        this._hopTimer = 0;
        this._hopInterval = 0.8;
        this._hopHeight = 0;
        this.type = 'Pocong';
    }

    _createMesh() {
        const group = new THREE.Group();

        // Tubuh terbungkus kain (silinder)
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.8, 8);
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0xdddde8, transparent: true, opacity: 0.9 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0;
        group.add(body);

        // Kepala membulat di atas
        const headGeo = new THREE.SphereGeometry(0.35, 8, 8);
        const headMat = new THREE.MeshBasicMaterial({ color: 0xe8e8ee, transparent: true, opacity: 0.95 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.2;
        group.add(head);

        // Ikatan kain di atas kepala
        const topGeo = new THREE.ConeGeometry(0.15, 0.4, 6);
        const top = new THREE.Mesh(topGeo, bodyMat);
        top.position.y = 1.6;
        group.add(top);

        // Glow hijau seram
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.08, side: THREE.BackSide });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), glowMat));

        const light = new THREE.PointLight(0x88ffaa, 1.2, 8);
        light.position.y = 1;
        group.add(light);
        this._light = light;
        return group;
    }

    update(delta, playerPos, onChallengeTriggered) {
        if (this.isDead) return;
        const t = Date.now() * 0.001;

        // Animasi loncat
        this._hopTimer -= delta;
        if (this._hopTimer <= 0) {
            this._hopTimer = this._hopInterval;
            this._hopHeight = 1.2;
            audioManager.play('ghost');
        }
        this._hopHeight = Math.max(0, this._hopHeight - delta * 4);
        this.mesh.position.y = 0.5 + this._hopHeight;

        this.mesh.rotation.y += 0.5 * delta;

        const distToPlayer = this.mesh.position.distanceTo(playerPos);
        if (distToPlayer < CHALLENGE_DIST) { onChallengeTriggered?.(this); return; }

        // Bergerak loncat ke arah player
        if (this._hopHeight > 0.5) {
            const dir = new THREE.Vector3()
                .subVectors(new THREE.Vector3(playerPos.x, 0, playerPos.z),
                    new THREE.Vector3(this.mesh.position.x, 0, this.mesh.position.z))
                .normalize();
            this.mesh.position.addScaledVector(dir, (GHOST_SPEED * 1.2) * delta);
        }

        if (this._light) this._light.intensity = 1 + Math.sin(t * 6) * 0.4;
    }
}

// ============================================================
// KUNTILANAK — melayang cepat, rambut panjang, gaun putih
// ============================================================
export class Kuntilanak extends Ghost {
    constructor(scene, position) {
        super(scene, position);
        this.type = 'Kuntilanak';
        this._screamTimer = randomFloat(4, 8);
        this.type = 'Kuntilanak';
    }

    _createMesh() {
        const group = new THREE.Group();

        // Gaun panjang
        const dressGeo = new THREE.ConeGeometry(0.5, 2.2, 8);
        dressGeo.rotateX(Math.PI);
        const dressMat = new THREE.MeshBasicMaterial({ color: 0xfff0f5, transparent: true, opacity: 0.8 });
        group.add(new THREE.Mesh(dressGeo, dressMat));

        // Kepala
        const headGeo = new THREE.SphereGeometry(0.38, 8, 8);
        const headMat = new THREE.MeshBasicMaterial({ color: 0xffe0e8, transparent: true, opacity: 0.9 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.4;
        group.add(head);

        // Rambut panjang (beberapa silinder tipis)
        const hairMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.85 });
        for (let i = 0; i < 6; i++) {
            const strand = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.03, 1.5 + Math.random() * 0.5, 4),
                hairMat
            );
            const angle = (i / 6) * Math.PI * 2;
            strand.position.set(Math.cos(angle) * 0.25, 0.8, Math.sin(angle) * 0.25);
            strand.rotation.z = (Math.random() - 0.5) * 0.4;
            group.add(strand);
        }

        // Glow merah muda
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff88aa, transparent: true, opacity: 0.1, side: THREE.BackSide });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), glowMat));

        const light = new THREE.PointLight(0xff4477, 1.5, 12);
        light.position.y = 1;
        group.add(light);
        this._light = light;
        return group;
    }

    update(delta, playerPos, onChallengeTriggered) {
        if (this.isDead) return;
        const t = Date.now() * 0.001;

        // Melayang lebih tinggi dan bergoyang
        this.mesh.position.y = 1.8 + Math.sin(t * 2 + this._floatOffset) * 0.5;
        this.mesh.rotation.y += 1.5 * delta;

        const distToPlayer = this.mesh.position.distanceTo(playerPos);
        if (distToPlayer < CHALLENGE_DIST) { onChallengeTriggered?.(this); return; }

        // Bergerak lebih cepat dari hantu biasa
        const dir = new THREE.Vector3()
            .subVectors(new THREE.Vector3(playerPos.x, 0, playerPos.z),
                new THREE.Vector3(this.mesh.position.x, 0, this.mesh.position.z))
            .normalize();
        this.mesh.position.addScaledVector(dir, (GHOST_SPEED * 1.6) * delta);

        // Suara jeritan periodik
        this._screamTimer -= delta;
        if (this._screamTimer <= 0) {
            audioManager.play('jumpscare');
            this._screamTimer = randomFloat(5, 10);
        }

        if (this._light) this._light.intensity = 1.2 + Math.sin(t * 8) * 0.5;
    }
}

// ============================================================
// TUYUL — kecil, berlari sangat cepat dan liar
// ============================================================
export class Tuyul extends Ghost {
    constructor(scene, position) {
        super(scene, position);
        this.type = 'Tuyul';
        this._zigzagAngle = Math.random() * Math.PI * 2;
        this._zigzagTimer = randomFloat(0.5, 1.5);
        this.type = 'Tuyul';
    }

    _createMesh() {
        const group = new THREE.Group();

        // Tubuh kecil seperti anak kecil
        const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.5, 4, 8);
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0xaaccaa, transparent: true, opacity: 0.85 });
        group.add(new THREE.Mesh(bodyGeo, bodyMat));

        // Kepala besar (proporsional anak kecil)
        const headGeo = new THREE.SphereGeometry(0.28, 8, 8);
        const headMat = new THREE.MeshBasicMaterial({ color: 0x99bb99, transparent: true, opacity: 0.9 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.7;
        group.add(head);

        // Mata menyala
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        [-0.1, 0.1].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
            eye.position.set(x, 0.72, 0.22);
            group.add(eye);
        });

        // Glow hijau gelap
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x33ff33, transparent: true, opacity: 0.12, side: THREE.BackSide });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), glowMat));

        const light = new THREE.PointLight(0x44ff44, 0.8, 6);
        group.add(light);
        this._light = light;
        return group;
    }

    update(delta, playerPos, onChallengeTriggered) {
        if (this.isDead) return;
        const t = Date.now() * 0.001;

        // Animasi berlari (naik turun)
        this.mesh.position.y = 0.3 + Math.abs(Math.sin(t * 8)) * 0.2;
        this.mesh.rotation.y += 3 * delta;

        const distToPlayer = this.mesh.position.distanceTo(playerPos);
        if (distToPlayer < CHALLENGE_DIST) { onChallengeTriggered?.(this); return; }

        // Gerak zigzag acak ke arah player
        this._zigzagTimer -= delta;
        if (this._zigzagTimer <= 0) {
            this._zigzagAngle = Math.atan2(
                playerPos.z - this.mesh.position.z,
                playerPos.x - this.mesh.position.x
            ) + (Math.random() - 0.5) * 1.5;
            this._zigzagTimer = randomFloat(0.4, 1.2);
        }

        this.mesh.position.x += Math.cos(this._zigzagAngle) * GHOST_SPEED * 2.2 * delta;
        this.mesh.position.z += Math.sin(this._zigzagAngle) * GHOST_SPEED * 2.2 * delta;

        if (this._light) this._light.intensity = 0.6 + Math.random() * 0.4;
    }
}

// ============================================================
// KUYANG — kepala terbang dengan organ menggantung
// ============================================================
export class Kuyang extends Ghost {
    constructor(scene, position) {
        super(scene, position);
        this.type = 'Kuyang';
        this._diveTimer = randomFloat(3, 6);
        this._isDiving = false;
        this._diveDuration = 0;
        this.type = 'Kuyang';
    }

    _createMesh() {
        const group = new THREE.Group();

        // Kepala
        const headGeo = new THREE.SphereGeometry(0.45, 10, 10);
        const headMat = new THREE.MeshBasicMaterial({ color: 0xcc9966, transparent: true, opacity: 0.92 });
        const head = new THREE.Mesh(headGeo, headMat);
        group.add(head);

        // Rambut
        const hairMat = new THREE.MeshBasicMaterial({ color: 0x0a0505, transparent: true, opacity: 0.9 });
        for (let i = 0; i < 8; i++) {
            const strand = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.025, 1.0 + Math.random(), 4),
                hairMat
            );
            const angle = (i / 8) * Math.PI * 2;
            strand.position.set(Math.cos(angle) * 0.3, -0.3, Math.sin(angle) * 0.3);
            strand.rotation.z = Math.cos(angle) * 0.5;
            strand.rotation.x = Math.sin(angle) * 0.5;
            group.add(strand);
        }

        // Organ menggantung (tali-tali merah)
        const organMat = new THREE.MeshBasicMaterial({ color: 0x880011, transparent: true, opacity: 0.8 });
        for (let i = 0; i < 5; i++) {
            const organ = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.02, 0.8 + Math.random() * 0.6, 4),
                organMat
            );
            organ.position.set(
                (Math.random() - 0.5) * 0.5,
                -0.6 - Math.random() * 0.3,
                (Math.random() - 0.5) * 0.5
            );
            group.add(organ);
        }

        // Mata menyala merah
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
        [-0.18, 0.18].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeMat);
            eye.position.set(x, 0.05, 0.38);
            group.add(eye);
        });

        // Glow oranye-merah
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.12, side: THREE.BackSide });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), glowMat));

        const light = new THREE.PointLight(0xff3300, 2, 10);
        group.add(light);
        this._light = light;
        return group;
    }

    update(delta, playerPos, onChallengeTriggered) {
        if (this.isDead) return;
        const t = Date.now() * 0.001;

        const distToPlayer = this.mesh.position.distanceTo(playerPos);
        if (distToPlayer < CHALLENGE_DIST && !this._isDiving) {
            onChallengeTriggered?.(this);
            return;
        }

        if (this._isDiving) {
            // Menukik ke arah player
            this._diveDuration -= delta;
            const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
            this.mesh.position.addScaledVector(dir, GHOST_SPEED * 3 * delta);
            if (this._diveDuration <= 0) {
                this._isDiving = false;
                this._diveTimer = randomFloat(4, 8);
                this.mesh.position.y = 3.5;
            }
            return;
        }

        // Terbang tinggi berputar
        this.mesh.position.y = 3.5 + Math.sin(t * 1.5 + this._floatOffset) * 0.8;
        this.mesh.rotation.y += 2 * delta;
        this.mesh.rotation.z = Math.sin(t * 2) * 0.3;

        // Bergerak ke arah player dari atas
        const dir = new THREE.Vector3()
            .subVectors(new THREE.Vector3(playerPos.x, 0, playerPos.z),
                new THREE.Vector3(this.mesh.position.x, 0, this.mesh.position.z))
            .normalize();
        this.mesh.position.addScaledVector(dir, GHOST_SPEED * 1.1 * delta);

        // Serangan menukik periodik
        this._diveTimer -= delta;
        if (this._diveTimer <= 0) {
            this._isDiving = true;
            this._diveDuration = 1.5;
        }

        if (this._light) this._light.intensity = 1.5 + Math.sin(t * 10) * 0.7;
    }
}

/** GhostManager — mengelola spawn dan lifecycle semua hantu. */
export class GhostManager {
    constructor(scene) {
        this.scene = scene;
        /** @type {Ghost[]} */
        this.ghosts = [];
        this._spawnTimer = randomInt(20, 40);
        this._activeChallenge = false;

        // Daftar semua tipe hantu beserta bobotnya (semakin tinggi = lebih sering muncul)
        this._ghostTypes = [
            { Class: Ghost, weight: 2, label: 'Hantu Biasa' },
            { Class: Pocong, weight: 3, label: 'Pocong' },
            { Class: Kuntilanak, weight: 2, label: 'Kuntilanak' },
            { Class: Tuyul, weight: 2, label: 'Tuyul' },
            { Class: Kuyang, weight: 1, label: 'Kuyang' }, // Paling langka
        ];
    }

    /** Pilih tipe hantu secara acak berdasarkan bobot. */
    _pickGhostClass() {
        const total = this._ghostTypes.reduce((s, t) => s + t.weight, 0);
        let r = Math.random() * total;
        for (const entry of this._ghostTypes) {
            r -= entry.weight;
            if (r <= 0) return entry.Class;
        }
        return Ghost;
    }

    /**
     * Update semua hantu.
     * @param {number} delta
     * @param {THREE.Vector3} playerPos
     * @param {Function} onChallenge - callback(ghost)
     */
    update(delta, playerPos, onChallenge) {
        // Spawn timer
        if (!this._activeChallenge) {
            this._spawnTimer -= delta;
            if (this._spawnTimer <= 0) {
                this._spawn(playerPos);
                this._spawnTimer = randomInt(20, 40);
            }
        }

        // Update tiap hantu
        this.ghosts.forEach(ghost => {
            if (!ghost.isDead) {
                ghost.update(delta, playerPos, (g) => {
                    if (!this._activeChallenge) {
                        this._activeChallenge = true;
                        onChallenge?.(g);
                    }
                });
            }
        });

        // Bersihkan hantu mati
        this.ghosts = this.ghosts.filter(g => !g.isDead);
    }

    _spawn(playerPos) {
        const angle = Math.random() * Math.PI * 2;
        const dist = randomFloat(SPAWN_MIN_DIST, SPAWN_MAX_DIST);
        const pos = new THREE.Vector3(
            playerPos.x + Math.cos(angle) * dist,
            0,
            playerPos.z + Math.sin(angle) * dist
        );
        const GhostClass = this._pickGhostClass();
        const ghost = new GhostClass(this.scene, pos);
        this.ghosts.push(ghost);
    }

    challengeEnded() {
        this._activeChallenge = false;
    }

    setPhase(phase) {
        if (phase === 1) this._spawnTimer = 30;  // Lambat — pemain bisa eksplorasi
        if (phase === 2) this._spawnTimer = 15;  // Sedang — mulai menegangkan
        if (phase === 3) this._spawnTimer = 5;   // Cepat — semua hantu menyerang!
    }
}