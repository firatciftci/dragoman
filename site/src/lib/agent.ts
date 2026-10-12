import {
  siArc,
  siBrave,
  siDuckduckgo,
  siFirefoxbrowser,
  siGooglechrome,
  siOpera,
  siOperagx,
  siSafari,
  siVivaldi,
} from "simple-icons";

export type Family = "chromium" | "firefox" | "safari";

export const marks = {
  Chrome: { path: siGooglechrome.path, color: "#4285f4" },
  Chromium: { path: siGooglechrome.path, color: "#5b8def" },
  Edge: { path: null, color: "#0c78d4" },
  Helium: {
    path: "M10.65 12.9V4.6L12 2l1.35 2.6v8.3ZM10.55 11.28l7.18-4.15 2.93-.13-1.58 2.47-7.18 4.15ZM11.9 10.38l7.18 4.15 1.58 2.47-2.93-.13-7.18-4.15ZM13.35 11.1v8.3L12 22l-1.35-2.6v-8.3ZM13.45 12.72l-7.18 4.15-2.93.13 1.58-2.47 7.18-4.15ZM12.1 13.62 4.92 9.47 3.34 7l2.93.13 7.18 4.15Z",
    color: "#3a52d6",
  },
  Brave: { path: siBrave.path, color: "#fb542b" },
  Arc: { path: siArc.path, color: "#e5484d" },
  Vivaldi: { path: siVivaldi.path, color: "#ef3939" },
  Opera: { path: siOpera.path, color: "#ff1b2d" },
  "Opera GX": { path: siOperagx.path, color: "#ee2950" },
  "Opera Air": { path: siOpera.path, color: "#4d5bff" },
  "Samsung Internet": { path: null, color: "#6f4bd8" },
  Yandex: { path: null, color: "#fc3f1d" },
  DuckDuckGo: { path: siDuckduckgo.path, color: "#de5833" },
  Firefox: { path: siFirefoxbrowser.path, color: "#ff7139" },
  Safari: { path: siSafari.path, color: "#006cff" },
  Ladybird: { path: null, color: "#d9452f" },
} as const;

export type Browser = keyof typeof marks;

export const detect = (): {
  name: Browser | null;
  family: Family | null;
  isPhone: boolean;
} => {
  const agent = navigator.userAgent;
  const brands =
    (
      navigator as Navigator & {
        userAgentData?: { brands: Array<{ brand: string }> };
      }
    ).userAgentData?.brands.map(({ brand }) => brand) ?? [];
  const isAndroid = agent.includes("Android");

  if (
    /iPhone|iPad|iPod/.test(agent) ||
    (agent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  )
    return {
      name:
        (
          [
            [agent.includes("CriOS/"), "Chrome"],
            [agent.includes("FxiOS/"), "Firefox"],
            [agent.includes("EdgiOS/"), "Edge"],
            [/OPiOS|OPT\//.test(agent), "Opera"],
            [agent.includes("DuckDuckGo/"), "DuckDuckGo"],
            ["brave" in navigator, "Brave"],
          ] as Array<readonly [boolean, Browser]>
        ).find(([isMatch]) => isMatch)?.[1] ?? "Safari",
      family: "safari",
      isPhone: true,
    };
  if (agent.includes("Firefox/"))
    return { name: "Firefox", family: "firefox", isPhone: isAndroid };
  if (agent.includes("Ladybird/"))
    return { name: "Ladybird", family: null, isPhone: false };
  if (agent.includes("Chrome/") || brands.includes("Chromium")) {
    const isGoogle =
      brands.includes("Google Chrome") ||
      (brands.length === 0 && navigator.vendor === "Google Inc.");
    return {
      name:
        (
          [
            [
              brands.includes("Microsoft Edge") || /EdgA?\//.test(agent),
              "Edge",
            ],
            [brands.includes("Opera GX"), "Opera GX"],
            [brands.includes("Opera Air"), "Opera Air"],
            [brands.includes("Opera") || agent.includes("OPR/"), "Opera"],
            [agent.includes("SamsungBrowser/"), "Samsung Internet"],
            [agent.includes("YaBrowser/"), "Yandex"],
            [agent.includes("Vivaldi/"), "Vivaldi"],
            [
              brands.includes("DuckDuckGo") || agent.includes("Ddg/"),
              "DuckDuckGo",
            ],
            ["brave" in navigator, "Brave"],
            [
              getComputedStyle(document.documentElement)
                .getPropertyValue("--arc-palette-title")
                .trim() !== "",
              "Arc",
            ],
            [
              isGoogle &&
                !isAndroid &&
                brands.length > 0 &&
                !("OTPCredential" in globalThis) &&
                !("joinAdInterestGroup" in navigator),
              "Helium",
            ],
            [isGoogle, "Chrome"],
          ] as Array<readonly [boolean, Browser]>
        ).find(([isMatch]) => isMatch)?.[1] ?? "Chromium",
      family: isAndroid ? null : "chromium",
      isPhone: isAndroid,
    };
  }
  if (agent.includes("Safari/"))
    return { name: "Safari", family: "safari", isPhone: false };
  return { name: null, family: null, isPhone: isAndroid };
};
