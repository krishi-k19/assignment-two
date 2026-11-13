import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Hi, I&apos;m Krishi Konindala
      </h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        MS Business Analytics student with a computer science background,
        interested in AI. I build tools that turn messy data into useful
        decisions.
      </p>
      <div className="flex gap-4">
        <Link
          href="/projects"
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          View my projects
        </Link>
        <Link
          href="/contact-me"
          className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Contact me
        </Link>
      </div>
    </div>
  );
}
