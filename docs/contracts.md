# Smart contract reference

Source: `contracts/standardcheck.py`

## Storage

```python
@allow_storage
@dataclass
class Attestation:
    attestation_id: u256
    submitter: Address
    domain: str
    fetch_url: str
    root_page_url: str
    verdict: str          # "conformant" | "non_conformant" | "unverifiable"
    confidence_bps: u256   # 0-1000
    reasoning_summary: str
```

Contract-level fields: `records: TreeMap[u256, Attestation]`, `next_id: u256`.

## Methods

| Method | Type | Description |
|---|---|---|
| `check_domain(domain: str)` | write | Independently fetches TWO sources — `domain`'s `/.well-known/security.txt` and `domain`'s own root page — via two separate `gl.nondet.web.get()` calls inside one leader/validator nondet block, reconciles both against RFC 9116, writes a new `Attestation` record. Returns `{"attestation_id", "domain", "verdict"}` as JSON. |
| `get_record(attestation_id: u256)` | view | Returns the full attestation record as JSON, including both evidence URLs. |
| `get_next_id()` | view | Returns `{"next_id"}` — useful for the frontend to iterate all records client-side (see Known gaps below). |

## Multi-source cross-referencing

The root-page fetch is a second, independently-controlled liveness
signal — not a second security check. It exists to catch a specific
failure mode: a `security.txt` file that still resolves on a domain
that's otherwise dead shouldn't be scored as meaningfully conformant or
non-conformant, since the check itself wouldn't be meaningful on a
domain nobody could actually reach. If the root page fetch fails, the
charter instructs the LLM to prefer `unverifiable` regardless of what
the `security.txt` fetch showed. See the contract's own docstring for
the honest limit of this: it's a liveness check, not a legitimacy
check — a live parked-domain page still passes it.

## Verdict shape

Three-way: `conformant`, `non_conformant`, `unverifiable`. See the
contract's `_RFC9116_SUMMARY` and `_CHARTER` constants for the exact
judging criteria given to the LLM.

## Known, deliberate gaps

Stated in full in the contract's own module docstring — summarized here:

- **No on-chain domain → id index.** Looking up a domain's full history
  means the frontend calls `get_next_id()` and iterates `get_record()`
  client-side. This avoids introducing any array-shaped storage field.
- **`reasoning_summary` validation is a length threshold only** (>20
  chars), not true content validation against the fetched evidence. This
  is the same category of gap left open on Copyleft, carried forward
  again deliberately rather than silently.
- **"Current time" is passed to the LLM as a raw, unparsed string**
  from `gl.message_raw["datetime"]`, never parsed with datetime
  arithmetic. That field's exact parseable format is unconfirmed
  project-wide (same open item as Recourse's own gap note), which is
  why this contract deliberately never parses it deterministically.
  **The core mechanism is confirmed working live** (see
  `deployment.md`'s testing-status section — a real expired-Expires
  domain correctly produced `non_conformant`, reasoning explicitly
  referencing the real on-chain check-time value). The `except`
  fallback (`"[unavailable]"`, used if the field lookup itself raises)
  has not been separately exercised, since every real call so far has
  hit the successful read path — that specific fallback remains open.
- **Only `Contact` and `Expires` are checked rigorously.** Other optional
  RFC 9116 fields (`Encryption`, `Preferred-Languages`, `Canonical`,
  `Policy`, `Hiring`, `Acknowledgments`) are not validated for syntax
  correctness if present.
- **The root-page fetch is a liveness signal only**, not a legitimacy
  check — a domain serving unrelated but genuinely live content (e.g.
  a parked-domain page) still passes it. This is intentional scope, not
  an oversight.
- **Rotation-frequency impact of the second fetch: confirmed low across
  four transactions.** All four live tests (Aug 10 2026 — see
  `deployment.md`) finalized with zero leader rotations, including the
  neverssl.com asymmetric case, which was the scenario most likely to
  produce disagreement between leader and validator re-derivations
  given two independent live fetches. This is a small sample, not a
  statistical guarantee — but it's real evidence against the hypothesis
  that two fetches would meaningfully increase rotation frequency, not
  just an untested concern anymore.
