# Playblast

Internal video proofing tool for BRZRK — timestamped comments, version management, side-by-side comparison, and approval workflows for reviewing CGI renders and motion work.

## Stack

- **Client** — React, Vite, shadcn/ui, Tailwind CSS
- **Server** — Express, local filesystem

## Project structure

```
.
├── client/   # Vite + React frontend
├── server/   # Express API
└── package.json
```

## Getting started

Install dependencies from the repository root:

```bash
npm install
```

Start both the client and server in development mode:

```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client and server concurrently |
| `npm run build` | Build client and server for production |
| `npm run lint` | Lint the client |

## Workspaces

This repo uses npm workspaces. Run package-specific scripts with:

```bash
npm run dev -w client
npm run dev -w server
```
