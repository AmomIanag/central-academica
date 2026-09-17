export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-xl rounded-[var(--radius-card)] border border-border bg-surface p-8">
        <p className="text-sm font-medium text-accent">FIAP</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Central Acadêmica
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Ambiente de desenvolvimento inicial. O frontend Next.js está no ar.
          A identidade visual completa e os módulos acadêmicos entram nas
          próximas etapas.
        </p>
      </section>
    </main>
  );
}
