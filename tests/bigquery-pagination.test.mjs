import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register("../scripts/test-typescript-loader.mjs", import.meta.url);

process.env.BIGQUERY_ACCESS_TOKEN = "test-access-token";
process.env.BIGQUERY_PROJECT_ID = "test-project";

const { fetchBigQuery, runQuery } = await import("../app/api/_shared/bigquery.ts");

test("runQuery follows BigQuery page tokens when pagination is enabled", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];

  globalThis.fetch = async (input, init = {}) => {
    requests.push({ input: String(input), init });
    if (requests.length === 1) {
      return Response.json({
        schema: { fields: [{ name: "value", type: "STRING" }] },
        rows: [{ f: [{ v: "one" }] }, { f: [{ v: "two" }] }],
        totalRows: "3",
        pageToken: "next-page",
        jobReference: { jobId: "job/with spaces", location: "us-east4" },
      });
    }
    return Response.json({ rows: [{ f: [{ v: "three" }] }] });
  };

  try {
    const result = await runQuery("SELECT value", [], { paginate: true, pageSize: 2 });
    assert.deepEqual(result.rows?.map((row) => row.f[0].v), ["one", "two", "three"]);
    assert.equal(result.pageToken, undefined);
    assert.equal(requests.length, 2);
    assert.match(requests[1].input, /queries\/job%2Fwith%20spaces\?/);
    assert.match(requests[1].input, /pageToken=next-page/);
    assert.match(requests[1].input, /maxResults=2/);
    assert.match(requests[1].input, /location=us-east4/);
    for (const request of requests) {
      assert.equal(new URL(request.input).origin, "https://bigquery.googleapis.com");
      assert.equal(request.init.redirect, "manual");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("configuration and pagination metadata cannot replace the Google origin or inject query parameters", async () => {
  const originalFetch = globalThis.fetch;
  const originalProject = process.env.BIGQUERY_PROJECT_ID;
  const projectId = "https://attacker.invalid/../../metadata";
  const jobId = "//attacker.invalid/jobs?redirect=http://169.254.169.254";
  const pageToken = "next&location=attacker#fragment";
  const location = "https://attacker.invalid/?token=secret";
  const requests = [];
  process.env.BIGQUERY_PROJECT_ID = projectId;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input);
    requests.push(url);
    assert.equal(url.origin, "https://bigquery.googleapis.com");
    assert.equal(url.username, "");
    assert.equal(url.password, "");
    assert.equal(url.hash, "");
    assert.equal(init.redirect, "manual");
    assert.match(url.pathname, new RegExp("^/bigquery/v2/projects/"));
    if (requests.length === 1) return Response.json({
      rows: [], pageToken, jobReference: { jobId, location },
    });
    assert.equal(url.pathname, `/bigquery/v2/projects/${encodeURIComponent(projectId)}/queries/${encodeURIComponent(jobId)}`);
    assert.equal(url.searchParams.get("pageToken"), pageToken);
    assert.equal(url.searchParams.get("location"), location);
    assert.deepEqual([...url.searchParams.keys()].sort(), ["location", "maxResults", "pageToken"]);
    return Response.json({ rows: [] });
  };
  try {
    await runQuery("SELECT value", [], { paginate: true });
    assert.equal(requests.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.BIGQUERY_PROJECT_ID = originalProject;
  }
});

test("pagination omits the region when BigQuery does not return one", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (input) => {
    requests += 1;
    if (requests === 1) return Response.json({ rows: [], pageToken: "next", jobReference: { jobId: "job-id" } });
    assert.equal(new URL(input).searchParams.has("location"), false);
    return Response.json({ rows: [] });
  };
  try { await runQuery("SELECT value", [], { paginate: true }); }
  finally { globalThis.fetch = originalFetch; }
});

test("a missing job ID or repeated page token stops pagination instead of returning incomplete data", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ rows: [], pageToken: "next" });
    await assert.rejects(runQuery("SELECT value", [], { paginate: true }), /sin jobId/);
    let requests = 0;
    globalThis.fetch = async () => {
      requests += 1;
      return Response.json({ rows: [], pageToken: "repeated", jobReference: { jobId: "job-id" } });
    };
    await assert.rejects(runQuery("SELECT value", [], { paginate: true }), /repitio un pageToken/);
    assert.equal(requests, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test("calls without pagination preserve the original query body and response", async () => {
  const originalFetch = globalThis.fetch;
  const payload = { rows: [{ f: [{ v: "one" }] }], pageToken: "next" };
  let requests = 0;
  globalThis.fetch = async (_input, options) => {
    requests += 1;
    assert.equal(options.redirect, "manual");
    assert.equal("maxResults" in JSON.parse(options.body), false);
    return Response.json(payload);
  };
  try {
    assert.deepEqual(await runQuery("SELECT value"), payload);
    assert.equal(requests, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test("the BigQuery transport rejects unknown hosts, ports and protocols before sending credentials", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests += 1; throw Error("must not send credentials"); };
  try {
    for (const url of [
      "https://attacker.invalid/", "http://bigquery.googleapis.com/",
      "https://bigquery.googleapis.com.attacker.invalid/", "https://bigquery.googleapis.com:4443/",
      "http://169.254.169.254/computeMetadata/v1/",
    ]) {
      await assert.rejects(fetchBigQuery(new URL(url), { headers: { authorization: "Bearer private-token" } }), /no permitido/);
    }
    assert.equal(requests, 0);
  } finally { globalThis.fetch = originalFetch; }
});
