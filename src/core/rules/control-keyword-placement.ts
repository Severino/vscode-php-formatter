import { Rule } from '../rule';

export const controlKeywordPlacementRule: Rule = {
    id: 'control-keyword-placement',
    description: 'Places else / elseif / catch / finally / do-while `while` on the line of the preceding `}` or on a new line.',
    apply(ctx) {
        const o = ctx.options.controlStructures;
        ctx.tokens.forEach((_, i) => {
            if (i === 0 || !ctx.isOp(i - 1, '}')) {
                return;
            }
            const info = ctx.blockOf(i - 1);
            if (info?.kind !== 'control') {
                return;
            }
            const word = ctx.word(i);
            let style: string | undefined;
            if (word === 'else' || word === 'elseif') {
                style = o.elseKeyword;
            } else if (word === 'catch' || word === 'finally') {
                style = o.catchFinallyKeyword;
            } else if (word === 'while' && info.keyword === 'do') {
                style = o.doWhileKeyword;
            }
            if (style === 'same-line') {
                ctx.setBefore(i, ' ');
            } else if (style === 'new-line' && !ctx.hasNewline(i)) {
                ctx.setBefore(i, ctx.eol);
            }
        });
    },
};
