export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-lg px-5 py-12" aria-busy="true">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-9 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-8 space-y-5">
        <div className="h-11 animate-pulse rounded bg-muted" />
        <div className="h-11 animate-pulse rounded bg-muted" />
        <div className="h-11 animate-pulse rounded bg-muted" />
      </div>
      <span className="sr-only">Carregando perfil</span>
    </main>
  );
}
