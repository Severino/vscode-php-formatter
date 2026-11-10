import { CALL_LIKE, CONTROL_PAREN_KEYWORDS, KEYWORDS } from '../php';
import { Rule } from '../rule';

export const keywordSpacingRule: Rule = {
    id: 'keyword-spacing',
    description: 'Spacing between keywords / function names and their opening parenthesis.',
    apply(ctx) {
        const s = ctx.options.spaces;
        const gap = (flag: boolean): ' ' | '' => (flag ? ' ' : '');

        ctx.tokens.forEach((_, i) => {
            if (ctx.isWord(i, 'use') && ctx.isOp(i - 1, ')')) {
                ctx.setGap(i, ' ');
            }
            if (!ctx.isOp(i, '(') || i === 0) {
                return;
            }
            const p = i - 1;
            const prev = ctx.tokens[p];
            const pw = ctx.word(p);
            if (ctx.isOp(p - 1, '->', '?->', '::')) {
                // method named like a keyword: `$a->list (` is a call
                if (prev.type === 'name') {
                    ctx.setGap(i, gap(s.beforeFunctionCallParen));
                }
                return;
            }

            const isFunctionKeyword = (idx: number) => ctx.isWord(idx, 'function') || (ctx.isOp(idx, '&') && ctx.isWord(idx - 1, 'function'));
            const isArrowKeyword = (idx: number) => ctx.isWord(idx, 'fn') || (ctx.isOp(idx, '&') && ctx.isWord(idx - 1, 'fn'));

            if (isFunctionKeyword(p)) {
                ctx.setGap(i, gap(s.beforeClosureParen));
            } else if (isArrowKeyword(p)) {
                ctx.setGap(i, gap(s.beforeArrowFunctionParen));
            } else if (prev.type === 'name' && isFunctionKeyword(p - 1)) {
                ctx.setGap(i, gap(s.beforeFunctionDeclarationParen));
            } else if (pw === 'use' && ctx.isOp(p - 1, ')')) {
                ctx.setGap(i, gap(s.beforeClosureUseParen));
            } else if (CONTROL_PAREN_KEYWORDS.has(pw)) {
                ctx.setGap(i, gap(s.afterControlKeyword));
            } else if (prev.type === 'name' && (!KEYWORDS.has(pw) || CALL_LIKE.has(pw))) {
                ctx.setGap(i, gap(s.beforeFunctionCallParen));
            }
        });
    },
};
