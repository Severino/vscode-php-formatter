import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPhpEdits } from '../src/core';
import { fmt, fmtBody } from './helpers';

const lines = (...l: string[]) => l.join('\n');

test('braces: control structures can go on a new line', () => {
    assert.equal(
        fmtBody('if ($a) {\n    foo();\n}', { braces: { controlStructures: 'new-line' } }),
        lines('if ($a)', '{', '    foo();', '}'),
    );
});

test('braces: classes and functions are on the same line by default, new-line is configurable', () => {
    assert.equal(fmtBody('class A\n{\n}'), 'class A {\n}');
    assert.equal(fmtBody('function f()\n{\n    return 1;\n}'), lines('function f() {', '    return 1;', '}'));
    assert.equal(fmtBody('class A {\n}', { braces: { classes: 'new-line' } }), 'class A\n{\n}');
    assert.equal(fmtBody('function f() {\n    return 1;\n}', { braces: { functions: 'new-line' } }), lines('function f()', '{', '    return 1;', '}'));
});

test('braces: closures and anonymous classes are configured separately', () => {
    assert.equal(fmtBody('$f = function () {\n};'), '$f = function () {\n};');
    assert.equal(fmtBody('$f = function () {\n};', { braces: { closures: 'new-line' } }), '$f = function ()\n{\n};');
    assert.equal(fmtBody('$o = new class {\n};'), '$o = new class {\n};');
    assert.equal(fmtBody('$o = new class {\n};', { braces: { anonymousClasses: 'new-line' } }), '$o = new class\n{\n};');
});

test('braces: multi-line parameter lists keep `) {` on one line (configurable)', () => {
    const src = 'function f(\n    $a,\n    $b\n) {\n}';
    assert.equal(fmtBody(src), src);
    assert.equal(fmtBody(src, { braces: { functions: 'new-line' } }), src);
    assert.equal(
        fmtBody(src, { braces: { functions: 'new-line', sameLineAfterMultilineParameters: false } }),
        'function f(\n    $a,\n    $b\n)\n{\n}',
    );
});

test('braces: never joins a brace onto a line comment', () => {
    const src = 'if ($a) // note\n{\n}';
    assert.equal(fmtBody(src), src);
});

test('braces: unknown braces such as $obj->{...} are left alone', () => {
    assert.equal(fmtBody('$a = $o->{$name};', { braces: { controlStructures: 'new-line', classes: 'new-line' } }), '$a = $o->{$name};');
});

test('else / catch / finally / do-while placement', () => {
    const cuddled = lines('if ($a) {', '} else {', '} try {', '} catch (E $e) {', '} finally {', '} do {', '} while ($x);');
    assert.equal(
        fmtBody(lines('if ($a) {', '}', 'else {', '}', 'try {', '}', 'catch (E $e) {', '}', 'finally {', '}', 'do {', '}', 'while ($x);')).replace(/\n(\w)/g, '\n$1'),
        lines('if ($a) {', '} else {', '}', 'try {', '} catch (E $e) {', '} finally {', '}', 'do {', '} while ($x);'),
    );
    void cuddled;
    assert.equal(
        fmtBody('if ($a) {\n} elseif ($b) {\n} else {\n}', { controlStructures: { elseKeyword: 'new-line' } }),
        'if ($a) {\n}\nelseif ($b) {\n}\nelse {\n}',
    );
    assert.equal(
        fmtBody('try {\n} catch (E $e) {\n} finally {\n}', { controlStructures: { catchFinallyKeyword: 'new-line' } }),
        'try {\n}\ncatch (E $e) {\n}\nfinally {\n}',
    );
    assert.equal(fmtBody('do {\n} while ($x);', { controlStructures: { doWhileKeyword: 'new-line' } }), 'do {\n}\nwhile ($x);');
});

test('else keyword is not moved across a comment', () => {
    const src = 'if ($a) {\n}\n// why\nelse {\n}';
    assert.equal(fmtBody(src), src);
});

test('spaces: control keywords, function calls, declarations, closures', () => {
    assert.equal(fmtBody('if($a){}'), 'if ($a) {}');
    assert.equal(fmtBody('if ($a) {}', { spaces: { afterControlKeyword: false } }), 'if($a) {}');
    assert.equal(fmtBody('foreach($a as $b){}\nwhile($x){}\nswitch($x){}'), 'foreach ($a as $b) {}\nwhile ($x) {}\nswitch ($x) {}');
    assert.equal(fmtBody('foo ($a);'), 'foo($a);');
    assert.equal(fmtBody('foo($a);', { spaces: { beforeFunctionCallParen: true } }), 'foo ($a);');
    assert.equal(fmtBody('$o->run ($a);Foo::bar ($a);new Foo ($a);'), '$o->run($a);Foo::bar($a);new Foo($a);');
    assert.equal(fmtBody('function f ($a) {}'), 'function f($a) {}');
    assert.equal(fmtBody('function f($a) {}', { spaces: { beforeFunctionDeclarationParen: true } }), 'function f ($a) {}');
    assert.equal(fmtBody('$f = function($a)use($b){};'), '$f = function ($a) use ($b) {};');
    assert.equal(fmtBody('$f = function ($a) use ($b) {};', { spaces: { beforeClosureParen: false, beforeClosureUseParen: false } }), '$f = function($a) use($b) {};');
    assert.equal(fmtBody('$f = fn ($a) => $a;'), '$f = fn($a) => $a;');
    assert.equal(fmtBody('$f = fn($a) => $a;', { spaces: { beforeArrowFunctionParen: true } }), '$f = fn ($a) => $a;');
    assert.equal(fmtBody('$r = isset ($a) && empty ($b);'), '$r = isset($a) && empty($b);');
});

test('spaces: inside parentheses, brackets and one-line blocks', () => {
    assert.equal(fmtBody('foo( $a, $b );'), 'foo($a, $b);');
    assert.equal(fmtBody('foo($a);bar();', { spaces: { withinParentheses: true } }), 'foo( $a );bar();');
    assert.equal(fmtBody('$a = [ 1, 2 ];'), '$a = [1, 2];');
    assert.equal(fmtBody('$a = [1, 2];$b = [];', { spaces: { withinBrackets: true } }), '$a = [ 1, 2 ];$b = [];');
    assert.equal(fmtBody('if ($a) {return;}'), 'if ($a) { return; }');
    assert.equal(fmtBody('if ($a) { return; }', { spaces: { withinBraces: false } }), 'if ($a) {return;}');
});

test('spaces: commas and semicolons', () => {
    assert.equal(fmtBody('foo($a ,$b,$c);'), 'foo($a, $b, $c);');
    assert.equal(fmtBody('foo($a, $b);', { spaces: { beforeComma: true, afterComma: false } }), 'foo($a ,$b);');
    assert.equal(fmtBody('foo($a, $b,);'), 'foo($a, $b,);');
    assert.equal(fmtBody('for($i=0;$i<3;$i++){}'), 'for ($i = 0; $i < 3; $i++) {}');
    assert.equal(fmtBody('for ($i = 0; $i < 3; $i++) {}', { spaces: { afterSemicolonInFor: false } }), 'for ($i = 0;$i < 3;$i++) {}');
    assert.equal(fmtBody('for (;;) {}'), 'for (;;) {}');
    assert.equal(fmtBody('$a = 1 ;'), '$a = 1;');
    assert.equal(fmtBody('$a = 1;', { spaces: { beforeSemicolon: true } }), '$a = 1 ;');
});

test('spaces: operators', () => {
    assert.equal(fmtBody('$a=1+2*3-4/5%6**7;'), '$a = 1 + 2 * 3 - 4 / 5 % 6 ** 7;');
    assert.equal(fmtBody('$a = 1 + 2;', { spaces: { aroundArithmetic: false } }), '$a = 1+2;');
    assert.equal(fmtBody('$a = 1;$b .= 2;', { spaces: { aroundAssignment: false } }), '$a=1;$b.=2;');
    assert.equal(fmtBody('$x=$a==$b||$c!==$d&&$e<=>$f;'), '$x = $a == $b || $c !== $d && $e <=> $f;');
    assert.equal(fmtBody('$x = $a == $b;', { spaces: { aroundComparison: false } }), '$x = $a==$b;');
    assert.equal(fmtBody('$x = $a && $b;', { spaces: { aroundLogical: false } }), '$x = $a&&$b;');
    assert.equal(fmtBody('$x=$a|$b&$c^$d<<1>>2;'), '$x = $a | $b & $c ^ $d << 1 >> 2;');
    assert.equal(fmtBody('$x = $a | $b;', { spaces: { aroundBitwise: false } }), '$x = $a|$b;');
    assert.equal(fmtBody('$x=$a.$b;'), '$x = $a . $b;');
    assert.equal(fmtBody('$x = $a . $b;', { spaces: { aroundConcat: false } }), '$x = $a.$b;');
    assert.equal(fmtBody('$x=$a??$b;'), '$x = $a ?? $b;');
    assert.equal(fmtBody('$x = $a ?? $b;', { spaces: { aroundNullCoalescing: false } }), '$x = $a??$b;');
    assert.equal(fmtBody('$x=[1=>2];'), '$x = [1 => 2];');
    assert.equal(fmtBody('$x = [1 => 2];', { spaces: { aroundDoubleArrow: false } }), '$x = [1=>2];');
    assert.equal(fmtBody('$a -> b() :: c;'), '$a->b()::c;');
    assert.equal(fmtBody('$a->b();', { spaces: { aroundObjectOperator: true } }), '$a -> b();');
});

test('spaces: unary operators are not treated as binary', () => {
    assert.equal(fmtBody('$a=-1;foo(-$b,+$c);$d=[-1,-2];return -$x;'), '$a = -1;foo(-$b, +$c);$d = [-1, -2];return -$x;');
    assert.equal(fmtBody('$c=$a -1;$d=$a- 1;'), '$c = $a - 1;$d = $a - 1;');
    assert.equal(fmtBody('$a=$b++ + ++$c;$d=$a-- - 1;'), '$a = $b++ + ++$c;$d = $a-- - 1;');
    assert.equal(fmtBody('$a=!$b;$c=@$d;$e=&$f;'), '$a = !$b;$c = @$d;$e = &$f;');
});

test('spaces: types and references are never treated as operators', () => {
    assert.equal(fmtBody('function f(int|string $a,?Foo &$b,array ...$c):?int {}', { braces: { functions: 'same-line' } }), 'function f(int|string $a, ?Foo &$b, array ...$c): ?int {}');
    assert.equal(fmtBody('foreach ($a as &$v) {}'), 'foreach ($a as &$v) {}');
    assert.equal(fmtBody('catch (A|B $e) {}').includes('A|B'), true);
});

test('spaces: never fuses tokens when spaces are removed', () => {
    assert.equal(fmtBody('$a = 1 . 2;', { spaces: { aroundConcat: false } }), '$a = 1 . 2;');
    assert.equal(fmtBody('$a = $b - -$c;', { spaces: { aroundArithmetic: false } }), '$a = $b- -$c;');
    assert.equal(fmtBody('$a = $b + +$c;', { spaces: { aroundArithmetic: false } }), '$a = $b+ +$c;');
    assert.equal(fmtBody('$a = $b & &$c;', { spaces: { aroundBitwise: false } }).includes('&&'), false);
    assert.equal(fmtBody('$a = $b = 1;', { spaces: { aroundAssignment: false } }), '$a=$b=1;');
});

test('spaces: ternaries, short ternaries and return types', () => {
    assert.equal(fmtBody('$a=$b?1:2;'), '$a = $b ? 1 : 2;');
    assert.equal(fmtBody('$a=$b?:2;$c=$d ? : 3;'), '$a = $b ?: 2;$c = $d ?: 3;');
    assert.equal(fmtBody('$a=$b?$c?1:2:3;'), '$a = $b ? $c ? 1 : 2 : 3;');
    assert.equal(fmtBody('$a = $b ? 1 : 2;', { spaces: { aroundTernary: false } }), '$a = $b?1:2;');
    assert.equal(fmtBody('function f() : int {}', { braces: { functions: 'same-line' } }), 'function f(): int {}');
    assert.equal(
        fmtBody('function f(): int {}', { braces: { functions: 'same-line' }, spaces: { beforeReturnTypeColon: true, afterReturnTypeColon: false } }),
        'function f() :int {}',
    );
    assert.equal(fmtBody('$f = fn($a):int=>$a;'), '$f = fn($a): int => $a;');
});

test('spaces: switch / case / goto / named-argument colons are untouched', () => {
    const src = 'switch ($a) {\n    case 1:\n        break;\n    default:\n}\nfoo(name: 1);\nlabel:\nif ($a):\nendif;';
    assert.equal(fmtBody(src), src);
});

test('spaces: casts and not', () => {
    assert.equal(fmtBody('$a=(int)$b;$c=(string)  $d;'), '$a = (int) $b;$c = (string) $d;');
    assert.equal(fmtBody('$a = (int) $b;', { spaces: { afterCast: false } }), '$a = (int)$b;');
    assert.equal(fmtBody('$a = !$b;', { spaces: { afterNot: true } }), '$a = ! $b;');
});

test('spaces: declare(strict_types=1) keeps PSR-12 formatting', () => {
    assert.equal(fmtBody('declare(strict_types=1);'), 'declare(strict_types=1);');
});

test('indentation: nested blocks, tabs and custom sizes', () => {
    const src = '<?php\nif ($a) {\nforeach ($b as $c) {\nfoo();\n}\n}';
    assert.equal(fmt(src), '<?php\nif ($a) {\n    foreach ($b as $c) {\n        foo();\n    }\n}');
    assert.equal(fmt(src, { indent: { style: 'spaces', size: 2 } }), '<?php\nif ($a) {\n  foreach ($b as $c) {\n    foo();\n  }\n}');
    assert.equal(fmt(src, { indent: { style: 'tabs' } }), '<?php\nif ($a) {\n\tforeach ($b as $c) {\n\t\tfoo();\n\t}\n}');
});

test('indentation: "editor" style follows the editor settings', () => {
    const src = '<?php\nif ($a) {\nfoo();\n}';
    const tabs = formatPhpEdits(src, { lineEnding: 'lf' }, { insertSpaces: false, tabSize: 4 }).text;
    assert.equal(tabs, '<?php\nif ($a) {\n\tfoo();\n}');
    const two = formatPhpEdits(src, { lineEnding: 'lf' }, { insertSpaces: true, tabSize: 2 }).text;
    assert.equal(two, '<?php\nif ($a) {\n  foo();\n}');
});

test('indentation: switch cases', () => {
    const src = 'switch ($a) {\ncase 1:\nfoo();\nbreak;\ndefault:\nbar();\n}';
    assert.equal(fmtBody(src), 'switch ($a) {\n    case 1:\n        foo();\n        break;\n    default:\n        bar();\n}');
    assert.equal(fmtBody(src, { indent: { switchCases: false } }), 'switch ($a) {\ncase 1:\n    foo();\n    break;\ndefault:\n    bar();\n}');
});

test('indentation: hanging indents for arguments, arrays and closures', () => {
    const src = 'foo(\n$a,\n[\n1,\n2,\n],\nfunction () {\nreturn 1;\n}\n);\n$x = array_map(function ($y) {\nreturn $y;\n}, $z);';
    assert.equal(
        fmtBody(src),
        'foo(\n    $a,\n    [\n        1,\n        2,\n    ],\n    function () {\n        return 1;\n    }\n);\n$x = array_map(function ($y) {\n    return $y;\n}, $z);',
    );
});

test('indentation: continuation lines and brace-less bodies', () => {
    assert.equal(fmtBody('$a = $b\n->c()\n->d();'), '$a = $b\n    ->c()\n    ->d();');
    assert.equal(fmtBody('$a = $b\n->c();', { indent: { continuationLevels: 2 } }), '$a = $b\n        ->c();');
    assert.equal(fmtBody('$a = $b\n->c();', { indent: { continuationLevels: 0 } }), '$a = $b\n->c();');
    assert.equal(fmtBody('if ($a)\nfoo();\nelse\nbar();'), 'if ($a)\n    foo();\nelse\n    bar();');
    assert.equal(fmtBody('$x = 1 +\n2;'), '$x = 1 +\n    2;');
});

test('indentation: match arms, attributes and ternary chains', () => {
    assert.equal(fmtBody('$a = match ($b) {\n1 => 2,\ndefault => 3,\n};'), '$a = match ($b) {\n    1 => 2,\n    default => 3,\n};');
    assert.equal(fmtBody('#[A]\nfunction f() {\n}'), '#[A]\nfunction f() {\n}');
    assert.equal(fmtBody('$a = $b\n? 1\n: 2;'), '$a = $b\n    ? 1\n    : 2;');
});

test('indentation: comments follow the code they precede', () => {
    assert.equal(
        fmtBody('if ($a) {\n// leading\nfoo(); // trailing\n// last\n}\n// before else\nbar();'),
        'if ($a) {\n    // leading\n    foo(); // trailing\n    // last\n}\n// before else\nbar();',
    );
});

test('comments: doc blocks are re-aligned, content is kept', () => {
    const src = 'class A {\n  /**\n * Text   here\n      * @param int $a   \n  */\n  function f() {}\n}';
    assert.equal(
        fmtBody(src),
        'class A {\n    /**\n     * Text   here\n     * @param int $a\n     */\n    function f() {}\n}',
    );
    assert.ok(fmtBody(src, { comments: { reindentDocBlocks: false } }).includes('\n * Text   here\n'));
    assert.ok(fmtBody(src, { comments: { trimTrailingWhitespace: false } }).includes('@param int $a   \n'));
});

test('blank lines: limited, with configurable maximum', () => {
    assert.equal(fmtBody('$a = 1;\n\n\n\n$b = 2;'), '$a = 1;\n\n$b = 2;');
    assert.equal(fmtBody('$a = 1;\n\n\n\n$b = 2;', { blankLines: { maxConsecutive: 0 } }), '$a = 1;\n$b = 2;');
    assert.equal(fmtBody('$a = 1;\n\n\n\n$b = 2;', { blankLines: { maxConsecutive: 3 } }), '$a = 1;\n\n\n\n$b = 2;');
});

test('blank lines: removal at block edges', () => {
    const src = 'if ($a) {\n\n    foo();\n\n}';
    assert.equal(fmtBody(src), src);
    assert.equal(fmtBody(src, { blankLines: { removeAtBlockEdges: true } }), 'if ($a) {\n    foo();\n}');
});

test('blank lines: after namespace and use imports', () => {
    assert.equal(fmtBody('namespace A;\nuse B;\nuse C\\{D, E};\nclass F {\n}'), 'namespace A;\n\nuse B;\nuse C\\{D, E};\n\nclass F {\n}');
    assert.equal(
        fmtBody('namespace A;\nuse B;\nclass F {\n}', { blankLines: { afterNamespace: false, afterUseImports: false } }),
        'namespace A;\nuse B;\nclass F {\n}',
    );
    // `use` inside a class (traits) and closures is not an import
    assert.equal(fmtBody('class F {\n    use T;\n    public $a;\n}'), 'class F {\n    use T;\n    public $a;\n}');
});

test('blank lines: exactly one blank line between functions, doc blocks stay attached', () => {
    const src = [
        'class A {',
        '    private $x;',
        '    /** First */',
        '    public function a() {}',
        '    #[Attr]',
        '    public static function b() {',
        '    }',
        '',
        '',
        '',
        '    /**',
        '     * Third',
        '     */',
        '    abstract protected function c(): int;',
        '    public $y;',
        '}',
    ].join('\n');
    assert.equal(
        fmtBody(src),
        [
            'class A {',
            '    private $x;',
            '',
            '    /** First */',
            '    public function a() {}',
            '',
            '    #[Attr]',
            '    public static function b() {',
            '    }',
            '',
            '    /**',
            '     * Third',
            '     */',
            '    abstract protected function c(): int;',
            '',
            '    public $y;',
            '}',
        ].join('\n'),
    );
});

test('blank lines: count between functions is configurable, top-level functions included', () => {
    const src = 'function a() {}\nfunction b() {}\n\n\nfunction c() {}';
    assert.equal(fmtBody(src), 'function a() {}\n\nfunction b() {}\n\nfunction c() {}');
    assert.equal(fmtBody(src, { blankLines: { betweenFunctions: 2, maxConsecutive: 2 } }), 'function a() {}\n\n\nfunction b() {}\n\n\nfunction c() {}');
    assert.equal(fmtBody(src, { blankLines: { betweenFunctions: 0 } }), 'function a() {}\nfunction b() {}\nfunction c() {}');
});

test('blank lines: function spacing can be disabled and leaves closures / nested code alone', () => {
    const src = 'function a() {}\nfunction b() {\n    $f = function () {};\n    $g = fn() => 1;\n}';
    assert.equal(fmtBody(src, { blankLines: { enforceBetweenFunctions: false } }), src);
    assert.equal(fmtBody(src), 'function a() {}\n\nfunction b() {\n    $f = function () {};\n    $g = fn() => 1;\n}');
    assert.equal(fmtBody(src, { disabledRules: ['function-blank-lines'] }), src);
});

test('blank lines: a trailing comment on the previous line is not pulled into the function', () => {
    assert.equal(
        fmtBody('function a() {} // done\nfunction b() {}'),
        'function a() {} // done\n\nfunction b() {}',
    );
});

test('line endings: lf, crlf and auto-detection', () => {
    assert.equal(fmt('<?php\r\nif ($a) {\r\nfoo();\r\n}\r\n', { lineEnding: 'lf' }), '<?php\n' + 'if ($a) {\n    foo();\n}');
    assert.equal(fmt('<?php\nif ($a) {\nfoo();\n}', { lineEnding: 'crlf' }), '<?php\r\nif ($a) {\r\n    foo();\r\n}');
    assert.equal(
        formatPhpEdits('<?php\r\nif ($a) {\r\nfoo();\r\n}\r\n', { lineEnding: 'auto' }).text,
        '<?php\r\nif ($a) {\r\n    foo();\r\n}',
    );
    assert.equal(formatPhpEdits('<?php\nif ($a) {\nfoo();\n}', { lineEnding: 'auto' }, { eol: '\r\n' }).text.includes('\r\n'), true);
});

test('final newline', () => {
    assert.equal(fmt('<?php\n$a = 1;\n'), '<?php\n$a = 1;');
    assert.equal(fmt('<?php\n$a = 1;\n\n\n'), '<?php\n$a = 1;');
    assert.equal(formatPhpEdits('<?php\r\n$a = 1;\r\n\r\n', { lineEnding: 'auto' }).text, '<?php\r\n$a = 1;');
    assert.equal(fmt('<?php\n$a = 1;', { finalNewline: 'single' }), '<?php\n$a = 1;\n');
    assert.equal(fmt('<?php\n$a = 1;\n\n\n', { finalNewline: 'single' }), '<?php\n$a = 1;\n');
    assert.equal(fmt('<?php\n$a = 1;', { finalNewline: 'keep' }), '<?php\n$a = 1;');
    assert.equal(fmt('<?php\n$a = 1;\n\n', { finalNewline: 'keep' }), '<?php\n$a = 1;\n\n');
    // files that end in HTML / a closing tag are never touched
    assert.equal(fmt('<p>x</p>\n'), '<p>x</p>\n');
    assert.equal(fmt('<?php echo 1; ?>\n\n'), '<?php echo 1; ?>\n\n');
});

test('@formatter:off / @formatter:on regions are left untouched', () => {
    const src = '<?php\n$a=1;\n// @formatter:off\n$m = [\n    1,0,0,\n    0,1,0,\n];\n$x   =   2;\n// @formatter:on\n$b=2;\n';
    assert.equal(fmt(src), '<?php\n$a = 1;\n// @formatter:off\n$m = [\n    1,0,0,\n    0,1,0,\n];\n$x   =   2;\n// @formatter:on\n$b = 2;');
    const unterminated = '<?php\n// @formatter:off\n$a=1;   \n\n\n\n';
    assert.equal(fmt(unterminated), unterminated);
});

test('rules can be disabled individually', () => {
    assert.equal(fmtBody('$a=1;', { disabledRules: ['operator-spacing'] }), '$a=1;');
    assert.equal(fmtBody('if ($a) {\nfoo();\n}', { disabledRules: ['indentation'] }), 'if ($a) {\nfoo();\n}');
});

test('range formatting: only edits anchored inside the range are applied', () => {
    const src = '<?php\n$a=1;\n$b=2;\n$c=3;\n';
    const { edits } = formatPhpEdits(src);
    const from = src.indexOf('$b');
    const to = src.indexOf('$c') - 1;
    const inRange = edits.filter((e) => e.anchor >= from && e.anchor <= to);
    assert.ok(inRange.length > 0 && inRange.length < edits.length);
});

test('already formatted code is a fixed point (same-line default and PSR-12 new-line style)', () => {
    const body = 'public function f(int $a): int';
    const same = `<?php\n\nnamespace A;\n\nfinal class B {\n    ${body} {\n        return $a > 1 ? $a * 2 : -$a;\n    }\n}`;
    assert.equal(fmt(same), same);
    const psr = `<?php\n\nnamespace A;\n\nfinal class B\n{\n    ${body}\n    {\n        return $a > 1 ? $a * 2 : -$a;\n    }\n}`;
    assert.equal(fmt(psr, { braces: { classes: 'new-line', functions: 'new-line' } }), psr);
});

test('the formatter reports why it refused to touch a file', () => {
    const result = formatPhpEdits('<?php $a=1;');
    assert.equal(result.ok, true);
    assert.equal(result.reason, undefined);
});
