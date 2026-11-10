import { CLOSERS } from '../php';
import { Rule } from '../rule';

interface Frame {
    idx: number;
    /** Indent level of the line the opening bracket sits on. */
    level: number;
    isSwitch: boolean;
    /** True for `{` blocks that contain statements (so continuation indentation applies). */
    statements: boolean;
}

const LINE_BREAK = /\r\n|\n|\r/;

/**
 * Indentation is relative to the line of the innermost open bracket ("hanging" indent):
 * lines inside `{`, `(`, `[` get one level more than the line that opened them, and a line
 * starting with the matching closing bracket is aligned with the opening line.
 */
export const indentationRule: Rule = {
    id: 'indentation',
    description: 'Re-indents every line, aligns doc-block asterisks and normalises line endings between tokens.',
    apply(ctx) {
        const { tokens, options } = ctx;
        const o = options.indent;
        const stack: Frame[] = [];
        let curLevel = 0;
        let prevSig = -1;

        const isContinuation = (j: number): boolean => {
            if (prevSig < 0) {
                return false;
            }
            if (ctx.isOp(j, '{') || ctx.isWord(j, 'case', 'default')) {
                return false;
            }
            const p = tokens[prevSig];
            if (p.type === 'op') {
                if (p.text.length === 1 && ';{},:}'.includes(p.text)) {
                    return false;
                }
                if (p.text === ']' && ctx.match[prevSig] >= 0 && tokens[ctx.match[prevSig]].text === '#[') {
                    return false;
                }
            }
            return true;
        };

        const levelFor = (j: number): number => {
            const top = stack[stack.length - 1];
            if (top && ctx.isCloser(j) && ctx.match[j] === top.idx) {
                return top.level;
            }
            let level = 0;
            if (top) {
                level = top.level + 1;
                if (top.isSwitch) {
                    level = top.level + (o.switchCases ? 1 : 0) + (ctx.isWord(j, 'case', 'default') ? 0 : 1);
                }
            }
            if ((!top || top.statements) && isContinuation(j)) {
                level += o.continuationLevels;
            }
            return level;
        };

        tokens.forEach((tok, i) => {
            if (tok.type === 'html' || tok.type === 'openTag') {
                curLevel = 0;
                prevSig = -1;
                return;
            }

            if (ctx.hasNewline(i)) {
                let ref = i;
                if (tok.type === 'comment') {
                    while (ref < tokens.length && tokens[ref].type === 'comment') {
                        ref++;
                    }
                    if (ref >= tokens.length || tokens[ref].type === 'html' || tokens[ref].type === 'openTag') {
                        ref = i;
                    }
                }
                let level = levelFor(ref);
                if (tok.type === 'comment' && ref !== i && ctx.isOp(ref, '}', ')', ']')) {
                    // a comment before a closing bracket still belongs to the body it closes
                    level += 1;
                }
                ctx.setBefore(i, ctx.eol.repeat(ctx.newlineCount(i)) + ctx.indentUnit.repeat(level));
                curLevel = level;

                if (tok.type === 'comment' && options.comments.reindentDocBlocks && tok.text.startsWith('/*')) {
                    const lines = tok.text.split(LINE_BREAK);
                    if (lines.length > 1) {
                        const pad = ctx.indentUnit.repeat(level) + ' ';
                        ctx.setText(i, lines.map((l, k) => (k > 0 && l.trimStart().startsWith('*') ? pad + l.trimStart() : l)).join(ctx.eol));
                    }
                }
            }

            if (ctx.isOpener(i)) {
                const info = ctx.blocks.get(i);
                stack.push({
                    idx: i,
                    level: curLevel,
                    isSwitch: info?.kind === 'control' && info.keyword === 'switch',
                    statements: tok.text === '{' && info?.kind !== 'match',
                });
            } else if (tok.type === 'op' && CLOSERS.has(tok.text) && ctx.match[i] >= 0) {
                while (stack.length && stack[stack.length - 1].idx !== ctx.match[i]) {
                    stack.pop();
                }
                stack.pop();
            }
            if (tok.type === 'closeTag') {
                prevSig = -1;
            } else if (tok.type !== 'comment') {
                prevSig = i;
            }
        });
    },
};
