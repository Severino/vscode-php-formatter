import { FormatContext } from '../context';
import { Rule } from '../rule';

const SKIP_TYPES = new Set(['html', 'openTag', 'closeTag']);

function ensureBlankLineAfter(ctx: FormatContext, semicolon: number): void {
    const next = semicolon + 1;
    const tok = ctx.tokens[next];
    if (!tok || SKIP_TYPES.has(tok.type) || ctx.isOp(next, '}') || !ctx.hasNewline(next)) {
        return;
    }
    if (ctx.newlineCount(next) < 2) {
        ctx.setNewlines(next, 2);
    }
}

function isTopLevel(ctx: FormatContext, i: number): boolean {
    const p = ctx.parent[i];
    return p < 0 || ctx.blocks.get(p)?.kind === 'namespace';
}

export const blankLinesRule: Rule = {
    id: 'blank-lines',
    description: 'Limits consecutive blank lines and enforces blank lines after namespace / use statements.',
    apply(ctx) {
        const o = ctx.options.blankLines;
        const len = ctx.tokens.length;

        if (o.removeAtBlockEdges) {
            for (let i = 0; i < len; i++) {
                if (ctx.isOp(i, '{') && ctx.blockOf(i) && i + 1 < len && ctx.hasNewline(i + 1) && ctx.newlineCount(i + 1) > 1) {
                    ctx.setNewlines(i + 1, 1);
                } else if (ctx.isOp(i, '}') && ctx.blockOf(i) && ctx.hasNewline(i) && ctx.newlineCount(i) > 1) {
                    ctx.setNewlines(i, 1);
                }
            }
        }

        for (let i = 0; i < len; i++) {
            if (o.afterNamespace && ctx.isWord(i, 'namespace') && ctx.isStatementStart(i)) {
                let k = i + 1;
                while (k < len && !ctx.isOp(k, ';', '{')) {
                    k++;
                }
                if (ctx.isOp(k, ';')) {
                    ensureBlankLineAfter(ctx, k);
                }
            } else if (o.afterUseImports && ctx.isWord(i, 'use') && ctx.isStatementStart(i) && isTopLevel(ctx, i)) {
                let k = i + 1;
                while (k < len && !ctx.isOp(k, ';')) {
                    k = ctx.isOp(k, '{') && ctx.match[k] > k ? ctx.match[k] + 1 : k + 1;
                }
                if (k < len && !ctx.isWord(k + 1, 'use')) {
                    ensureBlankLineAfter(ctx, k);
                }
            }
        }

        const maxNewlines = o.maxConsecutive + 1;
        for (let i = 0; i < len; i++) {
            if (ctx.hasNewline(i) && ctx.newlineCount(i) > maxNewlines) {
                ctx.setNewlines(i, maxNewlines);
            }
        }
    },
};
