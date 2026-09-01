const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const restoreChatHistory = require("../lib/chat/restoreHistory");

const page = readFileSync(join(__dirname, "..", "pages", "index.jsx"), "utf8");
const accessApi = readFileSync(join(__dirname, "..", "pages", "api", "access-status.js"), "utf8");

function response(ok, payload) {
  return { ok, json: async () => payload };
}

test("authenticated non-entitled users skip history and return the paywall state", async () => {
  const requests = [];
  const result = await restoreChatHistory({
    accessToken: "token",
    fetchImpl: async url => {
      requests.push(url);
      return response(true, { entitled: false, admin: false });
    }
  });

  assert.deepEqual(requests, ["/api/access-status"]);
  assert.deepEqual(result, { access: { entitled: false, admin: false }, messages: null });
  assert.match(page, /if \(!result\.access\.entitled\) \{[\s\S]*setHistoryError\(""\)/);
  assert.match(page, /setHistoryError\(""\);[\s\S]*setInitializationError\(""\);[\s\S]*setAccessStatus\(null\);[\s\S]*setHistoryLoading\(true\)/);
  assert.match(page, /accessStatus && !accessStatus\.entitled[\s\S]*EWA AI Founder[\s\S]*€17\/month[\s\S]*Devino Founder/);
  assert.match(page, /if \(!msg \|\| loading \|\| !accessStatus\?\.entitled\) return;/);
  assert.match(page, /placeholder=\{accessStatus\?\.entitled \? "Cere hook-uri, CTA-uri, scenarii\.\.\." : "Abonament Founder necesar"\}/);
});

test("entitled Founder users load history normally", async () => {
  const requests = [];
  const result = await restoreChatHistory({
    accessToken: "token",
    fetchImpl: async url => {
      requests.push(url);
      return url === "/api/access-status"
        ? response(true, { entitled: true, admin: false })
        : response(true, { messages: [{ role: "assistant", content: "saved" }] });
    }
  });

  assert.deepEqual(requests, ["/api/access-status", "/api/chat"]);
  assert.equal(result.messages[0].content, "saved");
});

test("a genuine history failure for an entitled user remains an error", async () => {
  await assert.rejects(
    restoreChatHistory({
      accessToken: "token",
      fetchImpl: async url => url === "/api/access-status"
        ? response(true, { entitled: true, admin: false })
        : response(false, { error: "database_unavailable" })
    }),
    /database_unavailable/
  );
  assert.match(page, /if \(error\.stage === "history"\) \{[\s\S]*setHistoryError\("Nu am putut incarca istoricul conversatiei/);
});

test("access-status failures cannot be mislabeled as history failures", async () => {
  const requests = [];
  await assert.rejects(
    restoreChatHistory({
      accessToken: "token",
      fetchImpl: async url => {
        requests.push(url);
        return response(false, { error: "access_status_failed" });
      }
    }),
    error => error.message === "access_status_failed" && error.stage === "access"
  );

  assert.deepEqual(requests, ["/api/access-status"]);
  assert.match(page, /if \(error\.stage === "history"\)[\s\S]*else \{[\s\S]*setInitializationError/);
});

test("admin bypass receives the same normal history path", async () => {
  const requests = [];
  const result = await restoreChatHistory({
    accessToken: "admin-token",
    fetchImpl: async url => {
      requests.push(url);
      return url === "/api/access-status"
        ? response(true, { entitled: true, admin: true })
        : response(true, { messages: [] });
    }
  });

  assert.deepEqual(requests, ["/api/access-status", "/api/chat"]);
  assert.equal(result.access.admin, true);
  assert.match(accessApi, /entitled: authorization\.allowed === true, admin: authorization\.access\.role === "admin"/);
  assert.doesNotMatch(page, /accessStatus\?\.admin\s*&&/);
});

test("auth changes invalidate stale history requests", () => {
  assert.match(page, /historyRequestRef\.current \+= 1;[\s\S]*setMessages\(\[\]\);[\s\S]*setHistoryError\(""\);[\s\S]*setAccessStatus\(null\)/);
  assert.match(page, /const requestId = \+\+historyRequestRef\.current;/);
  assert.match(page, /active && historyRequestRef\.current === requestId/);
});
