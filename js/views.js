'use strict';
/* ===== telas ===== */
const S = {
  route: 'inicio',
  lanc: { q: '', tipo: '', caixa: '', mes: '', limit: 80 },
  alunos: { q: '', turma: '', sit: '' },
  mens: { ref: curRef(), turma: '', st: '', modo: 'mes' },
  rel: { mes: curRef(), dia: todayStr() }
};
const NAV_MOBILE = [['inicio', '🏠', 'Início'], ['lanc', '💰', 'Lançamentos'], ['alunos', '🎓', 'Alunos'], ['mens', '📅', 'Mensalidades'], ['mais', '⋯', 'Mais']];
const NAV_DESK = [['inicio', '🏠', 'Início'], ['lanc', '💰', 'Lançamentos'], ['alunos', '🎓', 'Alunos'], ['mens', '📅', 'Mensalidades'], ['rel', '📊', 'Relatórios'], ['ajustes', '⚙️', 'Ajustes'], ['ajuda', '❓', 'Ajuda']];
const TITLES = { inicio: 'Início', lanc: 'Lançamentos', alunos: 'Alunos', mens: 'Mensalidades', rel: 'Relatórios', ajustes: 'Ajustes', ajuda: 'Ajuda', mais: 'Mais opções' };

const badge = st => `<span class="badge b-${st}">${{ pago: 'Pago', parcial: 'Parcial', pendente: 'A vencer', atrasado: 'Atrasado', isento: 'Isento' }[st]}</span>`;
const empty = (ic, msg) => `<div class="empty"><span class="ic">${ic}</span>${msg}</div>`;
const turmaNome = a => (Store.get('turmas', a.turma) || {}).nome || '—';
const opt = (v, label, sel) => `<option value="${esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
const turmaOpts = sel => Store.all('turmas').sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || a.nome.localeCompare(b.nome)).map(t => opt(t.id, t.nome, sel)).join('');
const turmasOrdenadas = () => Store.all('turmas').sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || a.nome.localeCompare(b.nome));

function lancItem(l) {
  const cx = Store.get('caixas', l.caixa), a = l.aluno && Store.get('alunos', l.aluno);
  const title = a ? a.nome : (l.obs || (cx && cx.nome) || 'Lançamento');
  const sub = [fdate(l.data), cx && cx.nome, l.ref && refShort(l.ref), l.meio].filter(Boolean).join(' · ');
  const ent = l.tipo === 'Entrada';
  return `<button type="button" class="item" data-act="editLanc" data-id="${l.id}"><div class="item-m"><b>${esc(title)}</b><small>${esc(sub)}</small>${a && l.obs ? `<small class="obs">${esc(l.obs)}</small>` : ''}</div><div class="amt ${ent ? 'in' : 'out'}">${ent ? '+' : '−'} ${brl(l.valor)}</div></button>`;
}
const byDataDesc = (a, b) => (b.data || '').localeCompare(a.data || '') || (b.updatedAt || 0) - (a.updatedAt || 0);

/* ---------- Início ---------- */
function viewInicio() {
  const c = cfg(), mes = todayStr().slice(0, 7);
  const ls = Store.all('lancamentos');
  if (!Store.all('alunos').length && !ls.length) return viewVazio();
  let saldo = +c.saldoInicial || 0, ent = 0, sai = 0;
  for (const l of ls) {
    const v = +l.valor || 0, e = l.tipo === 'Entrada';
    saldo += e ? v : -v;
    if ((l.data || '').slice(0, 7) === mes) { if (e) ent += v; else sai += v; }
  }
  const at = [...atrasos().values()];
  const totAt = sum(at, x => x.total);
  const rec = ls.sort(byDataDesc).slice(0, 6);
  const hora = new Date().getHours();
  const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  return `
  <div class="hello"><h2>${saud}! 👋</h2><small>${esc(c.escola)} · ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</small></div>
  <div class="stats">
    <div class="stat big"><small>Saldo em caixa</small><b>${brl(saldo)}</b></div>
    <div class="stat"><small>Entradas de ${MESES[+mes.slice(5) - 1]}</small><b class="in">${brl(ent)}</b></div>
    <div class="stat"><small>Saídas de ${MESES[+mes.slice(5) - 1]}</small><b class="out">${brl(sai)}</b></div>
    <div class="stat ${at.length ? 'alert' : ''}"><small>Mensalidades em atraso</small><b>${at.length ? `${at.length} aluno${at.length > 1 ? 's' : ''}` : 'Nenhuma 🎉'}</b>${at.length ? `<small>${brl(totAt)} com multa e juros</small>` : ''}</div>
  </div>
  <div class="actions">
    <button type="button" class="bigbtn in" data-act="novoRecebimento"><span class="ic">➕</span><span>Receber pagamento<small>Mensalidade, matrícula, material…</small></span></button>
    <button type="button" class="bigbtn out" data-act="novaDespesa"><span class="ic">➖</span><span>Registrar despesa<small>Salário, aluguel, compras…</small></span></button>
    <button type="button" class="bigbtn warn" data-act="verAtrasados"><span class="ic">📲</span><span>Cobrar atrasados<small>${at.length ? `${at.length} para cobrar pelo WhatsApp` : 'Ninguém em atraso'}</small></span></button>
  </div>
  <div class="card" style="padding:0">
    <div class="row between" style="padding:14px 16px 4px"><h3 style="margin:0">Últimos lançamentos</h3><button type="button" class="btn sm" data-act="nav" data-r="lanc">Ver todos</button></div>
    <div class="list">${rec.length ? rec.map(lancItem).join('') : empty('📝', 'Nenhum lançamento ainda.')}</div>
  </div>`;
}
function viewVazio() {
  return `<div class="card tut"><div class="big">🏫</div><h3>Vamos começar!</h3>
    <p>Ainda não há dados neste aparelho. Escolha como quer começar:</p>
    <div class="menu-big mt">
      <button type="button" class="btn pri block" data-act="importar">📥 Já tenho um arquivo de dados (importar)</button>
      <button type="button" class="btn block" data-act="entrarGoogle">☁️ Já uso em outro aparelho (entrar com Google)</button>
      <button type="button" class="btn block" data-act="comecarZero">✨ Começar do zero</button>
    </div></div>`;
}

/* ---------- Lançamentos ---------- */
function filtrarLanc(f) {
  const q = norm(f.q).trim(), qn = parseMoney(f.q);
  let r = Store.all('lancamentos');
  if (f.tipo) r = r.filter(l => l.tipo === f.tipo);
  if (f.caixa) r = r.filter(l => l.caixa === f.caixa);
  if (f.mes) r = r.filter(l => (l.data || '').startsWith(f.mes));
  if (q) r = r.filter(l => {
    const a = l.aluno && Store.get('alunos', l.aluno), t = a && Store.get('turmas', a.turma);
    return norm([a && a.nome, t && t.nome, l.obs, caixaNome(l.caixa), l.meio].join(' ')).includes(q) || (qn && Math.abs((+l.valor) - qn) < 0.005);
  });
  return r.sort(byDataDesc);
}
function viewLanc() {
  const f = S.lanc;
  return `
  <div class="filters">
    <input class="full" id="lq" type="search" placeholder="Buscar por aluno, turma, observação ou valor…" value="${esc(f.q)}" data-bind="lanc.q">
    <select data-bind="lanc.tipo"><option value="">Entradas e saídas</option>${opt('Entrada', 'Só entradas', f.tipo)}${opt('Saída', 'Só saídas', f.tipo)}</select>
    <select data-bind="lanc.caixa"><option value="">Todos os caixas</option>${Store.all('caixas').sort((a, b) => a.nome.localeCompare(b.nome)).map(c => opt(c.id, c.nome, f.caixa)).join('')}</select>
    <input type="month" data-bind="lanc.mes" value="${esc(f.mes)}" title="Mês">
    <button type="button" class="btn" data-act="limparLanc">Limpar filtros</button>
  </div>
  <div class="row wrap" style="margin-bottom:12px">
    <button type="button" class="btn in grow" data-act="novoRecebimento">➕ Receber</button>
    <button type="button" class="btn danger grow" data-act="novaDespesa">➖ Despesa</button>
  </div>
  <div id="lanc-tot" class="totals"></div>
  <div id="lanc-list" class="listbox"></div>`;
}
function fillLanc() {
  const r = filtrarLanc(S.lanc), box = $('#lanc-list');
  if (!box) return;
  const ent = sum(r.filter(l => l.tipo === 'Entrada'), l => l.valor), sai = sum(r.filter(l => l.tipo !== 'Entrada'), l => l.valor);
  $('#lanc-tot').innerHTML = `<span>${r.length} lançamento${r.length === 1 ? '' : 's'}</span><span>Entradas: <b class="in">${brl(ent)}</b></span><span>Saídas: <b class="out">${brl(sai)}</b></span><span>Resultado: <b>${brl(ent - sai)}</b></span>`;
  const shown = r.slice(0, S.lanc.limit);
  box.innerHTML = shown.length ? `<div class="list">${shown.map(lancItem).join('')}</div>${r.length > shown.length ? `<div style="padding:12px;background:#fff"><button type="button" class="btn block" data-act="maisLanc">Mostrar mais (${r.length - shown.length} restantes)</button></div>` : ''}` : empty('🔎', 'Nada encontrado com esses filtros.');
}

/* ---------- Alunos ---------- */
function viewAlunos() {
  const f = S.alunos;
  return `
  <div class="filters">
    <input class="full" type="search" placeholder="Buscar aluno ou responsável…" value="${esc(f.q)}" data-bind="alunos.q">
    <select data-bind="alunos.turma"><option value="">Todas as turmas</option>${turmaOpts(f.turma)}</select>
    <select data-bind="alunos.sit">${opt('', 'Alunos ativos', f.sit)}${opt('atraso', 'Em atraso', f.sit)}${opt('emdia', 'Em dia', f.sit)}${opt('inativo', 'Inativos', f.sit)}</select>
    <button type="button" class="btn pri" data-act="novoAluno">➕ Novo aluno</button>
  </div>
  <div id="al-tot" class="totals"></div>
  <div id="al-list" class="listbox"></div>`;
}
function fillAlunos() {
  const box = $('#al-list'); if (!box) return;
  const f = S.alunos, q = norm(f.q).trim(), at = atrasos();
  let r = Store.all('alunos');
  r = f.sit === 'inativo' ? r.filter(a => a.ativo === false) : r.filter(a => a.ativo !== false);
  if (f.turma) r = r.filter(a => a.turma === f.turma);
  if (f.sit === 'atraso') r = r.filter(a => at.has(a.id));
  if (f.sit === 'emdia') r = r.filter(a => !at.has(a.id));
  if (q) r = r.filter(a => norm([a.nome, a.resp1, a.resp2, turmaNome(a)].join(' ')).includes(q));
  r.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  $('#al-tot').innerHTML = `<span><b>${r.length}</b> aluno${r.length === 1 ? '' : 's'}</span>${f.sit === 'atraso' ? `<span>Total em atraso: <b class="out">${brl(sum(r, a => at.get(a.id).total))}</b></span>` : ''}`;
  box.innerHTML = r.length ? `<div class="list">${r.map(a => {
    const x = at.get(a.id);
    return `<button type="button" class="item" data-act="verAluno" data-id="${a.id}"><div class="item-m"><b>${esc(a.nome)}</b><small>${esc(turmaNome(a))}${a.turno ? ' · ' + esc(a.turno) : ''}${a.resp1 ? ' · ' + esc(a.resp1) : ''}</small></div>${x ? `<span class="badge b-atrasado">${x.itens.length} em atraso · ${brl(x.total)}</span>` : ''}</button>`;
  }).join('')}</div>` : empty('🎓', Store.all('alunos').length ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado ainda.');
}

/* ---------- Mensalidades ---------- */
function viewMens() {
  const f = S.mens;
  const seg = `<div class="pills"><button type="button" class="pill ${f.modo === 'mes' ? 'on' : ''}" data-act="mensModo" data-m="mes">📅 Por mês</button><button type="button" class="pill ${f.modo === 'atrasados' ? 'on' : ''}" data-act="mensModo" data-m="atrasados">⏰ Atrasados (cobrança)</button></div>`;
  if (f.modo === 'atrasados') return seg + `<div id="mens-body"></div>`;
  return seg + `
  <div class="mbar"><button type="button" class="btn" data-act="mensMes" data-d="-1">◀</button><div class="lbl">${refLabel(f.ref)}</div><button type="button" class="btn" data-act="mensMes" data-d="1">▶</button></div>
  <div class="filters"><select data-bind="mens.turma"><option value="">Todas as turmas</option>${turmaOpts(f.turma)}</select>
  <select data-bind="mens.st"><option value="">Todas as situações</option>${opt('atrasado', 'Atrasados', f.st)}${opt('pendente', 'A vencer', f.st)}${opt('parcial', 'Pagamento parcial', f.st)}${opt('pago', 'Pagos', f.st)}</select></div>
  <div id="mens-body"></div>`;
}
function fillMens() {
  const body = $('#mens-body'); if (!body) return;
  const f = S.mens;
  if (f.modo === 'atrasados') return fillAtrasados(body);
  let rows = Store.all('alunos').map(a => ({ a, i: infoRef(a, f.ref) })).filter(x => x.i.devido > 0 || x.i.pago > 0);
  rows = rows.filter(x => x.a.ativo !== false || x.i.pago > 0);
  if (f.turma) rows = rows.filter(x => x.a.turma === f.turma);
  const resumo = sum(rows, x => x.i.devido), pago = sum(rows, x => Math.min(x.i.pago, x.i.devido)), falta = sum(rows, x => x.i.resta);
  if (f.st) rows = rows.filter(x => x.i.status === f.st);
  const ordem = { atrasado: 0, parcial: 1, pendente: 2, pago: 3, isento: 4 };
  rows.sort((x, y) => ordem[x.i.status] - ordem[y.i.status] || x.a.nome.localeCompare(y.a.nome, 'pt-BR'));
  body.innerHTML = `<div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><small>Esperado</small><b style="font-size:1.1rem">${brl(resumo)}</b></div><div class="stat"><small>Recebido</small><b class="in" style="font-size:1.1rem">${brl(pago)}</b></div><div class="stat"><small>Falta receber</small><b class="out" style="font-size:1.1rem">${brl(falta)}</b></div></div>
  <div class="listbox">${rows.length ? `<div class="list">${rows.map(({ a, i }) => `
    <div class="item" style="cursor:default"><div class="item-m"><button type="button" style="all:unset;cursor:pointer" data-act="verAluno" data-id="${a.id}"><b>${esc(a.nome)}</b></button><small>${esc(turmaNome(a))} · ${brl(i.devido)}${i.pago ? ` · pago ${brl(i.pago)}` : ''}${i.status === 'atrasado' ? ` · ${i.dias} dias de atraso` : ''}</small></div>
    <div class="row" style="gap:8px">${badge(i.status)}${i.resta > 0 ? `<button type="button" class="btn in sm" data-act="receber" data-id="${a.id}" data-ref="${f.ref}">Receber</button>` : ''}</div></div>`).join('')}</div>` : empty('📅', 'Nenhum aluno nesta situação.')}</div>`;
}
function fillAtrasados(body) {
  const f = S.mens;
  let r = [...atrasos().values()];
  r.sort((x, y) => y.total - x.total);
  body.innerHTML = `<div class="filters"><select data-bind="mens.turma"><option value="">Todas as turmas</option>${turmaOpts(f.turma)}</select></div>`;
  if (f.turma) r = r.filter(x => x.aluno.turma === f.turma);
  body.innerHTML += `<div class="totals"><span><b>${r.length}</b> aluno${r.length === 1 ? '' : 's'} em atraso</span><span>Principal: <b>${brl(sum(r, x => x.resta))}</b></span><span>Multa e juros: <b class="out">${brl(sum(r, x => x.encargos))}</b></span><span>Total: <b>${brl(sum(r, x => x.total))}</b></span></div>
  <div class="listbox">${r.length ? `<div class="list">${r.map(x => {
    const a = x.aluno, w = waLink(a, x.itens);
    return `<div class="item" style="cursor:default;align-items:flex-start"><div class="item-m"><button type="button" style="all:unset;cursor:pointer" data-act="verAluno" data-id="${a.id}"><b>${esc(a.nome)}</b></button><small>${esc(turmaNome(a))}${a.resp1 ? ' · ' + esc(a.resp1) : ''}</small><small>${x.itens.length > 3 ? `${refShort(x.itens[0].ref)} a ${refShort(x.itens[x.itens.length - 1].ref)} (${x.itens.length} meses)` : x.itens.map(i => refShort(i.ref)).join(', ')} · ${x.itens[0].dias} dias da mais antiga</small>${w.phone ? '' : '<small style="color:var(--warn)">⚠ sem telefone cadastrado</small>'}</div>
      <div style="text-align:right;display:flex;flex-direction:column;gap:6px;align-items:flex-end"><div class="amt out">${brl(x.total)}</div><small>${brl(x.resta)} + ${brl(x.encargos)} encargos</small><div class="row" style="gap:6px"><button type="button" class="btn wa sm" data-act="cobrar" data-id="${a.id}">📲 WhatsApp</button><button type="button" class="btn in sm" data-act="receber" data-id="${a.id}">Receber</button></div></div></div>`;
  }).join('')}</div>` : empty('🎉', 'Ninguém em atraso!')}</div>`;
}

/* ---------- Relatórios ---------- */
function viewRel() {
  const mes = S.rel.mes, dia = S.rel.dia;
  const ls = Store.all('lancamentos').filter(l => (l.data || '').startsWith(mes));
  const ent = sum(ls.filter(l => l.tipo === 'Entrada'), l => l.valor), sai = sum(ls.filter(l => l.tipo !== 'Entrada'), l => l.valor);
  const por = {};
  ls.forEach(l => { const n = caixaNome(l.caixa) || 'Sem caixa'; por[n] = por[n] || { e: 0, s: 0 }; if (l.tipo === 'Entrada') por[n].e += +l.valor || 0; else por[n].s += +l.valor || 0; });
  const cx = Object.entries(por).sort((a, b) => (b[1].e + b[1].s) - (a[1].e + a[1].s));
  const maxCx = Math.max(1, ...cx.map(([, v]) => Math.max(v.e, v.s)));
  const meios = {};
  ls.filter(l => l.tipo === 'Entrada').forEach(l => { const m = l.meio || 'Não informado'; meios[m] = (meios[m] || 0) + (+l.valor || 0); });
  const turmas = turmasOrdenadas().map(t => {
    const al = Store.all('alunos').filter(a => a.turma === t.id);
    const infos = al.map(a => infoRef(a, mes)).filter(i => i.devido > 0 || i.pago > 0);
    return { t, esperado: sum(infos, i => i.devido), pago: sum(infos, i => Math.min(i.pago, i.devido)), n: infos.length };
  }).filter(x => x.n);
  // últimos 12 meses
  const meses = Array.from({ length: 12 }, (_, k) => addMonths(curRef(), k - 11));
  const tr = meses.map(m => { const l = Store.all('lancamentos').filter(x => (x.data || '').startsWith(m)); return { m, e: sum(l.filter(x => x.tipo === 'Entrada'), x => x.valor), s: sum(l.filter(x => x.tipo !== 'Entrada'), x => x.valor) }; });
  const mx = Math.max(1, ...tr.map(x => Math.max(x.e, x.s)));
  const dl = Store.all('lancamentos').filter(l => l.data === dia).sort(byDataDesc);
  const de = sum(dl.filter(l => l.tipo === 'Entrada'), l => l.valor), ds = sum(dl.filter(l => l.tipo !== 'Entrada'), l => l.valor);
  return `
  <div class="card"><div class="row between wrap"><h3 style="margin:0">Resumo do mês</h3><input type="month" value="${esc(mes)}" data-bind="rel.mes" style="border:1.5px solid var(--line);border-radius:12px;padding:9px 12px"></div>
    <div class="stats mt" style="grid-template-columns:repeat(3,1fr);margin:12px 0 0"><div class="stat"><small>Entradas</small><b class="in" style="font-size:1.1rem">${brl(ent)}</b></div><div class="stat"><small>Saídas</small><b class="out" style="font-size:1.1rem">${brl(sai)}</b></div><div class="stat"><small>Resultado</small><b style="font-size:1.1rem">${brl(ent - sai)}</b></div></div></div>
  <div class="grid2">
  <div class="card"><h3>Por caixa</h3>${cx.length ? `<table class="t"><tr><th>Caixa</th><th class="r">Entradas</th><th class="r">Saídas</th></tr>${cx.map(([n, v]) => `<tr><td>${esc(n)}<div class="bar"><i style="width:${Math.max(v.e, v.s) / maxCx * 100}%"></i></div></td><td class="r" style="color:var(--in)">${v.e ? brl(v.e) : '—'}</td><td class="r" style="color:var(--out)">${v.s ? brl(v.s) : '—'}</td></tr>`).join('')}</table>` : '<small>Sem lançamentos neste mês.</small>'}</div>
  <div class="card"><h3>Mensalidades por turma</h3>${turmas.length ? `<table class="t"><tr><th>Turma</th><th class="r">Esperado</th><th class="r">Recebido</th></tr>${turmas.map(x => `<tr><td>${esc(x.t.nome)} <small>(${x.n})</small></td><td class="r">${brl(x.esperado)}</td><td class="r" style="color:var(--in)">${brl(x.pago)}</td></tr>`).join('')}</table>` : '<small>Nada cobrado neste mês.</small>'}</div>
  <div class="card"><h3>Entradas por forma de pagamento</h3>${Object.keys(meios).length ? `<table class="t">${Object.entries(meios).sort((a, b) => b[1] - a[1]).map(([m, v]) => `<tr><td>${esc(m)}</td><td class="r">${brl(v)}</td></tr>`).join('')}</table>` : '<small>Sem entradas neste mês.</small>'}</div>
  <div class="card"><h3>Últimos 12 meses</h3><div class="trend">${tr.map(x => `<div class="col"><div class="bars"><i class="e" style="height:${x.e / mx * 100}%" title="Entradas ${brl(x.e)}"></i><i class="s" style="height:${x.s / mx * 100}%" title="Saídas ${brl(x.s)}"></i></div>${MESES[+x.m.slice(5) - 1].slice(0, 3)}</div>`).join('')}</div><div class="legend"><span><i style="background:var(--in)"></i>Entradas</span><span><i style="background:#e48d8d"></i>Saídas</span></div></div>
  </div>
  <div class="card mt"><div class="row between wrap"><h3 style="margin:0">Fechamento do dia</h3><input type="date" value="${esc(dia)}" data-bind="rel.dia" style="border:1.5px solid var(--line);border-radius:12px;padding:9px 12px"></div>
    <div class="totals mt"><span>Entradas: <b class="in">${brl(de)}</b></span><span>Saídas: <b class="out">${brl(ds)}</b></span><span>Saldo do dia: <b>${brl(de - ds)}</b></span></div>
    <div class="listbox">${dl.length ? `<div class="list">${dl.map(lancItem).join('')}</div>` : empty('🗓️', 'Nenhum lançamento neste dia.')}</div></div>
  <div class="card"><h3>Exportar para Excel</h3><div class="row wrap"><button type="button" class="btn" data-act="expLanc">📄 Lançamentos</button><button type="button" class="btn" data-act="expAlunos">🎓 Alunos</button><button type="button" class="btn" data-act="expAtrasos">⏰ Atrasados</button></div><small style="display:block;margin-top:8px">Os arquivos abrem direto no Excel.</small></div>`;
}

/* ---------- Mais / Ajuda ---------- */
function viewMais() {
  return `<div class="menu-big">
    <button type="button" class="bigbtn" style="background:#fff" data-act="nav" data-r="rel"><span class="ic">📊</span><span>Relatórios<small>Resumo do mês, caixa do dia, exportar</small></span></button>
    <button type="button" class="bigbtn" style="background:#fff" data-act="nav" data-r="ajustes"><span class="ic">⚙️</span><span>Ajustes<small>Turmas, caixas, multa, sincronização, backup</small></span></button>
    <button type="button" class="bigbtn" style="background:#fff" data-act="nav" data-r="ajuda"><span class="ic">❓</span><span>Ajuda<small>Como usar o app, passo a passo</small></span></button></div>`;
}
function viewAjuda() {
  return `<div class="card"><div class="row between wrap"><div><h3 style="margin:0">Primeiros passos</h3><small>Veja o tutorial rápido de novo quando quiser.</small></div><button type="button" class="btn pri" data-act="tutorial">▶ Ver tutorial</button></div></div>
  <details class="faq" open><summary>Como registrar um pagamento?</summary><ol><li>Na tela <b>Início</b>, toque em <b>Receber pagamento</b>.</li><li>Comece a digitar o nome do aluno e toque nele.</li><li>O app já sugere o mês e o valor. Confira e escolha a forma de pagamento (PIX, dinheiro…).</li><li>Toque em <b>Salvar</b>. Pronto! Aparece a opção de gerar o <b>recibo</b>.</li></ol></details>
  <details class="faq"><summary>O aluno pagou só uma parte. E agora?</summary><p>Digite no campo <b>Valor</b> só o que ele pagou hoje. O restante continua aparecendo como "Parcial" ou "Atrasado" até ser pago. Quando ele pagar o resto, registre outro recebimento para o mesmo mês.</p></details>
  <details class="faq"><summary>Como cobrar quem está atrasado?</summary><ol><li>Vá em <b>Mensalidades</b> e toque em <b>Atrasados (cobrança)</b>.</li><li>Toque em <b>WhatsApp</b> ao lado do aluno. A mensagem já vem pronta, com valor e meses.</li><li>É só apertar enviar no WhatsApp.</li></ol><p>A multa e os juros são calculados sozinhos. Você muda os percentuais em <b>Ajustes → Cobrança</b>.</p></details>
  <details class="faq"><summary>Como cadastrar um aluno novo?</summary><p>Vá em <b>Alunos</b> → <b>Novo aluno</b>. Preencha nome, turma e o telefone do responsável (para o WhatsApp). Se tiver desconto, informe no campo de desconto.</p></details>
  <details class="faq"><summary>Como achar tudo de um aluno ou de uma turma?</summary><p>Use a barra de busca no topo (funciona em qualquer tela) ou a aba <b>Alunos</b> com o filtro de turma. Tocando no aluno você vê a ficha: mensalidades mês a mês, pagamentos e contatos.</p></details>
  <details class="faq"><summary>Errei um lançamento. Como corrigir?</summary><p>Toque no lançamento para editar. Para apagar, use o botão <b>Excluir</b> — logo depois aparece <b>Desfazer</b>, caso tenha sido sem querer.</p></details>
  <details class="faq"><summary>Como usar no celular e no computador ao mesmo tempo?</summary><p>Em <b>Ajustes → Sincronização</b>, entre com a conta Google. Dali em diante, tudo que você registrar num aparelho aparece nos outros (precisa de internet para sincronizar, mas o app funciona sem internet e envia depois).</p></details>
  <details class="faq"><summary>Meus dados estão seguros?</summary><p>Ficam guardados no aparelho e, se a sincronização estiver ligada, numa pasta privada do seu Google Drive que só este app abre. Em <b>Ajustes → Backup</b> você baixa uma cópia a qualquer momento. Faça isso de vez em quando!</p></details>
  <details class="faq"><summary>Posso criar meus próprios campos?</summary><p>Sim. Em <b>Ajustes → Campos personalizados</b> você cria campos novos (texto, número, data, lista…) para alunos ou lançamentos, e remove quando quiser.</p></details>`;
}
