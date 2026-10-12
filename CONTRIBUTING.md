# Contributing to dragoman

Thanks for helping. dragoman is a small project, so every bug report, translation fix and pull request makes a real difference.

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a bug.** Open an issue with your browser and its version, the page where it happened (if it's public), what you expected and what you saw. A screenshot or screen recording helps a lot.
- **Fix a translation.** The interface ships in 85 languages, and all but English are machine-translated. If you speak one of them, corrections are very welcome. See [Interface translations](#interface-translations).
- **Suggest an idea.** Open an issue that describes the problem you want solved, not only the solution.
- **Send code.** Small fixes can go straight to a pull request. For new features and larger changes, open an issue first so we can agree on the approach before you put in the work.

Please don't report security problems in public issues. Contact the maintainer privately through the contact details on [@firatciftci](https://github.com/firatciftci)'s GitHub profile.

## Setting up

You need Node 24 and pnpm.

```sh
pnpm install
pnpm compile-paraglide
pnpm dev:extension
```

The [README](README.md#development) covers the other dev servers, and how to build and load the extension in Chromium browsers, Firefox and Safari.

## Making a change

The repository is a pnpm workspace with three packages: `extension/`, `site/` and `brand/`. The README describes what each one holds.

A few conventions keep the code consistent:

- **Match the code around you.** Follow the naming, structure and idioms already in the file you're editing.
- **Keep it lean.** Prefer the simplest change that works. Don't add abstractions or helpers for logic used in only one or two places, and don't leave dead code behind.
- **Use Svelte 5 with runes.** Use `$state`, `$derived`, `$effect` and `$props`, and type props inline where they're destructured.
- **Write strict TypeScript.** Don't use `any` (reach for `unknown` if you must), and prefer `Array<T>` over `T[]`.
- **Don't add comments for what the code says.** The codebase has almost none, and relies on clear names instead. Comment only what a careful reader couldn't work out alone.
- **Write in American English.** This applies to code, comments and interface copy (color, center, canceled, -ize).
- **Ask before adding a dependency.** Raise it in the issue or pull request first.
- **Keep versions in the catalog.** Every dependency's version range lives once in the `catalog` of `pnpm-workspace.yaml`, and each `package.json` refers to it as `catalog:`. `pnpm add <package>` (or `pnpm add -D <package>`) inside a package adds both for you, and pnpm refuses a version the catalog doesn't allow.

### Interface strings

All interface text lives in `messages/`, one file per locale, compiled by Paraglide. English (`messages/en.json`) is the source of truth.

- Add or change strings in `messages/en.json` only, then run `pnpm compile-paraglide` to regenerate the typed message functions.
- Never edit the generated `paraglide/` folders by hand.
- Leave the other locale files alone. Before a release, the maintainer fills in missing translations with `pnpm translate-messages`, which needs an API key and costs money to run.
- If you change the meaning of an existing English string, say so in your pull request, because its translations will need to be redone.

### Interface translations

To fix a translation, edit the value in `messages/<locale>.json` directly and open a pull request. Please:

- Keep every key as it is, and keep each `{placeholder}` in the text exactly as written.
- Match the tone of the English: plain, friendly and short.
- Keep one language per pull request, and mention that you're a native or fluent speaker.

### Before you open a pull request

Run these from the repository root:

```sh
pnpm check
pnpm lint:fix
pnpm format:fix
```

`pnpm lint:fix` runs knip and ESLint across every package and can take a while. Run it on its own, not alongside another lint process.

Then try your change in a real browser. Build the extension, load it unpacked, and use the parts you touched. If your change affects the page panel, popup or settings, check it in light and dark mode, and at phone width.

## Pull requests

- Keep each pull request to one focused change, and link the issue it addresses.
- Describe what changed and why. For visual changes, include screenshots or a short recording.
- Title the pull request in the [Conventional Commits](https://www.conventionalcommits.org) style: a type, an optional scope, then a short imperative summary, like `fix(popup): stop the overflow at 600px` or `feat: add a dark theme`. Pull requests are always squash-merged, so the title becomes the commit message on `main`, and `feat`, `fix` and `perf` titles become lines in the release notes. A check fails until the title starts with one of these types:

  | Type       | Use it for                                          |
  | ---------- | --------------------------------------------------- |
  | `feat`     | Something new for people using dragoman             |
  | `fix`      | A bug fix                                           |
  | `perf`     | A speedup with no change in behavior                |
  | `refactor` | Restructured code with no change in behavior        |
  | `docs`     | The README, the docs pages or other documentation   |
  | `style`    | Formatting only                                     |
  | `test`     | Tests and benchmarks                                |
  | `build`    | Dependencies, packaging and build tooling           |
  | `ci`       | GitHub Actions and Renovate                         |
  | `chore`    | Anything else, like brand images or release commits |
  | `revert`   | Undoing an earlier commit                           |

  Add `!` after the type or scope (`feat!: …`) for a change that breaks existing settings or behavior.

Releases are cut by the maintainer with `pnpm release`, so don't bump versions in your pull request.

## License

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
