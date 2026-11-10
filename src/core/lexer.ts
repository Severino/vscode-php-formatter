export type TokenType =
    | 'html'
    | 'openTag'
    | 'closeTag'
    | 'comment'
    | 'string'
    | 'heredoc'
    | 'variable'
    | 'name'
    | 'number'
    | 'cast'
    | 'op';

/**
 * A token plus the whitespace that precedes it (`before`).
 * Joining `before + text` of all tokens and `trailing` reproduces the source exactly.
 * `orig*` fields keep the lexed values so the formatter can emit minimal edits.
 */
export interface Token {
    type: TokenType;
    text: string;
    before: string;
    /** Offset where `before` starts. */
    start: number;
    /** Offset where `text` starts. */
    textStart: number;
    readonly origBefore: string;
    readonly origText: string;
    /** Set for tokens inside a `@formatter:off` region. */
    frozen: boolean;
}

export interface LexResult {
    tokens: Token[];
    trailing: string;
    trailingStart: number;
}

const OPEN_TAG = /<\?(?:php(?=\s|$)|=)/gi;
const NAME = /\\?[A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*(?:\\[A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*)*/y;
const VARIABLE = /\$[A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*/y;
const NUMBER = /0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?/y;
const CAST = /\([ \t]*(?:int|integer|bool|boolean|float|double|real|string|array|object|unset|binary)[ \t]*\)/iy;
const HEREDOC = /<<<[ \t]*(?:"([A-Za-z_]\w*)"|'([A-Za-z_]\w*)'|([A-Za-z_]\w*))\r?\n/y;
const OPS3 = new Set(['**=', '...', '<=>', '===', '!==', '<<=', '>>=', '??=', '?->']);
const OPS2 = new Set([
    '**', '++', '--', '->', '=>', '::', '==', '!=', '<>', '<=', '>=', '&&', '||', '??',
    '+=', '-=', '*=', '/=', '.=', '%=', '&=', '|=', '^=', '<<', '>>', '#[',
]);

const isWs = (c: number) => c === 32 || c === 9 || c === 10 || c === 13 || c === 12 || c === 11;
const isNewline = (ch: string | undefined) => ch === '\n' || ch === '\r';

function matchAt(re: RegExp, src: string, pos: number): RegExpExecArray | null {
    re.lastIndex = pos;
    return re.exec(src);
}

/** Skips a `{$ ... }` / `${ ... }` interpolation, returning the index after the closing brace. */
function skipInterpolation(src: string, pos: number): number {
    let depth = 0;
    let i = pos;
    while (i < src.length) {
        const ch = src[i];
        if (ch === '{') {
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0) {
                return i + 1;
            }
        } else if (ch === "'" || ch === '"') {
            i = scanQuoted(src, i, ch) - 1;
        }
        i++;
    }
    return src.length;
}

/** Returns the index after the closing quote (or end of input when unterminated). */
function scanQuoted(src: string, start: number, quote: string): number {
    let i = start + 1;
    while (i < src.length) {
        const ch = src[i];
        if (ch === '\\') {
            i += 2;
        } else if (ch === quote) {
            return i + 1;
        } else if (quote !== "'" && (ch === '{' && src[i + 1] === '$' || ch === '$' && src[i + 1] === '{')) {
            i = skipInterpolation(src, ch === '{' ? i : i + 1);
        } else {
            i++;
        }
    }
    return src.length;
}

function lexPhpToken(src: string, s: number): { type: TokenType; end: number } {
    const n = src.length;
    const c = src[s];
    const c2 = src[s + 1];

    if (c === '?' && c2 === '>') {
        let e = s + 2;
        if (src[e] === '\r' && src[e + 1] === '\n') {
            e += 2;
        } else if (isNewline(src[e])) {
            e += 1;
        }
        return { type: 'closeTag', end: e };
    }
    if ((c === '/' && c2 === '/') || (c === '#' && c2 !== '[')) {
        let e = s;
        while (e < n && !isNewline(src[e]) && !(src[e] === '?' && src[e + 1] === '>')) {
            e++;
        }
        return { type: 'comment', end: e };
    }
    if (c === '/' && c2 === '*') {
        const close = src.indexOf('*/', s + 2);
        return { type: 'comment', end: close < 0 ? n : close + 2 };
    }
    if (c === "'" || c === '"' || c === '`') {
        return { type: 'string', end: scanQuoted(src, s, c) };
    }
    if (c === '<' && c2 === '<') {
        const m = matchAt(HEREDOC, src, s);
        if (m) {
            const id = m[1] ?? m[2] ?? m[3];
            const bodyStart = s + m[0].length;
            const closing = new RegExp('^[ \\t]*' + id + '(?![\\w\\u0080-\\uffff])', 'm').exec(src.slice(bodyStart));
            return { type: 'heredoc', end: closing ? bodyStart + closing.index + closing[0].length : n };
        }
    }
    if (c === '$') {
        const m = matchAt(VARIABLE, src, s);
        if (m) {
            return { type: 'variable', end: s + m[0].length };
        }
    }
    if (c === '(') {
        const m = matchAt(CAST, src, s);
        if (m) {
            return { type: 'cast', end: s + m[0].length };
        }
    }
    const name = matchAt(NAME, src, s);
    if (name) {
        return { type: 'name', end: s + name[0].length };
    }
    if ((c >= '0' && c <= '9') || (c === '.' && c2 >= '0' && c2 <= '9')) {
        const m = matchAt(NUMBER, src, s);
        if (m) {
            return { type: 'number', end: s + m[0].length };
        }
    }
    if (OPS3.has(src.substr(s, 3))) {
        return { type: 'op', end: s + 3 };
    }
    if (OPS2.has(src.substr(s, 2))) {
        return { type: 'op', end: s + 2 };
    }
    return { type: 'op', end: s + 1 };
}

export function lex(src: string): LexResult {
    const tokens: Token[] = [];
    const n = src.length;
    let prevEnd = 0;
    let mode: 'html' | 'php' = 'html';

    const emit = (type: TokenType, textStart: number, end: number) => {
        const text = src.slice(textStart, end);
        const before = src.slice(prevEnd, textStart);
        tokens.push({ type, text, before, start: prevEnd, textStart, origBefore: before, origText: text, frozen: false });
        prevEnd = end;
    };

    while (prevEnd < n) {
        if (mode === 'html') {
            OPEN_TAG.lastIndex = prevEnd;
            const m = OPEN_TAG.exec(src);
            if (!m) {
                emit('html', prevEnd, n);
                break;
            }
            if (m.index > prevEnd) {
                emit('html', prevEnd, m.index);
            }
            emit('openTag', m.index, m.index + m[0].length);
            mode = 'php';
            continue;
        }
        let s = prevEnd;
        while (s < n && isWs(src.charCodeAt(s))) {
            s++;
        }
        if (s >= n) {
            break;
        }
        const { type, end } = lexPhpToken(src, s);
        emit(type, s, end);
        if (type === 'closeTag') {
            mode = 'html';
        }
    }
    return { tokens, trailing: src.slice(prevEnd), trailingStart: prevEnd };
}

const joinCache = new Map<string, boolean>();

/**
 * True when `a` directly followed by `b` (no whitespace) still lexes as exactly those two tokens.
 * Prevents rules from fusing tokens such as `1 . 2` -> `1.2` or `$a - -$b` -> `$a--$b`.
 */
export function canJoin(a: Token, b: Token): boolean {
    const unsafe = (t: Token) => t.type === 'html' || t.type === 'openTag' || t.type === 'closeTag' || t.type === 'comment';
    if (unsafe(a) || unsafe(b)) {
        return false;
    }
    if (a.type === 'string' || a.type === 'heredoc' || b.type === 'string' || b.type === 'heredoc') {
        return true;
    }
    const key = a.text + '\u0000' + b.text;
    let ok = joinCache.get(key);
    if (ok === undefined) {
        const toks = lex('<?php ' + a.text + b.text).tokens;
        ok = toks.length === 3 && toks[1].text === a.text && toks[2].text === b.text;
        joinCache.set(key, ok);
    }
    return ok;
}
