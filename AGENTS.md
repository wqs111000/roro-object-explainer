# Working on this repository

Read `skills/roro-object-explainer/SKILL.md` for explainer production. This is a
portable distribution; do not add private Studio paths, character registries,
credentials, voice recordings or service dependencies.

Preserve separate states for technical checks, visual review, user listening,
approval and publication. Test fixtures must never be presented as real visual
or listening approval. Write generated work into ignored `drafts/` revisions.

After changing tools, run `npm test`. After changing the player, rebuild a demo
with `npm run demo` and check the real browser controls, view changes, seek and
number visibility. Keep local preview servers bound to loopback.

Use Apache-2.0 for code/documentation changes. Respect the rights of user-provided
references and media; no content is authorized for publication by this file.
