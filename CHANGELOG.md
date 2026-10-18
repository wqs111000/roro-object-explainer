# Changelog

## 0.1.1 — 2026-10-19

- Use an explicit test entrypoint so `npm test` works on Windows with Node 20.
- Preserve the first public release tag; publish this portability fix separately.

## 0.1.0 — 2026-10-19

- Extract the single-object explainer workflow from Roro Story Studio.
- Make character references optional and remove private runtime assumptions.
- Provide static and paired A5/A4 rendering with hash-bound technical evidence.
- Add review freshness validation and portable PCM WAV assembly.
- Add an offline player with synchronized views/numbering and embedded audio
  that supports seeking on static servers without HTTP Range.
- Include installation instructions, synthetic demo, tests and Windows/Linux CI.

This is the first standalone release. Image generation and speech synthesis use
the creator's own tools; Studio publishing, mechanism animation and video export
remain optional integrations outside this package.
