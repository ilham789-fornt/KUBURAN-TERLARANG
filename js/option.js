/**
 * options.js — Manages the Options panel UI and settings.
 */

import { loadOptions, saveOptions } from './save.js';
import { audioManager } from './audio.js';

export class OptionsManager {
    constructor() {
        this.options = loadOptions();
        this._bindElements();
        this._bindEvents();
        this._applyToUI();
    }

    _bindElements() {
        this.masterVol = document.getElementById('master-vol');
        this.masterVal = document.getElementById('master-val');
        this.musicVol = document.getElementById('music-vol');
        this.musicVal = document.getElementById('music-val');
        this.sfxVol = document.getElementById('sfx-vol');
        this.sfxVal = document.getElementById('sfx-val');
        this.voiceVol = document.getElementById('voice-vol');
        this.voiceVal = document.getElementById('voice-val');
        this.mouseSens = document.getElementById('mouse-sens');
        this.sensVal = document.getElementById('sens-val');
        this.invertMouse = document.getElementById('invert-mouse');
        this.fogQuality = document.getElementById('fog-quality');
        this.shadowQuality = document.getElementById('shadow-quality');
    }

    _bindEvents() {
        // Volume sliders — realtime update
        const makeSliderHandler = (key, displayEl) => (e) => {
            this.options[key] = parseInt(e.target.value);
            displayEl.textContent = this.options[key];
            audioManager.updateOptions(this.options);
            saveOptions(this.options);
        };

        this.masterVol.addEventListener('input', makeSliderHandler('masterVolume', this.masterVal));
        this.musicVol.addEventListener('input', makeSliderHandler('musicVolume', this.musicVal));
        this.sfxVol.addEventListener('input', makeSliderHandler('sfxVolume', this.sfxVal));
        this.voiceVol.addEventListener('input', makeSliderHandler('voiceVolume', this.voiceVal));

        // Mouse sensitivity
        this.mouseSens.addEventListener('input', (e) => {
            this.options.mouseSensitivity = parseInt(e.target.value);
            this.sensVal.textContent = this.options.mouseSensitivity;
            saveOptions(this.options);
        });

        // Invert mouse toggle
        this.invertMouse.addEventListener('click', () => {
            this.options.invertMouse = !this.options.invertMouse;
            this.invertMouse.textContent = this.options.invertMouse ? 'ON' : 'OFF';
            this.invertMouse.style.color = this.options.invertMouse ? '#ff4400' : '#ccc';
            saveOptions(this.options);
        });

        // Fog & Shadow quality
        this.fogQuality.addEventListener('change', (e) => {
            this.options.fogQuality = e.target.value;
            saveOptions(this.options);
        });
        this.shadowQuality.addEventListener('change', (e) => {
            this.options.shadowQuality = e.target.value;
            saveOptions(this.options);
        });
    }

    _applyToUI() {
        this.masterVol.value = this.options.masterVolume;
        this.masterVal.textContent = this.options.masterVolume;
        this.musicVol.value = this.options.musicVolume;
        this.musicVal.textContent = this.options.musicVolume;
        this.sfxVol.value = this.options.sfxVolume;
        this.sfxVal.textContent = this.options.sfxVolume;
        this.voiceVol.value = this.options.voiceVolume;
        this.voiceVal.textContent = this.options.voiceVolume;
        this.mouseSens.value = this.options.mouseSensitivity;
        this.sensVal.textContent = this.options.mouseSensitivity;
        this.invertMouse.textContent = this.options.invertMouse ? 'ON' : 'OFF';
        this.fogQuality.value = this.options.fogQuality;
        this.shadowQuality.value = this.options.shadowQuality;
    }

    getOptions() {
        return this.options;
    }
}