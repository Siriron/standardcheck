# Frontend

## Stack

React + Vite + TypeScript + Tailwind CSS + Framer Motion.

## Structure

```
src/
  config/chains.ts       Network config, contract addresses (from env), receipt-wait config
  hooks/useGenLayer.ts    Wallet connect, ensureChain, writeContract, waitForTransactionReceipt
  components/
    TerminalScan.tsx       The signature hero element — live fetch/verdict staging
    NetworkToggle.tsx       StudioNet/Bradbury toggle (UI state only; chain-switch happens at write time)
    WalletButton.tsx         Connect button / connected-address display
    RecentChecks.tsx          Session-local check history
    ErrorBoundary.tsx          Styled crash fallback
    NotFound.tsx                 Styled 404 for any non-root path
  App.tsx                 Page composition
  main.tsx                  Entry point
```

## Design tokens

| Token | Hex | Use |
|---|---|---|
| paper | `#F5F2EA` | Background |
| ink | `#141B22` | Primary text, terminal panel background |
| beacon | `#2F7A5C` | `conformant` verdict, active/positive accents |
| rust | `#B5502E` | `non_conformant` verdict, errors |
| fog | `#8A8577` | `unverifiable` verdict, secondary text |

Display face: Space Grotesk. Body: IBM Plex Sans. Mono (used
deliberately, not as a code-block default — this app treats file syntax
as a first-class visual element): JetBrains Mono.

## Wallet connection pattern

Follows the confirmed-working pattern from project knowledge section 7:

- `ensureChain(network)` is called immediately before every write, never
  on a network-toggle click alone.
- Wallet reconnection on mount uses `eth_accounts` (silent), never
  `eth_requestAccounts` (which would prompt).
- Subscribes to `accountsChanged` to stay in sync if the user switches
  wallets mid-session.
- `waitForTransactionReceipt` uses generous, network-specific
  retry/interval config (120 retries / 4s on StudioNet, 240 / 6s on
  Bradbury) since GenVM consensus on an LLM-judgment write genuinely
  takes real minutes.

## Known gap

No on-chain domain → id index exists on the contract (see
`contracts.md`). The "This session's checks" list is session-local only
— it reflects checks run in the current browser session, not the full
on-chain history. Viewing the full registry means using the explorer
link provided, which lists all transactions against the contract
address.
