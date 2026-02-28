#!/usr/bin/env python3
import argparse
import asyncio
import subprocess
import sys
import time
from contextlib import suppress

from playwright.async_api import async_playwright


async def wait_for_renderer(page, expected, timeout_ms=12000):
    start = time.time()
    last = ""
    while (time.time() - start) * 1000 < timeout_ms:
        if await page.locator("#pcvDebugPanel").count() > 0:
            txt = await page.locator("#pcvDebugPanel").inner_text()
            last = txt
            for line in txt.splitlines():
                if line.startswith("renderer:"):
                    renderer = line.split(":", 1)[1].strip()
                    if renderer == expected:
                        return txt
        await page.wait_for_timeout(250)
    raise AssertionError(f"Expected renderer '{expected}' but got panel: {last}")


async def run_scenario(browser, base_url, name, expected_renderer, extra_init_script=""):
    context = await browser.new_context(viewport={"width": 1280, "height": 900})
    page = await context.new_page()
    await page.add_init_script("localStorage.setItem('pcvDebug', '1');")
    if extra_init_script:
        await page.add_init_script(extra_init_script)

    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    await page.goto(base_url, wait_until="networkidle")
    panel = await wait_for_renderer(page, expected_renderer)

    if errors:
        raise AssertionError(f"{name}: page errors: {errors}")

    print(f"[OK] {name}: renderer={expected_renderer}")
    print(panel)
    await context.close()


async def run(base_url):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            await run_scenario(browser, base_url, "mapbox-default", "mapbox")
            await run_scenario(
                browser,
                base_url,
                "leaflet-fallback-on-bad-runtime-token",
                "leaflet",
                "window.__PCV_CONFIG__ = { ...(window.__PCV_CONFIG__ || {}), mapboxToken: 'pk.invalid.token' };",
            )
        finally:
            await browser.close()


def main():
    parser = argparse.ArgumentParser(description="Run browser smoke checks for map renderer modes.")
    parser.add_argument("--base-url", default="http://127.0.0.1:4173/")
    parser.add_argument("--start-server", action="store_true")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()

    server = None
    if args.start_server:
        server = subprocess.Popen(
            [sys.executable, "-m", "http.server", str(args.port)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        time.sleep(0.8)

    try:
        asyncio.run(run(args.base_url))
    finally:
        if server:
            with suppress(Exception):
                server.terminate()
                server.wait(timeout=2)


if __name__ == "__main__":
    main()
