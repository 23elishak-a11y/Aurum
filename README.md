# Aurum

Aurum is a private, desktop-style personal digital environment built with Next.js, React, TypeScript, and SQLite.

## Development

1. Copy `.env.example` to `.env.local`.
2. Set `AURUM_ACCESS_CODE_HASH` to the bcrypt hash of a numerical access code. For example, generate a hash with `node -e "require('bcryptjs').hash('YOUR_CODE', 12).then(console.log)"`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

## Database

The SQLite database is created automatically at `.data/aurum.sqlite`. It is excluded from source control by `.gitignore`. No migration step is required for the initial schema.

## Production

Set `AURUM_ACCESS_CODE_HASH` to a bcrypt hash of the access code. Set `AURUM_SECURE_COOKIES=true` and serve the application over HTTPS.

For example:

```bash
npm run build
npm start
```

Deploy to a Node.js host with a persistent writable `.data` directory. SQLite is not appropriate for ephemeral serverless filesystems. Use a persistent volume or migrate to an external PostgreSQL database in that environment.

## Testing

```bash
npm run lint
npm run build
```

## Integrations

GitHub, Vercel, and Netlify credentials must be configured only as server-side environment variables. The UI identifies integrations as unconfigured until real credentials and API workflows are connected. Aurum does not simulate deployments.

## Custom applications

Custom apps are registered conceptually through a server-side allowlist and exposed through the desktop window system. Until an app is explicitly approved, it must not receive filesystem, network, database, or session privileges. Any future app package should declare an app ID, title, icon, entry URL or component, and a minimum permission set. Remote custom-app code must execute in an isolated iframe or sandboxed worker with explicit postMessage permissions; it must never receive unrestricted access to private server APIs or the session cookie.
