"use client";

import { useRouter } from "next/navigation";
import { useWebMCP } from "use-webmcp-tool";
import {
  navigateToSection,
  searchPortfolioProjects,
  type PublicProject,
} from "@/lib/webmcp/portfolio";
import type { Locale } from "@/i18n/routing";

const projectSearchSchema = {
  type: "object",
  properties: {
    query: { type: "string", maxLength: 200, description: "Keyword in a project title, summary, context, or stack" },
    technology: { type: "string", maxLength: 80, description: "Technology appearing in the project stack" },
    category: { type: "string", maxLength: 80, description: "Term appearing in the project's public description or context" },
    status: { type: "string", enum: ["commercial", "deployed", "academic", "prototype", "archived", "unverified"], description: "Evidence-based project status" },
  },
  additionalProperties: false,
} as const;

const navigationSchema = {
  type: "object",
  properties: {
    section: { type: "string", description: "One of home, about, experience, projects, blog, contact, cv, or project:<public ID>" },
  },
  required: ["section"],
  additionalProperties: false,
} as const;

export type PublicProfile = {
  headline: string;
  currentRole: string;
  specialization: string;
  experience: Array<{ title: string; company: string; dates: string }>;
  technologies: string[];
  location: string;
  links: { github: string; linkedin: string; website: string; cv: string };
};

export default function HomeTools({ locale, projects, profile, siteUrl }: {
  locale: Locale; projects: PublicProject[]; profile: PublicProfile; siteUrl: string;
}) {
  const router = useRouter();

  useWebMCP({
    name: "search_portfolio_projects",
    description: "Find Miguel Bonilla's public portfolio projects by topic, technology, or status.",
    inputSchema: projectSearchSchema,
    annotations: { readOnlyHint: true },
    execute: (input: Record<string, unknown>) => searchPortfolioProjects(projects, input, locale, siteUrl),
  });

  useWebMCP({
    name: "get_professional_profile",
    description: "Read Miguel Bonilla's public professional profile and verified portfolio links.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: () => ({ ok: true, data: profile }),
  });

  useWebMCP({
    name: "navigate_to_portfolio_section",
    description: "Navigate to a valid portfolio section or public project in the current language.",
    inputSchema: navigationSchema,
    execute: (input: { section?: unknown }) => {
      const target = navigateToSection(input?.section, locale, projects.map((p) => p.id));
      if (target.ok) router.push(target.data.path);
      return target;
    },
  });

  return null;
}
