export const metadata = {
  title: "About Me",
};

export default function AboutMePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">About Me</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        I&apos;m Krishi Konindala, an MS Business Analytics student at Santa
        Clara University graduating in December 2026. I come to analytics from
        a computer science background, and I&apos;m especially interested in
        AI — both how models work under the hood and how they can be applied
        to real business problems.
      </p>
      <h2 className="mt-4 text-xl font-semibold">Skills</h2>
      <p className="text-zinc-600 dark:text-zinc-400">
        Python, SQL, and JavaScript, plus the standard analytics toolkit
        (pandas, scikit-learn). Comfortable building command-line tools and
        web apps with React and Next.js, and working with JSON data and APIs.
      </p>
      <h2 className="mt-4 text-xl font-semibold">Experience</h2>
      <p className="text-zinc-600 dark:text-zinc-400">
        Recent projects: a product-inventory command-line tool in Python
        (ISBA2438) and VulRank, an AI-powered system for prioritizing software
        vulnerabilities. I&apos;m looking for opportunities where analytics
        and engineering meet.
      </p>
    </div>
  );
}
