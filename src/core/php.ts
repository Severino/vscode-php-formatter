/** Reserved words and modifiers: a name in this set is never the end of an operand. */
export const KEYWORDS = new Set([
    'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch', 'class', 'clone', 'const', 'continue',
    'declare', 'default', 'do', 'echo', 'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach', 'endif',
    'endswitch', 'endwhile', 'eval', 'exit', 'die', 'extends', 'final', 'finally', 'fn', 'for', 'foreach', 'from',
    'function', 'global', 'goto', 'if', 'implements', 'include', 'include_once', 'instanceof', 'insteadof',
    'interface', 'isset', 'list', 'match', 'namespace', 'new', 'or', 'print', 'private', 'protected', 'public',
    'readonly', 'require', 'require_once', 'return', 'static', 'switch', 'throw', 'trait', 'try', 'unset', 'use',
    'var', 'while', 'xor', 'yield',
]);

/** Keywords that are followed by a parenthesised condition. */
export const CONTROL_PAREN_KEYWORDS = new Set(['if', 'elseif', 'while', 'for', 'foreach', 'switch', 'catch', 'match']);

/** Language constructs that look like function calls. */
export const CALL_LIKE = new Set(['array', 'list', 'isset', 'unset', 'empty', 'exit', 'die', 'eval']);

export const OPENERS: Record<string, string> = { '(': ')', '[': ']', '#[': ']', '{': '}' };
export const CLOSERS = new Set([')', ']', '}']);
