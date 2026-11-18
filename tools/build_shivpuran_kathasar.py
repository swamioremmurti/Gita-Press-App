#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_shivpuran_kathasar.py -- import "शिवपुराण-कथासार" (Gita Press, Radheshyam Khemka) from the Word file "शिवपुराण–कथासार.docx".

The docx is the printed book OCR'd into Word: styles Title / Center (title page) / Heading1 (the निवेदन and each संहिता / खण्ड) /
Heading2 (the chapter titles) / Shlok / chapterend / plain paragraphs, 23 illustrations (floating pictures, many of them 3 MB PNGs),
no footnotes.  Mapping (master.css classes only):

    title page        cover-Shri-Hari / cover-Book-Name / cover-Sub-Title / Tavmev-Mata--pita / cover-Author-Name / cover-Publisher-Note
    Heading1          Heading (id Chapter_N; one reader page each); "शिवमहापुराण—एक सिंहावलोकन" is made a Heading page of its own
    Heading2          Sub-Heading (chapter title)
    Shlok             Shlok, one paragraph per line;  chapterend -> Chapter-End-Text
    plain paragraph   Normal (bold runs -> span.bold, italic runs -> span.rg-it);  निवेदन sign-off lines -> TXT-Right
    pictures          image/shivpuran-kathasar-NN.jpg (<= 640 px wide, JPEG), as Image paragraphs at the place of the docx picture
    dropped           the printed contents list (docx paragraphs 18-149), empty paragraphs, scan noise (607-613, see GARBAGE)

Text clean-up (the OCR left many errors; every rule below was found by reading the text and checking words against the library):
ZWNJ/ZWJ after a halant removed, ":" typed for visarga, "नू/तू" for a final halant, "ब्रत" -> "व्रत", stray "*" / "’" for opening quotes,
about 150 misspelt words (FIXES), the verses of the द्वादश-ज्योतिर्लिंग and the व्रत-प्रार्थना.  Two places where the OCR lost text are
joined with "…" (see GAPS) -- they need a look at the printed book.

    python tools/build_shivpuran_kathasar.py "<शिवपुराण–कथासार.docx>"
"""
import io
import re
import sys
import time
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
IMG_DIR = BOOKS / "image"
NAME = "शिवपुराण-कथासार"
OUT = BOOKS / (NAME + ".html")
MASTER_CSS = ROOT / "master.css"
DATA_JS = ROOT / "swadhyay-data.js"
NOTE = "गीताप्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}
IMG_PREFIX = "shivpuran-kathasar-"
FRONT_END = 17                    # paragraphs 0-16: title page + निवेदन
CONTENTS = (18, 150)              # the printed contents list (विषय–सूची): dropped
BODY_START = 151                  # "शिवपुराण–कथासार[ श्रीशिवमहापुराण—एक सिंहावलोकन ]"
GARBAGE = {608, 609, 610, 611, 612}           # scan noise between 607 and 613
GAPS = {607: ""}                            # 607 ends "...वर्षभरका", 613 goes on "...सारा पुण्य गंगाको दे दिया" -- text lost in between

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
</head>

""" % NAME

B0, B1, I0, I1 = "\x03", "\x04", "\x05", "\x06"      # bold / italic markers in the text

# ---- word / spelling fixes: (wrong, right) applied as plain substring replacements, in order ------------------------------------------
FIXES = [
    # lost or doubled letters
    ("अननका", "अन्नका"), ("अआअरुन्धतीसहित", "अरुन्धतीसहित"), ("आअग्निसे", "अग्निसे"), ("आकाशगें", "आकाशमें"),
    ("आहहादिनी", "आह्लादिनी"), ("आत्मतीर्थमं", "आत्मतीर्थमें"), ("उत्पनन", "उत्पन्न"), ("प्रसननता", "प्रसन्नता"),
    ("सननद्ध", "सन्नद्ध"), ("ननन्दी", "नन्दी"), ("उे साधु", "हे साधु"), ("उये सभी", "ये सभी"), ("शहे ", "हे "),
    ("सये चार", "ये चार"), ("ऋऋश्षकुलपर्वतपर", "ऋक्षकुलपर्वतपर"), ("कामतमाम", "काम तमाम"), ("कृतषघ्नता", "कृतघ्नता"),
    ("दुः:ख", "दुःख"), ("गुररहटसे", "गुर्राहटसे"), ("चक़", "चक्र"), ("वज़मयी", "वज्रमयी"), ("वज़ांग", "वज्रांग"),
    ("शिवलिज़की", "शिवलिंगकी"), ("ज्योतिर्लिगकी", "ज्योतिर्लिंगकी"), ("ज्योतिरलिंगोंका", "ज्योतिर्लिंगोंका"),
    ("व्रका निर्माण", "वज्रका निर्माण"), ("वत्रके समाज", "वज्रके समान"), ("वत्रके", "वज्रके"),
    ("चिकालतक", "चिरकालतक"), ("दयाईद्र", "दयार्द्र"), ("दुगकि चरित्र", "दुर्गाके चरित्र"), ("दुगनि", "दुर्गाने"),
    ("पाधेय", "पाथेय"), ("वाराणसी पुर्में", "वाराणसी पुरीमें"), ("मनोउभिलषित", "मनोभिलषित"),
    ("यकज्ञमें", "यज्ञमें"), ("यज्नमें", "यज्ञमें"), ("लज्नित", "लज्जित"), ("लल्नितेश्वर", "ललितेश्वर"),
    ("श्रुज्नेश्वर", "शृंगेश्वर"), ("शूलटड्लेश्वर", "शूलटंकेश्वर"), ("यतपूर्वक", "यत्नपूर्वक"), ("वबेटा", "बेटा"),
    ("वशभमें", "वशमें"), ("वशभें", "वशमें"), ("वृत्तात ", "वृत्तान्त "), ("शग्भु", "शम्भु"),
    ("शिवसहस्त्रनामस्तोत्रकी", "शिवसहस्रनामस्तोत्रकी"), ("सहस्त् नामोंसे", "सहस्र नामोंसे"), ("सहसत्रों", "सहस्रों"),
    ("श्रद्धके साथ", "श्रद्धाके साथ"), ("श्रीहरिनि", "श्रीहरिने"), ("श्रेष्ठटतम", "श्रेष्ठतम"), ("सुपग्रीव", "सुग्रीव"),
    ("सारूपय", "सारूप्य"), ("सिद्धियँ", "सिद्धियाँ"), ("विश्षुब्ध", "विक्षुब्ध"), ("धर्ममें विष्न", "धर्ममें विघ्न"),
    ("विश्वकमकि", "विश्वकर्माके"), ("हर्षातिरिकसे", "हर्षातिरेकसे"), ("हषीकेश", "हृषीकेश"), ("निश्वल", "निश्चल"),
    ("नर्श्रेष्ठ", "नरश्रेष्ठ"), ("पत्रूपमें", "पतिरूपमें"), ("पौरश्चवरणिक", "पौरश्चरणिक"), ("भूगु", "भृगु"),
    ("मुहूर्कि", "मुहूर्तके"), ("मूर्यष्टकके", "मूर्त्यष्टकके"), ("माण्ड्क्योपनिषद्", "माण्डूक्योपनिषद्"), ("ट्वैपायन", "द्वैपायन"),
    ("श्वेतट्वीप", "श्वेतद्वीप"), ("स्वर्णमणय", "स्वर्णमय"), ("क्षेत्रोंगें", "क्षेत्रोंमें"), ("तीर्थोंगें", "तीर्थोंमें"),
    ("स्त्रियोंगें", "स्त्रियोंमें"), ("द्वन्द्वोंगें", "द्वन्द्वोंमें"), ("द्वन्द्रोंको", "द्वन्द्वोंको"),
    ("अधष्टमूर्ति", "अष्टमूर्ति"), ("अपष्टमूर्ति", "अष्टमूर्ति"), ("असद्या क्रोध", "असह्य क्रोध"), ("अर्धरात्रिकि", "अर्धरात्रिके"),
    ("क्षौीर", "क्षौर"), ("ब्रहमरूप", "ब्रह्मरूप"), ("ब्रहलोक", "ब्रह्मलोक"), ("ब्रहमलोक", "ब्रह्मलोक"), ("ब्रहमवन", "ब्रह्मवन"),
    ("ब्रहोश्वर", "ब्रह्मेश्वर"), ("रुद्रोत्पति", "रुद्रोत्पत्ति"), ("ललाठमें", "ललाटमें"), ("विद्युमाली", "विद्युन्माली"),
    ("सुहज्जनोंके", "सुहृज्जनोंके"), ("सूँदकर", "सूँघकर"), ("प्रायशिचित्त", "प्रायश्चित्त"), ("त्रशूल", "त्रिशूल"),
    ("त्रिपुण्ड़", "त्रिपुण्ड्"), ("अत्रीशवर", "अत्रीश्वर"), ("अतिदूढ़", "अतिदृढ़"), ("उद्देग", "उद्वेग"), ("उद्धिज्ज", "उद्भिज्ज"),
    ("गुह्म", "गुह्य"), ("घिक्कारने", "धिक्कारने"), ("हिरप्याक्षका", "हिरण्याक्षका"), ("निर्लोंभी", "निर्लोभी"),
    ("आश्चर्ययकित", "आश्चर्यचकित"), ("क्रद्ध", "क्रुद्ध"), ("क्षेत्रज्ध", "क्षेत्रज्ञ"), ("शास्त्रोकत", "शास्त्रोक्त"),
    ("प्रार्थथा", "प्रार्थना"), ("प्रसन्नहदया", "प्रसन्नहृदया"), ("हदय", "हृदय"), ("श्रीरक्मिणी", "श्रीरुक्मिणी"),
    ("मुमुक्चु", "मुमुक्षु"), ("मुमुश्नु", "मुमुक्षु"), ("मुूर्ति", "मूर्ति"), ("मुर्ति", "मूर्ति"), ("सदूृश", "सदृश"),
    ("सदूश", "सदृश"), ("सदूगुण", "सद्गुण"), ("गदूगद", "गद्गद"), ("अवभृूथ", "अवभृथ"), ("लिंगार्वन", "लिंगार्चन"),
    ("टाॉँगकर", "टाँगकर"), ("वर्षॉपूर्व", "वर्षोंपूर्व"), ("नेत्रोिंसे", "नेत्रोंसे"), ("ओऑंकार", "ओंकार"), ("ऑंकार", "ओंकार"),
    ("ओंकरेश्वर", "ओंकारेश्वर"), ("बव्रतका", "व्रतका"), ("पधरेंगे", "पधारेंगे"), ("पतित्रता", "पतिव्रता"),
    ("पातित्रत", "पातिव्रत"), ("पातिब्रत", "पातिव्रत"), ("रात्रित्रत", "रात्रिव्रत"), ("ब्रत", "व्रत"),
    # a final halant typed as ू
    ("जगतू", "जगत्"), ("जाग्रतू", "जाग्रत्"), ("ज्ञानवानू", "ज्ञानवान्"), ("तत्पश्चातू", "तत्पश्चात्"), ("साक्षातू", "साक्षात्"),
    ("भगवानूका", "भगवान्का"), ("भगवानूकी", "भगवान्की"), ("महानू", "महान्"), ("ब्रह्ननू", "ब्रह्मन्"), ("ब्रह्मनू", "ब्रह्मन्"),
    ("हनुमानूजीका", "हनुमान्जीका"), ("हनुमानूने", "हनुमान्ने"), ("हिमवानूने", "हिमवान्ने"), ("हिमवानने", "हिमवान्ने"),
    ("हिमवानसे", "हिमवान्से"), ("हिमवानद्वारा", "हिमवान्द्वारा"),
    # verses
    ("सर्व मम. देवदेव", "सर्वं मम देवदेव"),
    ("समुद्धवं शड्भरमादिदेवम्", "समुद्भवं शङ्करमादिदेवम्"),
    ("सोमनाथ च", "सोमनाथं च"), ("महाकालमोड्रे", "महाकालमोङ्कारे"), ("केदार॑हिमवत्पृष्ठि", "केदारं हिमवत्पृष्ठे"),
    ("भीमशड्रम्", "भीमशङ्करम्"), ("त्रयम्बकं", "त्र्यम्बकं"), ("नागेश॑", "नागेशं"), ("सर्वसिद्धधिफलं", "सर्वसिद्धिफलं"),
    ("मया. भक्त्यनुसारेण व्रतमेतत् कृत शिव", "मया भक्त्यनुसारेण व्रतमेतत्कृतं शिव"),
    ("न्यून॑ सम्पूर्णतां यातु प्रसादात्तत शंकर", "न्यूनं सम्पूर्णतां यातु प्रसादात्तव शंकर"),
    ("अआज्ञानाद्यदि वा ज्ञानाजपपूजादिकं", "अज्ञानाद्यदि वा ज्ञानाज्जपपूजादिकं"),
    ("कृत तदस्तु कृपया", "कृतं तदस्तु कृपया"),
    # OCR "ि" for "ी" in -कि endings of compound words
    ("बुद्धिकि", "बुद्धिकी"), ("सृष्टिकि", "सृष्टिके"), ("वृद्धिकि", "वृद्धिकी"), ("प्राप्तिकि", "प्राप्तिकी"),
    ("नृत्यादिकि", "नृत्यादिके"), ("पुत्रादिकि", "पुत्रादिके"),
    ("मनो$भिलषित", "मनोभिलषित"), ("किया–>हे", "किया–हे"),
]
# passages the user asked to set in bold (the OCR lost the bold of the printed book)
BOLD_PHRASES = [
    "काशीके अविमुक्त, कृत्तिवासेश्वर, तिलभाण्डेश्वर, दशाश्वमेधेश्वर इत्यादि और गंगासागर आदिके संगमेश्वर, भूतेश्वर, नारीश्वर, वटुकेश्वर, "
    "पूरेश्वर, सिद्धनाथेश्वर, दूरेश्वर, शृंगेश्वर, वैद्यनाथ, जप्येश्वर, गोपेश्वर, रंगेश्वर, वामेश्वर, नागेश, कामेश, विमलेश्वर; प्रयागके "
    "ब्रह्मेश्वर, सोमेश्वर, भारद्वाजेश्वर, शूलटंकेश्वर, माधवेश तथा अयोध्याके नागेश",
]
# after the quote clean-up: closing quotes the OCR typed as opening ones, a stray quote, a lost opening quote
POST = [("सदाशिव ‘एवं", "सदाशिव एवं"), ("‘व्रतराज ‘कहा", "‘व्रतराज’ कहा"), ("‘प्रणव ‘उन", "‘प्रणव’ उन"),
        ("महर्षि यह क्या है’–", "महर्षि ‘यह क्या है’–"), ("भगवद्धक्ति", "भगवद्भक्ति"), ("सद्धक्तिपूर्वक", "सद्भक्तिपूर्वक")]
RX_FIXES = [
    (r"(कर्म|धर्म|वर्ण|वर्ष|अर्थ)ो(?=का|के|की|को|में|से|तक|पर|ने|द्वारा)", r"\1ों"),     # कर्मोका -> कर्मोंका
    (r"मुमुक्चु", "मुमुक्षु"),
    (r"(?<=[ऀ-ॿ])\.(?=।)", ""),                                                   # हूँ.। -> हूँ।
    (r"।(?=[अ-ह])", "। "),                                                       # है।इसलिये
    (r"(?<=[ऀ-ॿ])– (?=[ऀ-ॿ])", "–"),                                            # अपने– अपने
    (r"(?<=[ऀ-ॣ]):", "ः"),                                                      # visarga
]


def write(p, data):
    data = data if isinstance(data, bytes) else data.encode("utf-8")
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(data)
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def tidy(t):
    t = t.replace("\xa0", " ").replace("\t", " ")
    return re.sub(r" {2,}", " ", t).strip()


HITS = {}


def fix_text(t):
    t = t.replace("‌", "").replace("‍", "")
    for a, b in FIXES:
        if a in t:
            HITS[a] = HITS.get(a, 0) + t.count(a)
            t = t.replace(a, b)
    for a, b in RX_FIXES:
        t, n = re.subn(a, b, t)
        if n:
            HITS[a] = HITS.get(a, 0) + n
    # quotes: "*’X’" / "*X’" -> "‘X’";  “X’ -> ‘X’;  an opening ’ (after a space, dash or bracket) -> ‘
    t = re.sub(r"\*’?(?=[ऀ-ॿ])", "‘", t)
    t = re.sub(r"“(?=[^”]*’)", "‘", t)
    t = re.sub(r"(^|[\s–—(])([\x03-\x06]*)’\s?(?=[\x03-\x06]*[ऀ-ॿ])", r"\1\2‘", t)
    for a, b in POST:
        if a in t:
            HITS[a] = HITS.get(a, 0) + t.count(a)
            t = t.replace(a, b)
    for ph in BOLD_PHRASES:
        if ph in t:
            t = t.replace(ph, B0 + ph + B1)
    t = t.replace("‘3 कार’", "‘ॐकार’").replace("‘3 नमः", "‘ॐ नमः").replace("‘ॐ नम: शिवाय’", "‘ॐ नमः शिवाय’")
    return t


def read_docx(path):
    z = zipfile.ZipFile(path)
    d = z.read("word/document.xml").decode("utf8")
    body = d[d.index("<w:body>"):]
    rels = {}
    for m in re.finditer(r"<Relationship [^>]*>", z.read("word/_rels/document.xml.rels").decode()):
        i, t = re.search(r'Id="([^"]+)"', m.group(0)), re.search(r'Target="([^"]+)"', m.group(0))
        if i and t:
            rels[i.group(1)] = t.group(1)
    paras = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", body, re.S):
        st = re.search(r'<w:pStyle w:val="([^"]+)"', p)
        s, figs = "", []
        for r in re.findall(r"<w:r[ >].*?</w:r>", p, re.S):
            rp = re.search(r"<w:rPr>(.*?)</w:rPr>", r, re.S)
            bold = bool(rp and re.search(r"<w:b/>|<w:b w:val=\"(1|true)\"", rp.group(1)))
            ital = bool(rp and re.search(r"<w:i/>|<w:i w:val=\"(1|true)\"", rp.group(1)))
            txt = ""
            for m in re.finditer(r'<w:t[^>]*>([^<]*)</w:t>|<w:tab/>|<w:br w:type="page"/>|<w:br[^>]*/>|r:embed="(rId\d+)"', r):
                if m.group(1) is not None:
                    txt += m.group(1)
                elif m.group(2):
                    figs.append(rels[m.group(2)])
                elif m.group(0).startswith("<w:tab"):
                    txt += " "
                elif m.group(0).startswith("<w:br w:type"):
                    pass
                else:
                    txt += "\n"
            txt = txt.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")
            if txt.strip() and bold:
                txt = B0 + txt + B1
            if txt.strip() and ital:
                txt = I0 + txt + I1
            s += txt
        s = s.replace(B1 + B0, "").replace(I1 + I0, "")
        paras.append({"st": st.group(1) if st else "", "t": s, "figs": figs})
    return z, paras


def plain(t):
    return re.sub("[\x03-\x06]", "", t)


def html_inline(t):
    t = esc(t)
    return t.replace(B0, '<span class="bold">').replace(B1, "</span>").replace(I0, '<span class="rg-it">').replace(I1, "</span>")


def save_picture(blob, n):
    im = Image.open(io.BytesIO(blob))
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, "white")
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    if im.width > 640:
        im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=86, optimize=True)
    name = "%s%02d.jpg" % (IMG_PREFIX, n)
    write(IMG_DIR / name, buf.getvalue())
    return name, len(buf.getvalue())


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P = read_docx(sys.argv[1])
    if plain(P[1]["t"]).strip() != "शिवपुराण–कथासार" or plain(P[18]["t"]).strip() != "विषय–सूची" or not plain(P[BODY_START]["t"]).startswith("शिवपुराण–कथासार"):
        raise SystemExit("the docx is not the expected one")

    # pictures, in order of the book
    IMG_DIR.mkdir(exist_ok=True)
    for old in IMG_DIR.glob(IMG_PREFIX + "*"):
        old.unlink()
    pic, n_pic, pic_bytes = {}, 0, 0
    for p in P:
        for target in p["figs"]:
            if target not in pic:
                n_pic += 1
                name, size = save_picture(z.read("word/" + target), n_pic)
                pic[target] = name
                pic_bytes += size

    pages, cur = [], None
    chap_no = 0
    stats = {"normal": 0, "shlok": 0, "sub": 0, "end": 0}
    quote_odd = []

    def new_page(top="&nbsp;"):
        nonlocal cur
        if cur is not None:
            pages.append("\n<div class=\"Basic-Graphics-Frame\">\n" + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">%s</p>\n' % top]

    def add(cls, text, attrs=""):
        cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, html_inline(text)))

    def add_pics(p):
        for target in p["figs"]:
            cur.append('\t\t\t<p class="Image"><span><img class="frame-1" src="image/%s" alt=""></span></p>\n' % pic[target])

    def heading(txt):
        nonlocal chap_no
        chap_no += 1
        new_page("॥ श्रीहरिः ॥" if chap_no <= 3 else "&nbsp;")
        add("Heading", txt, ' id="Chapter_%d"' % chap_no)

    # ---- title page
    cover = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
             '\t\t\t<p class="cover-Sub-Title">[ शिवमहापुराण–एक सिंहावलोकन ]</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">त्वमेव माता च पिता त्वमेव</p>\n\t\t\t<p class="Tavmev-Mata--pita">त्वमेव बन्धुश्च सखा त्वमेव।</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">त्वमेव विद्या द्रविणं त्वमेव</p>\n\t\t\t<p class="Tavmev-Mata--pita">त्वमेव सर्वं मम देवदेव॥</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n\t\t\t<p class="Image"><span><img src="image/radheshyam-khemka.webp" width="150" height="150" alt="राधेश्याम खेमका"></span></p>\n'
             '\t\t\t<p class="cover-Author-Name">राधेश्याम खेमका</p>\n'
             '\t\t\t<p class="cover-Publisher-Note">%s</p>\n\t\t</div>\n') % (NAME, NOTE)
    pages.append(cover)

    # ---- निवेदन (paragraphs 10-16)
    assert plain(P[10]["t"]).strip() == "निवेदन"
    heading("निवेदन")
    for i in range(11, FRONT_END):
        txt = tidy(fix_text(P[i]["t"].replace("\n", " ")))
        if not plain(txt).strip():
            continue
        if i in (15, 16):
            add("TXT-Right", txt)
        else:
            add("Normal", txt)
            stats["normal"] += 1

    # ---- body
    for i in range(BODY_START, len(P)):
        p = P[i]
        if i in GARBAGE:
            continue
        raw = p["t"]
        if i == 287:
            raw = raw.replace("‘लाकर सझि’। जि ही ) ही ", "")
            assert "सझि" not in raw
        if i == 613:
            raw = re.sub(r"^\s*।\.\.\.\s*", "", raw)
        if i in GAPS:
            raw = raw.rstrip() + " " + GAPS[i] + " "
        txt = tidy(fix_text(raw.replace("\n", " ")))
        if i == BODY_START:
            heading("शिवमहापुराण—एक सिंहावलोकन")
            continue
        if p["st"] == "Heading1":
            heading(txt)
            continue
        if p["figs"] and p["st"] != "Heading2":
            add_pics(p)
        if not plain(txt).strip():
            continue
        if p["st"] == "Heading2":
            add("Sub-Heading", txt)
            stats["sub"] += 1
            add_pics(p)
        elif p["st"] == "chapterend":
            add("Chapter-End-Text", txt)
            stats["end"] += 1
        elif p["st"] == "Shlok" or i in (152, 153, 154):
            for ln in [tidy(x) for x in fix_text(raw).split("\n") if tidy(x)]:
                add("Shlok", ln)
                stats["shlok"] += 1
        else:
            if i == 613:                                   # the second half of the sentence started in 607: same paragraph in the reader
                cur[-1] = cur[-1].replace("</p>\n", "").rstrip("\n")
                cur[-1] += " " + html_inline(txt) + "</p>\n"
                continue
            add("Normal", txt)
            stats["normal"] += 1
            a, b = plain(txt).count("‘"), plain(txt).count("’")
            if a != b:
                quote_odd.append((i, a, b))
    pages.append('\n<div class="Basic-Graphics-Frame">\n' + "".join(cur) + "\t\t</div>\n")
    hr = '\n\n<hr class="page-break">\n\n'
    out = HEAD + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, pg) for i, pg in enumerate(pages)) + "\n\n</body>\n</html>"

    # ---- checks
    css = MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', out):
        used.update(m.group(1).split())
    bad = sorted(c for c in used if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    if re.search("[\x03-\x06]", out):
        raise SystemExit("a marker is left")
    ids = re.findall(r'id="(Chapter_\d+)"', out)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate chapter ids")
    unused = [a for a, _ in FIXES if a not in HITS]
    if unused:
        print("fix rules that did not fire:", unused)
    left = sorted(set(re.findall(r"[^\s<>]{0,10}[A-Za-z0-9*|/\\_^~`@#$%+=][^\s<>]{0,10}", re.sub(r"<[^>]+>", " ", out.split("<body>")[1]))))
    print("odd characters left:", left[:30])
    print("colons after a letter left:", len(re.findall(r"(?<=[ऀ-ॿ]):", out)), "| ZWNJ:", out.count("‌"), "| unbalanced-quote paragraphs:", len(quote_odd))

    write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| pages:", len(pages), "| headings:", len(ids), "|", stats,
          "| pictures: %d, %.0f KB" % (n_pic, pic_bytes / 1024))

    d = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        write(DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
        print("sizeKB updated")
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Purans",\n        "author":  "राधेश्याम खेमका",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (NAME, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()
