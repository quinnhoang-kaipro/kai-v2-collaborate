/* ════════════ BUDGET & ALLOWANCES ════════════
   ShopwithKai.html only. A job carries three money targets, highest first:
     Job budget            set on the Overview; the scope total is read
                           against it.
     Department allowance  set on a department's page; read against what the
                           department's products cost — materials only.
     Task allowance        set in a task's header; read against the whole
                           task — labor and materials.
   Task allowances roll up into their department's when the department has
   none of its own, and departments roll up to the job. Allowances are points
   of comparison: they never draw down the budget. When a department has its
   own number and its tasks' allowances add up to more, it says so; otherwise
   both levels just stand. Anyone on the job sets the budget; only the job
   manager edits allowances.

   The figures are the left panel's (shopSide): after the change order —
   removals out, price changes in — and deferred materials left out, as the
   Materials view leaves them out. */
const ALLOW_ON = !!window.__KAI_SHOP && !window.__KAI_SHOP_LAYOUT;
// The job budget is anyone's to set; allowances are the job manager's.
function allowCanEdit(key){ return key === 'job' || typeof USER_ROLE === 'undefined' || USER_ROLE === 'manager'; }

// Mock targets. Kitchen is set to show both warnings: its products run over
// the department's number, and its two tasks' allowances add up past it.
let JOB_BUDGET = 40000;
const DEPT_ALLOWANCES = {Kitchen:11000, Bathroom:3500, Flooring:4400};
const TASK_ALLOWANCES = {1:6500, 2:5800, 10:900, 12:1200};

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
    value: own != null ? own : (set.length ? fromTasks : null),
    source: own != null ? 'own' : (set.length ? 'tasks' : null),
    warn: own != null && fromTasks > own + 0.005,
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
  if(da.value != null && _allowStatus(deptAllowActual(dept), da.value) === 'over') return 'over';
  return da.warn ? 'warn' : null;
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
  const btn = can
    ? `<button type="button" class="alw-btn" onclick="event.stopPropagation();allowEdit('${k}')">${value != null ? 'Edit' : 'Set'}</button>`
    : '';
  return shown + btn;
}
// How far a figure sits from its target: what's left, or how far over.
function allowStatusHtml(actual, allowance, suffix){
  const st = _allowStatus(actual, allowance);
  if(!st) return '';
  const d = Math.abs(allowance - actual);
  return `<span class="alw-st is-${st}">${sbMoney(d)} ${st === 'over' ? 'over' : 'left'}${suffix ? ' ' + esc(suffix) : ''}</span>`;
}
const _ALW_WARN = `<svg class="alw-warn-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15 14H1z"/><path d="M8 6.2v3.6M8 11.6v.2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`;
function _allowWarnHtml(dept, da){
  if(!da.warn) return '';
  return `<div class="alw-warn">${_ALW_WARN}<span>Task allowances in ${esc(dept)} add up to <b>${sbMoney(da.fromTasks)}</b>, ${sbMoney(da.fromTasks - da.own)} more than the department's <b>${sbMoney(da.own)}</b>.</span></div>`;
}

/* The Overview's lead: the budget, the scope total read against it, and the
   allowances beside it for comparison. */
function ovBudgetHtml(){
  const b = JOB_BUDGET, scope = jobScopeTotal(), d = b - scope;
  const st = d < 0 ? 'over' : (d < b * 0.05 ? 'near' : 'under');
  return `<div class="ov-budget">
    <span class="ov-stat-k">Job budget</span>
    <div class="ov-budget-v">${allowFieldHtml('job', b, {label:'Job budget'})}</div>
    <div class="ov-budget-sub">
      <span class="ov-budget-row"><span class="ov-budget-k">Scope total</span><b>${sbMoney(scope)}</b></span>
      <span class="alw-st is-${st}">${sbMoney(Math.abs(d))} ${d < 0 ? 'over budget' : 'under budget'}</span>
    </div>
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
        <td class="alw-num">${da.source === 'tasks' ? `${sbMoney(da.value)}<span class="alw-src">from tasks</span>` : da.value != null ? sbMoney(da.value) : '<span class="alw-v is-none">—</span>'}</td>
        <td class="alw-num">${sbMoney(actual)}</td>
        <td class="alw-num">${allowStatusHtml(actual, da.value)}</td>
      </tr>
      ${da.warn ? `<tr class="alw-tr is-warn"><td colspan="4">${_allowWarnHtml(dept, da)}</td></tr>` : ''}
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
      <thead><tr><th>Department › Task</th><th class="alw-num">Allowance</th><th class="alw-num">Current</th><th class="alw-num"></th></tr></thead>
      <tbody>${rows || `<tr class="alw-tr"><td colspan="4" class="alw-v is-none">No allowances set yet.</td></tr>`}
        ${unset.length ? `<tr class="alw-tr is-unset-list"><td colspan="4"><span class="alw-k">No allowance</span> ${unset.map(d => `<button type="button" class="alw-link" onclick="goUpMaterials('${q(d)}')">${esc(d)}</button>`).join('<span class="alw-sep" aria-hidden="true">·</span>')}</td></tr>` : ''}</tbody>
      <tfoot><tr><td>All allowances</td><td class="alw-num">${sbMoney(total)}</td><td class="alw-num" colspan="2"><span class="alw-foot-note">of ${sbMoney(JOB_BUDGET)} job budget</span></td></tr></tfoot>
    </table>
    <p class="alw-note">Departments are read against their materials; tasks against labor and materials. Allowances are for comparison and don't draw down the budget.${allowCanEdit() ? ' Set them on a department’s page or in a task’s header.' : ''}</p>
  </div>`;
}

/* The department page's band, under its title. */
function deptAllowanceHtml(dept){
  const da = deptAllowance(dept);
  const actual = deptAllowActual(dept);
  const note = da.source === 'tasks'
    ? `<span class="alw-src">From ${da.nTasks} task ${da.nTasks === 1 ? 'allowance' : 'allowances'}</span>`
    : da.nTasks ? `<span class="alw-src">Task allowances ${sbMoney(da.fromTasks)}</span>` : '';
  return `<div class="alw-band">
    <div class="alw-cell">
      <span class="alw-k">Department allowance</span>
      <span class="alw-line">${allowFieldHtml('dept:' + dept, da.own, {label:'Department allowance', empty: da.source === 'tasks' ? sbMoney(da.value) : 'Not set'})}</span>
      ${note}
    </div>
    <div class="alw-cell">
      <span class="alw-k">Materials</span>
      <span class="alw-line"><span class="alw-v">${sbMoney(actual)}</span>${allowStatusHtml(actual, da.value)}</span>
    </div>
    ${_allowWarnHtml(dept, da)}
  </div>`;
}

/* The task header's row: the allowance, read against the whole task. */
function taskAllowanceRowHtml(t){
  const a = taskAllowance(t);
  if(a == null && !allowCanEdit()) return '';
  return `<div class="tkh-row alw-tkh">
    <span class="tkh-lbl">Allowance</span>
    <span class="tkh-val alw-line">${allowFieldHtml('task:' + t.id, a, {label:'Task allowance'})}${allowStatusHtml(taskAllowActual(t), a, 'with labor and materials')}</span>
  </div>`;
}

/* The left panel's mark: a task or department over its allowance, or a
   department whose task allowances outrun its own. */
function allowMarkHtml(flag, what){
  if(!flag) return '';
  const tip = flag === 'warn' ? `Task allowances add up to more than this ${what}'s` : `Over its allowance`;
  return `<span class="alw-mark is-${flag}" title="${esc(tip)}">${flag === 'warn' ? 'Allowances' : 'Over allowance'}</span>`;
}
