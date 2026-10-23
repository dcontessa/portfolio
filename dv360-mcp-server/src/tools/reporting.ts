import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { apiRequest } from "../api.js";
import { BID_MANAGER_BASE_URL, CHARACTER_LIMIT, REPORT_HOSTS, REQUEST_TIMEOUT_MS } from "../constants.js";
import { jsonResult } from "../format.js";

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const QUERY_ID = z.string().regex(/^\d+$/, "must be a numeric ID").describe("Query ID (numeric)");

export function registerReportingTools(server: McpServer): void {
  server.registerTool(
    "dv360_list_queries",
    {
      title: "List report queries",
      description: "List saved Bid Manager report queries (the definitions behind DV360 reports). Use dv360_list_reports to see generated report files for a query.",
      inputSchema: z.strictObject({
        page_size: z.number().int().min(1).max(100).default(25).describe("Items per page"),
        page_token: z.string().optional().describe("nextPageToken from the previous page"),
        order_by: z.string().optional().describe('e.g. "metadata.title desc"')
      }),
      annotations: READ_ONLY
    },
    async ({ page_size, page_token, order_by }, ctx) =>
      jsonResult(await apiRequest(BID_MANAGER_BASE_URL, "queries", ctx.mcpReq.signal, {
        params: { pageSize: page_size, pageToken: page_token, orderBy: order_by }
      }))
  );

  server.registerTool(
    "dv360_create_report_query",
    {
      title: "Create report query",
      description: `Create a one-time standard DV360 report query. Does not run it: call dv360_run_report_query next, then poll dv360_list_reports until state is DONE, then dv360_fetch_report.
Example: "Impressions, clicks and spend by line item for advertiser 123 over the last 7 days" -> group_bys=["FILTER_LINE_ITEM"], metrics=["METRIC_IMPRESSIONS","METRIC_CLICKS","METRIC_TOTAL_MEDIA_COST_ADVERTISER"], filters=[{type:"FILTER_ADVERTISER",value:"123"}], date_range="LAST_7_DAYS".`,
      inputSchema: z.strictObject({
        title: z.string().min(1).max(200).describe("Query title"),
        group_bys: z.array(z.string().regex(/^FILTER_[A-Z_0-9]+$/)).min(1).describe('Dimensions, e.g. ["FILTER_DATE","FILTER_LINE_ITEM"]'),
        metrics: z.array(z.string().regex(/^METRIC_[A-Z_0-9]+$/)).min(1).describe('Metrics, e.g. ["METRIC_IMPRESSIONS","METRIC_CLICKS"]'),
        filters: z.array(z.strictObject({
          type: z.string().regex(/^FILTER_[A-Z_0-9]+$/),
          value: z.string()
        })).default([]).describe('Filters, e.g. [{"type":"FILTER_ADVERTISER","value":"123"}]'),
        date_range: z.enum([
          "CURRENT_DAY", "PREVIOUS_DAY", "LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS",
          "MONTH_TO_DATE", "PREVIOUS_MONTH", "YEAR_TO_DATE", "PREVIOUS_FULL_YEAR"
        ]).default("LAST_7_DAYS").describe("Reporting window")
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ title, group_bys, metrics, filters, date_range }, ctx) =>
      jsonResult(await apiRequest(BID_MANAGER_BASE_URL, "queries", ctx.mcpReq.signal, {
        method: "POST",
        body: {
          metadata: { title, dataRange: { range: date_range }, format: "CSV" },
          params: { type: "STANDARD", groupBys: group_bys, metrics, filters },
          schedule: { frequency: "ONE_TIME" }
        }
      }))
  );

  server.registerTool(
    "dv360_run_report_query",
    {
      title: "Run report query",
      description: "Start a report run for a saved query. Returns the report key; generation is asynchronous, so poll dv360_list_reports for the query until metadata.status.state is DONE.",
      inputSchema: z.strictObject({ query_id: QUERY_ID }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ query_id }, ctx) =>
      jsonResult(await apiRequest(BID_MANAGER_BASE_URL, `queries/${query_id}:run`, ctx.mcpReq.signal, { method: "POST", body: {} }))
  );

  server.registerTool(
    "dv360_list_reports",
    {
      title: "List generated reports",
      description: "List generated report runs for a query, newest first. When metadata.status.state is DONE, metadata.googleCloudStoragePath holds the file; pass that to dv360_fetch_report.",
      inputSchema: z.strictObject({
        query_id: QUERY_ID,
        page_size: z.number().int().min(1).max(100).default(10).describe("Items per page"),
        page_token: z.string().optional().describe("nextPageToken from the previous page")
      }),
      annotations: READ_ONLY
    },
    async ({ query_id, page_size, page_token }, ctx) =>
      jsonResult(await apiRequest(BID_MANAGER_BASE_URL, `queries/${query_id}/reports`, ctx.mcpReq.signal, {
        params: { pageSize: page_size, pageToken: page_token, orderBy: "key.reportId desc" }
      }))
  );

  server.registerTool(
    "dv360_fetch_report",
    {
      title: "Fetch report CSV",
      description: "Download a finished report's CSV from its googleCloudStoragePath and return the header plus up to max_rows data rows. Only Google Cloud Storage report URLs are accepted. DV360 CSVs end with a totals/summary block; it is returned as-is when within max_rows.",
      inputSchema: z.strictObject({
        url: z.url().describe("metadata.googleCloudStoragePath from dv360_list_reports"),
        max_rows: z.number().int().min(1).max(1000).default(100).describe("Maximum data rows to return")
      }),
      annotations: READ_ONLY
    },
    async ({ url, max_rows }, ctx) => {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || !REPORT_HOSTS.includes(parsed.hostname)) {
        throw new Error(`Only https URLs on ${REPORT_HOSTS.join(" or ")} are accepted. Use metadata.googleCloudStoragePath from dv360_list_reports.`);
      }
      const response = await fetch(parsed, { signal: AbortSignal.any([ctx.mcpReq.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS * 2)]) });
      if (!response.ok) throw new Error(`Report download failed with HTTP ${response.status}. The signed URL may have expired: call dv360_list_reports again for a fresh one.`);
      const lines = (await response.text()).split(/\r?\n/);
      const header = lines[0];
      let rows = lines.slice(1, max_rows + 1);
      const render = () => [header, ...rows].join("\n");
      while (rows.length > 1 && render().length > CHARACTER_LIMIT) rows = rows.slice(0, Math.ceil(rows.length / 2));
      const total = lines.length - 1;
      const note = rows.length < total ? `\n\n[Showing ${rows.length} of ${total} lines. Narrow the query (filters, fewer group_bys) to see the rest.]` : "";
      return { content: [{ type: "text" as const, text: render() + note }] };
    }
  );
}

