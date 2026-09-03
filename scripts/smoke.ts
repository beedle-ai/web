import { spawn, spawnSync } from "node:child_process"
import { createServer } from "node:net"
import { setTimeout as sleep } from "node:timers/promises"

const PORT = 3999
const DIST_DIR = ".next-smoke"
const ENV = { ...process.env, NEXT_DIST_DIR: DIST_DIR }
const BASE = `http://localhost:${PORT}`
const PAST_ID = "20260903-2142"
const FUTURE_ID = "20990101-0000"
const PAST_HOUR = "20260903-21"

interface Check {
  path: string
  status: number
  contentType?: string
  contains?: string
}

const CHECKS: Check[] = [
  { path: "/", status: 200, contains: "a new drawing every minute" },
  { path: `/m/${PAST_ID}`, status: 200, contains: "No. " },
  { path: `/m/${FUTURE_ID}`, status: 200, contains: "not yet drawn" },
  { path: "/m/not-a-minute", status: 404 },
  { path: `/m/${PAST_ID}/svg`, status: 200, contentType: "image/svg+xml", contains: 'id="pen-0"' },
  { path: `/m/${FUTURE_ID}/svg`, status: 404 },
  { path: `/m/${PAST_ID}/opengraph-image`, status: 200, contentType: "image/png" },
  { path: "/archive", status: 200, contains: "your minute" },
  { path: "/today", status: 200, contains: "the last twenty-four hours" },
  { path: `/hour/${PAST_HOUR}`, status: 200, contains: "sixty minutes" },
  { path: "/hour/not-an-hour", status: 404 },
]

function assertPortFree(): Promise<void> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once("error", () => reject(new Error(`port ${PORT} is already in use`)))
    probe.once("listening", () => probe.close(() => resolve()))
    probe.listen(PORT)
  })
}

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(BASE)
      if (response.ok) return
    } catch {
      await sleep(1000)
    }
  }
  throw new Error("server did not start")
}

async function runCheck(check: Check): Promise<string | null> {
  const response = await fetch(`${BASE}${check.path}`)
  if (response.status !== check.status) {
    return `${check.path}: expected ${check.status}, got ${response.status}`
  }
  const contentType = response.headers.get("content-type") ?? ""
  if (check.contentType && !contentType.startsWith(check.contentType)) {
    return `${check.path}: expected ${check.contentType}, got ${contentType}`
  }
  if (check.contains) {
    const body = await response.text()
    if (!body.includes(check.contains)) return `${check.path}: body missing "${check.contains}"`
  }
  return null
}

function build(): void {
  const result = spawnSync("node_modules/.bin/next", ["build"], { stdio: "inherit", env: ENV })
  if (result.status !== 0) throw new Error("build failed")
}

async function main(): Promise<void> {
  await assertPortFree()
  build()
  const server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], {
    stdio: "ignore",
    detached: true,
    env: ENV,
  })
  try {
    await waitForServer()
    const failures = (await Promise.all(CHECKS.map(runCheck))).filter(
      (failure): failure is string => failure !== null
    )
    for (const failure of failures) process.stderr.write(`${failure}\n`)
    process.stdout.write(
      `${CHECKS.length - failures.length}/${CHECKS.length} smoke checks passed\n`
    )
    process.exitCode = failures.length === 0 ? 0 : 1
  } finally {
    if (server.pid) process.kill(-server.pid, "SIGTERM")
  }
}

void main()
