# Reviewing contributions

Read before reviewing or committing someone else's work.

- Diff file by file against current `main` (contributors often work from an
  old copy): look for rolled-back features, coordinate collisions,
  unverified IDs/constants, missing headers, spaces instead of TABs.
- IceGlaive writes his code with Gemini — check it especially carefully.
- Lil Art opens PRs as `LilArt420` (#115, #118, #120); he used to send
  zips. A contributor without GitHub who sends a zip: commit their files
  as they are first (message mentions the author), then our fixes in a
  separate commit, so the history shows who did what.
- Lil Art's cash-shop-extended keeps all items in one hand-ordered tab on
  purpose (our tab split, LilArt420/cashshopmod#5, was closed); don't
  propose reordering it unless he asks.
