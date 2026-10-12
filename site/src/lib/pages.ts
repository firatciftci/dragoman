import { m } from "#lib/messages.ts";

type Text = { draft: () => string; refined: () => string };

export type Page = {
  id: "cat" | "tulips" | "coffee" | "parrot";
  lang: string;
  site: string;
  host: string;
  path: string;
  accent: string;
  paper: string;
  source: { title: string; byline: string; lead: string; more: string };
  title: Text;
  byline: Text;
  lead: Text;
  more: Text;
};

export const FIELDS = ["title", "byline", "lead", "more"] as const;

export const pages: [Page, Page, Page, Page] = [
  {
    id: "cat",
    lang: "ja",
    site: "ねこ新聞",
    host: "nekoshinbun.jp",
    path: "/news/mochi",
    accent: "#c24a20",
    paper: "#fffaf3",
    source: {
      title: "会社の猫、ニュースのキーボードを占拠",
      byline: "社会部・2分で読める",
      lead: "火曜日の朝、編集部の猫「もち」がキーボードの上で昼寝を始めた。記者たちは三時間、一本も記事を書けなかった。",
      more: "もちは現在、編集長に昇進している。",
    },
    title: { draft: m.demo_cat_title_draft, refined: m.demo_cat_title_refined },
    byline: {
      draft: m.demo_cat_byline_draft,
      refined: m.demo_cat_byline_refined,
    },
    lead: { draft: m.demo_cat_lead_draft, refined: m.demo_cat_lead_refined },
    more: { draft: m.demo_cat_more_draft, refined: m.demo_cat_more_refined },
  },
  {
    id: "tulips",
    lang: "de",
    site: "Gartenreise",
    host: "gartenreise.de",
    path: "/tulpen-des-sultans",
    accent: "#2e7d4f",
    paper: "#fbfdf8",
    source: {
      title: "Die Tulpen des Sultans",
      byline: "Reportage · 3 Min. Lesezeit",
      lead: "Im Frühling blühen im Palastgarten über tausend Tulpen, und jede Sorte trägt einen poetischen Namen.",
      more: "Die Gärtner flüstern, der Sultan zähle sie jeden Morgen.",
    },
    title: {
      draft: m.demo_tulips_title_draft,
      refined: m.demo_tulips_title_refined,
    },
    byline: {
      draft: m.demo_tulips_byline_draft,
      refined: m.demo_tulips_byline_refined,
    },
    lead: {
      draft: m.demo_tulips_lead_draft,
      refined: m.demo_tulips_lead_refined,
    },
    more: {
      draft: m.demo_tulips_more_draft,
      refined: m.demo_tulips_more_refined,
    },
  },
  {
    id: "coffee",
    lang: "ar",
    site: "مطبخ ستّي",
    host: "matbakhsitti.com",
    path: "/qahwa",
    accent: "#9a4f24",
    paper: "#fffbf4",
    source: {
      title: "قهوة على الرمل كما تصنعها جدتي",
      byline: "وصفات · ٤ دقائق للقراءة",
      lead: "ضع الركوة على الرمل الساخن، وانتظر حتى ترتفع الرغوة ببطء ثلاث مرات.",
      more: "تقول جدتي إن القهوة بلا رغوة كالكلام بلا معنى.",
    },
    title: {
      draft: m.demo_coffee_title_draft,
      refined: m.demo_coffee_title_refined,
    },
    byline: {
      draft: m.demo_coffee_byline_draft,
      refined: m.demo_coffee_byline_refined,
    },
    lead: {
      draft: m.demo_coffee_lead_draft,
      refined: m.demo_coffee_lead_refined,
    },
    more: {
      draft: m.demo_coffee_more_draft,
      refined: m.demo_coffee_more_refined,
    },
  },
  {
    id: "parrot",
    lang: "es",
    site: "El Eco del Puerto",
    host: "ecodelpuerto.es",
    path: "/loro-cafe",
    accent: "#1f6fb2",
    paper: "#f9fbff",
    source: {
      title: "Un loro aprende a pedir café en tres idiomas",
      byline: "Sociedad · 2 min de lectura",
      lead: "Paco, el loro del café de la esquina, saluda en español, pide un cortado en italiano y se despide en turco.",
      more: "Los turistas ya hacen cola para pedirle que les traduzca la carta.",
    },
    title: {
      draft: m.demo_parrot_title_draft,
      refined: m.demo_parrot_title_refined,
    },
    byline: {
      draft: m.demo_parrot_byline_draft,
      refined: m.demo_parrot_byline_refined,
    },
    lead: {
      draft: m.demo_parrot_lead_draft,
      refined: m.demo_parrot_lead_refined,
    },
    more: {
      draft: m.demo_parrot_more_draft,
      refined: m.demo_parrot_more_refined,
    },
  },
];
