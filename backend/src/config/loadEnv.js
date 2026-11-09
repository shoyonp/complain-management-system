// Load `.env` for local development only. Production hosts (Render/Railway)
// inject environment variables directly, so a missing file is not an error.
//
// This side-effect module is imported before `--memdb` boots and before env
// validation, so an in-memory URI set by the dev script always wins over a
// stale `.env` value. Tests declare their own environment in tests/setup.js.
if (process.env.NODE_ENV !== 'test') {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: fall back to variables provided by the shell or host.
  }
}
