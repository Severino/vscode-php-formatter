import { FormatContext } from './context';

/**
 * A formatting rule. Rules run in order and only adjust whitespace / comment text through
 * the `FormatContext` helpers. See README ("Adding a rule").
 */
export interface Rule {
    /** Stable id, usable in the `disabledRules` option. */
    readonly id: string;
    readonly description: string;
    apply(ctx: FormatContext): void;
}
