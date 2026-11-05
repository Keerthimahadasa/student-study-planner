/* utils.js - small helpers shared by every other file (dates, icons, toasts, dialogs). */
const Utils = (() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

  /* ---------- Dates (all stored as "YYYY-MM-DD" text, handled in local time) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayISO = () => toISO(new Date());

  /* Returns a Date, or null when the text is not a real calendar date (e.g. 2026-02-31). */
  function parseISO(text) {
    if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const [y, m, d] = text.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
  }
  const isValidTime = (t) => t === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  const addDays = (iso, n) => { const d = parseISO(iso); return toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
  const daysBetween = (fromISO, toISOText) => Math.round((parseISO(toISOText) - parseISO(fromISO)) / 86400000);

  function formatDate(iso) {
    const d = parseISO(iso);
    return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Invalid date';
  }
  function formatLongDate(iso) {
    const d = parseISO(iso);
    return d ? d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  }
  function formatTime(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
  }

  /* ---------- Icons (inline SVG so the app works offline) ---------- */
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    tasks: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    chevL: '<path d="M15 18l-6-6 6-6"/>',
    chevR: '<path d="M9 18l6-6-6-6"/>'
  };
  function icon(name, size = 18) {
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }
  /* Replaces <i data-icon="name"></i> placeholders in the HTML with real SVG icons. */
  function hydrateIcons(root = document) {
    $$('[data-icon]', root).forEach((el) => {
      el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 18);
      el.removeAttribute('data-icon');
    });
  }

  /* ---------- Toast notifications ---------- */
  function toast(message, type = 'success') {
    const box = $('#toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = icon(type === 'error' ? 'alert' : 'check', 16) + '<span></span>';
    el.lastChild.textContent = message;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 250); }, 3200);
  }

  /* ---------- Confirmation dialog: resolves to true (confirmed) or false ---------- */
  function confirmDialog({ title, message, confirmText = 'Delete', danger = true }) {
    return new Promise((resolve) => {
      const dlg = $('#confirm-dialog');
      const ok = $('#confirm-ok');
      const cancel = $('#confirm-cancel');
      $('#confirm-title').textContent = title;
      $('#confirm-message').textContent = message;
      ok.textContent = confirmText;
      ok.className = 'btn ' + (danger ? 'danger' : 'primary');
      const finish = (answer) => {
        dlg.onclose = null; ok.onclick = null; cancel.onclick = null;
        if (dlg.open) dlg.close();
        resolve(answer);
      };
      ok.onclick = () => finish(true);
      cancel.onclick = () => finish(false);
      dlg.onclose = () => finish(false); // Escape key or backdrop click
      dlg.showModal();
    });
  }

  function downloadFile(filename, content, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function emptyState(title, text, buttonHTML = '') {
    return `<div class="empty"><strong>${esc(title)}</strong><p>${esc(text)}</p>${buttonHTML}</div>`;
  }

  return { $, $$, esc, uid, percent, toISO, todayISO, parseISO, isValidTime, addDays, daysBetween,
    formatDate, formatLongDate, formatTime, icon, hydrateIcons, toast, confirmDialog, downloadFile, emptyState };
})();
