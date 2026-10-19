export const stores = {
  chrome:
    "https://chromewebstore.google.com/detail/dragoman/iichdpokdcnfhckpaplfagaaepgfnppd",
  edge: "https://microsoftedge.microsoft.com/addons/search/dragoman",
  firefox: "https://addons.mozilla.org/firefox/addon/dragoman/",
  safari: "https://apps.apple.com/search?term=dragoman",
  releases: "https://github.com/firatciftci/dragoman/releases/latest",
  source: "https://github.com/firatciftci/dragoman",
};

export const listings = {
  chrome: { store: "Chrome Web Store", mark: "Chrome", href: stores.chrome },
  edge: { store: "Microsoft Edge Add-ons", mark: "Edge", href: stores.edge },
  firefox: { store: "Firefox Add-ons", mark: "Firefox", href: stores.firefox },
  safari: { store: "App Store", mark: "Safari", href: stores.safari },
} as const;
