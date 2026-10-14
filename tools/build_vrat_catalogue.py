#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_vrat_catalogue.py -- merge the vrat / festival data sets into one catalogue for the database.

  database/vrat.json                72 vrats and festivals, each with intro, पूजा विधान, कथा, ऐतिहासिक महत्व (keys: id, vrat_name, ...)
  database/dates.json               145 dated events and observances found in the Gita Press editions of the Ramayana,
                                    Bhagavat, Mahabharata, Devi Bhagavat, Shiv Purana and the Ekadashi-mahatmya (RAM-001 ...)
  database/vrat_chaitra_ashadha.json  86 more vrats of चैत्र to आषाढ़, same shape as vrat.json ("[cite: 5]" marks are removed)

The same event appears in several (Ram Navami, Janmashtami, every Ekadashi, Pradosh ...). Those are MERGED: one vrat
entry; the dates.json records are attached to it as its scriptural sources and the text of the other list is kept as an
extra version (gaps in the entry are filled from it). Records that describe something new become entries of their own;
records that only describe an episode of an epic (a birth, a battle) or give general rules become entries of kind
"event" / "reference" and are never shown automatically. The month-wise versions of a vrat that recurs every month
(Sankashti of Chaitra, Pradosh of Vaishakh ...) are entries of kind "variant", shown on the page of their parent.

Result: server/lib/vrat-catalogue.json   { vrats: [...], sources: [...], links: [...] }, which server/lib/vrats.js loads
into the database (tables vrats, vrat_sources, vrat_source_links). Adding more months later: put the new list next to the
others, add it to GEM below, and say for every entry that is the same observance as an existing one (GEM_MERGE).

When a vrat is observed -- matched against today's panchang by the home page (swadhyay-app.js):
  rules   a list; the vrat is observed when ANY rule matches. A rule has
            maas    purnimanta month names (चैत्र ... फाल्गुन, or "अधिक" for an adhika month); [] = every month
            tithis  "S:10" = शुक्ल पक्ष दशमी, "K:4" = कृष्ण पक्ष चतुर्थी, "S:15" = पूर्णिमा, "K:15" = अमावस्या; [] = any
            vaar    weekday, 0 = रविवार ... 6 = शनिवार, or None
          (a rule with only a month = the whole month)
  kind    festival (a named day of a named month) | tithi (every month on a tithi) | weekly | variant | event | reference
  pri     lower is shown first when several fall on one day
Only festival / tithi / weekly entries are ever shown automatically.

    python tools/build_vrat_catalogue.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VRAT = ROOT / "database" / "vrat.json"
DATES = ROOT / "database" / "dates.json"
GEM = ROOT / "database" / "vrat_chaitra_ashadha.json"
OUT = ROOT / "server" / "lib" / "vrat-catalogue.json"


# The tithi is read at noon unless the observance goes by another time of the day:
#   "moonrise" = when the moon rises (Sankashti, Karwa Chauth), "pradosh" = a little after sunset (Pradosh, Diwali, Holika Dahan),
#   "night" = about midnight (Mahashivratri, Janmashtami). The same tithi can then fall on the day before the noon one.
AT = {
    "sankashti-chaturthi": "moonrise", "karva-chauth": "moonrise",
    "dhanteras": "pradosh", "diwali": "pradosh", "holi": "pradosh", "pradosh-vrat": "pradosh",
    "mahashivratri": "night", "janmashtami": "night", "bhairav-ashtami": "night", "masik-shivratri": "night",
}


def R(maas, tithis, vaar=None):
    return {"maas": maas, "tithis": tithis, "vaar": vaar}


# ---------------------------------------------------------------- the 72 vrats of vrat.json
# id: (slug, name must start with, kind, maas[], tithis[], vaar, pri, icon, keywords[], [dates.json ids merged into it])
def E(slug, frag, maas, tithi, srcs, aliases=None):
    return (slug, frag, "festival", [maas], [tithi], None, 20, "🙏", ["एकादशी"], srcs)


S = lambda n: ["S:%d" % n]
K = lambda n: ["K:%d" % n]
OLD = {
    1: ("dussehra", "दशहरा", "festival", ["आश्विन"], S(10), None, 10, "🏹", ["राम"], ["DB-005"]),
    2: ("sharad-purnima", "शरद पूर्णिमा", "festival", ["आश्विन"], S(15), None, 10, "🌕", ["कृष्ण"], ["BHG-010"]),
    3: ("karva-chauth", "करवा चौथ", "festival", ["कार्तिक"], K(4), None, 10, "🌙", ["गणेश"], []),
    4: ("ahoi-ashtami", "अहोई अष्टमी", "festival", ["कार्तिक"], K(8), None, 10, "🪔", ["देवी"], []),
    5: ("dhanteras", "धन तेरस", "festival", ["कार्तिक"], K(13), None, 10, "🪙", ["लक्ष्मी"], []),
    6: ("diwali", "दीपावली", "festival", ["कार्तिक"], K(15), None, 10, "🪔", ["लक्ष्मी", "गणेश"], []),
    7: ("govardhan-puja", "अन्नकूट", "festival", ["कार्तिक"], S(1), None, 10, "⛰️", ["कृष्ण"], []),
    8: ("bhai-dooj", "भैया दूज", "festival", ["कार्तिक"], S(2), None, 10, "🪔", [], []),
    9: ("tulsi-vivah", "तुलसी विवाह", "festival", ["कार्तिक"], S(11), None, 12, "🌿", ["विष्णु"], []),
    10: ("kartik-purnima", "कार्तिक पूर्णिमा", "festival", ["कार्तिक"], S(15), None, 10, "🌕", ["सत्यनारायण"], ["DB-008", "SP-008", "MBH-019"]),
    11: ("bhairav-ashtami", "भैरव अष्टमी", "festival", ["मार्गशीर्ष"], K(8), None, 10, "🔱", ["शिव"], ["SP-006"]),
    12: ("sankashti-chaturthi", "संकष्ट", "tithi", [], K(4), None, 30, "🐘", ["गणेश"], ["SP-007"]),
    13: ("mauni-amavasya", "मौनी अमावस्या", "festival", ["माघ"], K(15), None, 10, "🙏", ["विष्णु"], []),
    14: ("basant-panchami", "बसंत पंचमी", "festival", ["माघ"], S(5), None, 10, "🌼", ["सरस्वती"], []),
    15: ("achala-saptami", "अचला सप्तमी", "festival", ["माघ"], S(7), None, 10, "☀️", ["सूर्य"], ["BHG-016", "SP-021"]),
    16: ("mahashivratri", "महाशिवरात्रि", "festival", ["फाल्गुन"], K(14), None, 10, "🔱", ["शिव"], ["SP-014", "SP-001"]),
    17: ("holi", "होलिकोत्सव", "festival", ["फाल्गुन"], S(15), None, 10, "🔥", ["विष्णु"], []),
    18: ("nav-samvatsar", "नव संवत्सर", "festival", ["चैत्र"], S(1), None, 10, "🚩", ["दुर्गा", "देवी"], []),
    19: ("navratri", "नवरात्र", "festival", ["चैत्र", "आश्विन"], ["S:%d" % n for n in range(1, 10)], None, 15, "🔱", ["दुर्गा", "देवी"], ["DB-003", "DB-016", "DB-006", "DB-017"]),
    20: ("gangaur", "गणगौर", "festival", ["चैत्र"], S(3), None, 10, "🌺", ["पार्वती", "शिव"], []),
    21: ("ram-navami", "राम नवमी", "festival", ["चैत्र"], S(9), None, 10, "🏹", ["राम"], ["RAM-001", "MBH-002", "DB-019", "BHG-011"]),
    22: ("akshaya-tritiya", "अक्षय तृतीया", "festival", ["वैशाख"], S(3), None, 10, "✨", ["विष्णु"], ["BHG-013"]),
    23: ("sita-navami", "सीता नवमी", "festival", ["वैशाख"], S(9), None, 10, "🌸", ["राम", "सीता"], []),
    24: ("ganga-dussehra", "गंगा दशहरा", "festival", ["ज्येष्ठ"], S(10), None, 10, "🌊", ["गंगा"], []),
    25: ("vat-savitri", "वटसावित्री", "festival", ["ज्येष्ठ"], K(15), None, 10, "🌳", ["सावित्री"], []),
    26: ("guru-purnima", "गुरुपूर्णिमा", "festival", ["आषाढ़"], S(15), None, 10, "🙏", ["व्यास", "गुरु"], []),
    27: ("nag-panchami", "नागपंचमी", "festival", ["श्रावण"], S(5), None, 10, "🐍", ["शिव"], []),
    28: ("raksha-bandhan", "रक्षा बंधन", "festival", ["श्रावण"], S(15), None, 10, "🧵", [], []),
    29: ("janmashtami", "श्रीकृष्ण जन्माष्टमी", "festival", ["भाद्रपद"], K(8), None, 10, "🦚", ["कृष्ण"], ["BHG-001", "BHG-011", "DB-013"]),
    30: ("haritalika", "हरितालिका", "festival", ["भाद्रपद"], S(3), None, 10, "🌺", ["पार्वती", "शिव"], []),
    31: ("rishi-panchami", "ऋषि पंचमी", "festival", ["भाद्रपद"], S(5), None, 10, "🙏", [], []),
    32: ("radha-ashtami", "राधा अष्टमी", "festival", ["भाद्रपद"], S(8), None, 10, "🌹", ["राधा", "कृष्ण"], []),
    33: ("anant-chaturdashi", "अनंत चतुर्दशी", "festival", ["भाद्रपद"], S(14), None, 10, "🪢", ["अनंत", "विष्णु"], []),
    34: ("vaibhav-lakshmi", "वैभव लक्ष्मी", "weekly", [], [], 5, 51, "🪷", ["लक्ष्मी"], []),
    35: ("satyanarayan-vrat", "श्रीसत्यनारायण", "tithi", [], ["S:15", "K:15"], None, 32, "🪔", ["सत्यनारायण"], []),
    36: ("amavasya-vrat", "अमावस्या व्रत", "tithi", [], K(15), None, 33, "🌑", ["पितर", "श्राद्ध"], ["BHG-024", "BHG-025", "MBH-018", "DB-022", "MBH-034"]),
    37: ("pradosh-vrat", "प्रदोष", "tithi", [], ["S:13", "K:13"], None, 31, "🔱", ["शिव"], ["RAM-002", "SP-002", "MBH-033"]),
    38: ("santoshi-mata", "संतोषी माता", "weekly", [], [], 5, 52, "🪷", ["देवी"], []),
    39: ("solah-somvar", "सोलह सोमवार", "weekly", [], [], 1, 51, "🔱", ["शिव"], []),
    40: ("grahan", "सूर्य ग्रहण", "other", [], [], None, 99, "🌘", ["ग्रहण"], ["BHG-023"]),
    41: ("ravivar-vrat", "रविवार", "weekly", [], [], 0, 50, "☀️", ["सूर्य"], []),
    42: ("somvar-vrat", "सोमवार व्रत", "weekly", [], [], 1, 50, "🌙", ["शिव"], []),
    43: ("mangalvar-vrat", "मंगलवार", "weekly", [], [], 2, 50, "🚩", ["हनुमान"], []),
    44: ("budhvar-vrat", "बुधवार", "weekly", [], [], 3, 50, "🌿", ["गणेश"], []),
    45: ("brihaspativar-vrat", "बृहस्पतिवार", "weekly", [], [], 4, 50, "📿", ["विष्णु"], []),
    46: ("shukravar-vrat", "शुक्रवार", "weekly", [], [], 5, 53, "🪷", ["लक्ष्मी"], []),
    47: ("shanivar-vrat", "शनिवार", "weekly", [], [], 6, 50, "🪐", ["हनुमान"], []),
    48: E("putrada-ekadashi-paush", "पुत्रदा एकादशी व्रत (पौष)", "पौष", "S:11", ["EK-004"]),
    49: E("shattila-ekadashi", "षट्तिला", "माघ", "K:11", ["EK-005"]),
    50: E("jaya-ekadashi", "जया", "माघ", "S:11", ["EK-006"]),
    51: E("vijaya-ekadashi", "विजया", "फाल्गुन", "K:11", ["EK-007"]),
    52: E("amalaki-ekadashi", "आमलकी", "फाल्गुन", "S:11", ["EK-008"]),
    53: E("kamada-ekadashi", "कामदा", "चैत्र", "S:11", ["EK-010"]),
    54: E("varuthini-ekadashi", "वरूथिनी", "वैशाख", "K:11", ["EK-011"]),
    55: E("mohini-ekadashi", "मोहिनी", "वैशाख", "S:11", ["EK-012"]),
    56: E("apara-ekadashi", "अपरा", "ज्येष्ठ", "K:11", ["EK-013"]),
    57: E("nirjala-ekadashi", "भीमसेनी", "ज्येष्ठ", "S:11", ["EK-014"]),
    58: E("yogini-ekadashi", "योगिनी", "आषाढ़", "K:11", ["EK-015"]),
    59: E("devshayani-ekadashi", "देवशयनी", "आषाढ़", "S:11", ["EK-016"]),
    60: E("kamika-ekadashi", "कामिका", "श्रावण", "K:11", ["EK-017"]),
    61: E("putrada-ekadashi-shravan", "पवित्रा", "श्रावण", "S:11", ["EK-018"]),
    62: E("aja-ekadashi", "अजा", "भाद्रपद", "K:11", ["EK-019"]),
    63: E("parivartini-ekadashi", "परिवर्तिनी", "भाद्रपद", "S:11", ["EK-020"]),
    64: E("indira-ekadashi", "इंदिरा", "आश्विन", "K:11", ["EK-021"]),
    65: E("papankusha-ekadashi", "पापांकुशा", "आश्विन", "S:11", ["EK-022"]),
    66: E("rama-ekadashi", "रमा", "कार्तिक", "K:11", ["EK-023"]),
    67: E("devutthani-ekadashi", "देवोत्थानी", "कार्तिक", "S:11", ["EK-024", "BHG-007"]),
    68: E("utpanna-ekadashi", "उत्पन्ना", "मार्गशीर्ष", "K:11", ["EK-001"]),
    69: E("mokshada-ekadashi", "मोक्षदा", "मार्गशीर्ष", "S:11", ["EK-002"]),
    70: E("safala-ekadashi", "सफला", "पौष", "K:11", ["EK-003"]),
    71: E("parama-ekadashi", "परमा", "अधिक", "K:11", ["EK-025"]),
    72: E("padmini-ekadashi", "पद्मिनी", "अधिक", "S:11", ["EK-026"]),
}
# the Devutthani Ekadashi is the main observance on the day Tulsi Vivah begins
_o = list(OLD[67]); _o[6] = 11; OLD[67] = tuple(_o)

# ---------------------------------------------------------------- entries that only dates.json has
# slug: (name, kind, maas[], tithis[], vaar, pri, icon, keywords[], [dates.json ids; the first one names the entry])
NEW = [
    ("papamochani-ekadashi", "पापमोचनी एकादशी व्रत", "festival", ["चैत्र"], K(11), None, 20, "🙏", ["एकादशी"], ["EK-009"]),
    ("ekadashi-vrat", "एकादशी व्रत — सामान्य विधि एवं माहात्म्य", "tithi", [], ["S:11", "K:11"], None, 40, "🙏", ["एकादशी"], ["EK-000", "BHG-021", "DB-010", "BHG-006"]),
    ("masik-shivratri", "मासिक शिवरात्रि", "tithi", [], K(14), None, 34, "🔱", ["शिव"], ["SP-020", "SP-001"]),
    ("purnima-vrat", "पूर्णिमा व्रत एवं दान", "tithi", [], S(15), None, 36, "🌕", ["सत्यनारायण"], ["MBH-030", "MBH-024", "MBH-034", "DB-022"]),
    ("vinayaka-chaturthi", "विनायक चतुर्थी (प्रत्येक शुक्ल पक्ष चतुर्थी)", "tithi", [], S(4), None, 34, "🐘", ["गणेश"], ["SP-007"]),
    ("ganesh-chaturthi", "गणेश चतुर्थी (भाद्रपद शुक्ल चतुर्थी)", "festival", ["भाद्रपद"], S(4), None, 10, "🐘", ["गणेश"], ["SP-007"]),
    ("shravan-somvar", "श्रावण सोमवार — शिव पूजन", "festival", ["श्रावण"], [], 1, 14, "🔱", ["शिव"], ["SP-011"]),
    ("paush-saptami-khichdi", "पौष शुक्ल सप्तमी — खिचड़ी शिव-पूजन", "festival", ["पौष"], S(7), None, 20, "🔱", ["शिव"], ["SP-012"]),
    ("magha-purnima", "माघ पूर्णिमा — जागरण, स्नान, शिव-पूजन", "festival", ["माघ"], S(15), None, 10, "🌕", ["शिव"], ["SP-013"]),
    ("uma-prakatya", "उमा-प्राकट्य (फाल्गुन शुक्ल द्वादशी)", "festival", ["फाल्गुन"], S(12), None, 20, "🌺", ["पार्वती", "शिव"], ["SP-018"]),
    ("vamana-dwadashi", "विजया द्वादशी / वामन जयन्ती", "festival", ["भाद्रपद"], S(12), None, 10, "🙏", ["विष्णु"], ["BHG-002", "DB-018"]),
    ("payovrat", "पयोव्रत (फाल्गुन शुक्ल प्रतिपदा से त्रयोदशी)", "festival", ["फाल्गुन"], ["S:%d" % n for n in range(1, 14)], None, 25, "🥛", ["विष्णु"], ["BHG-008"]),
    ("punsavan-vrat", "पुंसवन व्रत (मार्गशीर्ष शुक्ल प्रतिपदा)", "festival", ["मार्गशीर्ष"], S(1), None, 20, "🙏", ["विष्णु"], ["BHG-009"]),
    ("bhagavat-daan", "भागवत-दान (भाद्रपद पूर्णिमा)", "festival", ["भाद्रपद"], S(15), None, 20, "📖", ["भागवत"], ["BHG-012", "DB-011"]),
    ("akshaya-navami", "अक्षय नवमी", "festival", ["कार्तिक"], S(9), None, 10, "🌳", ["विष्णु"], ["BHG-014"]),
    ("mahalaya-shraddha", "महालय श्राद्ध (पितृपक्ष)", "festival", ["आश्विन"], ["K:%d" % n for n in range(1, 16)], None, 15, "🙏", ["श्राद्ध", "पितर"], ["BHG-017", "MBH-013", "MBH-014", "DB-012", "MBH-027"]),
    ("maha-ashtami", "महाअष्टमी (दुर्गा अष्टमी)", "festival", ["चैत्र", "आश्विन"], S(8), None, 12, "🔱", ["दुर्गा", "देवी"], ["DB-004", "DB-001"]),
    ("mahalakshmi-vrat", "महालक्ष्मी व्रत (भाद्रपद शुक्ल अष्टमी)", "festival", ["भाद्रपद"], S(8), None, 12, "🪷", ["लक्ष्मी"], ["DB-009"]),
    ("shashthi-vrat", "षष्ठी व्रत (देवसेना-पूजन)", "tithi", [], S(6), None, 45, "🙏", ["देवी"], ["DB-007"]),
    ("ananta-tritiya-vrat", "अनन्त-तृतीया / रस-कल्याणिनी व्रत", "tithi", [], S(3), None, 45, "🙏", ["देवी"], ["DB-015"]),
    ("chaturmas-deeksha", "चातुर्मास व्रत-दीक्षा (आषाढ़ पूर्णिमा)", "festival", ["आषाढ़"], S(15), None, 25, "🙏", ["विष्णु"], ["RAM-010"]),
    ("bhishma-ashtami", "भीष्माष्टमी (भीष्म-निर्वाण)", "festival", ["माघ"], S(8), None, 10, "🙏", ["महाभारत", "भीष्म"], ["MBH-011"]),
    # no date rule: scriptural references and general rules
    ("indradhvaj-utsav", "इन्द्रध्वजोत्सव", "reference", [], [], None, 90, "🚩", [], ["RAM-003", "MBH-022"]),
    ("bhagavat-katharambh", "भागवत कथारम्भ — शुभ तिथियाँ", "reference", [], [], None, 90, "📖", ["भागवत"], ["BHG-003", "BHG-004", "BHG-005", "BHG-020"]),
    ("ashtaka-shraddha", "अष्टका श्राद्ध (हेमन्त-शिशिर)", "reference", [], [], None, 90, "🙏", ["श्राद्ध"], ["BHG-015", "MBH-026", "MBH-028", "MBH-029"]),
    ("dwadashi-vishnu", "द्वादशी (विष्णु-तिथि) एवं विष्णु-द्वादशक व्रत", "reference", [], [], None, 90, "🙏", ["विष्णु"], ["BHG-022", "MBH-012"]),
    ("parayan-vidhan", "पारायण-विधान (रामायण, देवीभागवत, कार्तिक)", "reference", [], [], None, 90, "📖", ["रामायण", "देवी"], ["RAM-011", "RAM-012", "DB-021"]),
    ("sankranti", "संक्रान्ति पर्व", "reference", [], [], None, 90, "☀️", ["सूर्य"], ["SP-010", "SP-022"]),
    ("chandrayan-vrat", "चान्द्रायण एवं शिव-जप व्रत (पूरा मास)", "reference", [], [], None, 90, "🌙", [], ["MBH-031", "SP-023"]),
    ("tithi-niyam", "तिथि-नियम एवं पुण्य-तिथियाँ", "reference", [], [], None, 90, "🙏", [], ["MBH-023", "MBH-025", "SP-004", "SP-005", "SP-009", "SP-016", "SP-017", "DB-002", "DB-014", "DB-020", "BHG-018"]),
    ("tirth-parv", "तीर्थ-पर्व (महाभारत वनपर्व)", "reference", [], [], None, 90, "🛕", ["तीर्थ"], ["MBH-015", "MBH-016", "MBH-017", "MBH-020", "MBH-021"]),
    ("ardra-darshan", "आर्द्रा-दर्शन (मार्गशीर्ष)", "reference", [], [], None, 90, "🔱", ["शिव"], ["SP-003"]),
    ("kartik-maas-vrat", "कार्तिक मास — दान, जप, तप", "reference", [], [], None, 90, "🪔", ["कार्तिक"], ["SP-015"]),
]
# episodes of the epics (a birth, a battle, a journey): kept as entries of kind "event", never shown automatically
EVENTS = ["RAM-004", "RAM-005", "RAM-006", "RAM-007", "RAM-008", "RAM-009", "RAM-013", "BHG-019", "MBH-001", "MBH-003", "MBH-004",
          "MBH-005", "MBH-006", "MBH-007", "MBH-008", "MBH-009", "MBH-010", "MBH-032", "MBH-035", "SP-019"]

SRC_FIELDS = {"id": "id", "granth": "granth", "kand": "skandh_kand", "adhyay": "sarg_adhyay", "tithi": "tithi", "paksh": "paksh", "maas": "maas",
              "nakshatra": "nakshatra", "muhurta": "muhurta", "parv": "parv_vrat_naam", "ghatna": "ghatna", "vivran": "vivraN",
              "mahatva": "mahatva", "anushthan": "anushthan_vidhi", "phal": "phal"}

# ---------------------------------------------------------------- the third list: vrat_chaitra_ashadha.json (चैत्र से आषाढ़, 86 vrats)
# Same shape as vrat.json. What happens to each entry:
GEM_MERGE = {          # the same observance as an entry that already exists -> its text is attached to that entry
    6: "papamochani-ekadashi", 13: "nav-samvatsar", 17: "navratri", 22: "gangaur", 23: "gangaur", 33: "ram-navami",
    35: "kamada-ekadashi", 44: "varuthini-ekadashi", 45: "akshaya-tritiya", 53: "sita-navami", 54: "mohini-ekadashi",
    62: "apara-ekadashi", 63: "vat-savitri", 69: "ganga-dussehra", 70: "nirjala-ekadashi", 75: "yogini-ekadashi", 81: "devshayani-ekadashi",
}
GEM_VARIANT = {        # the month-wise version of a vrat that recurs every month -> listed on the parent's page, not shown by itself
    3: "sankashti-chaturthi", 61: "sankashti-chaturthi", 8: "pradosh-vrat", 38: "pradosh-vrat", 57: "pradosh-vrat", 10: "amavasya-vrat",
}
GEM_REFERENCE = {40}   # no single day: shown in the list, never automatically
GEM_PRI = {2: 10, 4: 10, 21: 20, 39: 10, 41: 10, 43: 20, 46: 10, 58: 10, 60: 12, 76: 10, 77: 20, 7: 22}
GEM_ICON = {2: "🎨", 4: "🙏", 21: "🎠", 39: "🌕", 41: "🚩", 46: "🪓", 58: "🦁", 60: "🌕", 76: "🛕", 77: "🦚", 1: "🌺", 22: "🌺"}
MONTH_ORDER = ["चैत्र", "वैशाख", "ज्येष्ठ", "आषाढ़", "श्रावण", "भाद्रपद", "आश्विन", "कार्तिक", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन"]
ALL_TITHIS = ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी"]
# the few that the text parser cannot read: gem id -> list of rules
GEM_RULES = {
    1: [R(["चैत्र"], ["K:%d" % n for n in range(1, 16)] + ["S:1", "S:2"])],
    29: [R([], ["S:7"])],
    41: [R(["चैत्र"], ["S:15"]), R(["कार्तिक"], ["K:14"])],
    42: [R(["वैशाख"], [])],
    48: [R(["वैशाख"], ["S:5", "S:6"])],
    84: [R(["आषाढ़"], ["S:15"]), R(["श्रावण"], ["K:%d" % n for n in range(1, 16)] + ["S:%d" % n for n in range(1, 15)])],
}


def norm_month(s):
    return s.replace("आषाढ", "आषाढ़").replace("आषाढ़़", "आषाढ़")


def tithi_index(word):
    """प्रतिपदा=1 ... चतुर्दशी=14; पूर्णिमा / अमावस्या = 15"""
    word = word.replace("पञ्चमी", "पंचमी")
    if word in ("पूर्णिमा", "अमावस्या"):
        return 15
    return ALL_TITHIS.index(word) + 1 if word in ALL_TITHIS else None


def parse_gem_rule(g):
    """maas + tithi text of the third list -> one rule, or None when the text is not a single, clear pattern."""
    maas_txt, tithi_txt = norm_month(g["maas"]), g["tithi"]
    months = [m for m in MONTH_ORDER if m in maas_txt]
    if "वर्षभर" in maas_txt or "एक माह" in maas_txt or "पूरा माह" in maas_txt or "प्रतिदिन" in maas_txt:
        return None
    if not months:
        return None
    pakshas = []
    if "कृष्ण व शुक्ल" in tithi_txt or "दोनों पक्ष" in tithi_txt:
        pakshas = ["K", "S"]
    elif "शुक्ल" in tithi_txt and "कृष्ण" in tithi_txt:
        return None
    elif "शुक्ल" in tithi_txt:
        pakshas = ["S"]
    elif "कृष्ण" in tithi_txt:
        pakshas = ["K"]
    head = tithi_txt.split("(")[0].strip()
    words = re.split(r"\s+(?:से|व)\s+|\s*,\s*", head)
    nums = []
    if " से " in head and len(words) == 2:
        a, b = tithi_index(words[0].strip()), tithi_index(words[1].strip())
        if a is None or b is None or b < a:
            return None
        nums = list(range(a, b + 1))
    else:
        for w in words:
            n = tithi_index(w.strip())
            if n is None:
                return None
            nums.append(n)
    if not pakshas or not nums:
        return None
    return R(months, ["%s:%d" % (p, n) for p in pakshas for n in nums])


GEM_CITE = re.compile(r"\s*\[cite:[^\]]*\]")


def gem_clean(s):
    if s is None:
        return None
    s = GEM_CITE.sub("", s).replace("\u200d", "").replace("\u200c", "").strip()
    return s or None


def gem_text(g):
    return {"intro": gem_clean(g.get("intro")) or "", "poojaVidhan": gem_clean(g.get("pooja_vidhan")) or "", "vratKatha": gem_clean(g.get("vrat_katha")),
            "historicImportance": gem_clean(g.get("historic_importance"))}


EXTRA_LABEL = "अन्य सूची के अनुसार (चैत्र–आषाढ़ व्रत-सूची)"


def merge_gem(entry, g, prefer_gem=False):
    """Attach the third list's text of the same observance. Missing parts of the entry are filled from it; the whole
    text is kept as an extra version, and the entry gains the name the third list gives it as an alias."""
    t = gem_text(g)
    if prefer_gem:
        for k in ("intro", "poojaVidhan", "vratKatha", "historicImportance"):
            if t[k]:
                entry[k] = t[k]
    else:
        for k in ("vratKatha", "historicImportance"):
            if not entry.get(k) and t[k]:
                entry[k] = t[k]
        if not entry.get("intro") and t["intro"]:
            entry["intro"] = t["intro"]
        if not entry.get("poojaVidhan") and t["poojaVidhan"]:
            entry["poojaVidhan"] = t["poojaVidhan"]
        entry.setdefault("extras", []).append(dict(t, label=EXTRA_LABEL, name=gem_clean(g["vrat_name"])))
    name = gem_clean(g["vrat_name"])
    if name and not similar(name, entry["name"]) and not any(similar(name, a) for a in entry["aliases"]):
        entry["aliases"].append(name)


def plain(x):
    return re.sub(r"[\s()/\-–—]|व्रत", "", x)


def similar(a, b):
    a, b = plain(a), plain(b)
    return bool(a) and bool(b) and (a in b or b in a)


def devanagari_slug(name):
    s = re.sub(r"\([^)]*\)", " ", name)
    s = re.sub(r"[^ऀ-ॿ0-9A-Za-z]+", "-", s).strip("-")
    return s[:60]


def clean(s):
    s = (s or "").strip()
    return None if s in ("", "अनिर्दिष्ट") else s


def source_row(d):
    out = {k: clean(d.get(v)) for k, v in SRC_FIELDS.items()}
    out["id"] = d["id"]
    out["tags"] = d.get("tags") or []
    return out


def entry_from_source(d):
    """An entry for a dates.json record that has no counterpart in vrat.json: its texts come from the record."""
    intro = clean(d.get("mahatva")) or clean(d.get("ghatna")) or ""
    history = " — ".join(x for x in (clean(d.get("ghatna")), clean(d.get("vivraN"))) if x)
    pooja = "; ".join(x for x in (clean(d.get("anushthan_vidhi")), ("फल: " + d["phal"]) if clean(d.get("phal")) else None) if x)
    return intro, pooja or "", history or None


# ---------------------------------------------------------------- the chaturthis: from the library's own books
# Every chaturthi has its own name and meaning. They are read straight from the books of the app:
#   व्रत परिचय            Sankashti of every month, Siddhivinayaka, Shiva, Rathotsava, Krichchhra, Vara, Manoratha,
#                         the named chaturthis of Magha Shukla, Angaraki, Karaka (Karwa Chauth) ... with the Purana each is from
#   संक्षिप्त श्रीगणेशपुराण   what the Ganesh Purana (Upasana-khanda) says about Sankashti, Angaraki and Bhadrapada Shukla Chaturthi
# (The Ganesh Purana of this edition gives no list of twelve month names for the Sankashti; it gives the vrat, its vidhi and
# its greatness. The names found in व्रत परिचय are used: Vakratunda for Magha Krishna, Karaka for Kartika Krishna.)
BOOK_DIR = ROOT / "Gita Press Books" / "Gita Press Books"
VP_BOOK = BOOK_DIR / "व्रत परिचय.html"
GP_BOOK = BOOK_DIR / "संक्षिप्त श्रीगणेशपुराण.html"
FOOT_REF = re.compile(r"(?<=[ऀ-ॿ])[०-९]+(?=[\s।,;)]|$)|\s?\*")
BRACKET_NUM = re.compile(r"\[[०-९0-9]+\]")


def read_book(path):
    import html as _html
    raw = path.read_text(encoding="utf-8")
    out = []
    for cls, t in re.findall(r'<p[^>]*class="([^"]*)"[^>]*>(.*?)</p>', raw, flags=re.S):
        t = re.sub(r"<br\s*/?>", " ", t)
        t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", _html.unescape(t))).strip()
        out.append((cls, t))
    return out


def clean_book_text(t):
    return re.sub(r"\s+", " ", FOOT_REF.sub("", BRACKET_NUM.sub("", t))).strip()


def vp_items():
    """Every sub-heading of व्रत परिचय with its month, paksha, name, the Purana it is from and its text."""
    items, month, pak, cur = [], None, None, None
    for cls, t in read_book(VP_BOOK):
        if cls == "Heading":
            month, pak, cur = re.sub(r"के व्रत$", "", t), None, None
        elif cls == "Sub-Heading":
            pak, cur = t, None
        elif cls.startswith("Sub-Head-2"):
            cur = {"month": month, "paksh": pak or "", "name": re.sub(r"^\([०-९0-9]+\)\s*", "", t), "source": "", "text": []}
            items.append(cur)
        elif cur is not None and not cls.startswith("Footnote") and cls != "Page-Break":
            if cls in ("Uvaacha", "Description") and not cur["text"] and re.fullmatch(r"\(.*\)", t):
                cur["source"] = t.strip("()")
            elif cls.startswith("Text"):
                cur["text"].append(clean_book_text(t))
    return items


def vp_find(items, month, pak, name):
    for it in items:
        if it["month"] == month and it["paksh"].startswith(pak) and it["name"] == name:
            return it
    raise SystemExit("not found in व्रत परिचय: %s %s %s" % (month, pak, name))


def first_sentences(text, n=240):
    parts = re.split(r"(?<=।)\s+", text)
    out = parts[0]
    for x in parts[1:]:
        if len(out) + len(x) > n:
            break
        out += " " + x
    return out[:n + 80]


def text_fields(it):
    body = "\n".join(it["text"])
    return {"intro": first_sentences(it["text"][0]) if it["text"] else "", "poojaVidhan": body,
            "historicImportance": ("स्रोत: " + it["source"] + " (व्रत परिचय)") if it["source"] else "स्रोत: व्रत परिचय"}


# Ganesh Purana excerpts: (id, chapter heading starts with, [paragraph starts with ...], what it tells)
GP_EXCERPTS = [
    ("GP-46", "छियालीसवाँ अध्याय", ["[गणेशजी कहते हैं—] मूलमन्त्रकी अपेक्षा"], "भाद्रपद शुक्ल चतुर्थी — गणेशजीका जन्म-दिवस", "चतुर्थी", "शुक्लपक्ष", "भाद्रपद"),
    ("GP-50", "पचासवाँ अध्याय", ["हे देवि! इस प्रकार व्रत करनेपर तुम सम्पूर्ण"], "गणेशचतुर्थी (भाद्रपद) का उत्सव एवं रात्रि-जागरण", "चतुर्थी", "शुक्लपक्ष", "भाद्रपद"),
    ("GP-51", "इक्यावनवाँ अध्याय", ["[घर जाकर] शुद्ध आसनपर बैठकर गणेशजीका पूजन"], "श्रावण शुक्ल चतुर्थीसे भाद्रपद शुक्ल चतुर्थीतक पार्थिव गणेश-पूजन", "चतुर्थी", "शुक्लपक्ष", "श्रावण–भाद्रपद"),
    ("GP-58", "अट्ठावनवाँ अध्याय", ["इन्द्र बोले— हे नृपश्रेष्ठ! यदि आपके नगरमें", "तदनन्तर परोक्ष तत्त्वके ज्ञाता भ्रूशुण्डी", "जबकि उस व्रतका मात्र एक दिनका पुण्य"],
     "संकष्टचतुर्थीव्रतकी महिमा — भ्रूशुण्डीके पितरोंका उद्धार", "चतुर्थी", "कृष्णपक्ष", None),
    ("GP-59", "उनसठवाँ अध्याय", ["अज्ञानपूर्वक किये गये संकष्टचतुर्थीव्रतजनित", "ब्रह्माजी बोले— यदि तुम्हारा पुत्र संकष्टचतुर्थी नामक"],
     "अज्ञानपूर्वक किया संकष्टचतुर्थीव्रत भी पापसे मुक्त करता है", "चतुर्थी", "कृष्णपक्ष", None),
    ("GP-60A", "साठवाँ अध्याय", ["इस प्रकार उसने सहस्र वर्षोतक अत्यन्त कठोर तप किया", "त्रैलोक्यमें मेरा नाम कल्याणकारकके रूपमें"],
     "माघ कृष्ण चतुर्थीको चन्द्रोदयपर गणेशजीका दर्शन; चतुर्थी तिथि संकटहारिणी हुई", "चतुर्थी", "कृष्णपक्ष", "माघ"),
    ("GP-60B", "साठवाँ अध्याय", ["[अंगारके सदृश] रक्तवर्णका", "तत्पश्चात् वह भूमिपुत्र स्थावर–जंगमात्मक", "मनमें चिन्तित वस्तु (मनोकामना)"],
     "अंगारकचतुर्थीव्रतकी महिमा — मंगलवारसे युक्त चतुर्थी", "चतुर्थी", "कृष्णपक्ष (मंगलवारसे युक्त)", None),
    ("GP-61", "इकसठवाँ अध्याय", ["गजानन बोले– [हे चन्द्र!] तुम्हारा स्वरूप", "[भाद्रपदमासके] कृष्णपक्षकी चतुर्थी तिथिको", "ब्रह्माजी बोले– तदनन्तर इस प्रकार वर प्राप्त करके"],
     "चन्द्र-दर्शनका नियम: शुक्ल चतुर्थीको निषेध, संकष्टचतुर्थीको चन्द्रोदयपर पूजन; ‘भालचन्द्र’ नामकी स्थापना", "चतुर्थी", "दोनों पक्ष", None),
    ("GP-69", "उनहत्तरवाँ अध्याय", ["ब्रह्माजी बोले– हे राजन्! सुनो, मैं तुमसे सम्पूर्ण", "मौन रहते हुए यथाशक्ति, यथारुचि सात ग्रास"],
     "संकष्टचतुर्थीव्रतकी विधि", "चतुर्थी", "कृष्णपक्ष", None),
    ("GP-70", "सत्तरवाँ अध्याय", ["इस प्रकार चिन्तासे व्याकुल रहते हुए मुझे अनेक वर्ष", "ब्रह्माजी बोले– भगवान् गणेशको प्रसन्न करनेवाले इस"],
     "संकष्टचतुर्थीव्रतकी महिमा — लोमशमुनिका उपदेश, प्रद्युम्नद्वारा अनुष्ठान", "चतुर्थी", "कृष्णपक्ष", None),
]


def gp_rows():
    paras = read_book(GP_BOOK)
    rows = []
    for gid, chap, starts, title, tithi, paksh, maas in GP_EXCERPTS:
        head = None
        picked = {s: None for s in starts}
        for cls, t in paras:
            if cls == "Heading":
                head = t
                continue
            if head and head.startswith(chap):
                for s in starts:
                    if picked[s] is None and t.startswith(s):
                        picked[s] = t
        if any(v is None for v in picked.values()) or head is None:
            raise SystemExit("Ganesh Purana excerpt %s: a paragraph was not found: %s" % (gid, [s for s, v in picked.items() if v is None]))
        chap_head = next(t for c, t in paras if c == "Heading" and t.startswith(chap))
        body = "\n".join(clean_book_text(picked[s]) for s in starts)
        rows.append({"id": gid, "granth": "संक्षिप्त श्रीगणेशपुराण", "skandh_kand": "उपासनाखण्ड", "sarg_adhyay": chap_head, "tithi": tithi, "paksh": paksh,
                     "maas": maas or "अनिर्दिष्ट", "nakshatra": "अनिर्दिष्ट", "muhurta": "अनिर्दिष्ट", "parv_vrat_naam": title, "ghatna": title, "vivraN": body,
                     "mahatva": "", "anushthan_vidhi": "", "phal": "", "tags": ["गणेशपुराण", "चतुर्थी"]})
    return rows


def main():
    vrats = json.loads(VRAT.read_text(encoding="utf-8"))
    dates = json.loads(DATES.read_text(encoding="utf-8"))["data"]
    gems = json.loads(GEM.read_text(encoding="utf-8"))
    by_src = {d["id"]: d for d in dates}
    if len(by_src) != len(dates):
        raise SystemExit("duplicate ids in dates.json")

    entries, links, order = [], set(), 0
    by_slug = {}

    def add(slug, e, srcs):
        nonlocal order
        if slug in by_slug:
            raise SystemExit("duplicate slug " + slug)
        order += 1
        e["slug"] = slug
        e["order"] = order
        for r in e.get("rules", []):
            if slug in AT:
                r["at"] = AT[slug]
        e["sources"] = []
        e.setdefault("extras", [])
        e.setdefault("parent", None)
        for s in srcs:
            if s not in by_src:
                raise SystemExit("unknown dates.json id %s (in %s)" % (s, slug))
            e["sources"].append(s)
            links.add((slug, s))
        by_slug[slug] = e
        entries.append(e)

    def rules_of(maas, tithis, vaar):
        return [{"maas": maas, "tithis": tithis, "vaar": vaar}] if (maas or tithis or vaar is not None) else []

    # 1. the 72 vrats of vrat.json, with the dates.json records merged into them
    for v in vrats:
        r = OLD.get(v["id"])
        if not r:
            raise SystemExit("vrat.json entry %s (%s) has no rule in tools/build_vrat_catalogue.py" % (v["id"], v["vrat_name"]))
        slug, frag, kind, maas, tithis, vaar, pri, icon, kw, srcs = r
        if not v["vrat_name"].startswith(frag):
            raise SystemExit("vrat id %s is %r, expected one starting %r" % (v["id"], v["vrat_name"], frag))
        aliases = []
        if srcs:
            alt = clean(by_src[srcs[0]]["parv_vrat_naam"])
            if alt and not similar(alt, v["vrat_name"]) and (slug.endswith("ekadashi") or slug in ("ram-navami", "dussehra", "janmashtami")):
                aliases.append(alt)
        add(slug, {
            "name": v["vrat_name"], "aliases": aliases, "maas": v.get("maas") or "", "tithi": v.get("tithi") or "", "intro": v.get("intro") or "",
            "poojaVidhan": v.get("pooja_vidhan") or "", "vratKatha": v.get("vrat_katha"), "historicImportance": v.get("historic_importance"),
            "kind": kind, "rules": rules_of(maas, tithis, vaar), "priority": pri, "icon": icon, "keywords": kw
        }, srcs)
    if len(entries) != len(vrats):
        raise SystemExit("not every vrat.json entry was used")

    # 2. entries that exist only in dates.json
    for slug, name, kind, maas, tithis, vaar, pri, icon, kw, srcs in NEW:
        first = by_src[srcs[0]]
        intro, pooja, history = entry_from_source(first)
        tithi_txt = (clean(first["tithi"]) or "")[:70]
        maas_txt = (clean(first["maas"]) or "")[:70]
        add(slug, {
            "name": name, "aliases": [], "maas": maas_txt, "tithi": tithi_txt, "intro": intro, "poojaVidhan": pooja, "vratKatha": None,
            "historicImportance": history, "kind": kind, "rules": rules_of(maas, tithis, vaar), "priority": pri, "icon": icon, "keywords": kw
        }, srcs)

    # 3. episodes of the epics
    for sid in EVENTS:
        d = by_src[sid]
        intro, pooja, history = entry_from_source(d)
        add(sid.lower(), {
            "name": clean(d["parv_vrat_naam"]) or clean(d["ghatna"]) or sid, "aliases": [], "maas": clean(d["maas"]) or "", "tithi": clean(d["tithi"]) or "",
            "intro": intro, "poojaVidhan": pooja, "vratKatha": None, "historicImportance": history, "kind": "event", "rules": [], "priority": 95,
            "icon": "📜", "keywords": []
        }, [sid])

    # 4. the third list: merged into what exists, attached to the vrat that recurs monthly, or entries of their own
    new_from_gem = merged_gem = variants = 0
    unparsed = []
    for g in gems:
        gid = g["id"]
        name = gem_clean(g["vrat_name"])
        if gid in GEM_MERGE:
            tgt = by_slug.get(GEM_MERGE[gid])
            if not tgt:
                raise SystemExit("gem %s merges into unknown slug %s" % (gid, GEM_MERGE[gid]))
            merge_gem(tgt, g, prefer_gem=(GEM_MERGE[gid] == "papamochani-ekadashi"))
            merged_gem += 1
            continue
        t = gem_text(g)
        base = {"name": name, "aliases": [], "maas": gem_clean(g["maas"]) or "", "tithi": gem_clean(g["tithi"]) or "", "keywords": [], "icon": GEM_ICON.get(gid, "🙏")}
        base.update(t)
        slug = devanagari_slug(name)
        if slug in by_slug:
            slug = "%s-%d" % (slug, gid)
        if gid in GEM_VARIANT:
            parent = GEM_VARIANT[gid]
            rule = parse_gem_rule(g)
            base.update({"kind": "variant", "parent": parent, "rules": [rule] if rule else [], "priority": 96})
            add(slug, base, [])
            variants += 1
            continue
        if gid in GEM_REFERENCE:
            base.update({"kind": "reference", "rules": [], "priority": 90})
            add(slug, base, [])
            new_from_gem += 1
            continue
        rules = GEM_RULES.get(gid)
        if rules is None:
            r = parse_gem_rule(g)
            rules = [r] if r else []
            if not r:
                unparsed.append((gid, name, g["maas"], g["tithi"]))
        kind = "reference" if not rules else "tithi" if all(not r["maas"] for r in rules) else "festival"
        base.update({"kind": kind, "rules": rules, "priority": GEM_PRI.get(gid, 38)})
        add(slug, base, [])
        new_from_gem += 1
    if unparsed:
        raise SystemExit("third-list entries whose maas/tithi could not be read -- add them to GEM_RULES:\n" + "\n".join(map(str, unparsed)))

    # 5. the chaturthis, read from the library's own books (see the notes above the helpers)
    vp = vp_items()
    for g in gp_rows():
        dates.append(g)
        by_src[g["id"]] = g

    def link(slug, sid):
        by_slug[slug]["sources"].append(sid)
        links.add((slug, sid))

    def extra_of(it, label="व्रत परिचय के अनुसार"):
        return dict(text_fields(it), label=label, name=it["name"])

    MONTH_SLUG = {"चैत्र": "chaitra", "वैशाख": "vaishakh", "ज्येष्ठ": "jyeshtha", "आषाढ़": "ashadh", "श्रावण": "shravan", "भाद्रपद": "bhadrapad",
                  "आश्विन": "ashwin", "कार्तिक": "kartik", "मार्गशीर्ष": "margashirsha", "पौष": "paush", "माघ": "magh", "फाल्गुन": "phalgun"}
    KATHA = {"भाद्रपद": "इस व्रतकी पूरी कथा ‘व्रत परिचय’ में “(भाद्रपद-कृष्ण) संकष्टचतुर्थीव्रत-कथा” (स्कन्दपुराण) के रूपमें दी गयी है।",
             "माघ": "इस व्रतकी पूरी कथा ‘व्रत परिचय’ में “(माघकृष्ण) संकष्टचतुर्थीव्रत-कथा” (नारदपुराण) के रूपमें दी गयी है।"}
    # 5a. the Sankashti of each month (Chaitra and Jyeshtha came with the third list)
    for month, nm in [("वैशाख", "संकष्टचतुर्थी"), ("आषाढ़", "संकष्टचतुर्थीव्रत"), ("श्रावण", "संकष्टचतुर्थी"), ("भाद्रपद", "संकष्टचतुर्थी"),
                      ("आश्विन", "संकष्टचतुर्थी"), ("कार्तिक", "करकचतुर्थी (करवाचौथ)"), ("मार्गशीर्ष", "संकष्टचतुर्थीव्रत"), ("पौष", "संकष्टचतुर्थी"),
                      ("माघ", "वक्रतुण्डचतुर्थी"), ("फाल्गुन", "संकष्टचतुर्थी")]:
        it = vp_find(vp, month, "कृष्ण", nm)
        f = text_fields(it)
        if month == "माघ":
            f["poojaVidhan"] += "\n" + "\n".join(vp_find(vp, month, "कृष्ण", "संकष्टचतुर्थी")["text"])
        label = {"माघ": "वक्रतुण्ड चतुर्थी", "कार्तिक": "करक चतुर्थी (करवा चौथ)"}.get(month, "संकष्टचतुर्थी")
        base = {"name": "%s — %s कृष्ण" % (label, month), "aliases": [], "maas": month, "tithi": "चतुर्थी (कृष्ण पक्ष)", "vratKatha": KATHA.get(month),
                "kind": "variant", "parent": "sankashti-chaturthi", "rules": [R([month], ["K:4"])], "priority": 96, "icon": "🐘", "keywords": []}
        base.update(f)
        add("sankashti-" + MONTH_SLUG[month], base, [])
    for sid in ("GP-58", "GP-59", "GP-60A", "GP-61", "GP-69", "GP-70"):
        link("sankashti-chaturthi", sid)

    # 5b. chaturthis with a name of their own
    def chaturthi(slug, name, month, pak, items, pri=24, tag="चतुर्थी (शुक्ल पक्ष)", extras=(), kw=("गणेश",)):
        it = vp_find(vp, month, pak, items[0])
        e = {"name": name, "aliases": [], "maas": month, "tithi": tag, "vratKatha": None, "kind": "festival", "rules": [R([month], ["S:4" if pak == "शुक्ल" else "K:4"])],
             "priority": pri, "icon": "🐘", "keywords": list(kw), "extras": [extra_of(vp_find(vp, month, pak, n)) for n in extras]}
        e.update(text_fields(it))
        add(slug, e, [])

    chaturthi("durva-ganapati", "दूर्वागणपति व्रत (श्रावण शुक्ल चतुर्थी)", "श्रावण", "शुक्ल", ["दूर्वागणपति"])
    chaturthi("rathotsav-chaturthi", "रथोत्सव चतुर्थी (आश्विन शुक्ल चतुर्थी)", "आश्विन", "शुक्ल", ["रथोत्सवचतुर्थी"], kw=("दुर्गा", "देवी"))
    chaturthi("krichchhra-chaturthi", "कृच्छ्रचतुर्थी (मार्गशीर्ष शुक्ल चतुर्थी, चार वर्षका व्रत)", "मार्गशीर्ष", "शुक्ल", ["कृच्छ्रचतुर्थी"], extras=["वरचतुर्थी"])
    chaturthi("manorath-chaturthi", "मनोरथ चतुर्थी (फाल्गुन शुक्ल चतुर्थी)", "फाल्गुन", "शुक्ल", ["मनोरथचतुर्थी"])
    chaturthi("magha-shukla-chaturthi", "माघ शुक्ल चतुर्थी — गणेशव्रत, वरदा, कुण्ड, शान्ति एवं सुख चतुर्थी", "माघ", "शुक्ल", ["गणेशव्रत"], pri=10,
              extras=["वरदा चतुर्थी", "कुण्डचतुर्थी", "शान्तिचतुर्थी", "सुखचतुर्थी"])
    # Angaraki: a chaturthi that falls on a Tuesday -- "as much merit as a year of Sankashti" (Ganesh Purana, adhyay 60)
    ang = vp_find(vp, "माघ", "शुक्ल", "अंगारकचतुर्थी")
    e = {"name": "अंगारक चतुर्थी (मंगलवारसे युक्त चतुर्थी)", "aliases": ["अंगारकचतुर्थी"], "maas": "प्रत्येक मास", "tithi": "चतुर्थी, मंगलवारके दिन", "vratKatha": None,
         "kind": "tithi", "rules": [dict(R([], ["K:4"], 2), at="moonrise"), R([], ["S:4"], 2)], "priority": 9, "icon": "🐘", "keywords": ["गणेश"]}
    e.update(text_fields(ang))
    e["intro"] = ("श्रीगणेशपुराणके अनुसार मंगलवारसे युक्त चतुर्थीका नाम अंगारकचतुर्थी है; इसका व्रत करनेसे पूरे वर्षके संकष्टचतुर्थीव्रतके समान पुण्य "
                  "मिलता है और सब कार्योंमें निर्विघ्नता होती है।")
    add("angaraki-chaturthi", e, [])
    link("angaraki-chaturthi", "GP-60B")
    # Bhadrapada Shukla Chaturthi: the day Ganesh was born -- the Siddhivinayaka vrat
    sidh = vp_find(vp, "भाद्रपद", "शुक्ल", "सिद्धिविनायकव्रत")
    gc = by_slug["ganesh-chaturthi"]
    gc.update(text_fields(sidh))
    gc["aliases"] = ["सिद्धिविनायक व्रत", "शिवा चतुर्थी"]
    gc["extras"].append(extra_of(vp_find(vp, "भाद्रपद", "शुक्ल", "शिवाचतुर्थी")))
    for sid in ("GP-46", "GP-50", "GP-51"):
        link("ganesh-chaturthi", sid)
    # Karwa Chauth: the Karaka chaturthi of Kartika Krishna, with its Purana text
    by_slug["karva-chauth"]["extras"].append(extra_of(vp_find(vp, "कार्तिक", "कृष्ण", "करकचतुर्थी (करवाचौथ)")))

    # every dates.json record must have found a home
    linked = {s for _, s in links}
    missing = [d["id"] for d in dates if d["id"] not in linked]
    if missing:
        raise SystemExit("dates.json records not assigned to any entry: " + ", ".join(missing))

    sources = [source_row(d) for d in dates]
    OUT.write_text(json.dumps({"version": 2, "vrats": entries, "sources": sources, "links": sorted(links)}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    kinds = {}
    for e in entries:
        kinds[e["kind"]] = kinds.get(e["kind"], 0) + 1
    print("entries:", len(entries), kinds)
    print("vrat.json: %d | dates.json: %d records (%d merged into vrats, %d entries of their own) | third list: %d (%d merged, %d month-variants, %d new)" % (
        len(vrats), len(dates), len(linked), len(NEW) + len(EVENTS), len(gems), merged_gem, variants, new_from_gem))
    print("written", OUT, OUT.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
