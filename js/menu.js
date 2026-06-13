/**
 * menu.js — Main Menu controller dan background 3D mini.
 */

import * as THREE from 'three';
import { audioManager } from './audio.js';

export class MainMenu {
    constructor() {
        this.el = document.getElementById('main-menu');
        this.canvas = document.getElementById('menu-canvas');
        this.lightning = document.getElementById('menu-lightning');
        this._renderer = null;
        this._scene = null;
        this._camera = null;
        this._animId = null;
        this._running = false;
    }

    /** Tampilkan main menu dengan background 3D. */
    show() {
        this.el.classList.add('active');
        this._running = true;
        this._initThreeBackground();
        this._startLightningEffect();
        audioManager.startAmbience();
    }

    /** Sembunyikan main menu. */
    hide() {
        this._running = false;
        if (this._animId) cancelAnimationFrame(this._animId);
        this.el.classList.remove('active');
        if (this._renderer) {
            this._renderer.dispose();
            this._renderer = null;
        }
    }

    /** Inisialisasi Three.js background kuburan sederhana. */
    _initThreeBackground() {
        const w = window.innerWidth,
            h = window.innerHeight;

        this._renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false });
        this._renderer.setSize(w, h);
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this._renderer.setClearColor(0x000308);
        this._renderer.shadowMap.enabled = true;

        this._scene = new THREE.Scene();
        this._scene.fog = new THREE.FogExp2(0x0a0d14, 0.04);
        this._camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
        this._camera.position.set(0, 2.5, 10);
        this._camera.lookAt(0, 1, 0);

        this._buildScene();
        this._animate();
    }

    _buildScene() {
        const scene = this._scene;

        // Ground
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshLambertMaterial({ color: 0x0d1008 })
        );
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        // Moonlight
        const moon = new THREE.DirectionalLight(0x4466aa, 0.8);
        moon.position.set(10, 30, -20);
        scene.add(moon);
        scene.add(new THREE.AmbientLight(0x050810, 1));

        // Gravestones
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 30;
            const z = (Math.random() - 0.5) * 20 - 5;
            scene.add(this._makeGravestone(x, 0, z));
        }

        // Dead trees
        for (let i = 0; i < 8; i++) {
            const x = (Math.random() - 0.5) * 40;
            const z = (Math.random() - 0.5) * 30 - 5;
            scene.add(this._makeDeadTree(x, 0, z));
        }
    }

    _makeGravestone(x, y, z) {
        const group = new THREE.Group();
        const stone = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 1.0, 0.1),
            new THREE.MeshLambertMaterial({ color: 0x333340 })
        );
        stone.position.set(0, 0.5, 0);
        group.add(stone);
        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        return group;
    }

    _makeDeadTree(x, y, z) {
        const group = new THREE.Group();
        // Trunk
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.2, 4, 6),
            new THREE.MeshLambertMaterial({ color: 0x1a1208 })
        );
        trunk.position.y = 2;
        group.add(trunk);
        // Branches
        for (let i = 0; i < 4; i++) {
            const branch = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.08, 1.5, 4),
                new THREE.MeshLambertMaterial({ color: 0x150e05 })
            );
            branch.position.set(
                Math.sin(i * Math.PI / 2) * 0.8,
                3 + Math.random() * 0.5,
                Math.cos(i * Math.PI / 2) * 0.8
            );
            branch.rotation.z = (Math.random() - 0.5) * Math.PI * 0.5;
            group.add(branch);
        }
        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        return group;
    }

    _animate() {
        if (!this._running) return;
        this._animId = requestAnimationFrame(() => this._animate());
        // Gerakkan kamera perlahan
        const t = Date.now() * 0.0002;
        this._camera.position.x = Math.sin(t) * 2;
        this._camera.lookAt(0, 1, 0);
        this._renderer.render(this._scene, this._camera);
    }

    /** Efek petir acak. */
    _startLightningEffect() {
        const flash = () => {
            if (!this._running) return;
            this.lightning.classList.add('flash');
            setTimeout(() => {
                this.lightning.classList.remove('flash');
                audioManager.play('thunder');
            }, 80);
            // Kadang double flash
            if (Math.random() > 0.5) {
                setTimeout(() => {
                    this.lightning.classList.add('flash');
                    setTimeout(() => this.lightning.classList.remove('flash'), 60);
                }, 200);
            }
            // Jadwalkan flash berikutnya secara acak
            setTimeout(flash, 8000 + Math.random() * 15000);
        };
        setTimeout(flash, 3000 + Math.random() * 5000);
    }
}
