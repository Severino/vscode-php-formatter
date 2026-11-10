import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';
import { OPTION_SCHEMA, buildConfigurationProperties, optionsFromGetter, resolveOptions } from '../src/core';

test('package.json settings match the option schema (run `npm run gen:config` to refresh)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
    assert.deepEqual(pkg.contributes.configuration.properties, buildConfigurationProperties());
});

test('invalid option values fall back to defaults', () => {
    const o = resolveOptions({ braces: { classes: 'weird', functions: 5 }, indent: { size: 'x' }, spaces: { afterComma: 'yes' } });
    const d = resolveOptions();
    assert.equal(o.braces.classes, d.braces.classes);
    assert.equal(o.braces.functions, d.braces.functions);
    assert.equal(o.indent.size, d.indent.size);
    assert.equal(o.spaces.afterComma, d.spaces.afterComma);
});

test('numbers are clamped and arrays filtered', () => {
    const o = resolveOptions({ indent: { size: 999 }, blankLines: { maxConsecutive: -3 }, disabledRules: ['a', 1, 'b'] });
    assert.equal(o.indent.size, OPTION_SCHEMA['indent.size'].maximum);
    assert.equal(o.blankLines.maxConsecutive, 0);
    assert.deepEqual(o.disabledRules, ['a', 'b']);
});

test('options can be built from a flat getter such as a VS Code configuration', () => {
    const o = optionsFromGetter((p) => (p === 'braces.classes' ? 'new-line' : undefined));
    assert.equal(o.braces.classes, 'new-line');
    assert.equal(o.braces.functions, 'same-line');
});

test('defaults are not shared between calls', () => {
    resolveOptions().disabledRules.push('x');
    assert.deepEqual(resolveOptions().disabledRules, []);
});
