import { FormatContext } from './context';
import { lex } from './lexer';
import { DeepPartial, FormatEnvironment, FormatOptions, resolveOptions } from './options';
import { Rule } from './rule';
import { defaultRules } from './rules';
import { isEquivalent } from './verify';

export interface TextEdit {
    start: number;
    end: number;
    newText: string;
    /** Offset of the token the edit belongs to; used for range formatting. */
    anchor: number;
}

export interface FormatResult {
    /** Formatted text (equals the input when `ok` is false or nothing changed). */
    text: string;
    edits: TextEdit[];
    /** False when formatting was aborted because it would have changed the code. */
    ok: boolean;
    reason?: string;
}

export function applyEdits(source: string, edits: readonly TextEdit[]): string {
    let out = '';
    let pos = 0;
    for (const e of [...edits].sort((a, b) => a.start - b.start)) {
        out += source.slice(pos, e.start) + e.newText;
        pos = e.end;
    }
    return out + source.slice(pos);
}

export class PhpFormatter {
    private readonly rules: Rule[];

    constructor(rules: readonly Rule[] = defaultRules) {
        this.rules = [...rules];
    }

    /** Returns a formatter with `rule` inserted before the rule with id `before` (or appended). */
    withRule(rule: Rule, before?: string): PhpFormatter {
        const rules = [...this.rules];
        const at = before ? rules.findIndex((r) => r.id === before) : -1;
        rules.splice(at < 0 ? rules.length : at, 0, rule);
        return new PhpFormatter(rules);
    }

    get ruleIds(): string[] {
        return this.rules.map((r) => r.id);
    }

    /**
     * Compute the whitespace edits for `source`. The result is verified: if the formatted text
     * does not have exactly the same tokens as the input, no edits are returned.
     */
    format(source: string, options?: DeepPartial<FormatOptions>, env: FormatEnvironment = {}): FormatResult {
        const resolved = resolveOptions(options);
        try {
            const lexed = lex(source);
            const ctx = new FormatContext(source, lexed, resolved, env);
            for (const rule of this.rules) {
                if (!resolved.disabledRules.includes(rule.id)) {
                    rule.apply(ctx);
                }
            }
            const edits = collectEdits(ctx);
            const text = applyEdits(source, edits);
            if (!isEquivalent(source, text)) {
                return { text: source, edits: [], ok: false, reason: 'Formatting would have changed the code; the file was left untouched.' };
            }
            return { text, edits, ok: true };
        } catch (error) {
            return { text: source, edits: [], ok: false, reason: `Formatter error: ${error instanceof Error ? error.message : String(error)}` };
        }
    }
}

function collectEdits(ctx: FormatContext): TextEdit[] {
    const edits: TextEdit[] = [];
    for (const t of ctx.tokens) {
        if (t.before !== t.origBefore) {
            edits.push({ start: t.start, end: t.start + t.origBefore.length, newText: t.before, anchor: t.textStart });
        }
        if (t.text !== t.origText) {
            edits.push({ start: t.textStart, end: t.textStart + t.origText.length, newText: t.text, anchor: t.textStart });
        }
    }
    if (ctx.trailing !== ctx.source.slice(ctx.trailingStart)) {
        edits.push({ start: ctx.trailingStart, end: ctx.source.length, newText: ctx.trailing, anchor: ctx.trailingStart });
    }
    return edits;
}

const defaultFormatter = new PhpFormatter();

export function formatPhp(source: string, options?: DeepPartial<FormatOptions>, env?: FormatEnvironment): string {
    return defaultFormatter.format(source, options, env).text;
}

export function formatPhpEdits(source: string, options?: DeepPartial<FormatOptions>, env?: FormatEnvironment): FormatResult {
    return defaultFormatter.format(source, options, env);
}
