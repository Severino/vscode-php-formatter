import { Rule } from '../rule';

export const punctuationSpacingRule: Rule = {
    id: 'punctuation-spacing',
    description: 'Spacing around commas and semicolons, after casts and after `!`.',
    apply(ctx) {
        const s = ctx.options.spaces;
        ctx.tokens.forEach((tok, i) => {
            if (tok.type === 'cast') {
                ctx.setGap(i + 1, s.afterCast ? ' ' : '');
            } else if (ctx.isOp(i, '!')) {
                ctx.setGap(i + 1, s.afterNot ? ' ' : '');
            } else if (ctx.isOp(i, ',')) {
                ctx.setGap(i, s.beforeComma ? ' ' : '');
                ctx.setGap(i + 1, ctx.isOp(i + 1, ')', ']') ? '' : s.afterComma ? ' ' : '');
            } else if (ctx.isOp(i, ';')) {
                const noSpaceBefore = ctx.isOp(i - 1, '(', ';');
                ctx.setGap(i, s.beforeSemicolon && !noSpaceBefore ? ' ' : '');
                const parent = ctx.parent[i];
                if (parent >= 0 && ctx.isOp(parent, '(') && ctx.isWord(parent - 1, 'for')) {
                    ctx.setGap(i + 1, ctx.isOp(i + 1, ';', ')') ? '' : s.afterSemicolonInFor ? ' ' : '');
                }
            }
        });
    },
};
