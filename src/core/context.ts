import { LexResult, Token, canJoin } from './lexer';
import { CLOSERS, OPENERS } from './php';
import { FormatEnvironment, FormatOptions } from './options';

export type BlockKind = 'class' | 'anonymousClass' | 'function' | 'closure' | 'control' | 'match' | 'namespace' | 'unknown';

export interface BlockInfo {
    kind: BlockKind;
    /** Lower-cased first control keyword (`if`, `switch`, `do`, ...) for `control` blocks. */
    keyword?: string;
}

const NEWLINES = /\r\n|\n|\r/g;
const CLASS_LIKE = new Set(['interface', 'trait', 'enum']);
const CONTROL = new Set(['if', 'elseif', 'else', 'for', 'foreach', 'while', 'switch', 'catch', 'finally', 'do', 'try', 'declare']);

/**
 * Shared, mutable state handed to every rule.
 *
 * Rules may only change whitespace (`before`) and the text of comments. They must never add,
 * remove or reorder tokens, and must go through `setBefore` / `setGap` / `setText` so that
 * `@formatter:off` regions are respected.
 */
export class FormatContext {
    readonly tokens: Token[];
    readonly eol: string;
    readonly indentUnit: string;
    /** Index of the matching bracket for every bracket token, otherwise -1. */
    readonly match: number[];
    /** Index of the innermost enclosing opening bracket for every token, or -1. */
    readonly parent: number[];
    /** Classification of every `{` token. */
    readonly blocks = new Map<number, BlockInfo>();
    trailing: string;
    trailingFrozen = false;
    readonly trailingStart: number;

    constructor(readonly source: string, lexed: LexResult, readonly options: FormatOptions, env: FormatEnvironment) {
        this.tokens = lexed.tokens;
        this.trailing = lexed.trailing;
        this.trailingStart = lexed.trailingStart;
        this.eol = options.lineEnding === 'lf' ? '\n' : options.lineEnding === 'crlf' ? '\r\n' : env.eol ?? (/\r\n/.test(source) ? '\r\n' : '\n');
        const o = options.indent;
        this.indentUnit =
            o.style === 'tabs' ? '\t' : o.style === 'spaces' ? ' '.repeat(o.size) : env.insertSpaces === false ? '\t' : ' '.repeat(env.tabSize ?? 4);
        this.match = new Array(this.tokens.length).fill(-1);
        this.parent = new Array(this.tokens.length).fill(-1);
        this.computeStructure();
        this.classifyBlocks();
        this.markFrozenRegions();
    }

    // ---- token queries -------------------------------------------------------------------------

    isOp(i: number, ...texts: string[]): boolean {
        const t = this.tokens[i];
        return !!t && t.type === 'op' && texts.includes(t.text);
    }

    isWord(i: number, ...words: string[]): boolean {
        const t = this.tokens[i];
        return !!t && t.type === 'name' && words.includes(t.text.toLowerCase());
    }

    word(i: number): string {
        const t = this.tokens[i];
        return t && t.type === 'name' ? t.text.toLowerCase() : '';
    }

    isOpener(i: number): boolean {
        const t = this.tokens[i];
        return !!t && t.type === 'op' && t.text in OPENERS;
    }

    isCloser(i: number): boolean {
        const t = this.tokens[i];
        return !!t && t.type === 'op' && CLOSERS.has(t.text);
    }

    hasNewline(i: number): boolean {
        return /[\r\n]/.test(this.tokens[i].before);
    }

    newlineCount(i: number): number {
        return (this.tokens[i].before.match(NEWLINES) ?? []).length;
    }

    /** Index of the previous token that is not a comment, or -1. */
    prevSig(i: number): number {
        let j = i - 1;
        while (j >= 0 && this.tokens[j].type === 'comment') {
            j--;
        }
        return j;
    }

    /** True when the token at `i` is the first token of a statement. */
    isStatementStart(i: number): boolean {
        const p = this.prevSig(i);
        if (p < 0) {
            return true;
        }
        const t = this.tokens[p];
        return t.type === 'openTag' || t.type === 'closeTag' || t.type === 'html' || this.isOp(p, ';', '{', '}');
    }

    /** True for `}` / `{` and friends that belong to a recognised block (not `$a->{...}`, group use, ...). */
    blockOf(i: number): BlockInfo | undefined {
        const open = this.isOp(i, '{') ? i : this.isOp(i, '}') ? this.match[i] : -1;
        const info = open >= 0 ? this.blocks.get(open) : undefined;
        return info && info.kind !== 'unknown' ? info : undefined;
    }

    // ---- mutations -----------------------------------------------------------------------------

    private editable(i: number): boolean {
        const t = this.tokens[i];
        return !!t && !t.frozen && t.type !== 'html' && t.type !== 'openTag';
    }

    setBefore(i: number, value: string): void {
        if (this.editable(i)) {
            this.tokens[i].before = value;
        }
    }

    /** Replace the number of line breaks in `before`, keeping the indentation after the last one. */
    setNewlines(i: number, count: number): void {
        const tail = /[ \t]*$/.exec(this.tokens[i].before)![0];
        this.setBefore(i, this.eol.repeat(count) + tail);
    }

    setText(i: number, text: string): void {
        const t = this.tokens[i];
        if (t && !t.frozen) {
            t.text = text;
        }
    }

    /**
     * Set the horizontal gap before token `i` to `want` (one space or nothing).
     * Does nothing when the token starts a line, and never fuses two tokens into one.
     */
    setGap(i: number, want: ' ' | ''): void {
        if (i <= 0 || !this.editable(i) || this.hasNewline(i)) {
            return;
        }
        const prev = this.tokens[i - 1];
        if (prev.type === 'openTag' || prev.type === 'html' || prev.type === 'closeTag') {
            return;
        }
        if (want === '' && !canJoin(prev, this.tokens[i])) {
            want = ' ';
            if (prev.type === 'comment' || this.tokens[i].type === 'comment') {
                return;
            }
        }
        this.tokens[i].before = want;
    }

    // ---- analysis ------------------------------------------------------------------------------

    private computeStructure(): void {
        const stack: number[] = [];
        const top = () => (stack.length ? stack[stack.length - 1] : -1);
        this.tokens.forEach((t, i) => {
            if (t.type === 'op' && t.text in OPENERS) {
                this.parent[i] = top();
                stack.push(i);
                return;
            }
            if (t.type === 'op' && CLOSERS.has(t.text)) {
                let k = stack.length - 1;
                while (k >= 0 && OPENERS[this.tokens[stack[k]].text] !== t.text) {
                    k--;
                }
                if (k >= 0) {
                    const open = stack[k];
                    stack.length = k;
                    this.match[open] = i;
                    this.match[i] = open;
                }
            }
            this.parent[i] = top();
        });
    }

    private classifyBlocks(): void {
        this.tokens.forEach((t, i) => {
            if (t.type === 'op' && t.text === '{') {
                this.blocks.set(i, this.classify(i));
            }
        });
    }

    /** Collect the depth-0 tokens of the statement header that ends in the `{` at `brace`. */
    private header(brace: number): number[] {
        const out: number[] = [];
        let j = brace - 1;
        while (j >= 0) {
            const t = this.tokens[j];
            if (t.type === 'openTag' || t.type === 'closeTag' || t.type === 'html' || this.isOp(j, ';', '{', '}')) {
                break;
            }
            if (this.isOpener(j)) {
                break;
            }
            if (this.isOp(j, ')', ']')) {
                const open = this.match[j];
                if (open < 0) {
                    out.push(j);
                    j--;
                    continue;
                }
                out.push(j, open);
                j = open - 1;
                continue;
            }
            out.push(j);
            j--;
        }
        return out.reverse();
    }

    private classify(brace: number): BlockInfo {
        const prev = this.tokens[brace - 1];
        if (!prev || this.isOp(brace - 1, '->', '?->', '::', '$', '\\') || prev.type === 'variable') {
            return { kind: 'unknown' };
        }
        const stmt = this.header(brace);
        const at = (k: number) => (k >= 0 && k < stmt.length ? stmt[k] : -1);
        const afterAccess = (k: number) => this.isOp(at(k - 1), '->', '?->', '::');

        for (let k = 0; k < stmt.length; k++) {
            const w = this.word(stmt[k]);
            if (!w || afterAccess(k)) {
                continue;
            }
            if (w === 'class') {
                const isNew = stmt.slice(0, k).some((idx) => this.isWord(idx, 'new'));
                return { kind: isNew ? 'anonymousClass' : 'class' };
            }
            if (CLASS_LIKE.has(w) && this.tokens[at(k + 1)]?.type === 'name') {
                return { kind: 'class' };
            }
            if (w === 'function') {
                let n = k + 1;
                if (this.isOp(at(n), '&')) {
                    n++;
                }
                return { kind: this.isOp(at(n), '(') ? 'closure' : 'function' };
            }
            if (CONTROL.has(w)) {
                return { kind: 'control', keyword: w };
            }
            if (w === 'match' && this.isOp(at(k + 1), '(')) {
                return { kind: 'match' };
            }
            if (w === 'namespace' && k === 0) {
                return { kind: 'namespace' };
            }
        }
        return { kind: 'unknown' };
    }

    private markFrozenRegions(): void {
        let frozen = false;
        this.tokens.forEach((t) => {
            if (t.type === 'comment' && /@formatter:on\b/.test(t.text)) {
                frozen = false;
            } else if (frozen) {
                t.frozen = true;
            }
            if (t.type === 'comment' && /@formatter:off\b/.test(t.text)) {
                frozen = true;
            }
        });
        this.trailingFrozen = frozen;
    }
}
