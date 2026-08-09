console.log("SERVER BOOTING");

import "dotenv/config";
import express from "express";
import path from "path";
import http from "http";
import https from "https";
import { spawn } from "child_process";

const app = express();

const SHOULD_START_INTERNAL_BACKEND =
  !process.env.BACKEND_URL ||
  process.env.BACKEND_URL === "http://127.0.0.1:4000" ||
  process.env.BACKEND_URL === "http://localhost:4000";

const INTERNAL_BACKEND_PORT =
  process.env.BACKEND_PORT || "4000";

let backendProcess: ReturnType<typeof spawn> | null = null;
let backendRestartTimer: ReturnType<typeof setTimeout> | null = null;
let backendRestartAttempt = 0;
let shuttingDown = false;

const scheduleInternalBackendRestart = () => {
  if (shuttingDown || backendRestartTimer) return;

  backendProcess = null;
  const delayMs = Math.min(1000 * (2 ** backendRestartAttempt), 30000);
  backendRestartAttempt += 1;
  console.error(`Restarting internal API in ${delayMs}ms`);
  backendRestartTimer = setTimeout(() => {
    backendRestartTimer = null;
    startInternalBackend();
  }, delayMs);
};

const startInternalBackend = () => {
  if (!SHOULD_START_INTERNAL_BACKEND || shuttingDown || backendProcess) return;

  console.log(
    `STARTING INTERNAL API ON 127.0.0.1:${INTERNAL_BACKEND_PORT}`
  );

  backendProcess = spawn(
    process.execPath,
    ["server.js"],
    {
      cwd: path.join(process.cwd(), "bluecrestback"),
      stdio: "inherit",
      env: {
        ...process.env,
        PORT: INTERNAL_BACKEND_PORT,
        NODE_ENV: process.env.NODE_ENV || "production"
      }
    }
  );

  backendProcess.on("exit", (code, signal) => {
    backendProcess = null;
    console.error(
      `Internal API exited with code ${code ?? "null"} and signal ${signal ?? "null"}`
    );

    scheduleInternalBackendRestart();
  });

  backendProcess.on("error", error => {
    console.error("Failed to launch internal API:", error);
    scheduleInternalBackendRestart();
  });
};

startInternalBackend();

const configuredBackendUrl =
  process.env.BACKEND_URL ||
  `http://127.0.0.1:${INTERNAL_BACKEND_PORT}`;

// Avoid Node resolving localhost to IPv6 while the child API listens on IPv4.
const BACKEND_URL = configuredBackendUrl.replace(
  /^http:\/\/localhost(?=[:/]|$)/i,
  "http://127.0.0.1"
);

console.log(`REGISTERING API PROXY -> ${BACKEND_URL}`);

app.use("/api", (req, res) => {
  const backend = new URL(BACKEND_URL);
  const transport = backend.protocol === "http:" ? http : https;

  const options = {
    hostname: backend.hostname,
    port: backend.port || (backend.protocol === "http:" ? 80 : 443),
    path: `/api${req.url}`,
    method: req.method,
    headers: {
      "content-type":
        req.headers["content-type"] || "application/json",
      ...(req.headers["content-length"]
        ? { "content-length": req.headers["content-length"] }
        : {}),
      "accept":
        req.headers["accept"] || "*/*",
      "authorization":
        req.headers["authorization"] || ""
    },
    timeout: Number(process.env.API_PROXY_TIMEOUT_MS || 30000)
  }

  const proxyReq = transport.request(
    options,
    (proxyRes) => {
      backendRestartAttempt = 0;
      res.writeHead(
        proxyRes.statusCode || 200,
        proxyRes.headers
      );

      proxyRes.pipe(res, {
        end: true
      });
    }
  );

  proxyReq.on("timeout", () => {
    console.error(`API proxy timed out: ${req.method} /api${req.url}`);
    proxyReq.destroy(new Error("API proxy timed out"));
  });

  proxyReq.on("error", (err: any) => {
    console.error("========== PROXY ERROR ==========");
    console.error(err);
    console.error("NAME:", err?.name);
    console.error("MESSAGE:", err?.message);
    console.error("STACK:", err?.stack);

    if ((err as any)?.rawPacket) {
      console.error(
        "RAW PACKET:",
        (err as any).rawPacket.toString()
      );
    }

    console.error("=================================");

    if (!res.headersSent) {
      res.status(502).json({
        error: "Backend unavailable"
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  });

  req.pipe(proxyReq, {
    end: true
  });
});

process.on("SIGTERM", () => {
  shuttingDown = true;
  if (backendRestartTimer) clearTimeout(backendRestartTimer);
  backendProcess?.kill("SIGTERM");
  process.exit(0);
});

process.on("SIGINT", () => {
  shuttingDown = true;
  if (backendRestartTimer) clearTimeout(backendRestartTimer);
  backendProcess?.kill("SIGINT");
  process.exit(0);
});

const distPath = path.join(
  process.cwd(),
  "dist"
);

console.log("DIST PATH:", distPath);

app.use(express.static(distPath));

app.get("*", (_, res) => {
  res.sendFile(
    path.join(
      distPath,
      "index.html"
    )
  );
});

const PORT = process.env.PORT || 3000;

const waitForInternalBackend = async () => {
  if (!SHOULD_START_INTERNAL_BACKEND) return;

  const timeoutMs = Number(process.env.BACKEND_STARTUP_TIMEOUT_MS || 90000);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const ready = await new Promise<boolean>((resolve) => {
      const healthUrl = new URL('/health', BACKEND_URL);
      const request = http.get(healthUrl, response => {
        response.resume();
        resolve((response.statusCode || 500) < 500);
      });
      request.setTimeout(2000, () => request.destroy());
      request.on('error', () => resolve(false));
    });

    if (ready) {
      backendRestartAttempt = 0;
      console.log('INTERNAL API READY');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Internal API did not become ready within ${timeoutMs}ms`);
};

const startFrontend = async () => {
  await waitForInternalBackend();
  app.listen(PORT, () => {
    console.log(`Frontend listening on port ${PORT}`);
  });
};

startFrontend().catch(error => {
  console.error('Frontend startup failed:', error.message);
  backendProcess?.kill('SIGTERM');
  process.exit(1);
});
