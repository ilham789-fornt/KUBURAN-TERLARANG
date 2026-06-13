# 🪦 KUBURAN TERLARANG

Game Horror 3D First-Person berbasis web menggunakan HTML5, Three.js, dan Web Speech API.

## Cara Menjalankan

### Prasyarat
- VS Code dengan ekstensi **Live Server**
- Browser modern (Chrome/Edge direkomendasikan untuk Web Speech API)
- Mikrofon (untuk fitur challenge suara)

### Langkah

1. Clone atau download project ini
2. Buka folder `project/` di VS Code
3. Klik kanan `index.html` → **Open with Live Server**
4. Browser akan terbuka di `http://127.0.0.1:5500`
5. **PENTING:** Izinkan akses mikrofon saat diminta browser

> ⚠️ Game TIDAK bisa dibuka langsung dari file:// karena ES Modules membutuhkan HTTP server.

## Menambah Audio

Letakkan file audio `.mp3` di `assets/sounds/` sesuai nama yang terdaftar di `js/audio.js`.
Jika file tidak ada, game tetap berjalan tanpa suara untuk elemen tersebut.

---

## Cara Mengganti Model Hantu

1. Buka `js/ghost.js`
2. Temukan method `_createMesh()` di class `Ghost`
3. Hapus/ganti bagian geometry dengan THREE.GLTFLoader:
