'use strict';
/* Sincronização com o Google Drive (pasta privada do app, "appDataFolder").
   O arquivo fica invisível no Drive normal e só este app consegue abri-lo. */
const Sync = (() => {
  const FILE = 'financeiro-escola.json';
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  let token = null, exp = 0, timer = null, busy = false;
  const st = { state: 'off', msg: '', last: +localStorage.getItem('lastSync') || 0 };
  const subs = new Set();
  const set = (state, msg = '') => { st.state = state; st.msg = msg; subs.forEach(f => f(st)); };

  const clientId = () => localStorage.getItem('gclient') || window.GOOGLE_CLIENT_ID || '';
  const configured = () => !!clientId();
  const connected = () => !!localStorage.getItem('gconnected');

  function loadGIS() {
    return new Promise((res, rej) => {
      if (window.google && google.accounts && google.accounts.oauth2) return res();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = () => res();
      s.onerror = () => rej(new Error('Sem conexão com o Google. Verifique a internet.'));
      document.head.appendChild(s);
    });
  }

  async function auth(interactive) {
    if (token && Date.now() < exp - 60000) return token;
    if (!configured()) throw new Error('Falta o ID de cliente do Google (Ajustes → Sincronização).');
    await loadGIS();
    return new Promise((res, rej) => {
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: clientId(), scope: SCOPE,
        callback: r => {
          if (r.error) return rej(new Error(r.error_description || r.error));
          token = r.access_token; exp = Date.now() + (r.expires_in || 3600) * 1000;
          localStorage.setItem('gconnected', '1'); res(token);
        },
        error_callback: e => rej(new Error(e && e.type === 'popup_closed' ? 'Login cancelado.' : 'É preciso tocar em "Sincronizar" para entrar na conta Google.'))
      });
      tc.requestAccessToken({ prompt: connected() ? '' : 'consent' });
    });
  }

  async function gfetch(url, opt = {}) {
    const r = await fetch(url, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + token } });
    if (r.status === 401) { token = null; throw new Error('Sessão expirada. Toque em sincronizar novamente.'); }
    if (!r.ok) throw new Error('Google Drive respondeu erro ' + r.status + (r.status === 403 ? ' (verifique se a API do Drive está ativada)' : ''));
    return r;
  }

  async function findFile() {
    const q = encodeURIComponent(`name='${FILE}' and trashed=false`);
    const r = await gfetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&pageSize=1`);
    return (await r.json()).files[0];
  }

  async function sync(interactive = false) {
    if (busy) return;
    busy = true; set('sync');
    try {
      await auth(interactive);
      const f = await findFile();
      if (f) {
        const remote = await (await gfetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`)).json();
        Store.mergeSnapshot(remote);
      }
      const body = JSON.stringify(Store.snapshot());
      if (f) {
        await gfetch(`https://www.googleapis.com/upload/drive/v3/files/${f.id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
      } else {
        const b = 'fe' + Date.now();
        const multi = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: FILE, parents: ['appDataFolder'] })}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`;
        await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: multi });
      }
      st.last = Date.now(); localStorage.setItem('lastSync', st.last);
      set('ok');
    } catch (e) {
      set(interactive ? 'error' : (connected() ? 'login' : 'error'), e.message || String(e));
    } finally { busy = false; }
  }

  function schedule() {
    if (!configured() || !connected()) return;
    clearTimeout(timer);
    timer = setTimeout(() => sync(false), 4000);
  }

  function setClient(id) { localStorage.setItem('gclient', id.trim()); if (!id.trim()) disconnect(); refresh(); }
  function disconnect() { token = null; localStorage.removeItem('gconnected'); refresh(); }
  function refresh() { if (!configured()) set('off'); else if (!connected()) set('idle'); else if (st.state === 'off' || st.state === 'idle') set('login'); }
  refresh();

  return { sync, schedule, configured, connected, setClient, disconnect, state: () => st, on: f => subs.add(f) };
})();
