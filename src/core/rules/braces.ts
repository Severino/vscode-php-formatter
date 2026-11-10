import { FormatContext } from '../context';
import { BraceStyle, FormatOptions } from '../options';
import { Rule } from '../rule';

function styleFor(kind: string, o: FormatOptions['braces']): BraceStyle | undefined {
    switch (kind) {
        case 'class': return o.classes;
        case 'anonymousClass': return o.anonymousClasses;
        case 'function': return o.functions;
        case 'closure': return o.closures;
        case 'control':
        case 'match': return o.controlStructures;
        default: return undefined;
    }
}

/** True when the `)` that ends the parameter list of the function whose body starts at `brace` begins its own line. */
function hasMultilineParameterList(ctx: FormatContext, brace: number): boolean {
    let j = brace - 1;
    while (j > 0 && !ctx.isOp(j, ')')) {
        if (ctx.isOp(j, ';', '{', '}', '(')) {
            return false;
        }
        j--;
    }
    return ctx.isOp(j, ')') && ctx.hasNewline(j);
}

export const bracesRule: Rule = {
    id: 'braces',
    description: 'Places the opening brace of classes, functions, closures and control structures on the same or a new line.',
    apply(ctx) {
        const o = ctx.options.braces;
        for (const [i, info] of ctx.blocks) {
            let style = styleFor(info.kind, o);
            const prev = ctx.tokens[i - 1];
            if (!style || !prev || prev.type === 'comment' || prev.type === 'openTag' || prev.type === 'html') {
                continue;
            }
            if (info.kind === 'function' && style === 'new-line' && o.sameLineAfterMultilineParameters && hasMultilineParameterList(ctx, i)) {
                style = 'same-line';
            }
            if (style === 'new-line') {
                if (!ctx.hasNewline(i)) {
                    ctx.setBefore(i, ctx.eol);
                }
            } else {
                ctx.setBefore(i, ' ');
            }
        }
    },
};
