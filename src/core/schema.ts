/**
 * Single source of truth for every formatter option.
 *
 * To add an option: add an entry here, add the matching field to `FormatOptions`
 * (options.ts), run `npm run gen:config` to refresh package.json, and use the
 * option from a rule. A test fails if package.json and this schema drift apart.
 */
export interface OptionSpec {
    type: 'boolean' | 'string' | 'number' | 'array';
    default: unknown;
    description: string;
    enum?: string[];
    enumDescriptions?: string[];
    minimum?: number;
    maximum?: number;
}

const bool = (def: boolean, description: string): OptionSpec => ({ type: 'boolean', default: def, description });
const choice = (def: string, values: string[], description: string, enumDescriptions?: string[]): OptionSpec => ({
    type: 'string',
    default: def,
    enum: values,
    enumDescriptions,
    description,
});
const num = (def: number, minimum: number, maximum: number, description: string): OptionSpec => ({
    type: 'number',
    default: def,
    minimum,
    maximum,
    description,
});

const BRACE = ['same-line', 'new-line'];
const BRACE_DESC = ['`{` stays on the line of the declaration.', '`{` is moved to its own line.'];
const brace = (def: string, what: string): OptionSpec =>
    choice(def, BRACE, `Position of the opening brace of ${what}.`, BRACE_DESC);
const KEYWORD_DESC = ['Keyword follows the closing brace: `} else {`.', 'Keyword starts a new line after the closing brace.'];

export const OPTION_SCHEMA: Record<string, OptionSpec> = {
    'indent.style': choice('editor', ['editor', 'spaces', 'tabs'], 'Indentation character.', [
        "Follow the editor's `insertSpaces` / `tabSize` for the current file.",
        'Always indent with spaces.',
        'Always indent with tabs.',
    ]),
    'indent.size': num(4, 1, 16, 'Spaces per indentation level (only used when `indent.style` is `spaces`).'),
    'indent.switchCases': bool(true, 'Indent `case` / `default` labels one level inside `switch`.'),
    'indent.continuationLevels': num(
        1,
        0,
        4,
        'Extra indentation levels for continuation lines of a statement (method chains, wrapped expressions, brace-less bodies).',
    ),
    lineEnding: choice('auto', ['auto', 'lf', 'crlf'], 'Line ending used for formatted whitespace.', [
        'Use the line ending of the document.',
        'Unix line endings.',
        'Windows line endings.',
    ]),
    finalNewline: choice(
        'none',
        ['none', 'single', 'keep'],
        'Line breaks at the end of files that end in PHP mode. Files ending in inline HTML or `?>` are never touched.',
        [
            'The file ends directly after the last token (no trailing newline, no empty last line).',
            'The file ends with exactly one newline.',
            'Leave the trailing line breaks as they are.',
        ],
    ),

    'braces.classes': brace('same-line', 'classes, interfaces, traits and enums'),
    'braces.anonymousClasses': brace('same-line', 'anonymous classes'),
    'braces.functions': brace('same-line', 'named functions and methods'),
    'braces.sameLineAfterMultilineParameters': bool(
        true,
        'When the parameter list of a named function / method ends with a `)` on its own line, keep the opening brace on that line (`) {`) even if `braces.functions` is `new-line` (PER-CS style).',
    ),
    'braces.closures': brace('same-line', 'closures (`function () {}`)'),
    'braces.controlStructures': brace('same-line', '`if`, `else`, `for`, `foreach`, `while`, `do`, `switch`, `try`, `catch`, `finally` and `match`'),

    'controlStructures.elseKeyword': choice('same-line', BRACE, 'Placement of `else` / `elseif` after the closing brace of the previous block.', KEYWORD_DESC),
    'controlStructures.catchFinallyKeyword': choice('same-line', BRACE, 'Placement of `catch` / `finally` after the closing brace of the previous block.', KEYWORD_DESC),
    'controlStructures.doWhileKeyword': choice('same-line', BRACE, 'Placement of `while` after the closing brace of a `do` block.', KEYWORD_DESC),

    'spaces.afterControlKeyword': bool(true, 'Space between `if`, `elseif`, `for`, `foreach`, `while`, `switch`, `catch`, `match` and `(`.'),
    'spaces.beforeFunctionDeclarationParen': bool(false, 'Space before `(` in `function name (...)`.'),
    'spaces.beforeClosureParen': bool(true, 'Space before `(` in `function (...) {}`.'),
    'spaces.beforeArrowFunctionParen': bool(false, 'Space before `(` in `fn (...) =>`.'),
    'spaces.beforeClosureUseParen': bool(true, 'Space before `(` in `function () use (...)`.'),
    'spaces.beforeFunctionCallParen': bool(false, 'Space between a function / method name and `(` in calls.'),
    'spaces.withinParentheses': bool(false, 'Space inside non-empty parentheses: `( $a )`.'),
    'spaces.withinBrackets': bool(false, 'Space inside non-empty square brackets: `[ 1, 2 ]`.'),
    'spaces.withinBraces': bool(true, 'Space inside non-empty braces of blocks that sit on one line: `{ return 1; }`.'),
    'spaces.beforeComma': bool(false, 'Space before `,`.'),
    'spaces.afterComma': bool(true, 'Space after `,`.'),
    'spaces.beforeSemicolon': bool(false, 'Space before `;`.'),
    'spaces.afterSemicolonInFor': bool(true, 'Space after `;` inside `for (...)`.'),
    'spaces.aroundAssignment': bool(true, 'Spaces around `=`, `+=`, `.=`, `??=` and other assignment operators.'),
    'spaces.aroundComparison': bool(true, 'Spaces around `==`, `===`, `!=`, `!==`, `<`, `>`, `<=`, `>=`, `<=>`.'),
    'spaces.aroundLogical': bool(true, 'Spaces around `&&` and `||`.'),
    'spaces.aroundArithmetic': bool(true, 'Spaces around binary `+`, `-`, `*`, `/`, `%`, `**`.'),
    'spaces.aroundBitwise': bool(true, 'Spaces around binary `|`, `&`, `^`, `<<`, `>>`.'),
    'spaces.aroundConcat': bool(true, 'Spaces around the `.` concatenation operator.'),
    'spaces.aroundNullCoalescing': bool(true, 'Spaces around `??`.'),
    'spaces.aroundTernary': bool(true, 'Spaces around `?` and `:` of ternary expressions (`?:` is kept together).'),
    'spaces.aroundDoubleArrow': bool(true, 'Spaces around `=>`.'),
    'spaces.aroundObjectOperator': bool(false, 'Spaces around `->`, `?->` and `::`.'),
    'spaces.afterCast': bool(true, 'Space after a cast: `(int) $a`.'),
    'spaces.afterNot': bool(false, 'Space after the `!` operator.'),
    'spaces.beforeReturnTypeColon': bool(false, 'Space before the `:` of a return type: `function f() : int`.'),
    'spaces.afterReturnTypeColon': bool(true, 'Space after the `:` of a return type.'),

    'blankLines.maxConsecutive': num(1, 0, 10, 'Maximum number of consecutive blank lines.'),
    'blankLines.removeAtBlockEdges': bool(false, 'Remove blank lines directly after `{` and directly before `}`.'),
    'blankLines.afterNamespace': bool(true, 'Ensure a blank line after `namespace Foo;`.'),
    'blankLines.afterUseImports': bool(true, 'Ensure a blank line after a block of top-level `use` imports.'),
    'blankLines.enforceBetweenFunctions': bool(true, 'Enforce an exact number of blank lines (`blankLines.betweenFunctions`) between a function / method (including its doc block, attributes and modifiers) and the neighbouring members. Disable to keep the existing spacing.'),
    'blankLines.betweenFunctions': num(1, 0, 10, 'Number of blank lines between functions / methods when `blankLines.enforceBetweenFunctions` is on.'),

    'comments.reindentDocBlocks': bool(true, 'Re-align the `*` of multi-line `/* */` and `/** */` comments with the comment start.'),
    'comments.trimTrailingWhitespace': bool(true, 'Remove trailing whitespace inside comments.'),

    disabledRules: {
        type: 'array',
        default: [],
        description:
            'Ids of formatter rules to switch off completely: braces, control-keyword-placement, keyword-spacing, parenthesis-spacing, punctuation-spacing, operator-spacing, blank-lines, comment-cleanup, indentation, final-newline.',
    },
};

export function expandDefaults(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [path, spec] of Object.entries(OPTION_SCHEMA)) {
        setPath(out, path, Array.isArray(spec.default) ? [...spec.default] : spec.default);
    }
    return out;
}

export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let node = target;
    for (const part of parts.slice(0, -1)) {
        node = (node[part] ??= {}) as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
}

export function getPath(source: unknown, path: string): unknown {
    let node: unknown = source;
    for (const part of path.split('.')) {
        if (typeof node !== 'object' || node === null) {
            return undefined;
        }
        node = (node as Record<string, unknown>)[part];
    }
    return node;
}

/** Shape of `contributes.configuration.properties` in package.json. */
export function buildConfigurationProperties(): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const [path, spec] of Object.entries(OPTION_SCHEMA)) {
        const entry: Record<string, unknown> = { type: spec.type, default: spec.default, markdownDescription: spec.description };
        if (spec.type === 'array') {
            entry.items = { type: 'string' };
        }
        if (spec.enum) {
            entry.enum = spec.enum;
        }
        if (spec.enumDescriptions) {
            entry.markdownEnumDescriptions = spec.enumDescriptions;
        }
        if (spec.minimum !== undefined) {
            entry.minimum = spec.minimum;
        }
        if (spec.maximum !== undefined) {
            entry.maximum = spec.maximum;
        }
        props[`dhcConverter.php.${path}`] = entry;
    }
    return props;
}
