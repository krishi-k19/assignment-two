import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/about-me", label: "About Me" },
  { href: "/projects", label: "My Projects" },
  { href: "/blogs", label: "Blog" },
  { href: "/contact-me", label: "Contact" },
];

export default function NavBar() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          My Portfolio
        </Link>
        <ul className="flex gap-5 text-sm">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
