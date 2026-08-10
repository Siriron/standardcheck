<div align="center">

<img src="./public/favicon.svg" width="88" alt="StandardCheck logo" />

# StandardCheck

### An on-chain registry that checks a domain's security.txt against RFC 9116

<br />

![Status](https://img.shields.io/badge/status-live%20on%20StudioNet-brightgreen?style=flat-square)
![Networks](https://img.shields.io/badge/networks-StudioNet%20%2B%20Bradbury-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20GenVM-2F7A5C?style=flat-square)

<br />

**[Live App](#)** &nbsp;·&nbsp; **[Documentation](./docs/architecture.md)** &nbsp;·&nbsp; **[Smart Contract](./contracts/standardcheck.py)**

</div>

<br />

---

## What this is

Most domains that publish a `security.txt` file never get it checked against
the actual spec — it's either missing, expired, or points at a dead contact
channel, and nobody notices until a researcher needs it. StandardCheck fetches
a domain's file directly and judges it against RFC 9116, on-chain, with the
verdict independently re-derived by multiple validators before it finalizes.

<br />

<div align="center">

| | |
|---|---|
| **Concept** | Single-party RFC 9116 conformance attestation |
| **Consensus need** | A false "conformant" verdict is a real, checkable harm even with no counter-party — a downstream tool or researcher could rely on it and be wrong |
| **Evidence source** | Two independent sources, both fetched contract-side: the domain's `/.well-known/security.txt` and its own root page — never the submitter's description of either |
| **Networks** | StudioNet + Bradbury |

</div>

<br />

---

## How it works

1. Submit a domain. The contract independently fetches two sources — `https://{domain}/.well-known/security.txt` and `https://{domain}/` — via two separate calls inside the same judgment step.
2. The fetched content is judged against RFC 9116's fixed requirements — baked into the contract, identical for every check, never chosen by the submitter. The second source (the domain's own root page) is used specifically to confirm the domain is genuinely live, so a stale file on an otherwise-dead domain can't be scored as meaningfully conformant.
3. Independent validators re-run both fetches and re-judge on their own; the verdict only finalizes once independent re-derivations agree.

<br />

<details>
<summary><b>The three-way verdict</b></summary>
<br />

A binary pass/fail would force a call even when the check genuinely
couldn't run — so this contract uses three outcomes instead:

- **conformant** — file exists, required fields present and valid.
- **non_conformant** — file exists but fails a real RFC 9116 requirement (missing Contact, missing Expires, a plain `http://` Contact URL, or an expired date).
- **unverifiable** — file missing, unreachable, or unparseable. This is treated as a distinct, honest outcome from `non_conformant`, not a forced guess.

</details>

<br />

---

## Deployed contracts

<div align="center">

| Network | Address | Explorer |
|---|---|---|
| StudioNet | `0x4F734e3F5eDF052C3bad761b8DfD0925748d09eD` | [View](https://explorer-studio.genlayer.com/address/0x4F734e3F5eDF052C3bad761b8DfD0925748d09eD) |
| Bradbury | `0x1Ab52B29b47d7488c0Bd8Ba77aA29fa2cA82997D` | [View](https://explorer-bradbury.genlayer.com/address/0x1Ab52B29b47d7488c0Bd8Ba77aA29fa2cA82997D) |

</div>

<br />

---

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Full deployment instructions: [`docs/deployment.md`](./docs/deployment.md)

<br />

---

## Project structure

```
contracts/standardcheck.py    The GenVM contract
frontend/                       React + Vite app
docs/                            architecture.md, deployment.md, contracts.md, frontend.md
LICENSE                          MIT
```

<br />

---

## Status

<div align="center">

![StudioNet](https://img.shields.io/badge/StudioNet-live%20verified-brightgreen?style=flat-square)
![Bradbury](https://img.shields.io/badge/Bradbury-deployed%2C%20not%20separately%20transaction--tested-yellow?style=flat-square)

</div>

StudioNet has been live-verified on the current two-source contract
across four transactions, not just a happy path: `conformant`
(github.com, both sources reconcile cleanly), `unverifiable` on a
domain that fails both fetches, and `unverifiable` on a domain where
the file is missing but the root page confirms the domain is genuinely
live — the specific asymmetric case the second fetch exists to
distinguish from full unreachability. All four finalized `SUCCESS`,
empty stderr, zero leader rotations. See `docs/deployment.md` for
transaction hashes and the full reasoning excerpts.

Bradbury is deployed with the same contract code as StudioNet, but has
not had its own transaction run against it — the address is live
on-chain and the code is identical, but per this project's own
standard, only StudioNet currently carries a confirmed live
transaction.

<br />

---

<div align="center">

Built on [GenLayer](https://genlayer.com) · [Portal submission](https://portal.genlayer.foundation/)

</div>
