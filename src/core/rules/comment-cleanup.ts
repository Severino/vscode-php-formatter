import { Rule } from '../rule';

const LINE_BREAK = /\r\n|\n|\r/;

export const commentCleanupRule: Rule = {
    id: 'comment-cleanup',
    description: 'Normalises line endings inside comments and trims trailing whitespace in them.',
    apply(ctx) {
        const trim = ctx.options.comments.trimTrailingWhitespace;
        ctx.tokens.forEach((t, i) => {
            if (t.type !== 'comment') {
                return;
            }
            const lines = t.text.split(LINE_BREAK);
            ctx.setText(i, (trim ? lines.map((l) => l.replace(/[ \t]+$/, '')) : lines).join(ctx.eol));
        });
    },
};
