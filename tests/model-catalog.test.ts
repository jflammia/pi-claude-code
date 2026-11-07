import assert from "node:assert/strict";
import test from "node:test";
import {
  CLAUDE_CODE_MODELS,
  modelFromDiscovery,
  nativeModel,
  supportsNativeToolChanges,
} from "../src/model-catalog.ts";

test("fallback catalog matches Claude Code's selectable model families", () => {
  assert.deepEqual(
    CLAUDE_CODE_MODELS.map((model) => model.id),
    [
      "default",
      "claude-opus-5-5",
      "claude-fable-5-1",
      "claude-sonnet-5",
      "claude-haiku-4-5-20251001",
    ],
  );
  assert.equal(nativeModel("default"), "default");
  // Routed by the model the alias resolved to, keeping the 1M-context suffix.
  assert.equal(nativeModel("claude-opus-5-5"), "claude-opus-5-5[1m]");
  // An explicit model id is sent as that id. Claude Code repoints its family aliases ("sonnet",
  // "haiku") at newer models, so routing `claude-sonnet-5` through "sonnet" ran Sonnet 5.5.
  assert.equal(nativeModel("claude-sonnet-5"), "claude-sonnet-5");
  assert.equal(nativeModel("claude-haiku-4-5-20251001"), "claude-haiku-4-5-20251001");
  assert.equal(supportsNativeToolChanges("default"), true);
  assert.equal(supportsNativeToolChanges("claude-opus-5-5"), true);
  assert.equal(supportsNativeToolChanges("claude-fable-5-1"), true);
  assert.equal(supportsNativeToolChanges("claude-sonnet-5"), false);
});

test("never routes an explicit model id through a family alias that Claude Code may repoint", () => {
  for (const id of ["claude-sonnet-5", "claude-haiku-4-5-20251001", "claude-sonnet-5-5"]) assert.equal(nativeModel(id), id, id);
  // A catalog row that Claude Code serves with 1M context keeps it.
  assert.equal(nativeModel("claude-fable-5-1"), "claude-fable-5-1[1m]");
  assert.equal(nativeModel("claude-sonnet-5[1m]"), "claude-sonnet-5[1m]");
});

test("maps discovered aliases to stable canonical Pi model ids", () => {
  const opus = modelFromDiscovery({
    value: "opus[1m]",
    resolvedModel: "claude-opus-5-5[1m]",
    displayName: "Opus (1M context)",
    description: "Opus 5.5 with 1M context",
    supportsEffort: true,
    supportedEffortLevels: ["low", "high", "max"],
    supportsAdaptiveThinking: true,
  });
  assert.equal(opus.id, "claude-opus-5-5");
  assert.equal(opus.name, "Claude Opus 5.5");
  assert.equal(opus.contextWindow, 1_000_000);
  assert.deepEqual(opus.cost, { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 });
  assert.deepEqual(opus.thinkingLevelMap, {
    off: null,
    minimal: null,
    low: "low",
    medium: "medium",
    high: "high",
    xhigh: "xhigh",
    max: "max",
  });

  const future = modelFromDiscovery({
    value: "future",
    resolvedModel: "claude-future-1",
    displayName: "Future",
    description: "A newly available model",
  });
  assert.equal(future.id, "claude-future-1");
  assert.equal(future.cost.input, 0);
});
