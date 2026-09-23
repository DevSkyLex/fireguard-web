/**
 * Function findHtmlTagClose
 * @function findHtmlTagClose
 * @description Finds the end of a serialized HTML tag without treating quoted `>` characters as delimiters.
 * @access public
 * @since 1.0.0
 * @param {string} html - Serialized editor content.
 * @param {number} open - Index of the opening `<` character.
 * @returns {number} Index of the closing `>` or -1 when the tag is unterminated.
 */
export function findHtmlTagClose(html: string, open: number): number {
  let quote: '"' | "'" | null = null;

  for (let index = open + 1; index < html.length; index++) {
    const character = html[index];
    if (quote !== null) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }

  return -1;
}
