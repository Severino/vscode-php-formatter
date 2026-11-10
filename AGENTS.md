# AI instructions for this repository

VS Code extension **DHC PHP Converter** (`dhc-php-converter`): a configurable, non-destructive PHP formatter.
Settings prefix: `dhcConverter.php.*`. Formatter id: `local.dhc-php-converter`.

## Conventions

- **Always indent code files with 4 spaces** (TS, JS, JSON, etc.). Enforced by `.editorconfig`.
  `scripts/generate-config.js` writes `package.json` with 4 spaces too.
- TypeScript strict, CommonJS output to `out/`. Tests use `node:test` + `node:assert/strict`.
- Comment only code that needs clarification.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | compile, then `node --test "out/test/*.test.js"` (the glob is required on Node 24) |
| `npm run compile` / `npm run watch` | `tsc -p .` |
| `npm run gen:config` | regenerate `contributes.configuration.properties` in `package.json` from the schema |

Run `npm run gen:config` after any change to `src/core/schema.ts`; `test/config.test.ts` fails if `package.json` is out of date.
Press F5 to debug (`.vscode/launch.json`). To use it in the everyday VS Code, junction the repo into `~/.vscode/extensions/local.dhc-php-converter-0.1.0`, run `npm run watch`, and reload the window after code changes.

## Architecture (core is independent of VS Code)

- `src/core/lexer.ts`: lossless lexer. Each token has `before` (preceding whitespace), `text`, and read-only `origBefore`/`origText`.
  Joining all `before + text` plus `trailing` reproduces the source exactly. `canJoin` prevents fusing tokens (`1 . 2` -> `1.2`).
- `src/core/context.ts`: `FormatContext` with bracket matching (`match`, `parent`), `{` classification (`blocks`: class / function / closure / control / match / ...),
  helpers (`isOp`, `isWord`, `hasNewline`) and the mutators `setBefore`, `setGap`, `setNewlines`, `setText`, which respect `@formatter:off/on` frozen regions.
- `src/core/rules/*.ts`: one rule per file, ordered in `rules/index.ts` (`defaultRules`):
  braces, control-keyword-placement, keyword-spacing, parenthesis-spacing, punctuation-spacing, operator-spacing,
  whitespace-normalization, blank-lines, function-blank-lines, comment-cleanup, indentation, final-newline.
  Order matters: structural line breaks first, then horizontal spacing, then blank lines, then indentation.
- `src/core/formatter.ts`: `PhpFormatter` (`withRule` for extension), `formatPhp`, `formatPhpEdits`, `applyEdits`.
  Runs the rules, then the **safety guard**: `verify.ts` compares the token `signature` of source and result.
  On mismatch or an exception, it returns `ok: false` with no edits.
- `src/core/schema.ts`: **single source of truth** for options (defaults, validation, package.json settings).
  `options.ts` holds the `FormatOptions` type, `resolveOptions` and `optionsFromGetter`.
- `src/extension.ts`: document and range formatting providers. Range formatting filters edits by `anchor`.

## Invariants (never break)

1. Rules change **whitespace only** (plus comment indentation). They must never add, remove, reorder or retext tokens.
2. Formatting is idempotent: `format(format(x)) === format(x)` for any options.
3. Opaque content (strings, heredocs, inline HTML) is never touched.
4. Spacing that would fuse two tokens must be kept (`setGap` handles this).

## How to extend

- **New option**: add it to `OPTION_SCHEMA` in `schema.ts` and to `FormatOptions` in `options.ts`, run `npm run gen:config`, use it via `ctx.options` in a rule, and add a test in `test/behavior.test.ts`.
- **New rule**: create `src/core/rules/<id>.ts` exporting a `Rule` (`id`, `description`, `apply(ctx)`), register it in `rules/index.ts` at the right position, and add tests.
  Users can disable it via `dhcConverter.php.disabledRules`.

## Tests (`test/`)

- `helpers.ts`: `fixtures()`, `fmt(source, opts)`, `fmtBody(body, opts)` (wraps the body in `<?php`), a seeded RNG, `randomOptions`, `fuzzWhitespace`.
- `behavior.test.ts`: expected output per option.
- `safety.test.ts`: signature preserved and idempotence across all fixtures, 60 random option sets, whitespace fuzzing and token soup, hostile input, and a guard test with an evil rule.
- `config.test.ts`: schema vs `package.json`, validation fallback.
- `lexer.test.ts`: lossless round-trip.
- `fixtures/*.php`: `psr12.php` must be a fixed point of default formatting, `messy.php`, `template.php` (inline HTML and alternative syntax) and `modern.php` (enum, match, attributes, heredoc, `@formatter:off`).

When a test fails, fix the formatter if it is a genuine bug. Do not weaken the safety tests.

## Known limitations

- Alternative-syntax bodies (`if: ... endif;`) are not indented.
- Named-argument colons are left as written.
- No token-changing rules (use sorting, adding braces) by design.
- Default brace style: all opening braces on the same line (`braces.classes` / `braces.functions` can be set to `new-line` for PSR-12 style).
