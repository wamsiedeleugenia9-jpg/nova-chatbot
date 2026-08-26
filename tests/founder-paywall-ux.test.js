const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const page = readFileSync(join(__dirname, "..", "pages", "index.jsx"), "utf8");
const accessApi = readFileSync(join(__dirname, "..", "pages", "api", "access-status.js"), "utf8");
const restoreHistory = page.slice(
  page.indexOf("async function restoreHistory()"),
  page.indexOf("restoreHistory();")
);

test("non-entitled users are identified before chat history is requested", () => {
  const accessRequest = restoreHistory.indexOf('fetch("/api/access-status", { headers })');
  const entitlementGuard = restoreHistory.indexOf("if (!accessPayload.entitled) return;");
  const historyRequest = restoreHistory.indexOf('fetch("/api/chat", { headers })');

  assert.ok(accessRequest >= 0);
  assert.ok(entitlementGuard > accessRequest);
  assert.ok(historyRequest > entitlementGuard);
  assert.doesNotMatch(restoreHistory, /Promise\.all/);
});

test("non-entitled users see checkout, no history error, and cannot send chat", () => {
  assert.match(page, /accessStatus && !accessStatus\.entitled[\s\S]*EWA AI Founder[\s\S]*€17\/month[\s\S]*Devino Founder/);
  assert.match(page, /if \(!msg \|\| loading \|\| !accessStatus\?\.entitled\) return;/);
  assert.match(page, /disabled=\{historyLoading \|\| !!historyError \|\| !accessStatus\?\.entitled\}/);
  assert.match(page, /placeholder=\{accessStatus\?\.entitled \? "Cere hook-uri, CTA-uri, scenarii\.\.\." : "Abonament Founder necesar"\}/);

  const guard = restoreHistory.indexOf("if (!accessPayload.entitled) return;");
  const historyError = restoreHistory.indexOf("setHistoryError(");
  assert.ok(historyError > guard, "history errors can only be produced after the entitlement guard");
});

test("entitled and admin users retain history and do not see checkout", () => {
  assert.match(accessApi, /entitled: authorization\.allowed, admin: authorization\.access\.role === "admin"/);
  assert.match(restoreHistory, /if \(!accessPayload\.entitled\) return;[\s\S]*fetch\("\/api\/chat", \{ headers \}\)/);
  assert.match(page, /accessStatus && !accessStatus\.entitled/);
  assert.doesNotMatch(page, /accessStatus\?\.admin\s*&&/);
});
