import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-md text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent-label">FIAP</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted">
          O endereço não existe ou não está disponível nesta versão.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Ir para o dashboard
        </Link>
      </section>
    </div>
  );
}
