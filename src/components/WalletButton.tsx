interface WalletButtonProps {
  account: string | null;
  connecting: boolean;
  onConnect: () => void;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton({ account, connecting, onConnect }: WalletButtonProps) {
  if (account) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-paper-dim px-4 py-2 text-sm font-mono text-ink-soft">
        <span className="w-1.5 h-1.5 rounded-full bg-beacon" aria-hidden="true" />
        {shortenAddress(account)}
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={connecting}
      className="rounded-full bg-ink text-paper px-4 py-2 text-sm font-mono hover:bg-ink-soft transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-beacon focus-visible:outline-offset-2"
    >
      {connecting ? 'Connecting…' : 'Connect wallet'}
    </button>
  );
}
