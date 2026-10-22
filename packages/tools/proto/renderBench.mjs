/* global process, URL, console, window */
// THROWAWAY prototype (SIL-12): drives packages/render/proto.html in Chrome and prints JSON.
// Usage: node renderBench.mjs [mode=render|both] [shadows=0|1] [warmup=5] [duration=60]
import { createServer } from "vite";
import puppeteer from "puppeteer-core";

const [mode = "render", shadows = "0", warmup = "5", duration = "60"] = process.argv.slice(2);
const chrome =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const server = await createServer({
  root: new URL("../../render", import.meta.url).pathname,
  logLevel: "error",
});
await server.listen();
const url = `${server.resolvedUrls.local[0]}proto.html?mode=${mode}&shadows=${shadows}&warmup=${warmup}&duration=${duration}`;

const browser = await puppeteer.launch({
  executablePath: chrome,
  // New headless keeps requestAnimationFrame running when the display sleeps or is locked.
  headless: true,
  args: [
    "--use-angle=metal",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--window-size=1280,800",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto(url);
  const handle = await page.waitForFunction(() => window.__result, {
    timeout: (Number(warmup) + Number(duration) + 30) * 1000,
    polling: 500,
  });
  console.log(JSON.stringify(await handle.jsonValue()));
} finally {
  await browser.close();
  await server.close();
}
