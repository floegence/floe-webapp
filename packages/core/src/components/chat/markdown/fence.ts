/** A matching CommonMark fence, independent of whether streaming has ended. */
export function isClosedMarkdownFence(raw: string): boolean {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const opening = lines[0]?.match(/^[ ]{0,3}(\x60{3,}|~{3,})/);
  if (!opening) return false;
  const fence = opening[1]!;
  return lines.slice(1).some(line => {
    const close = line.match(/^[ ]{0,3}(\x60+|~+)[ \t]*$/)?.[1];
    return !!close && close[0] === fence[0] && close.length >= fence.length;
  });
}
