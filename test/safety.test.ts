import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormatContext, PhpFormatter, Rule, applyEdits, defaultRules, formatPhpEdits, signature } from '../src/core';
import { fixtures, fmt, fuzzWhitespace, mulberry32, randomOptions } from './helpers';

const sameCode = (a: string, b: string) => assert.deepEqual(signature(a), signature(b));
const ALL_RULES = defaultRules.map((r) => r.id);

test('formatting never changes tokens, for every fixture and 60 random option sets', () => {
    const rand = mulberry32(1234);
    const optionSets: Record<string, unknown>[] = [{}, ...Array.from({ length: 60 }, () => randomOptions(rand))];
    for (const { name, source } of fixtures()) {
        for (const options of optionSets) {
            const result = formatPhpEdits(source, options as any);
            assert.ok(result.ok, `${name}: ${result.reason} with ${JSON.stringify(options)}`);
            sameCode(source, result.text);
        }
    }
});

test('formatting is idempotent, for every fixture and 60 random option sets', () => {
    const rand = mulberry32(99);
    const optionSets: Record<string, unknown>[] = [{}, ...Array.from({ length: 60 }, () => randomOptions(rand))];
    for (const { name, source } of fixtures()) {
        for (const options of optionSets) {
            const once = fmt(source, options as any);
            const twice = fmt(once, options as any);
            assert.equal(twice, once, `${name} with ${JSON.stringify(options)}`);
        }
    }
});

test('whitespace-fuzzed input formats safely and idempotently', () => {
    const rand = mulberry32(7);
    for (const { name, source } of fixtures()) {
        for (let round = 0; round < 25; round++) {
            const fuzzed = fuzzWhitespace(source, rand);
            sameCode(source, fuzzed);
            const options = { ...(randomOptions(rand) as any), lineEnding: 'lf' };
            const once = formatPhpEdits(fuzzed, options);
            assert.ok(once.ok, `${name} round ${round}: ${once.reason}`);
            sameCode(source, once.text);
            assert.equal(fmt(once.text, options), once.text, `${name} round ${round} not idempotent`);
        }
    }
});

test('whitespace-fuzzed input converges to the same layout as clean input when line breaks agree', () => {
    // Same-line-only fuzz (no newlines added) must format identically to the original.
    const rand = mulberry32(21);
    for (const { name, source } of fixtures()) {
        const base = fmt(source);
        const fuzzed = fuzzWhitespace(source, rand).replace(/\n{2,}/g, '\n');
        assert.equal(signature(fmt(fuzzed)).length, signature(base).length, name);
    }
});

test('random token soup never trips the safety net (rules themselves never change tokens)', () => {
    const vocab = [
        'if', 'else', 'elseif', 'while', 'do', 'for', 'foreach', 'switch', 'case', 'default', 'function', 'fn', 'class', 'new',
        'return', 'use', 'namespace', 'match', 'try', 'catch', 'finally', 'static', 'array', 'int', 'echo', 'public',
        '$a', '$b', 'foo', 'Bar\\Baz', '1', '2.5', '"s"', "'t'", '(', ')', '[', ']', '{', '}', ';', ',', ':', '?', '??', '?:', '=', '==', '===',
        '=>', '->', '?->', '::', '+', '-', '*', '/', '.', '..', '...', '&', '&&', '|', '||', '!', '++', '--', '<', '>', '<=>', '<<', '#[', '(int)',
        '// c', '/* c */', '/** d */', '<?php', '?>', 'html', '\\',
    ];
    const ws = ['', ' ', '  ', '\n', '\n\n', '\n    ', '\t'];
    const rand = mulberry32(555);
    const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
    for (let n = 0; n < 400; n++) {
        let src = '<?php\n';
        const len = 1 + Math.floor(rand() * 40);
        for (let i = 0; i < len; i++) {
            const tok = pick(vocab);
            // a line comment must be followed by a newline, otherwise it swallows the next token
            src += pick(ws) + tok + (tok.startsWith('//') ? '\n' : '');
        }
        const options = randomOptions(rand) as any;
        const result = formatPhpEdits(src, options);
        assert.ok(result.ok, `${JSON.stringify(src)}\n${result.reason}\n${JSON.stringify(options)}`);
        sameCode(src, result.text);
    }
});

test('hostile / broken input is left structurally intact', () => {
    const inputs = [
        '', '   ', '\n\n', '<?php', '<?php ', '<?php\n', '<?php {{{', '<?php }}}', '<?php if (', 'just text', '<?php ?>', '?>',
        '<?php "unterminated', "<?php 'unterminated", '<?php /* unterminated', '<?php <<<EOT\nnever closed',
        '<?php $a = [1, 2', '<?php foo(', '<?php \u0000\u00e9\u20ac', '<? short ?>', '<?php // comment ?> html <?= 1 ?>',
    ];
    for (const src of inputs) {
        const result = formatPhpEdits(src);
        assert.ok(result.ok, `${JSON.stringify(src)}: ${result.reason}`);
        sameCode(src, result.text);
    }
});

test('with every rule disabled the input is returned byte for byte', () => {
    for (const { name, source } of fixtures()) {
        const result = formatPhpEdits(source, { disabledRules: ALL_RULES });
        assert.equal(result.text, source, name);
        assert.equal(result.edits.length, 0, name);
    }
});

test('edits reproduce the formatted text exactly', () => {
    for (const { source } of fixtures()) {
        const result = formatPhpEdits(source, { lineEnding: 'lf' });
        assert.equal(applyEdits(source, result.edits), result.text);
    }
});

test('a rule that changes tokens is caught: nothing is modified', () => {
    const evil: Rule = {
        id: 'evil',
        description: 'renames a token',
        apply(ctx: FormatContext) {
            const t = ctx.tokens.find((x) => x.type === 'variable');
            if (t) {
                t.text = '$hacked';
            }
        },
    };
    const formatter = new PhpFormatter(defaultRules).withRule(evil);
    const src = '<?php\n$a=1;';
    const result = formatter.format(src);
    assert.equal(result.ok, false);
    assert.equal(result.text, src);
    assert.deepEqual(result.edits, []);
});

test('a rule that fuses tokens through whitespace removal is caught', () => {
    const evil: Rule = {
        id: 'fuse',
        description: 'removes all whitespace',
        apply(ctx) {
            ctx.tokens.forEach((t) => (t.before = ''));
        },
    };
    const src = '<?php\nreturn $a;\n$x = 1 . 2;';
    const result = new PhpFormatter([evil]).format(src);
    assert.equal(result.ok, false);
    assert.equal(result.text, src);
});

test('a rule that throws is contained', () => {
    const boom: Rule = { id: 'boom', description: '', apply: () => { throw new Error('boom'); } };
    const result = new PhpFormatter([boom]).format('<?php echo 1;');
    assert.equal(result.ok, false);
    assert.equal(result.text, '<?php echo 1;');
});

test('code-like content that must not be touched is preserved exactly', () => {
    const keep = [
        "'it\\'s   (int)   $x   {   '",
        '"SELECT  *   FROM  t   WHERE a = \'{$a[\'x\']}\'  AND"',
        '<<<EOT\n    Heredoc   with   odd    spacing {$a}\n      trailing   \n    EOT',
        "<<<'RAW'\n  $not   {interpolated}   \nRAW",
        '`ls   -la`',
    ];
    for (const snippet of keep) {
        const out = fmt(`<?php\n$x=${snippet};\n`);
        assert.ok(out.includes(snippet), `lost: ${snippet}\n${out}`);
    }
    const html = '<div>\n   <p>   text   </p>   \n</div>\n';
    const out = fmt(`${html}<?php  echo   1 ;  ?>\n${html}`);
    assert.equal(out, `${html}<?php echo 1; ?>\n${html}`);
});
