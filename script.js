const KEY = 'esst-absences-v1', MAX = 5, MAXU = 3;
let S = load(), view = { n: 'home' };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const fdate = d => new Date(d + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.modules)) return d; } catch (e) {} return { modules: [] }; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Erreur de sauvegarde'); } };
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); }
const mod = id => S.modules.find(m => m.id === id);

function stats(m) {
  const t = m.absences.length, j = m.absences.filter(a => a.justified).length, u = t - j;
  let st = ['ok', 'Sûr'], msg = '';
  if (t >= MAX) { st = ['ex', 'Seuil d’exclusion atteint']; msg = '⛔ 5 absences : seuil d’exclusion atteint.'; }
  else if (u > MAXU) { st = ['ex', 'Limite dépassée']; msg = '⛔ Plus de 3 absences non justifiées.'; }
  else if (t === MAX - 1) { st = ['crit', 'Critique']; msg = '⚠️ 4 absences : il ne vous en reste qu’une.'; if (u >= MAXU) msg += ' 3 non justifiées atteintes.'; }
  else if (u >= MAXU) { st = ['warn', 'Attention']; msg = '⚠️ 3 absences non justifiées : limite atteinte.'; }
  return { t, j, u, left: Math.max(0, MAX - t), st, msg };
}
const bar = s => `<div class="bar"><i class="${s.st[0]}" style="width:${Math.min(100, s.t / MAX * 100)}%"></i></div>`;
const nums = s => `<div class="nums"><div><b>${s.t}</b><span>Total</span></div><div><b>${s.j}</b><span>Justifiées</span></div><div><b>${s.u}</b><span>Non just.</span></div><div><b>${s.left}</b><span>Restantes</span></div></div>`;

function render() {
  const top = $('#top'), app = $('#app');
  document.querySelectorAll('[data-go]').forEach(b => b.classList.toggle('act', b.dataset.go === (view.n === 'data' ? 'data' : 'home')));
  if (view.n === 'mod' && !mod(view.id)) view = { n: 'home' };
  if (view.n === 'home') {
    top.innerHTML = '<h1>Mes absences<small>ESST · limite : 5 par module</small></h1><button id="addm" aria-label="Nouveau module">＋ 📚</button>';
    $('#addm').onclick = () => modForm();
    const all = S.modules.map(stats), T = all.reduce((a, s) => a + s.t, 0), J = all.reduce((a, s) => a + s.j, 0), risk = all.filter(s => s.st[0] !== 'ok').length;
    app.innerHTML = S.modules.length ? `<div class="card"><h2>Vue d’ensemble</h2><div class="nums"><div><b>${T}</b><span>Absences</span></div><div><b>${J}</b><span>Justifiées</span></div><div><b>${T - J}</b><span>Non just.</span></div><div><b>${risk}</b><span>À risque</span></div></div></div><h3>Modules</h3>` +
      S.modules.map((m, i) => { const s = all[i]; return `<div class="card mod" data-id="${m.id}"><div class="row"><h2>${esc(m.name)}</h2><span class="badge ${s.st[0]}">${s.st[1]}</span></div>${bar(s)}${nums(s)}</div>`; }).join('')
      : '<div class="empty">📚<br><br>Aucun module pour l’instant.<br><br><button class="btn" onclick="modForm()">Ajouter un module</button></div>';
    app.querySelectorAll('.mod').forEach(c => c.onclick = () => { view = { n: 'mod', id: c.dataset.id }; render(); scrollTo(0, 0); });
  } else if (view.n === 'mod') {
    const m = mod(view.id), s = stats(m);
    top.innerHTML = `<button id="back" aria-label="Retour">←</button><h1>${esc(m.name)}<small>${m.types.map(esc).join(' · ')}</small></h1><button id="edm" aria-label="Modifier">✏️</button>`;
    $('#back').onclick = () => { view = { n: 'home' }; render(); };
    $('#edm').onclick = () => modForm(m.id);
    const list = [...m.absences].sort((a, b) => b.date.localeCompare(a.date));
    app.innerHTML = `<div class="card"><div class="row"><h2>${s.t} / ${MAX} absences</h2><span class="badge ${s.st[0]}">${s.st[1]}</span></div>${bar(s)}${nums(s)}${s.msg ? `<div class="alert ${s.st[0]}">${s.msg}</div>` : ''}</div><h3>Historique</h3>` +
      (list.length ? list.map(a => `<div class="card abs"><div class="d"><b>${fdate(a.date)}</b><span class="chip">${esc(a.type)}</span><p>${esc(a.note) || 'Sans motif'}</p></div><button class="j ${a.justified ? 'on' : ''}" data-j="${a.id}">${a.justified ? '✓ Justifiée' : 'Non justifiée'}</button><div><button class="ic" data-e="${a.id}" aria-label="Modifier">✏️</button><button class="ic" data-d="${a.id}" aria-label="Supprimer">🗑️</button></div></div>`).join('') : '<div class="empty"> Aucune absence enregistrée!.</div>');
    app.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { const a = m.absences.find(x => x.id === b.dataset.j); a.justified = !a.justified; save(); render(); toast(a.justified ? 'Marquée comme justifiée' : 'Marquée comme non justifiée'); });
    app.querySelectorAll('[data-e]').forEach(b => b.onclick = () => absForm(m.id, b.dataset.e));
    app.querySelectorAll('[data-d]').forEach(b => b.onclick = () => confirmBox('Supprimer cette absence ?', () => { m.absences = m.absences.filter(x => x.id !== b.dataset.d); save(); render(); toast('Absence supprimée'); }));
  } else {
    top.innerHTML = '<h1>Données<small>Sauvegarde locale</small></h1>';
    app.innerHTML = `<div class="card"><h2>Sauvegarde</h2><p style="color:var(--mu);font-size:.9rem">Vos données restent sur cet appareil. Exportez-les régulièrement pour les conserver ou les transférer.</p><div class="btns"><button class="btn" id="exp">↧ Exporter</button><button class="btn sec" id="imp">↥ Importer</button></div></div><div class="card"><h2>Zone sensible</h2><div class="btns"><button class="btn del" id="rst">Tout effacer</button></div></div>`;
    $('#exp').onclick = exportData; $('#imp').onclick = () => $('#file').click();
    $('#rst').onclick = () => confirmBox('Effacer tous les modules et absences ?', () => { S = { modules: [] }; save(); render(); toast('Données effacées'); });
  }
}

function sheet(h) { const d = $('#sheet'); d.innerHTML = h; if (!d.open) d.showModal(); }
const close = () => $('#sheet').close();
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') close(); });
function confirmBox(q, fn) { sheet(`<h2>${q}</h2><div class="btns"><button class="btn sec" id="no">Annuler</button><button class="btn del" id="yes">Confirmer</button></div>`); $('#no').onclick = close; $('#yes').onclick = () => { close(); fn(); }; }

function modForm(id) {
  const m = id && mod(id);
  sheet(`<form id="f"><h2>${m ? 'Modifier le module' : 'Nouveau module'}</h2><label>Nom du module<input name="n" required maxlength="60" placeholder="ex. ASD" value="${esc(m ? m.name : '')}"></label><label>Types de séances (séparés par des virgules)<input name="t" value="${esc(m ? m.types.join(', ') : 'Cours, TD, TP')}"></label><div class="btns">${m ? '<button type="button" class="btn del" id="del">Supprimer</button>' : ''}<button type="button" class="btn sec" id="no">Annuler</button><button class="btn">Enregistrer</button></div></form>`);
  $('#no').onclick = close;
  if (m) $('#del').onclick = () => confirmBox(`Supprimer « ${esc(m.name)} » et ses absences ?`, () => { S.modules = S.modules.filter(x => x.id !== m.id); save(); view = { n: 'home' }; render(); toast('Module supprimé'); });
  $('#f').onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    const types = [...new Set(f.get('t').split(',').map(x => x.trim()).filter(Boolean))]; if (!types.length) types.push('Séance');
    if (m) { m.name = f.get('n').trim(); m.types = types; } else S.modules.push({ id: uid(), name: f.get('n').trim(), types, absences: [] });
    save(); close(); render(); toast('Module enregistré');
  };
}

function absForm(mid, aid) {
  if (!S.modules.length) { toast('Ajoutez d’abord un module'); return modForm(); }
  mid = mid && mod(mid) ? mid : S.modules[0].id;
  const m = mod(mid), a = aid && m.absences.find(x => x.id === aid);
  const opts = (mm, cur) => [...new Set([...mm.types, ...(cur ? [cur] : [])])].map(t => `<option ${t === cur ? 'selected' : ''}>${esc(t)}</option>`).join('');
  sheet(`<form id="f"><h2>${a ? 'Modifier l’absence' : 'Nouvelle absence'}</h2>${a ? '' : `<label>Module<select name="m" id="ms">${S.modules.map(x => `<option value="${x.id}" ${x.id === mid ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`}<label>Date<input type="date" name="d" required value="${a ? a.date : today()}"></label><label>Type de séance<select name="t" id="ts">${opts(m, a && a.type)}</select></label><label>Motif<textarea name="note" rows="3" maxlength="200" placeholder="Raison de l’absence">${esc(a ? a.note : '')}</textarea></label><label class="chk"><input type="checkbox" name="j" ${a && a.justified ? 'checked' : ''}> Justifiée auprès de l’administration</label><div class="btns"><button type="button" class="btn sec" id="no">Annuler</button><button class="btn">Enregistrer</button></div></form>`);
  $('#no').onclick = close;
  if (!a) $('#ms').onchange = e => { $('#ts').innerHTML = opts(mod(e.target.value)); };
  $('#f').onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target), mm = mod(a ? mid : f.get('m'));
    const rec = { date: f.get('d'), type: f.get('t'), note: f.get('note').trim(), justified: f.get('j') === 'on' };
    if (a) Object.assign(a, rec); else mm.absences.push({ id: uid(), ...rec });
    save(); close(); view = { n: 'mod', id: mm.id }; render();
    const s = stats(mm); toast(s.msg ? s.msg.replace(/^\S+\s/, '') : 'Absence enregistrée');
  };
}

function exportData() {
  const b = new Blob([JSON.stringify({ app: 'esst-absences', version: 1, exportedAt: new Date().toISOString(), ...S }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `absences-esst-${today()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Export terminé');
}
$('#file').onchange = e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result); if (!Array.isArray(d.modules)) throw 0;
      const clean = d.modules.map(m => ({ id: String(m.id || uid()), name: String(m.name), types: (m.types || ['Cours', 'TD', 'TP']).map(String), absences: (m.absences || []).map(a => ({ id: String(a.id || uid()), date: String(a.date).slice(0, 10), type: String(a.type || ''), note: String(a.note || ''), justified: !!a.justified })) }));
      confirmBox(`Importer ${clean.length} module(s) ? Les données actuelles seront remplacées.`, () => { S = { modules: clean }; save(); view = { n: 'home' }; render(); toast('Import réussi'); });
    } catch (err) { toast('Fichier invalide'); }
  };
  r.readAsText(f);
};

document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { view = { n: b.dataset.go }; render(); scrollTo(0, 0); });
$('#fab').onclick = () => absForm(view.n === 'mod' ? view.id : null);
render();
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));