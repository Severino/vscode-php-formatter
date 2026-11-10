import { Rule } from '../rule';

export const finalNewlineRule: Rule = {
    id: 'final-newline',
    description: 'Controls the line breaks at the end of files that end in PHP code (none / single / keep).',
    apply(ctx) {
        const last = ctx.tokens[ctx.tokens.length - 1];
        if (ctx.trailingFrozen || !last || last.frozen) {
            return;
        }
        const unterminated =
            (last.type === 'comment' && last.text.startsWith('/*') && !last.text.endsWith('*/')) ||
            last.type === 'heredoc' ||
            (last.type === 'string' && !/^(["'`]).*\1$/s.test(last.text.replace(/^b/i, '')));
        if (last.type === 'html' || last.type === 'closeTag' || unterminated) {
            return;
        }
        const mode = ctx.options.finalNewline;
        if (mode !== 'keep') {
            ctx.trailing = mode === 'single' ? ctx.eol : '';
        }
    },
};
