# Project Rules

- **Git & GitHub**: Only perform a `git push` when explicitly asked by the user.
- **Deployments / Netlify**:
  - The command "push" means: push to GitHub, but **skip Netlify** entirely.
  - The deployment to Netlify must **only** occur when the user explicitly requests both: e.g., "push et push sur netlify".
