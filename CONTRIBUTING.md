# Contributing to Railroad Studio

Thanks for your interest in improving Railroad Studio! Bug fixes, editor
improvements, new frame and industry data, and documentation are all welcome.
Please read this page before opening a pull request.

## Before you start

- Small bug fixes can go straight to a pull request.
- For new features or larger changes, open an issue first and wait until we
  agree on the approach. A proposal covering several features is fine as one
  issue, but each feature gets its own pull request that references the issue.
- Search the existing issues and pull requests before starting, in case someone
  is already working on it.

## Development setup

You need Node.js 24 and npm, the same versions CI uses.

| Command          | What it does                                                   |
| ---------------- | -------------------------------------------------------------- |
| `npm install`    | Install the build dependencies                                 |
| `npm start`      | Run the dev server on [localhost:8080](http://localhost:8080/) |
| `npm run check`  | Run Prettier and ESLint, as CI does                            |
| `npm run format` | Fix formatting and auto-fixable lint errors                    |
| `npm run build`  | Build `railroad.studio/studio.js`, including type checks       |

The [README](README.md) explains how a save is parsed, edited and exported, and
describes the main types.

## Pull request requirements

- Target the `mainline` branch. Pull requests are squashed when merged, and
  every merge to `mainline` is deployed to [railroad.studio](https://railroad.studio/)
  straight away.
- Keep each pull request to one feature or fix. Big pull requests will be closed
  unless they were agreed in an issue first.
- Leave out unrelated refactors, renames, reformatting and dependency updates.
  Dependabot handles dependencies.
- Don't add runtime dependencies or frameworks without discussing it first. The
  interface uses plain DOM code, Bootstrap 5.3 and Bootstrap Icons.
- `npm run check` and `npm run build` must pass.
- Test with a real save. Railroad Studio has no automated tests, so your testing
  is what keeps people's saves safe.
    - For any change that edits or writes save data: open a save, make the change,
      download the result, open the download in Railroad Studio again, and load it
      in Railroads Online. Say which save game version you used.
    - Changes to the parser, importer or exporter must keep older save formats
      working. Test more than one save game version if you can.
    - Opening a save and downloading it without edits must produce a file that is
      byte-for-byte identical to the original.
- Interface changes need screenshots, showing before and after when an existing
  screen changes. Check both the light and dark themes.
- Say what you did not test.
- Update the README when you change behaviour it describes.

## Generative AI usage

Using large language models (LLMs) is acceptable **if and only if** you review
the result thoroughly yourself. **By opening a pull request, you confirm that:**

- You have _personally_ reviewed all generated code and tested it, including edge
  cases. A bad export can corrupt someone's save game.
- You fully understand the pull request and can explain it.
- Interface changes fit the design of the rest of the app, or you explain why
  they should change it.
- The change does not reduce code quality or maintainability.
- You own the rights to everything you submit, or its license and attribution are
  included.

These rules also apply to work done in whole or in part with generative AI:

- Disclose AI use in the pull request description, using the checkbox in the
  template, and say which parts it was used for.
- Don't include links to AI sessions or chats, or tool-generated footers such as
  "Generated with…", in pull request descriptions or commit messages. Pull
  requests that link to AI sessions fail CI.
- AI tools must not open issues or pull requests, or post comments, by
  themselves. A human reads everything before it is posted and stands behind it.
- You may use AI to review pull requests, but only post findings you have checked
  and agree with. Don't reply to AI review comments with more AI output.
- All text is in English.
- Don't include AI-generated images, icons or map imagery. This includes the SVG
  shapes used to draw frames and industries on the map, which must match the
  game.

Instructions for AI coding agents are in [AGENTS.md](AGENTS.md).

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
