import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { createServer } from "vite";

export async function openStudio(port: number) {
  const root = path.resolve(import.meta.dirname, "..");
  const server = await createServer({
    root: path.join(root, "studio"),
    server: { port, strictPort: false },
    logLevel: "error",
  });
  await server.listen();
  const base = server.resolvedUrls?.local[0] ?? `http://localhost:${port}/`;

  const profile = await mkdtemp(path.join(tmpdir(), "dragoman-studio-"));
  const debugging = port + 300;
  const browser = spawn(
    "/Applications/Helium.app/Contents/MacOS/Helium",
    [
      "--headless=new",
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${debugging}`,
      "--no-first-run",
      "--use-angle=metal",
      "--enable-gpu",
      "--ignore-gpu-blocklist",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let endpoint = "";
  for (let attempt = 0; endpoint === "" && attempt < 50; attempt++) {
    await sleep(200);
    try {
      const response = await fetch(
        `http://127.0.0.1:${debugging}/json/version`,
      );
      endpoint = ((await response.json()) as { webSocketDebuggerUrl: string })
        .webSocketDebuggerUrl;
    } catch {
      endpoint = "";
    }
  }
  const socket = new WebSocket(endpoint);
  await new Promise((resolve) =>
    socket.addEventListener("open", resolve, { once: true }),
  );
  const waiting = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: unknown;
      error?: unknown;
    };
    const handler = message.id == null ? undefined : waiting.get(message.id);
    if (handler == null || message.id == null) return;
    waiting.delete(message.id);
    if (message.error == null) handler.resolve(message.result);
    else handler.reject(new Error(JSON.stringify(message.error)));
  });
  const counter = { id: 0 };
  const send = async <T>(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ) =>
    new Promise<T>((resolve, reject) => {
      counter.id += 1;
      waiting.set(counter.id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      socket.send(
        JSON.stringify({ id: counter.id, method, params, sessionId }),
      );
    });

  const { targetId } = await send<{ targetId: string }>("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await send<{ sessionId: string }>(
    "Target.attachToTarget",
    { targetId, flatten: true },
  );

  const evaluate = async <T>(expression: string) => {
    const result = await send<{
      result: { value: T };
      exceptionDetails?: { text: string; exception?: { description?: string } };
    }>(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (result.exceptionDetails != null)
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text,
      );
    return result.result.value;
  };

  return {
    evaluate,
    async open(page: string, width: number, height: number, ready: string) {
      await send(
        "Emulation.setDeviceMetricsOverride",
        { width, height, deviceScaleFactor: 1, mobile: false },
        sessionId,
      );
      await send("Page.navigate", { url: new URL(page, base).href }, sessionId);
      let steady = 0;
      for (let attempt = 0; steady < 12 && attempt < 400; attempt++) {
        await sleep(250);
        try {
          steady = (await evaluate<boolean>(
            `(${ready}) && document.readyState === 'complete'`,
          ))
            ? steady + 1
            : 0;
        } catch {
          steady = 0;
        }
      }
      if (steady < 12) throw new Error(`${page} never became ready`);
    },
    async capture() {
      const { data } = await send<{ data: string }>(
        "Page.captureScreenshot",
        { format: "jpeg", quality: 94 },
        sessionId,
      );
      return Buffer.from(data, "base64");
    },
    async close() {
      socket.close();
      const exited = new Promise((resolve) => browser.once("exit", resolve));
      browser.kill();
      await exited;
      await server.close();
      await rm(profile, { recursive: true, force: true });
    },
  };
}
