// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home, { metadata as homeMeta } from "../../src/app/page";
import AboutPage, { metadata as aboutMeta } from "../../src/app/about/page";
import ContactPage, { metadata as contactMeta } from "../../src/app/contact/page";
import PricingPage, { metadata as pricingMeta } from "../../src/app/pricing/page";
import { PricingContent } from "../../src/components/pricing/PricingContent";
import { Header } from "../../src/components/common/Header";
import { Footer } from "../../src/components/common/Footer";
import { FloatingContact } from "../../src/components/common/FloatingContact";
import { AudioPlayerProvider, usePlayer } from "../../src/components/player/AudioPlayerContext";
import { contact } from "../../src/config/contact";
import { pricing, formatVnd, type PricingConfig } from "../../src/config/pricing";
import { vi as dict } from "../../src/lib/i18n/vi";
import { installAudioMock } from "./audio-mock";

function collectStrings(value: unknown, path: string, out: [string, string][]) {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectStrings(v, `${path}.${k}`, out);
  }
}

function clonePricing(): PricingConfig {
  return JSON.parse(JSON.stringify(pricing)) as PricingConfig;
}

const requiredKeys = [
  "common.skipLink",
  "common.placeholderBadge",
  "common.customCta",
  "nav.catalog",
  "nav.pricing",
  "nav.custom",
  "nav.about",
  "nav.contact",
  "footer.tagline",
  "floatingContact.label",
  "floatingContact.zalo",
  "floatingContact.hotline",
  "floatingContact.messenger",
  "meta.home.title",
  "meta.about.title",
  "meta.contact.title",
  "meta.pricing.title",
  "home.title",
  "about.title",
  "contactPage.title",
  "pricing.title",
  "pricing.licenses.standard.name",
  "pricing.licenses.exclusive.name",
  "process.steps",
];

function lookup(path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], dict);
}

describe("vi dictionary", () => {
  it("defines every key the static pages need, non-empty", () => {
    for (const key of requiredKeys) {
      const value = lookup(key);
      expect(value, key).toBeDefined();
      if (typeof value === "string") expect(value.trim().length, key).toBeGreaterThan(0);
    }
  });

  it("has no empty or 'undefined' strings anywhere", () => {
    const all: [string, string][] = [];
    collectStrings(dict, "vi", all);
    for (const [path, text] of all) {
      expect(text.trim().length, path).toBeGreaterThan(0);
      expect(text, path).not.toMatch(/undefined|\[object/);
    }
  });

  it("matches package and process counts used by config", () => {
    expect(dict.process.steps).toHaveLength(pricing.processSteps);
    expect(dict.customRequest.tiers).toHaveLength(pricing.packages.length);
    for (const pkg of pricing.packages) {
      expect(dict.pricing.packages[pkg.id].deliverables.length).toBeGreaterThanOrEqual(pkg.deliverablesCount);
      for (const a of pkg.addOns) {
        expect(
          (dict.pricing.packages[pkg.id].addOns as Record<string, string>)[a.id],
          `${pkg.id}.${a.id}`
        ).toBeTruthy();
      }
    }
    for (const l of pricing.licenses) {
      expect(dict.pricing.licenses[l.id].rights.length).toBeGreaterThanOrEqual(l.rightsCount);
    }
  });
});

describe("static pages render", () => {
  const pages: [string, () => React.ReactElement, RegExp][] = [
    ["Home", () => <Home />, new RegExp(dict.home.title)],
    ["About", () => <AboutPage />, new RegExp(dict.about.title)],
    ["Contact", () => <ContactPage />, new RegExp(dict.contactPage.title)],
    ["Pricing", () => <PricingPage />, new RegExp(dict.pricing.title)],
  ];

  it.each(pages)("%s mounts with an h1, a main landmark and no undefined text", (_name, make, h1) => {
    const { container } = render(make());
    expect(screen.getByRole("heading", { level: 1, name: h1 })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/undefined|\[object|\{\w+\}/);
  });

  it("Home shows hero, featured, artist and custom-order sections with 4 process steps", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: dict.home.latestTitle })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: dict.home.artistName })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: dict.home.customTitle })).toBeInTheDocument();
    expect(within(screen.getByTestId("process-steps")).getAllByRole("listitem")).toHaveLength(4);
  });

  it("About shows bio, journey and philosophy sections", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: dict.about.bioTitle })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: dict.about.journeyTitle })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: dict.about.philosophyTitle })).toBeInTheDocument();
  });

  it("Contact reads every channel from src/config/contact.ts", () => {
    render(<ContactPage />);
    expect(screen.getByRole("link", { name: contact.phone.display })).toHaveAttribute("href", contact.phone.tel);
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute("href", `mailto:${contact.email}`);
    expect(screen.getByRole("link", { name: contact.zaloUrl })).toHaveAttribute("href", contact.zaloUrl);
    expect(screen.getByRole("link", { name: contact.messengerUrl })).toHaveAttribute("href", contact.messengerUrl);
    expect(screen.getByText(contact.address)).toBeInTheDocument();
    for (const s of contact.socials) {
      expect(screen.getByRole("link", { name: dict.social[s.id] })).toHaveAttribute("href", s.url);
    }
  });

  it("every 'Đặt nhạc riêng' style CTA points to /custom-request and no cart/buy/login controls exist", () => {
    for (const make of [() => <Home />, () => <AboutPage />, () => <ContactPage />, () => <PricingPage />]) {
      const { container, unmount } = render(make());
      const ctas = screen.getAllByRole("link", {
        name: new RegExp(`${dict.common.customCta}|${dict.common.customCtaLong}|${dict.home.ctaCustom}`),
      });
      expect(ctas.length).toBeGreaterThan(0);
      for (const a of ctas) expect(a).toHaveAttribute("href", "/custom-request");
      expect(container.textContent).not.toMatch(/giỏ hàng|mua ngay|thanh toán ngay|đăng nhập|đăng ký/i);
      unmount();
    }
  });
});

describe("Pricing page", () => {
  it("renders both license rows from config", () => {
    render(<PricingPage />);
    const table = screen.getByTestId("license-table");
    for (const l of pricing.licenses) {
      const copy = dict.pricing.licenses[l.id];
      const row = within(table).getByRole("row", { name: new RegExp(copy.name) });
      expect(within(row).getByText(`Từ ${formatVnd(l.fromPriceVnd)}`)).toBeInTheDocument();
      for (const r of copy.rights.slice(0, l.rightsCount)) expect(within(row).getByText(r)).toBeInTheDocument();
    }
  });

  it("renders three custom packages with range, revisions, days, deliverables and add-ons", () => {
    render(<PricingPage />);
    const table = screen.getByTestId("package-table");
    expect(dict.customRequest.tiers).toHaveLength(3);
    pricing.packages.forEach((pkg, i) => {
      const row = within(table).getByRole("row", { name: new RegExp(dict.customRequest.tiers[i]) });
      expect(within(row).getByText(`${formatVnd(pkg.minVnd)} – ${formatVnd(pkg.maxVnd)}`)).toBeInTheDocument();
      expect(within(row).getByText(`${pkg.freeRevisions} lần`)).toBeInTheDocument();
      expect(within(row).getByText(`${pkg.deliveryDays} ngày`)).toBeInTheDocument();
      for (const d of dict.pricing.packages[pkg.id].deliverables.slice(0, pkg.deliverablesCount)) {
        expect(within(row).getByText(d)).toBeInTheDocument();
      }
      for (const a of pkg.addOns) {
        const name = (dict.pricing.packages[pkg.id].addOns as Record<string, string>)[a.id];
        expect(within(row).getByText((c) => c.includes(name))).toBeInTheDocument();
        expect(within(row).getByText(`+${formatVnd(a.priceVnd)}`)).toBeInTheDocument();
      }
    });
  });

  it("renders the 4 process steps and the /custom-request CTA", () => {
    render(<PricingPage />);
    const steps = within(screen.getByTestId("process-steps")).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    dict.process.steps.forEach((s, i) => expect(steps[i]).toHaveTextContent(s.title));
    expect(screen.getByRole("link", { name: dict.common.customCtaLong })).toHaveAttribute("href", "/custom-request");
  });

  it("derives displayed prices from the config, not constants in the component", () => {
    const cfg = clonePricing();
    cfg.licenses[0].fromPriceVnd = 123_456;
    cfg.packages[1].freeRevisions = 9;
    cfg.packages[2].deliveryDays = 77;
    render(<PricingContent config={cfg} />);
    expect(screen.getByText(`Từ ${formatVnd(123_456)}`)).toBeInTheDocument();
    expect(screen.getByText("9 lần")).toBeInTheDocument();
    expect(screen.getByText("77 ngày")).toBeInTheDocument();
  });

  it("every shipped price entry is flagged isPlaceholder", () => {
    expect(pricing.licenses.every((l) => l.isPlaceholder)).toBe(true);
    for (const p of pricing.packages) {
      expect(p.isPlaceholder).toBe(true);
      expect(p.addOns.every((a) => a.isPlaceholder)).toBe(true);
    }
    expect(contact.isPlaceholder).toBe(true);
  });

  it("shows the 'Giá minh họa' badge when any entry is a placeholder", () => {
    render(<PricingPage />);
    expect(screen.getByText("Giá minh họa")).toBeInTheDocument();
  });

  it("shows the badge for a single placeholder add-on only", () => {
    const cfg = clonePricing();
    cfg.licenses.forEach((l) => (l.isPlaceholder = false));
    cfg.packages.forEach((p) => {
      p.isPlaceholder = false;
      p.addOns.forEach((a) => (a.isPlaceholder = false));
    });
    cfg.packages[0].addOns[0].isPlaceholder = true;
    render(<PricingContent config={cfg} />);
    expect(screen.getByText("Giá minh họa")).toBeInTheDocument();
  });

  it("hides the badge when no entry is a placeholder", () => {
    const cfg = clonePricing();
    cfg.licenses.forEach((l) => (l.isPlaceholder = false));
    cfg.packages.forEach((p) => {
      p.isPlaceholder = false;
      p.addOns.forEach((a) => (a.isPlaceholder = false));
    });
    render(<PricingContent config={cfg} />);
    expect(screen.queryByText("Giá minh họa")).toBeNull();
  });
});

describe("Header and Footer", () => {
  it("Header shows the brand, 5 nav links, no cart/login, and a custom-request CTA", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: dict.nav.mainLabel });
    const hrefs = within(nav).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/tracks", "/pricing", "/custom-request", "/about", "/contact"]);
    const ctaHrefs = screen.getAllByRole("link", { name: dict.common.customCta }).map((a) => a.getAttribute("href"));
    expect(ctaHrefs.every((h) => h === "/custom-request")).toBe(true);
    expect(screen.queryByText(/giỏ hàng|đăng nhập/i)).toBeNull();
  });

  it("MobileMenu toggles, exposes the same links and closes after a link click", async () => {
    const user = userEvent.setup();
    render(<Header />);
    const toggle = screen.getByRole("button", { name: dict.nav.openMenu });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: dict.nav.mobileLabel })).toBeNull();
    await user.click(toggle);
    const menu = screen.getByRole("navigation", { name: dict.nav.mobileLabel });
    expect(within(menu).getAllByRole("link")).toHaveLength(5);
    expect(screen.getByRole("button", { name: dict.nav.closeMenu })).toHaveAttribute("aria-expanded", "true");
    await user.click(within(menu).getByRole("link", { name: dict.nav.pricing }));
    expect(screen.queryByRole("navigation", { name: dict.nav.mobileLabel })).toBeNull();
  });

  it("Footer reads contact details from config and has link groups", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute("href", `mailto:${contact.email}`);
    expect(screen.getByRole("link", { name: contact.phone.display })).toHaveAttribute("href", contact.phone.tel);
    expect(screen.getByRole("navigation", { name: dict.footer.exploreLabel })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: dict.footer.infoLabel })).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(dict.brand.name)).length).toBeGreaterThan(0);
  });
});

describe("route metadata", () => {
  it.each([
    ["home", homeMeta, dict.meta.home, "/"],
    ["about", aboutMeta, dict.meta.about, "/about"],
    ["contact", contactMeta, dict.meta.contact, "/contact"],
    ["pricing", pricingMeta, dict.meta.pricing, "/pricing"],
  ])("%s has title, description and OpenGraph tags", (_n, meta, copy, path) => {
    expect(meta.title).toBe(`${copy.title} – ${dict.brand.name}`);
    expect(meta.description).toBe(copy.description);
    expect(meta.openGraph).toMatchObject({
      title: meta.title,
      description: copy.description,
      url: path,
      siteName: dict.brand.name,
      locale: "vi_VN",
      type: "website",
    });
  });
});

describe("FloatingContact", () => {
  beforeEach(() => {
    installAudioMock();
  });

  function Starter() {
    const player = usePlayer();
    return (
      <button
        onClick={() =>
          player.toggle({
            id: "t",
            slug: "t",
            title: "T",
            genre: "g",
            mood: "m",
            previewFileUrl: "/audio/previews/t.mp3",
            coverImageUrl: null,
            durationSeconds: 10,
          })
        }
      >
        start
      </button>
    );
  }

  const renderWidget = () =>
    render(
      <AudioPlayerProvider>
        <Starter />
        <FloatingContact />
      </AudioPlayerProvider>
    );

  it("renders Zalo, Hotline (tel:) and Messenger with hrefs from config and labels from the dictionary", () => {
    renderWidget();
    const region = screen.getByRole("complementary", { name: dict.floatingContact.label });
    const links = within(region).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      contact.zaloUrl,
      contact.phone.tel,
      contact.messengerUrl,
    ]);
    expect(contact.phone.tel.startsWith("tel:")).toBe(true);
    expect(within(region).getByRole("link", { name: dict.floatingContact.zaloAria })).toBeInTheDocument();
    expect(
      within(region).getByRole("link", {
        name: dict.floatingContact.hotlineAria.replace("{phone}", contact.phone.display),
      })
    ).toBeInTheDocument();
    expect(within(region).getByRole("link", { name: dict.floatingContact.messengerAria })).toBeInTheDocument();
    expect(within(region).getByText(dict.floatingContact.zalo)).toBeInTheDocument();
    expect(within(region).getByText(dict.floatingContact.hotline)).toBeInTheDocument();
    expect(within(region).getByText(dict.floatingContact.messenger)).toBeInTheDocument();
  });

  it("links are keyboard reachable in order", async () => {
    const user = userEvent.setup();
    renderWidget();
    const links = within(screen.getByRole("complementary")).getAllByRole("link");
    for (const a of links) expect(a).not.toHaveAttribute("tabindex", "-1");
    await user.click(screen.getByText("start"));
    screen.getByText("start").focus();
    await user.tab();
    expect(links[0]).toHaveFocus();
    await user.tab();
    expect(links[1]).toHaveFocus();
    await user.tab();
    expect(links[2]).toHaveFocus();
  });

  it("moves above the audio player bar while a track is loaded", () => {
    renderWidget();
    const aside = screen.getByRole("complementary");
    expect(aside).toHaveAttribute("data-player-active", "false");
    expect(aside.className).toContain("bottom-4");
    fireEvent.click(screen.getByText("start"));
    expect(aside).toHaveAttribute("data-player-active", "true");
    expect(aside.className).toContain("bottom-28");
    expect(aside.className).not.toContain("bottom-4");
  });
});
