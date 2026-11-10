import { Rule } from '../rule';

export const parenthesisSpacingRule: Rule = {
    id: 'parenthesis-spacing',
    description: 'Spacing just inside (), [] and one-line {} blocks.',
    apply(ctx) {
        const s = ctx.options.spaces;
        const inside = (open: number, flag: boolean) => {
            const close = ctx.match[open];
            if (close < 0) {
                return;
            }
            if (close === open + 1) {
                ctx.setGap(close, '');
                return;
            }
            ctx.setGap(open + 1, flag ? ' ' : '');
            ctx.setGap(close, flag ? ' ' : '');
        };

        ctx.tokens.forEach((_, i) => {
            if (ctx.isOp(i, '(')) {
                inside(i, s.withinParentheses);
            } else if (ctx.isOp(i, '[')) {
                inside(i, s.withinBrackets);
            } else if (ctx.isOp(i, '{') && ctx.blockOf(i)) {
                inside(i, s.withinBraces);
            }
        });
    },
};
