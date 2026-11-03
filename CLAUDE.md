@AGENTS.md

# Project records (keep them current)

`docs/القرارات.md` (decision log) and `docs/عن-المعرض.md` (showroom and project facts) are the reference for this project, and they are synced into the owner's Claude project. Keep them true:

- When the user makes a decision (what Sadeem says or does, showroom details, UI, data, model, deployment, workflow), add a row to the matching section of `docs/القرارات.md` with the date, the decision, the reason and the PR, in the same commit or PR that carries it out. Update "آخر تحديث".
- When a new decision replaces an old one, move the old row to «قرارات انلغت» and say what replaced it.
- When showroom details, the stack, the deployment or the open items change, update `docs/عن-المعرض.md` too.
- Decisions the user pastes from a claude.ai conversation get added the same way.
- Write both files in Iraqi Arabic, like the rest of `docs/`. Never write secrets or key values in them.
