import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VerdictStatus } from '../hooks/useGenLayer';

interface TerminalScanProps {
  domain: string;
  onDomainChange: (domain: string) => void;
  onSubmit: () => void;
  status: VerdictStatus;
  verdict: 'conformant' | 'non_conformant' | 'unverifiable' | null;
  txHash: string | null;
  explorerUrl: string;
  disabled: boolean;
}

const VERDICT_COPY: Record<string, { label: string; color: string }> = {
  conformant: { label: 'CONFORMANT', color: 'text-beacon' },
  non_conformant: { label: 'NON_CONFORMANT', color: 'text-rust' },
  unverifiable: { label: 'UNVERIFIABLE', color: 'text-fog' },
};

export function TerminalScan({
  domain,
  onDomainChange,
  onSubmit,
  status,
  verdict,
  txHash,
  explorerUrl,
  disabled,
}: TerminalScanProps) {
  const [cursorOn, setCursorOn] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setCursorOn((c) => !c), 530);
    return () => clearInterval(id);
  }, []);

  const isBusy = status === 'submitting' || status === 'waiting';

  return (
    <div className="rounded-lg bg-ink text-paper font-mono text-sm sm:text-base shadow-2xl overflow-hidden border border-ink-soft">
      {/* Title bar — inspection-tag styling, not a literal macOS chrome
          knockoff */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-ink-soft/40 border-b border-ink-soft">
        <span className="w-2.5 h-2.5 rounded-full bg-fog/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-fog/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-beacon/70" />
        <span className="ml-2 text-fog text-xs tracking-wide">
          GET /.well-known/security.txt
        </span>
      </div>

      <div className="p-5 sm:p-6 min-h-[220px] flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-beacon shrink-0">$</span>
          <span className="text-fog shrink-0">check_domain</span>
          <input
            ref={inputRef}
            type="text"
            value={domain}
            onChange={(e) => onDomainChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !disabled && !isBusy) onSubmit();
            }}
            disabled={disabled || isBusy}
            placeholder="example.com"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 min-w-0 basis-full sm:basis-auto bg-transparent outline-none placeholder:text-fog/50 text-paper disabled:opacity-60"
            aria-label="Domain to check"
          />
          {!isBusy && (
            <span
              className={`w-2 h-4 bg-paper ${cursorOn ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden="true"
            />
          )}
        </div>

        <AnimatePresence mode="wait">
          {status === 'submitting' && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-fog"
            >
              submitting transaction…
            </motion.div>
          )}

          {status === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-1.5"
            >
              <span className="text-fog">
                fetching file and awaiting validator consensus…
              </span>
              <span className="text-fog/70 text-xs">
                this can take several minutes — multiple validators independently
                re-derive the verdict before it finalizes
              </span>
              {txHash && (
                <a
                  href={`${explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-beacon/80 hover:text-beacon underline underline-offset-2 text-xs mt-1"
                >
                  view pending transaction ↗
                </a>
              )}
            </motion.div>
          )}

          {status === 'done' && verdict && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-fog">verdict:</span>
                <span className={`font-semibold ${VERDICT_COPY[verdict].color}`}>
                  {VERDICT_COPY[verdict].label}
                </span>
              </div>
              {txHash && (
                <a
                  href={`${explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-fog hover:text-paper underline underline-offset-2 text-xs"
                >
                  view finalized transaction ↗
                </a>
              )}
            </motion.div>
          )}

          {status === 'done' && !verdict && (
            <motion.div
              key="done-no-verdict"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-1.5"
            >
              <span className="text-fog">
                transaction finalized, but the verdict couldn't be read from
                the response — check the transaction directly
              </span>
              {txHash && (
                <a
                  href={`${explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-beacon/80 hover:text-beacon underline underline-offset-2 text-xs"
                >
                  view finalized transaction ↗
                </a>
              )}
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-rust"
            >
              transaction did not complete — see error below
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
