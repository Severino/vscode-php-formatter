import { OPTION_SCHEMA, expandDefaults, getPath, setPath } from './schema';

export type BraceStyle = 'same-line' | 'new-line';

export interface FormatOptions {
    indent: { style: 'editor' | 'spaces' | 'tabs'; size: number; switchCases: boolean; continuationLevels: number };
    lineEnding: 'auto' | 'lf' | 'crlf';
    finalNewline: 'none' | 'single' | 'keep';
    braces: {
        classes: BraceStyle;
        anonymousClasses: BraceStyle;
        functions: BraceStyle;
        sameLineAfterMultilineParameters: boolean;
        closures: BraceStyle;
        controlStructures: BraceStyle;
    };
    controlStructures: { elseKeyword: BraceStyle; catchFinallyKeyword: BraceStyle; doWhileKeyword: BraceStyle };
    spaces: {
        afterControlKeyword: boolean;
        beforeFunctionDeclarationParen: boolean;
        beforeClosureParen: boolean;
        beforeArrowFunctionParen: boolean;
        beforeClosureUseParen: boolean;
        beforeFunctionCallParen: boolean;
        withinParentheses: boolean;
        withinBrackets: boolean;
        withinBraces: boolean;
        beforeComma: boolean;
        afterComma: boolean;
        beforeSemicolon: boolean;
        afterSemicolonInFor: boolean;
        aroundAssignment: boolean;
        aroundComparison: boolean;
        aroundLogical: boolean;
        aroundArithmetic: boolean;
        aroundBitwise: boolean;
        aroundConcat: boolean;
        aroundNullCoalescing: boolean;
        aroundTernary: boolean;
        aroundDoubleArrow: boolean;
        aroundObjectOperator: boolean;
        afterCast: boolean;
        afterNot: boolean;
        beforeReturnTypeColon: boolean;
        afterReturnTypeColon: boolean;
    };
    blankLines: { maxConsecutive: number; removeAtBlockEdges: boolean; afterNamespace: boolean; afterUseImports: boolean; enforceBetweenFunctions: boolean; betweenFunctions: number };
    comments: { reindentDocBlocks: boolean; trimTrailingWhitespace: boolean };
    disabledRules: string[];
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K] };

/** Information the host editor knows about the current file. */
export interface FormatEnvironment {
    insertSpaces?: boolean;
    tabSize?: number;
    /** Line ending of the document, used when `lineEnding` is `auto`. */
    eol?: '\n' | '\r\n';
}

export const DEFAULT_OPTIONS = expandDefaults() as unknown as FormatOptions;

/**
 * Merge a (possibly partial / untrusted) options object over the defaults.
 * Every value is validated against the schema; invalid values fall back to the default.
 */
export function resolveOptions(partial?: unknown): FormatOptions {
    const out: Record<string, unknown> = {};
    for (const [path, spec] of Object.entries(OPTION_SCHEMA)) {
        const raw = getPath(partial, path);
        let value: unknown = spec.default;
        if (spec.type === 'boolean' && typeof raw === 'boolean') {
            value = raw;
        } else if (spec.type === 'string' && typeof raw === 'string' && (!spec.enum || spec.enum.includes(raw))) {
            value = raw;
        } else if (spec.type === 'number' && typeof raw === 'number' && Number.isFinite(raw)) {
            value = Math.min(spec.maximum ?? Infinity, Math.max(spec.minimum ?? -Infinity, Math.round(raw)));
        } else if (spec.type === 'array' && Array.isArray(raw)) {
            value = raw.filter((v) => typeof v === 'string');
        }
        setPath(out, path, Array.isArray(value) ? [...value] : value);
    }
    return out as unknown as FormatOptions;
}

/** Build options from a flat key lookup such as `(path) => workspaceConfig.get(path)`. */
export function optionsFromGetter(get: (path: string) => unknown): FormatOptions {
    const flat: Record<string, unknown> = {};
    for (const path of Object.keys(OPTION_SCHEMA)) {
        setPath(flat, path, get(path));
    }
    return resolveOptions(flat);
}
