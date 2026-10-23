# dv360-mcp-server

MCP server for [Google Display & Video 360](https://marketingplatform.google.com/about/display-video-360/). It wraps the Display & Video 360 API (v4) for entity management and the Bid Manager API (v2) for reporting.

## Tools

| Area | Tools |
|---|---|
| Read | `dv360_list_partners`, `dv360_list_advertisers`, `dv360_get_advertiser`, `dv360_list_/get_campaign(s)`, `dv360_list_/get_insertion_order(s)`, `dv360_list_/get_line_item(s)`, `dv360_list_/get_creative(s)`, `dv360_list_line_item_targeting` |
| Reporting | `dv360_list_queries`, `dv360_create_report_query`, `dv360_run_report_query`, `dv360_list_reports`, `dv360_fetch_report` |
| Workflow | `dv360_weekly_performance_brief` (week-on-week totals, CTR/CPM/CPC and top/bottom line items in one call), plus the `dv360_weekly_brief` prompt that turns it into a stakeholder write-up |
| Write (opt-in) | `dv360_set_campaign_status`, `dv360_set_insertion_order_status`, `dv360_set_line_item_status` |

Write tools change live delivery and spend, so they are **not registered** unless `DV360_ENABLE_WRITES=true`.

List tools return a compact summary by default and paginate with `page_token`; pass `fields="*"` for full records.

## Authentication

Uses Google Application Default Credentials, with the DV360 and Bid Manager scopes (override with `DV360_SCOPES`, comma-separated).

1. In a Google Cloud project, enable **Display & Video 360 API** and **DoubleClick Bid Manager API**.
2. Either:
   - **Service account**: create a key, set `GOOGLE_APPLICATION_CREDENTIALS=/path/key.json`, and add the service account's email as a user in DV360 (Settings > Users).
   - **Your own login**: create an OAuth Desktop client, then
     `gcloud auth application-default login --client-id-file=client.json --scopes=https://www.googleapis.com/auth/display-video,https://www.googleapis.com/auth/doubleclickbidmanager,https://www.googleapis.com/auth/cloud-platform`

Access is limited to whatever the identity can see in DV360.

## Client accounts

- Run **one instance per client**, each with its own credentials (a service account added only to that client's DV360 seat).
- Set `DV360_ALLOWED_ADVERTISER_IDS="111,222"` to make every advertiser-scoped tool refuse any other advertiser.
- The weekly brief creates temporary Bid Manager queries titled `[MCP brief] ...` and deletes them afterwards.
- HTTP mode has no authentication of its own; keep it on localhost.

## Run

```bash
npm install && npm run build
npm run smoke          # self-check, no credentials needed
```

Claude Desktop / Claude Code config:

```json
{
  "mcpServers": {
    "dv360": {
      "command": "node",
      "args": ["/absolute/path/to/dv360-mcp-server/dist/index.js"],
      "env": { "GOOGLE_APPLICATION_CREDENTIALS": "/path/key.json", "DV360_ENABLE_WRITES": "false" }
    }
  }
}
```

HTTP mode: `TRANSPORT=http PORT=3000 npm start` (binds 127.0.0.1 only; add bearer auth before exposing it).

## Status

Built and self-checked against the MCP SDK. Not yet exercised against a live DV360 account.
