"use client";

import { useWebMCP } from "use-webmcp-tool";
import { getProjectDetails, type PublicProject } from "@/lib/webmcp/portfolio";
import type { Locale } from "@/i18n/routing";

export default function ProjectDetailsTool({ locale, project, siteUrl }: { locale: Locale; project: PublicProject; siteUrl: string }) {
  useWebMCP({
    name: "get_project_details",
    description: "Read the currently open project's case study and public evidence links.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "ID of the open project" } },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: (input: { id?: unknown }) => getProjectDetails([project], input?.id, locale, siteUrl),
  });
  return null;
}
