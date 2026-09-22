# kotoba — CONTEXT (glossary only)

- **Entry**: kind `word | phrase` where `phrase` covers multi-word fragments and full sentences. `surface, reading, meaning, jlpt[N5-N1|unknown], frequencyRank, pitch, mastery`.
- **Example**: `entryId, jp, reading, en, unknownCount, source[template|bundled|llm]`. i+1 lite: lowest unknownCount wins.
- **Mastery**: `unknown | learning | known`, set by self-grade only (`again|hard|known`).
- **Favorite (★ useful)**: orthogonal flag `isFavorite`, floats to top of due queue, has `★ only` review scope.
- **Memo**: `isFavorite && mastery != known && !suspended && !blacklisted` view, ordered `dueAt → frequencyRank`. Table mode in Library; enter by manual ★ only, exit by unstar or grade `known` (flag kept).
- **Suspended / Blacklisted**: excluded from review, kept in library.
- **Dict-compact**: read-only reference snapshot (JMDict-Extended eng-common shape). Never edited by user; enriches paste/CSV.
