// ==UserScript==
// @name         NEON SOUND LAB — Editor de Audio
// @namespace    http://tampermonkey.net/
// @version      2026-10-21
// @description  Editor de audio flotante: velocidad, reverb, pitch, 432Hz, 285Hz Solfeggio, presets y exportación WAV/MP3/OGG. 100% local, sin redirecciones. Click en el botón flotante para abrir el panel.
// @author       You
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Evita doble instanciación
  if (window.__NEON_SOUND_LAB_LOADED__) return;
  window.__NEON_SOUND_LAB_LOADED__ = true;

  // ====================================================================
  // 1. INYECCIÓN DE ESTILOS
  // ====================================================================
  const NSL_STYLE = document.createElement('style');
  NSL_STYLE.id = 'nsl-userscript-styles';
  NSL_STYLE.textContent = `
  /* ===== Botón flotante ===== */
  #nsl-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff006e, #8338ec);
    border: 2px solid rgba(0, 245, 255, 0.6);
    box-shadow: 0 0 25px rgba(255, 0, 110, 0.7), 0 0 50px rgba(131, 56, 236, 0.4);
    cursor: pointer;
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    animation: nsl-float-pulse 3s ease-in-out infinite;
  }
  #nsl-fab:hover {
    transform: scale(1.1) rotate(5deg);
    box-shadow: 0 0 40px rgba(255, 0, 110, 1), 0 0 80px rgba(0, 245, 255, 0.6);
  }
  #nsl-fab svg { width: 28px; height: 28px; filter: drop-shadow(0 0 4px rgba(255,255,255,0.8)); }
  @keyframes nsl-float-pulse {
    0%, 100% { box-shadow: 0 0 25px rgba(255, 0, 110, 0.7), 0 0 50px rgba(131, 56, 236, 0.4); }
    50% { box-shadow: 0 0 35px rgba(255, 0, 110, 0.9), 0 0 70px rgba(0, 245, 255, 0.5); }
  }

  /* ===== Overlay panel ===== */
  #nsl-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    overflow-y: auto;
    padding: 20px;
  }
  #nsl-overlay.nsl-open { display: flex; }

  #nsl-panel {
    position: relative;
    width: 100%;
    max-width: 1100px;
    max-height: 92vh;
    overflow-y: auto;
    background:
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(131, 56, 236, 0.28) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 100% 100%, rgba(255, 0, 110, 0.18) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 0% 100%, rgba(0, 245, 255, 0.12) 0%, transparent 60%),
      linear-gradient(180deg, #0a0118 0%, #000 100%);
    color: #fff;
    border-radius: 16px;
    border: 1px solid rgba(131, 56, 236, 0.3);
    box-shadow: 0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(131, 56, 236, 0.3);
    font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
  }
  #nsl-panel::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: 16px;
    background-image:
      linear-gradient(rgba(255, 0, 110, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 245, 255, 0.06) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
    mask-image: radial-gradient(ellipse at center, black 20%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 20%, transparent 75%);
    z-index: 0;
  }

  /* Botón de cerrar */
  #nsl-close {
    position: absolute;
    top: 14px; right: 14px;
    width: 38px; height: 38px;
    border-radius: 50%;
    background: rgba(255, 0, 110, 0.15);
    border: 1px solid rgba(255, 0, 110, 0.5);
    color: #fff;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
  }
  #nsl-close:hover {
    background: rgba(255, 0, 110, 0.4);
    box-shadow: 0 0 20px rgba(255, 0, 110, 0.8);
    transform: rotate(90deg);
  }

  /* Variables y estilos neon (heredados del original) */
  #nsl-panel * { box-sizing: border-box; }
  #nsl-panel .display-font { font-family: 'Audiowide', 'Space Grotesk', cursive; letter-spacing: 0.05em; }
  #nsl-panel .neon-pink { color: #ff006e; text-shadow: 0 0 10px rgba(255, 0, 110, 0.6), 0 0 25px rgba(255, 0, 110, 0.3); }
  #nsl-panel .neon-cyan { color: #00f5ff; text-shadow: 0 0 10px rgba(0, 245, 255, 0.6), 0 0 25px rgba(0, 245, 255, 0.3); }
  #nsl-panel .neon-yellow { color: #ffbe0b; text-shadow: 0 0 10px rgba(255, 190, 11, 0.6); }
  #nsl-panel .neon-green { color: #4ade80; text-shadow: 0 0 10px rgba(74, 222, 128, 0.6); }
  #nsl-panel .neon-rose { color: #fb7185; text-shadow: 0 0 10px rgba(251, 113, 133, 0.6), 0 0 25px rgba(251, 113, 133, 0.3); }

  #nsl-panel .drop-zone {
    border: 2px dashed rgba(255, 0, 110, 0.35);
    background: rgba(131, 56, 236, 0.05);
    transition: all 0.3s ease;
    position: relative; overflow: hidden;
    cursor: pointer;
  }
  #nsl-panel .drop-zone:hover, #nsl-panel .drop-zone.dragging {
    border-color: #ff006e;
    background: rgba(255, 0, 110, 0.08);
    box-shadow: 0 0 40px rgba(255, 0, 110, 0.25), inset 0 0 40px rgba(255, 0, 110, 0.05);
  }

  #nsl-panel .fx-btn {
    position: relative;
    background: linear-gradient(135deg, rgba(131, 56, 236, 0.12), rgba(255, 0, 110, 0.04));
    border: 1px solid rgba(131, 56, 236, 0.3);
    transition: all 0.3s ease;
    overflow: hidden;
    cursor: pointer;
    color: #fff;
  }
  #nsl-panel .fx-btn:hover:not(.active) {
    border-color: rgba(255, 0, 110, 0.6);
    box-shadow: 0 0 20px rgba(255, 0, 110, 0.3);
    transform: translateY(-2px);
  }
  #nsl-panel .fx-btn.active {
    border-color: #00f5ff;
    background: linear-gradient(135deg, rgba(0, 245, 255, 0.2), rgba(131, 56, 236, 0.12));
    box-shadow: 0 0 25px rgba(0, 245, 255, 0.5), inset 0 0 20px rgba(0, 245, 255, 0.15);
    color: #00f5ff;
    text-shadow: 0 0 10px rgba(0, 245, 255, 0.8);
  }
  #nsl-panel .fx-btn.active::after {
    content: '';
    position: absolute; bottom: 0; left: 0;
    width: 100%; height: 2px;
    background: linear-gradient(90deg, transparent, #00f5ff, #ff006e, transparent);
    animation: nsl-scan 2s infinite;
  }
  @keyframes nsl-scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

  #nsl-panel input[type="range"].neon-slider {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 8px;
    background: linear-gradient(90deg, rgba(255, 0, 110, 0.3), rgba(131, 56, 236, 0.3), rgba(0, 245, 255, 0.3));
    border-radius: 4px; outline: none;
    cursor: pointer;
  }
  #nsl-panel input[type="range"].neon-slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 24px; height: 24px;
    background: linear-gradient(135deg, #ff006e, #8338ec);
    border-radius: 50%; cursor: pointer;
    box-shadow: 0 0 15px rgba(255, 0, 110, 0.8), 0 0 5px #fff;
    border: 2px solid #fff;
    transition: all 0.2s;
  }
  #nsl-panel input[type="range"].neon-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
  #nsl-panel input[type="range"].neon-slider::-moz-range-thumb {
    width: 24px; height: 24px;
    background: linear-gradient(135deg, #ff006e, #8338ec);
    border-radius: 50%; cursor: pointer; border: 2px solid #fff;
    box-shadow: 0 0 15px rgba(255, 0, 110, 0.8);
  }
  #nsl-panel input[type="range"].slider-cyan::-webkit-slider-thumb {
    background: linear-gradient(135deg, #00f5ff, #8338ec);
    box-shadow: 0 0 15px rgba(0, 245, 255, 0.8), 0 0 5px #fff;
  }
  #nsl-panel input[type="range"].slider-cyan::-moz-range-thumb {
    background: linear-gradient(135deg, #00f5ff, #8338ec);
    box-shadow: 0 0 15px rgba(0, 245, 255, 0.8);
  }
  #nsl-panel input[type="range"].slider-yellow::-webkit-slider-thumb {
    background: linear-gradient(135deg, #ffbe0b, #ff006e);
    box-shadow: 0 0 15px rgba(255, 190, 11, 0.8), 0 0 5px #fff;
  }
  #nsl-panel input[type="range"].slider-yellow::-moz-range-thumb {
    background: linear-gradient(135deg, #ffbe0b, #ff006e);
    box-shadow: 0 0 15px rgba(255, 190, 11, 0.8);
  }
  #nsl-panel input[type="range"].slider-green::-webkit-slider-thumb {
    background: linear-gradient(135deg, #4ade80, #00f5ff);
    box-shadow: 0 0 15px rgba(74, 222, 128, 0.8), 0 0 5px #fff;
  }
  #nsl-panel input[type="range"].slider-green::-moz-range-thumb {
    background: linear-gradient(135deg, #4ade80, #00f5ff);
    box-shadow: 0 0 15px rgba(74, 222, 128, 0.8);
  }

  #nsl-panel .toggle-switch {
    position: relative;
    width: 64px; height: 32px;
    background: rgba(20, 5, 40, 0.8);
    border: 1px solid rgba(131, 56, 236, 0.4);
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.4);
  }
  #nsl-panel .toggle-switch:hover { border-color: rgba(251, 113, 133, 0.5); }
  #nsl-panel .toggle-switch .toggle-knob {
    position: absolute;
    top: 3px; left: 3px;
    width: 24px; height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6b7280, #4b5563);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }
  #nsl-panel .toggle-switch.active {
    background: linear-gradient(135deg, rgba(251, 113, 133, 0.25), rgba(168, 85, 247, 0.15));
    border-color: #fb7185;
    box-shadow: 0 0 25px rgba(251, 113, 133, 0.5), inset 0 0 12px rgba(251, 113, 133, 0.18);
  }
  #nsl-panel .toggle-switch.active .toggle-knob {
    left: 37px;
    background: linear-gradient(135deg, #fb7185, #a855f7);
    box-shadow: 0 0 15px rgba(251, 113, 133, 0.8), 0 0 4px #fff, inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  #nsl-panel .toggle-switch.active::before {
    content: '';
    position: absolute;
    bottom: -2px; left: 0;
    width: 100%; height: 2px;
    background: linear-gradient(90deg, transparent, #fb7185, #a855f7, transparent);
    animation: nsl-scan 2s infinite;
    border-radius: 999px;
  }
  #nsl-panel .toggle-status {
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid rgba(251, 113, 133, 0.35);
    color: rgba(251, 113, 133, 0.7);
    background: rgba(251, 113, 133, 0.06);
    transition: all 0.3s;
    white-space: nowrap;
  }
  #nsl-panel .toggle-status.on {
    color: #fb7185;
    background: rgba(251, 113, 133, 0.15);
    border-color: #fb7185;
    text-shadow: 0 0 10px rgba(251, 113, 133, 0.6);
  }

  #nsl-panel .export-btn {
    background: linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(131, 56, 236, 0.04));
    border: 1px solid rgba(0, 245, 255, 0.3);
    transition: all 0.3s ease;
    cursor: pointer;
    color: #fff;
  }
  #nsl-panel .export-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(0, 245, 255, 0.2), rgba(255, 0, 110, 0.1));
    border-color: #00f5ff;
    box-shadow: 0 0 25px rgba(0, 245, 255, 0.4);
    transform: translateY(-2px);
  }
  #nsl-panel .export-btn:disabled, #nsl-panel .export-btn.unavailable { opacity: 0.4; cursor: not-allowed; }

  #nsl-panel .glass {
    background: rgba(20, 5, 40, 0.55);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(131, 56, 236, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  #nsl-panel .play-btn {
    background: linear-gradient(135deg, #ff006e, #8338ec);
    box-shadow: 0 0 30px rgba(255, 0, 110, 0.5);
    transition: all 0.3s;
    cursor: pointer;
    color: #fff;
    border: none;
  }
  #nsl-panel .play-btn:hover { box-shadow: 0 0 50px rgba(255, 0, 110, 0.8); transform: scale(1.05); }
  #nsl-panel .play-btn:active { transform: scale(0.98); }

  #nsl-panel .toast-nsl {
    position: fixed; top: 30px; right: 30px; z-index: 2147483648;
    transform: translateX(120%);
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  #nsl-panel .toast-nsl.show { transform: translateX(0); }

  @keyframes nsl-spin { to { transform: rotate(360deg); } }
  #nsl-panel .nsl-spinner { border: 3px solid rgba(255, 255, 255, 0.1); border-top: 3px solid #00f5ff; border-radius: 50%; animation: nsl-spin 1s linear infinite; }

  #nsl-panel .tag {
    background: rgba(255, 0, 110, 0.15);
    border: 1px solid rgba(255, 0, 110, 0.4);
    color: #ff006e;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  #nsl-panel .visualizer-container {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(131, 56, 236, 0.3);
    box-shadow: inset 0 0 40px rgba(131, 56, 236, 0.15);
    position: relative; overflow: hidden;
  }

  @keyframes nsl-pulse-rec {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 0, 110, 0.6); }
    50% { box-shadow: 0 0 20px rgba(255, 0, 110, 1); }
  }
  #nsl-panel .recording-indicator { animation: nsl-pulse-rec 1.5s infinite; }

  #nsl-panel .section-label {
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 500;
  }

  #nsl-panel .progress-bar {
    background: rgba(255, 255, 255, 0.05);
    height: 4px; border-radius: 2px; overflow: hidden;
  }
  #nsl-panel .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff006e, #00f5ff);
    box-shadow: 0 0 10px #ff006e;
    transition: width 0.1s linear;
  }

  #nsl-panel .scanline {
    position: absolute; top: 0; bottom: 0; width: 2px;
    background: linear-gradient(180deg, transparent, #00f5ff, transparent);
    box-shadow: 0 0 15px #00f5ff;
    pointer-events: none;
    transition: left 0.1s linear;
    opacity: 0;
  }
  #nsl-panel .scanline.active { opacity: 1; }

  #nsl-panel .canvas-wrap { position: relative; cursor: pointer; }
  #nsl-panel .canvas-wrap canvas { display: block; width: 100%; }

  #nsl-panel .slider-row {
    background: rgba(131, 56, 236, 0.05);
    border: 1px solid rgba(131, 56, 236, 0.15);
    border-radius: 12px;
    padding: 18px 20px;
    transition: all 0.3s;
  }
  #nsl-panel .slider-row:hover { border-color: rgba(255, 0, 110, 0.3); }

  #nsl-panel select {
    background: rgba(20, 5, 40, 0.8);
    border: 1px solid rgba(131, 56, 236, 0.3);
    color: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    outline: none;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
  }
  #nsl-panel select:focus { border-color: #00f5ff; box-shadow: 0 0 10px rgba(0, 245, 255, 0.3); }

  #nsl-panel .nsl-hidden { display: none !important; }

  #nsl-panel .nsl-scroll::-webkit-scrollbar { width: 8px; }
  #nsl-panel .nsl-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
  #nsl-panel .nsl-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #ff006e, #8338ec); border-radius: 4px; }
  `;
  document.head.appendChild(NSL_STYLE);

  // ====================================================================
  // 2. CARGA DE RECURSOS EXTERNOS (CDN, sin redirección)
  // ====================================================================
  function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed: ' + src));
      document.head.appendChild(s);
    });
  }

  function loadExternalStyle(href) {
    return new Promise((resolve, reject) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = () => resolve();
      l.onerror = () => reject(new Error('Failed: ' + href));
      document.head.appendChild(l);
    });
  }

  // Tailwind (configurado con clases limitadas para no romper el host)
  const tailwindConfig = document.createElement('script');
  tailwindConfig.textContent = `
    window.tailwind = window.tailwind || {};
    tailwind.config = { important: true, prefix: 'nsl-' };
  `;
  document.head.appendChild(tailwindConfig);

  Promise.allSettled([
    loadExternalScript('https://cdn.tailwindcss.com'),
    loadExternalStyle('https://fonts.googleapis.com/css2?family=Audiowide&family=Space+Grotesk:wght@300;400;500;600;700&display=swap')
  ]).then(() => {
    // Tailwind cargado: las clases se aplican dentro de #nsl-panel
  });

  // ====================================================================
  // 3. BOTÓN FLOTANTE (FAB)
  // ====================================================================
  const fab = document.createElement('div');
  fab.id = 'nsl-fab';
  fab.title = 'NEON SOUND LAB — Abrir editor de audio';
  fab.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
  </svg>`;
  document.body.appendChild(fab);

  // ====================================================================
  // 4. OVERLAY CON EL EDITOR
  // ====================================================================
  const overlay = document.createElement('div');
  overlay.id = 'nsl-overlay';
  overlay.innerHTML = `
    <div id="nsl-panel" class="nsl-scroll">
      <button id="nsl-close" title="Cerrar">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>

      <div class="toast-nsl glass px-5 py-3 rounded-lg flex items-center gap-3" id="nsl-toast">
        <div id="nsl-toastIcon" class="w-2 h-2 rounded-full bg-cyan-400"></div>
        <span id="nsl-toastMessage" class="text-sm"></span>
      </div>

      <div class="relative z-10 max-w-6xl mx-auto px-4 py-8">

        <header class="mb-8">
          <div class="flex items-center gap-3 mb-2 flex-wrap">
            <div class="w-1 h-8 bg-gradient-to-b from-pink-500 to-purple-600 rounded-full"></div>
            <span class="tag px-2 py-1 rounded">v2.4 // AUDIO LAB</span>
            <span class="tag px-2 py-1 rounded" data-i18n="tag_seek" style="background:rgba(0,245,255,.15);border-color:rgba(0,245,255,.4);color:#00f5ff">SEEK ACTIVO</span>
            <span class="tag px-2 py-1 rounded" data-i18n="tag_local" style="background:rgba(255,190,11,.15);border-color:rgba(255,190,11,.4);color:#ffbe0b">100% LOCAL</span>
            <div class="ml-auto flex items-center gap-2">
              <select id="langSelect">
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="zh">中文 (Mandarín)</option>
                <option value="ja">日本語 (Japonés)</option>
                <option value="ko">한국어 (Coreano)</option>
              </select>
            </div>
          </div>
          <h1 class="display-font text-4xl md:text-6xl lg:text-7xl mb-2 leading-tight">
            <span class="neon-pink">NEON</span> <span class="neon-cyan">SOUND</span> <span class="text-white">LAB</span>
          </h1>
          <p class="text-purple-200/60 text-sm md:text-base max-w-2xl" data-i18n="app_subtitle">Sube tu audio · Controla velocidad, reverb, tono y 432Hz · Haz clic en la onda para navegar · Exporta en WAV, MP3 u OGG</p>
        </header>

        <div id="dropZone" class="drop-zone rounded-xl p-12 mb-6 text-center cursor-pointer">
          <input type="file" id="fileInput" accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg,audio/x-wav" class="nsl-hidden">
          <div class="flex flex-col items-center gap-4 relative z-10">
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center border border-pink-500/30">
              <svg class="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
              </svg>
            </div>
            <div>
              <h3 class="display-font text-2xl text-white mb-1" data-i18n="drop_title">ARRASTRA TU AUDIO</h3>
              <p class="text-purple-200/60 text-sm" data-i18n="drop_subtitle">o haz clic para explorar tus archivos</p>
            </div>
            <div class="flex gap-2 mt-2">
              <span class="tag px-3 py-1 rounded">MP3</span>
              <span class="tag px-3 py-1 rounded" style="background:rgba(0,245,255,.15);border-color:rgba(0,245,255,.4);color:#00f5ff">WAV</span>
              <span class="tag px-3 py-1 rounded" style="background:rgba(255,190,11,.15);border-color:rgba(255,190,11,.4);color:#ffbe0b">OGG</span>
            </div>
          </div>
        </div>

        <div id="editor" class="nsl-hidden space-y-6">

          <div class="glass rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500/30 to-purple-600/30 flex items-center justify-center border border-pink-500/30">
                <svg class="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
                </svg>
              </div>
              <div>
                <div id="fileName" class="text-white font-medium">audio.mp3</div>
                <div class="flex gap-2 text-xs text-purple-200/60 mt-1 flex-wrap">
                  <span id="fileFormat">MP3</span><span>·</span>
                  <span id="fileDuration">0:00</span><span>·</span>
                  <span id="fileChannels">2 CH</span><span>·</span>
                  <span id="fileSampleRate">44.1 kHz</span>
                </div>
              </div>
            </div>
            <button id="changeFile" class="px-4 py-2 text-xs text-purple-200/80 hover:text-white border border-purple-500/30 hover:border-pink-500/50 rounded transition-all" data-i18n="change_file">
              Cambiar archivo
            </button>
          </div>

          <div class="visualizer-container rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="section-label" data-i18n="waveform_label">Waveform (Clic para navegar)</span>
              <span id="currentTime" class="text-cyan-300 text-sm font-mono">0:00 / 0:00</span>
            </div>
            <div class="canvas-wrap" id="waveformWrap">
              <canvas id="waveformCanvas" style="height: 120px;"></canvas>
              <div id="waveformScan" class="scanline"></div>
            </div>
            <div class="progress-bar mt-3">
              <div id="progressFill" class="progress-fill" style="width: 0%"></div>
            </div>
          </div>

          <div class="visualizer-container rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="section-label" data-i18n="spectrum_label">Spectrum Analyzer</span>
              <div class="flex items-center gap-2">
                <div id="recordingDot" class="w-2 h-2 rounded-full bg-purple-500/40"></div>
                <span id="statusText" class="text-purple-200/60 text-xs">Ready</span>
              </div>
            </div>
            <canvas id="spectrumCanvas" style="height: 140px;"></canvas>
          </div>

          <div class="glass rounded-xl p-4 flex items-center gap-4 flex-wrap">
            <button id="playBtn" class="play-btn w-14 h-14 rounded-full flex items-center justify-center text-white">
              <svg id="playIcon" class="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <svg id="pauseIcon" class="w-6 h-6 nsl-hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
            </button>
            <button id="stopBtn" class="w-12 h-12 rounded-full border border-purple-500/30 hover:border-pink-500/60 flex items-center justify-center text-purple-200 transition-all">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
            </button>
            <div class="flex-1 min-w-[100px]"></div>
            <div class="text-right">
              <div class="section-label" data-i18n="output_label">Output</div>
              <div id="outputInfo" class="text-cyan-300 text-sm font-mono">--</div>
            </div>
          </div>

          <div class="glass rounded-xl p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-1 h-5 bg-gradient-to-b from-pink-500 to-purple-600 rounded-full"></div>
              <h2 class="display-font text-lg text-white" data-i18n="presets_title">PRESETS DE VELOCIDAD</h2>
              <span class="text-xs text-purple-200/40 ml-2" data-i18n="presets_desc">solo cambian la velocidad, el pitch se mantiene intacto</span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button class="fx-btn rounded-lg p-4 flex flex-col items-center gap-2 active" data-preset="normal">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/></svg>
                <div class="text-xs font-medium tracking-wider">ORIGINAL</div>
                <div class="text-[10px] text-purple-200/40">1.00x</div>
              </button>
              <button class="fx-btn rounded-lg p-4 flex flex-col items-center gap-2" data-preset="slowed">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
                <div class="text-xs font-medium tracking-wider">SLOWED</div>
                <div class="text-[10px] text-purple-200/40">0.85x</div>
              </button>
              <button class="fx-btn rounded-lg p-4 flex flex-col items-center gap-2" data-preset="spedup">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                <div class="text-xs font-medium tracking-wider">SPED UP</div>
                <div class="text-[10px] text-purple-200/40">1.25x</div>
              </button>
              <button class="fx-btn rounded-lg p-4 flex flex-col items-center gap-2" data-preset="nightcore">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <div class="text-xs font-medium tracking-wider">NIGHTCORE</div>
                <div class="text-[10px] text-purple-200/40">1.35x</div>
              </button>
            </div>
          </div>

          <div class="glass rounded-xl p-6">
            <div class="flex items-center gap-2 mb-5">
              <div class="w-1 h-5 bg-gradient-to-b from-cyan-500 to-pink-600 rounded-full"></div>
              <h2 class="display-font text-lg text-white" data-i18n="controls_title">CONTROLES</h2>
              <span class="text-xs text-purple-200/40 ml-2" data-i18n="controls_desc">cada efecto es independiente</span>
            </div>

            <div class="space-y-3">

              <div class="slider-row">
                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <svg class="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-white" data-i18n="speed_title">Velocidad (Slowed / Sped Up)</div>
                      <div class="text-xs text-purple-200/50" data-i18n="speed_desc">Cambia el tempo de la canción</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span id="speedValue" class="display-font text-xl neon-pink">1.00x</span>
                  </div>
                </div>
                <input type="range" id="speedSlider" min="50" max="200" value="100" step="1" class="neon-slider">
                <div class="flex justify-between text-xs text-purple-200/40 mt-2 px-1">
                  <span>0.50x</span><span>0.75x</span><span>1.00x</span><span>1.50x</span><span>2.00x</span>
                </div>
              </div>

              <div class="slider-row">
                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8m-4-11v4"/></svg>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-white" data-i18n="reverb_title">Reverb</div>
                      <div class="text-xs text-purple-200/50" data-i18n="reverb_desc">Añade espacio y profundidad — ajusta la mezcla</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span id="reverbValue" class="display-font text-xl neon-cyan">0%</span>
                  </div>
                </div>
                <input type="range" id="reverbSlider" min="0" max="100" value="0" step="1" class="neon-slider slider-cyan">
                <div class="flex justify-between text-xs text-purple-200/40 mt-2 px-1">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>

              <div class="slider-row">
                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h2l2-9 4 18 3-12 2 5h5"/></svg>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-white" data-i18n="pitch_title">Pitch / Tono</div>
                      <div class="text-xs text-purple-200/50" data-i18n="pitch_desc">Sube o baja el tono sin cambiar la velocidad</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span id="pitchValue" class="display-font text-xl neon-yellow">0 st</span>
                  </div>
                </div>
                <input type="range" id="pitchSlider" min="-12" max="12" value="0" step="1" class="neon-slider slider-yellow">
                <div class="flex justify-between text-xs text-purple-200/40 mt-2 px-1">
                  <span>-12</span><span>-6</span><span>0</span><span>+6</span><span>+12</span>
                </div>
              </div>

              <div class="slider-row">
                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-white" data-i18n="hz432_title">Afinación 432Hz</div>
                      <div class="text-xs text-purple-200/50" data-i18n="hz432_desc">Baja la afinación estándar a 432Hz (más suave y relajante)</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span id="hz432Value" class="display-font text-xl neon-green">0%</span>
                  </div>
                </div>
                <input type="range" id="hz432Slider" min="0" max="100" value="0" step="1" class="neon-slider slider-green">
                <div class="flex justify-between text-xs text-purple-200/40 mt-2 px-1">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>

              <div class="slider-row" style="border-color: rgba(251, 113, 133, 0.18);">
                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: rgba(251, 113, 133, 0.18);">
                      <svg class="w-4 h-4" style="color: #fb7185;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v16h4V8h4v12h4V4H4zm12 0v8h4v8"/>
                      </svg>
                    </div>
                    <div class="flex-1 min-w-[180px]">
                      <div class="text-sm font-medium text-white flex items-center gap-2 flex-wrap">
                        <span data-i18n="hz285_title">Re-afinación 285Hz (Solfeggio)</span>
                        <span class="tag px-1.5 py-0.5 rounded" style="background:rgba(251,113,133,.15);border-color:rgba(251,113,133,.4);color:#fb7185;">SOLFEGGIO</span>
                      </div>
                      <div class="text-xs text-purple-200/50" data-i18n="hz285_desc">Re-afina a C#4=285Hz · A4=452.41Hz · +48.15 cents — proceso instantáneo ON/OFF (a diferencia del slider 432Hz)</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span id="hz285Status" class="toggle-status">OFF</span>
                    <div id="hz285Toggle" class="toggle-switch" role="switch" aria-checked="false" tabindex="0">
                      <div class="toggle-knob"></div>
                    </div>
                  </div>
                </div>
                <div class="flex justify-between text-xs text-purple-200/40 mt-2 px-1">
                  <span data-i18n="hz285_help_off">Click en el interruptor para activar la re-afinación Solfeggio</span>
                </div>
              </div>

            </div>
          </div>

          <div class="glass rounded-xl p-6">
            <div class="flex items-center gap-2 mb-5">
              <div class="w-1 h-5 bg-gradient-to-b from-cyan-500 to-pink-600 rounded-full"></div>
              <h2 class="display-font text-lg text-white" data-i18n="export_title">EXPORTAR</h2>
              <span class="text-xs text-purple-200/40 ml-2" data-i18n="export_desc">aplica los efectos actuales y descarga</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button id="exportWav" class="export-btn rounded-lg p-4 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <span class="display-font text-cyan-300">W</span>
                  </div>
                  <div class="text-left">
                    <div class="text-sm font-medium text-white">WAV</div>
                    <div class="text-xs text-purple-200/60" data-i18n="wav_desc">Sin pérdida · PCM</div>
                  </div>
                </div>
                <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              </button>

              <button id="exportMp3" class="export-btn rounded-lg p-4 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <span class="display-font text-pink-300">M</span>
                  </div>
                  <div class="text-left">
                    <div class="text-sm font-medium text-white">MP3</div>
                    <div class="text-xs text-purple-200/60" id="mp3Status">192 kbps · comprimido</div>
                  </div>
                </div>
                <svg class="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              </button>

              <button id="exportOgg" class="export-btn rounded-lg p-4 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <span class="display-font text-yellow-300">O</span>
                  </div>
                  <div class="text-left">
                    <div class="text-sm font-medium text-white">OGG</div>
                    <div class="text-xs text-purple-200/60" id="oggStatus">Vorbis · eficiente</div>
                  </div>
                </div>
                <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              </button>
            </div>

            <div id="exportProgress" class="nsl-hidden mt-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-cyan-300 flex items-center gap-2" id="exportStatus">
                  <div class="nsl-spinner w-4 h-4"></div>
                  Renderizando...
                </span>
                <span class="text-xs text-purple-200/60 font-mono" id="exportPercent">0%</span>
              </div>
              <div class="progress-bar">
                <div id="exportProgressFill" class="progress-fill" style="width: 0%"></div>
              </div>
            </div>
          </div>

          <footer class="text-center text-xs text-purple-200/30 py-4">
            NEON SOUND LAB · Web Audio API · 100% Local · Userscript Tampermonkey
          </footer>

        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ====================================================================
  // 5. TOGGLE DEL OVERLAY
  // ====================================================================
  fab.addEventListener('click', () => {
    overlay.classList.add('nsl-open');
    // Repinta los canvas al abrir (asegura dimensiones correctas)
    setTimeout(() => {
      if (audioBuffer) drawWaveform();
      if (!isPlaying) drawSpectrumIdle();
    }, 50);
  });

  document.getElementById('nsl-close').addEventListener('click', () => {
    overlay.classList.remove('nsl-open');
    // Pausa el audio al cerrar para no dejar audio corriendo
    if (isPlaying) pause();
  });

  // ESC para cerrar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('nsl-open')) {
      overlay.classList.remove('nsl-open');
      if (isPlaying) pause();
    }
  });

  // ====================================================================
  // 6. LÓGICA DEL EDITOR (idéntica al HTML original)
  // ====================================================================

  // --- TRADUCCIONES ---
  const i18n = {
    es: {
      app_subtitle: "Sube tu audio · Controla velocidad, reverb, tono y 432Hz · Haz clic en la onda para navegar · Exporta en WAV, MP3 u OGG",
      tag_seek: "SEEK ACTIVO", tag_local: "100% LOCAL",
      drop_title: "ARRASTRA TU AUDIO", drop_subtitle: "o haz clic para explorar tus archivos",
      change_file: "Cambiar archivo",
      waveform_label: "Waveform (Clic para navegar)", spectrum_label: "Spectrum Analyzer",
      presets_title: "PRESETS DE VELOCIDAD", presets_desc: "solo cambian la velocidad, el pitch se mantiene intacto",
      controls_title: "CONTROLES", controls_desc: "cada efecto es independiente",
      speed_title: "Velocidad (Slowed / Sped Up)", speed_desc: "Cambia el tempo de la canción",
      reverb_title: "Reverb", reverb_desc: "Añade espacio y profundidad — ajusta la mezcla",
      pitch_title: "Pitch / Tono", pitch_desc: "Sube o baja el tono sin cambiar la velocidad",
      hz432_title: "Afinación 432Hz", hz432_desc: "Baja la afinación estándar a 432Hz (más suave y relajante)",
      hz285_title: "Re-afinación 285Hz (Solfeggio)",
      hz285_desc: "Re-afina a C#4=285Hz · A4=452.41Hz · +48.15 cents — proceso instantáneo ON/OFF (a diferencia del slider 432Hz)",
      hz285_on: "ON", hz285_off: "OFF",
      hz285_help_off: "Click en el interruptor para activar la re-afinación Solfeggio",
      export_title: "EXPORTAR", export_desc: "aplica los efectos actuales y descarga",
      output_label: "Output",
      wav_desc: "Sin pérdida · PCM",
      mp3_desc_ready: "192 kbps · listo", mp3_desc_unavail: "No disponible",
      ogg_desc_ready: "Vorbis · listo", ogg_desc_unavail: "No disponible",
      status_ready: "Ready", status_playing: "Playing", status_paused: "Paused",
      err_format: "Formato no soportado. Usa MP3, WAV u OGG.",
      err_decode: "Error al decodificar el audio.",
      err_no_audio: "Primero carga un archivo de audio",
      err_mp3_ready: "El codificador MP3 no está listo todavía. Intenta WAV.",
      err_ogg_unavail: "OGG no disponible en este navegador. Usa WAV o MP3.",
      err_export: "Error al exportar {ext}: {msg}",
      info_decoding: "Decodificando audio...", info_loaded: "Audio cargado correctamente",
      info_rendering: "Renderizando audio...", info_render_complete: "Render completo",
      info_preparing_wav: "Preparando render WAV...", info_encoding_wav: "Codificando WAV...",
      info_preparing_mp3: "Preparando render MP3...", info_encoding_mp3: "Codificando MP3 (192 kbps)...",
      info_preparing_ogg: "Preparando render OGG...", info_encoding_ogg: "Codificando OGG Vorbis...",
      info_download_ready: "Descarga lista",
      success_wav: "WAV exportado correctamente", success_mp3: "MP3 exportado correctamente",
      success_ogg: "OGG exportado correctamente"
    },
    en: {
      app_subtitle: "Upload your audio · Control speed, reverb, pitch and 432Hz · Click the wave to navigate · Export to WAV, MP3 or OGG",
      tag_seek: "SEEK ACTIVE", tag_local: "100% LOCAL",
      drop_title: "DRAG YOUR AUDIO", drop_subtitle: "or click to browse your files",
      change_file: "Change file",
      waveform_label: "Waveform (Click to seek)", spectrum_label: "Spectrum Analyzer",
      presets_title: "SPEED PRESETS", presets_desc: "only change speed, pitch remains intact",
      controls_title: "CONTROLS", controls_desc: "each effect is independent",
      speed_title: "Speed (Slowed / Sped Up)", speed_desc: "Change the song tempo",
      reverb_title: "Reverb", reverb_desc: "Adds space and depth — adjust the mix",
      pitch_title: "Pitch / Tone", pitch_desc: "Raise or lower the pitch without changing speed",
      hz432_title: "432Hz Tuning", hz432_desc: "Lower standard tuning to 432Hz (smoother and relaxing)",
      hz285_title: "285Hz Retune (Solfeggio)",
      hz285_desc: "Retunes to C#4=285Hz · A4=452.41Hz · +48.15 cents — instant ON/OFF (unlike the 432Hz slider)",
      hz285_on: "ON", hz285_off: "OFF",
      hz285_help_off: "Click the switch to activate the Solfeggio retune",
      export_title: "EXPORT", export_desc: "apply current effects and download",
      output_label: "Output",
      wav_desc: "Lossless · PCM",
      mp3_desc_ready: "192 kbps · ready", mp3_desc_unavail: "Unavailable",
      ogg_desc_ready: "Vorbis · ready", ogg_desc_unavail: "Unavailable",
      status_ready: "Ready", status_playing: "Playing", status_paused: "Paused",
      err_format: "Unsupported format. Use MP3, WAV or OGG.",
      err_decode: "Error decoding audio.",
      err_no_audio: "Load an audio file first",
      err_mp3_ready: "MP3 encoder is not ready yet. Try WAV.",
      err_ogg_unavail: "OGG not available in this browser. Use WAV or MP3.",
      err_export: "Error exporting {ext}: {msg}",
      info_decoding: "Decoding audio...", info_loaded: "Audio loaded successfully",
      info_rendering: "Rendering audio...", info_render_complete: "Render complete",
      info_preparing_wav: "Preparing WAV render...", info_encoding_wav: "Encoding WAV...",
      info_preparing_mp3: "Preparing MP3 render...", info_encoding_mp3: "Encoding MP3 (192 kbps)...",
      info_preparing_ogg: "Preparing OGG render...", info_encoding_ogg: "Encoding OGG Vorbis...",
      info_download_ready: "Download ready",
      success_wav: "WAV exported successfully", success_mp3: "MP3 exported successfully",
      success_ogg: "OGG exported successfully"
    },
    zh: {
      app_subtitle: "上传你的音频 · 控制速度、混响、音高和432Hz · 点击波形导航 · 导出为 WAV、MP3 或 OGG",
      tag_seek: "跳转激活", tag_local: "100% 本地",
      drop_title: "拖拽你的音频", drop_subtitle: "或点击浏览你的文件",
      change_file: "更改文件",
      waveform_label: "波形 (点击跳转)", spectrum_label: "频谱分析仪",
      presets_title: "速度预设", presets_desc: "仅改变速度，音高保持不变",
      controls_title: "控制", controls_desc: "每个效果独立",
      speed_title: "速度 (Slowed / Sped Up)", speed_desc: "改变歌曲节奏",
      reverb_title: "混响", reverb_desc: "增加空间和深度 — 调整混合",
      pitch_title: "音高 / 音调", pitch_desc: "在不改变速度的情况下升高或降低音调",
      hz432_title: "432Hz 调音", hz432_desc: "将标准调音降至432Hz (更平滑放松)",
      hz285_title: "285Hz 重新调音 (Solfeggio)",
      hz285_desc: "重新调音至 C#4=285Hz · A4=452.41Hz · +48.15 音分 — 即时 ON/OFF (不同于 432Hz 滑块)",
      hz285_on: "开", hz285_off: "关",
      hz285_help_off: "点击开关以激活 Solfeggio 重新调音",
      export_title: "导出", export_desc: "应用当前效果并下载",
      output_label: "输出",
      wav_desc: "无损 · PCM",
      mp3_desc_ready: "192 kbps · 就绪", mp3_desc_unavail: "不可用",
      ogg_desc_ready: "Vorbis · 就绪", ogg_desc_unavail: "不可用",
      status_ready: "就绪", status_playing: "播放中", status_paused: "已暂停",
      err_format: "格式不支持。请使用 MP3、WAV 或 OGG。",
      err_decode: "解码音频出错。",
      err_no_audio: "请先加载音频文件",
      err_mp3_ready: "MP3 编码器尚未就绪。请尝试 WAV。",
      err_ogg_unavail: "此浏览器不支持 OGG。请使用 WAV 或 MP3。",
      err_export: "导出 {ext} 出错: {msg}",
      info_decoding: "解码音频中...", info_loaded: "音频加载成功",
      info_rendering: "渲染音频中...", info_render_complete: "渲染完成",
      info_preparing_wav: "准备 WAV 渲染...", info_encoding_wav: "编码 WAV 中...",
      info_preparing_mp3: "准备 MP3 渲染...", info_encoding_mp3: "编码 MP3 (192 kbps) 中...",
      info_preparing_ogg: "准备 OGG 渲染...", info_encoding_ogg: "编码 OGG Vorbis 中...",
      info_download_ready: "下载就绪",
      success_wav: "WAV 导出成功", success_mp3: "MP3 导出成功", success_ogg: "OGG 导出成功"
    },
    ja: {
      app_subtitle: "オーディオをアップロード · 速度、リバーブ、ピッチ、432Hzを調整 · 波形をクリックしてシーク · WAV、MP3、OGGでエクスポート",
      tag_seek: "シーク有効", tag_local: "100% ローカル",
      drop_title: "オーディオをドラッグ", drop_subtitle: "またはクリックしてファイルを選択",
      change_file: "ファイルを変更",
      waveform_label: "波形 (クリックでシーク)", spectrum_label: "スペクトラムアナライザー",
      presets_title: "スピードプリセット", presets_desc: "速度のみ変更、ピッチは維持",
      controls_title: "コントロール", controls_desc: "各エフェクトは独立",
      speed_title: "スピード (Slowed / Sped Up)", speed_desc: "曲のテンポを変更",
      reverb_title: "リバーブ", reverb_desc: "空間と深みを追加 — ミックスを調整",
      pitch_title: "ピッチ / 音程", pitch_desc: "速度を変えずにピッチを上下",
      hz432_title: "432Hz チューニング", hz432_desc: "標準チューニングを432Hzに下げる (滑らかでリラックス)",
      hz285_title: "285Hz 再チューニング (Solfeggio)",
      hz285_desc: "C#4=285Hz · A4=452.41Hz · +48.15セントに再チューニング — 即時 ON/OFF (432Hzスライダーとは異なる)",
      hz285_on: "オン", hz285_off: "オフ",
      hz285_help_off: "スイッチをクリックしてSolfeggio再チューニングを有効化",
      export_title: "エクスポート", export_desc: "現在のエフェクトを適用してダウンロード",
      output_label: "出力",
      wav_desc: "ロスレス · PCM",
      mp3_desc_ready: "192 kbps · 準備完了", mp3_desc_unavail: "利用不可",
      ogg_desc_ready: "Vorbis · 準備完了", ogg_desc_unavail: "利用不可",
      status_ready: "準備完了", status_playing: "再生中", status_paused: "一時停止",
      err_format: "対応外の形式です。MP3、WAV、またはOGGを使用してください。",
      err_decode: "オーディオのデコードエラー。",
      err_no_audio: "最初にオーディオファイルを読み込んでください",
      err_mp3_ready: "MP3エンコーダーの準備ができていません。WAVを試してください。",
      err_ogg_unavail: "このブラウザではOGGを利用できません。WAVまたはMP3を使用してください。",
      err_export: "{ext}のエクスポートエラー: {msg}",
      info_decoding: "オーディオをデコード中...", info_loaded: "オーディオの読み込みに成功しました",
      info_rendering: "オーディオをレンダリング中...", info_render_complete: "レンダリング完了",
      info_preparing_wav: "WAVレンダリングを準備中...", info_encoding_wav: "WAVをエンコード中...",
      info_preparing_mp3: "MP3レンダリングを準備中...", info_encoding_mp3: "MP3をエンコード中 (192 kbps)...",
      info_preparing_ogg: "OGGレンダリングを準備中...", info_encoding_ogg: "OGG Vorbisをエンコード中...",
      info_download_ready: "ダウンロード準備完了",
      success_wav: "WAVのエクスポートに成功しました", success_mp3: "MP3のエクスポートに成功しました",
      success_ogg: "OGGのエクスポートに成功しました"
    },
    ko: {
      app_subtitle: "오디오 업로드 · 속도, 리버브, 피치, 432Hz 제어 · 파형 클릭으로 탐색 · WAV, MP3, OGG로 내보내기",
      tag_seek: "시크 활성화", tag_local: "100% 로컬",
      drop_title: "오디오를 드래그하세요", drop_subtitle: "또는 클릭하여 파일 탐색",
      change_file: "파일 변경",
      waveform_label: "파형 (클릭하여 탐색)", spectrum_label: "스펙트럼 분석기",
      presets_title: "속도 프리셋", presets_desc: "속도만 변경, 피치는 유지",
      controls_title: "컨트롤", controls_desc: "각 효과는 독립적",
      speed_title: "속도 (Slowed / Sped Up)", speed_desc: "곡의 템포 변경",
      reverb_title: "리버브", reverb_desc: "공간과 깊이 추가 — 믹스 조정",
      pitch_title: "피치 / 음정", pitch_desc: "속도 변경 없이 피치 업/다운",
      hz432_title: "432Hz 튜닝", hz432_desc: "표준 튜닝을 432Hz로 낮춤 (부드럽고 편안함)",
      hz285_title: "285Hz 재튜닝 (Solfeggio)",
      hz285_desc: "C#4=285Hz · A4=452.41Hz · +48.15센트로 재튜닝 — 즉시 ON/OFF (432Hz 슬라이더와 다름)",
      hz285_on: "켜짐", hz285_off: "꺼짐",
      hz285_help_off: "스위치를 클릭하여 Solfeggio 재튜닝 활성화",
      export_title: "내보내기", export_desc: "현재 효과 적용 및 다운로드",
      output_label: "출력",
      wav_desc: "무손실 · PCM",
      mp3_desc_ready: "192 kbps · 준비됨", mp3_desc_unavail: "사용 불가",
      ogg_desc_ready: "Vorbis · 준비됨", ogg_desc_unavail: "사용 불가",
      status_ready: "준비됨", status_playing: "재생 중", status_paused: "일시정지",
      err_format: "지원되지 않는 형식입니다. MP3, WAV 또는 OGG를 사용하세요.",
      err_decode: "오디오 디코딩 오류.",
      err_no_audio: "먼저 오디오 파일을 로드하세요",
      err_mp3_ready: "MP3 인코더가 아직 준비되지 않았습니다. WAV를 시도하세요.",
      err_ogg_unavail: "이 브라우저에서는 OGG를 사용할 수 없습니다. WAV 또는 MP3를 사용하세요.",
      err_export: "{ext} 내보내기 오류: {msg}",
      info_decoding: "오디오 디코딩 중...", info_loaded: "오디오가 성공적으로 로드되었습니다",
      info_rendering: "오디오 렌더링 중...", info_render_complete: "렌더링 완료",
      info_preparing_wav: "WAV 렌더링 준비 중...", info_encoding_wav: "WAV 인코딩 중...",
      info_preparing_mp3: "MP3 렌더링 준비 중...", info_encoding_mp3: "MP3 인코딩 중 (192 kbps)...",
      info_preparing_ogg: "OGG 렌더링 준비 중...", info_encoding_ogg: "OGG Vorbis 인코딩 중...",
      info_download_ready: "다운로드 준비 완료",
      success_wav: "WAV 내보내기 성공", success_mp3: "MP3 내보내기 성공", success_ogg: "OGG 내보내기 성공"
    }
  };

  let currentLang = 'es';

  function t(key, replacements = {}) {
    let str = i18n[currentLang][key] || i18n.es[key] || key;
    for (const [k, v] of Object.entries(replacements)) {
      str = str.replace(`{${k}}`, v);
    }
    return str;
  }

  function setLanguage(lang) {
    currentLang = lang;
    const panel = document.getElementById('nsl-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (i18n[lang][key]) el.textContent = i18n[lang][key];
    });

    if (!audioBuffer) statusText.textContent = t('status_ready');
    else if (isPlaying) statusText.textContent = t('status_playing');
    else if (isPaused) statusText.textContent = t('status_paused');

    if (lamejsReady) document.getElementById('mp3Status').textContent = t('mp3_desc_ready');
    else document.getElementById('mp3Status').textContent = t('mp3_desc_unavail');

    if (vorbisEncoderAvailable) document.getElementById('oggStatus').textContent = t('ogg_desc_ready');
    else document.getElementById('oggStatus').textContent = t('ogg_desc_unavail');

    if (hz285StatusEl) hz285StatusEl.textContent = state.hz285 ? t('hz285_on') : t('hz285_off');
  }

  // --- ESTADO ---
  let audioContext = null;
  let audioBuffer = null;
  let sourceNode = null;
  let analyserNode = null;
  let convolverNode = null;
  let dryGainNode = null;
  let wetGainNode = null;
  let masterGainNode = null;
  let isPlaying = false;
  let isPaused = false;
  let startTime = 0;
  let pausedAt = 0;
  let animationFrame = null;
  let lamejsReady = (typeof lamejs !== 'undefined');
  let vorbisEncoderAvailable = false;

  const state = {
    speed: 1.0,
    reverb: 0.0,
    pitch: 0,
    hz432: 0.0,
    hz285: false,
  };

  const HZ_285_CENTS = 48.15;
  const HZ_432_CENTS = -31.76665;

  const presets = {
    normal:    { speed: 1.00 },
    slowed:    { speed: 0.85 },
    spedup:    { speed: 1.25 },
    nightcore: { speed: 1.35 }
  };

  // --- DOM ---
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const editor = document.getElementById('editor');
  const changeFileBtn = document.getElementById('changeFile');
  const playBtn = document.getElementById('playBtn');
  const stopBtn = document.getElementById('stopBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const speedSlider = document.getElementById('speedSlider');
  const speedValueEl = document.getElementById('speedValue');
  const reverbSlider = document.getElementById('reverbSlider');
  const reverbValueEl = document.getElementById('reverbValue');
  const pitchSlider = document.getElementById('pitchSlider');
  const pitchValueEl = document.getElementById('pitchValue');
  const hz432Slider = document.getElementById('hz432Slider');
  const hz432ValueEl = document.getElementById('hz432Value');
  const hz285Toggle = document.getElementById('hz285Toggle');
  const hz285StatusEl = document.getElementById('hz285Status');
  const waveformCanvas = document.getElementById('waveformCanvas');
  const spectrumCanvas = document.getElementById('spectrumCanvas');
  const waveformScan = document.getElementById('waveformScan');
  const currentTimeEl = document.getElementById('currentTime');
  const progressFill = document.getElementById('progressFill');
  const recordingDot = document.getElementById('recordingDot');
  const statusText = document.getElementById('statusText');
  const outputInfo = document.getElementById('outputInfo');
  const exportProgress = document.getElementById('exportProgress');
  const exportStatus = document.getElementById('exportStatus');
  const exportPercent = document.getElementById('exportPercent');
  const exportProgressFill = document.getElementById('exportProgressFill');

  const waveformCtx = waveformCanvas.getContext('2d');
  const spectrumCtx = spectrumCanvas.getContext('2d');

  document.getElementById('langSelect').addEventListener('change', (e) => setLanguage(e.target.value));

  // --- TOAST ---
  function showToast(message, type = 'info') {
    const toast = document.getElementById('nsl-toast');
    const msgEl = document.getElementById('nsl-toastMessage');
    const iconEl = document.getElementById('nsl-toastIcon');
    msgEl.textContent = message;
    const colors = { info: 'bg-cyan-400', success: 'bg-green-400', error: 'bg-red-400', warning: 'bg-yellow-400' };
    iconEl.className = `w-2 h-2 rounded-full ${colors[type] || colors.info}`;
    toast.classList.add('show');
    clearTimeout(window._nslToastTimer);
    window._nslToastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  // --- ARCHIVOS ---
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragging'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragging');
    if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) loadFile(e.target.files[0]);
  });
  changeFileBtn.addEventListener('click', () => {
    stopPlayback();
    editor.classList.add('nsl-hidden');
    dropZone.classList.remove('nsl-hidden');
    fileInput.value = '';
    audioBuffer = null;
  });

  async function loadFile(file) {
    const validExtensions = ['.mp3', '.wav', '.ogg'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      showToast(t('err_format'), 'error');
      return;
    }

    showToast(t('info_decoding'), 'info');

    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();

      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      editor.classList.remove('nsl-hidden');
      dropZone.classList.add('nsl-hidden');

      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileFormat').textContent = ext.slice(1).toUpperCase();
      document.getElementById('fileDuration').textContent = formatTime(audioBuffer.duration);
      document.getElementById('fileChannels').textContent = audioBuffer.numberOfChannels + ' CH';
      document.getElementById('fileSampleRate').textContent = (audioBuffer.sampleRate / 1000).toFixed(1) + ' kHz';

      state.speed = 1.0;
      state.reverb = 0.0;
      state.pitch = 0;
      state.hz432 = 0.0;
      state.hz285 = false;
      speedSlider.value = 100;
      reverbSlider.value = 0;
      pitchSlider.value = 0;
      hz432Slider.value = 0;
      pausedAt = 0;
      updateUI();

      document.querySelectorAll('.fx-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.fx-btn[data-preset="normal"]').classList.add('active');

      requestAnimationFrame(() => {
        drawWaveform();
        drawSpectrumIdle();
      });

      updateOutputInfo();
      showToast(t('info_loaded'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('err_decode'), 'error');
    }
  }

  // --- GRAFO AUDIO ---
  function getTotalDetune() {
    const hz432Component = state.hz432 * HZ_432_CENTS;
    const hz285Component = state.hz285 ? HZ_285_CENTS : 0;
    return state.pitch * 100 + hz432Component + hz285Component;
  }

  function setupAudioGraph() {
    if (!audioContext || !audioBuffer) return;

    if (sourceNode) {
      try { sourceNode.stop(); } catch(e) {}
      try { sourceNode.disconnect(); } catch(e) {}
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.playbackRate.value = state.speed;
    sourceNode.detune.value = getTotalDetune();

    if (!analyserNode) {
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.8;
      analyserNode.connect(audioContext.destination);
    }

    convolverNode = audioContext.createConvolver();
    convolverNode.buffer = createReverbIR(audioContext, 2.5, 2.5);

    dryGainNode = audioContext.createGain();
    wetGainNode = audioContext.createGain();
    updateReverbGains();

    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = 1.0;

    sourceNode.connect(dryGainNode);
    sourceNode.connect(convolverNode);
    convolverNode.connect(wetGainNode);
    dryGainNode.connect(masterGainNode);
    wetGainNode.connect(masterGainNode);

    masterGainNode.connect(analyserNode);

    sourceNode.onended = () => {
      if (isPlaying && !isPaused) {
        const elapsed = (audioContext.currentTime - startTime) * state.speed;
        if (elapsed >= audioBuffer.duration - 0.1) {
          stopPlayback();
        }
      }
    };
  }

  function createReverbIR(ctx, duration = 2, decay = 2) {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  function updateReverbGains() {
    if (!dryGainNode || !wetGainNode) return;
    dryGainNode.gain.value = 1 - state.reverb * 0.5;
    wetGainNode.gain.value = state.reverb;
  }

  function updateOutputInfo() {
    if (!audioBuffer) return;
    const outDuration = audioBuffer.duration / state.speed;
    const speedPct = Math.round(state.speed * 100);
    const parts = [
      formatTime(outDuration),
      `${speedPct}% spd`,
      `${state.pitch >= 0 ? '+' : ''}${state.pitch}st`,
      `${Math.round(state.hz432 * 100)}% 432Hz`
    ];
    if (state.hz285) parts.push('285Hz ON');
    outputInfo.textContent = parts.join(' · ');
  }

  // --- PLAYBACK ---
  function play() {
    if (!audioBuffer) return;

    if (isPaused) {
      setupAudioGraph();
      sourceNode.start(0, pausedAt);
      startTime = audioContext.currentTime - pausedAt / state.speed;
      isPaused = false;
    } else {
      setupAudioGraph();
      sourceNode.start(0, 0);
      startTime = audioContext.currentTime;
    }

    isPlaying = true;
    playIcon.classList.add('nsl-hidden');
    pauseIcon.classList.remove('nsl-hidden');
    recordingDot.className = 'w-2 h-2 rounded-full bg-pink-500 recording-indicator';
    statusText.textContent = t('status_playing');
    statusText.className = 'text-pink-300 text-xs';
    waveformScan.classList.add('active');

    animateVisualizer();
  }

  function pause() {
    if (!isPlaying) return;
    let elapsed = (audioContext.currentTime - startTime) * state.speed;
    if (elapsed >= audioBuffer.duration) elapsed = 0;
    pausedAt = elapsed;

    try { sourceNode.stop(); } catch(e) {}
    try { sourceNode.disconnect(); } catch(e) {}
    sourceNode = null;
    isPaused = true;
    isPlaying = false;

    playIcon.classList.remove('nsl-hidden');
    pauseIcon.classList.add('nsl-hidden');
    recordingDot.className = 'w-2 h-2 rounded-full bg-cyan-400';
    statusText.textContent = t('status_paused');
    statusText.className = 'text-cyan-300 text-xs';
    waveformScan.classList.remove('active');

    cancelAnimationFrame(animationFrame);
  }

  function stopPlayback() {
    if (sourceNode) {
      try { sourceNode.stop(); } catch(e) {}
      try { sourceNode.disconnect(); } catch(e) {}
      sourceNode = null;
    }
    isPlaying = false;
    isPaused = false;
    pausedAt = 0;

    playIcon.classList.remove('nsl-hidden');
    pauseIcon.classList.add('nsl-hidden');
    recordingDot.className = 'w-2 h-2 rounded-full bg-purple-500/40';
    statusText.textContent = t('status_ready');
    statusText.className = 'text-purple-200/60 text-xs';
    waveformScan.classList.remove('active');

    progressFill.style.width = '0%';
    currentTimeEl.textContent = '0:00 / ' + formatTime(audioBuffer ? audioBuffer.duration : 0);

    cancelAnimationFrame(animationFrame);
    drawSpectrumIdle();
  }

  playBtn.addEventListener('click', () => { if (isPlaying) pause(); else play(); });
  stopBtn.addEventListener('click', stopPlayback);

  // --- SEEK ---
  let isDraggingWaveform = false;

  waveformCanvas.addEventListener('mousedown', (e) => {
    if (!audioBuffer) return;
    isDraggingWaveform = true;
    seekFromEvent(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingWaveform) seekFromEvent(e);
  });

  window.addEventListener('mouseup', () => { isDraggingWaveform = false; });

  function seekFromEvent(e) {
    const rect = waveformCanvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const percent = x / rect.width;
    seekTo(percent * audioBuffer.duration);
  }

  function seekTo(time) {
    if (!audioBuffer) return;
    time = Math.max(0, Math.min(audioBuffer.duration, time));

    const wasPlaying = isPlaying;
    if (wasPlaying) pause();

    pausedAt = time;

    const progress = (pausedAt / audioBuffer.duration) * 100;
    progressFill.style.width = progress + '%';
    currentTimeEl.textContent = formatTime(pausedAt) + ' / ' + formatTime(audioBuffer.duration);
    waveformScan.style.left = progress + '%';

    if (wasPlaying) play();
  }

  // --- VISUALIZACIÓN ---
  function setupCanvas(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { w: 0, h: 0 };

    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    return { w: rect.width, h: rect.height };
  }

  function drawWaveform() {
    if (!audioBuffer) return;
    const { w, h } = setupCanvas(waveformCanvas, waveformCtx);
    if (w === 0) return;

    waveformCtx.clearRect(0, 0, w, h);

    const channelData = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.ceil(channelData.length / w));

    const bgGradient = waveformCtx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, 'rgba(131, 56, 236, 0.05)');
    bgGradient.addColorStop(1, 'rgba(255, 0, 110, 0.05)');
    waveformCtx.fillStyle = bgGradient;
    waveformCtx.fillRect(0, 0, w, h);

    waveformCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    waveformCtx.lineWidth = 1;
    waveformCtx.beginPath();
    waveformCtx.moveTo(0, h / 2);
    waveformCtx.lineTo(w, h / 2);
    waveformCtx.stroke();

    const gradient = waveformCtx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#ff006e');
    gradient.addColorStop(0.5, '#8338ec');
    gradient.addColorStop(1, '#00f5ff');

    waveformCtx.fillStyle = gradient;
    waveformCtx.shadowColor = '#ff006e';
    waveformCtx.shadowBlur = 8;

    for (let i = 0; i < w; i++) {
      let min = 1, max = -1;
      const start = i * step;
      const end = Math.min(start + step, channelData.length);
      for (let j = start; j < end; j++) {
        const v = channelData[j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = ((1 + min) * h) / 2;
      const y2 = ((1 + max) * h) / 2;
      waveformCtx.fillRect(i, y1, 1, Math.max(1, y2 - y1));
    }

    waveformCtx.shadowBlur = 0;
  }

  function drawSpectrumIdle() {
    const { w, h } = setupCanvas(spectrumCanvas, spectrumCtx);
    if (w === 0) return;

    spectrumCtx.clearRect(0, 0, w, h);

    const barCount = 64;
    const barWidth = w / barCount;
    const t = Date.now() * 0.001;

    for (let i = 0; i < barCount; i++) {
      const idleHeight = 2 + Math.sin(t * 2 + i * 0.3) * 3 + Math.sin(t * 3 + i * 0.1) * 2 + 4;
      const x = i * barWidth;
      const hue = 280 + (i / barCount) * 80;
      spectrumCtx.fillStyle = `hsla(${hue}, 80%, 50%, ${0.2 + (i / barCount) * 0.3})`;
      spectrumCtx.fillRect(x + 1, h - idleHeight, barWidth - 2, idleHeight);
    }
  }

  function animateVisualizer() {
    if (!isPlaying || !analyserNode) {
      cancelAnimationFrame(animationFrame);
      return;
    }

    const { w, h } = setupCanvas(spectrumCanvas, spectrumCtx);
    if (w === 0) {
      animationFrame = requestAnimationFrame(animateVisualizer);
      return;
    }

    spectrumCtx.fillStyle = 'rgba(10, 1, 24, 0.25)';
    spectrumCtx.fillRect(0, 0, w, h);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    const barCount = 80;
    const barWidth = w / barCount;

    for (let i = 0; i < barCount; i++) {
      const index = Math.floor(Math.pow(i / barCount, 1.5) * bufferLength * 0.7);
      const value = dataArray[index] || 0;
      const barHeight = (value / 255) * h * 0.95;

      const x = i * barWidth;
      const y = h - barHeight;

      const hue = (i / barCount) * 80 + 280;
      const gradient = spectrumCtx.createLinearGradient(0, h, 0, y);
      gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
      gradient.addColorStop(0.7, `hsl(${hue + 30}, 100%, 60%)`);
      gradient.addColorStop(1, `hsl(${hue + 60}, 100%, 75%)`);

      spectrumCtx.fillStyle = gradient;
      spectrumCtx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      spectrumCtx.shadowBlur = 12;
      spectrumCtx.fillRect(x + 1, y, barWidth - 2, Math.max(2, barHeight));

      spectrumCtx.globalAlpha = 0.18;
      spectrumCtx.fillRect(x + 1, h, barWidth - 2, -barHeight * 0.3);
      spectrumCtx.globalAlpha = 1;
    }

    spectrumCtx.shadowBlur = 0;

    const elapsed = (audioContext.currentTime - startTime) * state.speed;
    const duration = audioBuffer.duration;
    const progress = Math.min(100, (elapsed / duration) * 100);
    progressFill.style.width = progress + '%';
    currentTimeEl.textContent = formatTime(Math.min(elapsed, duration)) + ' / ' + formatTime(duration);
    waveformScan.style.left = progress + '%';

    if (elapsed >= duration) {
      stopPlayback();
      return;
    }

    animationFrame = requestAnimationFrame(animateVisualizer);
  }

  setInterval(() => { if (!isPlaying && overlay.classList.contains('nsl-open')) drawSpectrumIdle(); }, 80);

  // --- PRESETS ---
  document.querySelectorAll('.fx-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      applyPreset(preset);
      document.querySelectorAll('.fx-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  function applyPreset(name) {
    const p = presets[name];
    if (!p) return;

    const oldSpeed = state.speed;

    if (name === 'normal') {
      state.speed = 1.00;
      state.reverb = 0.0;
      state.pitch = 0;
      state.hz432 = 0.0;
      state.hz285 = false;
      speedSlider.value = 100;
      reverbSlider.value = 0;
      pitchSlider.value = 0;
      hz432Slider.value = 0;
    } else {
      state.speed = p.speed;
      speedSlider.value = Math.round(p.speed * 100);
    }

    refreshAllDisplays();

    if (isPlaying) {
      const elapsed = (audioContext.currentTime - startTime) * oldSpeed;
      startTime = audioContext.currentTime - elapsed / state.speed;
      if (sourceNode) {
        sourceNode.playbackRate.value = state.speed;
        sourceNode.detune.value = getTotalDetune();
      }
    }
  }

  // --- SLIDERS ---
  speedSlider.addEventListener('input', (e) => {
    const newSpeed = parseInt(e.target.value) / 100;
    const oldSpeed = state.speed;
    state.speed = newSpeed;

    if (isPlaying) {
      const elapsed = (audioContext.currentTime - startTime) * oldSpeed;
      startTime = audioContext.currentTime - elapsed / newSpeed;
      if (sourceNode) sourceNode.playbackRate.value = newSpeed;
    }

    refreshAllDisplays();
  });

  reverbSlider.addEventListener('input', (e) => {
    state.reverb = parseInt(e.target.value) / 100;
    refreshAllDisplays();
  });

  pitchSlider.addEventListener('input', (e) => {
    state.pitch = parseInt(e.target.value);
    if (sourceNode) sourceNode.detune.value = getTotalDetune();
    refreshAllDisplays();
  });

  hz432Slider.addEventListener('input', (e) => {
    state.hz432 = parseInt(e.target.value) / 100;
    if (sourceNode) sourceNode.detune.value = getTotalDetune();
    refreshAllDisplays();
  });

  // --- TOGGLE 285Hz ---
  function toggle285Hz() {
    state.hz285 = !state.hz285;
    updateHz285UI();
    if (sourceNode) sourceNode.detune.value = getTotalDetune();
    refreshAllDisplays();
  }

  function updateHz285UI() {
    if (state.hz285) {
      hz285Toggle.classList.add('active');
      hz285Toggle.setAttribute('aria-checked', 'true');
      hz285StatusEl.classList.add('on');
      hz285StatusEl.textContent = t('hz285_on');
    } else {
      hz285Toggle.classList.remove('active');
      hz285Toggle.setAttribute('aria-checked', 'false');
      hz285StatusEl.classList.remove('on');
      hz285StatusEl.textContent = t('hz285_off');
    }
  }

  hz285Toggle.addEventListener('click', toggle285Hz);
  hz285Toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      toggle285Hz();
    }
  });

  function updateUI() {
    speedValueEl.textContent = state.speed.toFixed(2) + 'x';
    reverbValueEl.textContent = Math.round(state.reverb * 100) + '%';
    pitchValueEl.textContent = (state.pitch >= 0 ? '+' : '') + state.pitch + ' st';
    hz432ValueEl.textContent = Math.round(state.hz432 * 100) + '%';
    updateHz285UI();
  }

  function refreshAllDisplays() {
    updateUI();
    updateOutputInfo();
    updateReverbGains();
    checkPresetMatch();
  }

  function checkPresetMatch() {
    let matched = null;

    if (Math.abs(state.speed - 1.0) < 0.01 && state.reverb < 0.01 && state.pitch === 0) {
      matched = 'normal';
    } else {
      for (const [name, p] of Object.entries(presets)) {
        if (name === 'normal') continue;
        if (Math.abs(p.speed - state.speed) < 0.01) {
          matched = name;
          break;
        }
      }
    }

    document.querySelectorAll('.fx-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.preset === matched);
    });
  }

  // --- EXPORTACIÓN ---
  async function renderProcessedAudio() {
    if (!audioBuffer) return null;

    const speedDur = audioBuffer.duration / state.speed;
    const reverbTail = state.reverb > 0.01 ? 2.5 : 0;
    const totalDuration = speedDur + reverbTail;

    const offlineCtx = new OfflineAudioContext(
      Math.min(2, audioBuffer.numberOfChannels),
      Math.max(1, Math.ceil(audioBuffer.sampleRate * totalDuration)),
      audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = state.speed;
    source.detune.value = getTotalDetune();

    if (state.reverb > 0.01) {
      const convolver = offlineCtx.createConvolver();
      convolver.buffer = createReverbIR(offlineCtx, 2.5, 2.5);
      const dry = offlineCtx.createGain();
      const wet = offlineCtx.createGain();
      dry.gain.value = 1 - state.reverb * 0.5;
      wet.gain.value = state.reverb;

      source.connect(dry);
      source.connect(convolver);
      convolver.connect(wet);
      dry.connect(offlineCtx.destination);
      wet.connect(offlineCtx.destination);
    } else {
      source.connect(offlineCtx.destination);
    }

    source.start(0, 0);

    showExportProgress(20, t('info_rendering'));
    await new Promise(r => setTimeout(r, 30));
    const rendered = await offlineCtx.startRendering();
    showExportProgress(70, t('info_render_complete'));
    return rendered;
  }

  function showExportProgress(percent, status) {
    exportProgress.classList.remove('nsl-hidden');
    exportStatus.innerHTML = `<div class="nsl-spinner w-4 h-4"></div> ${status}`;
    exportPercent.textContent = percent + '%';
    exportProgressFill.style.width = percent + '%';
  }

  function hideExportProgress() { exportProgress.classList.add('nsl-hidden'); }

  // --- ENCODERS ---
  function encodeWAV(audioBuffer) {
    const numChannels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;
    const bitDepth = 16;

    let samples;
    if (numChannels === 2) {
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
      samples = interleave(left, right);
    } else {
      samples = audioBuffer.getChannelData(0);
    }

    const dataLength = samples.length * (bitDepth / 8);
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    floatTo16BitPCM(view, 44, samples);
    return new Blob([view], { type: 'audio/wav' });
  }

  function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  function floatTo16BitPCM(view, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }

  function interleave(left, right) {
    const length = left.length + right.length;
    const result = new Float32Array(length);
    let index = 0, inputIndex = 0;
    while (index < length) {
      result[index++] = left[inputIndex];
      result[index++] = right[inputIndex];
      inputIndex++;
    }
    return result;
  }

  function encodeMP3(audioBuffer) {
    if (!lamejsReady || typeof lamejs === 'undefined' || !lamejs.Mp3Encoder) {
      throw new Error('lamejs no está disponible');
    }

    const numChannels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;
    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 192);

    const left = audioBuffer.getChannelData(0);
    const right = numChannels > 1 ? audioBuffer.getChannelData(1) : left;

    const leftInt16 = new Int16Array(left.length);
    const rightInt16 = new Int16Array(right.length);

    for (let i = 0; i < left.length; i++) {
      const l = Math.max(-1, Math.min(1, left[i]));
      leftInt16[i] = l < 0 ? l * 0x8000 : l * 0x7FFF;
      if (numChannels > 1) {
        const r = Math.max(-1, Math.min(1, right[i]));
        rightInt16[i] = r < 0 ? r * 0x8000 : r * 0x7FFF;
      }
    }

    const blockSize = 1152;
    const data = [];

    for (let i = 0; i < leftInt16.length; i += blockSize) {
      const leftChunk = leftInt16.subarray(i, i + blockSize);
      const rightChunk = rightInt16.subarray(i, i + blockSize);
      let mp3buf;
      if (numChannels > 1) mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      else mp3buf = mp3encoder.encodeBuffer(leftChunk);
      if (mp3buf.length > 0) data.push(new Uint8Array(mp3buf));
    }

    const end = mp3encoder.flush();
    if (end.length > 0) data.push(new Uint8Array(end));

    return new Blob(data, { type: 'audio/mp3' });
  }

  function encodeOGG(audioBuffer) {
    if (!vorbisEncoderAvailable || typeof VorbisEncoder === 'undefined') {
      throw new Error('Vorbis encoder no disponible');
    }

    const numChannels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;
    const quality = 0.4;

    const encoder = new VorbisEncoder(sampleRate, numChannels, quality);

    const left = audioBuffer.getChannelData(0);
    const right = numChannels > 1 ? audioBuffer.getChannelData(1) : null;

    const blockSize = 1024;
    for (let i = 0; i < left.length; i += blockSize) {
      const leftChunk = left.subarray(i, Math.min(i + blockSize, left.length));
      const rightChunk = right ? right.subarray(i, Math.min(i + blockSize, right.length)) : null;

      const leftCopy = new Float32Array(leftChunk);
      const rightCopy = rightChunk ? new Float32Array(rightChunk) : null;

      if (rightCopy) encoder.encode([leftCopy, rightCopy]);
      else encoder.encode([leftCopy]);
    }

    const result = encoder.finish();
    return new Blob([result], { type: 'audio/ogg' });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  function getBaseFilename() {
    const name = document.getElementById('fileName').textContent;
    return name.replace(/\.[^/.]+$/, '');
  }

  function getEffectSuffix() {
    let parts = [];
    if (Math.abs(state.speed - 1.0) > 0.01) parts.push('spd' + Math.round(state.speed * 100));
    if (state.reverb > 0.01) parts.push('rev' + Math.round(state.reverb * 100));
    if (state.pitch !== 0) parts.push((state.pitch > 0 ? 'p+' : 'p') + state.pitch);
    if (state.hz432 > 0.01) parts.push('432_' + Math.round(state.hz432 * 100));
    if (state.hz285) parts.push('285Hz');
    return parts.length ? parts.join('-') : 'original';
  }

  // --- BOTONES DE EXPORTACIÓN ---
  document.getElementById('exportWav').addEventListener('click', async () => {
    if (!audioBuffer) { showToast(t('err_no_audio'), 'warning'); return; }
    const wasPlaying = isPlaying;
    if (wasPlaying) pause();
    try {
      showExportProgress(5, t('info_preparing_wav'));
      await new Promise(r => setTimeout(r, 50));
      const rendered = await renderProcessedAudio();
      showExportProgress(80, t('info_encoding_wav'));
      await new Promise(r => setTimeout(r, 30));
      const blob = encodeWAV(rendered);
      showExportProgress(100, t('info_download_ready'));
      downloadBlob(blob, `${getBaseFilename()}_${getEffectSuffix()}_neonsoundlab.wav`);
      showToast(t('success_wav'), 'success');
      setTimeout(hideExportProgress, 1200);
    } catch (err) {
      console.error(err);
      showToast(t('err_export', {ext: 'WAV', msg: err.message}), 'error');
      hideExportProgress();
    }
    if (wasPlaying) play();
  });

  document.getElementById('exportMp3').addEventListener('click', async () => {
    if (!audioBuffer) { showToast(t('err_no_audio'), 'warning'); return; }
    if (!lamejsReady) { showToast(t('err_mp3_ready'), 'error'); return; }
    const wasPlaying = isPlaying;
    if (wasPlaying) pause();
    try {
      showExportProgress(5, t('info_preparing_mp3'));
      await new Promise(r => setTimeout(r, 50));
      const rendered = await renderProcessedAudio();
      showExportProgress(75, t('info_encoding_mp3'));
      await new Promise(r => setTimeout(r, 30));
      const blob = encodeMP3(rendered);
      showExportProgress(100, t('info_download_ready'));
      downloadBlob(blob, `${getBaseFilename()}_${getEffectSuffix()}_neonsoundlab.mp3`);
      showToast(t('success_mp3'), 'success');
      setTimeout(hideExportProgress, 1200);
    } catch (err) {
      console.error(err);
      showToast(t('err_export', {ext: 'MP3', msg: err.message}), 'error');
      hideExportProgress();
    }
    if (wasPlaying) play();
  });

  document.getElementById('exportOgg').addEventListener('click', async () => {
    if (!audioBuffer) { showToast(t('err_no_audio'), 'warning'); return; }
    if (!vorbisEncoderAvailable) { showToast(t('err_ogg_unavail'), 'warning'); return; }
    const wasPlaying = isPlaying;
    if (wasPlaying) pause();
    try {
      showExportProgress(5, t('info_preparing_ogg'));
      await new Promise(r => setTimeout(r, 50));
      const rendered = await renderProcessedAudio();
      showExportProgress(75, t('info_encoding_ogg'));
      await new Promise(r => setTimeout(r, 30));
      const blob = encodeOGG(rendered);
      showExportProgress(100, t('info_download_ready'));
      downloadBlob(blob, `${getBaseFilename()}_${getEffectSuffix()}_neonsoundlab.ogg`);
      showToast(t('success_ogg'), 'success');
      setTimeout(hideExportProgress, 1200);
    } catch (err) {
      console.error(err);
      showToast(t('err_export', {ext: 'OGG', msg: err.message}), 'error');
      hideExportProgress();
    }
    if (wasPlaying) play();
  });

  // --- UTILS ---
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  window.addEventListener('resize', () => {
    if (audioBuffer) drawWaveform();
    if (!isPlaying) drawSpectrumIdle();
  });

  document.querySelector('.fx-btn[data-preset="normal"]').classList.add('active');
  drawSpectrumIdle();
  setLanguage('es');

  // --- CARGAR LIBRERÍAS EXTERNAS ---
  async function ensureLamejs() {
    if (lamejsReady) return true;
    const cdns = [
      'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js',
      'https://unpkg.com/lamejs@1.2.1/lame.min.js',
      'https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js'
    ];
    for (const url of cdns) {
      try {
        await loadExternalScript(url);
        lamejsReady = (typeof lamejs !== 'undefined' && lamejs.Mp3Encoder);
        if (lamejsReady) {
          document.getElementById('mp3Status').textContent = t('mp3_desc_ready');
          return true;
        }
      } catch (e) {}
    }
    document.getElementById('mp3Status').textContent = t('mp3_desc_unavail');
    document.getElementById('exportMp3').classList.add('unavailable');
    return false;
  }

  async function initVorbisEncoder() {
    const cdns = [
      'https://cdn.jsdelivr.net/npm/vorbis-encoder-js@1.0.4/dist/vorbis-encoder.min.js',
      'https://unpkg.com/vorbis-encoder-js@1.0.4/dist/vorbis-encoder.min.js'
    ];
    for (const url of cdns) {
      try {
        await loadExternalScript(url);
        vorbisEncoderAvailable = (typeof VorbisEncoder !== 'undefined');
        if (vorbisEncoderAvailable) {
          document.getElementById('oggStatus').textContent = t('ogg_desc_ready');
          return;
        }
      } catch (e) {}
    }
    vorbisEncoderAvailable = false;
    document.getElementById('oggStatus').textContent = t('ogg_desc_unavail');
    document.getElementById('exportOgg').classList.add('unavailable');
  }

  ensureLamejs();
  initVorbisEncoder();

  console.log('%c NEON SOUND LAB ', 'background:linear-gradient(135deg,#ff006e,#8338ec);color:#fff;font-weight:bold;padding:4px 10px;border-radius:4px;', 'Userscript cargado. Click en el botón flotante para abrir el editor.');
})();
