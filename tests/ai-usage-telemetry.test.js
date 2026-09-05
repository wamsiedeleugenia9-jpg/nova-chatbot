const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { AI_FEATURES, recordAnthropicUsage } = require("../lib/server/aiUsage");

test("records only Anthropic accounting metadata for the authenticated user", async () => {
  const observed = {};
  const client = {
    from(table) {
      observed.table = table;
      return {
        async insert(row) {
          observed.row = row;
          return { error: null };
        }
      };
    }
  };

  const recorded = await recordAnthropicUsage({
    userId: "authenticated-user-id",
    feature: AI_FEATURES.CHAT,
    response: {
      id: "msg_01Pilot",
      model: "claude-sonnet-4-6",
      usage: { input_tokens: 123, output_tokens: 45 },
      content: [{ type: "text", text: "private generated content" }]
    },
    client
  });

  assert.equal(recorded, true);
  assert.equal(observed.table, "ai_usage_events");
  assert.deepEqual(observed.row, {
    user_id: "authenticated-user-id",
    feature: "chat",
    model: "claude-sonnet-4-6",
    input_tokens: 123,
    output_tokens: 45,
    provider_request_id: "msg_01Pilot"
  });
  assert.doesNotMatch(JSON.stringify(observed.row), /private generated content/);
});

test("telemetry persistence failure remains best-effort", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const recorded = await recordAnthropicUsage({
      userId: "authenticated-user-id",
      feature: AI_FEATURES.MEMORY,
      response: { id: "msg_failed", model: "claude-sonnet-4-6", usage: { input_tokens: 10, output_tokens: 2 } },
      client: { from: () => ({ insert: async () => ({ error: new Error("database unavailable") }) }) }
    });
    assert.equal(recorded, false);
  } finally {
    console.error = originalError;
  }
});

test("migration keeps telemetry inaccessible to browser database roles", () => {
  const migration = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260905010000_create_ai_usage_events.sql"), "utf8");
  assert.match(migration, /alter table public\.ai_usage_events enable row level security/);
  assert.match(migration, /revoke all on table public\.ai_usage_events from anon, authenticated/);
  assert.doesNotMatch(migration, /create policy/i);
  for (const column of ["user_id", "created_at", "feature", "model", "input_tokens", "output_tokens", "provider_request_id"]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`));
  }
});

test("every successful Anthropic response path records usage", () => {
  const chat = readFileSync(join(__dirname, "..", "pages", "api", "chat.js"), "utf8");
  const blueprint = readFileSync(join(__dirname, "..", "pages", "api", "blueprint.js"), "utf8");
  assert.equal((chat.match(/api\.anthropic\.com\/v1\/messages/g) || []).length, 2);
  assert.equal((chat.match(/recordAnthropicUsage\(/g) || []).length, 2);
  assert.equal((blueprint.match(/api\.anthropic\.com\/v1\/messages/g) || []).length, 2);
  assert.equal((blueprint.match(/recordAnthropicUsage\(/g) || []).length, 2);
  assert.match(blueprint, /AI_FEATURES\.BLUEPRINT_INTERPRETATION/);
  assert.match(blueprint, /AI_FEATURES\.BLUEPRINT_SUMMARY/);
  assert.match(blueprint, /AI_FEATURES\.CREATOR_DNA/);
});
