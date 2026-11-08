// Escapes user input before it is embedded in a RegExp, so a search box cannot
// inject regex syntax or cause catastrophic backtracking.
export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
