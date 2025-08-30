# Startup Wizard Infinite Loop & Setup Flow Redesign

This is all for github issue #5.

## Summary

The app requires **Gmail credentials** and **OpenAI credentials** to function. A wizard currently drives the initial setup process. However:

1. **Wizard Loop**:
   - After completing the wizard, the app **does not land on the dashboard**.
   - Instead, the wizard restarts.
   - Once both Gmail and OpenAI creds are saved, the app enters an **infinite loop** where it keeps checking connection status and re-triggering navigation logic.

2. **Infinite Loop Evidence**:
   - Electron devtools logs show `Partial setup check useEffect triggered` repeating indefinitely.
   - Both Gmail and OpenAI connections are confirmed as successful, but the state machine never exits onboarding.
   - Console logs confirm repeated Gmail/OpenAI credential validations in a tight loop.

3. **Intended Behavior**:
   - If **neither** Gmail nor OpenAI are configured → start wizard from beginning.
   - If **only Gmail** configured → start wizard at (and only show) OpenAI step.
   - If **only OpenAI** configured → start wizard at (and only show) Gmail step.
   - If **both configured** → skip wizard entirely, land on dashboard.
   - A **loading spinner** should handle the initial determination of setup state before rendering wizard or dashboard.

---

## Root Issues

- **State Machine Complexity**:  
  The current onboarding logic uses multiple boolean flags to decide wizard vs dashboard. This creates race conditions and circular triggers (React `useEffect` loops).

- **Coupled Dependencies**:  
  Wizard flow assumes Gmail + OpenAI must be configured together in one linear onboarding. This makes it brittle when one dependency fails later.

- **Failure Modes Not Distinguished (Gmail)**:  
  Currently all Gmail failures are treated the same. In reality, we must distinguish between:
  1. **Token-level failures** (e.g. expired tokens that cannot be refreshed):
     - Only require prompting the user to log in again.
     - Minimal interruption to the user.
  2. **Client-level failures** (e.g. invalid/rotated OAuth `client_id` or `client_secret`):
     - Require a **full reconfiguration** flow, including input of new OAuth app credentials.

- **Scalability Risk**:  
  With more providers in the future (e.g. Anthropic Claude, multiple email providers), the boolean-flag orchestration will become unmanageable.

---

## Design Questions

1. **Should the wizard run only once?**
   - Instead of re-running onboarding whenever a dependency is missing, should we:
     - Run wizard just once for first-time setup.
     - Later handle connection failures via **popup flows** from dashboard (e.g. “Reconnect Gmail”).

2. **Alternative UX Models**:
   - **Single-lifetime wizard + dashboard-based reconfiguration**
   - **Dashboard-first model with dependency cards**:
     - Dashboard always loads.
     - Missing/expired dependencies show as warnings with “Configure” buttons.
   - **State-driven navigation**:
     - Replace boolean-flag checks with an explicit state machine (e.g. XState).

3. **Error Recovery**:
   - How do we distinguish **lightweight recovery flows** (e.g. Gmail token expired → just re-login) from **full reconfiguration flows** (e.g. client_id/secret invalid)?
   - Should the app block dashboard entirely or degrade gracefully with a reconnect flow?

---

## Recommendations / Research Targets

- Investigate **state machine libraries** (e.g. XState) for predictable onboarding flow.
- Research UX patterns for **multi-provider setup flows** in desktop apps.
- Explore **“dashboard-first” design** (always land on app, show missing dependency banners).
- Research **best practices for OAuth token refresh vs full reconfiguration** in Electron apps.
- Keywords to explore:
  - “Electron onboarding flow best practices”
  - “Electron state machine for authentication”
  - “Dashboard-first UX dependency setup”
  - “Multi-provider OAuth setup desktop app”
  - “OAuth token refresh vs reconfiguration UX”

---

## Next Steps

- Stop “vibe coding” fixes: this needs a **clear architecture decision**.
- Decide whether wizard is **permanent entry point** or a **one-time setup**.
- Prototype a **state machine model** to handle setup conditions.
- Define **two Gmail recovery flows**:
  - Token refresh failure → login-only prompt.
  - OAuth client failure → full reconfiguration flow.
- Explore dashboard-first model for long-term extensibility.

---

## Notes on Dependency Management & Wizard Flexibility

In the long run, dependency configuration should be treated as a **list of independent dependencies** that can be configured:

- **Independently** from one another.
- **In any order**.
- **At runtime** based on what is missing, failing, or newly added.

The setup wizard should therefore be **dynamically rendered** based on the set of dependencies that require configuration.

Examples:

- Today: Gmail + OpenAI.
- Tomorrow: OpenAI needs reconfiguration (e.g. API key rotated) **and** a new dependency (Anthropic Claude) is introduced.
  - The wizard should only render steps for **OpenAI** and **Anthropic**, skipping Gmail since it’s already valid.

This implies:

- No hardcoded boolean flags for wizard step orchestration.
- Wizard should dynamically determine which dependencies need attention.
- Each dependency should define its own **config schema + validation logic + UI flow**, pluggable into the wizard system.

This model ensures:

- Scalability as more providers are added.
- Reusability of dependency flows across both **initial setup** and **later reconfiguration**.
- A consistent UX where the dashboard is always the anchor, and wizard steps appear only as needed.

---

👉 This issue is not about patching the loop, but about **defining the right architectural pattern** for setup and dependency management moving forward.
