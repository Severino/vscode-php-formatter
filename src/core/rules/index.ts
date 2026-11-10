import { Rule } from '../rule';
import { bracesRule } from './braces';
import { blankLinesRule } from './blank-lines';
import { commentCleanupRule } from './comment-cleanup';
import { controlKeywordPlacementRule } from './control-keyword-placement';
import { functionBlankLinesRule } from './function-blank-lines';
import { finalNewlineRule } from './final-newline';
import { indentationRule } from './indentation';
import { keywordSpacingRule } from './keyword-spacing';
import { operatorSpacingRule } from './operator-spacing';
import { parenthesisSpacingRule } from './parenthesis-spacing';
import { punctuationSpacingRule } from './punctuation-spacing';
import { whitespaceNormalizationRule } from './whitespace-normalization';

/**
 * Rules run in this order. Structural rules (line breaks) come first, then horizontal spacing,
 * then blank-line limits, and finally indentation, which depends on the final line structure.
 */
export const defaultRules: readonly Rule[] = [
    bracesRule,
    controlKeywordPlacementRule,
    keywordSpacingRule,
    parenthesisSpacingRule,
    punctuationSpacingRule,
    operatorSpacingRule,
    whitespaceNormalizationRule,
    blankLinesRule,
    functionBlankLinesRule,
    commentCleanupRule,
    indentationRule,
    finalNewlineRule,
];
