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
(function a2TrimToStage(){
  // Every stage before the scope goes live. A change order is a change against
  // a published scope, so none of these can have one — including the two
  // post-review nodes, where the scope is approved but not yet published.
  // (Steps 5-8 — published, closeout — are where the snapshot's real history
  // belongs, and they are left alone.)
  const PRE_APPROVAL = ['edit', 'submitted', 'reviewing', 'review-done', 'awaiting-pub'];
  const stage = (typeof STAGE_ID !== 'undefined') ? STAGE_ID : '';
  if(!PRE_APPROVAL.includes(stage)) return;

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
