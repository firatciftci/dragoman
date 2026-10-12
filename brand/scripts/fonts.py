# /// script
# requires-python = ">=3.12"
# dependencies = ["fonttools[woff]>=4.60"]
# ///
import re
import shutil
from pathlib import Path

from fontTools.otlLib.builder import (
    buildAnchor,
    buildLookup,
    buildMarkRecord,
    buildMultipleSubstSubtable,
)
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

root = Path(__file__).resolve().parent.parent
source = root / "node_modules" / "@fontsource" / "rakkas" / "files"
output = root / "src" / "fonts"
output.mkdir(exist_ok=True)


class Builder:
    def __init__(self, font: TTFont, donor: TTFont | None = None) -> None:
        self.font = font
        self.donor = donor
        self.glyf = font["glyf"]
        self.hmtx = font["hmtx"]
        self.classes = font["GDEF"].table.GlyphClassDef.classDefs

    def bounds(self, name: str) -> tuple[int, int, int, int]:
        glyph = self.glyf[name]
        glyph.recalcBounds(self.glyf)
        return glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax

    def center(self, name: str) -> float:
        x_min, _, x_max, _ = self.bounds(name)
        return (x_min + x_max) / 2

    def add(
        self,
        name: str,
        glyph: Glyph,
        advance: int,
        codepoint: int | None,
        kind: int = 1,
    ) -> None:
        if name not in self.font.getGlyphOrder():
            self.font.setGlyphOrder([*self.font.getGlyphOrder(), name])
        self.glyf[name] = glyph
        glyph.recalcBounds(self.glyf)
        self.hmtx[name] = (advance, glyph.xMin if glyph.numberOfContours else 0)
        self.classes[name] = kind
        if codepoint is not None:
            for table in self.font["cmap"].tables:
                if table.isUnicode():
                    table.cmap[codepoint] = name

    def borrow(self, name: str) -> None:
        if name in self.glyf or self.donor is None:
            return
        pen = DecomposingRecordingPen(self.donor.getGlyphSet())
        self.donor.getGlyphSet()[name].draw(pen)
        out = TTGlyphPen(None)
        pen.replay(out)
        self.add(name, out.glyph(), self.donor["hmtx"][name][0], None)

    def compose(
        self,
        name: str,
        codepoint: int | None,
        parts: list[tuple[str, float, float]],
        advance: int | None = None,
        kind: int = 1,
    ) -> None:
        glyph = Glyph()
        glyph.numberOfContours = -1
        glyph.components = []
        for part, x, y in parts:
            self.borrow(part)
            component = GlyphComponent()
            component.glyphName = part
            component.x, component.y = round(x), round(y)
            component.flags = 0x4
            glyph.components.append(component)
        self.add(
            name,
            glyph,
            self.hmtx[parts[0][0]][0] if advance is None else advance,
            codepoint,
            kind,
        )

    def draw(
        self,
        name: str,
        codepoint: int,
        base: str,
        matrix: tuple[float, float, float, float, float, float],
        advance: int,
        boxes: list[tuple[int, int, int, int]],
    ) -> None:
        self.borrow(base)
        pen = TTGlyphPen(None)
        self.font.getGlyphSet()[base].draw(TransformPen(pen, matrix))
        for x0, y0, x1, y1 in boxes:
            pen.moveTo((x0, y0))
            pen.lineTo((x0, y1))
            pen.lineTo((x1, y1))
            pen.lineTo((x1, y0))
            pen.closePath()
        self.add(name, pen.glyph(), advance, codepoint)


latin_path = source / "rakkas-latin-400-normal.woff2"
shutil.copyfile(latin_path, output / "rakkas-latin.woff2")

ext = Builder(TTFont(source / "rakkas-latin-ext-400-normal.woff2"), TTFont(latin_path))
for name in ["d", "h", "i", "A", "D", "H", "I", "N", "O", "U", "Eth"]:
    ext.borrow(name)

_, _, _, dot_top = ext.bounds("uni0307")
ext.compose("dotbelowcomb", 0x0323, [("uni0307", 0, -52 - dot_top)], 0, 3)
for upper, lower, codepoint in [
    ("A", "a", 0x1EA0),
    ("E", "e", 0x1EB8),
    ("I", "i", 0x1ECA),
    ("O", "o", 0x1ECC),
    ("U", "u", 0x1EE4),
    ("D", "d", 0x1E0C),
    ("H", "h", 0x1E24),
    ("N", "n", 0x1E46),
    ("S", "s", 0x1E62),
    ("T", "t", 0x1E6C),
]:
    for offset, base in enumerate([upper, lower]):
        ext.compose(
            f"uni{codepoint + offset:04X}",
            codepoint + offset,
            [
                (base, 0, 0),
                ("dotbelowcomb", ext.center(base) - ext.center("dotbelowcomb"), 0),
            ],
        )

ext.compose(
    "Idotaccent",
    0x0130,
    [("I", 0, 0), ("uni0307", ext.center("I") - ext.center("uni0307"), 209)],
)
ext.compose(
    "uni1E44",
    0x1E44,
    [("N", 0, 0), ("uni0307", ext.center("N") - ext.center("uni0307"), 209)],
)
ext.compose(
    "uni1E45",
    0x1E45,
    [("n", 0, 0), ("uni0307", ext.center("n") - ext.center("uni0307"), 13)],
)
ext.compose(
    "uni01F8",
    0x01F8,
    [("N", 0, 0), ("gravecomb.case", 629 + ext.center("N") - ext.center("E"), 218)],
)
ext.compose(
    "uni01F9",
    0x01F9,
    [("n", 0, 0), ("gravecomb", 587 + ext.center("n") - ext.center("e"), 0)],
)
ext.compose("Dcroat", 0x0110, [("Eth", 0, 0)])

comma_box = ext.bounds("uni0326")
comma_x = 464 + 28 - comma_box[0]
ext.compose(
    "dcaron",
    0x010F,
    [("d", 0, 0), ("uni0326", comma_x, 760)],
    max(ext.hmtx["d"][0], round(comma_x + comma_box[2] + 24)),
)

ext.draw(
    "dcroat", 0x0111, "d", (1, 0, 0, 1, 0, 0), ext.hmtx["d"][0], [(262, 526, 516, 568)]
)

e_box = ext.bounds("e")
ext.draw(
    "schwa",
    0x0259,
    "e",
    (-1, 0, 0, -1, e_box[0] + e_box[2], e_box[1] + e_box[3]),
    ext.hmtx["e"][0],
    [],
)
scale_y = (670 + 30) / (e_box[3] - e_box[1])
scale_x = 1.28
width = (e_box[2] - e_box[0]) * scale_x
left = (ext.hmtx["O"][0] - width) / 2
ext.draw(
    "uni018F",
    0x018F,
    "e",
    (-scale_x, 0, 0, -scale_y, left + e_box[2] * scale_x, -15 + e_box[3] * scale_y),
    ext.hmtx["O"][0],
    [],
)
ext.font.save(output / "rakkas-latin-ext.woff2")

arabic = Builder(TTFont(source / "rakkas-arabic-400-normal.woff2"))
dots = "uniFBB6"
dots_box = arabic.bounds(dots)
mark_anchor = ((dots_box[0] + dots_box[2]) // 2, dots_box[1] - 35)
gpos = arabic.font["GPOS"].table
base_anchor = None
for lookup in gpos.LookupList.Lookup:
    for table in lookup.SubTable:
        if (
            lookup.LookupType not in (4, 5)
            or "uni064E" not in table.MarkCoverage.glyphs
        ):
            continue
        marks = table.MarkCoverage.glyphs
        if lookup.LookupType == 4 and "uni0643" in table.BaseCoverage.glyphs:
            fatha = table.MarkArray.MarkRecord[marks.index("uni064E")].Class
            anchor = table.BaseArray.BaseRecord[
                table.BaseCoverage.glyphs.index("uni0643")
            ].BaseAnchor[fatha]
            base_anchor = (anchor.XCoordinate, anchor.YCoordinate)
        if dots in marks:
            continue
        record = buildMarkRecord(
            table.MarkArray.MarkRecord[marks.index("uni064E")].Class,
            buildAnchor(*mark_anchor),
        )
        pairs = sorted(
            [*zip(marks, table.MarkArray.MarkRecord, strict=True), (dots, record)],
            key=lambda pair: arabic.font.getGlyphID(pair[0]),
        )
        table.MarkCoverage.glyphs = [glyph for glyph, _ in pairs]
        table.MarkArray.MarkRecord = [mark for _, mark in pairs]
        table.MarkArray.MarkCount = len(pairs)
assert base_anchor is not None
arabic.compose(
    "uni06AD",
    0x06AD,
    [
        ("uni0643", 0, 0),
        (dots, base_anchor[0] - mark_anchor[0], base_anchor[1] - mark_anchor[1]),
    ],
)

gsub = arabic.font["GSUB"].table
gsub.LookupList.Lookup.append(
    buildLookup([buildMultipleSubstSubtable({"uni06AD": ["uni0643", dots]})])
)
gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
for record in gsub.FeatureList.FeatureRecord:
    if record.FeatureTag == "ccmp":
        record.Feature.LookupListIndex.append(len(gsub.LookupList.Lookup) - 1)
        record.Feature.LookupCount = len(record.Feature.LookupListIndex)
arabic.font.save(output / "rakkas-arabic.woff2")

packages = root / "node_modules"
rules = []
for package, sheets, subsets, extra in [
    (
        "@fontsource/rakkas",
        ["400.css"],
        None,
        {"latin-ext": ",U+0323,U+1EA0-1EA1,U+1EB8-1EB9,U+1ECA-1ECD,U+1EE4-1EE5"},
    ),
    ("@fontsource-variable/ibm-plex-sans", ["index.css"], None, {}),
    ("@fontsource/ibm-plex-sans-arabic", ["400.css", "600.css"], {"arabic"}, {}),
    ("@fontsource/ibm-plex-sans-hebrew", ["400.css", "600.css"], {"hebrew"}, {}),
    (
        "@fontsource/ibm-plex-sans-devanagari",
        ["400.css", "600.css"],
        {"devanagari"},
        {},
    ),
    ("@fontsource/ibm-plex-sans-thai", ["400.css", "600.css"], {"thai"}, {}),
    ("@fontsource/ibm-plex-mono", ["400.css"], {"latin", "latin-ext"}, {}),
    ("@fontsource/aref-ruqaa", ["400.css", "700.css"], {"arabic"}, {}),
]:
    name = package.split("/")[1]
    for sheet in sheets:
        css = (packages / package / sheet).read_text()
        for face, body in re.findall(
            r"/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}", css, re.DOTALL
        ):
            subset = re.sub(rf"^{name}-|-(\d+|wght)-normal$", "", face)
            if subsets is not None and subset not in subsets:
                continue
            fields = dict(re.findall(r"([\w-]+):\s*([^;]+);", body))
            file = re.search(r"url\(\./files/([^)]+\.woff2)\)", body)
            assert file is not None, face
            url = f"../node_modules/{package}/files/{file[1]}"
            if package == "@fontsource/rakkas":
                url = f"./fonts/rakkas-{subset}.woff2"
            rules.append(
                "@font-face {\n"
                f"  font-family: {fields['font-family'].replace(chr(39), chr(34))};\n"
                f"  font-weight: {fields['font-weight']};\n"
                "  font-display: swap;\n"
                f'  src: url("{url}") format("woff2");\n'
                f"  unicode-range: {fields['unicode-range']}{extra.get(subset, '')};\n"
                "}\n"
            )
(root / "src" / "fonts.css").write_text(
    "/* Generated by brand/scripts/fonts.py */\n\n" + "\n".join(rules)
)

for file in sorted(output.glob("*.woff2")):
    print(file.name, file.stat().st_size)
print("fonts.css", len(rules), "faces")
