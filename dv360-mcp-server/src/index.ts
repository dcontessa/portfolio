#!/usr/bin/env node
/**
 * MCP server for Google Display & Video 360.
 * Serves stdio by default, Streamable HTTP when TRANSPORT=http.
 * Write tools (status changes) are registered only when DV360_ENABLE_WRITES=true.
 */
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerDv360ReadTools, registerDv360WriteTools } from "./tools/dv360.js";
import { registerBriefTools } from "./tools/brief.js";
import { registerReportingTools } from "./tools/reporting.js";

const WRITES_ENABLED = process.env.DV360_ENABLE_WRITES === "true";

function createServer(): McpServer {
  const server = new McpServer({ name: "dv360-mcp-server", version: "1.0.0" });
  registerDv360ReadTools(server);
  registerReportingTools(server);
  registerBriefTools(server);
  if (WRITES_ENABLED) registerDv360WriteTools(server);
  return server;
}

if (process.env.TRANSPORT === "http") {
  const handler = createMcpHandler(createServer);
  const app = createMcpExpressApp();
  const nodeHandler = toNodeHandler(handler);
  app.all("/mcp", (req, res) => void nodeHandler(req, res, req.body));
  const port = Number(process.env.PORT ?? 3000);
  // Localhost only. Add bearer auth before exposing this beyond the machine: it acts with your Google credentials.
  app.listen(port, "127.0.0.1", () => {
    console.error(`dv360-mcp-server listening on http://127.0.0.1:${port}/mcp`);
  });
} else {
  serveStdio(createServer);
  console.error(`dv360-mcp-server running on stdio (writes ${WRITES_ENABLED ? "enabled" : "disabled"})`);
}
