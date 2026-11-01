// === KONFIGURATION (beides ist öffentlich gedacht; Schutz kommt von Login + RLS) ===
const SUPABASE_URL = 'https://hdettzthupebrsgqiorv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZXR0enRodXBlYnJzZ3Fpb3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMTMxNDgsImV4cCI6MjEwODc4OTE0OH0.ehU5KkBtgGJvuqjw4aBxprZ7a1rtBhhRia_hDi4CBHw';
const APP_VERSION = '11';

const NAMES = { josefb:'Josef B.', heidi:'Heidi', josefr:'Josef R.', markus:'Markus', alle:'Alle' };
const MON = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const pk = p => (NAMES[p] ? p : 'alle');
let sb, view = 'monat', cur = new Date(), sel = new Date(), minS = '00', minE = '00', apps = [], shop = [], chan;

const status = (t, bad) => { $('status').textContent = t; $('status').style.color = bad ? '#b91c1c' : ''; };
let toastTimer;
function toast(t) {
  let b = $('toast');
  if (!b) { b = el('div'); b.id = 'toast'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
  b.textContent = t; b.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => b.classList.remove('show'), 2500);
}
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// ---------- Start ----------
document.addEventListener('DOMContentLoaded', () => {
  $('ver').textContent = 'v' + APP_VERSION;
  const h = $('app-start-hour'), h2 = $('app-end-hour');
  for (let i = 0; i < 24; i++) { h.add(new Option(pad(i), pad(i))); h2.add(new Option(pad(i), pad(i))); }
  bindUI(); updateFormDates(sel); renderCalendar(); renderShopping();
  registerSW();
  if (!window.supabase || SUPABASE_URL.startsWith('HIER')) { $('config-err').hidden = false; return; }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  sb.auth.onAuthStateChange((_e, session) => session ? start() : stop());
  sb.auth.getSession().then(({ data }) => { if (!data.session) stop(); });
});

function start() {
  $('login-card').hidden = true; $('app').hidden = false;
  loadAll();
  if (chan) sb.removeChannel(chan);
  chan = sb.channel('planer')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, loadAll)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, loadAll)
    .subscribe();
}
function stop() { apps = []; shop = []; $('app').hidden = true; $('login-card').hidden = false; if (chan) { sb.removeChannel(chan); chan = null; } }

async function loadAll() {
  const [a, s] = await Promise.all([
    sb.from('appointments').select('*').order('start_date'),
    sb.from('shopping_items').select('*').order('shop_date')]);
  if (a.error || s.error) { const e = a.error || s.error; console.error(e); return status('Fehler: ' + e.message, true); }
  apps = a.data; shop = s.data; status('Synchronisiert ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
  renderCalendar(); renderShopping();
}

// ---------- UI-Bindings (kein Inline-JS wegen CSP) ----------
function bindUI() {
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault(); $('login-err').textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email: $('l-mail').value.trim(), password: $('l-pw').value });
    if (error) $('login-err').textContent = 'Anmeldung fehlgeschlagen.';
    $('l-pw').value = '';
  });
  $('logout').addEventListener('click', () => sb.auth.signOut());
  document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
    const n = +b.dataset.nav;
    if (n === 0) { cur = new Date(); sel = new Date(); updateFormDates(sel); }
    else if (view === 'monat') cur.setMonth(cur.getMonth() + n, 1); else cur.setDate(cur.getDate() + 7 * n);
    renderCalendar();
  }));
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    view = b.dataset.view;
    document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('active', x === b));
    renderCalendar();
  }));
  document.querySelectorAll('.minute-btn').forEach(b => b.addEventListener('click', () => {
    b.parentElement.querySelectorAll('.minute-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    if (b.parentElement.id === 'start-minutes') minS = b.dataset.min; else minE = b.dataset.min;
  }));
  $('app-start-date').addEventListener('change', e => { $('app-end-date').value = e.target.value; });
  $('appointment-form').addEventListener('submit', saveAppointment);
  $('shopping-form').addEventListener('submit', saveShopping);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && sb && !$('app').hidden) loadAll(); });
  window.addEventListener('online', () => { if (sb && !$('app').hidden) loadAll(); });
}

function updateFormDates(d) { ['app-start-date', 'app-end-date', 'shop-date'].forEach(i => $(i).value = iso(d)); }

// ---------- Speichern ----------
async function saveAppointment(e) {
  e.preventDefault();
  const title = $('app-title').value.trim().slice(0, 200);
  const sd = $('app-start-date').value, ed = $('app-end-date').value;
  if (!title || !sd || !ed) return;
  if (ed < sd) return alert('Das Ende-Datum liegt vor dem Beginn.');
  const { error } = await sb.from('appointments').insert({
    title, start_date: sd, end_date: ed,
    start_time: `${$('app-start-hour').value}:${minS}`, end_time: `${$('app-end-hour').value}:${minE}`,
    person: pk($('app-person').value), reminder: $('app-reminder').value });
  if (error) return alert('Speichern fehlgeschlagen: ' + error.message);
  $('app-title').value = ''; toast('Termin gespeichert'); loadAll();
}
async function saveShopping(e) {
  e.preventDefault();
  const title = $('shop-title').value.trim().slice(0, 200), d = $('shop-date').value;
  if (!title || !d) return;
  const { error } = await sb.from('shopping_items').insert({ title, shop_date: d, person: pk($('shop-person').value) });
  if (error) return alert('Speichern fehlgeschlagen: ' + error.message);
  $('shop-title').value = ''; toast('Artikel hinzugefügt'); loadAll();
}
async function del(table, id) {
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) alert('Löschen fehlgeschlagen: ' + error.message); else loadAll();
}

// ---------- Kalender ----------
function weekNo(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
}
function renderCalendar() {
  const body = $('calendar-body'); body.replaceChildren();
  if (view === 'monat') {
    const y = cur.getFullYear(), m = cur.getMonth();
    $('calendar-title').textContent = `${MON[m]} ${y}`;
    const first = (new Date(y, m, 1).getDay() + 6) % 7;
    for (let i = 0; i < 42; i++) { const d = new Date(y, m, 1 - first + i); body.appendChild(dayCell(d, d.getMonth() !== m)); }
  } else {
    const start = new Date(cur); start.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
    const end = new Date(start); end.setDate(start.getDate() + 6);
    $('calendar-title').textContent = `KW ${weekNo(start)} (${start.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); body.appendChild(dayCell(d, false)); }
  }
  renderDay();
}

// Tagesdetails (auf dem Handy sind die Kalenderfelder zu klein für lesbare Texte)
function renderDay() {
  const ds = iso(sel), list = $('day-list'); list.replaceChildren();
  $('day-title').textContent = sel.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const row = (cls, text, p, btn) => {
    const li = el('li', cls), sp = el('span');
    if (p) { const dot = el('span', 'person-dot'); dot.style.backgroundColor = `var(--${p})`; sp.appendChild(dot); }
    sp.append(text); li.appendChild(sp); if (btn) li.appendChild(btn); list.appendChild(li);
  };
  const button = (label, fn) => { const b = el('button', 'btn btn-danger', label); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const fe = Kalender.feiertag(ds), fr = Kalender.ferien(ds);
  if (fe) row('day-fe', '🎉 ' + fe + ' (Feiertag)');
  if (fr) row('day-fr', '🏫 Schulferien: ' + fr.name);
  apps.filter(a => a.start_date <= ds && a.end_date >= ds).forEach(a => {
    const t = a.start_time ? `${a.start_time}${a.end_time ? '–' + a.end_time : ''} ` : '';
    row('', `${t}${a.title} (${NAMES[pk(a.person)]})`, pk(a.person),
      button('Löschen', () => { if (confirm(`Termin „${a.title}" löschen?`)) del('appointments', a.id); }));
  });
  shop.filter(i => i.shop_date === ds).forEach(i =>
    row('', `🛒 ${i.title} (${NAMES[pk(i.person)]})`, pk(i.person), button('Erledigt', () => del('shopping_items', i.id))));
  if (!list.children.length) row('day-empty', 'Keine Einträge an diesem Tag');
}

function dayCell(date, other) {
  const c = el('div', 'calendar-day' + (other ? ' other-month' : ''));
  if (date.toDateString() === new Date().toDateString()) c.classList.add('today');
  if (date.toDateString() === sel.toDateString()) c.classList.add('selected');
  c.addEventListener('click', () => { sel = new Date(date); updateFormDates(sel); renderCalendar(); });
  c.appendChild(el('div', 'day-number', date.getDate()));
  const ds = iso(date);
  const fe = Kalender.feiertag(ds), fr = Kalender.ferien(ds);
  if (fe) {
    c.classList.add('holiday');
    const b = el('div', 'holiday-badge', '🎉 ' + fe); b.title = fe + ' (Feiertag in Bayern)'; c.appendChild(b);
  }
  if (fr) {
    c.classList.add('school-holiday');
    if (ds === fr.start || date.getDay() === 1) {
      const b = el('div', 'school-badge', '🏫 ' + fr.name); b.title = 'Schulferien: ' + fr.name; c.appendChild(b);
    }
  }
  apps.filter(a => a.start_date <= ds && a.end_date >= ds).forEach(a => {
    const b = el('div', 'appointment-badge ' + pk(a.person), `${a.start_time || ''} ${a.title}`.trim());
    b.title = `${a.title} – Klicken zum Löschen`;
    b.addEventListener('click', ev => { ev.stopPropagation(); if (confirm(`Termin „${a.title}" löschen?`)) del('appointments', a.id); });
    c.appendChild(b);
  });
  [...new Set(shop.filter(i => i.shop_date === ds).map(i => pk(i.person)))].forEach(p => {
    const b = el('div', `appointment-badge ${p} shopping-badge`, '🛒 Einkauf');
    b.title = 'Einkaufsliste für ' + NAMES[p];
    b.addEventListener('click', ev => { ev.stopPropagation(); highlight(ds, p); });
    c.appendChild(b);
  });
  return c;
}

// ---------- Einkaufsliste ----------
function renderShopping() {
  const body = $('shopping-list-body'); body.replaceChildren();
  if (!shop.length) { const td = el('td', null, 'Keine Artikel auf der Liste'); td.colSpan = 4; td.style.cssText = 'text-align:center;color:#94a3b8'; body.appendChild(el('tr')).appendChild(td); return; }
  shop.forEach(i => {
    const tr = el('tr'); tr.dataset.id = i.id; const p = pk(i.person);
    tr.appendChild(el('td', null, new Date(i.shop_date + 'T00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })));
    tr.appendChild(el('td')).appendChild(el('strong', null, i.title));
    const who = el('td'); const dot = el('span', 'person-dot'); dot.style.backgroundColor = `var(--${p})`;
    who.append(dot, NAMES[p]); tr.appendChild(who);
    const b = el('button', 'btn btn-danger', 'Erledigt'); b.type = 'button'; b.addEventListener('click', () => del('shopping_items', i.id));
    tr.appendChild(el('td')).appendChild(b); body.appendChild(tr);
  });
}
function highlight(ds, p) {
  $('shopping-card').scrollIntoView({ behavior: 'smooth' });
  shop.filter(i => i.shop_date === ds && pk(i.person) === p).forEach(i => {
    const tr = document.querySelector(`#shopping-list-body tr[data-id="${i.id}"]`);
    if (tr) { tr.classList.remove('highlighted-row'); void tr.offsetWidth; tr.classList.add('highlighted-row'); }
  });
}

// ---------- Service Worker / Updates ----------
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const had = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    const offer = w => { $('banner').hidden = false; $('upd').onclick = () => w.postMessage('SKIP_WAITING'); };
    if (reg.waiting && had) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
    });
    const check = () => reg.update().catch(() => {});
    setInterval(check, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  }).catch(() => {});
}
