/* ════════════════════════════════════════════════════════════════════
   THE PANEL DOCUMENT
   The whole scope panel as one HTML string, handed to the shell's iframe
   through srcdoc (see KAI_PANEL_DOC in shell.js, which injects <base> and
   __KAI_QS at the top of its <head> before any of its own scripts run).

   It lives here rather than inline in a host page because more than one
   host loads it — index.html and the focused Artifact-Change-Order-View —
   and a second copy of this markup would rot the moment either was edited.
   Nothing in it is escaped: an external .js file has no HTML tokenizer to
   trip over a </script> in a template literal.
   ════════════════════════════════════════════════════════════════════ */
window.KAI_PANEL_SRC = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Kai : Scope Review · Variants</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Hanken+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="panel.css">
<!-- Artifact 2 scrubber styles, split out of panel.css so that file is not
     a shared edit surface. Must load after panel.css. -->
<link rel="stylesheet" href="a2-scrubber.css">
<!-- Artifact 2 card states, split out of panel.css for the same reason. -->
<link rel="stylesheet" href="a2-cards.css">
<!-- EXPERIMENT: inline expand of the Editor modules inside Artifact 2. -->
<link rel="stylesheet" href="a2-expand.css">
</head>
<body>
<div id="app">

  <!-- toolbar : spans full width; mark tile caps the rail -->
  <div class="toolbar">
        <div class="tb-mark">
          <svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg" aria-label="Kai">
            <path fill="#1A1A1A" d="M0 2h11v22.5L31 2h13.5L22 26.5 45.5 52H31.5L11 28.5V52H0Z"/>
            <path fill="#1A1A1A" d="M70.5 17c-9.5 0-17 7.6-17 17.6S60.5 52 70 52c4.6 0 8.4-1.9 10.8-5.1V52H91V18.6H80.8v4.4C78.4 19.4 74.8 17 70.5 17Zm.7 9.4c4.7 0 8.2 3.6 8.2 8.2s-3.5 8.2-8.2 8.2-8.1-3.6-8.1-8.2 3.4-8.2 8.1-8.2Z"/>
            <rect x="101" y="2" width="10.2" height="10.2" fill="#1A1A1A"/>
            <rect x="101" y="18.6" width="10.2" height="33.4" fill="#1A1A1A"/>
          </svg>
        </div>
        <span class="tb-address">3484 South Main Street</span>
        <span class="tb-sp"></span>

        <!-- Room/Contractor group toggle moved to the sidebar header (it only
             affects the left panel), so the toolbar no longer carries it here.
             Attention filter moved to the work-hdr tab bar (renderWorkHdr). -->
        <button class="btn-primary" id="approveBtn" onclick="approveAll()">Approve scope</button>
        <script>/* Context flag from the shell: at Construction stage, the primary CTA is
                    "Submit closeout" instead of "Approve scope". */
          window.__KAI_CONTEXT = new URLSearchParams(window.__KAI_QS || window.location.search).get('context') || '';</script>

        <span class="tb-div" style="margin:0 4px 0 18px"></span>
        <div class="tb-right">
          <span class="tb-bell">
            <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17a5 5 0 0 1 10 0M12 3v2M9 19a3 3 0 0 0 6 0"/></svg>
            <span class="ndot"></span>
          </span>
          <span class="org-chip" id="orgChip"><span class="dot"></span> Kaiizen</span>
          <span class="avatar" id="orgAvatar">QH</span>
        </div>
      </div>

  <div id="frame">
    <div id="main">
      <!-- two-pane body -->
      <div class="body">
        <!-- LEFT: shared task sidebar -->
        <div class="sidebar">
          <!-- Combined utility + state bar. Always shows the Group by toggle
               + Filter icon; renderStateBar() injects the mode label + action
               button for the current project state (draft / view-only / etc). -->
          <div class="sb-state-bar" id="sbStateBar"></div>
          <!-- The whole bar is the scope-level nav target (see
               selectScope). Its own controls opt out via the closest()
               guard in onScopeBarClick. -->
          <div class="sb-hdr" id="sbHdr" role="button" tabindex="0"
               onclick="onScopeBarClick(event)" onkeydown="onScopeBarKey(event)"
               title="View the whole scope">
            <span class="sb-hdr-title">Scope</span>
            <span class="sb-hdr-count" id="sbHdrCount"></span>
            <!-- Version chip: switches which snapshot of the scope this sidebar
                 shows. Owned by the iframe now (was in the shell's stepper);
                 shell mirrors currentVersionId via postMessage for its outdated-
                 scope state bar logic. -->
            <div class="ver-chip" id="verChip" onclick="event.stopPropagation()">
              <button class="ver-chip-btn" onclick="toggleVersion(event)" aria-label="Scope version">
                <span class="ver-chip-label" id="verChipLabel">v3</span>
                <span class="ver-chip-tag" id="verChipTag"></span>
                <svg viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <div class="ver-menu" id="verMenu"></div>
            </div>
            <!-- Group by + Filters live in the right panel's work-hdr tab bar
                 now — see renderWorkHdr in the JS below. -->
            <span class="sb-hdr-sp"></span>
            <!-- Edit-mode toggle: flip the whole sidebar into an editable scope.
                 In draft stages, editing IS the mode — the button is replaced
                 with a static "Edit mode" chip (see JS below that swaps it). -->
            <button class="sb-edit-toggle" id="sbEditToggle" onclick="toggleScopeEdit()" aria-pressed="false" title="Edit scope">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke-linejoin="round"/></svg>
              <span>Edit</span>
            </button>
            <!-- State chips removed — the shell's #verNotice bar now shows the
                 current version, mode, and primary CTA (Submit for review, etc.). -->
            <span id="sbEditChip" hidden></span>
            <span class="sb-rollup" id="sbRollup"></span>
            <span id="sbScopeDec"></span>
          </div>
          <!-- Scope-edit banner (shows only when edit mode is on) -->
          <div class="sb-edit-banner" id="sbEditBanner">
            <div class="sb-edit-banner-l">
              <span class="sb-edit-banner-tag">Editing scope</span>
              <span class="sb-edit-banner-body">Hand off for review when you're done and we'll notify the job manager.</span>
            </div>
          </div>
          <!-- Change-order banner removed — the approved-scope confirmation
               now happens as a modal when the user clicks Edit. -->
          <div id="coBanner" hidden></div>
          <div class="sb-scroll" id="sbScroll"></div>
          <!-- Change-order draft footer (visible when there are pending changes) -->
          <div class="co-bar hidden" id="coBar"></div>
          <!-- Scope-edit footer with the Submit action (shown in edit mode) -->
          <div class="sb-edit-footer" id="sbEditFooter">
            <button class="sb-edit-cancel" onclick="toggleScopeEdit()">Cancel</button>
            <button class="sb-edit-submit" onclick="submitScopeChanges()">Hand off for review</button>
          </div>
        </div>

        <!-- resize -->
        <div class="handle" id="handle"><span class="grip"><span></span><span></span><span></span></span></div>


        <!-- RIGHT: work surface -->
        <div class="work">
          <div class="work-hdr" id="workHdr"></div>
          <div class="work-body" id="workBody"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- SCOPE SEARCH PALETTE — floats over the work surface, Jira-style.
     Lives outside .sidebar so the sidebar's overflow can't clip it, and is
     positioned on open by _sbPositionPalette (the sidebar is user-resizable,
     so its left edge isn't a constant CSS can hold). -->
<div class="sbq-scrim" id="sbqScrim" hidden onclick="closeSbSearch()"></div>
<div class="sbq" id="sbq" hidden role="dialog" aria-label="Search the scope">
  <div class="sbq-box">
    <svg class="sbq-ico-search" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.75" stroke="currentColor" stroke-width="1.4"/><path d="M10.6 10.6 14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
    <input class="sbq-input" id="sbqInput" type="text" autocomplete="off" spellcheck="false"
           placeholder="Search the scope by group or task name" aria-label="Search the scope by group or task name"
           oninput="setSbQuery(this.value)" onkeydown="onSbSearchKey(event)">
    <button class="sbq-clear" id="sbqClear" onclick="sbqClearOrClose()" aria-label="Close search" title="Close search">
      <!-- icons/Remove-Delete.svg, inlined so it takes currentColor. -->
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M0.5 1.5L22.5 23.5"/><path d="M22.5 1.5L0.5 23.5"/></svg>
    </button>
  </div>
  <div class="sbq-results" id="sbqResults"></div>
</div>

<div id="drawer-scrim" onclick="closeDrawer()"></div>
<div id="drawer">
  <div class="dw-head">
    <div class="dw-top">
      <div>
        <div class="dw-task" id="dwTask"></div>
        <div class="dw-title" id="dwTitle"></div>
      </div>
      <button class="dw-close" onclick="closeDrawer()"><svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-linecap="round"/></svg></button>
    </div>
    <!-- Tab bar. Empty (and hidden, see #dwTabs:empty) for the notes-only
         drawer every other surface opens; filled with Photos / Notes when the
         drawer is opened as a media drawer from Artifact 2. -->
    <div class="dw-tabs" id="dwTabs"></div>
  </div>
  <div class="dw-body" id="dwBody"></div>
</div>

<!-- Product detail flyaway -->
<div id="fly-scrim" onclick="closeFly()"></div>
<aside id="fly"></aside>

<!-- Cart drawer -->
<div id="cart-scrim" onclick="closeCart()"></div>
<aside id="cart"></aside>

<!-- Artifact photo lightbox -->
<div id="artLightbox"></div>

<!-- Confirm-edit modal (shown when the user hits Edit while the scope is approved) -->
<div class="se-modal-scrim" id="seModalScrim" onclick="closeEditConfirm()"></div>
<div class="se-modal" id="seModal">
  <div class="se-modal-cap">Scope is locked</div>
  <div class="se-modal-title">Approved scope — create a draft to edit</div>
  <div class="se-modal-body">
    This scope has been approved and is currently in Construction. To make changes, we'll create a draft copy that you can submit for review. The current live scope stays untouched until the job manager approves the draft.
  </div>
  <div class="se-modal-actions">
    <button class="se-btn se-btn-secondary" onclick="closeEditConfirm()">Cancel</button>
    <button class="se-btn se-btn-primary" onclick="confirmEditFromApproved()">Create draft &amp; edit</button>
  </div>
</div>


<div id="toast"></div>
<datalist id="unitSuggestions">
  <option value="each"><option value="ea"><option value="LF"><option value="SF"><option value="SY"><option value="gal"><option value="qt"><option value="kit"><option value="suite"><option value="set"><option value="box"><option value="pack"><option value="pallet"><option value="hour"><option value="day"><option value="bag"><option value="roll"><option value="sheet">
</datalist>

<script src="js/panel-helpers.js"></script>
<script src="js/catalog.js"></script>
<script src="js/data.js"></script>
<script src="js/panel-core.js"></script>
<script src="js/scope-navigator.js"></script>
<script src="js/editor.js"></script>
<script src="js/product-picker.js"></script>
<script src="js/focused-content.js"></script>
<script src="js/measurements.js"></script>
<script src="js/progress.js"></script>
<script src="js/overview.js"></script>
<script src="js/artifact.js"></script>
<!-- Artifact 2, split by concern so its parts can be worked on independently.
     Order matters only for a2-init.js, which must load last: it references
     functions the other modules declare. -->
<script src="js/a2/a2-data.js"></script>
<script src="js/a2/a2-stage.js"></script>
<script src="js/a2/a2-time.js"></script>
<script src="js/a2/a2-document.js"></script>
<script src="js/a2/a2-media.js"></script>
<script src="js/a2/a2-cards.js"></script>
<script src="js/a2/a2-scrubber.js"></script>
<script src="js/a2/a2-expand.js"></script>
<script src="js/a2/a2-init.js"></script>
<script src="js/media-lightbox.js"></script>
<script src="js/panel-init.js"></script>
</body>
</html>
`;
