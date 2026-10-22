/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · STAGE TRIM
   The change history is a fixed snapshot that assumes an approved scope with
   two change orders against it. That is only true once the scope is published
   and construction is under way. Before then — while the scope is still being
   authored, submitted, or reviewed — nothing has been approved, so nothing can
   have changed since, and the tab should say so by being nearly empty.

   Runs at load, right after a2-data.js, so buildOrdered() sees the trimmed
   data and everything downstream follows without knowing about stages:
     · ORDERED comes out empty, so there are no redlines and no margin cards
     · VBOUNDS collapses to one band, so the scrubber shows only Scope
     · lineExistsAt() keys off each line's 'added' change, so lines that only
       exist because a change order added them disappear on their own

   Keyed on STAGE_ID (the shell's exact stepper node, passed as stageId), not
   on IS_DRAFT_STAGE — that one is only set for edit and submitted, and would
   miss the review step.
   ════════════════════════════════════════════════════════════════════ */
/* True when the scope on screen has not been approved yet — read by the
   scrubber, which otherwise labels every band and milestone "approved". */
let A2_SCOPE_UNAPPROVED = false;
/* A version that has been submitted but not yet approved, or null. Different
   question from A2_SCOPE_UNAPPROVED: there the whole document is pre-approval,
   here the scope and earlier change orders are approved and only the last one
   is still out for a decision. */
let A2_PENDING_VER = null;

(function a2TrimToStage(){
  // Every stage before the scope goes live. A change order is a change against
  // a published scope, so none of these can have one — including the two
  // post-review nodes, where the scope is approved but not yet published.
  // (Steps 5-8 — published, closeout — are where the snapshot's real history
  // belongs, and they are left alone.)
  const PRE_APPROVAL = ['edit', 'submitted', 'reviewing', 'review-done', 'awaiting-pub'];
  const stage = (typeof STAGE_ID !== 'undefined') ? STAGE_ID : '';
  /* The change-order-review step: the scope is live and an order has been
     handed in against it. Everything in the snapshot stands, but the last
     version is awaiting a decision rather than approved — and the tasks that
     order touches carry the change-order pill through the rest of the panel. */
  if(stage === 'published' && (typeof WORK_TRACK !== 'undefined') && WORK_TRACK === 'change_order'){
    const pending = VER_ORDER[VER_ORDER.length - 1];
    A2_PENDING_VER = pending;
    /* Its sign-offs come back to the ones actually collected so far. The
       snapshot has it fully signed because it models an approved order; drop
       the final approver so the roster reads as still owing a decision, which
       is what "submitted, not approved" means. */
    if(typeof REVIEWS !== 'undefined'){
      const last = REVIEWS.map((r,i) => r.ver === pending ? i : -1).filter(i => i >= 0).pop();
      if(last != null) REVIEWS.splice(last, 1);
    }
    /* Which live tasks are in the order — derived from the snapshot rather than
       listed again here, so the two can't drift. __CO_SUBMITTED is what
       taskHasOpenChangeOrder() reads, which is what puts the pill on a row. */
    if(typeof SCOPE !== 'undefined' && typeof TASKS !== 'undefined' && typeof __CO_SUBMITTED !== 'undefined'){
      const touched = new Set();
      SCOPE.forEach(g => g.tasks.forEach(t => {
        if((t.changes || []).some(ch => ch.ver === pending)) touched.add(t.code);
      }));
      TASKS.forEach(t => { if(touched.has(t.code)) __CO_SUBMITTED.add(t.id); });
    }
    return;
  }

  if(!PRE_APPROVAL.includes(stage)) return;
  A2_SCOPE_UNAPPROVED = true;

  // Keep the Scope phase's own history and drop only the change orders. The
  // scope-building edits are things that really did happen while authoring it,
  // and some of them are the 'added' change that puts a line in the scope at
  // all — wipe those and lineExistsAt() hides the line entirely, emptying the
  // document rather than trimming it.
  const keep = VER_ORDER[0];
  if(typeof SCOPE !== 'undefined'){
    SCOPE.forEach(g => g.tasks.forEach(t => {
      t.changes = (t.changes || []).filter(ch => ch.ver === keep);
      // A line the snapshot marks as removed was removed by a change order, so
      // at this point in the story it is simply still here.
      if(t.removed) delete t.removed;
    }));
  }
  // const guards the binding, not the contents — the array is trimmed in place
  // so every module that closed over VER_ORDER sees the same one version.
  if(typeof VER_ORDER !== 'undefined') VER_ORDER.length = 1;
})();
