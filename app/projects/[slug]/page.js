import Link from "next/link";
import { notFound } from "next/navigation";
import projects from "@/data/projects.json";

export async function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) {
    notFound();
  }
  return { title: project.title };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        {project.tagline}
      </p>
      <div className="flex flex-wrap gap-2">
        {project.tech.map((item) => (
          <span
            key={item}
            className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {item}
          </span>
        ))}
      </div>
      <p className="text-zinc-600 dark:text-zinc-400">{project.description}</p>
      <div className="mt-2 flex gap-4 text-sm font-medium">
        {project.repo && (
          <a
            href={project.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            View on GitHub
          </a>
        )}
        {project.demo && (
          <a
            href={project.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Live demo
          </a>
        )}
      </div>
      <Link
        href="/projects"
        className="mt-6 w-fit text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
      >
        Back to all projects
      </Link>
    </article>
  );
}
