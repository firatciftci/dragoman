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
  Edge: {
    path: "M14.223 14.011c-.104 .093-.255 .229-.255 .464 0 .243 .161 .488 .45 .684 1.316 .919 3.781 .81 3.888 .807h.003c1.001 0 1.98-.27 2.841-.779A5.76 5.76 0 0 0 24 10.229c.027-1.974-.66-3.327-.999-3.996l-.06-.12C20.944 2.231 16.659 0 12 0A12 12 0 0 0 .71 7.935C2.232 6.072 4.774 4.893 7.5 4.893c4.245 0 7.515 2.828 7.515 7.195h-.006v.003c0 .507-.252 1.248-.73 1.866l.009-.009zM.015 11.63a12.21 12.21 0 0 0 1.129 5.461 12 12 0 0 0 9.743 6.846 7.5 7.5 0 0 1-1.177-.566h-.015l-.18-.112a8.25 8.25 0 0 1-2.34-2.195A8.315 8.315 0 0 1 10.215 8.7l.015-.006 .038-.018c.312-.147 .93-.438 1.75-.427q.291 .002 .576 .049a6 6 0 0 0-1.489-1.047l-.015-.007C9.522 6.423 7.798 6.394 7.5 6.394c-3.66 0-7.236 2.451-7.485 5.236m15.395 11.867q.2-.06 .397-.126-.229 .071-.46 .129zM15.342 23.5a7.5 7.5 0 0 0 .454-.129l.123-.037a12.03 12.03 0 0 0 6.243-4.95 .375 .375 0 0 0-.496-.525q-.483 .252-.995 .441a9.6 9.6 0 0 1-3.364 .6c-4.435 0-8.298-3.046-8.298-6.966q.005-.304 .069-.599a6.81 6.81 0 0 0-.69 8.848l.004 .007c.473 .661 1.06 1.232 1.737 1.681h.005l.216 .135c1.316 .825 2.582 1.617 4.992 1.494",
    color: "#0c78d4",
  },
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
