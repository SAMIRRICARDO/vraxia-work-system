import type Anthropic from "@anthropic-ai/sdk";
import { calculateCost } from "./costs.js";
import { recordAnalytics } from "../memory/analytics.js";

export function recordClaudeMessageUsage(source: string, model: string, response: Anthropic.Message) {
  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: (response.usage as any).cache_read_input_tokens ?? 0,
    cacheCreationTokens: (response.usage as any).cache_creation_input_tokens ?? 0,
  };
  const cost = calculateCost(model, usage);

  recordAnalytics({
    provider: "claude",
    source,
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    estimatedCostUsd: cost.totalCost,
    estimatedSavingsUsd: cost.savings,
    requests: 1,
    cacheHits: usage.cacheReadTokens > 0 ? 1 : 0,
    metadata: {
      cacheReadTokens: usage.cacheReadTokens,
      cacheCreationTokens: usage.cacheCreationTokens,
    },
  });
}
