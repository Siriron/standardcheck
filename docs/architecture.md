# Architecture

## Overview

StandardCheck is a single-party attestation registry. There is no
claimant/respondent pair and no staking — one submitter provides a
domain, and the contract independently fetches and judges it against a
fixed spec (RFC 9116). See the contract's own module docstring
(`contracts/standardcheck.py`) for the full rationale on why this shape
was chosen over a two-party dispute.

## Lifecycle

Unlike Copyleft or Recourse, this contract has no multi-step lifecycle.
`check_domain(domain)` is a single write call that:

1. Sanitizes and validates the domain string (deterministic).
2. Builds two fixed URLs from that domain: the security.txt path
   (`https://{domain}/.well-known/security.txt`) and the domain's own
   root page (`https://{domain}/`).
3. Enters `run_nondet_unsafe`, where `leader_fn` independently fetches
   BOTH sources — two separate `gl.nondet.web.get()` calls — and asks
   an LLM to reconcile both against the RFC 9116 charter baked into the
   contract, returning a parsed `{verdict, confidence_bps,
   reasoning_summary}` dict. The root-page fetch is used as a liveness
   cross-check: if it fails while the security.txt fetch succeeds, the
   charter instructs the model to prefer `unverifiable`.
4. `validator_fn` independently re-runs both fetches and re-judges,
   comparing its own result against the leader's on verdict, confidence
   tolerance, and reasoning length.
5. Once consensus is reached, the result is written as a new
   `Attestation` record and the call returns.

There is no "submitted" pending state and no second transaction. This is
a deliberate simplification — see the contract docstring's SHAPE section.

## Storage

One flat `TreeMap[u256, Attestation]`, keyed by an incrementing id. No
nested arrays, no per-record dynamic lists. See `contracts.md` for the
full field list.

## Frontend

React + Vite + TypeScript + Tailwind + Framer Motion. The
`useGenLayer` hook wraps `genlayer-js`, handles wallet connection
persistence, chain-switching at write time, and generous receipt-wait
retry/interval config for consensus finality. See `frontend.md`.
