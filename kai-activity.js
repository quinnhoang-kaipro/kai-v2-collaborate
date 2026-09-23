/* ════════════════════════════════════════════════════════════
   THE ACTIVITY LOG — the renderer behind kai-activity.css
   ────────────────────────────────────────────────────────────
   One function, four levels. The property page calls it with level:'property'
   and job-shaped entries; the job page will call it with level:'job' and
   task-shaped entries; the task panel with level:'task'. The markup, the
   controls and the reading order are identical every time — which was the whole
   point of the decision: "we don't have to redesign it over and over. We fit the
   information into the pattern."

     KaiActivity.mount(el, {
       level:    'property' | 'job' | 'group' | 'task',
       entries:  [entry, …],
       group:    'day' | 'week' | 'month',      // initial time bucket
       lane:     'all' | 'admin' | 'work',      // initial lane filter
       limit:    12,                            // rows before "show earlier"
       collapsed:false,
       onNavigate: function(target, entry){}    // drill-down handler
     });

   An entry:
     { at:'2026-09-11T14:22', actor:'M. Alvarez', lane:'admin'|'work',
       kind:'job'|'status'|'created'|'edit'|'changeorder'|'handoff'|'media',
       title:'Change order 2 submitted',        // the sentence, minus the actor
       sub:'7 tasks · scope up $4,120',         // optional second line
       job:'Unit 2 full turn',                  // shown at property level only
       amount: 4120,                            // signed; inflate/deflate scope
       links:[{label:'Change order 2', to:{…}}],
       children:[{group:'Kitchen', name:'…', was:'Qty 12 → 16', delta:1240, to:{…}}] }

   Nothing here knows what a property or a task is. It knows events have a time,
   an actor, a lane and possibly children — which is why the same file serves all
   four levels.
   ════════════════════════════════════════════════════════════ */
(function(global){
'use strict';

var LEVEL_LABEL = {
  property: 'Property activity',
  job:      'Job activity',
  group:    'Group activity',
  task:     'Task activity'
};

/* What each level's rows are *of*. Said in the head so a reader landing on a log
   mid-scroll knows whether "12 events" means twelve jobs or twelve edits. */
var LEVEL_OF = {
  property: 'jobs at this property',
  job:      'this job',
  group:    'this group',
  task:     'this task'
};

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function money(n){
  var v = Math.abs(n).toLocaleString('en-US', {maximumFractionDigits:0});
  return (n < 0 ? '−$' : '+$') + v;
}
function parse(at){ return new Date(String(at).replace(' ', 'T')); }

function fmtTime(d){
  var h = d.getHours(), m = d.getMinutes(), ap = h < 12 ? 'am' : 'pm';
  h = h % 12; if(h === 0) h = 12;
  return h + ':' + (m < 10 ? '0' : '') + m + ap;
}
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* The bucket an entry falls in, and the words on that bucket's head. Day buckets
   say "Today" and "Yesterday" because that is what people call them; week and
   month buckets say a range, because "this week" stops being true tomorrow. */
function bucketOf(d, mode, now){
  var day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if(mode === 'month') return {key:d.getFullYear() + '-' + d.getMonth(),
    label:MON[d.getMonth()] + ' ' + d.getFullYear()};
  if(mode === 'week'){
    var ws = new Date(day); ws.setDate(ws.getDate() - ws.getDay());
    var we = new Date(ws);  we.setDate(we.getDate() + 6);
    return {key:'w' + ws.getTime(),
      label:'Week of ' + MON[ws.getMonth()] + ' ' + ws.getDate()
        + (we.getMonth() !== ws.getMonth() ? ' – ' + MON[we.getMonth()] + ' ' + we.getDate() : '')};
  }
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var diff  = Math.round((today - day) / 86400000);
  if(diff === 0) return {key:'d' + day.getTime(), label:'Today'};
  if(diff === 1) return {key:'d' + day.getTime(), label:'Yesterday'};
  return {key:'d' + day.getTime(),
    label:MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()};
}

/* Which dot a row gets. Colour is reserved for the two things worth colouring:
   a change order (the signal Tov wants visible at a glance, because a job full
   of them is a job that went wrong) and a completion. */
function dotClass(e){
  var c = 'lane-' + (e.lane || 'admin');
  if(e.kind === 'changeorder') c += ' is-co';
  else if(e.kind === 'status' && /complet|approv|closed/i.test(e.title)) c += ' is-good';
  else if(e.kind === 'handoff') c += ' is-open-dot';
  return c;
}

var ICON = {
  down:   '<svg viewBox="0 0 12 12"><path d="M3 4.5l3 3 3-3"/></svg>',
  doc:    '<svg viewBox="0 0 12 12"><path d="M3 1.5h4l2.5 2.5v7h-6.5z"/><path d="M7 1.5V4h2.5"/></svg>',
  task:   '<svg viewBox="0 0 12 12"><path d="M2 6.2l2.6 2.6L10 3.4"/></svg>',
  go:     '<svg viewBox="0 0 12 12"><path d="M2.5 6h7M6.5 3l3 3-3 3"/></svg>'
};

function renderRow(e, i, opts, state){
  var d    = parse(e.at);
  var open = state.open[e._id] ? ' is-open' : '';
  var kids = e.children && e.children.length;

  var links = (e.links || []).map(function(l, j){
    return '<button class="ka-link" type="button" data-nav="' + i + ':' + j + '">'
      + (ICON[l.icon] || ICON.go) + esc(l.label) + '</button>';
  }).join('');

  if(kids){
    links += '<button class="ka-link' + (open ? ' is-open' : '') + '" type="button" data-open="' + i + '">'
      + ICON.down + (state.open[e._id] ? 'Hide' : 'Show') + ' ' + e.children.length + ' '
      + (e.childNoun || 'task') + (e.children.length === 1 ? '' : 's') + '</button>';
  }

  var kidHtml = kids ? '<div class="ka-kids">' + e.children.map(function(c, k){
    var dl = c.delta == null ? '' :
      '<span class="ka-kid-d ' + (c.delta < 0 ? 'down' : 'up') + '">' + money(c.delta) + '</span>';
    return '<div class="ka-kid" data-kid="' + i + ':' + k + '" role="button" tabindex="0">'
      + (c.group ? '<span class="ka-kid-g">' + esc(c.group) + '</span>' : '')
      + '<span class="ka-kid-n">' + esc(c.name)
        + (c.was ? '<span class="was">' + esc(c.was) + '</span>' : '') + '</span>'
      + dl + '</div>';
  }).join('') + '</div>' : '';

  var amt = e.amount == null ? '' :
    '<span class="ka-amt ' + (e.amount < 0 ? 'down' : 'up') + '">' + money(e.amount) + '</span>';

  return '<div class="ka-row ' + dotClass(e) + open + '">'
    + '<div class="ka-t">' + fmtTime(d) + '</div>'
    + '<div class="ka-rail"><span class="ka-dot"></span></div>'
    + '<div class="ka-main">'
      + '<div class="ka-ttl">' + (e.actor ? '<span class="who">' + esc(e.actor) + '</span> ' : '')
        + esc(e.title)
        + (opts.level === 'property' && e.job ? '<span class="ka-job">' + esc(e.job) + '</span>' : '')
      + '</div>'
      + (e.sub ? '<div class="ka-sub">' + e.sub + '</div>' : '')
      + (links ? '<div class="ka-links">' + links + '</div>' : '')
    + '</div>'
    + '<div class="ka-right">' + amt + '</div>'
    + kidHtml
  + '</div>';
}

function draw(el, opts, state){
  var now  = opts.now ? parse(opts.now) : new Date();
  var list = opts.entries.filter(function(e){
    return state.lane === 'all' || (e.lane || 'admin') === state.lane;
  });
  list.sort(function(a, b){ return parse(b.at) - parse(a.at); });

  var shown = list.slice(0, state.limit);
  var body  = '';

  if(!shown.length){
    body = '<div class="ka-empty">Nothing recorded here yet.</div>';
  } else {
    var cur = null;
    shown.forEach(function(e, i){
      var b = bucketOf(parse(e.at), state.group, now);
      if(!cur || cur.key !== b.key){
        if(cur) body += '</div>';
        cur = b;
        var n = shown.filter(function(x){ return bucketOf(parse(x.at), state.group, now).key === b.key; }).length;
        body += '<div class="ka-bucket"><div class="ka-bucket-h"><span class="d">' + esc(b.label)
          + '</span><span class="r"></span><span class="c">' + n + '</span></div>';
      }
      body += renderRow(e, i, opts, state);
    });
    if(cur) body += '</div>';
    if(list.length > state.limit){
      body += '<div class="ka-foot"><button class="ka-more" type="button" data-more="1">'
        + 'Show earlier &middot; ' + (list.length - state.limit) + ' more</button></div>';
    }
  }

  el.className = 'ka' + (state.closed ? ' is-closed' : '');
  el.innerHTML =
    '<div class="ka-head">'
      + '<span class="ka-lbl"><span class="lvl">' + esc(opts.label || LEVEL_LABEL[opts.level] || 'Activity')
        + '</span> &middot; ' + list.length + ' event' + (list.length === 1 ? '' : 's')
        + ' across ' + esc(LEVEL_OF[opts.level] || 'this record') + '</span>'
      + '<div class="ka-tools">'
        + '<div class="ka-seg" role="group" aria-label="Lane">'
          + seg('lane', 'all', 'All', state) + seg('lane', 'admin', 'Admin', state)
          + seg('lane', 'work', 'Work', state)
        + '</div>'
        + '<div class="ka-seg" role="group" aria-label="Group by">'
          + seg('group', 'day', 'Day', state) + seg('group', 'week', 'Week', state)
          + seg('group', 'month', 'Month', state)
        + '</div>'
        + '<button class="ka-collapse" type="button" data-toggle="1" aria-expanded="'
          + (state.closed ? 'false' : 'true') + '">'
          + ICON.down + (state.closed ? 'Expand' : 'Collapse') + '</button>'
      + '</div>'
    + '</div>'
    + '<div class="ka-body">' + body + '</div>';

  /* The rows the current filter is showing, so click handlers index the same
     array the markup was built from. */
  state.shown = shown;
}

function seg(kind, val, label, state){
  return '<button type="button" data-' + kind + '="' + val + '"'
    + (state[kind] === val ? ' class="on"' : '') + '>' + label + '</button>';
}

function mount(el, opts){
  opts = opts || {};
  opts.entries = (opts.entries || []).map(function(e, i){
    if(e._id == null) e._id = 'e' + i;
    return e;
  });

  var state = {
    lane:   opts.lane   || 'all',
    group:  opts.group  || 'day',
    limit:  opts.limit  || 12,
    closed: !!opts.collapsed,
    open:   {},
    shown:  []
  };
  var baseLimit = state.limit;

  /* Mounting the same element twice is the normal case, not a mistake: the
     property page re-mounts on every drill-down because the level itself
     changes. So a second mount detaches the first one's listeners — otherwise
     each mount adds another, and one click on a child row navigates N levels
     down at once. */
  if(el.__kaOff) el.__kaOff();

  var onClick = function(ev){
    var t = ev.target.closest('[data-lane],[data-group],[data-toggle],[data-open],[data-nav],[data-kid],[data-more]');
    if(!t) return;

    if(t.dataset.lane)  { state.lane  = t.dataset.lane;  state.limit = baseLimit; return draw(el, opts, state); }
    if(t.dataset.group) { state.group = t.dataset.group; return draw(el, opts, state); }
    if(t.dataset.toggle){ state.closed = !state.closed;  return draw(el, opts, state); }
    if(t.dataset.more)  { state.limit += 20;             return draw(el, opts, state); }

    if(t.dataset.open){
      var e = state.shown[+t.dataset.open];
      state.open[e._id] = !state.open[e._id];
      return draw(el, opts, state);
    }
    if(t.dataset.nav){
      var p = t.dataset.nav.split(':'), en = state.shown[+p[0]];
      var link = en.links[+p[1]];
      if(opts.onNavigate) opts.onNavigate(link.to || link, en);
      return;
    }
    if(t.dataset.kid){
      var q = t.dataset.kid.split(':'), ek = state.shown[+q[0]], kid = ek.children[+q[1]];
      if(opts.onNavigate) opts.onNavigate(kid.to || kid, ek);
    }
  };

  /* A child row is a button in everything but tag name, so it answers the
     keyboard like one. */
  var onKey = function(ev){
    if((ev.key === 'Enter' || ev.key === ' ') && ev.target.dataset && ev.target.dataset.kid){
      ev.preventDefault(); ev.target.click();
    }
  };

  el.addEventListener('click', onClick);
  el.addEventListener('keydown', onKey);
  el.__kaOff = function(){
    el.removeEventListener('click', onClick);
    el.removeEventListener('keydown', onKey);
    el.__kaOff = null;
  };

  draw(el, opts, state);
  return {
    redraw:  function(){ draw(el, opts, state); },
    setData: function(entries){ opts.entries = entries; state.limit = baseLimit; draw(el, opts, state); }
  };
}

global.KaiActivity = {mount:mount};
})(window);
