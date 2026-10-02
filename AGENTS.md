# Engineering Rules

- Authorization and premium entitlements are enforced in the database (RLS/security-definer functions) or edge functions, never by client state — client checks can be bypassed.
- Private user data is always scoped to its owner via RLS — IDs alone must never grant access.
- Every external call goes through try/catch with loading, success and error states — the UI must never freeze or fail silently.
- Every score shown to users exposes a breakdown of its components — results must be explainable.
- Randomized engines accept a seed — tests and audits need reproducible output.
