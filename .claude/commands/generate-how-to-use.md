Read the clipboard contents using `powershell -command "Get-Clipboard"`, then generate a "How to use" guide for the design system component found in that JSON.

## Steps

1. **Read clipboard** — Run `powershell -command "Get-Clipboard"` and parse the JSON. Extract:
   - `component` — component name (e.g. "button", "dropdown")
   - `props` — array of props with `designName`, `codeName`, `values`, `category`

   Also extract `userContext` if present — this is a free-form note from the designer describing specific cases that must be covered (e.g. "show disabled with tooltip, describe behavior inside a form"). If present, treat it as a mandatory requirement for what to include.

2. **Research usage patterns** — Search these design systems for how they document the component:
   - Carbon IBM (carbondesignsystem.com)
   - Gravity UI (gravity-ui.com)
   - Radix UI (radix-ui.com)
   - Material UI (mui.com)
   - Ant Design (ant.design)
   - Atlassian Design System (atlassian.design)
   - Evergreen (segment.com/docs/evergreen or evergreen.segment.com)
   - Orbit by Kiwi.com (orbit.kiwi)
   - Контур.Гайды (guides.kontur.ru)

   Look for: typical use cases, edge cases, rules, anti-patterns, best practices, accessibility notes.

3. **Generate 4–7 main sections** — Each section is a concrete usage pattern (when/why to use a specific configuration). If `userContext` was present, make sure the cases it mentions are explicitly covered as sections or ideas — do not skip them.

4. **Research edge cases and rules** — Do a targeted web search specifically for edge cases, anti-patterns, accessibility rules, and layout guidelines for this component. Search queries to run:
   - `"<component name>" design system "do not" OR "avoid" OR "don't" site:carbondesignsystem.com OR site:mui.com OR site:ant.design OR site:atlassian.design OR site:orbit.kiwi OR site:guides.kontur.ru`
   - `"<component name>" accessibility guidelines disabled tooltip aria`
   - `"<component name>" "best practices" edge cases layout rules site:atlassian.design OR site:orbit.kiwi OR site:guides.kontur.ru`

   Extract concrete rules and anti-patterns from the actual documentation found.

   **Generate 4–8 ideas** based on what you found — edge cases, corner cases, design rules, anti-patterns. Each idea must have a `title` (2–5 words) and a `description` (2–3 sentences) grounded in what the documentation says. Include an `example` if a specific prop combination is worth showing.

5. **Output JSON format — all text in Russian:**
```json
{
  "component": "<name from clipboard JSON>",
  "sections": [
    {
      "title": "Короткое название (2–4 слова)",
      "description": "2–3 предложения о том, когда и почему использовать этот паттерн.",
      "example": { "<designName from props>": "<value>" }
    }
  ],
  "ideas": [
    {
      "title": "Короткое название (2–5 слов)",
      "description": "2–3 предложения — правило, антипаттерн, кейс или совет.",
      "example": { "<designName from props>": "<value>" }
    }
  ]
}
```

For `example`: use the exact `designName` values from the props array in the clipboard JSON. Choose the most visually meaningful variant. Use only props that exist in the clipboard JSON. `example` is optional — omit it if no specific prop combination applies.

No `source` field. All text (titles, descriptions) must be in Russian.

6. **Write result to clipboard:**
- First, determine the project root by running: `git rev-parse --show-toplevel`
- Write the JSON to `<project-root>/_tmp_how_to_use.json` using the Write tool (UTF-8)
- Then copy to clipboard: `powershell -command "[System.IO.File]::ReadAllText('<project-root>/_tmp_how_to_use.json', [System.Text.Encoding]::UTF8) | Set-Clipboard; Write-Host 'OK'"`

Replace `<project-root>` with the actual path returned by git.

After writing, confirm to the user: "JSON скопирован в буфер — нажми «Import How to use» в плагине".
