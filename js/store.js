'use strict';
/* Banco de dados local (IndexedDB) + cópia em memória.
   Cada registro tem id e updatedAt. Apagar = "lápide" (deleted:true), para a sincronização saber. */
const COLS = ['alunos', 'lancamentos', 'turmas', 'caixas', 'campos'];

const Store = (() => {
  let db;
  const data = {};
  const listeners = new Set();
  let version = 0;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function defaultConfig() {
    const y = new Date().getFullYear();
    return {
      id: 'config', escola: 'Minha Escola',
      multaPct: 2, jurosMesPct: 1, diaVencimento: 10, carenciaDias: 0,
      anoInicio: y + '-02', anoFim: y + '-12', saldoInicial: 0,
      meios: ['PIX', 'Dinheiro', 'Cartão', 'Boleto'],
      msgCobranca: 'Olá, {responsavel}! Aqui é da {escola}. Identificamos que a mensalidade de {aluno} ({meses}) está em aberto. Valor atualizado: {total}. Se já pagou, desconsidere esta mensagem. Qualquer dúvida estamos à disposição!',
      updatedAt: 0
    };
  }

  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('financeiro-escola', 1);
      r.onupgradeneeded = () => { [...COLS, 'config'].forEach(c => r.result.createObjectStore(c, { keyPath: 'id' })); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  const store = (c, mode = 'readwrite') => db.transaction(c, mode).objectStore(c);
  function persist(c, rec) {
    return new Promise((res, rej) => { const r = store(c).put(rec); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
  }
  function emit(meta = {}) { version++; listeners.forEach(f => { try { f(meta); } catch (e) { console.error(e); } }); }

  async function init() {
    db = await open();
    for (const c of [...COLS, 'config']) {
      data[c] = new Map();
      const all = await new Promise(res => { const r = store(c, 'readonly').getAll(); r.onsuccess = () => res(r.result); });
      all.forEach(x => data[c].set(x.id, x));
    }
    if (!data.config.has('config')) { const c = defaultConfig(); data.config.set('config', c); persist('config', c); }
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
  }

  const all = c => [...data[c].values()].filter(x => !x.deleted);
  const get = (c, id) => { const x = data[c].get(id); return x && !x.deleted ? x : undefined; };

  function put(c, rec) {
    const r = { ...rec, id: rec.id || uid(), updatedAt: Date.now() };
    delete r.deleted;
    data[c].set(r.id, r); persist(c, r); emit();
    return r;
  }
  function del(c, id) {
    const old = get(c, id);
    const r = { id, deleted: true, updatedAt: Date.now() };
    data[c].set(id, r); persist(c, r); emit();
    return old;
  }
  const config = () => get('config', 'config');
  function setConfig(patch) { return put('config', { ...config(), ...patch }); }

  function snapshot() {
    const out = {};
    for (const c of [...COLS, 'config']) out[c] = [...data[c].values()];
    return { app: 'financeiro-escolar', version: 1, savedAt: new Date().toISOString(), data: out };
  }

  /* Junta um snapshot vindo de fora: para cada registro, vence o mais recente. */
  function mergeSnapshot(snap) {
    if (!snap || !snap.data) return false;
    let changed = false;
    for (const c of [...COLS, 'config']) {
      for (const rec of (snap.data[c] || [])) {
        if (!rec || !rec.id) continue;
        const loc = data[c].get(rec.id);
        if (!loc || (rec.updatedAt || 0) > (loc.updatedAt || 0)) { data[c].set(rec.id, rec); persist(c, rec); changed = true; }
      }
    }
    if (changed) emit({ remote: true });
    return changed;
  }

  /* Restaurar backup: substitui tudo (o que não está no arquivo é marcado como apagado). */
  function replaceAll(snap) {
    if (!snap || !snap.data) throw new Error('Arquivo inválido');
    const now = Date.now();
    for (const c of [...COLS, 'config']) {
      const incoming = snap.data[c] || [];
      const ids = new Set(incoming.map(r => r.id));
      for (const rec of [...data[c].values()]) {
        if (!ids.has(rec.id) && !rec.deleted && c !== 'config') { const t = { id: rec.id, deleted: true, updatedAt: now }; data[c].set(rec.id, t); persist(c, t); }
      }
      for (const rec of incoming) { const r = { ...rec, updatedAt: now }; data[c].set(r.id, r); persist(c, r); }
    }
    if (!data.config.has('config')) { const c = defaultConfig(); data.config.set('config', c); persist('config', c); }
    emit();
  }

  return {
    init, all, get, put, del, config, setConfig, snapshot, mergeSnapshot, replaceAll, uid,
    on: f => listeners.add(f),
    get version() { return version; }
  };
})();
