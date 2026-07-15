# OSAC BMaaS Prototype

PatternFly React prototype for Bare Metal-as-a-Service flows:

- **Provider admin** — catalog, BMaaS templates, external IP pools, organizations
- **Tenant admin** — catalog manager, projects & teams
- **Tenant user** — catalog, launch instance, my instances

## Local development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default `http://127.0.0.1:5184/`).

## Live demo (GitHub Pages)

After deployment is enabled, the demo is published at:

**https://heyethankim.github.io/osac-bmaas/**

Pushes to `main` rebuild and redeploy automatically.

### First-time GitHub Pages setup

1. Open the repo on GitHub → **Settings** → **Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually)
4. When the workflow finishes, open the live URL above
