/** Explicit, reviewable declarations used by the architecture suite. */
export interface PublicEntry {
  entry: string;
  consumers: string[];
  line: number;
}

/** Read only table rows in the normative Public entry points section. */
export function publicEntries(markdown: string): PublicEntry[] {
  const result: PublicEntry[] = [];
  let active = false;
  let level = 0;
  let fenced = false;
  for (const [offset, line] of markdown.split(/\r?\n/).entries()) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      if (heading[2] === 'Public entry points') {
        active = true;
        level = heading[1].length;
      } else if (heading[1].length <= level) active = false;
      continue;
    }
    if (!active) continue;
    const row = /^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*$/.exec(line);
    if (row) {
      result.push({
        entry: row[1].replace(/\/$/, '').replace(/\/index\.ts$/, ''),
        consumers: [...row[2].matchAll(/`([^`]+)`/g)].map((match) => match[1]),
        line: offset + 1,
      });
    }
  }
  return result;
}
