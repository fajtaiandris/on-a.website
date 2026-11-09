---
name: create-council
description: Create a council.md containing a purpose-built panel of independent reviewers for a work item. Use when asked to create, design, or assemble a review council from a problem statement, draft, council direction, or important evaluation aspects; also use when review-with-council requests a council because none was supplied. Accept an optional number of council seats and default to six. Produce the council definition, not reviews or iterations.
---

# Create Council

Create a practical, non-overlapping review panel for a work item. Each seat must represent a durable area of evaluation, not a specific edit or desired verdict. Produce a `council.md` that `review-with-council` can consume unchanged.

## 1. Interpret the brief

1. Read any available problem statement, draft/work artifact, council direction, target audience, constraints, and aspects the user considers important. Do not require all input types. Use the provided material; do not invent facts about the item.
2. Use the user-specified positive integer seat count. **Default to exactly six seats** when unspecified. Do not change an explicit seat count to fit your preferred coverage.
3. Distill the central goal and the distinct dimensions along which the work could fail. Give explicit user priorities first claim on seats. Include domain correctness, audience impact, feasibility, safety, strategy, or craft only when relevant to the item.
4. Generalize narrow examples to reusable domains: a concern about a button label suggests *terminology and comprehension*, not a reviewer devoted to that button. If there are more domains than seats, combine related concerns. If there are fewer, identify useful independent failure modes rather than splitting one concern into cosmetic duplicates.

**Done when:** the work's intent, priority concerns, and exact seat count are clear enough to select complementary perspectives.

## 2. Design the council

Create exactly one member for each seat. For each member provide:

- **Name:** a unique, short, human-readable fictional first name with a last name implying the role in a quirky way.
- **Role:** a credible reviewing perspective (for example, "Accessibility specialist" or "Operational risk reviewer"), not a second contractor.
- **Focus area:** a concrete, reusable assessment domain stating what the reviewer must scrutinize and what kinds of problems to flag. Keep it distinct from the other members' primary focus areas.

Prefer a diverse *range of professional lenses* over generic job titles. Make room for skeptical perspectives and hidden failure modes. Do not create a member whose job is to approve the artifact or steer scores toward any threshold.

**Done when:** every important concern is owned by at least one member, no two members have substantially identical responsibilities, and the roster contains exactly the requested number of seats.

## 3. Write `council.md`

Use this interoperable structure (see [council.example.md](references/council.example.md) for an example):

```markdown
# Council

## Mandate

**Work item:** <short description grounded in the brief>
**Council direction:** <what the panel should challenge or safeguard>
**Priority aspects:** <comma-separated aspects, or "Not specified">

## Members

| Name | Role | Focus area |
| --- | --- | --- |
| <unique name> | <reviewing perspective> | <specific, reusable evaluation domain> |
```

- Create one table row per seat. Keep the three headers spelled exactly `Name`, `Role`, and `Focus area` so another skill can parse the roster.
- Keep the mandate short. It supplies context, not permission to override the original user brief.
- Do **not** include an exit criterion, passing score, other council members' opinions, or instructions to coordinate reviews. The review and iteration skills handle those separately.
- Write to the path supplied by the user. Otherwise write `council.md` beside the work item when its directory is known, or in the active project workspace. Do not write into this skill's installed directory or silently overwrite a pre-existing unrelated council. If filesystem output is unavailable, return the complete Markdown content and clearly state that no file was written.

**Done when:** the generated `council.md` exists at the chosen location, or its full contents have been returned if writing is impossible.

## 4. Verify and hand off

Before returning, check:

1. The member count equals the requested count (six by default).
2. All names are unique and every row has a specific role and nonempty focus area.
3. Focus areas cover explicit priorities with minimal duplication; no member is narrowly tailored to a one-off correction.
4. The file uses the required `## Members` table and excludes scoring thresholds and exit criteria.

Return the path or document, the seat count, and a one-sentence explanation of the coverage. If invoked by `review-with-council`, return the resulting council location or contents to the orchestrator; do not run reviews or start a contractor yourself.
