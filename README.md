# CabinMind Agent Marketplace

This repository contains a minimal, modern Next.js project designed to implement a proof‑of‑concept AI agent marketplace for Dev Cabin Technologies.

## Features

- **Next.js + React**: modern framework with file‑system routing.
- **Tailwind CSS**: sleek, modern UI built quickly with utility classes.
- **Agent Marketplace**: browse a list of predefined AI agents.
- **Agent Detail**: view individual agent features, tools and actions.
- **Agent Builder**: simple form to submit new custom agents (does not persist data yet).
- **API Routes**: an example `/api/agents` endpoint serving sample agent data.

## Getting Started

To run this application locally, make sure you have Node.js installed and then run:

```bash
npm install
npm run dev
```

The development server will be available at `http://localhost:3000`.

## Project Structure

- `pages/` – contains Next.js pages, including:
  - `index.js` – landing page with hero and call to action.
  - `agents/index.js` – marketplace listing all agents.
  - `agents/[id].js` – dynamic route for agent detail pages.
  - `agents/builder.js` – simple UI for creating a new agent.
  - `api/agents.js` – API route with sample JSON.
- `components/` – shared UI components such as `Layout`, `Header` and `AgentCard`.
- `styles/` – global Tailwind CSS styles.
- `tailwind.config.js` – Tailwind configuration.
- `postcss.config.js` – PostCSS configuration.
- `next.config.js` – Next.js configuration.
- `package.json` – lists dependencies and scripts.

## Extending This MVP

This proof of concept can be extended into a fully functional SaaS by implementing:

- Persistent storage using a database like Supabase or PostgreSQL.
- Authentication and user accounts.
- Stripe integration for one‑time purchases and recurring subscriptions.
- Backend agent execution layer using LangChain, CrewAI or custom code.
- Developer portal to submit agents and manage revenue sharing.
- Integration with WordPress via a companion plugin (see `WORDPRESS-PLUGIN` folder).

## WordPress Integration

For WordPress sites, a simple plugin can embed the agent marketplace. See the `WORDPRESS-PLUGIN` directory for a starter plugin file.

---

**Security Note:** Do not commit sensitive API keys or secrets to your repository. Use environment variables (e.g., `.env.local`) to store keys such as `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY`. Rotate any exposed keys immediately.
