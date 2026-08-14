import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from 'genlayer-js';
import { studionet, testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import { CHAIN_CONFIGS, RECEIPT_CONFIG, type NetworkKey } from '../config/chains';

const CHAIN_OBJECTS = {
  studionet,
  bradbury: testnetBradbury,
};

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

async function ensureChain(network: NetworkKey): Promise<void> {
  const eth = window.ethereum;
  if (!eth) return;
  const cfg = CHAIN_CONFIGS[network];
  const addEthereumChainParam = {
    chainId: cfg.chainIdHex,
    chainName: cfg.chainName,
    rpcUrls: [cfg.rpcUrl],
    nativeCurrency: cfg.nativeCurrency,
    blockExplorerUrls: [cfg.explorerUrl],
  };
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: cfg.chainIdHex }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [addEthereumChainParam],
      });
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: cfg.chainIdHex }],
      });
    } else if (code === -32002) {
      // A chain-switch request is already pending in the wallet — wait
      // rather than firing a second competing request.
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      throw err;
    }
  }
}

export type VerdictStatus = 'idle' | 'connecting' | 'submitting' | 'waiting' | 'done' | 'error';

interface CheckResult {
  attestation_id: number;
  domain: string;
  verdict: 'conformant' | 'non_conformant' | 'unverifiable';
}

// The contract's check_domain returns json.dumps({"attestation_id", ...})
// as a plain string. debugTraceTransaction's return_data is documented
// (docs.genlayer.com/api-references/genlayer-js/transactions) as
// hex-encoded contract return data — decode the hex to UTF-8 text, then
// parse the JSON, rather than assuming a shape.
function decodeHexReturnValue(hex: string): unknown {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length === 0) return null;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  const text = new TextDecoder('utf-8').decode(bytes);
  return JSON.parse(text);
}

export function useGenLayer(network: NetworkKey) {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<VerdictStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CheckResult | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // On mount: silently check eth_accounts (never eth_requestAccounts,
  // which would prompt) to reconnect without a click if already
  // authorized, and subscribe to accountsChanged to stay in sync.
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    eth
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        const list = accounts as string[];
        if (list[0]) setAccount(list[0]);
      })
      .catch(() => {});

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAccount(accounts[0] || null);
    };
    if (eth.on) eth.on('accountsChanged', handleAccountsChanged);
    return () => {
      if (eth.removeListener) eth.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      setError('No wallet found. Install a browser wallet extension to continue.');
      return;
    }
    setStatus('connecting');
    setError(null);
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      setAccount(accounts[0] || null);
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection was declined.');
      setStatus('error');
    }
  }, []);

  // Guards against a duplicate in-flight submission from a fast double-click.
  const inFlightRef = useRef(false);

  const readRecord = useCallback(
    async (attestationId: number) => {
      const cfg = CHAIN_CONFIGS[network];
      if (!cfg.contractAddress) return null;
      const client = createClient({ chain: CHAIN_OBJECTS[network] });
      const raw = await client.readContract({
        address: cfg.contractAddress as `0x${string}`,
        functionName: 'get_record',
        args: [attestationId],
      });
      // readContract returns a JSON string — always parse it.
      return JSON.parse(raw as string);
    },
    [network]
  );

  // Reads back check_domain's OWN decoded return value from the caller's
  // own transaction hash — never a separate get_next_id() guess. This is
  // "receipt decoding... bound to the attestation ID produced by the
  // caller's own check_domain transaction," per the steward's request:
  // debugTraceTransaction is scoped to a single, specific tx hash (this
  // caller's, and only this caller's), so a second concurrent submission
  // from a different account can never change what this call resolves
  // to — there is no shared counter to race against.
  const decodeWriteResult = useCallback(
    async (txHash: string): Promise<CheckResult> => {
      const cfg = CHAIN_CONFIGS[network];
      const client = createClient({ chain: CHAIN_OBJECTS[network] });
      const trace = await client.debugTraceTransaction({ hash: txHash as `0x${string}` });
      // result_code: 0 = success, 1 = user error, 2 = VM error — per
      // docs.genlayer.com/api-references/genlayer-js/transactions.
      // Consensus reaching ACCEPTED does not by itself guarantee
      // execution succeeded; check this explicitly rather than trusting
      // the write status alone.
      if (trace.result_code !== 0) {
        throw new Error(
          `Transaction ${txHash} reached consensus but execution did not succeed ` +
            `(result_code ${trace.result_code}). ${trace.stderr ? `stderr: ${trace.stderr}` : ''}`
        );
      }
      const decoded = decodeHexReturnValue(trace.return_data) as {
        attestation_id: number;
        domain: string;
        verdict: CheckResult['verdict'];
      };
      if (
        typeof decoded?.attestation_id !== 'number' ||
        typeof decoded?.domain !== 'string' ||
        typeof decoded?.verdict !== 'string'
      ) {
        throw new Error(
          `Decoded return value from ${txHash} did not match the expected check_domain shape.`
        );
      }
      // Cross-check: confirm the decoded id genuinely resolves to a
      // stored record for THIS domain via get_record, on the same
      // network/address the write went to. This is what actually
      // guards against a bad decode that happens to type-check —
      // attestation_id alone can't be trusted just because it parsed.
      if (!cfg.contractAddress) {
        throw new Error(`No contract address configured for ${cfg.label}.`);
      }
      const rawRecord = await client.readContract({
        address: cfg.contractAddress as `0x${string}`,
        functionName: 'get_record',
        args: [decoded.attestation_id],
      });
      const record = JSON.parse(rawRecord as string) as { domain?: string };
      if (record.domain !== decoded.domain) {
        throw new Error(
          `get_record(${decoded.attestation_id}) returned domain "${record.domain}", ` +
            `expected "${decoded.domain}" from this transaction's own return value.`
        );
      }
      return {
        attestation_id: decoded.attestation_id,
        domain: decoded.domain,
        verdict: decoded.verdict,
      };
    },
    [network]
  );

  const checkDomain = useCallback(
    async (domain: string) => {
      if (inFlightRef.current) return;
      const eth = window.ethereum;
      if (!eth || !account) {
        setError('Connect a wallet first.');
        return;
      }

      inFlightRef.current = true;
      setError(null);
      setLastResult(null);
      setLastTxHash(null);
      setStatus('submitting');

      try {
        // Chain switch happens at write time, never on a network-toggle
        // click alone — switching the wallet's chain just from glancing
        // at a different network's page would trigger an unwanted popup.
        await ensureChain(network);

        const cfg = CHAIN_CONFIGS[network];
        if (!cfg.contractAddress) {
          throw new Error(`No contract address configured for ${cfg.label}.`);
        }

        const client = createClient({
          chain: CHAIN_OBJECTS[network],
          account: account as `0x${string}`,
          provider: eth,
        });

        // Defensive: not in any official SDK example, but present in
        // confirmed-working code from a prior build on this SDK version.
        // Guarded since not every SDK version exposes it.
        if (typeof (client as { connect?: unknown }).connect === 'function') {
          try {
            await (client as { connect: (n: string) => Promise<void> }).connect(
              network === 'studionet' ? 'studionet' : 'testnetBradbury'
            );
          } catch {
            // Non-fatal — proceed with the write regardless.
          }
        }

        const txHash = await client.writeContract({
          address: cfg.contractAddress as `0x${string}`,
          functionName: 'check_domain',
          args: [domain],
          value: BigInt(0),
        });
        setLastTxHash(txHash);
        setStatus('waiting');

        const receiptConfig = RECEIPT_CONFIG[network];
        await client.waitForTransactionReceipt({
          hash: txHash,
          status: TransactionStatus.ACCEPTED,
          retries: receiptConfig.retries,
          interval: receiptConfig.interval,
        });

        // Decode THIS transaction's own return value — never a shared
        // counter read after the fact. Race-safe by construction: the
        // lookup is scoped to txHash, which only ever refers to this
        // caller's own call, regardless of what anyone else submits
        // concurrently. See decodeWriteResult above.
        const result = await decodeWriteResult(txHash);
        setLastResult(result);
        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The transaction did not complete.');
        setStatus('error');
      } finally {
        inFlightRef.current = false;
      }
    },
    [account, network, decodeWriteResult]
  );

  return {
    account,
    status,
    error,
    lastResult,
    lastTxHash,
    connect,
    checkDomain,
    readRecord,
    decodeWriteResult,
  };
}
