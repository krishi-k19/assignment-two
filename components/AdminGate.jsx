const signInLinkClass =
  "rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80";

export default function AdminGate() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Admin sign-in required</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This area is protected. Sign in with your admin username and
          password.
        </p>
      </div>
      <a href="/admin/login" className={signInLinkClass}>
        Sign in
      </a>
    </div>
  );
}
