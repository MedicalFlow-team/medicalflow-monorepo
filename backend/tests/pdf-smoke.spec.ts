import { expect, test } from "@playwright/test";

test("generates an A4 PDF from HTML", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: sans-serif; }
        </style>
      </head>
      <body><main><h1>PDF smoke test</h1></main></body>
    </html>
  `);

  const pdf = await page.pdf({ format: "A4", printBackground: true });

  expect(pdf.byteLength).toBeGreaterThan(0);
  expect(pdf.toString("ascii", 0, 5)).toBe("%PDF-");
});