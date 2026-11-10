import { lex } from './lexer';

const LINE_BREAK = /\r\n|\n|\r/;

/**
 * Everything that must survive formatting: the ordered list of tokens (type + text).
 * Whitespace between tokens is ignored; inside comments only per-line leading/trailing
 * whitespace is ignored (doc-block re-alignment and trimming are allowed).
 */
export function signature(source: string): string[] {
    return lex(source).tokens.map((t) =>
        t.type === 'comment' ? `comment:${t.text.split(LINE_BREAK).map((l) => l.trim()).join('\n')}` : `${t.type}:${t.text}`,
    );
}

export function isEquivalent(a: string, b: string): boolean {
    const sa = signature(a);
    const sb = signature(b);
    return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}
