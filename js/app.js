'use strict';
/* ===== navegação e estrutura da tela ===== */
const VIEWS = { inicio: viewInicio, lanc: viewLanc, alunos: viewAlunos, mens: viewMens, rel: viewRel, mais: viewMais, ajustes: viewAjustes, ajuda: viewAjuda };
const FORMS = {};
const A = {};

function renderShell() {
  $('#side').innerHTML = `<div class="brand">🏫 Financeiro</div>` + NAV_DESK.map(([r, ic, t]) => `<button type="button" class="nav" data-act="nav" data-r="${r}" data-nav="${r}"><span class="ic">${ic}</span>${t}</button>`).join('');
  $('#tabbar').innerHTML = NAV_MOBILE.map(([r, ic, t]) => `<button type="button" class="nav" data-act="nav" data-r="${r}" data-nav="${r}"><span class="ic">${ic}</span>${t}</button>`).join('');
  $('#top').innerHTML = `<h1 id="ttl"></h1><button type="button" id="syncchip" class="sync" data-act="syncNow"></button><div class="gs"><input id="gq" type="search" placeholder="🔍 Buscar aluno, turma, valor…" autocomplete="off"><div id="gres" class="hide"></div></div>`;
  renderSync();
}
function renderSync() {
  const s = Sync.state(), b = $('#syncchip'); if (!b) return;
  const map = { off: '📴 Só neste aparelho', idle: '☁ Ativar sincronização', login: '☁ Toque para sincronizar', sync: '🔄 Sincronizando…', ok: '☁ Sincronizado ✓', error: '⚠ Falha — toque aqui' };
  b.textContent = map[s.state] || ''; b.className = 'sync' + (s.state === 'error' ? ' err' : '');
  b.title = s.msg || (s.last ? 'Última sincronização: ' + new Date(s.last).toLocaleString('pt-BR') : '');
}
function render(keepScroll) {
  const r = S.route;
  $('#ttl').textContent = TITLES[r] || '';
  $('#view').innerHTML = (VIEWS[r] || viewInicio)();
  const nav = r === 'rel' || r === 'ajustes' || r === 'ajuda' ? 'mais' : r;
  $$('[data-nav]').forEach(b => {
    const on = b.dataset.nav === r || (b.closest('#tabbar') && b.dataset.nav === nav);
    b.classList.toggle('on', on);
  });
  if (r === 'lanc') fillLanc();
  if (r === 'alunos') fillAlunos();
  if (r === 'mens') fillMens();
  if (!keepScroll) window.scrollTo(0, 0);
}
function go(r) {
  S.route = r;
  if (location.hash !== '#/' + r) location.hash = '#/' + r;
  render();
}
window.addEventListener('hashchange', () => { const r = location.hash.replace('#/', ''); if (VIEWS[r] && r !== S.route) { S.route = r; render(); } });

/* eventos globais */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!e.target.closest('.gs')) $('#gres') && $('#gres').classList.add('hide');
  if (!el) return;
  const f = A[el.dataset.act];
  if (!f) return;
  e.preventDefault();
  if (el.closest('#gres')) { $('#gres').classList.add('hide'); $('#gq').value = ''; }
  f(el.dataset, el);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'gq') return gsearch(t.value);
  const b = t.dataset && t.dataset.bind;
  if (!b) return;
  const [g, k] = b.split('.');
  if ((g === 'rel') && !t.value) return;
  S[g][k] = t.value;
  if (g === 'lanc') { S.lanc.limit = 80; fillLanc(); }
  else if (g === 'alunos') fillAlunos();
  else if (g === 'mens') fillMens();
  else if (g === 'rel') render(true);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (f) { e.preventDefault(); FORMS[f.dataset.form](new FormData(f), f); }
});

/* busca geral */
function gsearch(q) {
  const box = $('#gres'); q = q.trim();
  if (!q) return box.classList.add('hide');
  const nq = norm(q);
  const alunos = Store.all('alunos').filter(a => norm([a.nome, a.resp1, a.resp2].join(' ')).includes(nq)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 6);
  const turmas = turmasOrdenadas().filter(t => norm(t.nome).includes(nq)).slice(0, 3);
  const ls = filtrarLanc({ q, tipo: '', caixa: '', mes: '' });
  let h = '';
  if (alunos.length) h += `<div class="gh">Alunos</div>` + alunos.map(a => `<button type="button" class="gi" data-act="verAluno" data-id="${a.id}"><span><b>${esc(a.nome)}</b></span><small>${esc(turmaNome(a))}</small></button>`).join('');
  if (turmas.length) h += `<div class="gh">Turmas</div>` + turmas.map(t => `<button type="button" class="gi" data-act="filtrarTurma" data-id="${t.id}"><span><b>${esc(t.nome)}</b></span><small>${Store.all('alunos').filter(a => a.turma === t.id && a.ativo !== false).length} alunos</small></button>`).join('');
  if (ls.length) h += `<div class="gh">Lançamentos (${ls.length})</div>` + ls.slice(0, 4).map(l => { const a = l.aluno && Store.get('alunos', l.aluno); return `<button type="button" class="gi" data-act="editLanc" data-id="${l.id}"><span>${esc(a ? a.nome : (l.obs || caixaNome(l.caixa)))}<br><small>${fdate(l.data)} · ${esc(caixaNome(l.caixa))}</small></span><b class="amt ${l.tipo === 'Entrada' ? 'in' : 'out'}">${brl(l.valor)}</b></button>`; }).join('') + `<button type="button" class="gi" data-act="verTodosLanc" data-q="${esc(q)}"><b>Ver todos os lançamentos com “${esc(q)}” →</b></button>`;
  box.innerHTML = h || `<div class="empty">Nada encontrado para “${esc(q)}”.</div>`;
  box.classList.remove('hide');
}

/* ===== ações ===== */
A.nav = d => go(d.r);
A.closeModal = () => closeModal();
A.syncNow = () => { if (!Sync.configured()) { toast('Primeiro configure a sincronização em Ajustes.'); return go('ajustes'); } Sync.sync(true).then(() => { if (Sync.state().state === 'ok') toast('Tudo sincronizado ✓'); }); };
A.novoRecebimento = () => formLanc({ tipo: 'Entrada' });
A.novaDespesa = () => formLanc({ tipo: 'Saída' });
A.editLanc = d => formLanc(Store.get('lancamentos', d.id));
A.verAluno = d => fichaAluno(d.id);
A.novoAluno = () => formAluno();
A.receber = d => {
  const a = Store.get('alunos', d.id); if (!a) return;
  const ref = d.ref || (emAberto(a)[0] || {}).ref || curRef();
  const cx = Store.all('caixas').find(c => c.mensalidade);
  formLanc({ tipo: 'Entrada', aluno: a.id, ref, caixa: cx && cx.id });
};
A.cobrar = d => {
  const a = Store.get('alunos', d.id), x = atrasos().get(d.id);
  const itens = x ? x.itens : emAberto(a);
  if (!itens.length) return toast('Este aluno não tem mensalidade em aberto.');
  const w = waLink(a, itens);
  if (!w.phone) toast('Sem telefone cadastrado — escolha o contato no WhatsApp.');
  window.open(w.url, '_blank', 'noopener');
};
A.verAtrasados = () => { S.mens.modo = 'atrasados'; go('mens'); };
A.limparLanc = () => { S.lanc = { q: '', tipo: '', caixa: '', mes: '', limit: 80 }; render(true); };
A.maisLanc = () => { S.lanc.limit += 120; fillLanc(); };
A.mensModo = d => { S.mens.modo = d.m; render(true); };
A.mensMes = d => { S.mens.ref = addMonths(S.mens.ref, +d.d); render(true); };
A.filtrarTurma = d => { S.alunos = { q: '', turma: d.id, sit: '' }; go('alunos'); };
A.verTodosLanc = d => { S.lanc = { q: d.q, tipo: '', caixa: '', mes: '', limit: 80 }; go('lanc'); };
A.recibo = d => recibo(d.id);
A.expLanc = () => {
  const campos = camposFor('lancamento');
  const rows = [['Data', 'Tipo', 'Valor', 'Caixa', 'Aluno', 'Turma', 'Mês de referência', 'Multa/juros', 'Meio', 'Observações', ...campos.map(c => c.nome)]];
  Store.all('lancamentos').sort((a, b) => (a.data || '').localeCompare(b.data || '')).forEach(l => { const a = l.aluno && Store.get('alunos', l.aluno); rows.push([fdate(l.data), l.tipo, String(l.valor).replace('.', ','), caixaNome(l.caixa), a ? a.nome : '', a ? turmaNome(a) : '', l.ref ? refLabel(l.ref) : '', l.multa ? String(l.multa).replace('.', ',') : '', l.meio || '', l.obs || '', ...campos.map(c => (l.extra || {})[c.id] || '')]); });
  download('lancamentos.csv', toCSV(rows));
};
A.expAlunos = () => {
  const campos = camposFor('aluno');
  const rows = [['Aluno', 'Turma', 'Turno', 'Responsável 1', 'Telefone 1', 'Responsável 2', 'Telefone 2', 'Mensalidade', 'Situação', ...campos.map(c => c.nome)]];
  Store.all('alunos').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).forEach(a => rows.push([a.nome, turmaNome(a), a.turno || '', a.resp1 || '', a.tel1 || '', a.resp2 || '', a.tel2 || '', String(valorMensal(a)).replace('.', ','), a.ativo === false ? 'Inativo' : (atrasos().has(a.id) ? 'Em atraso' : 'Em dia'), ...campos.map(c => (a.extra || {})[c.id] || '')]));
  download('alunos.csv', toCSV(rows));
};
A.expAtrasos = () => {
  const rows = [['Aluno', 'Turma', 'Responsável', 'Telefone', 'Meses em atraso', 'Valor', 'Multa e juros', 'Total']];
  [...atrasos().values()].sort((x, y) => y.total - x.total).forEach(x => rows.push([x.aluno.nome, turmaNome(x.aluno), x.aluno.resp1 || '', x.aluno.tel1 || '', x.itens.map(i => refShort(i.ref)).join(' '), String(x.resta).replace('.', ','), String(x.encargos).replace('.', ','), String(x.total).replace('.', ',')]));
  download('atrasados.csv', toCSV(rows));
};

/* ===== formulário de lançamento ===== */
function caixaOpts(tipo, sel) {
  return `<option value="">Escolha…</option>` + Store.all('caixas')
    .filter(x => x.id === sel || x.tipo === 'ambos' || (tipo === 'Entrada' ? x.tipo === 'entrada' : x.tipo === 'saida'))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(x => opt(x.id, x.nome, sel)).join('');
}
function formLanc(init = {}) {
  const edit = !!init.id, c = cfg();
  const L = { tipo: 'Entrada', data: todayStr(), ...init };
  const meiosSel = (L.meio || '').split(',').map(s => s.trim()).filter(Boolean);
  const meiosAll = [...new Set([...(c.meios || []), ...meiosSel])];
  const refs = [...new Set([...mesesLetivos(), ...(L.ref ? [L.ref] : [])])].sort();
  const title = edit ? 'Editar lançamento' : (L.tipo === 'Entrada' ? 'Receber pagamento' : 'Registrar despesa');
  const body = `
    <div class="seg"><label><input type="radio" name="tipo" value="Entrada" ${L.tipo === 'Entrada' ? 'checked' : ''}><span>➕ Entrada</span></label><label><input type="radio" name="tipo" value="Saída" ${L.tipo !== 'Entrada' ? 'checked' : ''}><span>➖ Saída</span></label></div>
    <label class="fld valor"><span>Valor (R$)</span><input name="valor" inputmode="decimal" placeholder="0,00" value="${moneyIn(L.valor)}" autocomplete="off"></label>
    <div class="two"><label class="fld"><span>Data</span><input type="date" name="data" value="${esc(L.data)}"></label>
    <label class="fld"><span>Caixa</span><select name="caixa" id="f-caixa">${caixaOpts(L.tipo, L.caixa)}</select></label></div>
    <div class="fld ta"><span>Aluno <small>(opcional para despesas)</small></span>
      <div id="ta-picked" class="picked hide"></div>
      <input id="ta-q" autocomplete="off" placeholder="Digite o nome do aluno…"><div id="ta-res" class="ta-res hide"></div>
      <input type="hidden" name="aluno" value="${esc(L.aluno || '')}"></div>
    <div id="mens-box" class="hide" style="display:flex;flex-direction:column;gap:12px">
      <div class="two"><label class="fld"><span>Mensalidade de</span><select name="ref" id="f-ref">${refs.map(r => opt(r, refLabel(r), L.ref)).join('')}</select></label>
      <label class="fld"><span>Multa/juros incluídos no valor</span><input name="multa" id="f-multa" inputmode="decimal" placeholder="0,00" value="${moneyIn(L.multa)}"></label></div>
      <div id="f-hint" class="hint hide"></div></div>
    <div><div class="lbl2" style="margin-bottom:6px">Forma de pagamento <small>(pode marcar mais de uma)</small></div><div class="chips">${meiosAll.map(m => `<label class="chipc"><input type="checkbox" name="meio" value="${esc(m)}" ${meiosSel.includes(m) ? 'checked' : ''}><span>${esc(m)}</span></label>`).join('')}</div></div>
    <label class="fld"><span>Observações</span><input name="obs" value="${esc(L.obs || '')}" placeholder="Ex.: pago com desconto de indicação"></label>
    ${camposHtml('lancamento', L.extra || {})}`;
  const foot = `<button class="btn pri" type="submit">💾 Salvar</button>${edit ? `<button type="button" class="btn" id="f-rec">🧾 Recibo</button><button type="button" class="btn danger" id="f-del">🗑 Excluir</button>` : ''}`;
  modal({
    title, body, foot, onOpen: (el, form) => {
      const q = s => $(s, el);
      const tipoVal = () => form.elements.tipo.value;
      let alunoId = L.aluno || '', valorDirty = edit, multaAdded = false;
      const picked = q('#ta-picked'), tq = q('#ta-q'), res = q('#ta-res'), hid = form.elements.aluno;
      function showPick() {
        const a = alunoId && Store.get('alunos', alunoId);
        picked.classList.toggle('hide', !a); tq.classList.toggle('hide', !!a); res.classList.add('hide');
        picked.innerHTML = a ? `<span>🎓 ${esc(a.nome)} <small>· ${esc(turmaNome(a))}</small></span><button type="button" class="btn sm" id="ta-x">Trocar</button>` : '';
        hid.value = alunoId || '';
        if (a) q('#ta-x').onclick = () => { alunoId = ''; showPick(); suggest(); tq.focus(); };
      }
      function updateVis() {
        const cx = Store.get('caixas', form.elements.caixa.value);
        q('#mens-box').classList.toggle('hide', !(tipoVal() === 'Entrada' && cx && cx.mensalidade));
        suggest();
      }
      function suggest() {
        const hint = q('#f-hint'), box = q('#mens-box');
        if (box.classList.contains('hide') || !alunoId || edit) return hint.classList.add('hide');
        const a = Store.get('alunos', alunoId);
        const sel = form.elements.ref;
        if (!form._refTouched) { const o = emAberto(a)[0]; if (o) sel.value = o.ref; }
        const i = infoRef(a, sel.value);
        hint.classList.remove('hide'); hint.classList.toggle('late', i.status === 'atrasado');
        hint.innerHTML = `<b>${refLabel(i.ref)}</b>: mensalidade ${brl(i.devido)}, já pago ${brl(i.pago)}, <b>falta ${brl(i.resta)}</b>.` +
          (i.status === 'atrasado' ? `<br>Atrasada há ${i.dias} dias. Multa e juros: <b>${brl(i.encargos)}</b> <button type="button" class="btn sm" id="f-multabtn" style="margin-left:6px">Incluir no valor</button>` : '') +
          (i.devido === 0 ? '<br>Este aluno não tem mensalidade neste mês (confira turma/valor em Ajustes).' : '');
        if (!valorDirty && i.resta > 0) form.elements.valor.value = moneyIn(i.resta);
        const mb = q('#f-multabtn');
        if (mb) mb.onclick = () => { form.elements.multa.value = moneyIn(i.encargos); form.elements.valor.value = moneyIn(i.resta + i.encargos); valorDirty = true; mb.disabled = true; mb.textContent = 'Incluído ✓'; };
      }
      tq.addEventListener('input', () => {
        const n = norm(tq.value).trim();
        if (!n) return res.classList.add('hide');
        const r = Store.all('alunos').filter(a => a.ativo !== false && norm(a.nome + ' ' + (a.resp1 || '')).includes(n)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 8);
        res.innerHTML = r.length ? r.map(a => `<button type="button" data-id="${a.id}"><b>${esc(a.nome)}</b> <small>${esc(turmaNome(a))}</small></button>`).join('') : '<button type="button" disabled>Nenhum aluno encontrado</button>';
        res.classList.remove('hide');
      });
      res.addEventListener('click', ev => { const b = ev.target.closest('button[data-id]'); if (!b) return; alunoId = b.dataset.id; form._refTouched = false; showPick(); suggest(); });
      form.elements.valor.addEventListener('input', () => { valorDirty = true; });
      form.elements.ref.addEventListener('change', () => { form._refTouched = true; valorDirty = false; suggest(); });
      form.elements.caixa.addEventListener('change', updateVis);
      $$('input[name=tipo]', el).forEach(r => r.addEventListener('change', () => {
        const cur = form.elements.caixa.value;
        form.elements.caixa.innerHTML = caixaOpts(tipoVal(), cur); updateVis();
        if (!form.elements.caixa.value) form.elements.caixa.value = '';
      }));
      showPick(); updateVis();
      if (!edit) setTimeout(() => (alunoId ? form.elements.valor : (tipoVal() === 'Entrada' ? tq : form.elements.valor)).focus(), 60);
      if (edit) {
        q('#f-del').onclick = () => {
          if (!confirm('Excluir este lançamento?')) return;
          const old = Store.del('lancamentos', L.id); closeModal(el);
          toast('Lançamento excluído', { label: 'Desfazer', fn: () => Store.put('lancamentos', old) });
        };
        q('#f-rec').onclick = () => recibo(L.id);
      }
    },
    onSubmit: (fd, form) => {
      const tipo = fd.get('tipo'), valor = parseMoney(fd.get('valor')), data = fd.get('data'), caixa = fd.get('caixa');
      if (valor <= 0) return formError(form, 'Informe o valor.');
      if (!data) return formError(form, 'Informe a data.');
      if (!caixa) return formError(form, 'Escolha o caixa.');
      const cx = Store.get('caixas', caixa), mens = tipo === 'Entrada' && cx && cx.mensalidade;
      const aluno = fd.get('aluno') || '', ref = fd.get('ref') || '';
      if (mens && !aluno) return formError(form, 'Escolha o aluno desta mensalidade.');
      const multa = mens ? parseMoney(fd.get('multa')) : 0;
      if (multa > valor) return formError(form, 'A multa não pode ser maior que o valor.');
      const rec = Store.put('lancamentos', {
        ...(edit ? Store.get('lancamentos', L.id) : {}), id: L.id,
        tipo, data, valor, caixa, aluno: aluno || undefined, ref: mens ? ref : undefined, multa: multa || undefined,
        meio: fd.getAll('meio').join(', '), obs: (fd.get('obs') || '').trim(), extra: readExtras(fd, 'lancamento')
      });
      toast(edit ? 'Alterações salvas ✓' : (tipo === 'Entrada' ? 'Pagamento registrado ✓' : 'Despesa registrada ✓'),
        tipo === 'Entrada' && aluno ? { label: '🧾 Recibo', fn: () => recibo(rec.id) } : null);
    }
  });
}

/* ===== recibo ===== */
function recibo(id) {
  const l = Store.get('lancamentos', id); if (!l) return;
  const a = l.aluno && Store.get('alunos', l.aluno), c = cfg();
  const resp = a && (a.resp1 || a.resp2);
  const ref = l.ref ? ` referente a ${refLabel(l.ref)}` : '';
  const texto = `Recebemos${resp ? ' de ' + resp : ''}${a ? ', responsável por ' + a.nome + ' (' + turmaNome(a) + ')' : ''}, a quantia de ${brl(l.valor)}, referente a ${caixaNome(l.caixa)}${l.ref ? ' de ' + refLabel(l.ref) : ''}${l.meio ? ', pago em ' + l.meio : ''}. ${fdate(l.data)}. ${c.escola}.`;
  modal({
    title: 'Recibo', wide: true,
    body: `<div class="receipt"><h3>${esc(c.escola)}</h3><h4>RECIBO</h4>
      <p style="text-align:center;font-size:1.5rem;margin:0 0 10px"><b>${brl(l.valor)}</b></p>
      <p>Recebemos${resp ? ` de <b>${esc(resp)}</b>` : ''}${a ? `, responsável pelo(a) aluno(a) <b>${esc(a.nome)}</b> (${esc(turmaNome(a))})` : ''}, a quantia acima, referente a <b>${esc(caixaNome(l.caixa))}</b>${esc(ref)}${l.meio ? `, pago em ${esc(l.meio)}` : ''}.</p>
      ${l.obs ? `<p><small>Obs.: ${esc(l.obs)}</small></p>` : ''}
      <p>${esc(fdate(l.data))}</p><div class="sign">Assinatura</div></div>`,
    foot: `<button type="button" class="btn pri" id="r-print">🖨 Imprimir / salvar PDF</button><button type="button" class="btn wa" id="r-wa">📲 Enviar no WhatsApp</button>`,
    onOpen: el => {
      $('#r-print', el).onclick = () => window.print();
      $('#r-wa', el).onclick = () => { const ph = a ? normPhone(a.tel1 || a.tel2) : ''; window.open(`https://wa.me/${ph}?text=${encodeURIComponent('🧾 RECIBO\n' + texto)}`, '_blank', 'noopener'); };
    }
  });
}

/* ===== ficha e cadastro de aluno ===== */
function fichaAluno(id) {
  const el = modal({ title: '', wide: true, body: '<div id="ficha"></div>', foot: '' });
  const paint = () => {
    const a = Store.get('alunos', id);
    if (!a) return closeModal(el);
    $('h2', el).textContent = a.nome;
    const x = atrasos().get(id), refs = mesesLetivos();
    const ls = Store.all('lancamentos').filter(l => l.aluno === id).sort(byDataDesc);
    const mens = mensCaixaIds();
    const outros = {};
    ls.filter(l => l.tipo === 'Entrada' && !mens.has(l.caixa)).forEach(l => { const n = caixaNome(l.caixa); outros[n] = (outros[n] || 0) + (+l.valor || 0); });
    const t = Store.get('turmas', a.turma);
    const extras = camposFor('aluno').filter(cf => (a.extra || {})[cf.id]);
    $('#ficha', el).innerHTML = `
      <div class="row wrap" style="gap:6px"><span class="chipx">${esc(turmaNome(a))}</span>${a.turno ? `<span class="chipx">${esc(a.turno)}</span>` : ''}${a.tipoAluno ? `<span class="chipx">${esc(a.tipoAluno)}</span>` : ''}${a.ativo === false ? '<span class="badge b-isento">Inativo</span>' : ''}${x ? `<span class="badge b-atrasado">${x.itens.length} em atraso · ${brl(x.total)}</span>` : ''}</div>
      <div class="row wrap"><button type="button" class="btn in grow" data-act="receber" data-id="${id}">➕ Receber</button>${x ? `<button type="button" class="btn wa grow" data-act="cobrar" data-id="${id}">📲 Cobrar</button>` : ''}<button type="button" class="btn grow" id="fa-edit">✏️ Editar</button></div>
      <div><div class="lbl2" style="margin-bottom:6px">MENSALIDADES (toque no mês para receber)</div><div class="mgrid">${refs.map(r => {
        const i = infoRef(a, r), cls = 's-' + i.status;
        const txt = i.status === 'pago' ? '✓ pago' : i.status === 'isento' ? '—' : brl(i.resta);
        return i.resta > 0 ? `<button type="button" class="mchip ${cls}" data-act="receber" data-id="${id}" data-ref="${r}"><b>${refShort(r)}</b>${txt}</button>` : `<div class="mchip ${cls}" style="cursor:default"><b>${refShort(r)}</b>${txt}</div>`;
      }).join('')}</div></div>
      <dl class="kv"><dt>Mensalidade</dt><dd>${brl(valorMensal(a))}${a.desconto ? ` <small>(desconto de ${a.descontoTipo === 'pct' ? a.desconto + '%' : brl(a.desconto)})</small>` : ''}${t ? ` · vence dia ${cfg().diaVencimento}` : ''}</dd>
      ${a.resp1 ? `<dt>Responsável</dt><dd>${esc(a.resp1)}${a.tel1 ? ` · <a href="tel:${esc(a.tel1)}">${esc(a.tel1)}</a>` : ''}</dd>` : ''}
      ${a.resp2 ? `<dt>Responsável 2</dt><dd>${esc(a.resp2)}${a.tel2 ? ` · <a href="tel:${esc(a.tel2)}">${esc(a.tel2)}</a>` : ''}</dd>` : ''}
      ${extras.map(cf => `<dt>${esc(cf.nome)}</dt><dd>${esc(a.extra[cf.id])}</dd>`).join('')}
      ${a.obs ? `<dt>Obs.</dt><dd>${esc(a.obs)}</dd>` : ''}</dl>
      ${Object.keys(outros).length ? `<div><div class="lbl2" style="margin-bottom:6px">OUTROS PAGAMENTOS</div><div class="row wrap" style="gap:6px">${Object.entries(outros).map(([n, v]) => `<span class="chipx">${esc(n)}: ${brl(v)}</span>`).join('')}</div></div>` : ''}
      <div><div class="lbl2" style="margin-bottom:6px">HISTÓRICO (${ls.length})</div><div class="listbox">${ls.length ? `<div class="list">${ls.map(lancItem).join('')}</div>` : empty('📝', 'Sem lançamentos.')}</div></div>`;
    $('#fa-edit', el).onclick = () => formAluno(Store.get('alunos', id));
  };
  el._refresh = paint; paint();
}
function refreshModals() { $$('.backdrop').forEach(m => m._refresh && m._refresh()); }

function formAluno(init = {}) {
  const edit = !!init.id, a = { ativo: true, descontoTipo: 'valor', ...init };
  if (!Store.all('turmas').length) { toast('Cadastre as turmas primeiro (Ajustes → Turmas).'); return go('ajustes'); }
  const refs = mesesLetivos();
  modal({
    title: edit ? 'Editar aluno' : 'Novo aluno',
    body: `<label class="fld"><span>Nome do aluno</span><input name="nome" value="${esc(a.nome || '')}" autocomplete="off"></label>
    <div class="two"><label class="fld"><span>Turma</span><select name="turma"><option value="">Escolha…</option>${turmaOpts(a.turma)}</select></label>
    <label class="fld"><span>Turno</span><select name="turno"><option value=""></option>${['Manhã', 'Tarde', 'Integral'].map(t => opt(t, t, a.turno)).join('')}</select></label></div>
    <div class="two"><label class="fld"><span>Responsável 1</span><input name="resp1" value="${esc(a.resp1 || '')}"></label><label class="fld"><span>WhatsApp / telefone</span><input name="tel1" type="tel" inputmode="tel" placeholder="(85) 99999-9999" value="${esc(a.tel1 || '')}"></label></div>
    <div class="two"><label class="fld"><span>Responsável 2</span><input name="resp2" value="${esc(a.resp2 || '')}"></label><label class="fld"><span>Telefone 2</span><input name="tel2" type="tel" inputmode="tel" value="${esc(a.tel2 || '')}"></label></div>
    <div class="two"><label class="fld"><span>Desconto na mensalidade</span><input name="desconto" inputmode="decimal" placeholder="0" value="${moneyIn(a.desconto)}"></label>
    <label class="fld"><span>Tipo de desconto</span><select name="descontoTipo">${opt('valor', 'R$ (valor fixo)', a.descontoTipo)}${opt('pct', '% (porcentagem)', a.descontoTipo)}</select></label></div>
    <div class="two"><label class="fld"><span>Cobrar mensalidade a partir de</span><select name="inicio"><option value="">Início do ano letivo</option>${refs.map(r => opt(r, refLabel(r), a.inicio)).join('')}</select></label>
    <label class="fld"><span>Situação</span><select name="ativo" id="fa-ativo">${opt('1', 'Ativo', a.ativo === false ? '0' : '1')}${opt('0', 'Inativo (saiu da escola)', a.ativo === false ? '0' : '1')}</select></label></div>
    <label class="fld hide" id="fa-saida"><span>Parar de cobrar a partir de</span><select name="saidaMes">${refs.map(r => opt(r, refLabel(r), a.saidaMes || curRef())).join('')}</select></label>
    <label class="fld"><span>Novato ou veterano</span><select name="tipoAluno"><option value=""></option>${opt('Novato', 'Novato', a.tipoAluno)}${opt('Veterano', 'Veterano', a.tipoAluno)}</select></label>
    <label class="fld"><span>Observações</span><textarea name="obs" rows="2">${esc(a.obs || '')}</textarea></label>
    ${camposHtml('aluno', a.extra || {})}`,
    foot: `<button class="btn pri" type="submit">💾 Salvar</button>${edit ? '<button type="button" class="btn danger" id="fa-del">🗑 Excluir</button>' : ''}`,
    onOpen: (el, form) => {
      const sync = () => $('#fa-saida', el).classList.toggle('hide', form.elements.ativo.value !== '0');
      form.elements.ativo.addEventListener('change', sync); sync();
      if (!edit) setTimeout(() => form.elements.nome.focus(), 60);
      if (edit) $('#fa-del', el).onclick = () => {
        const n = Store.all('lancamentos').filter(l => l.aluno === a.id).length;
        if (!confirm(n ? `Este aluno tem ${n} lançamento(s). Os lançamentos continuam, mas perdem o vínculo com ele.\n\nPrefira marcar como "Inativo". Excluir mesmo assim?` : 'Excluir este aluno?')) return;
        const old = Store.del('alunos', a.id); $$('.backdrop').forEach(closeModal);
        toast('Aluno excluído', { label: 'Desfazer', fn: () => Store.put('alunos', old) });
      };
    },
    onSubmit: (fd, form) => {
      const nome = (fd.get('nome') || '').trim();
      if (!nome) return formError(form, 'Informe o nome do aluno.');
      if (!fd.get('turma')) return formError(form, 'Escolha a turma.');
      const dup = Store.all('alunos').find(x => x.id !== a.id && norm(x.nome) === norm(nome));
      if (dup && !confirm('Já existe um aluno com este nome. Salvar mesmo assim?')) return false;
      const ativo = fd.get('ativo') !== '0';
      Store.put('alunos', {
        ...(edit ? Store.get('alunos', a.id) : {}), id: a.id, nome, turma: fd.get('turma'), turno: fd.get('turno'),
        resp1: (fd.get('resp1') || '').trim(), tel1: (fd.get('tel1') || '').trim(), resp2: (fd.get('resp2') || '').trim(), tel2: (fd.get('tel2') || '').trim(),
        desconto: parseMoney(fd.get('desconto')) || 0, descontoTipo: fd.get('descontoTipo'), inicio: fd.get('inicio') || '',
        ativo, saidaMes: ativo ? '' : fd.get('saidaMes'), tipoAluno: fd.get('tipoAluno'), obs: (fd.get('obs') || '').trim(), extra: readExtras(fd, 'aluno')
      });
      toast(edit ? 'Aluno atualizado ✓' : 'Aluno cadastrado ✓');
    }
  });
}

/* ===== ajustes ===== */
function viewAjustes() {
  const c = cfg(), sy = Sync.state();
  const caixas = Store.all('caixas').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const campos = Store.all('campos').sort((a, b) => a.entidade.localeCompare(b.entidade) || (a.ordem || 0) - (b.ordem || 0));
  const tipoTxt = { entrada: 'só entradas', saida: 'só saídas', ambos: 'entradas e saídas' };
  return `
  <div class="grid2">
  <div class="card"><h3>🏫 Escola e cobrança</h3>
    <form data-form="cobranca" class="menu-big">
      <label class="fld"><span>Nome da escola (aparece nos recibos)</span><input name="escola" value="${esc(c.escola)}"></label>
      <div class="two"><label class="fld"><span>Dia de vencimento</span><input name="dia" inputmode="numeric" value="${esc(c.diaVencimento)}"></label><label class="fld"><span>Dias de tolerância</span><input name="carencia" inputmode="numeric" value="${esc(c.carenciaDias)}"></label></div>
      <div class="two"><label class="fld"><span>Multa por atraso (%)</span><input name="multa" inputmode="decimal" value="${moneyIn(c.multaPct)}"></label><label class="fld"><span>Juros (% ao mês)</span><input name="juros" inputmode="decimal" value="${moneyIn(c.jurosMesPct)}"></label></div>
      <div class="two"><label class="fld"><span>Ano letivo: início</span><input type="month" name="ini" value="${esc(c.anoInicio)}"></label><label class="fld"><span>Ano letivo: fim</span><input type="month" name="fim" value="${esc(c.anoFim)}"></label></div>
      <label class="fld"><span>Saldo inicial do caixa (R$)</span><input name="saldo" inputmode="decimal" value="${moneyIn(c.saldoInicial)}"></label>
      <label class="fld"><span>Mensagem de cobrança (WhatsApp)</span><textarea name="msg" rows="5">${esc(c.msgCobranca)}</textarea><small>Use: {responsavel} {aluno} {escola} {meses} {valor} {encargos} {total}</small></label>
      <button class="btn pri" type="submit">💾 Salvar</button></form></div>
  <div class="card"><h3>☁️ Sincronização (Google Drive)</h3>
    <p class="muted" style="margin-top:0">Status: <b>${{ off: 'não configurada', idle: 'configurada, falta entrar', login: 'precisa entrar de novo', sync: 'sincronizando…', ok: 'sincronizado ✓', error: 'com erro' }[sy.state]}</b>${sy.last ? `<br><small>Última vez: ${new Date(sy.last).toLocaleString('pt-BR')}</small>` : ''}${sy.msg ? `<br><small style="color:var(--out)">${esc(sy.msg)}</small>` : ''}</p>
    <form data-form="client" class="menu-big">
      ${window.GOOGLE_CLIENT_ID ? '<small>O ID do cliente já veio configurado no app. ✓</small>' : `<label class="fld"><span>ID do cliente Google</span><input name="cid" value="${esc(localStorage.getItem('gclient') || '')}" placeholder="123456-abc.apps.googleusercontent.com"></label><button class="btn" type="submit">Salvar ID</button>`}
    </form>
    <div class="row wrap mt"><button type="button" class="btn pri grow" data-act="entrarGoogle">☁️ Entrar com Google e sincronizar</button>${Sync.connected() ? '<button type="button" class="btn" data-act="sairGoogle">Desconectar</button>' : ''}</div>
    <small style="display:block;margin-top:8px">Veja o passo a passo no arquivo GUIA.md que acompanha o app.</small></div>
  <div class="card"><h3>🎓 Turmas e valor da mensalidade</h3>
    ${turmasOrdenadas().map(t => `<div class="setrow"><div><b>${esc(t.nome)}</b><small>${brl(t.valor)} por mês · ${Store.all('alunos').filter(a => a.turma === t.id && a.ativo !== false).length} alunos</small></div><button type="button" class="btn sm" data-act="editTurma" data-id="${t.id}">Editar</button></div>`).join('') || '<small>Nenhuma turma ainda.</small>'}
    <button type="button" class="btn block mt" data-act="editTurma">➕ Nova turma</button></div>
  <div class="card"><h3>💼 Caixas</h3><small>Os caixas separam de onde vem e para onde vai o dinheiro (matrícula, material, salário…).</small>
    ${caixas.map(x => `<div class="setrow"><div><b>${esc(x.nome)}</b><small>${tipoTxt[x.tipo] || ''}${x.mensalidade ? ' · mensalidade' : ''}</small></div><button type="button" class="btn sm" data-act="editCaixa" data-id="${x.id}">Editar</button></div>`).join('')}
    <button type="button" class="btn block mt" data-act="editCaixa">➕ Novo caixa</button></div>
  <div class="card"><h3>💳 Formas de pagamento</h3>
    <form data-form="meios" class="menu-big"><label class="fld"><span>Separe por vírgula</span><input name="meios" value="${esc((c.meios || []).join(', '))}"></label><button class="btn" type="submit">Salvar</button></form></div>
  <div class="card"><h3>🧩 Campos personalizados</h3><small>Crie campos extras para alunos ou lançamentos (ex.: “Alergias”, “Nº do recibo”).</small>
    ${campos.map(x => `<div class="setrow"><div><b>${esc(x.nome)}</b><small>${x.entidade === 'aluno' ? 'Aluno' : 'Lançamento'} · ${{ texto: 'texto', numero: 'número', data: 'data', lista: 'lista', simnao: 'sim/não' }[x.tipo]}</small></div><button type="button" class="btn sm" data-act="editCampo" data-id="${x.id}">Editar</button></div>`).join('')}
    <button type="button" class="btn block mt" data-act="editCampo">➕ Novo campo</button></div>
  <div class="card"><h3>💾 Backup e restauração</h3>
    <div class="menu-big"><button type="button" class="btn" data-act="exportarBackup">⬇️ Baixar backup (arquivo)</button><button type="button" class="btn" data-act="importar">⬆️ Restaurar de um arquivo</button></div>
    <small style="display:block;margin-top:8px">Dica: baixe um backup de vez em quando e guarde no Drive.</small></div>
  </div>`;
}
FORMS.cobranca = fd => {
  const ini = fd.get('ini'), fim = fd.get('fim');
  if (!ini || !fim || ini > fim) return toast('Confira o início e o fim do ano letivo.');
  const dia = Math.min(28, Math.max(1, parseInt(fd.get('dia')) || 10));
  Store.setConfig({ escola: (fd.get('escola') || '').trim() || 'Minha Escola', diaVencimento: dia, carenciaDias: Math.max(0, parseInt(fd.get('carencia')) || 0), multaPct: parseMoney(fd.get('multa')), jurosMesPct: parseMoney(fd.get('juros')), anoInicio: ini, anoFim: fim, saldoInicial: parseMoney(fd.get('saldo')), msgCobranca: fd.get('msg') });
  toast('Ajustes salvos ✓');
};
FORMS.client = fd => { Sync.setClient(fd.get('cid') || ''); toast('ID salvo ✓'); render(true); };
FORMS.meios = fd => { const m = (fd.get('meios') || '').split(',').map(s => s.trim()).filter(Boolean); if (!m.length) return toast('Informe ao menos uma forma.'); Store.setConfig({ meios: m }); toast('Salvo ✓'); };
Sync.on(() => { renderSync(); if (S.route === 'ajustes') render(true); });
Sync.on(s => { if (s.state === 'error' && s.msg) toast(s.msg); });

A.entrarGoogle = () => {
  if (!Sync.configured()) { toast('Primeiro informe o ID do cliente Google.'); return go('ajustes'); }
  Sync.sync(true).then(() => { if (Sync.state().state === 'ok') toast('Conectado e sincronizado ✓'); });
};
A.sairGoogle = () => { Sync.disconnect(); toast('Sincronização desconectada neste aparelho.'); render(true); };
A.editTurma = d => {
  const t = d.id ? Store.get('turmas', d.id) : { ordem: Store.all('turmas').length + 1 };
  modal({
    title: d.id ? 'Editar turma' : 'Nova turma',
    body: `<label class="fld"><span>Nome da turma</span><input name="nome" value="${esc(t.nome || '')}" placeholder="Ex.: 1º Ano"></label>
      <div class="two"><label class="fld"><span>Mensalidade (R$)</span><input name="valor" inputmode="decimal" value="${moneyIn(t.valor)}"></label><label class="fld"><span>Ordem na lista</span><input name="ordem" inputmode="numeric" value="${esc(t.ordem ?? '')}"></label></div>`,
    foot: `<button class="btn pri" type="submit">💾 Salvar</button>${d.id ? '<button type="button" class="btn danger" id="t-del">🗑 Excluir</button>' : ''}`,
    onOpen: (el) => { if (d.id) $('#t-del', el).onclick = () => { const n = Store.all('alunos').filter(a => a.turma === d.id).length; if (n) return alert(`Esta turma tem ${n} aluno(s). Mude-os de turma antes de excluir.`); if (confirm('Excluir esta turma?')) { Store.del('turmas', d.id); closeModal(el); } }; },
    onSubmit: (fd, form) => {
      const nome = (fd.get('nome') || '').trim(); if (!nome) return formError(form, 'Informe o nome.');
      Store.put('turmas', { ...(d.id ? t : {}), id: d.id, nome, valor: parseMoney(fd.get('valor')), ordem: parseInt(fd.get('ordem')) || 99 });
      toast('Turma salva ✓');
    }
  });
};
A.editCaixa = d => {
  const x = d.id ? Store.get('caixas', d.id) : { tipo: 'entrada' };
  modal({
    title: d.id ? 'Editar caixa' : 'Novo caixa',
    body: `<label class="fld"><span>Nome</span><input name="nome" value="${esc(x.nome || '')}"></label>
      <label class="fld"><span>Usado em</span><select name="tipo">${opt('entrada', 'Só entradas (receitas)', x.tipo)}${opt('saida', 'Só saídas (despesas)', x.tipo)}${opt('ambos', 'Entradas e saídas', x.tipo)}</select></label>
      <label class="chipc"><input type="checkbox" name="mens" value="1" ${x.mensalidade ? 'checked' : ''}><span>É de mensalidade (controla atrasos e multa)</span></label>`,
    foot: `<button class="btn pri" type="submit">💾 Salvar</button>${d.id ? '<button type="button" class="btn danger" id="c-del">🗑 Excluir</button>' : ''}`,
    onOpen: el => { if (d.id) $('#c-del', el).onclick = () => { const n = Store.all('lancamentos').filter(l => l.caixa === d.id).length; if (n) return alert(`Este caixa tem ${n} lançamento(s) e não pode ser excluído.`); if (confirm('Excluir este caixa?')) { Store.del('caixas', d.id); closeModal(el); } }; },
    onSubmit: (fd, form) => {
      const nome = (fd.get('nome') || '').trim(); if (!nome) return formError(form, 'Informe o nome.');
      Store.put('caixas', { ...(d.id ? x : {}), id: d.id, nome, tipo: fd.get('tipo'), mensalidade: fd.get('mens') === '1' });
      toast('Caixa salvo ✓');
    }
  });
};
A.editCampo = d => {
  const x = d.id ? Store.get('campos', d.id) : { entidade: 'aluno', tipo: 'texto' };
  modal({
    title: d.id ? 'Editar campo' : 'Novo campo',
    body: `<label class="fld"><span>Nome do campo</span><input name="nome" value="${esc(x.nome || '')}" placeholder="Ex.: Alergias"></label>
      <div class="two"><label class="fld"><span>Aparece em</span><select name="entidade">${opt('aluno', 'Alunos', x.entidade)}${opt('lancamento', 'Lançamentos', x.entidade)}</select></label>
      <label class="fld"><span>Tipo</span><select name="tipo" id="c-tipo">${opt('texto', 'Texto', x.tipo)}${opt('numero', 'Número', x.tipo)}${opt('data', 'Data', x.tipo)}${opt('lista', 'Lista de opções', x.tipo)}${opt('simnao', 'Sim / Não', x.tipo)}</select></label></div>
      <label class="fld hide" id="c-op"><span>Opções (separe por vírgula)</span><input name="opcoes" value="${esc((x.opcoes || []).join(', '))}"></label>`,
    foot: `<button class="btn pri" type="submit">💾 Salvar</button>${d.id ? '<button type="button" class="btn danger" id="cf-del">🗑 Excluir</button>' : ''}`,
    onOpen: (el, form) => {
      const s = () => $('#c-op', el).classList.toggle('hide', form.elements.tipo.value !== 'lista');
      form.elements.tipo.addEventListener('change', s); s();
      if (d.id) $('#cf-del', el).onclick = () => { if (confirm('Excluir este campo? Os valores já preenchidos deixam de aparecer.')) { Store.del('campos', d.id); closeModal(el); } };
    },
    onSubmit: (fd, form) => {
      const nome = (fd.get('nome') || '').trim(); if (!nome) return formError(form, 'Informe o nome.');
      const tipo = fd.get('tipo'), opcoes = (fd.get('opcoes') || '').split(',').map(s => s.trim()).filter(Boolean);
      if (tipo === 'lista' && !opcoes.length) return formError(form, 'Informe as opções da lista.');
      Store.put('campos', { ...(d.id ? x : {}), id: d.id, nome, entidade: fd.get('entidade'), tipo, opcoes: tipo === 'lista' ? opcoes : [], ordem: x.ordem ?? Store.all('campos').length });
      toast('Campo salvo ✓');
    }
  });
};

/* ===== backup / importação ===== */
function pickFile(accept) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.style.display = 'none';
    i.onchange = () => { res(i.files[0] || null); i.remove(); };
    document.body.appendChild(i); i.click();
  });
}
A.exportarBackup = () => {
  const name = `backup-financeiro-${todayStr()}.json`;
  download(name, JSON.stringify(Store.snapshot()), 'application/json');
  toast('Backup baixado ✓');
};
A.importar = async () => {
  const f = await pickFile('.json,application/json'); if (!f) return;
  try {
    const snap = JSON.parse((await f.text()).replace(/^﻿/, ''));
    if (!snap.data) throw new Error('formato');
    const tem = Store.all('alunos').length || Store.all('lancamentos').length;
    if (tem && !confirm('Isto vai SUBSTITUIR todos os dados atuais pelos do arquivo. Continuar?')) return;
    Store.replaceAll(snap);
    toast('Dados importados ✓'); go('inicio');
  } catch (e) { alert('Não consegui ler este arquivo. Use um backup gerado pelo próprio app.'); }
};
A.comecarZero = () => {
  const E = (nome, extra = {}) => ({ nome, tipo: 'entrada', ...extra });
  const D = nome => ({ nome, tipo: 'saida' });
  [E('Mensalidade', { mensalidade: true }), E('Matrícula'), { nome: 'Material', tipo: 'ambos' }, E('Livros'), E('Fardamento'), E('Reforço'), E('Eventos'), E('Vendas'),
    D('Salário'), D('Aluguel'), D('Água'), D('Energia'), D('Internet'), D('Conserto'), D('Melhorias'), D('Material de limpeza'), { nome: 'Outros', tipo: 'ambos' }].forEach(c => Store.put('caixas', c));
  toast('Pronto! Comece cadastrando as turmas e valores.'); go('ajustes');
};

/* ===== tutorial ===== */
const SLIDES = [
  ['👋', 'Bem-vindo!', 'Este app guarda toda a movimentação financeira da escola: pagamentos, despesas, alunos e mensalidades. Vamos ver o essencial em 1 minuto.'],
  ['🏠', 'Tela inicial', 'Aqui você vê o saldo em caixa, o que entrou e saiu no mês e quantos alunos estão em atraso. Os botões grandes fazem as tarefas do dia a dia.'],
  ['➕', 'Receber um pagamento', 'Toque em “Receber pagamento”, digite o nome do aluno e confirme o valor. O app já sugere o mês certo. Se for pagamento parcial, digite só o que foi pago.'],
  ['📲', 'Cobrar atrasados', 'Em “Mensalidades → Atrasados” aparece quem deve, com multa e juros calculados. Um toque no WhatsApp e a mensagem já está pronta.'],
  ['🔎', 'Buscar', 'A barra de busca no topo acha alunos, turmas e lançamentos em qualquer tela. Tocando no aluno você vê a ficha completa.'],
  ['☁️', 'Celular e computador juntos', 'Em Ajustes você liga a sincronização com o Google Drive. Assim tudo que for registrado aparece nos outros aparelhos. O app funciona até sem internet.']
];
A.tutorial = () => {
  let i = 0;
  const el = modal({
    title: 'Tutorial', body: '<div class="tut" id="tut"></div>',
    foot: '<button type="button" class="btn" id="t-skip">Pular</button><button type="button" class="btn pri" id="t-next">Próximo</button>',
    onOpen: el => {
      const draw = () => {
        const [ic, t, p] = SLIDES[i];
        $('#tut', el).innerHTML = `<div class="big">${ic}</div><h3>${t}</h3><p>${p}</p><div class="dots">${SLIDES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>`;
        $('#t-next', el).textContent = i === SLIDES.length - 1 ? 'Começar ✓' : 'Próximo';
      };
      const fim = () => { try { localStorage.setItem('tutorialVisto', '1'); } catch (e) { } closeModal(el); };
      $('#t-next', el).onclick = () => { if (i === SLIDES.length - 1) fim(); else { i++; draw(); } };
      $('#t-skip', el).onclick = fim;
      draw();
    }
  });
};

/* ===== inicialização ===== */
(async () => {
  try {
    await Store.init();
  } catch (e) {
    document.body.innerHTML = '<div style="padding:30px;font-family:sans-serif"><h2>Não foi possível abrir o banco de dados</h2><p>Este navegador bloqueou o armazenamento local (talvez a aba esteja no modo privado). Abra o app numa aba normal.</p></div>';
    return;
  }
  renderShell();
  let t;
  Store.on(meta => {
    clearTimeout(t);
    t = setTimeout(() => { render(true); refreshModals(); }, 30);
    if (!meta.remote) Sync.schedule();
  });
  const r0 = location.hash.replace('#/', '');
  if (VIEWS[r0]) S.route = r0;
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  if (Sync.connected()) Sync.sync(false);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Sync.connected() && Date.now() - (Sync.state().last || 0) > 180000) Sync.sync(false); });
  let visto = false; try { visto = !!localStorage.getItem('tutorialVisto'); } catch (e) { }
  if (!visto) setTimeout(A.tutorial, 700);
})();
