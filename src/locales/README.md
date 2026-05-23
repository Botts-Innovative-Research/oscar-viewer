# Locale files

Translation files consumed by `src/app/contexts/LanguageContext.tsx`. Flat key/value JSON; one file per supported locale (`en`, `es`, `fr`).

## Key parity

All three files must contain the same set of keys. The `t(key)` helper falls back to returning the raw key when a translation is missing, so any drift will surface as camelCase strings in the UI.

## Translation provenance

The original locale set (≈40 keys: navigation, dashboard filters, common event-detail labels) is human-authored.

A larger batch of keys was added in the language-switcher fix that extracted previously-hardcoded UI strings (adjudication form, dashboard alarm dialog, chart titles, national stats columns, node form, selectors, common buttons/status messages). The Spanish and French translations for **the keys added in that batch** are AI-generated best-effort and should be reviewed by a fluent speaker before release. They are functional and grammatically reasonable, but domain terminology (e.g. radiation/spectroscopy terms like "isotope", "spectrum", "tamper/fault") may have a preferred in-house phrasing that differs from the literal translation chosen here.
