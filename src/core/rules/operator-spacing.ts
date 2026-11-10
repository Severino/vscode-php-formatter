import { FormatContext } from '../context';
import { KEYWORDS } from '../php';
import { Rule } from '../rule';

const ASSIGNMENT = new Set(['=', '+=', '-=', '*=', '/=', '.=', '%=', '**=', '??=', '&=', '|=', '^=', '<<=', '>>=']);
const COMPARISON = new Set(['==', '===', '!=', '!==', '<>', '<', '>', '<=', '>=', '<=>']);
const LOGICAL = new Set(['&&', '||']);
const ARITHMETIC = new Set(['+', '-', '*', '/', '%', '**']);
const BITWISE = new Set(['|', '&', '^', '<<', '>>']);
const OBJECT = new Set(['->', '?->', '::']);

/** True when the token at `i` can be the end of an operand, i.e. a following `+` / `-` is binary. */
function endsOperand(ctx: FormatContext, i: number): boolean {
    const t = ctx.tokens[i];
    if (!t) {
        return false;
    }
    switch (t.type) {
        case 'variable': case 'number': case 'string': case 'heredoc':
            return true;
        case 'name':
            return !KEYWORDS.has(t.text.toLowerCase());
        case 'op':
            if (t.text === ')' || t.text === ']') {
                return true;
            }
            return (t.text === '++' || t.text === '--') && endsOperand(ctx, i - 1);
        default:
            return false;
    }
}

/** Stricter variant for `|` and `&`, which are also used in union / intersection types and references. */
function endsStrictOperand(ctx: FormatContext, i: number): boolean {
    const t = ctx.tokens[i];
    return !!t && (t.type === 'variable' || t.type === 'number' || t.type === 'string' || ctx.isOp(i, ')', ']'));
}

function isReturnTypeColon(ctx: FormatContext, i: number): boolean {
    if (!ctx.isOp(i - 1, ')')) {
        return false;
    }
    const open = ctx.match[i - 1];
    if (open <= 0) {
        return false;
    }
    const p = open - 1;
    const isFn = (idx: number) => ctx.isWord(idx, 'function', 'fn') || (ctx.isOp(idx, '&') && ctx.isWord(idx - 1, 'function', 'fn'));
    return isFn(p) || ctx.isWord(p, 'use') || (ctx.tokens[p]?.type === 'name' && isFn(p - 1));
}

export const operatorSpacingRule: Rule = {
    id: 'operator-spacing',
    description: 'Spacing around binary operators, ternaries, `=>`, object operators and return-type colons.',
    apply(ctx) {
        const s = ctx.options.spaces;
        const around = (i: number, flag: boolean) => {
            ctx.setGap(i, flag ? ' ' : '');
            ctx.setGap(i + 1, flag ? ' ' : '');
        };
        const pendingTernaries = new Map<number, number>();

        for (let i = 0; i < ctx.tokens.length; i++) {
            const t = ctx.tokens[i];
            if (t.type !== 'op') {
                continue;
            }
            const x = t.text;

            if (x === ';') {
                pendingTernaries.clear();
            } else if (x === '?') {
                if (!endsOperand(ctx, i - 1)) {
                    continue;
                }
                if (ctx.isOp(i + 1, ':')) {
                    // short ternary `?:` is kept together
                    ctx.setGap(i, s.aroundTernary ? ' ' : '');
                    ctx.setGap(i + 1, '');
                    ctx.setGap(i + 2, s.aroundTernary ? ' ' : '');
                    i++;
                } else {
                    around(i, s.aroundTernary);
                    pendingTernaries.set(ctx.parent[i], (pendingTernaries.get(ctx.parent[i]) ?? 0) + 1);
                }
            } else if (x === ':') {
                const pending = pendingTernaries.get(ctx.parent[i]) ?? 0;
                if (pending > 0) {
                    pendingTernaries.set(ctx.parent[i], pending - 1);
                    around(i, s.aroundTernary);
                } else if (isReturnTypeColon(ctx, i)) {
                    ctx.setGap(i, s.beforeReturnTypeColon ? ' ' : '');
                    ctx.setGap(i + 1, s.afterReturnTypeColon ? ' ' : '');
                }
            } else if (ASSIGNMENT.has(x)) {
                const owner = ctx.parent[i] >= 0 && ctx.isOp(ctx.parent[i], '(') ? ctx.parent[i] - 1 : -1;
                if (!ctx.isWord(owner, 'declare')) {
                    around(i, s.aroundAssignment);
                }
            } else if (COMPARISON.has(x)) {
                around(i, s.aroundComparison);
            } else if (LOGICAL.has(x)) {
                around(i, s.aroundLogical);
            } else if (x === '+' || x === '-') {
                if (endsOperand(ctx, i - 1)) {
                    around(i, s.aroundArithmetic);
                }
            } else if (ARITHMETIC.has(x)) {
                around(i, s.aroundArithmetic);
            } else if (x === '|' || x === '&') {
                if (endsStrictOperand(ctx, i - 1)) {
                    around(i, s.aroundBitwise);
                }
            } else if (BITWISE.has(x)) {
                around(i, s.aroundBitwise);
            } else if (x === '.') {
                around(i, s.aroundConcat);
            } else if (x === '??') {
                around(i, s.aroundNullCoalescing);
            } else if (x === '=>') {
                around(i, s.aroundDoubleArrow);
            } else if (OBJECT.has(x)) {
                around(i, s.aroundObjectOperator);
            }
        }
    },
};
