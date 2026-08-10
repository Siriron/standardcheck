# Deployment

## Deploy workflow

1. Write/edit the contract in `contracts/standardcheck.py`.
2. Run the full pre-deploy audit (project knowledge section 4 — all
   seven items) against the contract before deploying.
3. Run `genvm-lint` locally (`pip install genvm-linter`) — exit 0
   required before deploying.
4. Deploy via [studio.genlayer.com](https://studio.genlayer.com/contracts)
   — upload the `.py` file directly. Never paste code, never deploy via
   a MetaMask/EVM wallet flow (always rejected).
5. Update the deployed contract address directly in
   `src/config/chains.ts` for the network deployed to. This project
   does not use a real `.env` file — addresses are hardcoded in
   `chains.ts` with an optional `VITE_CONTRACT_ADDRESS_*` env var as an
   override path for anyone who wants one (see `.env.example`), not the
   primary mechanism.
6. Copy the explorer transaction link for the deploy tx.
7. Deploy the frontend to Vercel with the environment variables set.

## Environment variables (optional override)

This project hardcodes deployed contract addresses directly in
`src/config/chains.ts` — see Deployed addresses below. No `.env` file
is used or required to run this app.

An optional override path exists for anyone who prefers env vars
(e.g. testing against a personal deployment without editing source):

```
VITE_CONTRACT_ADDRESS_STUDIONET=
VITE_CONTRACT_ADDRESS_BRADBURY=
```

If set, these take priority over the hardcoded values in `chains.ts`.
If unset, the app runs correctly using the hardcoded addresses. These
are public deployed contract addresses either way, not secrets.

## Deployed addresses

- **StudioNet:** `0x4F734e3F5eDF052C3bad761b8DfD0925748d09eD` — [explorer](https://explorer-studio.genlayer.com/address/0x4F734e3F5eDF052C3bad761b8DfD0925748d09eD)
- **Bradbury:** `0x1Ab52B29b47d7488c0Bd8Ba77aA29fa2cA82997D` — [explorer](https://explorer-bradbury.genlayer.com/address/0x1Ab52B29b47d7488c0Bd8Ba77aA29fa2cA82997D)

Both addresses run the current two-source contract (security.txt +
root-page cross-referencing). The prior single-fetch version's
addresses (`0x5E58d44d...` StudioNet, `0x6bC9ACf6...` Bradbury) are
superseded and no longer referenced anywhere in this document.

## Testing status

**StudioNet: the current two-source contract is live-verified**, run
directly against the deployed contract via Studio's Run and Debug
panel, Aug 10 2026:

| Verdict | Domain | Confidence bps | What it confirmed |
|---|---|---|---|
| `conformant` | github.com | 900 | Both sources fetched independently and reconciled — reasoning cites `security.txt`'s Contact/Expires fields AND `github.githubassets.com` links from the root page as separate evidence |
| `unverifiable` | `this-domain-genuinely-does-not-exist-sc447.invalid` | 995 | Both sources fail together (confirmed unreachable via the IETF-reserved `.invalid` TLD, which never resolves) |
| `unverifiable` | neverssl.com | 988 | **The asymmetric case the second fetch specifically exists to catch:** `security.txt` returns a 404, but the root page confirms the domain is genuinely live. Reasoning explicitly distinguishes this from a reachability problem — "this is not a reachability problem" — rather than conflating a missing file with a dead domain |

All four transactions (including a github.com call on this same
deployment, attestation_id 1) finalized `SUCCESS` with empty stderr and
zero leader rotations. Return values and full reasoning text were
confirmed via the Studio Run and Debug panel directly; individual
transaction hashes were not captured for these four calls the way they
were for the prior version's table below — if hash-level citation is
needed later (e.g. for a portal submission that asks for it), pull them
from the StudioNet explorer's transaction list for this contract
address rather than assuming these table rows.

The neverssl.com result is the most structurally important of the four:
it's the first live evidence that the two-source design changes the
*verdict reasoning*, not just adds a second fact to ignore. A
single-fetch contract could not have distinguished "file missing on a
live domain" from "domain unreachable" the way this one did.

**Bradbury: deployed with the same contract code, not separately
transaction-tested.** Per explicit instruction, this is treated as
equivalent in result to StudioNet given identical bytecode — flagging
this as a stated assumption rather than an independently confirmed
result, consistent with how this document has distinguished "deployed"
from "live-verified" throughout.

### Prior single-fetch version — historical record, addresses superseded

Kept here because it remains genuinely useful evidence for one specific
thing: confirming the `gl.message_raw["datetime"]` mechanism works,
independent of the two-source design added afterward. Run against the
now-superseded StudioNet address `0x5E58d44d...` on Aug 9 2026:

| Verdict | Domain | Tx hash |
|---|---|---|
| `conformant` | github.com | [`0x8d74daa0...7615736f309`](https://explorer-studio.genlayer.com/tx/0x8d74daa03e033aa46c118fef43a6f74f58d956cccb6693bd29fa87615736f309) |
| `unverifiable` | example.com | [`0xcbadc600...082ca3ba864ce`](https://explorer-studio.genlayer.com/tx/0xcbadc600b2afcedd5af400433f3d1847311c17ecfc8eb058b1d082ca3ba864ce) |
| `non_conformant` | twitter.com | [`0x86792b00...92a917bb76881664`](https://explorer-studio.genlayer.com/tx/0x86792b00b888840e715d357ea7b5cd37d69d41381014cac692a917bb76881664) |

The twitter.com transaction's reasoning explicitly cited the real
on-chain check-time value (`2026-08-09T15:41:57.021396Z`) to correctly
fail an expired `Expires` field — this remains the strongest confirmed
evidence that the datetime-handling mechanism itself works, and that
part of the design carried forward unchanged into the current contract.
These addresses are no longer live at the current code and should not
be used for anything beyond this historical reference.

**Not yet tested on either network:** the frontend has not been
exercised against any live contract — `useGenLayer.ts`'s
`writeContract`/`waitForTransactionReceipt` flow, the `ensureChain`
wallet-switching behavior, and the `RecentChecks` session-history
rendering are all still only confirmed correct by static review, not a
real browser transaction. All testing to date has gone through
Studio's Run and Debug panel directly, per this project's own
"fastest way to test a contract" guidance.
