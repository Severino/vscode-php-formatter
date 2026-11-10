import { Rule } from '../rule';

export const whitespaceNormalizationRule: Rule = {
    id: 'whitespace-normalization',
    description: 'Collapses leftover runs of spaces / tabs between tokens on the same line into a single space.',
    apply(ctx) {
        ctx.tokens.forEach((tok, i) => {
            if (i === 0 || !/^[ \t]+$/.test(tok.before) || tok.before === ' ') {
                return;
            }
            const prev = ctx.tokens[i - 1];
            if (prev.type === 'html' || tok.type === 'comment' || prev.type === 'comment') {
                return;
            }
            ctx.setBefore(i, ' ');
        });
    },
};
