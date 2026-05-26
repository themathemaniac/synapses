/* ============================================================
   The Mathemaniac — AI Chat Widget  v2.0
   ── Design matches synapseedutech.in palette exactly ──
   Self-contained: injects scoped CSS + HTML, calls /api/chat.
   No iframe. No external dependencies.
   ============================================================ */

(function () {
  'use strict';

  /* ── CONFIG ──────────────────────────────────────────────── */
  /* The backend URL is read from the <script data-backend="..."> attribute  */
  /* so you can switch between local dev and production without editing code. */
  /* Default fallback: local dev server on port 3001.                        */
  const scriptTag   = document.currentScript ||
    document.querySelector('script[src*="chatbot.js"]');
  const BACKEND_URL  = (scriptTag && scriptTag.dataset.backend)
    ? scriptTag.dataset.backend.replace(/\/$/, '')
    : 'http://localhost:3001';
  const API_ENDPOINT = BACKEND_URL + '/api/chat';


  const WELCOME_HTML =
    'Hi, I am <strong>Gippo</strong> — your AI guide for <strong>The Mathemaniac</strong>.<br>' +
    'Ask me anything about courses, admissions, results, or your IIT-JEE / NEET journey. What is on your mind?';

  const QUICK_CHIPS = [
    'What courses do you offer?',
    'How do I enroll?',
    'Where are you located?',
    'Contact details',
  ];

  const ERROR_HTML =
    'Oops! Connection issue. Please call us at <strong>+91 9831754957</strong>.';

  /* ── SESSION PERSISTENCE ─────────────────────────────────── */
  function getSessionId() {
    let sid = sessionStorage.getItem('tm_sid');
    if (!sid) {
      sid = 'tm_' + Math.random().toString(16).slice(2, 10);
      sessionStorage.setItem('tm_sid', sid);
    }
    return sid;
  }
  function loadHistory() {
    try { return JSON.parse(sessionStorage.getItem('tm_hist') || '[]'); }
    catch { return []; }
  }
  function saveHistory(h) {
    try { sessionStorage.setItem('tm_hist', JSON.stringify(h.slice(-40))); }
    catch { /* quota — ignore */ }
  }

  /* ── SCOPED CSS ──────────────────────────────────────────── */
  /* All rules are prefixed with #tm-root to avoid any collision  */
  /* with the main site. Typography uses the same Google Fonts    */
  /* already loaded by the page (DM Sans, Syne, Orbitron).        */
  const CSS = `
    /* ─── Reset inside widget only ─── */
    #tm-root *, #tm-root *::before, #tm-root *::after {
      box-sizing: border-box; margin: 0; padding: revert-rule;
    }

    /* ─── Design tokens ─── */
    #tm-root {
      --w-bg:           #F7F3EA;
      --w-bg-card:      #FFFDF6;
      --w-bg-alt:       #F0EBE0;
      --w-bg-input:     #FDFAF3;
      --w-surface:      rgba(253, 250, 243, 0.98);

      --w-maroon:       #6B0000;
      --w-maroon-dark:  #500000;
      --w-maroon-glow:  rgba(107, 0, 0, 0.14);
      --w-gold:         #D4A800;
      --w-gold-soft:    rgba(212, 168, 0, 0.10);
      --w-gold-border:  rgba(212, 168, 0, 0.40);

      --w-text-head:    #1A1108;
      --w-text-body:    #3A2F1A;
      --w-text-muted:   #7A6A50;
      --w-text-light:   #ADA08A;

      --w-border:       rgba(180, 155, 90, 0.20);
      --w-border-card:  rgba(180, 155, 90, 0.26);
      --w-shadow-card:  0 1px 6px rgba(60,40,0,0.07), 0 2px 14px rgba(60,40,0,0.05);
      --w-shadow-lift:  0 6px 24px rgba(60,40,0,0.13), 0 2px 8px rgba(60,40,0,0.06);
      --w-shadow-panel: 0 24px 64px rgba(30,18,0,0.20), 0 4px 20px rgba(30,18,0,0.10),
                        0 0 0 1px rgba(212,168,0,0.16);

      --w-r:       18px;
      --w-r-sm:    12px;
      --w-r-chip:  999px;
      --w-r-bot:   4px 20px 20px 20px;
      --w-r-user:  20px 4px 20px 20px;

      --w-font-body: 'DM Sans', system-ui, sans-serif;
      --w-font-ui:   'Syne', system-ui, sans-serif;
      --w-font-tag:  'Orbitron', system-ui, sans-serif;

      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9999;
      font-family: var(--w-font-body);
    }

    /* ══════════════════════════
       FAB
    ══════════════════════════ */
    #tm-fab {
      position: relative;
      width: 78px; height: 78px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      background: linear-gradient(150deg, #7a0000 0%, #6B0000 55%, #520000 100%);
      box-shadow: 0 6px 28px rgba(107,0,0,0.50),
                  0 2px 8px rgba(107,0,0,0.25),
                  inset 0 1px 0 rgba(255,255,255,0.12),
                  inset 0 -1px 0 rgba(0,0,0,0.15);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.28s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s ease;
      outline: none;
    }
    #tm-fab:hover {
      transform: scale(1.07) translateY(-3px);
      box-shadow: 0 14px 36px rgba(107,0,0,0.58),
                  0 4px 12px rgba(107,0,0,0.30),
                  inset 0 1px 0 rgba(255,255,255,0.15);
    }
    #tm-fab:focus-visible { outline: 3px solid var(--w-gold); outline-offset: 4px; }

    #tm-fab .tm-ico { transition: opacity 0.22s, transform 0.22s; }
    #tm-fab .tm-ico-chat  { opacity: 1; transform: scale(1) rotate(0deg); }
    #tm-fab .tm-ico-close {
      opacity: 0; transform: scale(0.4) rotate(60deg);
      position: absolute;
    }
    #tm-root.open #tm-fab .tm-ico-chat  { opacity: 0; transform: scale(0.4) rotate(-60deg); }
    #tm-root.open #tm-fab .tm-ico-close { opacity: 1; transform: scale(1) rotate(0deg); }

    #tm-fab::before {
      content: '';
      position: absolute; inset: -6px;
      border-radius: 50%;
      border: 1.5px solid var(--w-gold);
      opacity: 0;
      animation: tm-ring 5s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes tm-ring {
      0%,100% { opacity: 0; transform: scale(1); }
      45%      { opacity: 0.55; transform: scale(1.20); }
      55%      { opacity: 0.40; transform: scale(1.24); }
    }

    #tm-notif {
      position: absolute; top: 3px; right: 3px;
      width: 13px; height: 13px;
      background: #22c55e;
      border: 2.5px solid var(--w-bg);
      border-radius: 50%;
      transition: opacity 0.3s, transform 0.3s;
      animation: tm-notif-pulse 2.8s ease-in-out infinite;
    }
    @keyframes tm-notif-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.50); }
      50%      { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
    }
    #tm-root.open #tm-notif { opacity: 0; transform: scale(0); }

    /* ══════════════════════════
       PANEL
    ══════════════════════════ */
    #tm-panel {
      position: absolute;
      bottom: 76px; right: 0;
      width: 385px;
      height: 580px;
      background: var(--w-bg);
      border-radius: var(--w-r);
      border: 1px solid var(--w-gold-border);
      box-shadow: var(--w-shadow-panel);
      display: flex; flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(22px) scale(0.95);
      pointer-events: none;
      transform-origin: bottom right;
      transition: opacity 0.30s cubic-bezier(.4,0,.2,1),
                  transform 0.30s cubic-bezier(.4,0,.2,1);
    }
    #tm-root.open #tm-panel {
      opacity: 1; transform: translateY(0) scale(1); pointer-events: auto;
    }

    /* ── HEADER ── */
    #tm-header {
      background: linear-gradient(140deg, #6B0000 0%, #850000 45%, #6B0000 100%);
      padding: 18px 18px 15px;
      display: flex; align-items: center; gap: 13px;
      flex-shrink: 0; position: relative; overflow: hidden;
    }
    #tm-header::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(212,168,0,0.60) 50%, transparent 100%);
    }
    #tm-header::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 70% 80% at 15% 40%,
          rgba(255,195,0,0.07) 0%, transparent 65%);
      pointer-events: none;
    }

    #tm-avatar {
      width: 46px; height: 46px; border-radius: 50%;
      background: linear-gradient(145deg, #D4A800, #b08800);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--w-font-ui);
      font-size: 14px; font-weight: 800;
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 0 0 3px rgba(212,168,0,0.28), 0 3px 10px rgba(0,0,0,0.28);
      animation: tm-avatar-pulse 4s ease-in-out infinite;
      position: relative; z-index: 1;
      letter-spacing: 0.02em;
    }
    @keyframes tm-avatar-pulse {
      0%,100% { box-shadow: 0 0 0 3px rgba(212,168,0,0.28), 0 3px 10px rgba(0,0,0,0.28); }
      50%      { box-shadow: 0 0 0 7px rgba(212,168,0,0.10), 0 3px 10px rgba(0,0,0,0.28); }
    }

    #tm-header-info { flex: 1; min-width: 0; position: relative; z-index: 1; }
    #tm-header-title {
      font-family: var(--w-font-ui);
      font-size: 14px; font-weight: 700;
      color: #FFF8EA; letter-spacing: 0.01em; line-height: 1.2;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #tm-header-sub {
      font-family: var(--w-font-body);
      font-size: 11.5px; color: rgba(255,238,190,0.65);
      margin-top: 2px; letter-spacing: 0.01em;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #tm-status { display: flex; align-items: center; gap: 5px; margin-top: 5px; }
    #tm-status-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 6px rgba(74,222,128,0.85);
      animation: tm-blink 2.4s ease-in-out infinite;
    }
    #tm-status-text {
      font-family: var(--w-font-tag);
      font-size: 8.5px; font-weight: 600;
      letter-spacing: 0.14em; text-transform: uppercase;
      color: rgba(255,238,190,0.55);
    }
    @keyframes tm-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.30; } }

    #tm-close {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 9px; color: rgba(255,235,180,0.75);
      font-size: 15px; line-height: 1;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      flex-shrink: 0; position: relative; z-index: 1;
    }
    #tm-close:hover { background: rgba(255,255,255,0.18); color: #fff; }
    #tm-close:focus-visible { outline: 2px solid var(--w-gold); outline-offset: 2px; }

    /* ── MESSAGES ── */
    #tm-messages {
      flex: 1; overflow-y: auto;
      padding: 22px 18px 12px;
      display: flex; flex-direction: column; gap: 14px;
      scroll-behavior: smooth;
      background: var(--w-bg);
    }
    #tm-messages::-webkit-scrollbar { width: 3px; }
    #tm-messages::-webkit-scrollbar-track { background: transparent; }
    #tm-messages::-webkit-scrollbar-thumb {
      background: var(--w-gold-border); border-radius: 3px;
    }

    .tm-row { display: flex; align-items: flex-end; gap: 9px; }
    .tm-row.tm-user { flex-direction: row-reverse; }

    .tm-msg-av {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(145deg, var(--w-maroon), #850000);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--w-font-ui);
      font-size: 8.5px; font-weight: 800; color: var(--w-gold);
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(107,0,0,0.28);
      letter-spacing: 0.03em;
    }
    .tm-row.tm-user .tm-msg-av { display: none; }

    /* ── BUBBLES ── */
    .tm-bubble {
      max-width: 78%;
      padding: 13px 17px;
      font-family: var(--w-font-body);
      font-size: 14px;
      line-height: 1.68;
      word-break: break-word;
      animation: tm-slide-up 0.24s cubic-bezier(.4,0,.2,1) both;
    }
    @keyframes tm-slide-up {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Bot bubble — warm parchment, soft inner glow */
    .tm-bubble.tm-bot {
      background: var(--w-bg-card);
      color: var(--w-text-body);
      border-radius: var(--w-r-bot);
      border: 1px solid var(--w-border-card);
      box-shadow: var(--w-shadow-card),
                  inset 0 1px 0 rgba(255,255,255,0.70);
      letter-spacing: 0.008em;
    }
    .tm-bubble.tm-bot strong { color: var(--w-maroon); font-weight: 600; }
    .tm-bubble.tm-bot a,
    .tm-bubble.tm-bot .tm-link {
      color: var(--w-maroon);
      text-decoration: underline;
      text-decoration-color: rgba(107,0,0,0.35);
      text-underline-offset: 3px;
      font-weight: 500;
      transition: text-decoration-color 0.2s, opacity 0.2s;
    }
    .tm-bubble.tm-bot .tm-link:hover { text-decoration-color: var(--w-maroon); opacity: 0.8; }

    /* User bubble — deep maroon */
    .tm-bubble.tm-user {
      background: linear-gradient(140deg, #7a0000 0%, #6B0000 100%);
      color: #FFF8EA;
      border-radius: var(--w-r-user);
      box-shadow: 0 3px 14px rgba(107,0,0,0.26),
                  inset 0 1px 0 rgba(255,255,255,0.08);
      letter-spacing: 0.008em;
    }
    .tm-bubble.tm-user strong { color: var(--w-gold); }
    .tm-bubble.tm-user .tm-link {
      color: var(--w-gold);
      text-decoration: underline;
      text-decoration-color: rgba(212,168,0,0.45);
      text-underline-offset: 3px;
      font-weight: 500;
      transition: text-decoration-color 0.2s, opacity 0.2s;
    }
    .tm-bubble.tm-user .tm-link:hover { text-decoration-color: var(--w-gold); opacity: 0.85; }

    .tm-ts {
      font-size: 10px; color: var(--w-text-light);
      padding: 0 3px; flex-shrink: 0;
      align-self: flex-end;
      font-family: var(--w-font-body); letter-spacing: 0.01em;
    }

    /* ── TYPING INDICATOR ── */
    .tm-typing {
      display: flex; align-items: center; gap: 5px;
      padding: 13px 18px;
      background: var(--w-bg-card);
      border: 1px solid var(--w-border-card);
      border-radius: var(--w-r-bot);
      box-shadow: var(--w-shadow-card);
      width: fit-content;
    }
    .tm-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--w-maroon); opacity: 0.45;
    }
    .tm-dot:nth-child(1) { animation: tm-bounce 1.3s 0s    ease-in-out infinite; }
    .tm-dot:nth-child(2) { animation: tm-bounce 1.3s 0.22s ease-in-out infinite; }
    .tm-dot:nth-child(3) { animation: tm-bounce 1.3s 0.44s ease-in-out infinite; }
    @keyframes tm-bounce {
      0%,60%,100% { transform: translateY(0); opacity: 0.40; }
      30%          { transform: translateY(-6px); opacity: 1; background: var(--w-gold); }
    }

    .tm-divider {
      display: flex; align-items: center; gap: 10px;
      font-family: var(--w-font-tag);
      font-size: 8.5px; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--w-text-light);
      margin: 2px 0;
    }
    .tm-divider::before, .tm-divider::after {
      content: ''; flex: 1; height: 1px; background: var(--w-border);
    }

    /* ── QUICK CHIPS ── */
    #tm-chips {
      padding: 2px 16px 12px;
      display: flex; flex-wrap: wrap; gap: 7px;
      flex-shrink: 0; background: var(--w-bg);
    }
    .tm-chip {
      background: var(--w-bg-card);
      border: 1px solid var(--w-border-card);
      color: var(--w-text-muted);
      border-radius: var(--w-r-chip);
      padding: 7px 15px;
      font-family: var(--w-font-body);
      font-size: 12.5px; font-weight: 500;
      cursor: pointer;
      transition: background 0.2s, color 0.2s, border-color 0.2s,
                  transform 0.15s, box-shadow 0.2s;
      box-shadow: var(--w-shadow-card);
      letter-spacing: 0.01em;
    }
    .tm-chip:hover {
      background: var(--w-gold-soft);
      border-color: var(--w-gold-border);
      color: var(--w-maroon);
      transform: translateY(-1px);
      box-shadow: var(--w-shadow-lift);
    }
    .tm-chip:active { transform: translateY(0); }

    /* ── INPUT ROW ── */
    #tm-input-row {
      display: flex; align-items: flex-end; gap: 10px;
      padding: 12px 16px 16px;
      background: var(--w-bg-alt);
      border-top: 1px solid var(--w-border);
      flex-shrink: 0;
    }
    #tm-textarea {
      flex: 1;
      background: var(--w-bg-input);
      border: 1.5px solid var(--w-border-card);
      border-radius: 14px;
      color: var(--w-text-body);
      font-family: var(--w-font-body);
      font-size: 14px;
      line-height: 1.55;
      padding: 11px 16px;
      resize: none;
      min-height: 44px; max-height: 110px;
      overflow-y: auto; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-shadow: inset 0 1px 4px rgba(60,40,0,0.05);
      letter-spacing: 0.01em;
    }
    #tm-textarea::placeholder { color: var(--w-text-light); font-size: 13.5px; }
    #tm-textarea:focus {
      border-color: rgba(212,168,0,0.50);
      box-shadow: inset 0 1px 4px rgba(60,40,0,0.05),
                  0 0 0 3px rgba(212,168,0,0.10);
    }
    #tm-textarea::-webkit-scrollbar { width: 3px; }
    #tm-textarea::-webkit-scrollbar-thumb { background: var(--w-border); border-radius: 3px; }

    #tm-send {
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(145deg, #7a0000, #6B0000);
      border: none; cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 12px rgba(107,0,0,0.30);
      transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
    }
    #tm-send:hover:not(:disabled) {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(107,0,0,0.45);
    }
    #tm-send:disabled { opacity: 0.32; cursor: not-allowed; transform: none; }
    #tm-send:focus-visible { outline: 3px solid var(--w-gold); outline-offset: 2px; }
    #tm-send svg { pointer-events: none; }

    /* ── FOOTER ── */
    #tm-credit {
      text-align: center;
      font-family: var(--w-font-tag);
      font-size: 8px; letter-spacing: 0.13em;
      text-transform: uppercase; color: var(--w-text-light);
      padding: 7px 0 9px;
      background: var(--w-bg-alt);
      border-top: 1px solid var(--w-border);
    }

    /* ── MOBILE ── */
    @media (max-width: 480px) {
      #tm-root { bottom: 16px; right: 16px; }
      #tm-panel {
        position: fixed; bottom: 0; left: 0; right: 0;
        width: 100%; height: 75vh;
        border-radius: 22px 22px 0 0; border-bottom: none;
      }
    }
  `;

  /* ── INJECT STYLES ───────────────────────────────────────── */
  function injectStyles() {
    const s = document.createElement('style');
    s.id = 'tm-widget-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── BUILD HTML ──────────────────────────────────────────── */
  function buildHTML() {
    const root = document.createElement('div');
    root.id = 'tm-root';
    root.setAttribute('aria-label', 'Chat with Gippo, The Mathemaniac AI');

    root.innerHTML = `
      <!-- ── FAB ── -->
      <button id="tm-fab"
        aria-label="Open Gippo AI chat assistant"
        aria-expanded="false"
        aria-controls="tm-panel">
        <!-- Gippo owl mascot icon -->
        <svg class="tm-ico tm-ico-chat" width="46" height="46"
          viewBox="0 0 46 46" fill="none" aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg">
          <!-- Graduation cap -->
          <polygon points="23,7 36,13 23,19 10,13" fill="#D4A800"/>
          <rect x="33" y="13" width="2.5" height="8" rx="1.2" fill="#D4A800"/>
          <circle cx="34.25" cy="22" r="2.2" fill="#D4A800"/>
          <!-- Owl body -->
          <ellipse cx="23" cy="32" rx="11" ry="10" fill="rgba(255,248,234,0.13)"/>
          <!-- Ear tufts -->
          <path d="M15 22 Q13 18 16 16 Q17 20 15 22Z" fill="rgba(255,248,234,0.75)"/>
          <path d="M31 22 Q33 18 30 16 Q29 20 31 22Z" fill="rgba(255,248,234,0.75)"/>
          <!-- Left eye -->
          <circle cx="18" cy="29" r="5.5" fill="rgba(255,248,234,0.92)"/>
          <circle cx="18" cy="29" r="3.2" fill="#2a0000"/>
          <circle cx="19.4" cy="27.6" r="1.1" fill="white"/>
          <!-- Right eye -->
          <circle cx="28" cy="29" r="5.5" fill="rgba(255,248,234,0.92)"/>
          <circle cx="28" cy="29" r="3.2" fill="#2a0000"/>
          <circle cx="29.4" cy="27.6" r="1.1" fill="white"/>
          <!-- Beak -->
          <path d="M21 33.5 L23 37 L25 33.5 Z" fill="#D4A800"/>
        </svg>
        <svg class="tm-ico tm-ico-close" width="22" height="22"
          viewBox="0 0 24 24" fill="none"
          stroke="#FFF8E8" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span id="tm-notif" aria-hidden="true"></span>
      </button>

      <!-- ── CHAT PANEL ── -->
      <div id="tm-panel"
        role="dialog"
        aria-modal="false"
        aria-label="Gippo — The Mathemaniac AI chat assistant">

        <!-- Header -->
        <div id="tm-header">
          <div id="tm-avatar" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="23,7 36,13 23,19 10,13" fill="#6B0000"/>
              <rect x="33" y="13" width="2.5" height="8" rx="1.2" fill="#6B0000"/>
              <circle cx="34.25" cy="22" r="2.2" fill="#6B0000"/>
              <path d="M15 22 Q13 18 16 16 Q17 20 15 22Z" fill="rgba(107,0,0,0.7)"/>
              <path d="M31 22 Q33 18 30 16 Q29 20 31 22Z" fill="rgba(107,0,0,0.7)"/>
              <circle cx="18" cy="29" r="5.5" fill="rgba(107,0,0,0.9)"/>
              <circle cx="18" cy="29" r="3.2" fill="#1a0000"/>
              <circle cx="19.4" cy="27.6" r="1.1" fill="rgba(255,255,255,0.8)"/>
              <circle cx="28" cy="29" r="5.5" fill="rgba(107,0,0,0.9)"/>
              <circle cx="28" cy="29" r="3.2" fill="#1a0000"/>
              <circle cx="29.4" cy="27.6" r="1.1" fill="rgba(255,255,255,0.8)"/>
              <path d="M21 33.5 L23 37 L25 33.5 Z" fill="#6B0000"/>
            </svg>
          </div>
          <div id="tm-header-info">
            <div id="tm-header-title">Gippo</div>
            <div id="tm-header-sub">Your AI Counselor · The Mathemaniac</div>
            <div id="tm-status">
              <span id="tm-status-dot" aria-hidden="true"></span>
              <span id="tm-status-text">Online</span>
            </div>
          </div>
          <button id="tm-close" aria-label="Close chat assistant">✕</button>
        </div>

        <!-- Messages -->
        <div id="tm-messages"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"></div>

        <!-- Quick reply chips -->
        <div id="tm-chips"
          role="group"
          aria-label="Quick reply options"></div>

        <!-- Input row -->
        <div id="tm-input-row">
          <textarea
            id="tm-textarea"
            rows="1"
            placeholder="Ask anything about The Mathemaniac…"
            aria-label="Type your message"
            autocomplete="off"
            spellcheck="true"></textarea>
          <button id="tm-send" aria-label="Send message" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#FFF8E8" stroke-width="2.3"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <!-- Footer credit -->
        <div id="tm-credit">Powered by Synapse EduTech AI</div>
      </div>
    `;

    document.body.appendChild(root);
    return root;
  }

  /* ── HELPERS ─────────────────────────────────────────────── */
  function ts() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function scrollBottom(el) { el.scrollTop = el.scrollHeight; }

  /* Markdown renderer: **bold**, *italic*, [text](url), bare https:// → HTML */
  function mdToHTML(raw) {
    /* Process text in segments — links first, then escape + format the rest */
    const parts  = [];
    const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"'\]\)]+)/g;
    let last = 0, m;

    while ((m = linkRe.exec(raw)) !== null) {
      if (m.index > last) parts.push({ t: 'text', v: raw.slice(last, m.index) });
      if (m[1]) {
        /* Markdown link: [label](url) */
        parts.push({ t: 'link', label: m[1], url: m[2] });
      } else {
        /* Bare URL */
        parts.push({ t: 'link', label: m[3], url: m[3] });
      }
      last = m.index + m[0].length;
    }
    if (last < raw.length) parts.push({ t: 'text', v: raw.slice(last) });

    return parts.map(p => {
      if (p.t === 'link') {
        const u = escHTML(p.url), l = escHTML(p.label);
        return `<a href="${u}" target="_blank" rel="noopener noreferrer" class="tm-link">${l}</a>`;
      }
      return escHTML(p.v)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g,     '<em>$1</em>')
        .replace(/\n/g,            '<br>');
    }).join('');
  }

  function escHTML(s) {
    return s
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#x27;');
  }

  /* ── RENDER MESSAGES ─────────────────────────────────────── */
  function appendMsg(role, html, replaceEl) {
    const msgs = document.getElementById('tm-messages');
    const row  = document.createElement('div');
    row.className = 'tm-row tm-' + role;

    if (role === 'bot') {
      const av = document.createElement('div');
      av.className = 'tm-msg-av';
      av.setAttribute('aria-hidden', 'true');
      av.textContent = 'G';
      row.appendChild(av);
    }

    const bubble = document.createElement('div');
    bubble.className = 'tm-bubble tm-' + role;
    bubble.innerHTML = html;

    const stamp = document.createElement('span');
    stamp.className = 'tm-ts';
    stamp.textContent = ts();
    stamp.setAttribute('aria-label', 'Sent at ' + stamp.textContent);

    if (role === 'user') {
      row.appendChild(stamp);
      row.appendChild(bubble);
    } else {
      row.appendChild(bubble);
      row.appendChild(stamp);
    }

    if (replaceEl) {
      replaceEl.replaceWith(row);
    } else {
      msgs.appendChild(row);
    }

    scrollBottom(msgs);
    return row;
  }

  function showTyping() {
    const msgs = document.getElementById('tm-messages');
    const row  = document.createElement('div');
    row.id = 'tm-typing-row';
    row.className = 'tm-row tm-bot';
    const av = document.createElement('div');
    av.className = 'tm-msg-av'; av.setAttribute('aria-hidden','true'); av.textContent = 'G';
    row.innerHTML = `
      <div class="tm-msg-av" aria-hidden="true">G</div>
      <div class="tm-typing" aria-label="AI is thinking">
        <div class="tm-dot"></div>
        <div class="tm-dot"></div>
        <div class="tm-dot"></div>
      </div>`;
    msgs.appendChild(row);
    scrollBottom(msgs);
    return row;
  }

  function addDivider(label) {
    const msgs = document.getElementById('tm-messages');
    const d = document.createElement('div');
    d.className = 'tm-divider';
    d.textContent = label;
    msgs.appendChild(d);
  }

  /* ── CHIPS ───────────────────────────────────────────────── */
  function buildChips(onSend) {
    const el = document.getElementById('tm-chips');
    el.innerHTML = '';
    QUICK_CHIPS.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'tm-chip';
      btn.textContent = text;
      btn.addEventListener('click', () => { hideChips(); onSend(text); });
      el.appendChild(btn);
    });
  }
  function hideChips() {
    const el = document.getElementById('tm-chips');
    if (el) el.style.display = 'none';
  }

  /* ── API CALL ────────────────────────────────────────────── */
  async function callAPI(messages) {
    const resp = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, sessionId: getSessionId() }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    const ct = resp.headers.get('content-type') || '';

    /* ── Streaming (SSE) ── */
    if (ct.includes('event-stream') || ct.includes('octet-stream')) {
      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let out = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        decoder.decode(value).split('\n').forEach(line => {
          if (!line.startsWith('data: ')) return;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') return;
          try {
            const p = JSON.parse(payload);
            out += p?.choices?.[0]?.delta?.content || '';
          } catch { /* skip malformed */ }
        });
      }
      return out;
    }

    /* ── Plain JSON ── */
    const data = await resp.json();
    return (
      data?.choices?.[0]?.message?.content ||
      data?.reply   ||
      data?.message ||
      data?.content ||
      ''
    );
  }

  /* ── MAIN LOGIC ──────────────────────────────────────────── */
  function init() {
    injectStyles();
    const root = buildHTML();

    const fab      = document.getElementById('tm-fab');
    const panel    = document.getElementById('tm-panel');
    const closeBtn = document.getElementById('tm-close');
    const textarea = document.getElementById('tm-textarea');
    const sendBtn  = document.getElementById('tm-send');

    let history    = loadHistory();
    let isLoading  = false;
    let firstOpen  = true;

    /* ── Send a message ───────────────────────────────────── */
    async function sendMessage(text) {
      text = text.trim();
      if (!text || isLoading) return;

      isLoading = true;
      sendBtn.disabled = true;
      textarea.value = '';
      textarea.style.height = 'auto';
      hideChips();

      appendMsg('user', escHTML(text));
      history.push({ role: 'user', content: text });
      saveHistory(history);

      const typingRow = showTyping();

      try {
        const reply     = await callAPI(history);
        const replyHTML = mdToHTML(reply);
        appendMsg('bot', replyHTML, typingRow);
        history.push({ role: 'assistant', content: reply });
        saveHistory(history);
      } catch {
        appendMsg('bot', ERROR_HTML, typingRow);
      } finally {
        isLoading = false;
        sendBtn.disabled = textarea.value.trim().length === 0;
        textarea.focus();
      }
    }

    /* ── Open / close ─────────────────────────────────────── */
    function openPanel() {
      root.classList.add('open');
      fab.setAttribute('aria-expanded', 'true');

      if (firstOpen) {
        firstOpen = false;
        if (history.length > 0) {
          /* Restore previous session */
          addDivider('Previous conversation');
          history.forEach(m =>
            appendMsg(
              m.role === 'user' ? 'user' : 'bot',
              m.role === 'user' ? escHTML(m.content) : mdToHTML(m.content)
            )
          );
          addDivider('Today');
        } else {
          /* Fresh session — show welcome + chips */
          appendMsg('bot', WELCOME_HTML);
          buildChips(sendMessage);
        }
      }

      requestAnimationFrame(() => textarea.focus());
    }

    function closePanel() {
      root.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
      fab.focus();
    }

    /* ── Event wiring ─────────────────────────────────────── */
    fab.addEventListener('click', () =>
      root.classList.contains('open') ? closePanel() : openPanel()
    );
    closeBtn.addEventListener('click', closePanel);

    /* Auto-resize textarea */
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 104) + 'px';
      sendBtn.disabled = textarea.value.trim().length === 0 || isLoading;
    });

    /* Enter = send, Shift+Enter = newline */
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) sendMessage(textarea.value);
      }
    });

    sendBtn.addEventListener('click', () => {
      if (!sendBtn.disabled) sendMessage(textarea.value);
    });

    /* Global close on Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && root.classList.contains('open')) closePanel();
    });

    /* Close on outside click */
    document.addEventListener('click', e => {
      if (!root.classList.contains('open')) return;
      if (root.contains(e.target)) return;
      closePanel();
    });
  }

  /* ── Boot ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
