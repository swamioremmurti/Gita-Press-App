#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_krishnank.py -- import the Kalyan special issue "श्रीकृष्णांक" (वर्ष ६, संख्या १, गोरखपुर, श्रावण १९८८ / अगस्त १९३१) into the library from
  "कल्याण श्रीकृष्णांक वर्ष 6 संख्या 1 प्रथम पृष्ठ (1).html"   (the Gita Press export: 150 pages, 4 pictures)

What is done (the usual import recipe -- see tools/build_sadhan_kalpataru.py and the class-renames memory):
  * head = the library's (master.css, nothing else); title = श्रीकृष्णांक;
  * the "प्रथम पृष्ठ" / "अन्तिम पृष्ठ" labels are dropped; toc_marker-N -> Chapter_N;
  * title page: Kalyan-shlok / Tavmev-Mata--pita -> cover-Tvamev-mata, Kalyan -> cover-subtitle, Title-Page---X -> cover-X, the library's publisher
    note is added under the editor's line;
  * the export's title-page classes (Varsh---Sankhya, Title-Page---Author-Name, Tavmev-Mata--pita, Sanwat---San) were also used inside the book for
    verse lines and the closing "श्रीकृष्णार्पणमस्तु" lines: verse lines -> Shlok, closing lines -> Nayash;
  * Footnotes-Slok (verse line inside a note) -> Footnotes-Bold; para-style-override-4 -> center-tight, the other para-style-overrides (layout of the
    export only) are dropped;
  * spans: char-style-override-5 (quoted verse words, speaker labels "व"/"जि", term in a gloss) -> inline_shlok; -10/-12/-16 (raised note numbers)
    -> inline-11; empty spans and the ones that only hold a dash are unwrapped;
  * footnotes numbered "१-", "१–" or "१ " -> "१. " so the reader can attach them (swadhyay-footnotes.js);
  * the 4 pictures (Downloads/network-images, saved in book order) -> image/krishnank-NN.png; every class left is one master.css defines.

    py -I -X utf8 tools/build_krishnank.py "<html>" "<folder with the 4 pictures>"
"""
import re
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
NAME = "श्रीकृष्णांक"
OUT = BOOKS / (NAME + ".html")
IMG_DIR = BOOKS / "image"
BACKUP = ROOT / "backups" / "before-krishnank-import"
MASTER_CSS = ROOT / "master.css"
NOTE = "गीताप्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}
# the 4 pictures in book order (the grabber's names), with the alt text each gets
TVAMEV = "".join("\t\t\t<p class=\"Tavmev-Mata--pita\">%s</p>\n" % l for l in (
    "त्वमेव माता च पिता त्वमेव", "त्वमेव बन्धुश्च सखा त्वमेव।", "त्वमेव विद्या द्रविणं त्वमेव", "त्वमेव सर्वं मम देवदेव॥"))
TAB_ROWS = [
    ("ब्राह्ममुहूर्तमें उठना।—", "आठ बजेतक पड़े रहना।"),
    ("आत्माका ध्यान करना।—", "अखबार पढ़ते हुए संसारके प्रपञ्चोंका स्मरण करना।"),
    ("शुद्ध जलमें स्नान करना।—", "चर्बीमिश्रित साबुन और प्रायः मद्ययुक्त सुगन्ध-द्रव्य लगा नलके अपवित्र जलमें नहाना।"),
    ("सन्ध्योपासना करना।—", "पर-चर्चा करना।"),
    ("हवन करना।—", "धूम्रपान करना।"),
    ("गायत्री जप करना।—", "जप करनेवालोंकी दिल्लगी उड़ाना।"),
    ("देवता ऋषि पितृ तर्पण—", "अपने व्यक्तिगत स्वार्थकी चिन्तामें परिवारके लोगों का बुरा सोचना।"),
    ("बड़े बूढ़े और ब्राह्मणोंको पूजना—", "बड़े-बूढ़ोंको मूर्ख बताना और ब्राह्मण-निन्दा करना।"),
    ("ब्राह्मणोंको गौदान देना।—", "ब्राह्मण-अतिथियोंको घरसे निकाल देना"),
]
TAB_END = "विचार कीजिये और अपना कर्तव्य निश्चित कीजिये।"
# the reader starts a new page only at a Heading, so the issue's cover carries one ("मुखपृष्ठ"); without it the page would ride along under the निवेदन
COVER_PAGE = """<hr class="page-break">

<section class="epub-page" data-page="3">
<div class="Basic-Graphics-Frame">
			<p class="Page-Break">&nbsp;</p>
			<p class="Heading">मुखपृष्ठ</p>
			<p class="cover-Tvamev-mata">ॐ पूर्णमदः पूर्णमिदं पूर्णात् पूर्णमुदच्यते ।</p>
			<p class="cover-Tvamev-mata">पूर्णस्य पूर्णमादाय पूर्णमेवावशिष्यते ॥</p>
			<p class="Image" id="krn-img-cover"><img class="frame-1" src="image/krishnank-cover.webp" alt="कल्याण — श्रीकृष्ण">&nbsp;</p>
			<p class="Shlok shloka-pair shloka-wide shloka-quad">बर्हापीडं नटवरवपुः कर्णयोः कर्णिकारं <br class="shloka-mbr"/>बिभ्रद्वासः कनककपिशं वैजयन्तीञ्च मालाम् ।<br/>रन्ध्रान्वेणोरधरसुधया पूरयन्गोपवृन्दैर्वृन्दारण्यं <br class="shloka-mbr"/>स्वपदरमणं प्राविशद्गीतकीर्तिः ॥</p>
			<table class="Samagri-Table">
				<tr><td class="Samagri-Table-Cell-Center">वर्ष ६</td><td class="Samagri-Table-Cell-Center">श्रावण १९८८<br>अगस्त १९३१</td><td class="Samagri-Table-Cell-Center">संख्या १<br>पूर्ण संख्या ६१</td></tr>
			</table>
			<table class="Samagri-Table">
				<tr><th class="Samagri-Table-Head">जय हो!</th></tr>
				<tr><td class="Samagri-Table-Cell-Center">
					<p class="Shlok">ब्रह्माण्डानि बहूनि पङ्कजभवान्प्रत्यण्डमत्यद्भुता-</p>
					<p class="Shlok">न्गोपान्वत्सयुतानदर्शयदजं विष्णूनशेषांश्च यः ।</p>
					<p class="Shlok">शम्भुर्यच्चरणोदकं स्वशिरसा धत्ते च मूर्तित्रया-</p>
					<p class="Shlok">त्कृष्णो वै पृथगस्ति कोऽप्यविकृतः सच्चिन्मयो नीलिमा ॥</p>
					<p class="Shlok">कृपापात्रं यस्य त्रिपुररिपुरम्भोजवसतिः</p>
					<p class="Shlok">सुता जह्नोः पूता चरणनखनिर्णेजनजलम् ।</p>
					<p class="Shlok">प्रदानं वा यस्य त्रिभुवनपतित्वं विभुरपि</p>
					<p class="Shlok">निदानं सोऽस्माकं जयति कुलदेवो यदुपतिः ॥</p>
					<p class="Shlok-Right">— श्रीशंकराचार्य</p>
				</td></tr>
			</table>
		</div>
</section>

"""

# (picture 1, the व्यूह circles, picture 3, Surdas's kundali, and picture 4, Vader's kundali, are replaced by the inline SVGs in tools/svg/; picture 2 by TAB_ROWS)
PICTURES = [("00001-image-00001 (1).png", "श्रीकृष्णके व्यूह"),
            ("00002-image-00002 (1).png", "तब और अब"),
            ("00003-image-00003 (1).png", "जन्मकुण्डली"),
            ("00003-image-00003 (2).png", "जन्मकुण्डली")]

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
<style>
body {
  font-family: Georgia, "Noto Serif Devanagari", serif;
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
  line-height: 1.6;
}
.page-break {
  margin: 2rem 0;
  border: none;
  border-top: 1px dashed #ccc;
}
.epub-page {
  margin-bottom: 1rem;
}
</style>
</head>

""" % NAME


def read(p):
    with open(p, encoding="utf-8", newline="") as fh:
        return fh.read()


def write(p, s):
    for _ in range(8):
        try:
            with open(p, "wb") as fh:
                fh.write(s.encode("utf-8"))
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def spans(s):
    """char-style-override-N spans, innermost first"""
    rx = re.compile(r'<span class="char-style-override-(\d+)">((?:(?!<span).)*?)</span>', re.S)

    def f(m):
        n, inner = int(m.group(1)), m.group(2)
        if not inner.strip() and "&nbsp;" not in inner:
            return ""
        if n == 5:
            return '<span class="inline_shlok">%s</span>' % inner
        if n in (10, 12, 16):
            lead = inner[:len(inner) - len(inner.lstrip())]
            tail = inner[len(inner.rstrip()):]
            return lead + '<span class="inline-11">%s</span>' % inner.strip() + tail
        return inner                                   # dashes and the like: plain text

    prev = None
    while prev != s:
        prev, s = s, rx.sub(f, s)
    return s


def inline_figure(name, uid, title, max_w):
    """tools/svg/<name> as an inline figure: editor leftovers removed, the classes turned into attributes (master.css has none of them),
    the figure's own styles scoped by karma's inline_svg"""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import inline_karma_rahasya_svgs as ks
    f = Path(__file__).with_name("svg") / name
    raw = f.read_text(encoding="utf-8")
    raw = re.sub(r"<sodipodi:namedview\b.*?/>", "", raw, flags=re.S)
    raw = re.sub(r"\s(?:sodipodi|inkscape):[\w-]+=\"[^\"]*\"", "", raw)
    raw = re.sub(r"<defs\b[^>]*/>", "", raw)
    raw = re.sub(r"-inkscape-font-specification:[^;\"]*;?", "", raw)
    raw = re.sub(r"<style\b.*?</style>", "", raw, flags=re.S)           # the figure carries its own paint as attributes, so no class is needed
    raw = raw.replace('class="ring"', 'fill="none" stroke="#000" stroke-width="1.5"')
    raw = raw.replace('class="label"', 'fill="#000"')
    raw = re.sub(r'<rect\s+width="100%"\s+height="100%"\s+fill="#ffffff"[^>]*/>', "", raw)         # the white backdrop (the page's own paper shows through)
    raw = raw.replace('class="kundli-line"', 'fill="none" stroke="#000" stroke-width="1.5"')
    tmp = f.with_name("_clean_" + name)
    tmp.write_text(raw, encoding="utf-8")
    try:
        svg = ks.inline_svg(tmp, uid, title, max_w)
    finally:
        tmp.unlink()
    return "<span>" + svg + "</span>"


# Plates scanned from the printed issue (Kalyan Krishna Anka.pdf, PDF page numbers).  Each entry is
# (a phrase from the paragraph the plate follows, number of paragraphs to skip after it, [PDF pages], optional class the paragraph must have).
# tools: render + trim + rotate is done by hand (image/krishnank-plate-<page>.webp); here they are only placed.
PLATE_ALT = {28: "शकटासुर-उद्धार", 36: "सारथि श्रीकृष्ण", 37: "जगद्गुरु श्रीकृष्ण", 38: "युगल-छवि", 39: "भीमकी रक्षा",
             40: "श्याम-रामकी मथुरा-यात्रा", 41: "कौरव-सभामें विराटरूप", 42: "गान्धारीका शाप", 221: "योगेश्वरेश्वर श्रीकृष्ण",
             240: "नल-कूबरकृत स्तुति", 266: "वृन्दावन-धाम", 267: "वृन्दावन-धाम", 194: "वृन्दावन-धाम", 195: "वृन्दावन-धाम",
             287: "वृन्दावन-धाम", 473: "शिशु-लीला", 527: "अक्रूरको दर्शन", 575: "नवनीत-वितरण", 648: "परिशिष्टाङ्क"}
PLATES = [
    ("साधु' शब्दका अर्थ अन्यान्य स्थलोंमें", 0, [28]),
    ("उक्त सगुण-स्वरूपमें निर्गुणका प्रकाश नियत है", 0, list(range(36, 44))),
    ("इतनेमें बालकोंको भूख लगी", 0, [90]),
    ("श्रीकृष्णावतार साक्षात् परब्रह्म है क्योंकि वह व्यापक है", 0, [126]),
    ("परिवार और व्यूह दोनोंका एक ही अर्थ है", 3, [136, 137]),
    ("तुम लोगोंने व्रतके समय बिलकुल नङ्गी", 0, [173, 174]),
    ("इस कलह-प्रिय कलिकालमें", 4, [184]),
    ("भागवत कहती है, श्रीकृष्णका नव-नील-नीरद", 0, [194, 195]),
    ("विचार कीजिये और अपना कर्तव्य निश्चित कीजिये", 0, [221]),
    ("श्रीकृष्ण-कृपा बिना असम्भव है", 0, [240]),
    ("मदनरूप हृद्रोगकी नाश करनेवाली है", 0, [266, 267]),
    ("कर इस क्षण इसका दर्प-दलन", 0, [277]),
    ("हृद्रोगमाश्वपहिनोत्यचिरेण धीरः", 1, [287], "Footnotes-Bold"),
    ("-नागरीदासजी", 0, [297]),
    ("उनकी अकृत्रिम", 0, [306, 307]),
    ("लोकसंग्रहकी पद्धति ठीक तरहसे समझमें", 3, [331]),
    ("उन राक्षसोंका तो कहना ही क्या है", 0, [358]),
    ("देवकीका सातवाँ गर्भ गुप्त हो जानेके बाद", 0, [439, 440]),
    ("हिन्दुओंके लिये श्रीकृष्णके जीवनकी घटनाएँ उतनी ही", 6, [463]),
    ("(सुन्दरीतन्त्रसे)", 0, [473]),
    ("अलख ब्रह्म छबि स्याममई है", 0, [527]),
    ("'पारिजात' नामक अमुद्रित खण्डकाव्यसे", 0, [575]),
    ("मथुराके चारों ओर चार शिव मन्दिर हैं", 5, [586, 587]),
    ("अर्थात् हे अच्युत! आपकी कृपासे मेरा मोह नष्ट", 0, [622, 623]),
]


def insert_plates(s):
    def norm(t):
        return re.sub(r"[\s\u200c\u200d]+", "", t)
    paras = [(m.end(), norm(re.sub(r"<[^>]+>", "", m.group(2))), m.group(1)) for m in re.finditer(r'<p\b[^>]*class="([^"]*)"[^>]*>(.*?)</p>', s, re.S)]
    ends = []
    for key, skip, pages, *cls in PLATES:
        nk = norm(key)
        hits = [i for i, (e, t, c) in enumerate(paras) if nk in t and (not cls or cls[0] in c.split())]
        if len(hits) != 1:
            raise SystemExit("plate anchor %r matched %d paragraphs" % (key, len(hits)))
        ends.append((paras[hits[0] + skip][0], pages))
    for end, pages in sorted(ends, reverse=True):
        html = "".join('\n\t\t\t<p class="Image" id="krn-img-%d"><img class="frame-1" src="image/krishnank-plate-%d.webp" alt="%s" loading="lazy"></p>' % (pg, pg, PLATE_ALT.get(pg, "श्रीकृष्णांक — चित्र")) for pg in pages)
        s = s[:end] + html + s[end:]
    return s


def issue2(path, last_page):
    """The next issue (कल्याण वर्ष ६, संख्या २ -- the परिशिष्टाङ्क, PDF page 648 onwards) appended to the book.
    Its title page ("प्रथम पृष्ठ"), the opening kirtan page and the "अन्तिम पृष्ठ" label are left out, and so is the continuation of "वैज्ञानिक दृष्टि" (section 10: the whole article is in the first issue, from the Word file): the book goes straight to the chapters."""
    t = read(path)
    secs = re.findall(r'<section class="epub-page" data-page="(\d+)">(.*?)</section>', t, re.S)
    keep = [b for n, b in secs if int(n) not in (1, 2, 10, 69)]
    if len(keep) != 23:
        raise SystemExit("issue 2: expected 23 sections, found %d" % len(keep))
    intro = ('<hr class="page-break">\n\n<section class="epub-page" data-page="%d">\n<div class="Basic-Graphics-Frame">\n'
             '\t\t\t<p class="Page-Break">&nbsp;</p>\n'
             '\t\t\t<p id="Chapter_s2_0" class="Heading">परिशिष्टाङ्क</p>\n'
             '\t\t\t<p class="Image" id="krn-img-parishishtank"><img class="frame-1" src="image/krishnank-parishishtank.webp" alt="परिशिष्टाङ्क" loading="lazy"></p>\n'
             '\t\t</div>\n</section>\n\n') % (last_page + 1)
    html = intro
    for i, b in enumerate(keep):
        html += '<hr class="page-break">\n\n<section class="epub-page" data-page="%d">%s</section>\n\n' % (last_page + 2 + i, b)
    # lines that point back to an earlier instalment ("(गतांकसे आगे)") are not verse
    def xref(m):
        txt = re.sub(r"<[^>]+>", "", m.group(2)).strip()
        if re.match(r"^[\[(][^\n]{0,40}आगे ?[\])]$", txt) and "ज्ञानाद्" not in txt:
            return '<p class="Nayash">%s</p>' % m.group(2)
        return m.group(0)
    html = re.sub(r'<p class="(SHLOK-Black(?: para-style-override-\d+)?)">(.*?)</p>', xref, html, flags=re.S)
    html = re.sub(r'class="SHLOK-Black(?: para-style-override-\d+)?"', 'class="Shlok"', html)
    html = re.sub(r'class="Sanwat---San(?: para-style-override-\d+)?"', 'class="Nayash"', html)        # the closing cries ("अहं ब्रह्मास्मि!")
    html = re.sub(r'class="Footnotes-Slok( para-style-override-\d+)?"', 'class="Footnotes-Bold"', html)
    html = re.sub(r'(class="[^"]*?) para-style-override-\d+"', r'\1"', html)
    html = re.sub(r'class="TXT(?=[" ])', 'class="Normal', html)
    html = html.replace('<p class="Nayash">त्रिपुरुष-विज्ञान</p>', '<p class="Sub-Heading">त्रिपुरुष-विज्ञान</p>')
    html = re.sub(r'toc_marker-(\d+)', lambda m: "Chapter_s2_" + m.group(1), html)
    html = spans(html)
    html = re.sub(r"<span>\s*</span>", "", html)
    html = re.sub(r"<span>((?:(?!<span).)*?)</span>", lambda m: m.group(1), html, flags=re.S)
    html = re.sub(r'[ \t]*<p class="Footnotes-Bold">(?:&nbsp;|\s)*</p>[ \t]*\n?', "", html)
    fn_re = re.compile(r'(<p\b[^>]*class="Footnote[^"]*"[^>]*>(?:<span[^>]*>)?)([०-९0-9]+)(?:[ \t]*[-–—][ \t]*|[ \t]+)(?=[^\s०-९0-9])')
    html, n_fn = fn_re.subn(lambda m: "%s%s. " % (m.group(1), m.group(2)), html)
    print("issue 2: %d sections, footnote marks rewritten: %d" % (len(keep) + 1, n_fn))
    return html


IMG_TITLES = {
    "cover": "मुखपृष्ठ — कल्याण (श्रीकृष्ण)", "nivedan": "निवेदन — कमलपर वंशी बजाते श्रीकृष्ण", "vyuha": "श्रीकृष्णके व्यूह",
    "kundali1": "सूरदासजीकी जन्मकुण्डली", "kundali2": "श्रीबी० एच० वाडरकी जन्मकुण्डली", "parishishtank": "परिशिष्टाङ्क — श्रीकृष्ण",
    "28": "शकटासुर-उद्धार", "36": "सारथि श्रीकृष्ण", "37": "जगद्गुरु श्रीकृष्ण", "38": "युगल-छवि", "39": "भीमकी रक्षा",
    "40": "श्याम-रामकी मथुरा-यात्रा", "41": "कौरव-सभामें विराटरूप", "42": "गान्धारीका शाप", "43": "अश्व-परिचर्या",
    "90": "पूतना-उद्धार", "126": "कर नवनीत लिये", "136": "श्रीमथुरा पुरी — विश्रामघाट आदि", "137": "श्रीमथुरा पुरी",
    "173": "वृन्दावन धाम — वृन्दावनका एक दृश्य, सेवाकुंज", "174": "वृन्दावन धाम", "184": "कालियनाग पर कृपा",
    "194": "वृन्दावन धाम — श्रीगंगाजीका मन्दिर आदि", "195": "वृन्दावन धाम — कालीदमन घाट, जुगलबिहारी घाट आदि", "221": "योगेश्वरेश्वर श्रीकृष्ण",
    "240": "नल-कूबरकृत स्तुति", "266": "वृन्दावन-धाम", "267": "वृन्दावन-धाम — श्रीराधारमणजीका मन्दिर", "277": "श्रीलोडली लालजी",
    "287": "वृन्दावन धाम — अक्रूर-घाट, चीरघाट आदि", "297": "ब्रह्मा-स्तुति", "306": "नन्दगाँव", "307": "बरसाना", "331": "कंस-उद्धार",
    "358": "गोवर्धन-धारण", "439": "चोर कौन?", "440": "काग को भाग / भावना", "463": "श्रीहरिदासजी, श्रीगोपालभट्ट गोस्वामी, श्रीहितहरिवंशजी",
    "473": "शिशु-लीला", "527": "अक्रूरको दर्शन", "575": "नवनीत-वितरण", "586": "कुसुम-सरोवर, चन्द्र-सरोवर, मान-सरोवर, कामवन",
    "587": "राधाकुण्ड, कृष्णकुण्ड, मानसीगंगा, श्यामकुण्ड", "622": "गोमती द्वारिका, द्वारिकापुरी बेट",
    "623": "द्वारिकाधीश, हुबलीका श्रीकृष्ण-मन्दिर, श्रीश्रीराधावल्लभजीकी झाँकी",
}


def image_index(s, page):
    """a last chapter, "चित्र-सूची": every picture of the book in book order, each a link (data-goto, handled by the reader) to its page"""
    ids = re.findall(r'<p class="Image" id="krn-img-([^"]+)"', s)
    digits = str.maketrans("0123456789", "०१२३४५६७८९")
    rows = []
    for n, key in enumerate(ids, 1):
        if key not in IMG_TITLES:
            raise SystemExit("no title for picture " + key)
        rows.append('\t\t\t<p class="Normal"><a href="#krn-img-%s" data-goto="krn-img-%s">%s. %s</a></p>\n' % (key, key, str(n).translate(digits), IMG_TITLES[key]))
    return ('<hr class="page-break">\n\n<section class="epub-page" data-page="%d">\n<div class="Basic-Graphics-Frame">\n'
            '\t\t\t<p class="Page-Break">&nbsp;</p>\n\t\t\t<p id="Chapter_chitra_suchi" class="Heading">चित्र-सूची</p>\n' % page
            + "".join(rows) + '\t\t</div>\n</section>\n\n')


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    src, pics = Path(sys.argv[1]), Path(sys.argv[2])
    s = read(src)
    s = HEAD + s[s.index("<body"):]

    pages = re.split(r'(<hr class="page-break">)', s)
    # pages[0] holds head + cover page; body pages follow
    cover, rest = pages[0], "".join(pages[1:])

    # ---- the title page
    # the opening ॐ पूर्णमदः shloka is replaced by "॥ श्रीहरिः॥" (as in the other Kalyan special issues)
    cover = re.sub(r'[ \t]*<p class="Kalyan-shlok">[^<]*</p>[ \t]*\n', '', cover)
    cover = cover.replace('<p class="Kalyan">', '<p class="cover-Shri-Hari">॥ श्रीहरिः॥</p>\n\t\t\t<p class="Kalyan">', 1)
    # the बर्हापीडं verse is replaced by the library's standard "त्वमेव माता च पिता त्वमेव…"
    cover = re.sub(r'(?:[ \t]*<p class="Tavmev-Mata--pita">(?!&nbsp;)[^<]*</p>[ \t]*\n)+', TVAMEV, cover, count=1)
    cover = cover.replace('class="Kalyan"', 'class="cover-subtitle"')
    cover = cover.replace('class="Title-Page---Book-Name"', 'class="cover-Book-Name"')
    cover = re.sub(r'[ \t]*<p class="Varsh---Sankhya">छठा वर्ष, संख्या–१</p>[ \t]*\n', "", cover)       # the user asked for this line to be removed
    cover = re.sub(r'[ \t]*<p class="Sanwat---San">गोरखपुर, श्रावण.*?</p>[ \t]*\n', "", cover, flags=re.S)       # and the place/date line under it
    cover = re.sub(r'class="Tavmev-Mata--pita(?: para-style-override-\d+)?"', 'class="cover-Tvamev-mata"', cover)
    cover = re.sub(r'class="Title-Page---Author-Name(?: para-style-override-\d+)?"', 'class="cover-Author-Name"', cover)
    cover = re.sub(r'(<p class="cover-Author-Name">.*?</p>)', lambda m: m.group(1) + '\n\t\t\t<p class="cover-Tvamev-mata">&nbsp;</p>\n\t\t\t<p class="cover-Publisher-Note">%s</p>' % NOTE,
                   cover, count=1, flags=re.S)

    # ---- the book
    rest, n_lab = re.subn(r'[ \t]*<p id="toc_marker-\d+" class="First-End-Page-text[^"]*"[^>]*>(?:(?!</p>).)*?</p>[ \t]*\n?', "", rest, flags=re.S)
    cover, n_lab2 = re.subn(r'[ \t]*<p id="toc_marker-\d+" class="First-End-Page-text[^"]*"[^>]*>(?:(?!</p>).)*?</p>[ \t]*\n?', "", cover, flags=re.S)
    # title-page classes that the export also put on verse lines and closing lines inside the book
    rest = re.sub(r'class="(?:Varsh---Sankhya|Title-Page---Author-Name|Tavmev-Mata--pita)(?: para-style-override-\d+)?"', 'class="Shlok"', rest)
    rest = re.sub(r'class="Sanwat---San(?: para-style-override-\d+)?"', 'class="Nayash"', rest)
    # the publisher's निवेदन (tools/krishnank_nivedan.txt) is page 2, straight after the title page; the book's own pages move up by two (COVER_PAGE, the issue's cover, is page 3)
    paras = [p.strip() for p in read(Path(__file__).with_name("krishnank_nivedan.txt")).split("\n\n") if p.strip()]
    body = "".join('\t\t\t<p class="Normal">%s</p>\n' % re.sub(r"\*\*(.+?)\*\*", r'<span class="strong">\1</span>', p) for p in paras)
    nivedan = ('<hr class="page-break">\n\n<section class="epub-page" data-page="2">\n<div class="Basic-Graphics-Frame">\n'
               '\t\t\t<p class="Page-Break">&nbsp;</p>\n'
               '\t\t\t<p id="Chapter_1" class="Heading">निवेदन</p>\n'
               # the animated picture between the heading and the text: Downloads/Gemini_Generated_Gif_rdgt02rdgt02rdgt.gif (30 frames) saved once as animated WebP
               '\t\t\t<p class="Image" id="krn-img-nivedan"><img class="frame-3" src="image/krishnank-nivedan.webp" alt="कमलपर वंशी बजाते श्रीकृष्ण">&nbsp;</p>\n'
               + body +
               '\t\t\t<p class="TXT-Right">—प्रकाशक</p>\n'
               '\t\t</div>\n</section>\n\n')
    rest = re.sub(r'data-page="(\d+)"', lambda m: 'data-page="%d"' % (int(m.group(1)) + 2), rest)
    s = cover + nivedan + COVER_PAGE + rest

    s = re.sub(r'class="Footnotes-Slok( para-style-override-\d+)?"', 'class="Footnotes-Bold"', s)
    s = s.replace('class="Shlok para-style-override-4"', 'class="Shlok center-tight"')
    s = re.sub(r'(class="[^"]*?) para-style-override-(?:[235-9]|1[01])"', r'\1"', s)
    s = re.sub(r'class="TXT(?=[" ])', 'class="Normal', s)
    s = re.sub(r'toc_marker-(\d+(?:-\d+)*)', lambda m: "Chapter_" + m.group(1).replace("-", "_"), s)

    s = spans(s)
    s = re.sub(r"<span>\s*</span>", "", s)
    s = re.sub(r"<span>((?:(?!<span).)*?)</span>", lambda m: m.group(1), s, flags=re.S)         # attribute-less spans the export leaves around plain text

    # empty note paragraphs (page-break spacers in the export) are dropped
    s = re.sub(r'[ \t]*<p class="Footnotes-Bold">(?:&nbsp;|\s)*</p>[ \t]*\n?', "", s)
    # two notes whose mark does not match what the text has: "सार्वभौम*" (the note is numbered १) and a note that lost its "*"
    for old, new in (('<p class="Footnotes">१-यथा महाराजः', '<p class="Footnotes">* यथा महाराजः'),
                     ('<p class="Footnotes">ॐ सत्त्वरूपशरीरेषु', '<p class="Footnotes">* ॐ सत्त्वरूपशरीरेषु')):
        if s.count(old) != 1:
            raise SystemExit("note not found exactly once: " + old)
        s = s.replace(old, new)
    # footnotes: "१-", "१–", "१ " -> "१. "
    fn_re = re.compile(r'(<p\b[^>]*class="Footnote[^"]*"[^>]*>(?:<span[^>]*>)?)([०-९0-9]+)(?:[ \t]*[-–—][ \t]*|[ \t]+)(?=[^\s०-९0-9])')
    s, n_fn = fn_re.subn(lambda m: "%s%s. " % (m.group(1), m.group(2)), s)

    # pictures
    IMG_DIR.mkdir(exist_ok=True)
    try:
        from PIL import Image
    except ImportError:
        raise SystemExit("Pillow is needed")
    imgs = list(re.finditer(r'<img class="(frame-\d)" src="image/Image_\d_fmt\.png" alt="[^"]*">', s))
    if len(imgs) != len(PICTURES):
        raise SystemExit("the book has %d pictures, expected %d" % (len(imgs), len(PICTURES)))
    out = []
    last = 0
    for i, (m, (fname, alt)) in enumerate(zip(imgs, PICTURES), 1):
        out.append(s[last:m.start()])
        last = m.end()
        if i == 1:                                  # the व्यूह diagram is the user's own SVG, inline (so the book's Chanakya font applies)
            out.append(inline_figure("krishnank_vyuha.svg", "krn-fig-vyuha", "श्रीकृष्णके व्यूह", 640))
            continue
        if i == 2:                                  # the तब / अब picture is typed in as a table (TAB_ROWS)
            out.append("@@TABLE@@")
            continue
        if i == 3:                                  # Surdas's janma-kundali, the user's SVG
            out.append(inline_figure("krishnank_kundali_surdas.svg", "krn-fig-kundali1", "जन्मकुण्डली", 600))
            continue
        if i == 4:                                  # the second kundali (B. H. Vader's), the user's SVG
            out.append(inline_figure("krishnank_kundali_vader.svg", "krn-fig-kundali2", "जन्मकुण्डली", 600))
            continue
        src_png = pics / fname
        if not src_png.exists():
            raise SystemExit("missing picture " + str(src_png))
        im = Image.open(src_png).convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[3])
        name = "krishnank-%02d.png" % i
        bg.save(IMG_DIR / name, optimize=True)
        out.append('<img class="%s" src="image/%s" alt="%s">' % (m.group(1), name, alt))
    out.append(s[last:])
    s = "".join(out)

    rows = "".join('\t\t\t\t<tr><td class="Samagri-Table-Cell">%s</td><td class="Samagri-Table-Cell">%s</td></tr>\n' % r for r in TAB_ROWS)
    table = ('<table class="Samagri-Table">\n\t\t\t\t<tr><th class="Samagri-Table-Head">तब</th><th class="Samagri-Table-Head">अब</th></tr>\n' + rows + '\t\t\t</table>\n'
             '\t\t\t<p class="Normal center"><span class="bold">%s</span></p>' % TAB_END)
    s, n_tab = re.subn(r'<p class="Image">@@TABLE@@&nbsp;</p>', lambda m: table, s)
    if n_tab != 1:
        raise SystemExit("table placeholder not found")

    s = insert_plates(s)
    if len(sys.argv) > 3:                           # the appended issue
        last = max(int(n) for n in re.findall(r'data-page="(\d+)"', s))
        s = s.replace("</body>", issue2(Path(sys.argv[3]), last) + "</body>", 1)
    if len(sys.argv) > 4:                           # the whole article "कृष्णावतारपर वैज्ञानिक दृष्टि" (Word file) in place of the short भूमिका of the first issue
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import krishnank_vaigyanik
        art, n_notes = krishnank_vaigyanik.convert(sys.argv[4], "Chapter_9")
        s, n_art = re.subn(r'<p id="Chapter_9" class="Heading">कृष्णावतारपर वैज्ञानिक दृष्टि\*</p>.*?(?=\t*</div>\n</section>)', lambda m: art.strip("\t\n") + "\n", s, count=1, flags=re.S)
        if n_art != 1:
            raise SystemExit("the वैज्ञानिक दृष्टि chapter was not found")
        print("वैज्ञानिक दृष्टि: replaced from the Word file (%d footnotes)" % n_notes)
    # the Brahmavaivarta verses in "श्रीराधिकाजीका उद्धवको उपदेश": ten single lines are grouped into five two-line verses (Shloka Pair, own width)
    m0 = re.search(r'(?:[ \t]*<p class="Shlok">[^<\n]*</p>\n){10}(?=[ \t]*<p class="TXT-Right">\(ब्र० वै० पुराण ४। ९७। २१)', s)
    if not m0:
        raise SystemExit("verse group not found")
    lines = re.findall(r'<p class="Shlok">([^<\n]*)</p>', m0.group(0))
    if len(lines) != 10 or not lines[0].startswith("तस्मादुद्धव यत्नेन"):
        raise SystemExit("verse group not as expected")
    grp = "".join('\t\t\t<p class="Shlok shloka-pair shloka-wide">%s<br/>%s</p>\n' % (lines[i].strip(), lines[i + 1].strip()) for i in range(0, 10, 2))
    s = s[:m0.start()] + grp + s[m0.end():]
    # the greeting "कल्याणके प्रिय पाठक-वृन्द!" (start of the कृष्णावतार-सन्देश): right-aligned and italic (TXT-Right + span.rg-it, both in master.css)
    old_g = '<p class="Normal"><span class="inline_shlok">कल्याणके प्रिय पाठक-वृन्द!</span></p>'
    if s.count(old_g) != 1:
        raise SystemExit("greeting line not found exactly once")
    s = s.replace(old_g, '<p class="TXT-Right"><span class="rg-it">कल्याणके प्रिय पाठक-वृन्द!</span></p>')
    # "मोक्ष-संन्यासिनी गोपियाँ": the opening verse (eight short lines in the export) set as four lines, one block
    m1 = re.search(r'(?:[ \t]*<p class="Shlok">[^<\n]*</p>\n){8}(?=[ \t]*<p class="TXT-Right">—श्रीशंकराचार्य)', s)
    if not m1 or "काम्योपासनयार्थयन्त्यनुदिनं" not in m1.group(0):
        raise SystemExit("gopi verse not found")
    gopi = ["काम्योपासनयार्थयन्त्यनुदिनं केचित्फलं सेप्सितं", "किञ्चित् स्वर्गमथापवर्गमपरे-र्योगादियज्ञादिभिः।",
            "अस्माकं यदुनन्दनाङ्घ्रयुगल-ध्यानावधानार्थिनाम्", "किं लोकेन दमेन किं नृपतिना स्वर्गापवर्गैश्च किम्॥"]
    s = s[:m1.start()] + '\t\t\t<p class="Shlok">%s</p>\n' % "<br/>".join(gopi) + s[m1.end():]
    # "चेतोदर्पणमार्जनं…" (end of the नामसंकीर्तन article): four lines on a phone, two on a wide screen (shloka-quad, as on the cover)
    m2 = re.search(r'(?:[ \t]*<p class="Shlok">[^<\n]*</p>\n){8}(?=[ \t]*</div>)', s[s.index("चेतोदर्पणमार्जनं") - 60:])
    k0 = s.index("चेतोदर्पणमार्जनं") - 60
    if not m2 or "चेतोदर्पणमार्जनं" not in m2.group(0):
        raise SystemExit("cheto verse not found")
    q = ["चेतोदर्पणमार्जनं भवमहा दावाग्निनिर्वापनम्", "श्रेयः कैरवचन्द्रिकावितरणं विद्यावधूजीवनम्।",
         "आनन्दाम्बुधिवर्द्धनं प्रतिपदं पूर्णामृतास्वादनं", "सर्वात्मस्नपनं परं विजयते श्रीकृष्णसंकीर्तनम्॥"]
    quad = '\t\t\t<p class="Shlok shloka-pair shloka-wide shloka-quad">%s <br class="shloka-mbr"/>%s<br/>%s <br class="shloka-mbr"/>%s</p>\n' % tuple(q)
    s = s[:k0 + m2.start()] + quad + s[k0 + m2.end():]

    for key, uid in (("vyuha", "krn-fig-vyuha"), ("kundali1", "krn-fig-kundali1"), ("kundali2", "krn-fig-kundali2")):
        s, n_id = re.subn(r'<p class="Image">(?=(?:(?!</p>).)*?%s)' % uid, '<p class="Image" id="krn-img-%s">' % key, s, count=1, flags=re.S)
        if n_id != 1:
            raise SystemExit("figure paragraph not found: " + key)
    last = max(int(n) for n in re.findall(r'data-page="(\d+)"', s))
    s = s.replace("</body>", image_index(s, last + 1) + "</body>", 1)

    # classes: every one must be defined in master.css
    css = read(MASTER_CSS)
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', s):
        used.update(m.group(1).split())
    missing = sorted(c for c in used if c not in defined)
    if missing:
        raise SystemExit("classes master.css does not have: %s" % missing)
    if re.search(r"char-style-override|para-style-override-(?!4)|toc_marker|Title-Page", s):
        raise SystemExit("an export class is left")

    if OUT.exists():
        BACKUP.mkdir(parents=True, exist_ok=True)
        if not (BACKUP / OUT.name).exists():
            shutil.copy2(OUT, BACKUP / OUT.name)
    write(OUT, s)
    print("wrote", OUT.name, "| %.1f KB" % (len(s.encode("utf-8")) / 1024), "| labels dropped:", n_lab + n_lab2, "| footnote marks rewritten:", n_fn,
          "| classes used:", len(used), "| pictures:", len(imgs))


if __name__ == "__main__":
    main()
