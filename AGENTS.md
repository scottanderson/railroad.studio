# Railroad Studio

Railroad Studio (https://railroad.studio) is a browser app for editing
Railroads Online save files. It runs entirely in the browser: saves are never
uploaded, and there is no server code.

## Organization

- `ts`: TypeScript sources, bundled by webpack into `railroad.studio/studio.js`
    - `index.ts`: entry point, opening a file, the error screen
    - `parser.ts`: `ArrayBuffer` to `Gvas`
    - `importer.ts`: `Gvas` to `Railroad`
    - `exporter.ts`: `Railroad` to `Gvas` to `Blob`
    - `Gvas.ts`, `Railroad.ts`: the data types
    - `Studio.ts`: the editor interface and its pages
    - `StudioEditor.ts`: the click-to-edit value editors
    - `RailroadMap.ts`: the SVG map; `tool-*.ts` are map tools
    - `frames.ts`, `industries.ts`: frame and industry definitions, including the
      SVG shapes drawn on the map
- `railroad.studio`: the static site (`index.html`, `style.css`, map images).
  `studio.js` is generated and not committed.

## Documentation

`README.md` covers both users and developers: console recipes, the Load → Edit →
Export pipeline, and the main types. Extend it rather than repeating it
elsewhere. `CONTRIBUTING.md` holds the pull request and AI-usage rules.

## Commands

- Install: `npm install`
- Dev server: `npm start` (http://localhost:8080/)
- Lint and format check, as CI runs it: `npm run check`
- Fix formatting: `npm run format`
- Build, which also type-checks: `npm run build`

There are no automated tests. CI only lints, builds and checks the pull request
description, so test changes by hand in the browser with a real save.

## Code style

- TypeScript is strict, with `exactOptionalPropertyTypes`. Don't use `any` or
  unnecessary type assertions.
- Follow `eslint.config.mjs`: sorted imports and object keys, `type` instead of
  `interface`, 120-column lines, 4-space indent (2 for CSS, HTML and YAML).
- Run `npm run format` instead of formatting by hand, and don't reformat code you
  aren't changing.
- Add JSDoc to new exported functions, like the existing code. Keep code comments
  short; longer explanations go in the pull request description. Don't
  reference issues in code.
- Build the interface with plain DOM APIs, Bootstrap 5.3 and Bootstrap Icons. Don't
  add frameworks or runtime dependencies without prior approval.
- Support both themes: check new styles with `[data-bs-theme='dark']` (see
  `themes.ts`).

## Save file safety

- A save that is opened and downloaded without edits must be byte-for-byte
  identical to the original file.
- Changes to `parser.ts`, `importer.ts` or `exporter.ts` must keep older save
  formats working. Formats differ by `railroad.saveGame.version`; see the
  version constants at the top of `Studio.ts`.
- Values written to a save must fit their GVAS type: `IntProperty` is a signed
  32-bit integer and `FloatProperty` is a 32-bit float.
- After changing `studio.railroad`, call `studio.setMapModified()` so the
  Download button and leave-page warning update. Pass `true` if splines changed.
- Never commit save files.

## Git and pull requests

- The default branch is `mainline`. Branch from it. Every push to `mainline`
  deploys to production.
- Keep each pull request to one feature or fix; pull requests are squashed when
  merged.
- Write commit subjects as short imperative sentences, such as
  `Fix frame type filter for aliased types`.
- Don't update dependencies or `package-lock.json` unless that is the task.
- Fill in `.github/pull_request_template.md`, including the generative AI
  section and what was not tested.
- Don't add AI session links, `Claude-Session:` trailers or "Generated with"
  footers to commit messages or pull request descriptions. CI rejects pull
  requests that link to AI sessions.
- End each commit message with a `Co-Authored-By:` line naming the AI model
  that wrote it, such as
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Name the model,
  not just `Claude` or `Claude Code`.
- Follow the rules in `CONTRIBUTING.md`. Don't open issues or pull requests, or
  post comments, unless the person you are working with asks you to after
  reviewing the content.
