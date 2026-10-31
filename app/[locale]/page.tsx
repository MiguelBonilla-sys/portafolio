import { getMessages, setRequestLocale } from "next-intl/server";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import SkillsSection from "@/components/sections/SkillsSection";
import ExperienceSection from "@/components/sections/ExperienceSection";
import ProjectsSection from "@/components/sections/ProjectsSection";
import ContactSection from "@/components/sections/ContactSection";
import HomeTools from "@/components/webmcp/HomeTools";
import JsonLd from "@/components/seo/JsonLd";
import { profilePageSchema, projectListSchema, websiteSchema } from "@/lib/jsonld";
import { getExperience, getProjects, getSkills, GITHUB_URL, LINKEDIN_URL } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import type { Locale } from "@/i18n/routing";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const { contact, hero } = await getMessages();
  const experience = getExperience(locale).filter((item) => item.type === "work");
  const projects = getProjects(locale);

  return (
    <>
      <HomeTools
        locale={locale}
        siteUrl={SITE_URL}
        projects={projects.map((p) => ({ id: p.id, title: p.title, description: p.description, tags: p.tags, status: p.status, context: p.context, links: p.links }))}
        profile={{
          headline: hero.role,
          currentRole: experience[0]?.title ?? hero.role,
          specialization: hero.lede,
          experience: experience.map((item) => ({ title: item.title, company: item.place.split(" · ")[0], dates: item.date })),
          technologies: getSkills(locale).flatMap((category) => category.core),
          location: "Bogotá, Colombia",
          links: { github: GITHUB_URL, linkedin: LINKEDIN_URL, website: `${SITE_URL}/${locale}`, cv: `${SITE_URL}/cv/miguel-bonilla-cv-${locale}.pdf` },
        }}
      />
      <JsonLd data={[profilePageSchema(locale), websiteSchema(locale), projectListSchema(locale, projects)]} />
      <HeroSection />
      <AboutSection />
      <SkillsSection />
      <ExperienceSection />
      <ProjectsSection />
      <ContactSection messages={contact} />
    </>
  );
}
