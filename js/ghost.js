/**
 * ghost.js — AI Ghost System
 * Spawn, animasi melayang, pathfinding sederhana, trigger challenge.
 */

import * as THREE from 'three';
import { randomFloat, randomInt } from './utils.js';
import { audioManager } from './audio.js';
import { getModel } from './modelLoader.js';

/** Jarak minimum spawn dari player. */
const SPAWN_MIN_DIST = 8;
/** Jarak spawn maksimum. */
const SPAWN_MAX_DIST = 18;
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

        // Buat mesh hantu
        this.mesh = this._createMesh();
        this.mesh.position.copy(position);
        this.mesh.position.y = 0; // Y diatur oleh update() setiap frame
        scene.add(this.mesh);

        // Cari model dengan animasi di dalam mesh group
        let animatedModel = null;
        this.mesh.traverse(child => {
            if (child.animations && child.animations.length > 0) {
                animatedModel = child;
            }
        });

        if (animatedModel) {
            this.mixer = new THREE.AnimationMixer(animatedModel);
            const action = this.mixer.clipAction(animatedModel.animations[0]);
            action.play();
            console.log(`[Ghost] Mixer animasi diinisialisasi untuk tipe: ${this.type}`);
        }

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

        // Coba load kuntilanak model sebagai fallback untuk base Ghost class
        const model = getModel('kuntilanak', 1.8);
        if (model) {
            group.add(model);
        } else {
            // Tubuh ghostly — terang dan bisa terlihat meski ada fog (fallback prosedural)
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0x8888ff,
                emissive: new THREE.Color(0x3333aa),
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.85,
                roughness: 0.3,
            });
            const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.0, 8), bodyMat);
            body.position.y = 1.0;
            body.castShadow = true;
            group.add(body);

            // Kepala
            const headMat = new THREE.MeshStandardMaterial({
                color: 0xccccff,
                emissive: new THREE.Color(0x4444cc),
                emissiveIntensity: 0.9,
                transparent: true,
                opacity: 0.9,
            });
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), headMat);
            head.position.y = 2.3;
            group.add(head);

            // Mata menyala
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            [-0.15, 0.15].forEach(x => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeMat);
                eye.position.set(x, 2.35, 0.33);
                group.add(eye);
            });
        }

        // Glow sphere — sangat visible
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x4444ff, transparent: true, opacity: 0.18, side: THREE.BackSide });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), glowMat);
        glow.position.y = 1.0;
        group.add(glow);

        // Point light lebih terang
        const light = new THREE.PointLight(0x5555ff, 3.0, 15);
        light.position.y = 1.5;
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
        if (this.mixer) this.mixer.update(delta);

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

        // Cari dan salin material dari model GLB agar tidak mempengaruhi instance lain
        const materials = [];
        this.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(m => m.clone());
                    materials.push(...child.material);
                } else {
                    child.material = child.material.clone();
                    materials.push(child.material);
                }
            }
        });

        // Buat material bersinar putih terang
        materials.forEach(mat => {
            if (mat.color) mat.color.set(0xffffff);
            if (mat.emissive) mat.emissive.set(0xffffff);
            if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 2.0;
        });

        // Fade out bertahap
        let alpha = 1;
        const fade = () => {
            alpha -= 0.05;
            materials.forEach(mat => {
                mat.transparent = true;
                mat.opacity = Math.max(0, alpha);
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

        const model = getModel('pocong', 1.8);
        if (model) {
            group.add(model);
        } else {
            // Fallback terang: bungkusan kain putih bercahaya
            const mat = new THREE.MeshStandardMaterial({
                color: 0xeeeeee,
                emissive: new THREE.Color(0x888888),
                emissiveIntensity: 0.6,
                transparent: true, opacity: 0.92,
            });
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.8, 8), mat);
            body.position.y = 0;
            group.add(body);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), mat);
            head.position.y = 0;
            group.add(head);
        }

        // Glow hijau terang
        // const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.15, side: THREE.BackSide });
        // const glow = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), glowMat);
        // glow.position.y = 1.0;
        // group.add(glow);

        // const light = new THREE.PointLight(0x44ff88, 2.5, 12);
        // light.position.y = 1;
        // group.add(light);
        // this._light = light;
        // return group;
    }

    update(delta, playerPos, onChallengeTriggered) {
        if (this.isDead) return;
        if (this.mixer) this.mixer.update(delta);
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

        // kuntilanak_ghost.glb sangat kecil (2cm!) → selalu pakai fallback
        // tapi bisa coba load model, jika ada dan ukuran wajar gunakan
        const model = getModel('kuntilanak', 2.0);
        if (model) {
            group.add(model);
        } else {
            // Wanita putih bercahaya — sangat visible
            const skinMat = new THREE.MeshStandardMaterial({
                color: 0xddd8d0,
                emissive: new THREE.Color(0x554422),
                emissiveIntensity: 0.5,
                transparent: true, opacity: 0.95,
                roughness: 0.8,
            });
            const dressMat = new THREE.MeshStandardMaterial({
                color: 0xf0ece8,
                emissive: new THREE.Color(0x332211),
                emissiveIntensity: 0.4,
                transparent: true, opacity: 0.9,
                roughness: 0.9, side: THREE.DoubleSide,
            });
            // Gaun
            const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.55, 2.1, 10), dressMat);
            dress.position.y = 1.05;
            group.add(dress);
            // Kepala
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), skinMat);
            head.position.y = 2.4;
            group.add(head);
            // Rambut — helai panjang hitam
            const hairMat = new THREE.MeshBasicMaterial({ color: 0x050808 });
            for (let i = 0; i < 8; i++) {
                const strand = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.01, 0.015, 1.8, 4),
                    hairMat
                );
                const a = (i / 8) * Math.PI * 2;
                strand.position.set(Math.sin(a) * 0.2, 2.4 - 0.9, Math.cos(a) * 0.2);
                strand.rotation.z = Math.sin(a) * 0.3;
                group.add(strand);
            }
        }

        // Glow hijau pucat ghostly
        // const glowMat = new THREE.MeshBasicMaterial({ color: 0xaaffcc, transparent: true, opacity: 0.18, side: THREE.BackSide });
        // const glow = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), glowMat);
        // glow.position.y = 1.2;
        // group.add(glow);

        // const light = new THREE.PointLight(0x88ffbb, 3.0, 16);
        // light.position.y = 1.5;
        // group.add(light);
        // this._light = light;
        // return group;
    }

    update(delta, playerPos, onChallengeTriggered) {
        if (this.isDead) return;
        if (this.mixer) this.mixer.update(delta);
        const t = Date.now() * 0.001;

        // Melayang halus — naik turun sedikit agar terasa melayang
        this.mesh.position.y = 0.1 + Math.sin(t * 1.8 + this._floatOffset) * 0.25;

        // Hadap ke arah player (lookAt di XZ plane)
        const flatPlayer = new THREE.Vector3(playerPos.x, this.mesh.position.y, playerPos.z);
        this.mesh.lookAt(flatPlayer);
        // Sway sedikit seperti melayang
        this.mesh.rotation.z = Math.sin(t * 1.2) * 0.04;

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

        // Flicker cahaya halus
        if (this._light) this._light.intensity = 1.6 + Math.sin(t * 6) * 0.4;
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

        const model = getModel('tuyul', 1.0);
        if (model) {
            group.add(model);
        } else {
            // Tuyul prosedural: makhluk kecil hijau bercahaya
            const mat = new THREE.MeshStandardMaterial({
                color: 0x88cc88,
                emissive: new THREE.Color(0x224422),
                emissiveIntensity: 0.7,
                transparent: true, opacity: 0.9,
            });
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 8), mat);
            body.position.y = 0.5;
            group.add(body);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), mat);
            head.position.y = 1.05;
            group.add(head);
        }

        // Mata merah menyala — koordinat tinggi model ~1.0m
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        [-0.12, 0.12].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
            eye.position.set(x, 1.05, 0.26);
            group.add(eye);
        });

        // Glow hijau terang
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.20, side: THREE.BackSide });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 8), glowMat);
        glow.position.y = 0.5;
        group.add(glow);

        const light = new THREE.PointLight(0x44ff44, 2.5, 10);
        light.position.y = 0.6;
        group.add(light);
        this._light = light;
        return group;
    }

    update(delta, playerPos, onChallengeTriggered) {
        if (this.isDead) return;
        if (this.mixer) this.mixer.update(delta);
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

        const model = getModel('kuyang', 1.2);
        if (model) {
            group.add(model);
        } else {
            // Kuyang: kepala mengambang dengan organ — merah menyala
            const headMat = new THREE.MeshStandardMaterial({
                color: 0xcc8855,
                emissive: new THREE.Color(0x441100),
                emissiveIntensity: 0.6,
                transparent: true, opacity: 0.95,
                roughness: 0.7,
            });
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), headMat);
            head.position.y = 0.6;
            group.add(head);

            // Rambut
            const hairMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
            for (let i = 0; i < 6; i++) {
                const s = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.4, 4), hairMat);
                const a = (i / 6) * Math.PI * 2;
                s.position.set(Math.sin(a) * 0.28, 0.6 - 0.7, Math.cos(a) * 0.28);
                s.rotation.z = Math.sin(a) * 0.5;
                group.add(s);
            }

            // Organ menggantung merah
            const organMat = new THREE.MeshStandardMaterial({
                color: 0xaa0011,
                emissive: new THREE.Color(0x550005),
                emissiveIntensity: 0.5,
                transparent: true, opacity: 0.88,
            });
            for (let i = 0; i < 5; i++) {
                const org = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.025, 0.9 + Math.random() * 0.5, 4), organMat);
                org.position.set((Math.random() - 0.5) * 0.5, 0.1 - Math.random() * 0.3, (Math.random() - 0.5) * 0.5);
                group.add(org);
            }
        }

        // Mata merah menyala
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
        [-0.2, 0.2].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), eyeMat);
            eye.position.set(x, 0.7, 0.44);
            group.add(eye);
        });

        // Glow oranye-merah terang
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.22, side: THREE.BackSide });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), glowMat);
        glow.position.y = 0.6;
        group.add(glow);

        const light = new THREE.PointLight(0xff3300, 3.5, 14);
        light.position.y = 0.6;
        group.add(light);
        this._light = light;
        return group;
    }

    update(delta, playerPos, onChallengeTriggered) {
        if (this.isDead) return;
        if (this.mixer) this.mixer.update(delta);
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

        // Daftar semua tipe hantu beserta bobotnya (hanya memuat tipe dengan model GLB asli)
        this._ghostTypes = [
            { Class: Pocong, weight: 3, label: 'Pocong' },
            { Class: Kuntilanak, weight: 3, label: 'Kuntilanak' },
            { Class: Tuyul, weight: 2, label: 'Tuyul' },
            { Class: Kuyang, weight: 2, label: 'Kuyang' },
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