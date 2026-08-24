export const PRICE_CATALOG = {
  'deepseek-official/deepseek-v4-pro': {
    input: 0.435, cacheRead: 0.003625, output: 0.87,
    source: 'https://api-docs.deepseek.com/quick_start/pricing', effective: '2026-08-24', currency: 'USD',
  },
  'zai-coding-cn/glm-5.3': {
    input: 1.4, cacheRead: 0.26, output: 4.4,
    source: 'https://docs.z.ai/guides/overview/pricing', effective: '2026-08-24', currency: 'USD',
  },
};

export function estimate(route, tokens) {
  const price = PRICE_CATALOG[route];
  if (!price) return null;
  const usd = ((tokens.inputTokens + tokens.cacheWriteTokens) * price.input
    + tokens.cacheReadTokens * price.cacheRead
    + tokens.outputTokens * price.output) / 1_000_000;
  return { usd, price };
}
