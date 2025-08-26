The following instructions were created with generic knowledge and now previous knowledge of our current architecture. Take from it all functional requirements but don't follow the technical requirements or instructions unless they are new to this project. If we already have an implementation for one of the features, ignore new details in this spec file as they were written without prior knowledge of our existing code.

# Problem: Robust Gmail OAuth Token Renewal & User Flow

## Context
Our desktop app integrates with Gmail via OAuth. We currently **encrypt and persist** the following per user/workspace:
- `access_token` (short-lived)
- `refresh_token` (longer-lived, but may be invalid/rotated/revoked)
- token metadata (expiry, scopes, client ID, etc.)

**Today:** when the app starts, it validates the Gmail connection and may surface errors if the `access_token` is expired.

**Goal:** Improve reliability and UX by **automatically refreshing access tokens** during app init/health-check logic. The user should **only** be prompted to sign in again if the **refresh flow fails** (e.g., refresh token invalid or revoked).

> UX principle: An expired **access token** is an internal/transparent condition and **must not** result in a visible error. Only a failed **refresh** should surface a “Session expired — please sign in again” prompt.

---

## Desired Outcome (What “done” means)
1. **Init logic auto-refreshes** access tokens when expired or within a configurable “soon-to-expire” grace window (e.g., ≤ 2 minutes).
2. **No user-facing error** is shown for mere access token expiry. The app performs a **silent refresh** using the stored `refresh_token`.
3. If refresh succeeds:
   - Persist the new `access_token` (+ expiry).
   - Continue boot sequence with a **healthy Gmail connection**.
4. If refresh fails (invalid refresh token, revoked, consent revoked, missing scope, client secret rotated, etc.):
   - Mark Gmail connection as **needs reauth**.
   - **Setup Card** for Gmail shows a **clear CTA**: “Sign in to Gmail again”
   - App surfaces **one, friendly** error state: “Your Gmail session expired. Please sign in again.” (Include reason codes only in logs/diagnostics).
5. **Setup Card behavior:**
   - Always shows current state: ✅ Connected • ⏳ Refreshing… • ❗ Needs re-auth
   - Provides a **“Sign in again”** action that executes a fresh OAuth flow (PKCE or installed-app flow per our platform).
   - After successful login, tokens/metadata are safely **encrypted & saved**, and the card updates to ✅ Connected.
6. **Telemetry & logs** capture reason codes (HTTP status, error string) for refresh failures **without** leaking secrets.
7. Full **unit, integration, and e2e tests** cover happy path, refresh path, and failure modes.
8. **Backward compatible migration**: existing users benefit without manual steps; schema changes handled via migration.

---

## Constraints & Assumptions
- Access tokens are short-lived; **do not rely on fixed lifetimes**. Use the `expires_in` / `expiry_date` metadata.
- Refresh tokens can be **invalidated** by: user revocation, password or 2SV changes, app policy changes, scope changes, or client rotation.
- All tokens and client secrets remain **encrypted at rest**; **in-memory only** for active use.
- Use **OAuth 2.0 best practices** (PKCE where applicable; loopback or system browser for desktop).
- Avoid noisy UI: **no dialogs** during auto-refresh unless the refresh definitively fails.
- The app may run cross‑platform (macOS/Windows/Linux). Avoid OS-specific dependencies in core logic.

---

## Functional Requirements

### 1) Initialization & Health Check
- On app start (and on demand), run `validateGmailConnection()`:
  1. Load encrypted token bundle.
  2. If missing or malformed → mark **Needs Re-Auth** and stop.
  3. If access token **valid** (not expired/not within grace window) → **pass**.
  4. If access token **expired/expiring** → call `refreshAccessToken()`.
     - On success → persist and **pass**.
     - On failure → mark **Needs Re-Auth** and return a typed error indicating **refresh_failed** (with reason code for logs).

### 2) Refresh Flow
- Exchange `refresh_token` for a new `access_token` (and possibly a new `refresh_token`).
- Persist new tokens atomically; if a new `refresh_token` is returned, **replace** the old one.
- Update expiry metadata using provider response.
- Do **not** surface a user error on success.

### 3) Setup Card UX
States and actions:
- **Connected** (green): shows masked account email and last successful refresh timestamp.
- **Refreshing…** (spinner): transient state during silent background refresh.
- **Needs Re-Auth** (warning): shows primary button **“Sign in to Gmail again”**.
  - Clicking button triggers full OAuth, replaces tokens, updates state to **Connected**.
  - Show discreet inline error only if the OAuth window flow fails (user cancels or provider error).

### 4) Error Handling (technical -> user mapping)
- **Access token expired** → *silent auto-refresh* (no UI).
- **Refresh error** (HTTP 400/401/invalid_grant, consent revoked, disallowed_useragent, etc.) → UI: “Session expired. Please sign in again.”
- **Network/transient** → retry with backoff; if still failing but refresh token is likely valid, show a **connectivity** banner rather than sign-in required.
- **Clock skew** → treat tokens expiring “soon” as expired; use a grace window.

### 5) Telemetry & Logging (no secrets)
- Emit events:
  - `gmail.refresh.started | success | failure`
  - `gmail.init.health.ok | degraded | needs_reauth`
- Include reason codes (e.g., `invalid_grant`, `user_revoked`, `network_timeout`) and HTTP status.
- Redact tokens, auth codes, and PII.

---

## Interfaces & Pseudocode

### Types
```ts
type GmailAuthState =
  | { status: 'connected'; accountEmail: string; expiresAt: number; lastRefreshAt?: number }
  | { status: 'refreshing' }
  | { status: 'needs_reauth'; reason?: RefreshFailReason };

type RefreshFailReason =
  | 'invalid_grant'        // revoked/rotated/missing refresh token
  | 'consent_revoked'      // user removed app
  | 'insufficient_scope'
  | 'client_misconfigured' // wrong client/secret/redirect
  | 'network_error'
  | 'unknown';
```

### Token Bundle
```ts
interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  scope: string;
  tokenType: 'Bearer';
  provider: 'google';
  clientId: string;
  // optional
  idToken?: string;
  // crypto metadata
  version: number;
  createdAt: number;
  updatedAt: number;
}
```

### Init Flow
```ts
async function validateGmailConnection(now = Date.now()): Promise<GmailAuthState> {
  const bundle = await loadEncryptedBundle('gmail');
  if (!bundle) return { status: 'needs_reauth', reason: 'invalid_grant' };

  if (!isExpiring(bundle.expiresAt, now)) {
    return { status: 'connected', accountEmail: await whoAmI(bundle.accessToken), expiresAt: bundle.expiresAt };
  }

  emit('gmail.refresh.started');
  const refreshed = await refreshAccessToken(bundle).catch(mapRefreshError);
  if (isRefreshSuccess(refreshed)) {
    const next = persistRefreshed(bundle, refreshed);
    emit('gmail.refresh.success');
    return { status: 'connected', accountEmail: await whoAmI(next.accessToken), expiresAt: next.expiresAt, lastRefreshAt: now };
  } else {
    emit('gmail.refresh.failure', { reason: refreshed.reason });
    return { status: 'needs_reauth', reason: refreshed.reason };
  }
}

function isExpiring(expiresAt: number, now: number, graceMs = 120_000): boolean {
  return expiresAt - now <= graceMs;
}
```

### Refresh Flow
```ts
async function refreshAccessToken(bundle: TokenBundle): Promise<RefreshSuccess | RefreshFailure> {
  const body = new URLSearchParams({
    client_id: bundle.clientId,
    grant_type: 'refresh_token',
    refresh_token: bundle.refreshToken,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return mapRefreshFailure(res.status, err?.error);
  }

  const data = await res.json();
  // data: { access_token, expires_in, scope?, token_type, id_token?, refresh_token? }
  return {
    ok: true,
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    refreshToken: data.refresh_token ?? bundle.refreshToken,
    idToken: data.id_token,
  };
}
```

---

## UI Copy (Setup Card)
- **Connected:** “Gmail is connected as **{email}**. Last refreshed {relativeTime}.“
- **Needs Re-Auth:** “Your Gmail session expired. Please sign in again.”
  - Primary button: **Sign in to Gmail again**
  - Secondary (help): “Why am I seeing this?” → opens doc with possible causes and steps.

---

## Edge Cases
- Provider returns a **new refresh_token**: **overwrite** old value atomically.
- **Multiple instances** running: ensure refresh happens **once** (mutex/IPC) and consumers wait.
- **Clock skew**: if server time differs, rely on `expires_in` from response and local monotonic clock for grace window.
- **Partial bundle** (missing fields): treat as **needs_reauth**.
- **Scope changes**: if API 403 due to scope, treat as **needs_reauth** with reason `insufficient_scope`.
- **Offline at startup**: do not drop auth immediately; mark as **degraded**, retry refresh later.

---

## Security
- Encrypt tokens at rest (OS keychain/secure enclave if available).
- Zeroize token material from memory after use where practicable.
- Never log tokens. Redact PII in error/telemetry events.
- Use system browser + PKCE (no embedded webview) for re-auth where possible.

---

## Testing (write these as automated tests)
1. **Access token valid** → init passes, no refresh call.
2. **Access token expired** → refresh called, succeeds → init passes, tokens updated.
3. **Access token expired** → refresh called, fails `invalid_grant` → state **needs_reauth**, setup card shows CTA.
4. **Network error** during refresh → retry/backoff; if retries exhausted, state **degraded** not **needs_reauth**.
5. Provider returns **new refresh_token** → persisted and used subsequently.
6. **Concurrent init** attempts → single refresh execution; others wait and share result.
7. Setup Card button launches **full OAuth** and updates state to **connected** on success.
8. Telemetry emitted with **reason codes** but **no secrets**.
9. Migration test: legacy token bundle upgraded to new schema without user action.

---

## Deliverables
- [ ] `auth/gmail.ts` (refresh + whoAmI + typed errors)
- [ ] `auth/crypto.ts` (secure storage, atomic writes)
- [ ] `state/authState.ts` (GmailAuthState + reducers/selectors)
- [ ] `ui/SetupCardGmail.tsx` (states + CTA + copy)
- [ ] `init/validateGmailConnection.ts` (bootstrap health check)
- [ ] Tests (unit + integration + e2e)
- [ ] Telemetry events + redaction
- [ ] Developer docs (README: flows, errors, how to repro refresh failure)

---

## Acceptance Criteria (copy/paste into PR)
- Expired **access tokens** trigger an **automatic refresh** during init; **no user error** shown.
- Only **failed refresh** results in “Session expired. Please sign in again.”
- Setup Card visibly transitions between **Connected/Refreshing/Needs Re-Auth** and provides a working **Sign in again** button.
- Tokens & metadata are **encrypted**, rotation-safe, and persisted atomically.
- Comprehensive tests cover happy path + failure modes. Logs contain reason codes **without secrets**.
