import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

mkdirSync("tmp", { recursive: true });
const cwd = mkdtempSync(resolve("tmp/deploy-security-"));
const script = resolve("scripts/deploy-cloudrun.mjs");
const image = "southamerica-west1-docker.pkg.dev/fixture-project/portal/app@sha256:" + "a".repeat(64);
const env = { ...process.env, CLOUD_RUN_PROJECT: "fixture-project", CLOUD_RUN_REGION: "southamerica-west1", CLOUD_RUN_SERVICE_ACCOUNT: "portal@fixture-project.iam.gserviceaccount.com", CLOUD_RUN_AUTH_SECRET: "AUTH_SESSION_SECRET:1", GOOGLE_OAUTH_CLIENT_ID: "fixture.apps.googleusercontent.com", APP_ORIGIN: "https://portal.example.com", CLOUD_RUN_IMAGE: image, CLOUD_RUN_ALLOW_UNAUTHENTICATED: "false", CLOUDSDK_CONFIG: join(cwd, "gcloud") };
const plan = overrides => spawnSync(process.execPath, [script, "--dry-run"], { cwd, env: { ...env, ...overrides }, encoding: "utf8" });

test("deployment requires an immutable image and scans that same digest before deploying privately", () => {
  const result = plan({});
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.ok(config.securityScan.args.includes(image));
  assert.ok(config.securityScan.args.includes("HIGH,CRITICAL"));
  assert.equal(config.securityScan.args[config.securityScan.args.indexOf("--exit-code") + 1], "1");
  assert.ok(config.deployment.args.includes("--no-allow-unauthenticated"));
  assert.ok(!config.deployment.args.includes("--source"));
  assert.equal(config.deployment.args[config.deployment.args.indexOf("--image") + 1], image);
});

test("mutable images, public defaults and absent security configuration block deployment", () => {
  for (const overrides of [{ CLOUD_RUN_IMAGE: "" }, { CLOUD_RUN_IMAGE: image.split("@")[0] + ":latest" }, { CLOUD_RUN_ALLOW_UNAUTHENTICATED: "true", CLOUD_RUN_PUBLIC_ACCESS_REASON: "" }, { APP_ORIGIN: "http://portal.example.com" }, { CLOUD_RUN_SERVICE_ACCOUNT: "" }]) assert.notEqual(plan(overrides).status, 0);
});

test("SAST reports fail closed on findings, failed scans and missing evidence", () => {
  const checker = resolve("scripts/check-sast-report.mjs");
  assert.notEqual(spawnSync(process.execPath, [checker], { cwd }).status, 0);
  for (const [report, expected] of [
    [{ scan: { status: "success" }, vulnerabilities: [] }, 0],
    [{ scan: { status: "success" }, vulnerabilities: [{ severity: "High" }] }, 1],
    [{ scan: { status: "failure" }, vulnerabilities: [] }, 1],
  ]) {
    writeFileSync(join(cwd, "gl-sast-report.json"), JSON.stringify(report));
    assert.equal(spawnSync(process.execPath, [checker], { cwd }).status, expected);
  }
});
