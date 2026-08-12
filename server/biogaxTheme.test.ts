import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const cssSource = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("Biogax theme contract", () => {
  it("keeps distinct landing and authenticated workspace shells", () => {
    expect(homeSource).toContain("biogax-landing");
    expect(homeSource).toContain("biogax-workspace");
    expect(cssSource).toContain(".biogax-landing .mntn-hero");
    expect(cssSource).toContain(".biogax-workspace .mntn-hero");
  });

  it("preserves the core tracker actions behind the themed shell", () => {
    expect(homeSource).toContain("uploadAcceptAttribute");
    expect(homeSource).toContain("downloadInventorySection");
    expect(homeSource).toContain("setMarketRegion");
    expect(homeSource).toContain("onClick={logout}");
    expect(homeSource).toContain("setTab(\"upload\")");
  });

  it("uses the project-scoped Biogax hero asset rather than a remote runtime URL", () => {
    expect(cssSource).toContain("/manus-storage/biogax-green-energy-hero_350becc2.png");
  });

  it("keeps metric cards readable and aligned beneath the hero text overrides", () => {
    expect(cssSource).toContain(".biogax-workspace .mntn-hero .mntn-metric-card [class*=\"text-white\"]");
    expect(cssSource).toContain(".biogax-workspace .mntn-metric-card .mntn-metric-value");
    expect(cssSource).toContain("@media (max-width: 1180px)");
    expect(cssSource).toContain("grid-template-columns: 1fr;");
  });
});
