/**
 * modelLoader.js — Pemuatan & caching model 3D GLB terpusat.
 * Auto-scale berdasarkan bounding box agar model Sketchfab
 * (berbeda satuan: mm/cm/m) selalu muncul dengan ukuran benar.
 */

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const _loader = new GLTFLoader();

/** Cache: path → { scene, size, minY, animations } */
const _cache = new Map();

function _load(path) {
    if (_cache.has(path)) return Promise.resolve(_cache.get(path));
    return new Promise((resolve, reject) => {
        _loader.load(
            path,
            (gltf) => {
                const root = gltf.scene;

                // Aktifkan shadow + update matrix seluruh hierarchy
                root.updateMatrixWorld(true);
                root.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Hitung bounding box dari geometry lokal dikalikan matrix child
                const box = new THREE.Box3();
                root.traverse((child) => {
                    if (child.isMesh && child.geometry) {
                        // Pastikan child matrix up-to-date
                        child.updateWorldMatrix(true, false);
                        const geo = child.geometry;
                        if (!geo.boundingBox) geo.computeBoundingBox();
                        const local = geo.boundingBox.clone();
                        local.applyMatrix4(child.matrixWorld);
                        box.union(local);
                    }
                });

                // Fallback: pakai Box3.setFromObject jika tidak ada mesh
                if (box.isEmpty()) {
                    root.updateMatrixWorld(true);
                    box.setFromObject(root);
                }

                const size = new THREE.Vector3();
                box.getSize(size);
                const minY = box.min.y;

                console.log(
                    `[ModelLoader] ${path.split('/').pop()} | ` +
                    `W:${size.x.toFixed(2)} H:${size.y.toFixed(2)} D:${size.z.toFixed(2)} ` +
                    `| minY:${minY.toFixed(2)}`
                );

                _cache.set(path, { scene: root, size, minY, animations: gltf.animations });
                resolve(_cache.get(path));
            },
            undefined,
            (err) => {
                console.error(`[ModelLoader] Gagal: ${path}`, err);
                reject(err);
            }
        );
    });
}

const MODEL_PATHS = {
    gravestone: 'assets/models/gravestone.glb',
    // ground:      'assets/models/ground.glb',
    spooky_tree: 'assets/models/spooky_tree.glb',
    kuntilanak: 'assets/models/kuntilanak_ghost.glb',
    pocong: 'assets/models/pocong.glb',
    tuyul: 'assets/models/tuyul.glb',
    kuyang: 'assets/models/kuyang.glb',
};

export async function preloadModels(onProgress) {
    const entries = Object.entries(MODEL_PATHS);
    let loaded = 0;
    for (const [, path] of entries) {
        try { await _load(path); } catch (_) { /* lanjut */ }
        onProgress?.(++loaded, entries.length);
    }
}

/**
 * Ambil clone model yang sudah di-cache dan auto-scale ke targetHeight.
 * Otomatis menggeser model agar dasarnya tepat di Y = parentOffsetY.
 *
 * @param {string} key
 * @param {number} targetHeight  tinggi model dalam unit Three.js
 * @param {number} parentOffsetY posisi Y wrapper (default 0 = lantai)
 * @returns {THREE.Group|null}  null jika model tidak ada atau ukuran 0
 */
export function getModel(key, targetHeight = 1.0, parentOffsetY = 0) {
    const entry = _cache.get(MODEL_PATHS[key]);
    if (!entry) {
        console.warn(`[ModelLoader] "${key}" belum di-cache.`);
        return null;
    }

    const { size, animations } = entry;

    // Jika model tidak punya geometri wajar → return null agar fallback aktif
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim < 0.0001) {
        console.warn(`[ModelLoader] "${key}" bounding box = 0, pakai fallback.`);
        return null;
    }

    // Gunakan SkeletonUtils.clone() untuk mengkloning SkinnedMesh secara aman
    const clone = SkeletonUtils.clone(entry.scene);

    // Gunakan pembungkus group untuk menangani rotasi & scaling dengan aman
    const wrapper = new THREE.Group();
    wrapper.add(clone);

    // Deteksi jika model miring/horisontal (seperti pocong yang tidur)
    let scaleFactor;
    if (key === 'pocong') {
        // Pocong tidur: tinggi sebenarnya diwakili dimensi Z (depth)
        scaleFactor = targetHeight / size.z;
        clone.rotation.x = -Math.PI / 2; // Berdirikan model 90 derajat
    } else {
        scaleFactor = targetHeight / size.y;
    }

    clone.scale.setScalar(scaleFactor);

    // Hitung ulang bounding box setelah rotasi dan scaling pada wrapper
    const box = new THREE.Box3().setFromObject(wrapper);
    const minYRotated = box.min.y;

    // Geser posisi model anak di dalam wrapper agar dasarnya di parentOffsetY
    clone.position.y = parentOffsetY - minYRotated;

    // Salin list animasi asli ke wrapper group
    wrapper.animations = animations || [];

    return wrapper;
}

/**
 * Clone model ground dan scale agar menutupi area size×size (XZ).
 * @param {string} key
 * @param {number} size  panjang sisi area (misal 200)
 * @returns {THREE.Group|null}
 */
export function getGroundModel(key, size = 200) {
    const entry = _cache.get(MODEL_PATHS[key]);
    if (!entry) return null;

    const xzMax = Math.max(entry.size.x, entry.size.z);
    if (xzMax < 0.001) return null;

    const clone = SkeletonUtils.clone(entry.scene);
    const s = size / xzMax;
    clone.scale.set(s, s, s);
    // Ratakan ke Y = 0
    clone.position.y = -entry.minY * s;
    return clone;
}
