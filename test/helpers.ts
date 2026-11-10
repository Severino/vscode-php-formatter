import * as fs from 'fs';
import * as path from 'path';
import { DeepPartial, FormatOptions, OPTION_SCHEMA, formatPhpEdits } from '../src/core';
import { lex } from '../src/core/lexer';

export const FIXTURE_DIR = path.join(__dirname, '..', '..', 'test', 'fixtures');

export function fixtures(): { name: string; source: string }[] {
    return fs
        .readdirSync(FIXTURE_DIR)
        .filter((f) => f.endsWith('.php'))
        .map((name) => ({ name, source: fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8') }));
}

/** Format with LF endings and 4-space indentation unless overridden. */
export function fmt(source: string, options: DeepPartial<FormatOptions> = {}): string {
    const result = formatPhpEdits(source, { lineEnding: 'lf', ...options }, { insertSpaces: true, tabSize: 4 });
    if (!result.ok) {
        throw new Error(result.reason);
    }
    return result.text;
}

/** Wraps a snippet in a PHP tag and returns only the formatted body. */
export function fmtBody(body: string, options: DeepPartial<FormatOptions> = {}): string {
    return fmt('<?php\n' + body, options).slice('<?php\n'.length).replace(/\n$/, '');
}

export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Random but valid option set drawn from the schema. */
export function randomOptions(rand: () => number): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, spec] of Object.entries(OPTION_SCHEMA)) {
        if (spec.type === 'boolean') {
            out[key] = rand() < 0.5;
        } else if (spec.enum) {
            out[key] = spec.enum[Math.floor(rand() * spec.enum.length)];
        } else if (spec.type === 'number') {
            out[key] = Math.floor((spec.minimum ?? 0) + rand() * ((spec.maximum ?? 4) - (spec.minimum ?? 0) + 1));
        }
    }
    return unflatten(out);
}

function unflatten(flat: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(flat)) {
        const parts = key.split('.');
        let node = out;
        for (const p of parts.slice(0, -1)) {
            node = node[p] ??= {};
        }
        node[parts[parts.length - 1]] = value;
    }
    return out;
}

const EXTRA_WS = ['', ' ', '  ', '\n', '\n\n\n\n', '\t', ' \n   ', '\r\n'];

/** Adds random extra whitespace between tokens (never removes any), which can never change the code. */
export function fuzzWhitespace(source: string, rand: () => number): string {
    const { tokens, trailing } = lex(source);
    let out = '';
    for (const t of tokens) {
        const extra = t.type === 'html' || t.type === 'openTag' || rand() < 0.6 ? '' : EXTRA_WS[Math.floor(rand() * EXTRA_WS.length)];
        out += t.before + extra + t.text;
    }
    return out + trailing;
}
