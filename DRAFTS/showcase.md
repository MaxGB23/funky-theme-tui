# OpenCode Theme Showcase — exercises all 50 keys

Each section names the slot it paints. Open this file in OpenCode with your
prototype theme active and walk it top to bottom.

## markdownHeading (h1 above, h2/h3 here)

### Level 3 heading

Body copy renders in `markdownText`. Pick a theme and read this paragraph:
funky surfaces, honest contrast, no silent greys.

A link exercises two slots — label paints `markdownLink`, URL paints `markdownLinkText`:
[label paints markdownLink](https://example.com).

An image exercises two more — alt text paints `markdownImage`, src paints `markdownImageText`:
![alt text paints markdownImage](https://example.com/shot.png).

- Unordered item paints `markdownListItem`
- Second item keeps the same bullet token

1. Ordered item paints `markdownListEnumeration`
2. Second numbered row, same token

> A block quote paints `markdownBlockQuote`, easy to miss when it matches body.

Inline `code()` paints `markdownCode`. The fenced block below paints
`markdownCodeBlock` as its base, and the tokens inside follow the `syntax*`
slots (see `opencode-showcase.ts` for the full syntax battery).

*Emphasis paints `markdownEmph`*, **strong paints `markdownStrong`**.

---

The rule above paints `markdownHorizontalRule`.

## Chrome slots (no demo content paints these — look here live)

| Slot                                                | Where to look                                          |
| --------------------------------------------------- | ------------------------------------------------------ |
| `background`                                        | App canvas behind everything                           |
| `backgroundPanel`                                   | Side panels and cards                                  |
| `backgroundElement`                                 | Elevated rows: active tab, hovered list row            |
| `border` / `borderSubtle`                           | Panel frames vs faint dividers                         |
| `borderActive`                                      | Focused panel frame                                    |
| `accent`                                            | Active highlights: focused accents, selected counts    |
| `text` / `textMuted`                                | Body copy vs secondary labels                          |
| `primary` / `secondary`                             | Primary and secondary buttons / prompts                |
| `success` / `warning` / `error` / `info`            | Status lines, added/removed counts, notices            |
| `diffAdded` / `diffRemoved`                         | Added / removed line text in a diff view               |
| `diffAddedBg` / `diffRemovedBg`                     | Added / removed line backgrounds                       |
| `diffAddedLineNumberBg` / `diffRemovedLineNumberBg` | Gutter behind added / removed line numbers             |
| `diffLineNumber`                                    | Gutter numbers on context lines                        |
| `diffContext` / `diffContextBg`                     | Context line text and its background                   |
| `diffHunkHeader`                                    | `@@ -12,7 +12,9 @@` header rows                        |
| `diffHighlightAdded` / `diffHighlightRemoved`       | Changed word inside an added / removed line            |

Diff recipe: edit `opencode-showcase.ts` (change a string, add a line,
remove a line), then open the diff view. All twelve `diff*` slots appear.

## Syntax slots (exercised by `opencode-showcase.ts`)

`syntaxComment`, `syntaxKeyword`, `syntaxFunction`, `syntaxVariable`, `syntaxString`,
`syntaxNumber`, `syntaxType`, `syntaxOperator`, `syntaxPunctuation`.
