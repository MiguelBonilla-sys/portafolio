import { getMessages, setRequestLocale } from "next-intl/server";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import SkillsSection from "@/components/sections/SkillsSection";
import ExperienceSection from "@/components/sections/ExperienceSection";
import ProjectsSection from "@/components/sections/ProjectsSection";
import ContactSection from "@/components/sections/ContactSection";
import JsonLd from "@/components/seo/JsonLd";
import { profilePageSchema, projectListSchema, websiteSchema } from "@/lib/jsonld";
import { getProjects } from "@/lib/content";
import type { Locale } from "@/i18n/routing";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const { contact } = await getMessages();

  return (
    <>
      <JsonLd data={[profilePageSchema(locale), websiteSchema(locale), projectListSchema(locale, getProjects(locale))]} />
      <HeroSection />
      <AboutSection />
      <SkillsSection />
      <ExperienceSection />
      <ProjectsSection />
      <ContactSection messages={contact} />
    </>
  );
}
