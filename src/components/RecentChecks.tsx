interface RecentEntry {
  attestation_id: number;
  domain: string;
  verdict: 'conformant' | 'non_conformant' | 'unverifiable';
}

interface RecentChecksProps {
  entries: RecentEntry[];
  explorerUrl: string;
  contractAddress: string;
}

const DOT_COLOR: Record<string, string> = {
  conformant: 'bg-beacon',
  non_conformant: 'bg-rust',
  unverifiable: 'bg-fog',
};

export function RecentChecks({ entries, explorerUrl, contractAddress }: RecentChecksProps) {
  if (entries.length === 0) {
    return (
      <div className="text-ink-soft text-sm font-mono border border-dashed border-ink/15 rounded-lg px-4 py-6 text-center">
        No checks yet on this device. Run one above — it will appear here
        once it finalizes, and stay here across refreshes.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-ink/10 border border-ink/10 rounded-lg overflow-hidden bg-white/40">
      {entries.map((entry) => (
        <div
          key={entry.attestation_id}
          className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-mono"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLOR[entry.verdict]}`}
              aria-hidden="true"
            />
            <span className="truncate text-ink">{entry.domain}</span>
          </div>
          <span className="text-ink-soft text-xs whitespace-nowrap">
            #{entry.attestation_id}
          </span>
        </div>
      ))}
      {contractAddress && (
        <a
          href={`${explorerUrl}/address/${contractAddress}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2.5 text-xs text-ink-soft hover:text-ink text-center underline underline-offset-2"
        >
          view full registry on explorer ↗
        </a>
      )}
    </div>
  );
}
