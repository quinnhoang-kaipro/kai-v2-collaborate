/* ════════════ BUDGET & ALLOWANCES ════════════
   ShopwithKai.html and ShopwithKai_layout.html. Where each target is set,
   as decided:
     Job budget            on the job, on the Overview — anyone on the job;
                           the current job total is read against it.
     Materials allowance   a department's, on the template (templates.html)
                           only, carried into every job built from it; read
                           against the department's materials. The job shows
                           it and points managers to the template to change it.
     Task allowance        on the job, in the task header — managers only;
                           read against the whole task, labor and materials.
   The two kinds of allowance measure different things (materials vs labor
   and materials), so they don't roll into each other. They're points of
   comparison and never draw down the budget.

   The figures are the left panel's (shopSide): after the open change order,
   deferred work counted in. */
// ShopwithKai.html and the layout file; the materials file stays without.
const ALLOW_ON = !!window.__KAI_SHOP && !window.__KAI_SHOP_MATERIALS;
// The job budget is anyone's to set; task allowances are the job manager's;
// department allowances are the template's, so nobody edits them on the job.
function allowIsManager(){ return typeof USER_ROLE === 'undefined' || USER_ROLE === 'manager'; }
function allowCanEdit(key){
  if(key === 'job') return true;
  if(key && key.indexOf('dept:') === 0) return false;
  return allowIsManager();
}

// Mock targets.
let JOB_BUDGET = 40000;
const DEPT_ALLOWANCES = {Kitchen:11000, Bathroom:3500, Flooring:4400};
const TASK_ALLOWANCES = {1:6500, 2:5800, 10:900, 12:1200};
// What the template set, kept apart so a department changed on this job can
// say so.
const TEMPLATE_DEPT_ALLOWANCES = Object.assign({}, DEPT_ALLOWANCES);
function allowTemplateName(){ return (typeof OVERVIEW_SEED !== 'undefined' && OVERVIEW_SEED.template && OVERVIEW_SEED.template.name) || 'the template'; }
// Where a department's own number comes from: the template, the template's
// number changed on this job, or set on this job alone.
function deptAllowOrigin(dept){
  const own = DEPT_ALLOWANCES[dept], tpl = TEMPLATE_DEPT_ALLOWANCES[dept];
  if(own == null) return null;
  if(tpl == null) return {kind:'job', label:'Set on this job'};
  if(Math.abs(own - tpl) < 0.005) return {kind:'template', label:'From template'};
  return {kind:'changed', label:`Template ${sbMoney(tpl)}, changed on this job`};
}
function _allowTplLinkHtml(){
  const n = allowTemplateName();
  return `<button type="button" class="alw-tpl-link" onclick="ovOpenTemplate('${esc(n).replace(/'/g, "\\'")}')">${esc(n)}</button>`;
}

/* ── figures ── */
// Within 5% of the allowance reads as near, so it shows before it tips over.
function _allowStatus(actual, allowance){
  if(allowance == null) return null;
  if(actual > allowance + 0.005) return 'over';
  if(actual >= allowance * 0.95) return 'near';
  return 'under';
}
function taskAllowance(t){ const v = TASK_ALLOWANCES[t.id]; return v == null ? null : v; }
function taskAllowActual(t){ return shopSide(t, 'room').now; }
function deptAllowTasks(dept){ return TASKS.filter(t => taskDept(t) === dept); }
function deptAllowActual(dept){ return deptAllowTasks(dept).reduce((a, t) => a + shopSide(t, 'dept').now, 0); }
function deptAllowance(dept){
  const own = DEPT_ALLOWANCES[dept] == null ? null : DEPT_ALLOWANCES[dept];
  const set = deptAllowTasks(dept).filter(t => taskAllowance(t) != null);
  const fromTasks = set.reduce((a, t) => a + taskAllowance(t), 0);
  return {
    own, fromTasks, nTasks: set.length,
    value: own,
    source: own != null ? 'own' : null,
    // Task allowances carry labor and a department's carries only materials,
    // so theirs adding up past it is expected. The warning is for the
    // department's own materials running past its allowance.
    warn: own != null && deptAllowActual(dept) > own + 0.005,
  };
}
function allowDepts(){ return DEPARTMENTS.concat(NO_PRODUCT_DEPT).filter(d => deptAllowTasks(d).length); }
function jobAllowanceTotal(){ return allowDepts().reduce((a, d) => a + (deptAllowance(d).value || 0), 0); }
function jobScopeTotal(){ return _shopSum(TASKS, 'room').now; }
// Anything to flag on a task or department, for the left panel's marks.
function taskAllowFlag(t){
  const a = taskAllowance(t);
  return _allowStatus(taskAllowActual(t), a) === 'over' ? 'over' : null;
}
function deptAllowFlag(dept){
  const da = deptAllowance(dept);
  return (da.value != null && _allowStatus(deptAllowActual(dept), da.value) === 'over') ? 'over' : null;
}

/* ── editing ──
   One field open at a time, by key: 'job', 'dept:<name>', 'task:<id>'.
   Clearing a field takes the allowance off; the budget always keeps one. */
let _allowEditKey = null;
function _allowArg(key){ return esc(String(key).replace(/\\/g, '\\\\').replace(/'/g, "\\'")); }
function allowEdit(key){
  if(!allowCanEdit(key)) return;
  _allowEditKey = key;
  renderAll();
  setTimeout(() => { const i = document.getElementById('allowInput'); if(i){ i.focus(); i.select(); } }, 0);
}
function allowCommit(key, raw){
  if(_allowEditKey !== key) return;   // Enter already took it; this is the blur
  _allowEditKey = null;
  const s = String(raw == null ? '' : raw).trim();
  const n = s === '' ? null : parseFloat(s.replace(/[^0-9.]/g, ''));
  const v = (n == null || isNaN(n)) ? null : Math.round(n * 100) / 100;
  const at = key.indexOf(':');
  const kind = at < 0 ? key : key.slice(0, at), id = at < 0 ? '' : key.slice(at + 1);
  if(kind === 'job'){ if(v != null) JOB_BUDGET = v; }
  else if(kind === 'dept'){ if(v == null) delete DEPT_ALLOWANCES[id]; else DEPT_ALLOWANCES[id] = v; }
  else if(kind === 'task'){ if(v == null) delete TASK_ALLOWANCES[id]; else TASK_ALLOWANCES[id] = v; }
  renderAll();
}
function allowCancel(){ _allowEditKey = null; renderAll(); }
function allowGoTask(id){
  selectTask(id);
  if(workMode !== 'shop') setWorkMode('shop');
  renderAll();
}

/* ── pieces ── */
// A target's value and, for the job manager, the control that edits it.
function allowFieldHtml(key, value, opts){
  opts = opts || {};
  const k = _allowArg(key);
  if(_allowEditKey === key){
    return `<span class="alw-edit"><span class="alw-cur">$</span><input id="allowInput" class="alw-input" inputmode="decimal"
      value="${value != null ? value.toFixed(2) : ''}" placeholder="0.00" aria-label="${esc(opts.label || 'Amount')}"
      onclick="event.stopPropagation()"
      onkeydown="event.stopPropagation();if(event.key==='Enter'){event.preventDefault();allowCommit('${k}',this.value)}else if(event.key==='Escape'){event.preventDefault();allowCancel()}"
      onblur="allowCommit('${k}',this.value)"></span>`;
  }
  const can = allowCanEdit(key);
  // Where it can be edited, the figure itself opens it too.
  const shown = value != null
    ? (can ? `<button type="button" class="alw-v is-edit" title="Edit" onclick="event.stopPropagation();allowEdit('${k}')">${sbMoney(value)}</button>` : `<span class="alw-v">${sbMoney(value)}</span>`)
    : `<span class="alw-v is-none">${esc(opts.empty || 'Not set')}</span>`;
  const btn = (can && !opts.noBtn)
    ? `<button type="button" class="alw-btn" onclick="event.stopPropagation();allowEdit('${k}')">${value != null ? 'Edit' : 'Set'}</button>`
    : '';
  return shown + btn;
}
// The difference from a target, signed as the figure moves against it:
// +$ over (red), −$ under (green).
function allowStatusHtml(actual, allowance){
  if(allowance == null) return '';
  const d = actual - allowance;
  if(Math.abs(d) < 0.005) return `<span class="alw-st is-under">$0.00</span>`;
  return `<span class="alw-st is-${d > 0 ? 'over' : 'under'}">${d > 0 ? '+' : '−'}${sbMoney(Math.abs(d))}</span>`;
}
const _ALW_WARN = `<svg class="alw-warn-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15 14H1z"/><path d="M8 6.2v3.6M8 11.6v.2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`;
function _allowWarnHtml(dept, da){
  if(!da.warn) return '';
  const mat = deptAllowActual(dept);
  return `<div class="alw-warn">${_ALW_WARN}<span>Materials in ${esc(dept)}'s tasks add up to <b>${sbMoney(mat)}</b>, ${sbMoney(mat - da.own)} more than its materials allowance of <b>${sbMoney(da.own)}</b>.</span></div>`;
}

/* The Overview's lead: the scope total over the job budget, read as one
   figure — "$38,245.78 / $40,000.00" — with a bar under it for how much of
   the budget the scope takes, and what's left or over. The budget is the
   editable half. The Record carries the same block as a band ('band'). */
function ovBudgetHtml(variant){
  return budgetBlockHtml({key:'job', label:'Current job total / Job budget', actual: jobScopeTotal(), target: JOB_BUDGET, kind:'budget', variant});
}
/* One block for every target — the job budget, a department's allowance, a
   task's — so each reads the same way wherever it sits: what it is now over
   what it was given, a bar for how much of it is used, and what's left or
   over. With no target yet it shows the figure alone and, for whoever can,
   a way to set one. */
function budgetBlockHtml(o){
  const editing = _allowEditKey === o.key;
  const can = allowCanEdit(o.key);
  const has = o.target != null;
  const btn = (!editing && can) ? `<button type="button" class="alw-btn" onclick="event.stopPropagation();allowEdit('${_allowArg(o.key)}')">${has ? 'Edit' : 'Set'}</button>`
    : o.tplLink && allowIsManager() ? `<button type="button" class="alw-btn" title="Opens the template — department allowances are set there, for every job that uses it" onclick="event.stopPropagation();ovOpenTemplate('${_allowArg(allowTemplateName())}')">Edit</button>` : '';
  const d = has ? o.target - o.actual : 0;
  // No bar: within the target the figures speak for themselves; once over,
  // the cost turns red behind a warning mark and says by how much.
  const over = has && d < -0.005;
  const target = (has || editing)
    ? `<span class="ov-budget-b">${allowFieldHtml(o.key, o.target, {label:o.label, noBtn:true})}</span>`
    : `<span class="ov-budget-b"><span class="alw-v is-none">${esc(o.none || 'No ' + o.kind)}</span></span>`;
  return `<div class="ov-budget${o.variant ? ' is-' + o.variant : ''}${has ? '' : ' is-unset'}${over ? ' is-over' : ''}">
    <span class="ov-budget-hd"><span class="ov-stat-k">${esc(o.label)}</span>${btn}</span>
    <div class="ov-budget-v">
      ${o.was != null && Math.abs(o.was - o.actual) > 0.005 ? `<span class="ov-budget-was" title="Approved ${sbMoney(o.was)}">${sbMoney(o.was)}</span>` : ''}
      <span class="ov-budget-scope">${over ? _ALW_WARN : ''}${sbMoney(o.actual)}</span>
      <span class="ov-budget-of" aria-hidden="true">/</span>
      ${target}
    </div>
    ${over ? `<span class="ov-budget-diff">+${sbMoney(-d)} over ${o.kind}</span>` : ''}
    ${o.notes ? `<div class="ov-budget-notes">${o.notes}</div>` : ''}
  </div>`;
}
/* Each department with an allowance, read against its materials, and under
   it the tasks that carry one, against the whole task. The departments with
   none are named in one line under them, each a way to go and set one. */
function ovAllowancesHtml(){
  const q = v => esc(String(v)).replace(/'/g, "\\'");
  const set = allowDepts().filter(d => deptAllowance(d).value != null);
  const unset = allowDepts().filter(d => deptAllowance(d).value == null);
  const rows = set.map(dept => {
    const da = deptAllowance(dept);
    const actual = deptAllowActual(dept);
    const tasks = deptAllowTasks(dept).filter(t => taskAllowance(t) != null);
    const flag = deptAllowFlag(dept);
    return `<tr class="alw-tr is-dept${da.value == null ? ' is-unset' : ''}">
        <td><button type="button" class="alw-link" onclick="goUpMaterials('${q(dept)}')">${esc(dept)}</button>${flag === 'warn' ? _ALW_WARN : ''}</td>
        <td class="alw-num">${da.source === 'tasks' ? `${sbMoney(da.value)}<span class="alw-src">from tasks</span>` : da.value != null ? `${sbMoney(da.value)}${(o => o ? `<span class="alw-src is-${o.kind}">${esc(o.label)}</span>` : '')(deptAllowOrigin(dept))}` : '<span class="alw-v is-none">—</span>'}</td>
        <td class="alw-num">${sbMoney(actual)}</td>
        <td class="alw-num">${allowStatusHtml(actual, da.value)}</td>
      </tr>
      ${tasks.map(t => `<tr class="alw-tr is-task">
        <td><button type="button" class="alw-link" onclick="allowGoTask(${t.id})"><span class="task-ctx">${esc(t.room)} ›</span> ${esc(t.name)}</button></td>
        <td class="alw-num">${sbMoney(taskAllowance(t))}</td>
        <td class="alw-num">${sbMoney(taskAllowActual(t))}</td>
        <td class="alw-num">${allowStatusHtml(taskAllowActual(t), taskAllowance(t))}</td>
      </tr>`).join('')}`;
  }).join('');
  const total = jobAllowanceTotal();
  return `<div class="alw-ov">
    <table class="alw-tbl">
      <thead><tr><th>Department › Task</th><th class="alw-num">Allowance</th><th class="alw-num">Current</th><th class="alw-num">Difference</th></tr></thead>
      <tbody>
        <tr class="alw-tr is-dept is-job"><td>Job</td><td class="alw-num">${sbMoney(JOB_BUDGET)}</td><td class="alw-num">${sbMoney(jobScopeTotal())}</td><td class="alw-num">${allowStatusHtml(jobScopeTotal(), JOB_BUDGET)}</td></tr>
        ${rows || `<tr class="alw-tr"><td colspan="4" class="alw-v is-none">No allowances set yet.</td></tr>`}
        ${(() => {
          /* Departments without an allowance sit in the table like the rest,
             a dash where there's nothing to compare; the first two show and
             the others fold into "+ N more". */
          const shown = _alwMoreOpen ? unset : unset.slice(0, 2);
          const dash = '<span class="alw-v is-none">—</span>';
          return shown.map(d => `<tr class="alw-tr is-dept is-unset">
              <td><button type="button" class="alw-link" onclick="goUpMaterials('${q(d)}')">${esc(d)}</button></td>
              <td class="alw-num">${dash}</td><td class="alw-num">${sbMoney(deptAllowActual(d))}</td><td class="alw-num">${dash}</td>
            </tr>`).join('')
            + (unset.length > 2 ? `<tr class="alw-tr is-more"><td colspan="4"><button type="button" class="alw-more" onclick="alwToggleMore()">${_alwMoreOpen ? 'Show fewer' : `+ ${unset.length - 2} more`}</button></td></tr>` : '');
        })()}</tbody>
      <tfoot><tr><td>All allowances</td><td class="alw-num">${sbMoney(total)}</td><td class="alw-num" colspan="2"><span class="alw-foot-note">of ${sbMoney(JOB_BUDGET)} job budget</span></td></tr></tfoot>
    </table>
    <p class="alw-note">Task allowances include labor and materials. Department allowances only include materials.</p>
  </div>`;
}

let _alwMoreOpen = false;
function alwToggleMore(){ _alwMoreOpen = !_alwMoreOpen; renderAll(); }
/* The Record's section: the same list, under the Record's own header. The
   job budget stays on the Overview, where it is set. */
function _renderAllowanceSection(){
  return `<section class="art-sec art-alw" id="artAlw">
    <header class="art-sec-hdr">
      <div class="art-sec-hdr-l">
        <h2 class="art-sec-title">Allowances</h2>
        <p class="art-sec-desc alw-tpl-note">Template: ${_allowTplLinkHtml()}</p>
      </div>
    </header>
    ${ovAllowancesHtml()}
  </section>`;
}

/* The department page's band, under its title. */
/* A department's allowance block. 'corner' sits at the top right of the
   department's header, as the job budget sits on the Overview; its warning,
   when there is one, comes separately (deptAllowanceWarnHtml) to run the
   header's width under it. */
function deptAllowanceWarnHtml(dept){ return _allowWarnHtml(dept, deptAllowance(dept)); }
function deptAllowanceHtml(dept, variant){
  const da = deptAllowance(dept);
  const origin = deptAllowOrigin(dept);
  const notes = da.source === 'tasks'
    ? `<span class="alw-src">From ${da.nTasks} task ${da.nTasks === 1 ? 'allowance' : 'allowances'}</span>`
    : [origin ? (origin.kind === 'template' ? `<span class="alw-src">From template ${_allowTplLinkHtml()}</span>` : `<span class="alw-src">${esc(origin.label)}</span>`) : '',
       da.nTasks ? `<span class="alw-src">Task allowances ${sbMoney(da.fromTasks)}</span>` : ''].join('');
  // The layout file lays the detail out in bands under the header instead.
  const block = budgetBlockHtml({key:'dept:' + dept, label:'Materials cost / Allowance', actual: deptAllowActual(dept), target: da.value, kind:'allowance', variant: variant || 'band', notes: window.__KAI_SHOP_LAYOUT ? '' : notes, tplLink: true});
  return variant === 'corner' ? block : block + _allowWarnHtml(dept, da);
}

/* A header band in the Overview's pattern — a name on the left, labelled
   fields in even columns — shared by the layout file's task, product type and
   department pages so all three read the same way. `cells` is [label, html]. */
function infoBandHtml(name, cells, cols){
  return `<div class="tk-band"><h3 class="tk-band-h">${esc(name)}</h3><div class="tk-grid${cols ? ' is-' + cols : ''}">${cells.map(([k, v]) =>
    `<div class="tk-f"><span class="ov-stat-k">${k}</span><div class="tk-f-v">${v}</div></div>`).join('')}</div></div>`;
}
/* A department's allowances, as a band: the tasks in it that carry their own,
   each with its figure, so "task allowances" says which tasks it means. */
function deptAllowBandHtml(dept){
  const tasks = deptAllowTasks(dept).filter(t => taskAllowance(t) != null);
  const da = deptAllowance(dept);
  if(!tasks.length && !da.warn) return '';
  const rows = tasks.map(t => `<button type="button" class="tk-alw-row" onclick="allowGoTask(${t.id})" title="Open ${esc(t.name)}">
      <span class="tk-alw-name"><span class="task-ctx">${esc(t.room)} ›</span> ${esc(t.name)}</span>
      <span class="tk-alw-v">${sbMoney(taskAllowActual(t))} / ${sbMoney(taskAllowance(t))}</span></button>`).join('');
  return `<div class="tk-band"><h3 class="tk-band-h">Task allowances</h3><div class="tk-alw">
      ${rows}
      ${tasks.length > 1 ? `<div class="tk-alw-row is-sum"><span class="tk-alw-name">${tasks.length} tasks</span><span class="tk-alw-v">${sbMoney(da.fromTasks)}</span></div>` : ''}
      ${_allowWarnHtml(dept, da)}
    </div></div>`;
}

/* The task header's block: the allowance, read against the whole task. */
function taskAllowanceRowHtml(t, variant){
  const a = taskAllowance(t);
  // 'corner' takes the place of the task's price in the layout file's header:
  // the price is the first half of the figure, the change order's move sits
  // under the bar, and the bar is only as wide as the figure.
  if(variant === 'corner'){
    const d = taskDelta(t);
    // Shown to everyone: a task without one reads N/A rather than vanishing.
    return budgetBlockHtml({key:'task:' + t.id, label:'Task cost / Allowance', actual: taskAllowActual(t), target: a, kind:'allowance', variant:'corner', none:'N/A',
      // A change order's move reads as the approved price struck through
      // before the current one, as it does in the left panel.
      was: d ? taskAllowActual(t) - d : null});
  }
  if(a == null && !allowCanEdit()) return '';
  return budgetBlockHtml({key:'task:' + t.id, label:'Task cost / Allowance', actual: taskAllowActual(t), target: a, kind:'allowance', variant:'band',
    notes: '<span class="alw-src">Labor and materials</span>'});
}

/* The left panel's mark: a task or department over its allowance, or a
   department whose task allowances outrun its own. */
function allowMarkHtml(flag, what, t, key){
  if(!flag) return '';
  /* The left panel says only that something is over — a warning mark and
     "Over" — with no figures and no word for what it's over. Pressing it opens
     the task or department in the Editor, where the allowance is laid out. */
  const by = (t && flag === 'over') ? ` by ${sbMoney(taskAllowActual(t) - taskAllowance(t))}` : '';
  const tip = `Over its allowance${by} · open for details`;
  const ic = '<svg class="alw-mark-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15 14H1z"/><path d="M8 6.2v3.6M8 11.6v.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const go = t ? `allowGoTask(${t.id})` : (key ? `goUpMaterials('${_allowArg(key)}')` : '');
  return `<button type="button" class="alw-mark is-${flag}" title="${esc(tip)}" aria-label="${esc(tip)}"${go ? ` onclick="event.stopPropagation();${go}"` : ''}>${ic}Over</button>`;
}
