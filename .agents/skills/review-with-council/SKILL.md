---
name: review-with-council
description: Run one blind, independent council review of a work item and report each member's score and requested changes. Use for a single review round or when iterate-with-council requests a review. Accept a supplied council; if none is supplied, use create-council to make one. Do not edit the work item or run an improvement loop.
---

# Review with Council

Review one identifiable version of a work item once. The main thread coordinates the council and reports its findings; reviewers independently evaluate the same snapshot. This skill does not revise the item or decide whether an iteration goal has been reached.

## Establish the review

1. Identify the work item and its exact version or snapshot, the original user brief and amendments, constraints, evaluation priorities, and any requested seat count. If the work item is still being edited, wait for a stable snapshot before dispatching reviews.
2. Resolve the council:
   - **Supplied:** Accept a readable file path at any location, attachment, accessible link, inline definition, or a reference to an existing project council. Locate and read it. If it cannot be read, report the problem; do not silently replace it.
   - **Not supplied:** Invoke `$create-council` with the brief, artifact/context, council direction, important aspects, and the user's seat count (six by default). Use the resulting `council.md` or returned Markdown. If direct skill invocation is unavailable, load and follow its installed instructions; disclose that fallback. If the skill is unavailable, report the missing dependency.
3. Read each member's **Name**, **Role**, and **Focus area** from the council's `## Members` table. Require at least one valid member. Record the council source and version so a later review can reuse the same roster.
4. Check that the runtime can create genuinely separate, isolated reviewer agents. If it cannot, report the blocked capability. Do not simulate independent reviewers in one context.

## Run one blind round

Give every reviewer the same immutable artifact snapshot and current user brief, but only that reviewer's own name, role, and focus area. Include the scoring rubric and response schema below. Do not share other members' names, reviews, scores, prior round history, or any iteration exit criterion. Reviewers have read-only access to the artifact.

Start one separate agent for each council member, in parallel where supported. Use fresh isolated reviewer contexts. Ask each to evaluate only from their role and focus area, cite specific weaknesses, and suggest actionable improvements. They should not manufacture criticism when the work is strong.

Each reviewer returns:

```yaml
member: <their name>
score: <integer 1-10>
dislikes:
  - issue: <specific weakness, or none>
    evidence: <where/how it appears>
    change: <actionable improvement>
summary: <1-3 sentences on the most important judgment>
```

Apply the same calibration to all reviewers: **1–3** = serious failure; **4–6** = significant weaknesses; **7–8** = solid but materially improvable; **9** = excellent with at most minor issues; **10** = exceptional, with no meaningful issues found. Scores reflect the artifact, not a desired outcome. Obtain a valid, independent review from every active member; retry missing or invalid reviews instead of inventing scores.

## Report the review

Return the artifact/version identifier and council source, followed by a table:

| Council member | Role / focus | Score /10 | What they dislike | Requested change |
| --- | --- | ---: | --- | --- |
| ... | ... | ... | ... | ... |

Summarize shared issues and disagreements without hiding minority concerns or averaging away a low score. Return the complete reviews to an invoking iteration skill. Stop after this round; do not edit the artifact, dispatch a contractor, or apply an iteration exit rule.
