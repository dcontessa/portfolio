/** Self-check: starts the built server over stdio and verifies the tool surface and input validation. No Google credentials needed. */
import { strict as assert } from "node:assert";
import { Client } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";

async function connect(writes: boolean) {
  const client = new Client({ name: "smoke-test", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: { ...getDefaultEnvironment(), DV360_ENABLE_WRITES: String(writes) }
  }));
  return client;
}

const ro = await connect(false);
const names = (await ro.listTools()).tools.map(t => t.name);
for (const n of ["dv360_list_partners", "dv360_list_advertisers", "dv360_list_line_items", "dv360_get_line_item", "dv360_list_campaigns",
  "dv360_list_insertion_orders", "dv360_list_creatives", "dv360_create_report_query", "dv360_fetch_report", "dv360_weekly_performance_brief"]) {
  assert.ok(names.includes(n), `missing tool ${n}`);
}
assert.ok(!names.some(n => n.includes("_set_")), "write tools must be hidden by default");

const bad = await ro.callTool({ name: "dv360_list_line_items", arguments: { advertiser_id: "abc" } });
assert.equal(bad.isError, true, "non-numeric advertiser_id must be rejected");
const ssrf = await ro.callTool({ name: "dv360_fetch_report", arguments: { url: "https://example.com/x.csv" } });
assert.equal(ssrf.isError, true, "non-Google report URLs must be rejected");
await ro.close();

const rw = await connect(true);
const rwNames = (await rw.listTools()).tools.map(t => t.name);
for (const n of ["dv360_set_line_item_status", "dv360_set_insertion_order_status", "dv360_set_campaign_status"]) {
  assert.ok(rwNames.includes(n), `missing write tool ${n}`);
}
await rw.close();
console.error(`Smoke test passed (${names.length} read tools, ${rwNames.length - names.length} write tools)`);
