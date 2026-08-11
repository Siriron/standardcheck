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

  const readNextId = useCallback(async (): Promise<number> => {
    const cfg = CHAIN_CONFIGS[network];
    const client = createClient({ chain: CHAIN_OBJECTS[network] });
    const raw = await client.readContract({
      address: cfg.contractAddress as `0x${string}`,
      functionName: 'get_next_id',
      args: [],
    });
    const { next_id } = JSON.parse(raw as string) as { next_id: number };
    return next_id;
  }, [network]);

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
        // CONFIRMED PATTERN (Recourse, this project's own working
        // reference — verified by reading its actual source, not
        // assumed): do NOT parse anything out of the write receipt at
        // all. Recourse's ActionForm/useGenLayer discard the receipt's
        // contents entirely and just wait for the write to finish, then
        // make a fresh readContract call to get the real state. The
        // earlier receipt.result.return_value (then receipt.data.*)
        // approach here was guessing at undocumented SDK internals —
        // this sidesteps that question entirely by never needing it.
        await client.waitForTransactionReceipt({
          hash: txHash,
          status: TransactionStatus.ACCEPTED,
          retries: receiptConfig.retries,
          interval: receiptConfig.interval,
        });

        // Read the record back via the confirmed Recourse pattern:
        // get_next_id() AFTER the write completes (race-safe under
        // concurrent submissions — see comment above), then
        // get_record() on next_id - 1.
        const nextId = await readNextId();
        const myId = nextId - 1;
        const record = await readRecord(myId);
        if (record) {
          setLastResult({
            attestation_id: record.attestation_id,
            domain: record.domain,
            verdict: record.verdict,
          });
        } else {
          console.warn(
            `StandardCheck: get_record(${myId}) returned nothing after a successful write.`
          );
        }
        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The transaction did not complete.');
        setStatus('error');
      } finally {
        inFlightRef.current = false;
      }
    },
    [account, network, readNextId, readRecord]
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
  };
}
