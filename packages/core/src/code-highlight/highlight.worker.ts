import { tokenizeCode } from './tokenize';
import type { CodeColorRequest, CodeColorResponse } from './tokens';

addEventListener('message', async ({ data }: MessageEvent<CodeColorRequest>) => {
  let tokens: CodeColorResponse['tokens'] = null;
  try { tokens = await tokenizeCode(data.code, data.language); } catch { /* Keep the original readable source. */ }
  postMessage({ id: data.id, tokens } satisfies CodeColorResponse);
});
