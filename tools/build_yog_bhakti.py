#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_yog_bhakti.py -- import "योग एवं भक्ति" (Shri Hanuman Prasad Poddar, ed.; Gitavatika Prakashan) from the OCR Word file
"Yog_Aur_Bhakti_continuous_print_book.docx".  Helpers: tools/build_prem_saras.py, tools/build_bhaiji_jaisa.py.

    title page    cover-Shri-Hari / cover-Book-Name / the portrait of the docx / cover-Author-Name / the Gitavatika note (two lines)
    नम्र निवेदन   Heading;  the 32 articles from Kalyan, a Heading each ("१. मन्त्र-सिद्धि"; the printed numbering skips (१०) and is kept),
                  then the two closing pieces (श्रेष्ठ योगवेत्ता कौन है? / योगके साधकको क्या करना चाहिये?)
    inside        the writer under the title ("[लेखक--...]") and the reference ("(कल्याण वर्ष ...)") -> Shlok-Right; verses -> Shlok;
                  "(क) उपक्रम" and the short titles of parts -> Sub-Heading
    dropped       the printed contents list, the "* * *" rows, the OCR's strips of broken print.  The footnotes sit inside the text in [ ] and are
                  kept as ( ) where the OCR read them; where the OCR made them (or a sentence round them) unreadable the span is cut (CUTS below).

    python tools/build_yog_bhakti.py "<Yog_Aur_Bhakti_continuous_print_book.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402
from build_ramsukhdas_docx import Book, tidy, read_docx, validate, write, OM, BOOKS, DATA_JS  # noqa: E402
from build_prem_saras import BLANK, DEV, PUBLISHER, IMG_DIR, hyphens, is_ref, lines_of  # noqa: E402
from build_bhaiji_jaisa import fix, AUTHOR  # noqa: E402

NAME = "योग एवं भक्ति"
OUT = BOOKS / (NAME + ".html")
CLOSING = "आलोक : विस्तृत जानकारीके लिये गीतावाटिका प्रकाशन, गोरखपुरसे प्रकाशित ‘श्रीभाईजी – एक अलौकिक विभूति’ पुस्तक अवश्य पढ़ें।"
DROP = {67, 68, 128, 129, 283, 288, 289, 290, 291}          # strips of broken print / the rest of a footnote that is lost
SUBS = {452, 454, 457, 459, 466, 468}                        # titles of the parts of "लीलाओंमें चमत्कार"
VERSE_REF = re.compile(r"^\(\s*[^()]{1,60}\)$")

# (paragraph, start, end or None for the end of the paragraph, replacement): the OCR's garble (mostly footnotes) is cut out
CUTS = {
    66: [("(योगियोंने *सूलपुथकृत्व", "वही ब्रह्म है।)", ""), (" (पतञ्जलिका सिद्धान्त है", None, "")],
    69: [(" (घर लानेका कारण", None, "")],
    76: [(" (स्वामीजीके सस्बन्धर्सों", "किया गया है)", "")],
    80: [(" (यह शिवलिङ्ग अलौकिक है।", "ज्योतिःसस्पन्न है।)", "")],
    81: [(" (परमहंसदेवका स्थूल देह", None, "")],
    84: [(" इस तीक्ष्ण तडित्‌", None, "")],
    119: [(" (ये रश्मियाँ, ठीक रास्तोंके समान हैं।", "असम जाता है।)", "")],
    120: [(" (श्ीवैष्णत भी इसे स्वीकार", "Jupiter’s prison हि ।)", "")],
    285: [(" [“We see", "inex-plicable.”]", "")],
    287: [(" एलिक्षा [ ऐसा प्रसिद्ध है", "प्रदान किया था।]", ""),
          ("[मैथू १४। २४-२६", "एक दिया था] ।", "(मैथू १४। २४-२६; मार्क ६। ४७-५६; जान ६। १६-२१)। उन्होंने मृत व्यक्तिको प्राणदान दिया था।"),
          (" [ शंकराचार्यने दक्षिणायूर्तिस्तोत्रमें", None, "।")],
    293: [(" [ देखिये-[cclesiastical", None, "")],
    296: [(" [ त्रतु उन्हें मनुष्य", "गयी हैं/]", "")],
    301: [(" [ साहिष्यती_", "८। ९] प्रभृति र", " प्रभृति"),
          (" [ श्रीकृष्णकी तरह बुद्धदेवके", "जीवित थै]", "। मौद्गल्यायन और पिण्डोल भारद्वाज"),
          ("घोषणा कर दी-“यदि", "सकते हैं” ]।'", "घोषणा कर दी कि यदि कहीं कोई अर्हत् हों तो आकर इसे ग्रहण करें।")],
    302: [(" [ बादशाहने सन्तुष्ट होकर", "बनायी गयी थीं।]", "")],
    306: [(" को गन्धह भाष्य”", "टीका है/]", "।")],
    308: [(" न इस पाँच प्रकार अधिके [", None, "-इन पाँच प्रकारकी अभिज्ञाओंका उदय होता है।")],
    310: [(" इसका नाम ' है।", "साधारण योगीके लिये नहीं।", "")],
    311: [(" [ टीकाकारके मतसे कल्प", "व्याख्या करते हैं। ]", ""), (" [अपाम सोमममृता अभूम्‌", None, "")],
    312: [(" [ परताअलसुम्मरवायमं", "संघटन’ है।]", "")],
    313: [(" [द्वैत और अद्वैत दोनों", "वर्णन है/]", "")],
    389: [(" (देखिये सूत्र ६", "संग्रहीत हैं)", "")],
    390: [(" [ “अष्टछाप के यहात्पाओंपें", "सरस ग्रन्थ है के महात्माओंके", " के महात्माओंके पद")],
}
REPL = {
    66: [("वास्तवमें_ ऐसा", "वास्तवमें ऐसा"), ("योगशास्त्रमं", "योगशास्त्रमें")],
    122: [("Pyhagoras", "Pythagoras"), ("तेजोधारक मात्र (075 मात्र है", "तेजोधारक मात्र है"), ("प्लेटो (90)", "प्लेटो (Plato)"), ("kabalist", "Kabalist"), ("ऽSephira", "Sephira"), ("Timaecus", "Timaeus")],
    132: [("Qualitaive", "Qualitative")],
    170: [("(God the ऽ0n)", "(God the Son)")],
    284: [("बॉनेट (9006)", "बॉनेट (Bonnet)")],
    285: [("]aws", "laws")],
    287: [("(Red 568)", "(Red Sea)")],
    292: [("(६dward", "(Edward")],
    94: [("द्वे अस्य बीजे सनी दि ल्व कक पञ्चस्कन्धः पञ्चरसप्रसूतिः ।", "द्वे अस्य बीजे शतमूलस्त्रिनालः पञ्चस्कन्धः पञ्चरसप्रसूतिः।"),
         ("दशैकशाखो द्विफलोऽर्क प्रविष्टः ॥", "दशैकशाखो द्विसुपर्णनीडस्त्रिवल्कलो द्विफलोऽर्कं प्रविष्टः॥")],
    634: [("भलत्नीभाँति", "भलीभाँति"), ("आर जो", "और जो")],
    637: [("(गीता श्२। १)", "(गीता १२। २)")],
    638: [("(गीता श्२। १)", "(गीता ६। ४६)"), ("लनो", "बनो")],
    639: [("(गीता १२। १)", "(गीता ६। ४७)"), ("त्नगाये", "लगाये")],
    293: [("(AuUSer)", "(Auser)"), ("[Gregory: Dialogues, Book दा (अध्याय ९)।", "(Gregory: Dialogues, अध्याय ९)।")],
    294: [(" [ देखिये-Life of St. Agnes’s, by Raymond of Capua.]|'", " (देखिये—Life of St. Agnes, by Raymond of Capua)।"),
          ("[ देखिये-[La Vierge de Sienne-Dialogues, 49]", "(देखिये—La Vierge de Sienne, Dialogues, 49)"), ("(PUlciano)", "(Pulciano)")],
    295: [("०f Paula", "of Paula")],
    389: [("स्वामीजीको निस्सीम", "स्वामीजीकी निस्सीम"), ("स्वामीजीको  निस्सीम", "स्वामीजीकी निस्सीम")],
    401: [("(R०sy ८055)", "(Rosy Cross)"), ("पत०।l) Gal", "Holy Grail")],
    410: [("(Sarswati-bDhavana studies-Vol. 2.", "(Sarasvati Bhavana Studies, Vol. 2."), ("अग्रेजीमें", "अंग्रेजीमें")],
    310: [("*अस्पिता", "‘अस्मिता’")],
    141: [("और ed वजीर खोने अपना सारा शे शेष हवन न उसी घर्णकुटियाम काबुलमें वह छप्पर अब द्यान हे।", "और वजीरने अपना सारा शेष जीवन उसी पर्णकुटीमें भगवानके ध्यानमें बिताया। काबुलमें वह छप्पर अब भी विद्यमान है।"), ("जड़ हो जाता है भगवानके ध्यानमें बिताया।", "जड़ हो जाता है।"), ("जनता उ. श्रद्धासे, पूजती है। व वहाँके", "जनता उसे श्रद्धासे पूजती है। वहाँके"), ("यदि. कोई", "यदि कोई")],
    147: [("अब थी मौजूद", "अब भी मौजूद"), ("प्रतापबागमे- श्रीचन्द्रचुनार", "प्रतापबागमें ‘श्रीचन्द्रचुनार’")],
}
SPECIAL = {
    130: "ऊपर शुक्लवर्ण या शुद्ध सत्त्वकी जो बात कही गयी है, वही आगमशास्त्रका बिन्दु-तत्त्व है। यह चन्द्रबिन्दु है। यही कुण्डलिनी और चिदाकाश है--यही शब्दमातृका है। "
         "इसके विक्षोभसे ही नाद और वर्ण उत्पन्न होते हैं। जो इन सबके उद्भव और विस्तार-क्रमको नहीं जानते, जो सब वर्णोंके अन्योन्य सम्बन्धको नहीं समझते, "
         "जो सम्बन्ध स्थापित करने और तोड़नेमें समर्थ नहीं हैं, वे किस प्रकारसे मन्त्रोद्धार कर सकते हैं?",
}
FIXED = {   # the closing piece: the OCR's reading of the references / words that are known
    "(गीता श्२। ४)": "(गीता १२। १)",
    "श्रीभगवान्‌ बोल्ने": "श्रीभगवान् बोले—",
}


GENERIC = [("शाश्चत", "शाश्वत"), ("भविष्यच्य", "भविष्यच्च"), ("प्राप्तुबन्ति", "प्राप्नुवन्ति"), ("सूर्य लयं", "सूर्ये लयं"),
           ("सवेषां", "सर्वेषां"), ("युक्ततमोमतः", "युक्ततमो मतः")]


def cut(t, a, b, repl):
    i = t.find(a)
    assert i >= 0, ("start not found", a)
    if b is None:
        return t[:i] + repl
    j = t.find(b, i)
    assert j >= 0, ("end not found", b)
    return t[:i] + repl + t[j + len(b):]


def brackets(t):
    """Footnotes the OCR read: [ ... ] / [ ... /] -> ( ... )"""
    t = re.sub(r"\[\s*([^\[\]]*?)\s*/?\]", lambda m: "(" + m.group(1) + ")", t)
    return t


def author_line(txt):
    s = re.sub(r"^\[\s*|\s*\|?\]?$", "", txt)
    s = re.sub(r"^(लेखक|लेखिका)\s*[-–—]+\s*", r"\1 — ", s)
    s = s.replace("तव्रजनारी", "व्रजनारी")
    return fix(s)


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P, _ = read_docx(sys.argv[1])
    b = Book(NAME)

    blob, ext = bc.optimize_image(z.read("word/media/image1.png"), ".png", 200 * 1024)
    write(IMG_DIR / ("yog-aur-bhakti-01" + ext), blob)
    t = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
         '\t\t\t<p class="Image"><span><img class="frame-1" src="image/yog-aur-bhakti-01%s" alt=""></span></p>\n'
         '\t\t\t<p class="cover-Author-Name">हनुमानप्रसाद पोद्दार</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
         '\t\t\t<p class="cover-Publisher-Note">%s के मूल ग्रंथ</p>\n\t\t\t<p class="cover-Publisher-Note">— सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।</p>\n\t\t</div>\n') % (
        NAME, ext, "गीतावाटिका प्रकाशन, गीतावाटिका - गोरखपुर")
    b.pages.append(t)

    h1 = [i for i, p in enumerate(P) if p["st"] == "Heading1"]
    names = [tidy(P[i]["t"].replace("\n", " ")) for i in h1]
    i_niv, i_toc = h1[names.index("नम्र निवेदन")], h1[names.index("विषय-सूची")]
    body = [i for i in h1 if i > i_toc]

    def text_of(i):
        txt = tidy(P[i]["t"].replace("\n", " "))
        for a, e, r in CUTS.get(i, []):
            txt = cut(txt, a, e, r)
        for a, r in REPL.get(i, []) + GENERIC:
            txt = txt.replace(a, r)
        return txt

    def text_line(i, x):
        for a, r in REPL.get(i, []) + GENERIC:
            x = x.replace(a, r)
        return x

    def para(i, hi):
        p = P[i]
        if i in DROP:
            return
        txt = text_of(i)
        if i in SPECIAL and SPECIAL[i]:
            b.add("Normal", fix(SPECIAL[i]))
            return
        if i == 147:
            txt = txt.replace("एवं बड़े सुन्दर वृक्षको [ वह यही पेड़ है", "एवं बड़े सुन्दर वृक्षकी शकलमें बदल गयी [ वह यही पेड़ है")
            txt = re.sub(r"आँखों देखा है शकलमें बदल गयी।", "आँखों देखा है ]।", txt)
        if i == 292:
            txt = txt.replace("नामक ग्रन्थमें इसको photography ' कहा है। ", "", 1)
        if not txt or p["figs"] or p["st"] == "Title" or txt == OM or BLANK.fullmatch(txt):
            return
        if txt in FIXED:
            txt = FIXED[txt]
        if txt.startswith("(कल्याण वर्ष") and ")" not in txt:                     # the OCR's mark of the page after the reference
            b.add("Shlok-Right", fix(re.sub(r"[\*म\s]+$", "", txt)) + ")")
            return
        if p["jc"] == "center":
            if re.fullmatch(r"\(\s*[०-९0-9]+\s*\)", txt):
                b.add("Sub-Heading", fix(txt))
            else:
                b.add("Shlok-Right", fix(brackets(txt)))
            return
        if txt.startswith("[") and i <= hi + 2 and len(txt) < 150:                    # the writer, under the title
            b.add("Shlok-Right", author_line(txt))
            return
        if i in SUBS or re.fullmatch(r"\(\s*[क-ह]\)\s*\S.{0,60}", txt):
            b.add("Sub-Heading", fix(re.sub(r"^\(\s+", "(", txt)))
            return
        txt = brackets(txt).replace("आये >", "आये?")
        if p["jc"] == "both":
            txt = re.sub(r"^-+\s*(?=\S)", "— ", txt)
            if txt.startswith("श्रद्धावान्"):
                b.add("Shlok", fix(txt))
                return
            if len(txt) <= 45 and len(txt.split()) <= 6 and not re.search(r"[।॥?!,;:'’”\)—\-]", txt) and txt[0] not in "“‘(\"'":
                b.add("Sub-Heading", fix(txt))
                return
            if i == 641:
                for part in re.split(r"(?<=[।\.])\s+(?=[०-९]+[–-])", txt):
                    b.add("Normal", fix(part))
                return
            b.add("Normal", fix(txt))
            return
        ls = [tidy(x) for x in p["t"].split("\n") if tidy(x)]                     # no alignment: verse lines
        if i in CUTS or i in REPL:
            ls = [txt]
        if len(ls) == 1 and len(ls[0]) > 110:
            b.add("Normal", fix(ls[0]))
        else:
            for ln in ls:
                b.add("Shlok", fix(ln))

    # नम्र निवेदन
    b.heading("नम्र निवेदन", "Heading", OM)
    for i in range(i_niv + 1, i_toc):
        p = P[i]
        txt = tidy(p["t"].replace("\n", " "))
        if p["st"] == "Heading1" or BLANK.fullmatch(txt):
            continue
        if txt in ("(संकलित)", "हनुमानप्रसाद पोद्दार"):
            b.add("TXT-Right", txt)
        elif p["jc"] == "":
            b.add("Shlok", fix(txt.replace("मद्गतेनान्तरात्मनाः", "मद्गतेनान्तरात्मना")))
        elif txt.startswith("श्रद्धावान्"):
            b.add("Shlok", fix(txt))
        else:
            b.add("Normal", fix(txt))

    n = 0
    for kk, hi in enumerate(body):
        end = body[kk + 1] if kk + 1 < len(body) else len(P)
        title = tidy(P[hi]["t"].replace("\n", " "))
        m = re.fullmatch(r"\(([०-९0-9]+)\)\s*(.*)", title)
        if m:
            n += 1
            b.heading("%s. %s" % (m.group(1).translate(DEV), fix(hyphens(m.group(2)))), "Heading", OM)
        else:
            b.heading(fix(title), "Heading", OM)
        for i in range(hi + 1, end):
            para(i, hi)

    out = b.html().replace("द्विसुपर्णनीइस्त्रिवल्कलो", "द्विसुपर्णनीडस्त्रिवल्कलो")      # ocr_fix reads "डस" as "इस"
    ids = validate(out)
    write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| chapters:", ids, "| articles:", n)

    d = DATA_JS.read_text(encoding="utf-8")
    mm = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if mm:
        write(DATA_JS, d[:mm.start()] + mm.group(1) + str(size) + d[mm.end():])
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Siksha evam Katha",\n        "author":  "%s",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, AUTHOR, PUBLISHER, size)).replace("\n", nl)
        k2 = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k2 + 1] + "," + nl + entry + d[k2 + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()
