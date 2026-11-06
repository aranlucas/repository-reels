import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import type { HyperframesPlayer } from "@hyperframes/player";

test("find a film, select it, reload its deep link and inspect its evidence", async ({
  app,
  screen,
  browser,
}) => {
  await app.open("/");
  await screen.getByRole("textbox", "Find a repository").fill("delivery-dash");
  await screen.getByRole("button", "delivery-dash render passed").click();
  await expect(browser).toHaveURL("/?repo=delivery-dash");
  await expect(browser.locator("hyperframes-player")).toHaveAttribute(
    "src",
    "/renders/delivery-dash.webm",
  );
  await expect(screen.getByRole("link", "↓ Download WebM")).toHaveAttribute(
    "href",
    "/renders/delivery-dash.webm",
  );
  await browser.reload();
  await expect(screen.getByRole("button", "delivery-dash render passed")).toHaveAttribute(
    "aria-current",
    "true",
  );
  await screen.getByText("Inspect sources").click();
  await expect(screen.getByRole("link", "Captured commit ↗")).toHaveAttribute(
    "href",
    /^https:\/\/github.com\/aranlucas\/delivery-dash\/commit\/[a-f0-9]{40}$/,
  );
  await screen.getByRole("button", "Play", { exact: true }).click();

  const progressed = await browser.evaluate(
    () =>
      new Promise<boolean>((resolve, reject) => {
        // SAFETY: the registered Hyperframes element is present after the asserted src.
        const player = document.querySelector("hyperframes-player") as HyperframesPlayer;

        const timeout = setTimeout(() => {
          player.removeEventListener("timeupdate", onTime);

          reject(new Error("Film playback did not advance"));
        }, 10000);

        function onTime() {
          if (player.currentTime > 0.25) {
            clearTimeout(timeout);
            player.removeEventListener("timeupdate", onTime);

            resolve(true);
          }
        }

        player.addEventListener("timeupdate", onTime);
        onTime();
      }),
  );

  expect(progressed).toBe(true);

  const media = await browser.evaluate(async () => {
    const response = await fetch("/renders/delivery-dash.webm", {
      headers: { Range: "bytes=-16" },
    });

    return { status: response.status, bytes: (await response.arrayBuffer()).byteLength };
  });

  expect(media).toEqual({ status: 206, bytes: 16 });
});

test("missing collection evidence produces an honest error", async ({ app, browser, screen }) => {
  await browser.route("**/data/manifest.json", async (route) => {
    await route.fulfill({ status: 503, body: "Unavailable" });
  });
  await app.open("/");
  await expect(screen.getByRole("alert")).toHaveText("The coverage manifest is unavailable.");
});
