# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/e40890e5-54d0-40c7-a923-153cab993e35

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e40890e5-54d0-40c7-a923-153cab993e35) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Supabase Edge function configuration

Edge functions now require the Supabase service role key so they can perform privileged operations while still enforcing end-user access controls. Provision the secret in Supabase and your local environment before deploying or testing:

```sh
# Store the secret for deployed edge functions
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# For local testing add to your environment (e.g. .env)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The functions continue to validate the `Authorization` header and scope all queries to the authenticated user, so make sure RLS policies remain aligned with those expectations before redeploying.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e40890e5-54d0-40c7-a923-153cab993e35) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Performance

The application now includes automated budgets and tooling to keep bundle and runtime metrics in check.

### Measurement workflow
1. `npm install`
2. `npm run build`
3. `npm run analyze` to generate `dist/stats.html`
4. `npm run lhci` to verify Lighthouse performance budgets (mobile preset)

### Budgets
- **JavaScript bundles**: each chunk must remain under 250 KB gzip (`lhci` assertion)
- **Largest Contentful Paint (mobile)**: ≤ 2.5 s (verified via Lighthouse CI)
- **Total transfer size**: ≤ 350 KB (gzip) for the critical path (`lhci` assertion)

### Delivery assumptions
- Production builds are deployed behind an HTTP/2 or HTTP/3 CDN that serves `dist/` assets with long-lived cache headers for hashed files.
- Brotli compression is enabled at the edge (handled by Vite during build and by the CDN during delivery).
- Non-critical analytics scripts load during `requestIdleCallback`, and animated backgrounds respect `prefers-reduced-motion` to avoid unnecessary GPU work.

Refer to the new `analyze` and `lhci` scripts in `package.json` for the one-click commands that enforce these targets.
