---
name: iterate-with-council
description: Improve a work item through a persistent contractor and repeated blind council review rounds. Use when the user explicitly invokes iterate-with-council or asks for multi-round improvement judged by a council. Invoke review-with-council for each round; it accepts a supplied council or creates one when none is given. Continue until the exit rule is met or the run is blocked.
---

# Iterate with Council

Improve one work item through a **contractor → review → decision** loop. The main thread coordinates the work, owns the exit criterion, and invokes `$review-with-council` for every review round. The contractor edits the artifact; the review skill supplies independent evaluations.

## Establish the run

1. Identify the work item, user task, constraints, evaluation priorities, requested deliverable, and any supplied council or requested seat count. Accept an explicitly supplied council file, attachment, accessible link, inline definition, or reference to an existing project council. Pass it to `$review-with-council` unchanged; if none is supplied, let that skill invoke `$create-council` during the first review. Do not substitute a new council for an unreadable supplied one.
2. Record the exit criterion **only in the main thread**. Default: every active council member scores the same latest artifact at least 9/10, with no violated explicit user constraints. A user-provided criterion replaces this score rule unless the user says otherwise.
3. Set an iteration budget (default five reviewed rounds; the user may override). The budget is a stop-for-reporting limit, not a substitute for the exit criterion.
4. Verify the runtime supports a genuine independent, persistent agent thread/session for the contractor. `$review-with-council` checks reviewer isolation. Report missing capabilities honestly; never claim independent threads when merely role-playing in one context.

## Dispatch the contractor

Create **one contractor agent in a separate, persistent thread**, not a child subagent of the main thread. Give it the work item, user request, constraints, access to the working artifact, and the task of delivering a complete first version. Keep that thread alive across rounds so it can revise the same work.

The contractor alone owns edits to the work item. The main thread coordinates and reads. Do not pass the main thread's private exit criterion to the contractor unless it is an explicit user requirement of the work itself. Wait for an identifiable artifact or version before requesting a review.

## Review and decide

1. Freeze the latest contractor output as one stable review snapshot. Invoke `$review-with-council` with that snapshot, the original brief and later amendments, all applicable constraints, evaluation priorities, and the supplied or active council. Pass the seat count and council direction on the first round if no council exists. If direct skill invocation is unavailable, load and follow the installed skill instructions; disclose that fallback. If the skill is unavailable, report the missing dependency.
2. Display its per-member scorecard after **every reviewed round**, with the round number, artifact/version identifier, shared issues, and disagreements. Keep the council source it returns and pass the **same active council** to subsequent rounds; do not regenerate it on each review.
3. Evaluate the exit criterion only after every active member has reviewed the same snapshot. Preserve minority concerns; do not average away a low score or alter scores to end the run.
   - **Met:** declare success, identify the final artifact, and report the final scorecard.
   - **Unmet, with rounds remaining:** send the full reviews, scores, and actionable issues to the **existing contractor thread**. Ask it to address conflicts explicitly, preserve user constraints, and produce a revised version. Repeat from step 1.
   - **Budget exhausted or genuinely blocked:** report **exit criteria not met**, the latest scores, unresolved issues, artifact, and blocker. Do not describe the run as successful.

## Handle changes during the run

When the user changes the requested work, pause dispatch and treat reviews of the previous artifact as stale. Give the change to the existing contractor thread, preserving earlier constraints unless superseded. Check whether an active member's focus area covers the new concern. If none does, append one general-purpose reviewer for that domain to the writable active council; otherwise preserve and disclose a session-level council addendum. An initial seat count governs council creation, not later additions needed for new concerns.

Resume with a new snapshot and a full `$review-with-council` round for all active members. Keep the exit criterion private to the main thread.

## Invariants

- One persistent contractor owns edits; `$review-with-council` supplies one fresh, independent review per active member per round.
- Every score in a round refers to the same immutable artifact version and amended user brief.
- Reuse the same council across rounds unless a new user concern requires broader coverage.
- Distinguish *goal reached*, *budget exhausted*, and *blocked by environment or dependencies*.
