# DHC PHP Converter

A configurable, **non-destructive** PHP formatter for VS Code.

Every rule only changes whitespace. After formatting, the result is compared token by token with the
original; if anything but whitespace (or comment indentation) differs, the format is aborted and the file is left untouched.

## Features

- Brace placement per construct (`classes`, `functions`, `closures`, `controlStructures`, `anonymousClasses`): `new-line` / `same-line`
- `else` / `elseif` / `catch` / `finally` / `do … while` placement
- Spaces: after control keywords, before call / declaration / closure parentheses, within parentheses / brackets / braces,
  around every operator group, commas, semicolons, casts, `!`, ternaries, return-type colons
- Indentation: spaces / tabs / follow-editor, switch-case indentation, continuation-line levels, doc-block alignment
- Blank lines: maximum, removal at block edges, after `namespace` and `use` imports, and an enforced (configurable, disableable) number of blank lines between functions / methods including their doc blocks
- Line endings (`lf`, `crlf`, `auto`), final newline (default: none, see `finalNewline`), trailing whitespace in comments
- Document and range formatting; inline HTML, strings and heredocs are never touched
- `// @formatter:off` … `// @formatter:on` protects a region
- `dhcConverter.php.disabledRules` switches off whole rules by id

All settings live under `dhcConverter.php.*` (see the Settings UI). Enable it with:

```json
"[php]": { "editor.defaultFormatter": "local.dhc-php-converter" }
```

## Known limitations

- Alternative syntax (`if: … endif;`) bodies are not indented.
- Colons of named arguments are left as written.
- No rule may add, remove or reorder tokens (no `use` sorting, no added braces) — by design.

## Extending

**Add an option**
1. Add an entry to `OPTION_SCHEMA` in `src/core/schema.ts` and the field to `FormatOptions` in `src/core/options.ts`.
2. Run `npm run gen:config` – this regenerates the settings in `package.json`.
3. Read `ctx.options` in a rule.

**Add a rule**
1. Create `src/core/rules/my-rule.ts` exporting a `Rule` (`id`, `description`, `apply(ctx)`).
2. Change tokens only via `ctx.setGap`, `ctx.setBefore`, `ctx.setNewlines`, `ctx.setText` (these respect `@formatter:off` and never fuse tokens).
3. Register it in `src/core/rules/index.ts`, or at runtime with `new PhpFormatter(defaultRules).withRule(rule)`.

The safety net and fuzz tests in `test/safety.test.ts` automatically cover new rules.

## Development

```
npm install
npm test          # compile + run all tests
```

Press `F5` to launch an Extension Development Host.
