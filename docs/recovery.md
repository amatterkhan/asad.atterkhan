# Recovery runbook

There is one owner and nobody else to call. This page says what to do when an account is lost or
compromised. **It is public: never write a code, a key, a phone number or a recovery address here.**
Record only *where* each thing is kept.

## Before anything goes wrong (do once, re-check every 90 days)

| Account | What to have | Where it is kept (fill in, no secrets) |
| --- | --- | --- |
| Google (owner of the Firebase project, signs in to `/admin`) | 2-Step Verification, printed backup codes, a second sign-in method (security key or passkey), a recovery email and phone that are not this same account | _e.g. "password manager, entry Google backup codes"_ |
| TOTP for `/admin` (Firebase second factor) | The authenticator backed up or enrolled on a second device | |
| GitHub (`amatterkhan`) | 2FA, downloaded recovery codes, a second 2FA method | |
| Domain registrar | 2FA, recovery codes, transfer lock on | |
| Cloudflare (DNS) | 2FA, recovery codes | |
| Zoho Mail (`contact@`, DMARC reports) | 2FA, recovery codes | |
| Password manager | Emergency kit printed and stored offline | |

A second Google account with the Owner role on the `asad-atterkhan` project is the only real
protection against losing the first one. It is a second account to secure, so the trade is yours:
if you add one, give it a security key and nothing else to do.

## Locked out

| Lost | Do this |
| --- | --- |
| Phone with the authenticator | Sign in to Google with a backup code or the second method. In `/admin` the TOTP factor is tied to the Firebase user: with project access, remove the factor (Identity Platform → Users → the owner → Multi-factor) and enrol again. Then replace the used backup codes |
| Google account | g.co/recover from a device and network you normally use. Until it is back, the site keeps serving and `/admin` is closed. Code changes still deploy through GitHub |
| GitHub | Recovery codes, then github.com/settings/security. Without them, GitHub support with a verified email or SSH key. Until it is back nothing can deploy, and the site keeps serving |
| Registrar or Cloudflare | Their account-recovery flow with the recovery codes. DNS keeps resolving while you wait |
| `/admin` but nothing else | The site keeps serving. As a last resort the site can build from `site/content/` instead of Firestore: `gh variable set CONTENT_SOURCE --body git`, then run the deploy workflow (see [ci-cd.md](ci-cd.md)). The Git copy may be older than what is live, so compare first |

## Compromised

Work top to bottom. Each step is safe to do even if it turns out to be a false alarm.

### The rebuild token (`asad-api-github-token`)

Signs: commits or workflow runs you did not start; a `repository_dispatch` you did not cause.

1. Revoke it now: GitHub → Settings → Developer settings → Fine-grained tokens → delete.
   Publishing from `/admin` stops triggering rebuilds; the site keeps serving.
2. `git log origin/main` and the Actions run list: look for anything you did not do. Revert it by
   pull request and redeploy.
3. Create a new token and store it (steps in [security.md](security.md), "Rebuild token"), then
   redeploy the API.

### The owner Google account or an `/admin` session

1. From a clean device: change the Google password, sign out all sessions, review 2-Step methods.
2. Revoke the Firebase sessions so every existing ID token dies:
   Google Cloud console → Identity Platform → Users → the owner → revoke sessions (the API checks
   revocation on every request).
3. Take the admin offline while you look: `gh variable set ENABLE_CONTENT_ADMIN --body false` and
   the same for `ENABLE_DOCUMENT_ADMIN`, then run the deploy workflow with "Also build and deploy
   the API".
4. Read the `admin_request` log lines for requests you did not make, and check Firestore content
   and published documents against the live site.
5. Re-enrol TOTP and turn the flags back on.

### The GitHub account

1. Change the password, sign out other sessions, review SSH keys, tokens, OAuth apps and 2FA.
2. Check the repository: rulesets, environments, Actions secrets and variables, deploy keys,
   workflow files on `main`.
3. In Google Cloud, check that the Workload Identity provider still names only this repository
   and that `github-deployer` has no new keys or roles (`.github/scripts/setup-firebase-deploy.sh`
   re-applies the intended state).
4. Redeploy from a commit you trust.

### The domain or DNS

1. Recover the account, then compare every DNS record with what Hosting expects
   (Firebase console → Hosting → the custom domain).
2. Check certificates issued for the domain at crt.sh.
3. Turn the transfer lock back on.

## Roll the site back

Firebase console → Hosting → Release history → **Rollback** on the last good release. This needs
the Google account only, not GitHub.
