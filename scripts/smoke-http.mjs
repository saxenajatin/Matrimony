/**
 * Lightweight HTTP smoke checks for marketing + auth surfaces.
 * Usage (with `npm run dev` running): npm run smoke
 *
 * If Next restarted on another port (common after config changes),
 * set SMOKE_BASE_URL or let this script probe 3000–3005.
 */
const explicitBase = process.env.SMOKE_BASE_URL;

const paths = ["/", "/login", "/register", "/forgot-password"];

async function probeBase(base) {
  try {
    const home = await fetch(`${base}/`, { redirect: "manual" });
    if (home.status < 200 || home.status >= 400) return false;
    const login = await fetch(`${base}/login`, { redirect: "manual" });
    return login.status >= 200 && login.status < 400;
  } catch {
    return false;
  }
}

async function resolveBase() {
  if (explicitBase) return explicitBase.replace(/\/$/, "");

  for (let port = 3000; port <= 3005; port++) {
    const base = `http://localhost:${port}`;
    if (await probeBase(base)) {
      if (port !== 3000) {
        console.log(`Using ${base} (port ${port} — auth routes not on :3000)`);
      }
      return base;
    }
  }

  throw new Error(
    "No healthy Next.js server found on localhost:3000–3005. Start `npm run dev`, or set SMOKE_BASE_URL.",
  );
}

async function main() {
  const base = await resolveBase();
  let failed = 0;

  for (const path of paths) {
    const url = `${base}${path}`;
    try {
      const res = await fetch(url, { redirect: "manual" });
      const ok = res.status >= 200 && res.status < 400;
      console.log(`${ok ? "OK" : "FAIL"} ${res.status} ${path}`);
      if (!ok) failed += 1;
    } catch (error) {
      console.log(
        `FAIL  --- ${path} (${error instanceof Error ? error.message : error})`,
      );
      failed += 1;
    }
  }

  if (failed > 0) {
    console.error(`Smoke failed: ${failed} route(s) against ${base}`);
    process.exit(1);
  }
  console.log(`Smoke passed (${base}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
