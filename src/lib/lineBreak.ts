// Japanese line-breaking rules (JIS X 4051 kinsoku): closing punctuation, small
// kana and the long-vowel mark never start a line; opening brackets never end one.
const NO_LINE_START = new Set(
  Array.from(
    '。、，．・：；？！?!ー…‥」』）］｝〕〉》】〟’”ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ々',
  ),
);
const NO_LINE_END = new Set(Array.from('「『（［｛〔〈《【〝‘“'));

export function groupForLineBreaks<T>(items: T[], textOf: (item: T) => string): T[][] {
  const groups: T[][] = [];
  let prevText = '';
  for (const item of items) {
    const text = textOf(item);
    const glue =
      groups.length > 0 && (NO_LINE_START.has(text[0]) || NO_LINE_END.has(prevText.slice(-1)));
    if (glue) groups[groups.length - 1].push(item);
    else groups.push([item]);
    prevText = text;
  }
  return groups;
}
