import type { NetworkKey } from '../config/chains';

interface NetworkToggleProps {
  network: NetworkKey;
  onChange: (network: NetworkKey) => void;
}

export function NetworkToggle({ network, onChange }: NetworkToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Network"
      className="inline-flex rounded-full border border-ink/15 bg-paper-dim p-1 text-sm font-mono"
    >
      {(['studionet', 'bradbury'] as const).map((key) => (
        <button
          key={key}
          role="radio"
          aria-checked={network === key}
          onClick={() => onChange(key)}
          className={`px-3.5 py-1.5 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-beacon focus-visible:outline-offset-1 ${
            network === key
              ? 'bg-ink text-paper'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          {key === 'studionet' ? 'StudioNet' : 'Bradbury'}
        </button>
      ))}
    </div>
  );
}
