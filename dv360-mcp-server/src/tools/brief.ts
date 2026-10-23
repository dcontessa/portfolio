import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { apiRequest, assertAdvertiserAllowed } from "../api.js";
import { BID_MANAGER_BASE_URL, REPORT_HOSTS, REQUEST_TIMEOUT_MS } from "../constants.js";
import { jsonResult } from "../format.js";

interface Report {
  key?: { queryId?: string; reportId?: string };
  metadata?: { status?: { state?: string }; googleCloudStoragePath?: string };
}

interface Totals { impressions: number; clicks: number; spend: number }
interface Row extends Totals { name: string }

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); reject(signal.reason); }, { once: true });
  });

const ymd = (d: Date) => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Minimal RFC 4180 line parser */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** DV360 CSVs hold a header, data rows, then a blank line and a summary block: only the first block is data */
export function parseReport(csv: string): { rows: Row[]; currencyLabel: string } {
  const lines = csv.split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const col = (prefix: string) => header.findIndex(h => h.startsWith(prefix));
  const iName = col("Line Item"), iImp = col("Impressions"), iClk = col("Clicks"), iCost = col("Total Media Cost");
  if ([iName, iImp, iClk, iCost].includes(-1)) throw new Error(`Unexpected report columns: ${header.join(", ")}`);
  const rows: Row[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) break;
    const f = parseCsvLine(line);
    rows.push({ name: f[iName], impressions: Number(f[iImp]) || 0, clicks: Number(f[iClk]) || 0, spend: Number(f[iCost]) || 0 });
  }
  return { rows, currencyLabel: header[iCost] };
}

const sum = (rows: Row[]): Totals => rows.reduce((t, r) => ({ impressions: t.impressions + r.impressions, clicks: t.clicks + r.clicks, spend: t.spend + r.spend }), { impressions: 0, clicks: 0, spend: 0 });
const round = (n: number, dp = 2) => Number.isFinite(n) ? Number(n.toFixed(dp)) : null;
const kpis = (t: Totals) => ({
  ...t, spend: round(t.spend), ctr_pct: round(t.impressions ? (t.clicks / t.impressions) * 100 : NaN, 3),
  cpm: round(t.impressions ? (t.spend / t.impressions) * 1000 : NaN), cpc: round(t.clicks ? t.spend / t.clicks : NaN)
});
const delta = (cur: number, prev: number) => (prev ? round(((cur - prev) / prev) * 100, 1) : null);

async function runWeek(advertiserId: string, label: string, start: Date, end: Date, signal: AbortSignal, deadline: number) {
  const q = await apiRequest<{ queryId: string }>(BID_MANAGER_BASE_URL, "queries", signal, {
    method: "POST",
    body: {
      metadata: { title: `[MCP brief] ${label} ${advertiserId}`, format: "CSV", dataRange: { range: "CUSTOM_DATES", customStartDate: ymd(start), customEndDate: ymd(end) } },
      params: {
        type: "STANDARD", groupBys: ["FILTER_LINE_ITEM"],
        metrics: ["METRIC_IMPRESSIONS", "METRIC_CLICKS", "METRIC_TOTAL_MEDIA_COST_ADVERTISER"],
        filters: [{ type: "FILTER_ADVERTISER", value: advertiserId }]
      },
      schedule: { frequency: "ONE_TIME" }
    }
  });
  try {
    const run = await apiRequest<Report>(BID_MANAGER_BASE_URL, `queries/${q.queryId}:run`, signal, { method: "POST", body: {} });
    const reportId = run.key?.reportId;
    if (!reportId) throw new Error("Bid Manager did not return a report ID for the run.");
    while (Date.now() < deadline) {
      const rep = await apiRequest<Report>(BID_MANAGER_BASE_URL, `queries/${q.queryId}/reports/${reportId}`, signal);
      const state = rep.metadata?.status?.state;
      if (state === "FAILED") throw new Error("Bid Manager report generation failed. Check the advertiser has delivery in this period.");
      if (state === "DONE" && rep.metadata?.googleCloudStoragePath) {
        const url = new URL(rep.metadata.googleCloudStoragePath);
        if (url.protocol !== "https:" || !REPORT_HOSTS.includes(url.hostname)) throw new Error("Report URL was not a Google Cloud Storage URL; refusing to download.");
        const res = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS * 2)]) });
        if (!res.ok) throw new Error(`Report download failed with HTTP ${res.status}.`);
        return parseReport(await res.text());
      }
      await sleep(5000, signal);
    }
    throw new Error("TIMEOUT");
  } finally {
    // Best-effort cleanup so the account isn't littered with one-off queries
    await apiRequest(BID_MANAGER_BASE_URL, `queries/${q.queryId}`, new AbortController().signal, { method: "DELETE" }).catch(() => undefined);
  }
}

export function registerBriefTools(server: McpServer): void {
  server.registerTool(
    "dv360_weekly_performance_brief",
    {
      title: "Weekly performance brief",
      description: `One-call week-on-week performance summary for a DV360 advertiser: runs two Bid Manager reports (last 7 full days vs the 7 days before), polls until ready, and returns totals, KPIs (CTR, CPM, CPC), week-on-week change, and the top and bottom line items by spend.
Takes 30-120 seconds. Returns numbers only: write the narrative from them, and state the currency from currency_label. Example: "Give me last week's performance for advertiser 123".`,
      inputSchema: z.strictObject({
        advertiser_id: z.string().regex(/^\d+$/, "must be a numeric ID").describe("Advertiser ID (numeric); see dv360_list_advertisers"),
        top_n: z.number().int().min(1).max(20).default(5).describe("Line items to list in each of the top and bottom groups"),
        timeout_seconds: z.number().int().min(30).max(280).default(150).describe("How long to wait for reports before giving up")
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ advertiser_id, top_n, timeout_seconds }, ctx) => {
      assertAdvertiserAllowed(advertiser_id);
      const deadline = Date.now() + timeout_seconds * 1000;
      const end = addDays(new Date(), -1); // last full day (UTC)
      const curStart = addDays(end, -6);
      const prevEnd = addDays(curStart, -1);
      const prevStart = addDays(prevEnd, -6);
      let cur, prev;
      try {
        [cur, prev] = await Promise.all([
          runWeek(advertiser_id, "current week", curStart, end, ctx.mcpReq.signal, deadline),
          runWeek(advertiser_id, "previous week", prevStart, prevEnd, ctx.mcpReq.signal, deadline)
        ]);
      } catch (e) {
        if (e instanceof Error && e.message === "TIMEOUT") {
          throw new Error(`Reports were not ready after ${timeout_seconds}s. Retry with a larger timeout_seconds, or the advertiser may have very large volume.`);
        }
        throw e;
      }
      const c = sum(cur.rows), p = sum(prev.rows);
      const bySpend = [...cur.rows].sort((a, b) => b.spend - a.spend);
      const view = (r: Row) => ({ line_item: r.name, ...kpis(r) });
      return jsonResult({
        advertiser_id,
        currency_label: cur.currencyLabel,
        period: { current: `${curStart.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`, previous: `${prevStart.toISOString().slice(0, 10)} to ${prevEnd.toISOString().slice(0, 10)}` },
        current_week: kpis(c),
        previous_week: kpis(p),
        change_pct: { impressions: delta(c.impressions, p.impressions), clicks: delta(c.clicks, p.clicks), spend: delta(c.spend, p.spend) },
        line_items_with_delivery: cur.rows.length,
        top_by_spend: bySpend.slice(0, top_n).map(view),
        bottom_by_spend: bySpend.filter(r => r.spend > 0).slice(-top_n).reverse().map(view)
      });
    }
  );

  server.registerPrompt(
    "dv360_weekly_brief",
    {
      title: "Weekly DV360 brief",
      description: "Run the weekly performance brief for an advertiser and write it up for stakeholders",
      argsSchema: z.object({ advertiser_id: z.string().describe("Advertiser ID (numeric)") })
    },
    async ({ advertiser_id }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Call dv360_weekly_performance_brief for advertiser ${advertiser_id}. Then write a board-ready brief: an executive summary of two to three sentences, a week-on-week table (impressions, clicks, spend, CTR, CPM, CPC), three insights ranked by impact, and two recommended actions. Use only the returned numbers, state the currency, and use British English. Do not name the client.`
        }
      }]
    })
  );
}
