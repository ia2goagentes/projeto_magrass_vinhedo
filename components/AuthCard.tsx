export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border-hairline bg-surface-card p-8 shadow-lg">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          M
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
