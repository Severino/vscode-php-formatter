import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lex } from '../src/core/lexer';
import { fixtures } from './helpers';

const join = (src: string) => {
    const r = lex(src);
    return r.tokens.map((t) => t.before + t.text).join('') + r.trailing;
};
const texts = (src: string) => lex(src).tokens.map((t) => `${t.type}:${t.text}`);

test('lexing is lossless for every fixture', () => {
    for (const { name, source } of fixtures()) {
        assert.equal(join(source), source, name);
    }
});

test('lexing is lossless for hostile input', () => {
    for (const src of ['', ' ', '<?php', '<?php "x', "<?php 'x", '<?php /*', '<?php <<<A\nx', '?>', '}{', '<?php `', '\u0000\u00e9', '<?php $', '<?php \\']) {
        assert.equal(join(src), src, JSON.stringify(src));
    }
});

test('strings, interpolation and heredocs are single opaque tokens', () => {
    assert.deepEqual(texts(`<?php $a = "x {$b["k"]} y";`).slice(3, 4), [`string:"x {$b["k"]} y"`]);
    assert.deepEqual(texts(`<?php $a = 'it\\'s';`).slice(3, 4), [`string:'it\\'s'`]);
    const doc = lex('<?php $a = <<<EOT\n  x  { y }\n  EOT;\n$b;').tokens;
    assert.equal(doc[3].type, 'heredoc');
    assert.equal(doc[3].text, '<<<EOT\n  x  { y }\n  EOT');
    assert.equal(doc[4].text, ';');
});

test('comments, tags and inline html', () => {
    assert.deepEqual(texts('a<?php // c ?>b').map((t) => t.split(':')[0]), ['html', 'openTag', 'comment', 'closeTag', 'html']);
    assert.deepEqual(texts('<?php #[Attr] # c'), ['openTag:<?php', 'op:#[', 'name:Attr', 'op:]', 'comment:# c']);
    assert.equal(lex('<?php ?>\n<b>').tokens[1].text, '?>\n');
});

test('operators and casts', () => {
    assert.deepEqual(texts('<?php $a ??= (int)$b?->c <=> 1.5e3 ** 2;').map((t) => t.split(':').slice(1).join(':')), [
        '<?php', '$a', '??=', '(int)', '$b', '?->', 'c', '<=>', '1.5e3', '**', '2', ';',
    ]);
});
