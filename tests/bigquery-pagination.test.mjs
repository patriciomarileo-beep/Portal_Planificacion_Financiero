import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register("../scripts/test-typescript-loader.mjs", import.meta.url);

process.env.BIGQUERY_ACCESS_TOKEN = "test-access-token";
process.env.BIGQUERY_PROJECT_ID = "test-project";

const { runQuery } = await import("../app/api/_shared/bigquery.ts");

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
  } finally {
    globalThis.fetch = originalFetch;
  }
});
