import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { apiRequest, assertAdvertiserAllowed, type Json } from "../api.js";
import { DV360_BASE_URL } from "../constants.js";
import { jsonResult } from "../format.js";

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

const ID = (what: string) => z.string().regex(/^\d+$/, "must be a numeric ID").describe(`${what} (numeric ID)`);

interface Resource {
  /** Tool-name segment, e.g. "line_items" */
  slug: string;
  label: string;
  /** Collection key in responses, also the last URL segment */
  collection: string;
  idParam: string;
  /** Needs an advertiser_id (everything but partners/advertisers) */
  advertiserScoped: boolean;
  summaryFields: string;
  filterHelp: string;
}

const RESOURCES: Resource[] = [
  {
    slug: "partners", label: "partner", collection: "partners", idParam: "partner_id", advertiserScoped: false,
    summaryFields: "partnerId,displayName,entityStatus",
    filterHelp: 'e.g. entityStatus="ENTITY_STATUS_ACTIVE"'
  },
  {
    slug: "campaigns", label: "campaign", collection: "campaigns", idParam: "campaign_id", advertiserScoped: true,
    summaryFields: "campaignId,displayName,entityStatus,campaignGoal,campaignFlight",
    filterHelp: 'e.g. entityStatus="ENTITY_STATUS_ACTIVE" AND updateTime>="2025-01-01T00:00:00Z"'
  },
  {
    slug: "insertion_orders", label: "insertion order", collection: "insertionOrders", idParam: "insertion_order_id", advertiserScoped: true,
    summaryFields: "insertionOrderId,campaignId,displayName,entityStatus,insertionOrderType",
    filterHelp: 'e.g. campaignId="123" AND entityStatus="ENTITY_STATUS_ACTIVE"'
  },
  {
    slug: "line_items", label: "line item", collection: "lineItems", idParam: "line_item_id", advertiserScoped: true,
    summaryFields: "lineItemId,insertionOrderId,campaignId,displayName,entityStatus,lineItemType,flight",
    filterHelp: 'e.g. insertionOrderId="123" AND lineItemType="LINE_ITEM_TYPE_DISPLAY_DEFAULT"'
  },
  {
    slug: "creatives", label: "creative", collection: "creatives", idParam: "creative_id", advertiserScoped: true,
    summaryFields: "creativeId,displayName,entityStatus,creativeType,dimensions",
    filterHelp: 'e.g. creativeType="CREATIVE_TYPE_STANDARD" AND entityStatus="ENTITY_STATUS_ACTIVE"'
  }
];

function listPath(r: Resource, advertiserId?: string): string {
  return r.advertiserScoped ? `advertisers/${advertiserId}/${r.collection}` : r.collection;
}

function registerResourceTools(server: McpServer, r: Resource): void {
  const scope = r.advertiserScoped ? { advertiser_id: ID("Advertiser") } : {};
  const plural = r.collection;

  server.registerTool(
    `dv360_list_${r.slug}`,
    {
      title: `List ${r.label}s`,
      description: `List DV360 ${plural}${r.advertiserScoped ? " under an advertiser" : ""}. Returns a summary view by default (${r.summaryFields}); pass 'fields' for a custom field mask or fields="*" for everything. When next_page_token is present, call again with it as page_token. Use dv360_get_${r.slug.replace(/s$/, "")} for one full record.`,
      inputSchema: z.strictObject({
        ...scope,
        page_size: z.number().int().min(1).max(200).default(25).describe("Items per page"),
        page_token: z.string().optional().describe("next_page_token from the previous page"),
        filter: z.string().optional().describe(`DV360 filter expression, ${r.filterHelp}`),
        order_by: z.string().optional().describe('Sort, e.g. "displayName desc"'),
        fields: z.string().optional().describe(`Response field mask. Default: ${plural}(${r.summaryFields}),nextPageToken. Use "*" for all fields.`)
      }),
      annotations: READ_ONLY
    },
    async (args, ctx) => {
      const a = args as Record<string, string | number | undefined>;
      assertAdvertiserAllowed(a.advertiser_id as string | undefined);
      const fields = a.fields === "*" ? undefined : a.fields ?? `${plural}(${r.summaryFields}),nextPageToken`;
      const data = await apiRequest(DV360_BASE_URL, listPath(r, a.advertiser_id as string | undefined), ctx.mcpReq.signal, {
        params: { pageSize: a.page_size, pageToken: a.page_token, filter: a.filter, orderBy: a.order_by, fields }
      });
      const { nextPageToken, ...rest } = data as Json;
      const items = (rest[plural] as unknown[] | undefined) ?? [];
      return jsonResult({ count: items.length, [plural]: items, ...(nextPageToken ? { next_page_token: nextPageToken } : {}) });
    }
  );

  server.registerTool(
    `dv360_get_${r.slug.replace(/s$/, "")}`,
    {
      title: `Get ${r.label}`,
      description: `Get the full record of one DV360 ${r.label}. Use dv360_list_${r.slug} to find IDs.`,
      inputSchema: z.strictObject({
        ...scope,
        [r.idParam]: ID(r.label[0].toUpperCase() + r.label.slice(1))
      }),
      annotations: READ_ONLY
    },
    async (args, ctx) => {
      const a = args as Record<string, string>;
      assertAdvertiserAllowed(a.advertiser_id);
      const data = await apiRequest(DV360_BASE_URL, `${listPath(r, a.advertiser_id)}/${a[r.idParam]}`, ctx.mcpReq.signal);
      return jsonResult(data);
    }
  );
}

export function registerDv360ReadTools(server: McpServer): void {
  RESOURCES.forEach(r => registerResourceTools(server, r));

  // advertisers need partner_id on list, so they are registered by hand
  server.registerTool(
    "dv360_list_advertisers",
    {
      title: "List advertisers",
      description: "List DV360 advertisers under a partner (partner_id is required by the API). Summary view by default. Use dv360_list_partners to find partner IDs.",
      inputSchema: z.strictObject({
        partner_id: ID("Partner"),
        page_size: z.number().int().min(1).max(200).default(25).describe("Items per page"),
        page_token: z.string().optional().describe("next_page_token from the previous page"),
        filter: z.string().optional().describe('e.g. entityStatus="ENTITY_STATUS_ACTIVE" AND displayName:"Acme"'),
        order_by: z.string().optional().describe('Sort, e.g. "displayName"'),
        fields: z.string().optional().describe('Response field mask. Default is a summary; "*" returns everything.')
      }),
      annotations: READ_ONLY
    },
    async ({ partner_id, page_size, page_token, filter, order_by, fields }, ctx) => {
      const mask = fields === "*" ? undefined : fields ?? "advertisers(advertiserId,partnerId,displayName,entityStatus,generalConfig/currencyCode),nextPageToken";
      const data = await apiRequest(DV360_BASE_URL, "advertisers", ctx.mcpReq.signal, {
        params: { partnerId: partner_id, pageSize: page_size, pageToken: page_token, filter, orderBy: order_by, fields: mask }
      });
      const { nextPageToken, advertisers } = data as { nextPageToken?: string; advertisers?: unknown[] };
      return jsonResult({ count: advertisers?.length ?? 0, advertisers: advertisers ?? [], ...(nextPageToken ? { next_page_token: nextPageToken } : {}) });
    }
  );

  server.registerTool(
    "dv360_get_advertiser",
    {
      title: "Get advertiser",
      description: "Get the full record of one DV360 advertiser.",
      inputSchema: z.strictObject({ advertiser_id: ID("Advertiser") }),
      annotations: READ_ONLY
    },
    async ({ advertiser_id }, ctx) => {
      assertAdvertiserAllowed(advertiser_id);
      return jsonResult(await apiRequest(DV360_BASE_URL, `advertisers/${advertiser_id}`, ctx.mcpReq.signal));
    }
  );

  server.registerTool(
    "dv360_list_line_item_targeting",
    {
      title: "List line item targeting",
      description: 'List the assigned targeting options of one targeting type on a line item, e.g. targeting_type="TARGETING_TYPE_GEO_REGION" or "TARGETING_TYPE_AUDIENCE_GROUP".',
      inputSchema: z.strictObject({
        advertiser_id: ID("Advertiser"),
        line_item_id: ID("Line item"),
        targeting_type: z.string().regex(/^TARGETING_TYPE_[A-Z_]+$/).describe("Targeting type enum, e.g. TARGETING_TYPE_CHANNEL"),
        page_size: z.number().int().min(1).max(5000).default(100).describe("Items per page"),
        page_token: z.string().optional().describe("next_page_token from the previous page")
      }),
      annotations: READ_ONLY
    },
    async ({ advertiser_id, line_item_id, targeting_type, page_size, page_token }, ctx) => {
      assertAdvertiserAllowed(advertiser_id);
      return jsonResult(await apiRequest(
        DV360_BASE_URL,
        `advertisers/${advertiser_id}/lineItems/${line_item_id}/targetingTypes/${targeting_type}/assignedTargetingOptions`,
        ctx.mcpReq.signal,
        { params: { pageSize: page_size, pageToken: page_token } }
      ));
    }
  );
}

const STATUS = z.enum([
  "ENTITY_STATUS_ACTIVE",
  "ENTITY_STATUS_PAUSED",
  "ENTITY_STATUS_ARCHIVED"
]).describe("New status. ARCHIVED cannot be undone for most entities; prefer PAUSED.");

/** Registered only when DV360_ENABLE_WRITES=true */
export function registerDv360WriteTools(server: McpServer): void {
  const targets = RESOURCES.filter(r => ["campaigns", "insertion_orders", "line_items"].includes(r.slug));
  for (const r of targets) {
    server.registerTool(
      `dv360_set_${r.slug.replace(/s$/, "")}_status`,
      {
        title: `Set ${r.label} status`,
        description: `Change the entityStatus of one DV360 ${r.label} (activate, pause or archive). This changes live delivery and spend: confirm with the user before calling. Returns the updated record's id, name and status.`,
        inputSchema: z.strictObject({
          advertiser_id: ID("Advertiser"),
          [r.idParam]: ID(r.label[0].toUpperCase() + r.label.slice(1)),
          status: STATUS
        }),
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
      },
      async (args, ctx) => {
        const a = args as Record<string, string>;
      assertAdvertiserAllowed(a.advertiser_id);
        const data = await apiRequest(DV360_BASE_URL, `${listPath(r, a.advertiser_id)}/${a[r.idParam]}`, ctx.mcpReq.signal, {
          method: "PATCH",
          params: { updateMask: "entityStatus", fields: `${r.idParam.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())},displayName,entityStatus` },
          body: { entityStatus: a.status }
        });
        return jsonResult(data);
      }
    );
  }
}
