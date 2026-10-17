'use strict';
/* ===== utilitários ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p2 = n => String(n).padStart(2, '0');
const round2 = n => Math.round((+n || 0) * 100) / 100;
const brl = n => round2(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
const curRef = () => todayStr().slice(0, 7);
const fdate = s => s ? s.split('-').reverse().join('/') : '';
const refLabel = r => r ? `${MESES[+r.slice(5, 7) - 1]}/${r.slice(0, 4)}` : '';
const refShort = r => r ? `${MESES[+r.slice(5, 7) - 1].slice(0, 3)}/${r.slice(2, 4)}` : '';
function addMonths(ref, n) { let y = +ref.slice(0, 4), m = +ref.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + p2(m + 1); }
function monthsBetween(a, b) { const out = []; let r = a, g = 0; while (r <= b && g++ < 120) { out.push(r); r = addMonths(r, 1); } return out; }
const daysInMonth = ref => new Date(+ref.slice(0, 4), +ref.slice(5, 7), 0).getDate();
const dnum = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
const diffDays = (a, b) => Math.round(dnum(a) - dnum(b));
const sum = (arr, f = x => x) => arr.reduce((t, x) => t + (+f(x) || 0), 0);
function parseMoney(s) {
  s = String(s ?? '').replace(/[^\d,.\-]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return round2(parseFloat(s) || 0);
}
const moneyIn = n => n ? round2(n).toFixed(2).replace('.', ',') : '';
function normPhone(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length <= 11) d = '55' + d;
  return d;
}
function download(name, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const csvCell = v => { v = String(v ?? ''); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const toCSV = rows => rows.map(r => r.map(csvCell).join(';')).join('\r\n');

/* ===== regras de negócio ===== */
const cfg = () => Store.config();
const mesesLetivos = () => { const c = cfg(); return monthsBetween(c.anoInicio, c.anoFim); };
const caixaNome = id => (Store.get('caixas', id) || {}).nome || '';
const mensCaixaIds = () => new Set(Store.all('caixas').filter(c => c.mensalidade).map(c => c.id));

let _idx = { v: -1 };
function idx() {
  if (_idx.v === Store.version) return _idx;
  const pagos = new Map(), mens = mensCaixaIds();
  for (const l of Store.all('lancamentos')) {
    if (l.tipo === 'Entrada' && l.aluno && l.ref && mens.has(l.caixa)) {
      const k = l.aluno + '|' + l.ref;
      pagos.set(k, (pagos.get(k) || 0) + (+l.valor || 0) - (+l.multa || 0));
    }
  }
  _idx = { v: Store.version, pagos, atr: null };
  return _idx;
}

function valorMensal(a) {
  const t = Store.get('turmas', a.turma); if (!t) return 0;
  let v = +t.valor || 0; const d = +a.desconto || 0;
  if (d) v = a.descontoTipo === 'pct' ? v * (1 - d / 100) : v - d;
  return Math.max(0, round2(v));
}
function devidoRef(a, ref) {
  const c = cfg();
  if (ref < (a.inicio || c.anoInicio)) return 0;
  if (a.ativo === false && a.saidaMes && ref >= a.saidaMes) return 0;
  return valorMensal(a);
}
function infoRef(a, ref) {
  const c = cfg(), hoje = todayStr();
  const devido = devidoRef(a, ref);
  const pago = round2(idx().pagos.get(a.id + '|' + ref) || 0);
  const resta = Math.max(0, round2(devido - pago));
  const venc = ref + '-' + p2(Math.min(+c.diaVencimento || 10, daysInMonth(ref)));
  const dias = diffDays(hoje, venc);
  let status;
  if (devido === 0) status = 'isento';
  else if (resta <= 0.004) status = 'pago';
  else if (dias > (+c.carenciaDias || 0)) status = 'atrasado';
  else status = pago > 0 ? 'parcial' : 'pendente';
  const atraso = status === 'atrasado';
  const multa = atraso ? round2(resta * (+c.multaPct || 0) / 100) : 0;
  const juros = atraso ? round2(resta * ((+c.jurosMesPct || 0) / 100) / 30 * dias) : 0;
  return { ref, devido, pago, resta, venc, status, dias: atraso ? dias : 0, multa, juros, encargos: round2(multa + juros), total: round2(resta + multa + juros) };
}
/* mapa aluno -> {itens (meses em atraso), resta, encargos, total} */
function atrasos() {
  const I = idx();
  if (I.atr) return I.atr;
  const m = new Map(), refs = mesesLetivos();
  for (const a of Store.all('alunos')) {
    if (a.ativo === false) continue;
    const itens = refs.map(r => infoRef(a, r)).filter(i => i.status === 'atrasado');
    if (itens.length) m.set(a.id, { aluno: a, itens, resta: round2(sum(itens, i => i.resta)), encargos: round2(sum(itens, i => i.encargos)), total: round2(sum(itens, i => i.total)) });
  }
  I.atr = m; return m;
}
/* meses do aluno em aberto (atrasados ou não), do mais antigo ao mais novo */
function emAberto(a) { return mesesLetivos().map(r => infoRef(a, r)).filter(i => i.resta > 0 && i.devido > 0); }

function waLink(a, itens) {
  const c = cfg();
  const usa1 = a.tel1 || !a.tel2;
  const phone = normPhone(usa1 ? a.tel1 : a.tel2);
  const resp = (usa1 ? a.resp1 : a.resp2) || a.resp1 || a.resp2 || 'responsável';
  const nomeResp = String(resp).trim().split(/\s+/)[0] ? resp : 'responsável';
  const rep = {
    responsavel: nomeResp, aluno: a.nome, escola: c.escola,
    meses: itens.map(i => refLabel(i.ref)).join(', '),
    valor: brl(sum(itens, i => i.resta)), encargos: brl(sum(itens, i => i.encargos)), total: brl(sum(itens, i => i.total))
  };
  const text = String(c.msgCobranca || '').replace(/\{(\w+)\}/g, (m, k) => rep[k] ?? m);
  return { url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`, phone };
}

/* campos personalizados */
const camposFor = ent => Store.all('campos').filter(c => c.entidade === ent).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
function campoInput(c, val) {
  const n = 'x_' + c.id, v = val ?? '';
  switch (c.tipo) {
    case 'numero': return `<input name="${n}" inputmode="decimal" value="${esc(v)}">`;
    case 'data': return `<input type="date" name="${n}" value="${esc(v)}">`;
    case 'lista': return `<select name="${n}"><option value=""></option>${(c.opcoes || []).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    case 'simnao': return `<select name="${n}"><option value=""></option><option ${v === 'Sim' ? 'selected' : ''}>Sim</option><option ${v === 'Não' ? 'selected' : ''}>Não</option></select>`;
    default: return `<input name="${n}" value="${esc(v)}">`;
  }
}
const camposHtml = (ent, extra = {}) => camposFor(ent).map(c => `<label class="fld"><span>${esc(c.nome)}</span>${campoInput(c, extra[c.id])}</label>`).join('');
function readExtras(fd, ent) { const x = {}; camposFor(ent).forEach(c => { const v = (fd.get('x_' + c.id) || '').toString().trim(); if (v) x[c.id] = v; }); return x; }

/* ===== modal, toast ===== */
function modal({ title, body, foot = '', onSubmit, wide = false, onOpen }) {
  const el = document.createElement('div');
  el.className = 'backdrop';
  el.innerHTML = `<div class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="sheet-h"><h2>${esc(title)}</h2><button type="button" class="x" data-act="closeModal" aria-label="Fechar">✕</button></div><form class="sheet-b" novalidate>${body}<div class="err"></div><div class="sheet-f">${foot}</div></form></div>`;
  $('#modal-root').appendChild(el);
  document.body.classList.add('noscroll');
  const form = $('form', el);
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!onSubmit) return;
    const r = await onSubmit(new FormData(form), form, el);
    if (r !== false) closeModal(el);
  });
  el.addEventListener('mousedown', e => { if (e.target === el) closeModal(el); });
  if (onOpen) onOpen(el, form);
  return el;
}
function closeModal(el) {
  el = el || $$('.backdrop').pop();
  if (!el) return;
  el.remove();
  if (!$$('.backdrop').length) document.body.classList.remove('noscroll');
}
const formError = (form, msg) => { $('.err', form).textContent = msg; $('.err', form).scrollIntoView({ block: 'nearest' }); return false; };
function toast(msg, action) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) $('button', t).onclick = () => { action.fn(); t.remove(); };
  $('#toast-root').appendChild(t);
  setTimeout(() => t.remove(), action ? 7000 : 3200);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
