export function NotFound() {
  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-6">
      <div className="max-w-sm text-center font-mono">
        <p className="text-fog text-sm tracking-widest uppercase mb-3">404</p>
        <h1 className="font-display text-2xl font-semibold mb-3">
          Nothing's at this path.
        </h1>
        <p className="text-ink-soft text-sm mb-6">
          There's no /.well-known/ file here either — this route just doesn't exist.
        </p>
        <a
          href="/"
          className="inline-block rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-ink-soft transition-colors"
        >
          Back to StandardCheck
        </a>
      </div>
    </div>
  );
}
