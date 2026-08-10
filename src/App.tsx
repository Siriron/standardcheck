import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGenLayer } from './hooks/useGenLayer';
import { CHAIN_CONFIGS, type NetworkKey } from './config/chains';
import { TerminalScan } from './components/TerminalScan';
import { NetworkToggle } from './components/NetworkToggle';
import { WalletButton } from './components/WalletButton';
import { RecentChecks } from './components/RecentChecks';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

interface RecentEntry {
  attestation_id: number;
  domain: string;
  verdict: 'conformant' | 'non_conformant' | 'unverifiable';
}

export default function App() {
  const [network, setNetwork] = useState<NetworkKey>('studionet');
  const [domain, setDomain] = useState('');
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const { account, status, error, lastResult, lastTxHash, connect, checkDomain } =
    useGenLayer(network);
  const cfg = CHAIN_CONFIGS[network];

  const handleSubmit = useCallback(() => {
    const clean = domain.trim();
    if (!clean) return;
    checkDomain(clean);
  }, [domain, checkDomain]);

  // Append the finalized result to session history once it lands.
  if (lastResult && !recent.some((r) => r.attestation_id === lastResult.attestation_id)) {
    setRecent((prev) => [lastResult, ...prev].slice(0, 8));
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      {/* ---------------------------------------------------------- */}
      {/* Header                                                      */}
      {/* ---------------------------------------------------------- */}
      <header className="max-w-5xl mx-auto px-5 sm:px-8 pt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" width={28} height={28} className="rounded-md" />
          <span className="font-display font-semibold tracking-tight text-lg">
            StandardCheck
          </span>
        </div>
        <div className="flex items-center gap-3">
          <NetworkToggle network={network} onChange={setNetwork} />
          <WalletButton
            account={account}
            connecting={status === 'connecting'}
            onConnect={connect}
          />
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* Hero — the terminal IS the thesis, not a headline+cta stack */}
      {/* ---------------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-16 sm:pb-24">
        <motion.div initial="hidden" animate="show" variants={fadeUp}>
          <p className="font-mono text-xs tracking-widest text-ink-soft uppercase mb-4">
            RFC 9116 conformance registry
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-3xl">
            Every domain claims to have a security contact.
            <span className="text-ink-soft"> Most of them are lying, expired, or missing.</span>
          </h1>
          <p className="mt-5 text-ink-soft text-base sm:text-lg max-w-xl leading-relaxed">
            StandardCheck fetches a domain's <code className="font-mono text-sm bg-paper-dim px-1.5 py-0.5 rounded">
              /.well-known/security.txt
            </code>{' '}
            directly and checks it against RFC 9116 — independently, on-chain, with
            every verdict re-derived by multiple validators before it finalizes.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ delay: 0.1 }}
          className="mt-10 max-w-2xl"
        >
          <TerminalScan
            domain={domain}
            onDomainChange={setDomain}
            onSubmit={handleSubmit}
            status={status}
            verdict={lastResult?.verdict ?? null}
            txHash={lastTxHash}
            explorerUrl={cfg.explorerUrl}
            disabled={!account}
          />
          {!account && (
            <p className="mt-3 text-sm text-ink-soft font-mono">
              connect a wallet above to run a check
            </p>
          )}
          {error && (
            <p className="mt-3 text-sm text-rust font-mono" role="alert">
              {error}
            </p>
          )}
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* How it works                                                */}
      {/* ---------------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-20 border-t border-ink/10">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-10"
        >
          How a check runs
        </motion.h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              eyebrow: 'fetch',
              title: 'The file, not the claim',
              body: 'The contract fetches the domain\u2019s security.txt AND its own root page independently, inside the same call that judges it. It never trusts a description of either \u2014 only the live content.',
            },
            {
              eyebrow: 'judge',
              title: 'Against a fixed spec',
              body: 'RFC 9116\u2019s requirements are baked into the contract, identical for every check. No submitter picks or edits the standard being checked against.',
            },
            {
              eyebrow: 'confirm',
              title: 'Independently re-derived',
              body: 'Separate validators fetch and judge again, on their own. A verdict only finalizes once independent re-derivations agree \u2014 not because one model said so.',
            },
          ].map((step) => (
            <motion.div
              key={step.eyebrow}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
            >
              <p className="font-mono text-xs tracking-widest text-beacon uppercase mb-2">
                {step.eyebrow}
              </p>
              <h3 className="font-display text-lg font-semibold mb-1.5">{step.title}</h3>
              <p className="text-ink-soft text-sm leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Recent checks (session-local, per documented gap)          */}
      {/* ---------------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-20 border-t border-ink/10">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-6"
        >
          This session's checks
        </motion.h2>
        <RecentChecks entries={recent} explorerUrl={cfg.explorerUrl} contractAddress={cfg.contractAddress} />
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Deployed contracts                                          */}
      {/* ---------------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-20 border-t border-ink/10">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-6"
        >
          Deployed contracts
        </motion.h2>
        <div className="grid sm:grid-cols-2 gap-4 font-mono text-sm">
          {(['studionet', 'bradbury'] as const).map((key) => {
            const c = CHAIN_CONFIGS[key];
            return (
              <div key={key} className="border border-ink/10 rounded-lg p-4 bg-white/40">
                <p className="text-ink-soft text-xs uppercase tracking-wide mb-1.5">
                  {c.label}
                </p>
                {c.contractAddress ? (
                  <a
                    href={`${c.explorerUrl}/address/${c.contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink hover:text-beacon underline underline-offset-2 break-all"
                  >
                    {c.contractAddress}
                  </a>
                ) : (
                  <span className="text-fog">not yet deployed on this network</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Status — honest, not decorative, per section 9.1 item 9    */}
      {/* ---------------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-20 border-t border-ink/10">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-6"
        >
          Status
        </motion.h2>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="text-ink-soft text-sm sm:text-base leading-relaxed max-w-2xl space-y-3"
        >
          <p>
            This deliberately has no separate submit-then-resolve lifecycle to test —
            every check is a single write call that fetches, judges, and finalizes in
            one transaction. See <a href="./docs/deployment.md" className="underline underline-offset-2 hover:text-ink">deployment.md</a> for what has and hasn't been live-verified yet.
          </p>
        </motion.div>
      </section>

      <footer className="max-w-5xl mx-auto px-5 sm:px-8 py-10 border-t border-ink/10 text-center text-xs text-ink-soft font-mono">
        Built on <a href="https://genlayer.com" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">GenLayer</a>
        {' '}·{' '}
        <a href="https://portal.genlayer.foundation/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">Portal submission</a>
      </footer>
    </div>
  );
}
