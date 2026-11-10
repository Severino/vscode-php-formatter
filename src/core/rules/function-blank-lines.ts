import { FormatContext } from '../context';
import { Rule } from '../rule';

const MODIFIERS = new Set(['public', 'protected', 'private', 'static', 'abstract', 'final', 'readonly']);
const SKIP_TYPES = new Set(['html', 'openTag', 'closeTag']);

/** Index of the first token that belongs to the function: attributes, modifiers and a directly attached doc block. */
function declarationStart(ctx: FormatContext, fn: number): number {
    let s = fn;
    for (;;) {
        const p = s - 1;
        if (p < 0) {
            return s;
        }
        const t = ctx.tokens[p];
        if (t.type === 'name' && MODIFIERS.has(t.text.toLowerCase())) {
            s = p;
        } else if (ctx.isOp(p, ']') && ctx.match[p] >= 0 && ctx.tokens[ctx.match[p]].text === '#[') {
            s = ctx.match[p];
        } else if (t.type === 'comment' && ctx.hasNewline(p) && ctx.hasNewline(s) && ctx.newlineCount(s) === 1) {
            s = p;
        } else {
            return s;
        }
    }
}

/** Index of the last token of the function: the closing `}` of its body or the `;` of an abstract / interface method. */
function declarationEnd(ctx: FormatContext, fn: number): number {
    let k = fn + 1;
    while (ctx.isOp(k, '&')) {
        k++;
    }
    const open = k + 1;
    if (!ctx.isOp(open, '(') || ctx.match[open] < 0) {
        return -1;
    }
    for (k = ctx.match[open] + 1; k < ctx.tokens.length; k++) {
        if (ctx.parent[k] !== ctx.parent[open]) {
            continue;
        }
        if (ctx.isOp(k, ';')) {
            return k;
        }
        if (ctx.isOp(k, '{')) {
            return ctx.match[k];
        }
    }
    return -1;
}

function isMemberLevel(ctx: FormatContext, i: number): boolean {
    const p = ctx.parent[i];
    if (p < 0) {
        return true;
    }
    const kind = ctx.blocks.get(p)?.kind;
    return kind === 'class' || kind === 'anonymousClass' || kind === 'namespace';
}

function setGapLines(ctx: FormatContext, i: number, blankLines: number): void {
    if (ctx.hasNewline(i) && ctx.newlineCount(i) !== blankLines + 1) {
        ctx.setNewlines(i, blankLines + 1);
    }
}

export const functionBlankLinesRule: Rule = {
    id: 'function-blank-lines',
    description: 'Enforces a fixed number of blank lines between a function / method (with its doc block) and its neighbours.',
    apply(ctx) {
        const o = ctx.options.blankLines;
        if (!o.enforceBetweenFunctions) {
            return;
        }
        const tokens = ctx.tokens;
        for (let i = 0; i < tokens.length; i++) {
            const named = tokens[i + 1]?.type === 'name' || (ctx.isOp(i + 1, '&') && tokens[i + 2]?.type === 'name');
            const isDeclaration = ctx.isWord(i, 'function') && named && !ctx.isOp(i - 1, '->', '?->', '::') && !ctx.isWord(i - 1, 'use');
            if (!isDeclaration || !isMemberLevel(ctx, i)) {
                continue;
            }
            const start = declarationStart(ctx, i);
            const end = declarationEnd(ctx, i);
            if (end < 0) {
                continue;
            }

            let before = start - 1;
            if (before >= 0 && tokens[before].type === 'comment' && !ctx.hasNewline(before)) {
                before--;
            }
            if (before >= 0 && ctx.isOp(before, '}', ';') && !SKIP_TYPES.has(tokens[start].type)) {
                setGapLines(ctx, start, o.betweenFunctions);
            }

            const next = end + 1;
            if (next < tokens.length && !SKIP_TYPES.has(tokens[next].type) && !ctx.isOp(next, '}', ';', ')', ',')) {
                setGapLines(ctx, next, o.betweenFunctions);
            }
        }
    },
};
