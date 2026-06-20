/**
 * items.js — Sistem Item Tersembunyi (Tantangan 4: Eksplorasi Bermakna)
 * Item jimat tersebar di map, memberikan bonus nyata ke gameplay.
 */

import * as THREE from 'three';
import { randomFloat } from './utils.js';
import { audioManager } from './audio.js';

/** Radius pemain harus berada untuk mengambil item */
const PICKUP_RADIUS = 2.5;

/** Definisi semua jenis jimat */
export const ITEM_TYPES = {
  JIMAT_WAKTU:    'jimat_waktu',    // +5 detik ke challenge timer
  JIMAT_AKURASI:  'jimat_akurasi',  // Turunkan threshold akurasi jadi 65%
  JIMAT_PENGUSIR: 'jimat_pengusir', // Auto-banish hantu berikutnya
  LILIN:          'lilin',          // Untuk misi: nyalakan lilin
};

const ITEM_CONFIG = {
  [ITEM_TYPES.JIMAT_WAKTU]:    { color: 0x00ffff, label: '⏱ Jimat Waktu',    desc: '+5 detik challenge!',       emissive: 0x004444 },
  [ITEM_TYPES.JIMAT_AKURASI]:  { color: 0xffaa00, label: '🎯 Jimat Akurasi',  desc: 'Akurasi 65% sudah cukup!',  emissive: 0x442200 },
  [ITEM_TYPES.JIMAT_PENGUSIR]: { color: 0xff00ff, label: '💎 Jimat Pengusir', desc: 'Hantu berikutnya auto-usir!', emissive: 0x440044 },
  [ITEM_TYPES.LILIN]:          { color: 0xffcc44, label: '🕯 Lilin',           desc: 'Lilin dinyalakan! (+Misi)',  emissive: 0x332200 },
};

export class WorldItem {
  /**
   * @param {THREE.Scene} scene
   * @param {string} type — ITEM_TYPES.*
   * @param {THREE.Vector3} position
   */
  constructor(scene, type, position) {
    this.scene     = scene;
    this.type      = type;
    this.collected = false;
    this.config    = ITEM_CONFIG[type];

    this.mesh = this._createMesh(type);
    this.mesh.position.copy(position);
    scene.add(this.mesh);

    this._bobOffset = Math.random() * Math.PI * 2;
  }

  _createMesh(type) {
    const group = new THREE.Group();
    const cfg   = ITEM_CONFIG[type];

    if (type === ITEM_TYPES.LILIN) {
      // Lilin: silinder putih + api kuning
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8),
        new THREE.MeshLambertMaterial({ color: 0xfffaee })
      );
      candle.position.y = 0.25;
      group.add(candle);

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffaa00 })
      );
      flame.position.y = 0.6;
      group.add(flame);

      const light = new THREE.PointLight(0xff8800, 1.5, 4);
      light.position.y = 0.6;
      group.add(light);
      this._flickerLight = light;
    } else {
      // Jimat: octahedron berputar + glow
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.25),
        new THREE.MeshStandardMaterial({
          color:     cfg.color,
          emissive:  cfg.emissive,
          metalness: 0.6,
          roughness: 0.2,
        })
      );
      gem.position.y = 0.8;
      group.add(gem);
      this._gemMesh = gem;

      // Glow ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.03, 8, 32),
        new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.5 })
      );
      ring.position.y = 0.8;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      // Point light
      const light = new THREE.PointLight(cfg.color, 1.5, 5);
      light.position.y = 0.8;
      group.add(light);
      this._itemLight = light;
    }

    return group;
  }

  update(delta, playerPos, onPickup) {
    if (this.collected) return;

    const t = Date.now() * 0.001;

    // Bob up-down
    if (this._gemMesh) {
      this._gemMesh.position.y = 0.8 + Math.sin(t * 2 + this._bobOffset) * 0.15;
      this._gemMesh.rotation.y += delta * 1.5;
    }

    // Flicker lilin
    if (this._flickerLight) {
      this._flickerLight.intensity = 1.2 + Math.sin(t * 15) * 0.4 + Math.random() * 0.3;
    }
    if (this._itemLight) {
      this._itemLight.intensity = 1 + Math.sin(t * 4 + this._bobOffset) * 0.5;
    }

    // Cek pickup
    const dist = this.mesh.position.distanceTo(playerPos);
    if (dist < PICKUP_RADIUS) {
      this._collect(onPickup);
    }
  }

  _collect(onPickup) {
    this.collected = true;
    audioManager.play('ui_click');
    this.scene.remove(this.mesh);
    onPickup?.(this.type, this.config);
  }
}

export class ItemManager {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    /** @type {WorldItem[]} */
    this.items = [];
  }

  /**
   * Tempatkan item di seluruh map.
   * Hindari spawn di dekat posisi awal player (radius 8).
   */
  spawnItems() {
    const placements = [
      // 6 Lilin tersebar
      ...this._randomPositions(6, 15, 60, ITEM_TYPES.LILIN),
      // 4 Jimat Waktu
      ...this._randomPositions(4, 10, 50, ITEM_TYPES.JIMAT_WAKTU),
      // 3 Jimat Akurasi
      ...this._randomPositions(3, 10, 50, ITEM_TYPES.JIMAT_AKURASI),
      // 2 Jimat Pengusir (lebih langka)
      ...this._randomPositions(2, 15, 55, ITEM_TYPES.JIMAT_PENGUSIR),
    ];

    placements.forEach(({ pos, type }) => {
      this.items.push(new WorldItem(this.scene, type, pos));
    });
  }

  _randomPositions(count, minDist, maxDist, type) {
    const result = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = minDist + Math.random() * (maxDist - minDist);
      result.push({
        pos:  new THREE.Vector3(Math.cos(angle) * dist, 0.05, Math.sin(angle) * dist),
        type,
      });
    }
    return result;
  }

  /**
   * Update semua item tiap frame.
   * @param {number} delta
   * @param {THREE.Vector3} playerPos
   * @param {(type: string, config: object) => void} onPickup
   */
  update(delta, playerPos, onPickup) {
    this.items.forEach(item => item.update(delta, playerPos, onPickup));
    this.items = this.items.filter(i => !i.collected);
  }

  countCollected(type) {
    // item yang sudah dikumpulkan sudah dihapus dari array,
    // jadi kita track di game.js via event
    return 0;
  }
}
