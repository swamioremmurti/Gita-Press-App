/* वाङ्मय — the scripture explorer.

   A curated tree of the Sanatana tradition's literature: nine branches (Śruti, Vedāṅga, Upavedas,
   Itihāsa, Purāṇas, Dharmaśāstra, Darśanas, Āgamas & Tantras, Other Śāstras), each split into
   groups, each group listing its texts. It is a classification catalogue, not a list of what the
   library holds: every text is shown, and the ones that exist in this library link straight to
   the book viewer (/book/<slug>); the rest are marked "not in the library yet".

   A text is  [roman title, Devanagari title, library file]  -- the file is the book's file name
   without ".html" (a unique prefix is enough); leave it out when the library has no such book.
   Matching ignores zero-width joiners, so the printed spelling of a file name need not be exact.

   Public API: window.SwadhyayVangmay.pageHtml(ctx), .mount(ctx)
   ctx = { tx, books (the library's book objects), bookPath(book), coverEl(book, size), esc(s) }   */
(function () {
  "use strict";

  var TREE = [
    { k: "shruti", ic: "ॐ", r: "Śruti", d: "श्रुति",
      hi: "प्रकट शास्त्र — वेद, ब्राह्मण, आरण्यक और उपनिषद्", en: "The revealed scriptures",
      groups: [
        { r: "Ṛgveda", d: "ऋग्वेद", t: [
          ["Ṛgveda Saṃhitā", "ऋग्वेद संहिता", "ऋग्वेद"],
          ["Aitareya Brāhmaṇa", "ऐतरेय ब्राह्मण"], ["Kauṣītaki Brāhmaṇa", "कौषीतकि ब्राह्मण"],
          ["Aitareya Āraṇyaka", "ऐतरेय आरण्यक"], ["Kauṣītaki Āraṇyaka", "कौषीतकि आरण्यक"],
          ["Aitareya Upaniṣad", "ऐतरेय उपनिषद्", "ऐतरेयोपनिषद्"], ["Kauṣītaki Upaniṣad", "कौषीतकि उपनिषद्", "कौषीतकिब्राह्मणोपनिषत्"] ] },
        { r: "Sāmaveda", d: "सामवेद", t: [
          ["Sāmaveda Saṃhitā", "सामवेद संहिता", "सामवेद"],
          ["Pañcaviṃśa Brāhmaṇa", "पञ्चविंश ब्राह्मण"], ["Ṣaḍviṃśa Brāhmaṇa", "षड्विंश ब्राह्मण"],
          ["Jaiminīya Brāhmaṇa", "जैमिनीय ब्राह्मण"], ["Chāndogya Upaniṣad", "छान्दोग्य उपनिषद्"],
          ["Kena Upaniṣad", "केन उपनिषद्", "केनोपनिषद्"] ] },
        { r: "Śukla Yajurveda", d: "शुक्ल यजुर्वेद", t: [
          ["Vājasaneyi Saṃhitā", "वाजसनेयि संहिता", "यजुर्वेद"], ["Śatapatha Brāhmaṇa", "शतपथ ब्राह्मण"],
          ["Bṛhadāraṇyaka Upaniṣad", "बृहदारण्यक उपनिषद्", "u_बृहदारण्यकोपनिषत्"],
          ["Īśā Upaniṣad", "ईशा उपनिषद्", "ईशावास्योपनिषद्"] ] },
        { r: "Kṛṣṇa Yajurveda", d: "कृष्ण यजुर्वेद", t: [
          ["Taittirīya Saṃhitā", "तैत्तिरीय संहिता"], ["Taittirīya Brāhmaṇa", "तैत्तिरीय ब्राह्मण"],
          ["Taittirīya Āraṇyaka", "तैत्तिरीय आरण्यक"], ["Taittirīya Upaniṣad", "तैत्तिरीय उपनिषद्", "तैत्तिरीयोपनिषद्"],
          ["Kaṭha Upaniṣad", "कठ उपनिषद्", "कठोपनिषद्"],
          ["Śvetāśvatara Upaniṣad", "श्वेताश्वतर उपनिषद्", "श्वेताश्वतरोपनिषद्"],
          ["Maitrī Upaniṣad", "मैत्री उपनिषद्"] ] },
        { r: "Atharvaveda", d: "अथर्ववेद", t: [
          ["Atharvaveda Saṃhitā", "अथर्ववेद संहिता", "अथर्ववेद"], ["Gopatha Brāhmaṇa", "गोपथ ब्राह्मण"],
          ["Muṇḍaka Upaniṣad", "मुण्डक उपनिषद्", "मुण्डकोपनिषद्"],
          ["Māṇḍūkya Upaniṣad", "माण्डूक्य उपनिषद्", "माण्डूक्योपनिषद्"],
          ["Praśna Upaniṣad", "प्रश्न उपनिषद्", "प्रश्नोपनिषद्"] ] },
        { r: "Upaniṣad collections", d: "उपनिषद् संग्रह", t: [
          ["Fourteen Gems of the Upaniṣads", "उपनिषदों के चौदह रत्न", "उपनिषदों के चौदह रत्न"],
          ["Atharvaśikhā Upaniṣad", "अथर्वशिखा उपनिषद्", "अथर्वशिखोपनिषत्"],
          ["Pañcadeva Atharvaśīrṣa Saṅgraha", "पंचदेव अथर्वशीर्ष संग्रह", "पंचदेव अथर्वशीर्ष संग्रह"] ] }
      ] },

    { k: "vedanga", ic: "\u{1F4DC}", r: "Vedāṅga", d: "वेदाङ्ग",
      hi: "वेदों के छह सहायक शास्त्र", en: "Six auxiliary disciplines of the Vedas",
      groups: [
        { r: "Śikṣā · Prātiśākhyas", d: "शिक्षा · प्रातिशाख्य", t: [
          ["Ṛgveda Prātiśākhya (47 letters)", "ऋग्वेद प्रातिशाख्य (४७ वर्ण)"],
          ["Śukla Yajurveda Prātiśākhya (65 letters)", "शुक्ल यजुर्वेद प्रातिशाख्य (६५ वर्ण)"],
          ["Taittirīya Prātiśākhya (Kṛṣṇa Yajurveda; 52 letters)", "तैत्तिरीय प्रातिशाख्य (कृष्ण यजुर्वेद; ५२ वर्ण)"],
          ["Atharvaveda Prātiśākhya (Śaunakīya śākhā)", "अथर्ववेद प्रातिशाख्य (शौनकीय शाखा)"],
          ["Ṛktantra (Sāmaveda Prātiśākhya; 57 letters)", "ऋक्तन्त्र (सामवेद प्रातिशाख्य; ५७ वर्ण)"],
          ["Puṣpasūtra (second Sāmaveda Prātiśākhya)", "पुष्पसूत्र (सामवेद का द्वितीय प्रातिशाख्य)"] ] },
        { r: "Śikṣā · General treatises", d: "शिक्षा · सामान्य शास्त्रीय ग्रन्थ", t: [
          ["Pāṇinīya Śikṣā", "पाणिनीय शिक्षा", "पाणिनीयशिक्षा"],
          ["Pāṇinīya Śikṣā — versified version", "पाणिनीय शिक्षा — पद्यात्मक पाठ"],
          ["Pāṇinīya Śikṣā — sūtra form", "पाणिनीय शिक्षा — सूत्ररूप पाठ"],
          ["Pāṇinīya Śikṣā — accented version", "पाणिनीय शिक्षा — सस्वर (स्वराङ्कित) पाठ"],
          ["Āpiśali Śikṣā (sūtra form)", "आपिशलि शिक्षा (सूत्ररूप)"],
          ["Candra Śikṣā (Candragomin, sūtra form)", "चन्द्र शिक्षा (चन्द्रगोमिन्, सूत्ररूप)"],
          ["Vyāli Śikṣā", "व्यालि शिक्षा"],
          ["Śambhu Śikṣā", "शम्भु शिक्षा"],
          ["Siddhānta Śikṣā", "सिद्धान्त शिक्षा"],
          ["Pārī Śikṣā", "पारी शिक्षा"],
          ["Sarvasammata Śikṣā", "सर्वसम्मत शिक्षा"],
          ["Prātiśākhyapradīpa Śikṣā", "प्रातिशाख्यप्रदीप शिक्षा"],
          ["Śikṣāsaṅgraha (compendium)", "शिक्षासंग्रह (संकलन)"] ] },
        { r: "Śikṣā · Sāmaveda-related", d: "शिक्षा · सामवेद-सम्बद्ध", t: [
          ["Nāradīya Śikṣā", "नारदीय शिक्षा", "नारदीयशिक्षा"],
          ["Lomaśī Śikṣā", "लोमशी शिक्षा", "सामवेदीया लोमशी शिक्षा"],
          ["Gautama Śikṣā", "गौतम शिक्षा"] ] },
        { r: "Śikṣā · Śukla Yajurveda-related", d: "शिक्षा · शुक्ल यजुर्वेद-सम्बद्ध", t: [
          ["Yājñavalkya Śikṣā (Vājasaneyī / Traisvarya-lakṣaṇa)", "याज्ञवल्क्य शिक्षा (वाजसनेयी / त्रैस्वर्यलक्षण)"],
          ["Kātyāyanī Śikṣā", "कात्यायनी शिक्षा"],
          ["Mādhyandina Śikṣā", "माध्यन्दिन शिक्षा"] ] },
        { r: "Śikṣā · Kṛṣṇa Yajurveda-related", d: "शिक्षा · कृष्ण यजुर्वेद-सम्बद्ध", t: [
          ["Vyāsa Śikṣā", "व्यास शिक्षा"],
          ["Bhāradvāja Śikṣā", "भारद्वाज शिक्षा"],
          ["Cārāyaṇīya Śikṣā", "चारायणीय शिक्षा"],
          ["Śaiśirīya Śikṣā", "शैशिरीय शिक्षा"] ] },
        { r: "Śikṣā · Atharvaveda-related", d: "शिक्षा · अथर्ववेद-सम्बद्ध", t: [
          ["Māṇḍūkī Śikṣā", "माण्डूकी शिक्षा"],
          ["Māṇḍavya Śikṣā", "माण्डव्य शिक्षा"] ] },
        { r: "Śikṣā · Attributed to ṛṣis and authors", d: "शिक्षा · ऋषि-लेखक-नामांकित", t: [
          ["Amoghānandinī Śikṣā", "अमोघानन्दिनी शिक्षा"],
          ["Laghvamoghānandinī Śikṣā", "लघ्वमोघानन्दिनी शिक्षा"],
          ["Ātreya Śikṣā", "आत्रेय शिक्षा"],
          ["Kauṇḍinya Śikṣā", "कौण्डिन्य शिक्षा"],
          ["Keśavī Śikṣā", "केशवी शिक्षा"],
          ["Padyātmikā Keśavī Śikṣā", "पद्यात्मिका केशवी शिक्षा"],
          ["Lakṣmīkānta Śikṣā", "लक्ष्मीकान्त शिक्षा"],
          ["Mallaśarmakṛta Śikṣā", "मल्लशर्मकृत शिक्षा"],
          ["Pārāśarī Śikṣā", "पाराशरी शिक्षा"],
          ["Vāsiṣṭhī (Vasiṣṭha) Śikṣā", "वासिष्ठी (वसिष्ठ) शिक्षा"] ] },
        { r: "Śikṣā · Recitation & sequence (krama, pada)", d: "शिक्षा · पाठक्रम (क्रम और पद)", t: [
          ["Āraṇya Śikṣā", "आरण्य शिक्षा"],
          ["Kramakārikā Śikṣā", "क्रमकारिका शिक्षा"],
          ["Kramasandhāna Śikṣā", "क्रमसन्धान शिक्षा"] ] },
        { r: "Śikṣā · Accents & vowels (svara)", d: "शिक्षा · स्वर", t: [
          ["Svarāṅkuśa Śikṣā", "स्वराङ्कुश शिक्षा"],
          ["Svarāṣṭaka Śikṣā", "स्वराष्टक शिक्षा"],
          ["Svaravyañjana Śikṣā", "स्वरव्यञ्जन शिक्षा"] ] },
        { r: "Śikṣā · Articulation, pause & letters", d: "शिक्षा · उच्चारण, विराम और वर्ण", t: [
          ["Avasānanirṇaya Śikṣā", "अवसाननिर्णय शिक्षा"],
          ["Kālanirṇaya Śikṣā", "कालनिर्णय शिक्षा"],
          ["Mānasvāra Śikṣā", "मानस्वार शिक्षा"],
          ["Śamāna Śikṣā", "शमान शिक्षा"],
          ["Ṣoḍaśaślokī Śikṣā", "षोडशश्लोकी शिक्षा"],
          ["Varṇaratnapradīpa Śikṣā", "वर्णरत्नप्रदीप शिक्षा"] ] },
        { r: "Kalpa (ritual)", d: "कल्प", t: [
          ["Āśvalāyana Śrautasūtra", "आश्वलायन श्रौतसूत्र"], ["Āpastamba Śrautasūtra", "आपस्तम्ब श्रौतसूत्र"],
          ["Pāraskara Gṛhyasūtra", "पारस्कर गृह्यसूत्र"], ["Śulbasūtra", "शुल्बसूत्र"] ] },
        { r: "Vyākaraṇa (grammar)", d: "व्याकरण", t: [
          ["Aṣṭādhyāyī", "अष्टाध्यायी"], ["Mahābhāṣya", "महाभाष्य"], ["Vākyapadīya", "वाक्यपदीय"],
          ["Siddhāntakaumudī", "सिद्धान्तकौमुदी"] ] },
        { r: "Nirukta (etymology)", d: "निरुक्त", t: [
          ["Nirukta", "निरुक्त"], ["Nighaṇṭu", "निघण्टु"] ] },
        { r: "Chandas (metre)", d: "छन्द", t: [
          ["Chandaḥśāstra", "छन्दःशास्त्र"], ["Vṛttaratnākara", "वृत्तरत्नाकर"] ] },
        { r: "Jyotiṣa (astronomy)", d: "ज्योतिष", t: [
          ["Vedāṅga Jyotiṣa", "वेदाङ्ग ज्योतिष"], ["Sūryasiddhānta", "सूर्यसिद्धान्त"],
          ["Bṛhatsaṃhitā", "बृहत्संहिता"], ["Bṛhat Parāśara Horāśāstra", "बृहत्पाराशर होराशास्त्र"] ] }
      ] },

    { k: "upaveda", ic: "\u{1F33F}", r: "Upavedas", d: "उपवेद",
      hi: "व्यावहारिक ज्ञान की परम्पराएँ", en: "Applied knowledge traditions",
      groups: [
        { r: "Āyurveda (medicine)", d: "आयुर्वेद", t: [
          ["Caraka Saṃhitā", "चरक संहिता"], ["Suśruta Saṃhitā", "सुश्रुत संहिता"],
          ["Aṣṭāṅga Hṛdaya", "अष्टाङ्गहृदय"], ["Bhāvaprakāśa", "भावप्रकाश"] ] },
        { r: "Dhanurveda (warfare)", d: "धनुर्वेद", t: [
          ["Dhanurveda Saṃhitā", "धनुर्वेद संहिता"], ["Vasiṣṭha Dhanurveda", "वसिष्ठ धनुर्वेद"] ] },
        { r: "Gāndharvaveda (music & arts)", d: "गान्धर्ववेद", t: [
          ["Nāṭyaśāstra", "नाट्यशास्त्र"], ["Saṅgīta Ratnākara", "सङ्गीतरत्नाकर"], ["Dattilam", "दत्तिलम्"] ] },
        { r: "Sthāpatyaveda (architecture)", d: "स्थापत्यवेद", t: [
          ["Mayamata", "मयमत"], ["Mānasāra", "मानसार"], ["Vāstu Śāstra", "वास्तुशास्त्र"] ] }
      ] },

    { k: "itihasa", ic: "\u{1F3F9}", r: "Itihāsa", d: "इतिहास",
      hi: "दो महान् इतिहास-ग्रन्थ और उनसे जुड़े ग्रन्थ", en: "The two great epics",
      groups: [
        { r: "Rāmāyaṇa", d: "रामायण", t: [
          ["Vālmīki Rāmāyaṇa", "श्रीमद्वाल्मीकीय रामायण", "श्रीमद्वाल्मीकीय रामायण"],
          ["Adhyātma Rāmāyaṇa", "अध्यात्म रामायण", "अध्यात्मरामायण"],
          ["Rāmacaritamānasa", "रामचरितमानस", "श्रीरामचरितमानस"],
          ["Yoga Vāsiṣṭha", "योगवासिष्ठ", "संक्षिप्त योगवासिष्ठ"],
          ["Rāma Gītā", "श्रीराम गीता", "श्रीरामगीता"],
          ["Ānanda Rāmāyaṇa", "आनन्द रामायण"], ["Adbhuta Rāmāyaṇa", "अद्भुत रामायण"] ] },
        { r: "Mahābhārata", d: "महाभारत", t: [
          ["Mahābhārata (abridged)", "संक्षिप्त महाभारत", "संक्षिप्त महाभारत"],
          ["Mahābhārata (Ādi to Svargārohaṇa Parva)", "महाभारत (आदिपर्व से स्वर्गारोहणपर्व)", "महाभारत (आदिपर्व"],
          ["Harivaṃśa", "हरिवंश", "श्रीहरिवंशपुराण"],
          ["Jaiminīya Aśvamedha Parva", "जैमिनीय अश्वमेधपर्व", "श्रीजैमिनीयाश्वमेधपर्व"],
          ["Vidura Nīti", "विदुरनीति", "विदुरनीति"],
          ["Pāṇḍava Gītā", "पाण्डवगीता", "पाण्डवगीता"],
          ["Anugītā", "अनुगीता"], ["Sanatsujātīya", "सनत्सुजातीय"] ] },
        { r: "Bhagavad Gītā (Mahābhārata, Bhīṣma Parva)", d: "श्रीमद्भगवद्गीता", t: [
          ["Gītā — Sādhaka Sañjīvanī", "गीता — साधक-संजीवनी", "श्रीमद्भगवद्गीता_साधक_संजीवनी"],
          ["Gītā — Tattvavivecanī (Hindi commentary)", "गीता — तत्त्वविवेचनी (हिन्दी टीका)", "श्रीमद्भगवद्गीता_तत्त्वविवेचनी हिन्दी"],
          ["Gītā — Tattvavivecanī (padaccheda, anvaya)", "गीता — तत्त्वविवेचनी (पदच्छेद-अन्वय)", "श्रीमद्भगवद्गीता_तत्त्वविवेचनी पदच्छेद"],
          ["Gītā — Śāṅkara Bhāṣya", "गीता — शांकरभाष्य", "श्रीमद्भगवद्गीता शांकरभाष्य"],
          ["Gītā — Rāmānuja Bhāṣya", "गीता — रामानुजभाष्य", "श्रीमद्भगवद्गीता श्रीरामानुज भाष्य"],
          ["Gītā with Māhātmya", "गीता — माहात्म्यसहित", "श्रीमद्भगवद्गीता - माहात्म्यसहित"],
          ["Gītā (large print)", "गीता — मोटे अक्षरों में", "श्रीमद्भगवद्गीता_मोटे_अक्षरोंमें"] ] }
      ] },

    { k: "purana", ic: "\u{1F3DB}️", r: "Purāṇas", d: "पुराण",
      hi: "सृष्टि-विद्या, वंश, आख्यान और पवित्र इतिहास", en: "Traditional cosmology, narratives and sacred histories",
      groups: [
        { r: "Mahāpurāṇas", d: "महापुराण", t: [
          ["Brahma Purāṇa", "ब्रह्मपुराण", "संक्षिप्त ब्रह्मपुराण"], ["Padma Purāṇa", "पद्मपुराण", "संक्षिप्त पद्मपुराण"],
          ["Viṣṇu Purāṇa", "विष्णुपुराण", "श्रीविष्णुपुराण"], ["Śiva Purāṇa", "शिवपुराण", "संक्षिप्त शिवपुराण"],
          ["Bhāgavata Purāṇa", "श्रीमद्भागवतमहापुराण", "श्रीमद्भागवतमहापुराण"],
          ["Nārada Purāṇa", "नारदपुराण", "संक्षिप्त नारदपुराण"], ["Mārkaṇḍeya Purāṇa", "मार्कण्डेयपुराण", "संक्षिप्त मार्कण्डेयपुराण"],
          ["Agni Purāṇa", "अग्निपुराण", "अग्निपुराण"], ["Bhaviṣya Purāṇa", "भविष्यपुराण"],
          ["Brahmavaivarta Purāṇa", "ब्रह्मवैवर्तपुराण", "संक्षिप्त ब्रह्मवैवर्तपुराण"],
          ["Liṅga Purāṇa", "लिङ्गपुराण", "श्रीलिङ्ग-महापुराण"], ["Varāha Purāṇa", "वराहपुराण", "संक्षिप्त श्रीवराहपुराण"],
          ["Skanda Purāṇa", "स्कन्दपुराण", "संक्षिप्त स्कन्दपुराण"], ["Vāmana Purāṇa", "वामनपुराण", "श्रीवामनपुराण"],
          ["Kūrma Purāṇa", "कूर्मपुराण", "संक्षिप्त कूर्मपुराण"], ["Matsya Purāṇa", "मत्स्यपुराण", "मत्स्यमहापुराण"],
          ["Garuḍa Purāṇa", "गरुडपुराण", "संक्षिप्त गरुडपुराण"], ["Brahmāṇḍa Purāṇa", "ब्रह्माण्डपुराण"] ] },
        { r: "Upapurāṇas & allied texts", d: "उपपुराण एवं सम्बद्ध ग्रन्थ", t: [
          ["Devī Bhāgavata (abridged)", "देवीभागवत (संक्षिप्त)", "संक्षिप्त श्रीमद्देवीभागवत"],
          ["Devī Bhāgavata Mahāpurāṇa", "श्रीमद्देवीभागवतमहापुराण", "श्रीमद्देवीभागवतमहापुराण"],
          ["Gaṇeśa Purāṇa", "गणेशपुराण", "संक्षिप्त श्रीगणेशपुराण"], ["Narasiṃha Purāṇa", "नरसिंहपुराण", "श्रीनरसिंहपुराण"],
          ["Garga Saṃhitā", "गर्ग संहिता", "श्री गर्ग संहिता"],
          ["Garuḍa Purāṇa Sāroddhāra", "गरुडपुराण सारोद्धार", "गरुडपुराण-सारोद्धार"],
          ["Nārāyaṇīyam", "नारायणीयम्", "श्रीनारायणीयम्"] ] }
      ] },

    { k: "dharma", ic: "⚖️", r: "Dharmaśāstra", d: "धर्मशास्त्र",
      hi: "धर्म, आचार, विधि और सामाजिक कर्तव्य", en: "Dharma, conduct, law and social duties",
      groups: [
        { r: "Smṛtis", d: "स्मृति", t: [
          ["Manusmṛti", "मनुस्मृति"], ["Yājñavalkya Smṛti", "याज्ञवल्क्य स्मृति"],
          ["Parāśara Smṛti", "पराशर स्मृति"], ["Nārada Smṛti", "नारद स्मृति"], ["Viṣṇu Smṛti", "विष्णुस्मृति"] ] },
        { r: "Nīti & conduct", d: "नीति एवं आचार", t: [
          ["Vidura Nīti", "विदुरनीति", "विदुरनीति"], ["Cāṇakya Nīti", "चाणक्य नीति", "चाणक्य नीति"] ] },
        { r: "Saṃskāra & karmakāṇḍa", d: "संस्कार एवं कर्मकाण्ड", t: [
          ["Nityakarma Prayoga", "नित्यकर्म-प्रयोग", "नित्यकर्म-प्रयोग"],
          ["Sandhyā & Gāyatrī", "सन्ध्या, सन्ध्या-गायत्री", "सन्ध्या, सन्ध्या गायत्री"],
          ["Antyakarma Śrāddhaprakāśa", "अन्त्यकर्म श्राद्धप्रकाश", "अन्त्यकर्म श्राद्धप्रकाश"],
          ["Gayā Śrāddha Paddhati", "गयाश्राद्ध-पद्धति", "गयाश्राद्धपद्धति"],
          ["Tripiṇḍī Śrāddha Paddhati", "त्रिपिण्डी श्राद्ध-पद्धति", "त्रिपिण्डीश्राद्धपद्धति"] ] },
        { r: "Strī dharma", d: "स्त्री-धर्म", t: [
          ["Nārī Dharma in Indian culture and the Śāstras", "भारतीय संस्कृति तथा शास्त्रों में नारी धर्म", "भारतीय संस्कृति तथा शास्त्रों में नारी धर्म"],
          ["Duties for women", "स्त्रियों के लिये कर्तव्य शिक्षा", "स्त्रियों के लिये कर्तव्य शिक्षा"] ] }
      ] },

    { k: "darshana", ic: "\u{1F9D8}", r: "Darśanas", d: "दर्शन",
      hi: "छह शास्त्रीय दार्शनिक प्रणालियाँ", en: "Six classical philosophical systems",
      groups: [
        { r: "Nyāya", d: "न्याय", t: [
          ["Nyāya Sūtra", "न्यायसूत्र"], ["Nyāya Bhāṣya", "न्यायभाष्य"], ["Tarkasaṅgraha", "तर्कसंग्रह"] ] },
        { r: "Vaiśeṣika", d: "वैशेषिक", t: [
          ["Vaiśeṣika Sūtra", "वैशेषिक सूत्र"], ["Praśastapāda Bhāṣya", "प्रशस्तपादभाष्य"] ] },
        { r: "Sāṅkhya", d: "सांख्य", t: [
          ["Sāṅkhya Kārikā", "सांख्यकारिका"], ["Sāṅkhya Sūtra", "सांख्यसूत्र"], ["Tattvakaumudī", "तत्त्वकौमुदी"] ] },
        { r: "Yoga", d: "योग", t: [
          ["Pātañjala Yogadarśana", "पातञ्जल योगदर्शन", "पातञ्जलयोगदर्शन"],
          ["Yoga-darśana", "योग-दर्शन", "योग-दर्शन"],
          ["Pātañjala Yogapradīpa", "पातञ्जल योगप्रदीप", "पातञ्जलयोगप्रदीप"],
          ["Haṭhayogapradīpikā", "हठयोगप्रदीपिका"] ] },
        { r: "Mīmāṃsā", d: "मीमांसा", t: [
          ["Mīmāṃsā Sūtra", "मीमांसा सूत्र"], ["Śābara Bhāṣya", "शाबरभाष्य"] ] },
        { r: "Vedānta", d: "वेदान्त", t: [
          ["Brahmasūtra (Vedānta-darśana)", "वेदान्त-दर्शन (ब्रह्मसूत्र)", "वेदान्त-दर्शन (ब्रह्मसूत्र)"],
          ["Vivekacūḍāmaṇi", "विवेकचूडामणि", "विवेक चूडामणि"],
          ["Aparokṣānubhūti", "अपरोक्षानुभूति", "श्रीआद्यशंकराचार्यविरचित अपरोक्षानुभूति"],
          ["Aṣṭāvakra Gītā", "अष्टावक्रगीता", "अष्टावक्रगीता"],
          ["Pañcadaśī", "पञ्चदशी"] ] }
      ] },

    { k: "agama", ic: "\u{1F531}", r: "Āgamas & Tantras", d: "आगम एवं तन्त्र",
      hi: "मन्दिर-पूजा, कर्मकाण्ड और साधना की परम्पराएँ", en: "Temple worship, ritual and spiritual practices",
      groups: [
        { r: "Śaiva Āgamas & worship", d: "शैव आगम एवं उपासना", t: [
          ["Kāmikāgama", "कामिकागम"], ["Suprabhedāgama", "सुप्रभेदागम"], ["Mṛgendrāgama", "मृगेन्द्रागम"],
          ["Śiva Stotra Ratnākara", "शिव स्तोत्र रत्नाकर", "शिव स्तोत्र रत्नाकर"],
          ["Amogha Śiva Kavaca", "अमोघ शिवकवच", "अमोघ शिवकवच"],
          ["Śiva Sahasranāma", "शिवसहस्रनाम", "श्रीशिवसहस्रनामस्तोत्रम्"],
          ["Rudrāṣṭādhyāyī", "रुद्राष्टाध्यायी", "रुद्राष्टाध्यायी"] ] },
        { r: "Vaiṣṇava Āgamas (Pāñcarātra)", d: "वैष्णव आगम (पाञ्चरात्र)", t: [
          ["Īśvara Saṃhitā", "ईश्वरसंहिता"], ["Pādma Saṃhitā", "पाद्मसंहिता"], ["Lakṣmī Tantra", "लक्ष्मीतन्त्र"],
          ["Nārāyaṇa Kavaca", "नारायण कवच", "श्रीनारायणकवच"],
          ["Viṣṇu Sahasranāma", "विष्णुसहस्रनाम", "श्रीविष्णुसहस्रनामस्तोत्रम्"] ] },
        { r: "Śākta Āgamas & Tantras", d: "शाक्त आगम एवं तन्त्र", t: [
          ["Durgā Saptaśatī", "दुर्गासप्तशती", "श्रीदुर्गासप्तशती"],
          ["Devī Stotra Ratnākara", "देवीस्तोत्ररत्नाकर", "देवीस्तोत्ररत्नाकर"],
          ["Lalitā Sahasranāma", "ललितासहस्रनाम", "श्रीललितासहस्रनामस्तोत्रम्"],
          ["Kulārṇava Tantra", "कुलार्णवतन्त्र"], ["Mahānirvāṇa Tantra", "महानिर्वाणतन्त्र"] ] }
      ] },

    { k: "other", ic: "\u{1F4DA}", r: "Other Śāstras & Literature", d: "अन्य शास्त्र एवं साहित्य",
      hi: "विशिष्ट ज्ञान, नीति और भक्ति-साहित्य", en: "Specialized knowledge and devotional literature",
      groups: [
        { r: "Nīti literature", d: "नीति-साहित्य", t: [
          ["Cāṇakya Nīti", "चाणक्य नीति", "चाणक्य नीति"], ["Nītiśataka", "नीतिशतक", "नीतिशतकं"],
          ["Hitopadeśa", "हितोपदेश"], ["Pañcatantra", "पञ्चतन्त्र"] ] },
        { r: "Bhakti sūtras", d: "भक्ति-सूत्र", t: [
          ["Nārada Bhakti Sūtra", "नारद भक्ति सूत्र", "नारद भक्ति सूत्र"],
          ["Śāṇḍilya Bhakti Sūtra", "शाण्डिल्य भक्ति सूत्र", "शाण्डिल्य-भक्ति-सूत्र"],
          ["Nārada & Śāṇḍilya Bhakti Sūtra", "नारद एवं शाण्डिल्य भक्ति सूत्र", "नारद भक्ति सूत्र एवं शाण्डिल्य"] ] },
        { r: "Goswāmī Tulasīdāsa", d: "गोस्वामी तुलसीदास", t: [
          ["Rāmacaritamānasa", "रामचरितमानस", "श्रीरामचरितमानस"], ["Vinaya Patrikā", "विनय-पत्रिका", "विनय-पत्रिका"],
          ["Kavitāvalī", "कवितावली", "कवितावली"], ["Dohāvalī", "दोहावली", "दोहावली"],
          ["Gītāvalī", "गीतावली", "गीतावली"], ["Jānakī Maṅgala", "जानकी मंगल", "जानकी मंगल"],
          ["Pārvatī Maṅgala", "पार्वती मंगल", "पार्वती मंगल"],
          ["Hanumān Bāhuka", "हनुमान बाहुक", "हनुमान-बाहुक"] ] },
        { r: "Sūradāsa & Kṛṣṇa-bhakti", d: "सूरदास एवं कृष्ण-भक्ति", t: [
          ["Sūra Vinaya Patrikā", "सूर विनय पत्रिका", "सूर विनय पत्रिका"],
          ["Sūra Rāmacaritāvalī", "सूर रामचरितावली", "सूर रामचरितावली"],
          ["Kṛṣṇa Gītāvalī", "श्रीकृष्ण गीतावली", "श्रीकृष्ण गीतावली"],
          ["Kṛṣṇa Bāla Mādhurī", "श्रीकृष्ण बाल माधुरी", "श्रीकृष्ण बाल माधुरी"] ] },
        { r: "Stotra & Sahasranāma", d: "स्तोत्र एवं सहस्रनाम", t: [
          ["Hanumān Cālīsā", "हनुमान चालीसा", "श्रीहनुमानचालीसा"],
          ["Ādityahṛdaya Stotra", "आदित्यहृदयस्तोत्र", "आदित्यहृदयस्तोत्रम्"],
          ["Rāmarakṣā Stotra", "रामरक्षास्तोत्र", "रामरक्षास्तोत्रम्"],
          ["Śivamahimnaḥ Stotra", "शिवमहिम्नस्तोत्र", "शिवमहिम्नस्तोत्र"],
          ["Gaṇeśa Stotra Ratnākara", "गणेशस्तोत्ररत्नाकर", "गणेशस्तोत्ररत्नाकर"],
          ["Stotra Ratnāvalī", "स्तोत्ररत्नावली", "स्तोत्ररत्नावली"],
          ["Viṣṇu Sahasranāma (Śāṅkara Bhāṣya)", "विष्णुसहस्रनाम (शांकरभाष्य)", "श्रीविष्णुसहस्रनाम (शांकरभाष्य"],
          ["Govinda Dāmodara Stotra", "गोविन्द दामोदर स्तोत्र", "श्रीगोविन्ददामोदरस्तोत्रम्"] ] },
        { r: "Saints & bhakta literature", d: "सन्त एवं भक्त-चरित", t: [
          ["Bhaktamāla", "भक्तमाल", "श्रीभक्तमाल"],
          ["Śrī Caitanya Caritāvalī", "श्रीश्रीचैतन्य-चरितावली", "श्रीश्रीचैतन्य-चरितावली"],
          ["Śrī Tukārāma Caritra", "श्रीतुकाराम-चरित्र", "श्रीतुकाराम-चरित्र"],
          ["Śrī Ekanātha Caritra", "श्री एकनाथ चरित्र", "श्री एकनाथ चरित्र"] ] }
      ] }
  ];

  /* ---------------- Advaita: the works attributed to Ādi Śaṅkarācārya ----------------
     Same shape as TREE, opened at /vangmay/advaita.  A text is  [roman, Devanagari, library file, page, note]:
       page  = the reader page (0-based) of that work inside a collection book -- the link then opens that stotra directly
       note  = [hi, en] shown in place of the author, for a book that holds the text but is not exactly the work named
     Page numbers were read from the books' own chapter headings and the "इति श्रीमच्छङ्कराचार्य…" colophons. */
  var DEVI = "देवीस्तोत्ररत्नाकर", SHIVA = "शिव स्तोत्र रत्नाकर", GANESHA = "गणेशस्तोत्ररत्नाकर",
      RATNAVALI = "स्तोत्ररत्नावली", HANUMAN = "श्रीहनुमान-अङ्क";
  var NOT_BHASHYA = ["उपनिषद् का पाठ एवं हिन्दी व्याख्या — शांकरभाष्य नहीं", "Upaniṣad text with Hindi commentary — not Śaṅkara’s bhāṣya"];

  var ADVAITA = [
    { k: "adv-bhashya", cc: "shruti", ic: "\u{1F4D6}", r: "Bhāṣyas — foundational commentaries", d: "भाष्य",
      hi: "वेदान्त / अद्वैत के आधारभूत भाष्य", en: "Vedānta / Advaita — foundational commentaries (Bhāṣyas)",
      groups: [
        { r: "Brahma Sūtra & Bhagavad Gītā", d: "ब्रह्मसूत्र एवं भगवद्गीता", t: [
          ["Brahma Sūtra Bhāṣya", "ब्रह्मसूत्र भाष्य", "वेदान्त-दर्शन (ब्रह्मसूत्र)", null,
            ["ब्रह्मसूत्र (सूत्र एवं हिन्दी व्याख्या) — शांकरभाष्य नहीं", "The Brahma Sūtras with Hindi commentary — not Śaṅkara’s bhāṣya"]],
          ["Bhagavad Gītā Bhāṣya", "भगवद्गीता भाष्य", "श्रीमद्भगवद्गीता शांकरभाष्य", null, ["शांकरभाष्य, हिन्दी अनुवाद सहित", "Śaṅkara’s bhāṣya with Hindi translation"]] ] },
        { r: "Upaniṣad Bhāṣyas", d: "उपनिषद् भाष्य", t: [
          ["Īśa Upaniṣad Bhāṣya", "ईशोपनिषद् भाष्य", "ईशावास्योपनिषद्", null, NOT_BHASHYA],
          ["Kena Upaniṣad Bhāṣya — Pada and Vākya", "केनोपनिषद् भाष्य — पद एवं वाक्य", "केनोपनिषद्", null, NOT_BHASHYA],
          ["Kaṭha Upaniṣad Bhāṣya", "कठोपनिषद् भाष्य", "कठोपनिषद्", null, NOT_BHASHYA],
          ["Praśna Upaniṣad Bhāṣya", "प्रश्नोपनिषद् भाष्य", "प्रश्नोपनिषद्", null,
            ["मन्त्रार्थ, शांकरभाष्य एवं हिन्दी भाष्यार्थ सहित", "With Śāṅkara-bhāṣya and its Hindi rendering"]],
          ["Muṇḍaka Upaniṣad Bhāṣya", "मुण्डकोपनिषद् भाष्य", "मुण्डकोपनिषद्", null, NOT_BHASHYA],
          ["Māṇḍūkya Upaniṣad and Gauḍapāda’s Kārikā — Bhāṣya", "माण्डूक्योपनिषद् एवं गौडपादीय कारिका भाष्य", "माण्डूक्योपनिषद्", null, NOT_BHASHYA],
          ["Aitareya Upaniṣad Bhāṣya", "ऐतरेयोपनिषद् भाष्य", "ऐतरेयोपनिषद्", null, NOT_BHASHYA],
          ["Taittirīya Upaniṣad Bhāṣya", "तैत्तिरीयोपनिषद् भाष्य", "तैत्तिरीयोपनिषद्", null, NOT_BHASHYA],
          ["Chāndogya Upaniṣad Bhāṣya", "छान्दोग्योपनिषद् भाष्य"],
          ["Bṛhadāraṇyaka Upaniṣad Bhāṣya", "बृहदारण्यकोपनिषद् भाष्य", "u_बृहदारण्यकोपनिषत्", null,
            ["उपनिषद् का पाठ एवं भावार्थ — शांकरभाष्य नहीं", "Upaniṣad text with meaning — not Śaṅkara’s bhāṣya"]],
          ["Śvetāśvatara Upaniṣad Bhāṣya", "श्वेताश्वतरोपनिषद् भाष्य", "श्वेताश्वतरोपनिषद्", null, NOT_BHASHYA],
          ["Nṛsiṃha Tāpanīya Upaniṣad Bhāṣya", "नृसिंहतापनीय उपनिषद् भाष्य"] ] },
        { r: "Other scriptural & philosophical commentaries attributed", d: "अन्य शास्त्रीय एवं दार्शनिक भाष्य (आरोपित)", t: [
          ["Sanatsujātīya Bhāṣya", "सनत्सुजातीय भाष्य"],
          ["Sāṃkhya Kārikā Bhāṣya", "सांख्यकारिका भाष्य"],
          ["Yoga Sūtra Bhāṣya (Vivaraṇa)", "योगसूत्र भाष्य (विवरण)"],
          ["Āpastambīya Dharma Sūtra Bhāṣya", "आपस्तम्बीय धर्मसूत्र भाष्य"],
          ["Gāyatrī Bhāṣya", "गायत्री भाष्य"],
          ["Hastāmalakīya Bhāṣya", "हस्तामलकीय भाष्य"] ] }
      ] },

    { k: "adv-prakarana", cc: "darshana", ic: "ॐ", r: "Independent teaching works", d: "प्रकरण-ग्रन्थ",
      hi: "अद्वैत वेदान्त के स्वतन्त्र उपदेश-ग्रन्थ", en: "Advaita / Vedānta — independent teaching works",
      groups: [
        { r: "Prakaraṇa texts", d: "प्रकरण-ग्रन्थ", t: [
          ["Upadeśa Sāhasrī", "उपदेशसाहस्री"],
          ["Vivekacūḍāmaṇi", "विवेकचूडामणि", "विवेक चूडामणि"],
          ["Aparokṣānubhūti", "अपरोक्षानुभूति", "श्रीआद्यशंकराचार्यविरचित अपरोक्षानुभूति"],
          ["Ātmabodha", "आत्मबोध"],
          ["Laghu-vākyavṛtti", "लघुवाक्यवृत्ति"],
          ["Vākyavṛtti", "वाक्यवृत्ति"],
          ["Sarva-vedānta-siddhānta-sāra-saṅgraha", "सर्ववेदान्तसिद्धान्तसारसङ्ग्रह"],
          ["Sarva-siddhānta-saṅgraha", "सर्वसिद्धान्तसङ्ग्रह"],
          ["Prabodha-sudhākara", "प्रबोधसुधाकर"],
          ["Pañcīkaraṇam", "पञ्चीकरणम्"],
          ["Advaitānubhūti", "अद्वैतानुभूति"],
          ["Anātma-śrī-vigrahaṇa", "अनात्मश्रीविगर्हण"],
          ["Ātmajñānopadeśa-vidhi / Dṛgdarśana-viveka", "आत्मज्ञानोपदेशविधि / दृग्दर्शनविवेक"],
          ["Ātma-pañcaka / Ātma-śataka / Advaita-pañcaka", "आत्मपञ्चक / आत्मशतक / अद्वैतपञ्चक"],
          ["Ātmānātma-viveka", "आत्मानात्मविवेक"],
          ["Brahmajñānāvalī-mālā", "ब्रह्मज्ञानावलीमाला"],
          ["Brahmānucintana / Ātmānucintana", "ब्रह्मानुचिन्तन / आत्मानुचिन्तन"],
          ["Eka-śloki", "एकश्लोकी"],
          ["Jīvanmukta-ānandalaharī / Anubhava-ānandalaharī", "जीवन्मुक्तानन्दलहरी / अनुभवानन्दलहरी"],
          ["Jñānagaṅgā-śataka", "ज्ञानगङ्गाशतक"],
          ["Kevalo’ham", "केवलोऽहम्"],
          ["Māyā-pañcaka", "मायापञ्चक"],
          ["Nirvāṇa-śataka / Ātma-śataka", "निर्वाणशतक / आत्मशतक"],
          ["Nirvāṇa-daśaka / Daśa-śloki / Siddhānta-bindu", "निर्वाणदशक / दशश्लोकी / सिद्धान्तबिन्दु"],
          ["Nirvāṇa-mañjarī", "निर्वाणमञ्जरी"],
          ["Prauḍhānubhūti", "प्रौढानुभूति"],
          ["Tattvopadeśa", "तत्त्वोपदेश"],
          ["Vākyasudhā", "वाक्यसुधा"],
          ["Vijñāna-naukā / Svarūpānusandhāna", "विज्ञाननौका / स्वरूपानुसन्धान"],
          ["Vedānta-kesari / Śata-śloki", "वेदान्तकेसरी / शतश्लोकी", "शतश्लोकी"],
          ["Bodhasāra", "बोधसार"],
          ["Svātma-nirūpaṇa", "स्वात्मनिरूपण"],
          ["Svātma-prakāśikā", "स्वात्मप्रकाशिका"] ] }
      ] },

    { k: "adv-sannyasa", cc: "dharma", ic: "\u{1F4FF}", r: "Sannyāsa, conduct & instruction", d: "सन्न्यास, आचार एवं उपदेश",
      hi: "सन्न्यास, सदाचार और उपदेश", en: "Sannyāsa, conduct, and instruction",
      groups: [
        { r: "Instruction & conduct", d: "उपदेश एवं आचार", t: [
          ["Ajñānabodhinī", "अज्ञानबोधिनी"],
          ["Dhanyāṣṭakam", "धन्याष्टकम्", RATNAVALI, 75],
          ["Guru-aṣṭaka", "गुर्वष्टकम्"],
          ["Maṭha-āmnāya", "मठाम्नाय"],
          ["Maṇiratnamālā", "मणिरत्नमाला"],
          ["Mohamudgara / Dvādaśa-pañjarikā / Bhaja Govindam", "मोहमुद्गर / द्वादशपञ्जरिका / भज गोविन्दम्", RATNAVALI, 78],
          ["Praśnottara-mālikā", "प्रश्नोत्तरमालिका"],
          ["Sadācāra-anusandhāna", "सदाचारानुसन्धान"],
          ["Sādhana-pañcaka / Upadeśa-pañcaka", "साधनपञ्चक / उपदेशपञ्चक", RATNAVALI, 74],
          ["Sannyāsa-paddhati", "सन्न्यासपद्धति"],
          ["Śaṅkara-smṛti", "शङ्करस्मृति"] ] }
      ] },

    { k: "adv-shaiva", cc: "agama", ic: "\u{1F531}", r: "Śaiva tradition", d: "शैव परम्परा",
      hi: "शिव एवं दक्षिणामूर्ति के स्तोत्र", en: "Śiva and Dakṣiṇāmūrti hymns, Kāśī, forms of Śiva",
      groups: [
        { r: "Śiva- and Dakṣiṇāmūrti hymns", d: "शिव एवं दक्षिणामूर्ति स्तोत्र", t: [
          ["Dakṣiṇāmūrti-aṣṭaka", "दक्षिणामूर्त्यष्टकम्"],
          ["Dakṣiṇāmūrti-stotra", "दक्षिणामूर्तिस्तोत्रम्", SHIVA, 18],
          ["Dakṣiṇāmūrti-varṇamālā", "दक्षिणामूर्तिवर्णमाला"],
          ["Kālabhairava-aṣṭaka", "कालभैरवाष्टकम्", SHIVA, 50],
          ["Mṛtyuñjaya-mānasa-pūjā", "मृत्युञ्जयमानसपूजा"],
          ["Śiva-aparādha-bhañjana-stotra", "शिवापराधभञ्जनस्तोत्रम्", SHIVA, 8],
          ["Śiva-bhujaṅga-prayāta", "शिवभुजङ्गप्रयातम्"],
          ["Śiva-keśādi-pādānta-stotra", "शिवकेशादिपादान्तस्तोत्रम्"],
          ["Śiva-mānasa-pūjā", "शिवमानसपूजा", SHIVA, 7],
          ["Śiva-nāmāvaly-aṣṭaka", "शिवनामावल्यष्टकम्", SHIVA, 40],
          ["Śiva-pādādi-keśānta-stotra", "शिवपादादिकेशान्तस्तोत्रम्"],
          ["Śiva-pañcākṣara-nakṣatramālā", "शिवपञ्चाक्षरनक्षत्रमाला"],
          ["Śiva-pañcākṣara-stotra", "शिवपञ्चाक्षरस्तोत्रम्", SHIVA, 9],
          ["Śivānandalaharī", "शिवानन्दलहरी"],
          ["Suvarṇamālā-stuti", "सुवर्णमालास्तुति"],
          ["Vedasāra-śiva-stotra", "वेदसारशिवस्तोत्रम्", SHIVA, 10] ] },
        { r: "Śiva pilgrimage / sacred places", d: "शिव-तीर्थ एवं पवित्र स्थान", t: [
          ["Dvādaśa-jyotirliṅga-stotra", "द्वादशज्योतिर्लिङ्गस्तोत्रम्", SHIVA, 12],
          ["Kāśī-pañcaka", "काशीपञ्चकम्", DEVI, 46],
          ["Kāśī-stotra", "काशीस्तोत्रम्"],
          ["Maṇikarṇikā-aṣṭaka", "मणिकर्णिकाष्टकम्", DEVI, 48] ] },
        { r: "Śaiva and related forms", d: "शैव एवं सम्बद्ध स्वरूप", t: [
          ["Ardha-nārīśvara-stotra", "अर्धनारीश्वरस्तोत्रम्", SHIVA, 27],
          ["Hara-Gaurī-aṣṭaka", "हरगौर्यष्टकम्"],
          ["Umā-maheśvara-stotra", "उमामहेश्वरस्तोत्रम्", SHIVA, 34] ] }
      ] },

    { k: "adv-shakta", cc: "purana", ic: "\u{1F338}", r: "Śākta / Devī / Śrīvidyā tradition", d: "शाक्त / देवी / श्रीविद्या परम्परा",
      hi: "देवी के स्तोत्र एवं श्रीविद्या", en: "Devī and Goddess hymns, Śrīvidyā",
      groups: [
        { r: "Devī and Goddess hymns", d: "देवी स्तोत्र", t: [
          ["Ambā-aṣṭaka", "अम्बाष्टकम्"],
          ["Annapūrṇā-stotra", "अन्नपूर्णास्तोत्रम्", DEVI, 43],
          ["Ānanda-laharī / Saundarya-laharī", "आनन्दलहरी / सौन्दर्यलहरी", DEVI, 11],
          ["Bhavānī-aṣṭaka", "भवान्यष्टकम्", DEVI, 14],
          ["Bhavānī-bhujaṅga-prayāta", "भवानीभुजङ्गप्रयातम्"],
          ["Bhramarāmbā-aṣṭaka", "भ्रमराम्बाष्टकम्"],
          ["Devī-bhujaṅga-prayāta", "देवीभुजङ्गप्रयातम्"],
          ["Devī-catuḥṣaṣṭi-upacāra-pūjā-stotra", "देवीचतुःषष्ट्युपचारपूजास्तोत्रम्"],
          ["Durgā-aparādha-bhañjana-stotra", "दुर्गापराधभञ्जनस्तोत्रम् (देव्यपराधक्षमापनस्तोत्र)", DEVI, 20],
          ["Gaurī-daśaka", "गौरीदशकम्"],
          ["Kali-aparādha-bhañjana-stotra", "कालीअपराधभञ्जनस्तोत्रम्"],
          ["Lalitā-pañcaka", "ललितापञ्चकम्", DEVI, 12],
          ["Mantra-mātṛkā-puṣpamālā", "मन्त्रमातृकापुष्पमाला"],
          ["Mīnākṣī-pañcaratna", "मीनाक्षीपञ्चरत्नम्", DEVI, 13],
          ["Mīnākṣī-stotra", "मीनाक्षीस्तोत्रम्"],
          ["Tripura-sundarī-aṣṭaka", "त्रिपुरसुन्दर्यष्टकम्"],
          ["Tripura-sundarī-mānasa-pūjā", "त्रिपुरसुन्दरीमानसपूजा"],
          ["Tripura-sundarī-veda-pāda-stotra", "त्रिपुरसुन्दरीवेदपादस्तोत्रम्"] ] },
        { r: "Śākta scripture commentary", d: "शाक्त शास्त्र-भाष्य", t: [
          ["Lalitā-triśatī Bhāṣya", "ललितात्रिशती भाष्य"],
          ["Prapañcasāra Tantra", "प्रपञ्चसारतन्त्र"] ] },
        { r: "Other Goddess-related hymns", d: "देवी-सम्बन्धी अन्य स्तोत्र", t: [
          ["Kalyāṇa-vṛṣṭi", "कल्याणवृष्टिस्तोत्रम्", DEVI, 30],
          ["Śāradā-bhujaṅga-prayāta", "शारदाभुजङ्गप्रयातम्"] ] }
      ] },

    { k: "adv-vaishnava", cc: "itihasa", ic: "\u{1F41A}", r: "Vaiṣṇava tradition", d: "वैष्णव परम्परा",
      hi: "विष्णु, कृष्ण और नारायण के स्तोत्र", en: "Viṣṇu, Kṛṣṇa and Nārāyaṇa hymns; Viṣṇu’s rivers",
      groups: [
        { r: "Scriptural commentary", d: "शास्त्रीय भाष्य", t: [
          ["Viṣṇu-sahasranāma Bhāṣya / Viṣṇu-sahasranāma-stotra Bhāṣya", "विष्णुसहस्रनाम भाष्य",
            "श्रीविष्णुसहस्रनाम (शांकरभाष्य"] ] },
        { r: "Viṣṇu, Kṛṣṇa, and Nārāyaṇa hymns", d: "विष्णु, कृष्ण एवं नारायण स्तोत्र", t: [
          ["Acyuta-aṣṭaka (two versions)", "अच्युताष्टकम् (दो पाठ)", RATNAVALI, 50],
          ["Ārta-trāṇa-nārāyaṇa-stotra", "आर्तत्राणनारायणस्तोत्रम्"],
          ["Daśāvatāra-stotra", "दशावतारस्तोत्रम्"],
          ["Govinda-aṣṭaka", "गोविन्दाष्टकम्", RATNAVALI, 49],
          ["Hari-nāmāvali-stotra", "हरिनामावलीस्तोत्रम्"],
          ["Harimīḍe-stotra", "हरिमीडेस्तोत्रम्"],
          ["Jagannātha-aṣṭaka", "जगन्नाथाष्टकम्"],
          ["Kṛṣṇa-aṣṭaka (two versions)", "कृष्णाष्टकम् (दो पाठ)", RATNAVALI, 51],
          ["Lakṣmī-nṛsiṃha-pañcaratna", "लक्ष्मीनृसिंहपञ्चरत्नम्"],
          ["Nārāyaṇa-stotra", "नारायणस्तोत्रम्"],
          ["Pāṇḍuraṅga-aṣṭaka", "पाण्डुरङ्गाष्टकम्"],
          ["Rāma-bhujaṅga-prayāta", "रामभुजङ्गप्रयातम्"],
          ["Saṅkaṭanāśana Lakṣmī-nṛsiṃha / Karuṇārasa-stotra", "सङ्कटनाशन लक्ष्मीनृसिंह / करुणारसस्तोत्रम्", RATNAVALI, 36],
          ["Ṣaṭpadi-stotra", "षट्पदीस्तोत्रम्", RATNAVALI, 4],
          ["Viṣṇu-bhujaṅga-prayāta", "विष्णुभुजङ्गप्रयातम्"],
          ["Viṣṇu-pādādikeśānta-stotra", "विष्णुपादादिकेशान्तस्तोत्रम्"],
          ["Dvādaśa-pañjarikā / Bhaja Govindam", "द्वादशपञ्जरिका / भज गोविन्दम्", RATNAVALI, 78] ] },
        { r: "Viṣṇu-associated sacred rivers", d: "विष्णु-सम्बद्ध पवित्र नदियाँ", t: [
          ["Yamunā-aṣṭaka (two versions)", "यमुनाष्टकम् (दो पाठ)", DEVI, 55],
          ["Gaṅgā-aṣṭaka / Gaṅgā-stotra", "गङ्गाष्टकम् / गङ्गास्तोत्रम्", DEVI, 50] ] }
      ] },

    { k: "adv-ganapatya", cc: "upaveda", ic: "\u{1F418}", r: "Gaṇapatya tradition", d: "गाणपत्य परम्परा",
      hi: "श्री गणेश के स्तोत्र", en: "Hymns to Gaṇeśa",
      groups: [
        { r: "Gaṇeśa hymns", d: "गणेश स्तोत्र", t: [
          ["Gaṇeśa-bhujaṅga-prayāta", "गणेशभुजङ्गप्रयातम्", GANESHA, 22],
          ["Gaṇeśa-pañcaratna", "गणेशपञ्चरत्नम्", GANESHA, 7] ] }
      ] },

    { k: "adv-other", cc: "vedanga", ic: "\u{1F6D5}", r: "Other deity traditions", d: "अन्य देव-परम्पराएँ",
      hi: "हनुमान् और सुब्रह्मण्य", en: "Hymns to other deities",
      groups: [
        { r: "Hanumān & Subrahmaṇya", d: "हनुमान् एवं सुब्रह्मण्य", t: [
          ["Hanumat-pañcaka / Hanumat-pañcaratna", "हनुमत्पञ्चक / हनुमत्पञ्चरत्नम्", HANUMAN, 6],
          ["Subrahmaṇya-bhujaṅga-prayāta", "सुब्रह्मण्यभुजङ्गप्रयातम्"] ] }
      ] },

    { k: "adv-tirtha", cc: "other", ic: "\u{1F30A}", r: "Rivers, pilgrimage & general devotional works", d: "नदी, तीर्थ एवं सामान्य भक्ति-रचनाएँ",
      hi: "नर्मदा, पुष्कर, प्रातःस्मरण और अन्य", en: "Rivers, pilgrimage, and general devotional works",
      groups: [
        { r: "Rivers, pilgrimage & devotion", d: "नदी, तीर्थ एवं भक्ति", t: [
          ["Narmadā-aṣṭaka", "नर्मदाष्टकम्", DEVI, 59],
          ["Puṣkara-aṣṭaka", "पुष्कराष्टकम्"],
          ["Prātaḥ-smaraṇa-stotra", "प्रातःस्मरणस्तोत्रम्", RATNAVALI, 71],
          ["Amaru-śataka", "अमरुशतकम्"] ] }
      ] }
  ];

  /* ---------------- helpers ---------------- */

  function norm(s) {
    return String(s || "").normalize("NFC").replace(/[‌‍]/g, "").replace(/\s+/g, " ").trim();
  }
  // search form: lower-case Latin with diacritics stripped, so "rgveda" finds "Ṛgveda"
  function fold(s) {
    return norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  var COLLECTIONS = {
    "":        { tree: TREE,    open: { "shruti": true, "shruti/0": true } },
    "advaita": { tree: ADVAITA, open: { "adv-bhashya": true, "adv-bhashya/0": true, "adv-bhashya/1": true } }
  };
  var CUR = TREE, curKey = "";
  var state = { q: "", branch: "all", onlyLib: false, open: COLLECTIONS[""].open };
  var resolved = null;   // the current tree with each text's `book` filled in (built once per page view)

  // /vangmay shows the whole scripture tree; /vangmay/advaita the works of Ādi Śaṅkarācārya. Switching resets the search, filter and open groups.
  function pick(ctx) {
    var key = COLLECTIONS[ctx.sub || ""] ? (ctx.sub || "") : "";
    if (key !== curKey) {
      curKey = key; CUR = COLLECTIONS[key].tree;
      state = { q: "", branch: "all", onlyLib: false, open: JSON.parse(JSON.stringify(COLLECTIONS[key].open)) };
    }
  }

  function resolve(ctx) {
    var byFile = {}, list = [];
    (ctx.books || []).forEach(function (b) {
      var f = norm(String(b.file || "").replace(/\.html$/, ""));
      byFile[f] = b; list.push([f, b]);
    });
    var used = 0, total = 0, avail = 0, seen = {};
    CUR.forEach(function (br) {
      br.groups.forEach(function (g) {
        g.t.forEach(function (t) {
          total++;
          t.book = null;
          if (!t[2]) return;
          var key = norm(t[2]);
          var b = byFile[key];
          if (!b) {
            var hits = list.filter(function (p) { return p[0].indexOf(key) === 0; });
            if (hits.length === 1) b = hits[0][1];
          }
          if (b) { t.book = b; avail++; if (!seen[b.file]) { seen[b.file] = 1; used++; } }
        });
      });
    });
    resolved = { total: total, books: used, avail: avail };
  }

  function counts(br) {
    var n = 0, lib = 0;
    br.groups.forEach(function (g) { g.t.forEach(function (t) { n++; if (t.book) lib++; }); });
    return { n: n, lib: lib };
  }

  /* ---------------- rendering ---------------- */

  function textRow(ctx, t) {
    var esc = ctx.esc, tx = ctx.tx, b = t.book;
    var thumb = b ? ctx.coverEl(b, "sm") : '<div class="vg-thumb" aria-hidden="true"><span>ॐ</span></div>';
    var meta = b ? esc(t[4] ? tx(t[4][0], t[4][1]) : (b.author || "")) : esc(tx("संग्रह में अभी उपलब्ध नहीं", "Not in the library yet"));
    var body = '<span class="vg-thumb-wrap">' + thumb + '</span>' +
      '<span class="vg-text-body">' +
        '<span class="vg-text-r">' + esc(tx(t[1], t[0])) + '</span>' +
        (tx("", "x") ? '<span class="vg-text-d">' + esc(t[1]) + '</span>' : '') +
        '<span class="vg-text-m">' + meta + '</span>' +
      '</span>' +
      (b ? '<span class="vg-go" aria-hidden="true">›</span>' : '<span class="vg-soon">' + esc(tx("शीघ्र", "Soon")) + '</span>');
    return b
      ? '<a class="vg-text is-open" href="' + esc(typeof t[3] === "number" && ctx.readPath ? ctx.readPath(b, t[3]) : ctx.bookPath(b)) +
          '" title="' + esc(typeof t[3] === "number" ? tx("इसी स्तोत्र पर खोलें", "Open at this text in the reader") : tx("पुस्तक खोलें", "Open in the reader")) + '">' + body + '</a>'
      : '<div class="vg-text is-missing">' + body + '</div>';
  }

  function matches(ctx, br, g, t, q) {
    if (!q) return true;
    var hay = fold([t[0], t[1], g.r, g.d, br.r, br.d, t.book ? t.book.title : "", t.book ? t.book.author : ""].join(" "));
    return hay.indexOf(q) !== -1;
  }

  function treeHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc, q = fold(state.q), searching = !!q;
    var out = "", shown = 0;
    CUR.forEach(function (br) {
      if (state.branch !== "all" && state.branch !== br.k) return;
      var c = counts(br), groupsHtml = "", brShown = 0;
      br.groups.forEach(function (g, gi) {
        var rows = g.t.filter(function (t) { return (!state.onlyLib || t.book) && matches(ctx, br, g, t, q); });
        if (!rows.length) return;
        brShown += rows.length;
        var gk = br.k + "/" + gi;
        var open = searching || !!state.open[gk];
        var gLib = rows.filter(function (t) { return t.book; }).length;
        groupsHtml +=
          '<section class="vg-group' + (open ? " is-open" : "") + '">' +
            '<button type="button" class="vg-group-h" data-vg-toggle="' + esc(gk) + '" aria-expanded="' + (open ? "true" : "false") + '">' +
              '<span class="vg-caret" aria-hidden="true">▸</span>' +
              '<span class="vg-group-t"><b>' + esc(tx(g.d, g.r)) + '</b>' + (tx("", "x") ? '<i>' + esc(g.d) + '</i>' : '') + '</span>' +
              (gLib ? '<span class="vg-lib">' + gLib + ' ' + esc(tx("उपलब्ध", "available")) + '</span>' : '') +
              '<span class="vg-badge">' + rows.length + ' ' + esc(tx("ग्रंथ", rows.length === 1 ? "text" : "texts")) + '</span>' +
            '</button>' +
            '<div class="vg-group-b">' + rows.map(function (t) { return textRow(ctx, t); }).join("") + '</div>' +
          '</section>';
      });
      if (!brShown) return;
      shown += brShown;
      var open = searching || !!state.open[br.k];
      out +=
        '<article class="vg-branch' + (open ? " is-open" : "") + '" id="vg-' + br.k + '" data-k="' + br.k + '">' +
          '<button type="button" class="vg-branch-h" data-vg-toggle="' + br.k + '" aria-expanded="' + (open ? "true" : "false") + '">' +
            '<span class="vg-ic vg-c-' + (br.cc || br.k) + '" aria-hidden="true">' + br.ic + '</span>' +
            '<span class="vg-branch-t"><b>' + esc(tx(br.d, br.r)) + '</b><i>' + esc(tx(br.hi, br.d + " · " + br.en)) + '</i></span>' +
            (c.lib ? '<span class="vg-lib">' + c.lib + ' ' + esc(tx("उपलब्ध", "available")) + '</span>' : '') +
            '<span class="vg-badge">' + c.n + ' ' + esc(tx("ग्रंथ", "books")) + '</span>' +
            '<span class="vg-caret" aria-hidden="true">▾</span>' +
          '</button>' +
          '<div class="vg-branch-b">' + groupsHtml + '</div>' +
        '</article>';
    });
    if (!shown) {
      out = '<div class="vg-empty">' + esc(tx("कोई ग्रंथ नहीं मिला। खोज बदलकर देखें।", "No texts match. Try a different search.")) + '</div>';
    }
    return out;
  }

  function chipsHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc;
    var h = '<button type="button" class="vg-chip' + (state.branch === "all" ? " is-on" : "") + '" data-vg-branch="all">' + esc(tx("सभी", "All")) + '</button>';
    CUR.forEach(function (br) {
      h += '<button type="button" class="vg-chip' + (state.branch === br.k ? " is-on" : "") + '" data-vg-branch="' + br.k + '">' +
        '<span aria-hidden="true">' + br.ic + '</span> ' + esc(tx(br.d, br.r)) + '</button>';
    });
    return h;
  }

  // the entrance to /vangmay/advaita, shown on the main page
  function featureHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc;
    return '<div class="vg-label"><span>' + esc(tx("विशेष संग्रह", "Special collections")) + '</span></div>' +
      '<div class="vg-features"><a class="vg-feature" href="/vangmay/advaita">' +
        '<span class="vg-feature-ic" aria-hidden="true">ॐ</span>' +
        '<span class="vg-feature-t"><b>' + esc(tx("अद्वैत — आदि शंकराचार्य की रचनाएँ", "Advaita — the works of Ādi Śaṅkarācārya")) + '</b>' +
          '<i>' + esc(tx("भाष्य, प्रकरण-ग्रन्थ और स्तोत्र — पुस्तकालय में उपलब्ध ग्रन्थों के सीधे लिंक के साथ",
                          "Bhāṣyas, prakaraṇa texts and stotras, with direct links to what the library holds")) + '</i></span>' +
        '<span class="vg-go" aria-hidden="true">›</span>' +
      '</a></div>';
  }

  function heroHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc, adv = curKey === "advaita";
    var stats = adv
      ? '<div><i class="vg-si vg-si-1" aria-hidden="true">&#128214;</i><p><b>' + CUR.length + '</b><span>' + esc(tx("खण्ड", "Sections")) + '</span></p></div>' +
        '<div><i class="vg-si vg-si-2" aria-hidden="true">&#128218;</i><p><b>' + resolved.total + '</b><span>' + esc(tx("रचनाएँ", "Works listed")) + '</span></p></div>' +
        '<div class="is-lib"><i class="vg-si vg-si-3" aria-hidden="true">&#128215;</i><p><b>' + resolved.avail + '</b><span>' + esc(tx("पुस्तकालय में उपलब्ध", "Available in the library")) + '</span></p></div>' +
        '<div><i class="vg-si vg-si-4" aria-hidden="true">ॐ</i><p><b>' + resolved.books + '</b><span>' + esc(tx("पुस्तकें", "Books holding them")) + '</span></p></div>'
      : '<div><i class="vg-si vg-si-1" aria-hidden="true">&#128214;</i><p><b>' + CUR.length + '</b><span>' + esc(tx("मुख्य शाखाएँ", "Major branches")) + '</span></p></div>' +
        '<div><i class="vg-si vg-si-2" aria-hidden="true">&#128218;</i><p><b>' + resolved.total + '</b><span>' + esc(tx("ग्रंथ-प्रविष्टियाँ", "Book entries")) + '</span></p></div>' +
        '<div class="is-lib"><i class="vg-si vg-si-3" aria-hidden="true">&#128215;</i><p><b>' + resolved.books + '</b><span>' + esc(tx("पुस्तकालय में उपलब्ध", "Available in the library")) + '</span></p></div>' +
        '<div><i class="vg-si vg-si-4" aria-hidden="true">ॐ</i><p><b>संस्कृत</b><span>' + esc(tx("मूल परम्परा", "Core tradition")) + '</span></p></div>';
    return '<section class="vg-hero">' +
      (adv ? '<a class="vg-back" href="/vangmay">‹ ' + esc(tx("वाङ्मय", "Vāṅmaya")) + '</a>' : '') +
      '<div class="vg-eyebrow">' + (adv ? 'ADVAITA VEDĀNTA &bull; ' + esc(tx("वाङ्मय", "VĀṄMAYA")) : esc(tx("वाङ्मय", "VĀṄMAYA")) + ' &bull; SCRIPTURE EXPLORER') + '</div>' +
      '<h1><span>' + esc(adv ? tx("आदि शंकराचार्य की रचनाएँ", "Works of Ādi Śaṅkarācārya") : tx("शास्त्रों का अन्वेषण", "Explore the Scriptures")) + '</span></h1>' +
      '<p>' + esc(adv
        ? tx("आदि शंकराचार्य के नाम से जुड़ी रचनाएँ — भाष्य, प्रकरण-ग्रन्थ, उपदेश और स्तोत्र — नौ खण्डों में। जो रचना पुस्तकालय में है, उस पर क्लिक करके सीधे पढ़ें; स्तोत्र-संग्रह की रचनाएँ उसी स्तोत्र पर खुलती हैं।",
             "The works attributed to Ādi Śaṅkarācārya — commentaries, teaching texts, instruction and hymns — in nine sections. Click a work that is in the library to read it; a hymn inside a collection opens at that hymn.")
        : tx("सनातन धर्म की विशाल ज्ञान-परम्परा को शाखा, वर्ग और ग्रंथ के क्रम से देखें। जो ग्रंथ पुस्तकालय में हैं, उनपर क्लिक करके सीधे पढ़ें।",
             "Discover the vast knowledge tradition of Sanātana Dharma. Texts that are in this library open straight in the reader.")) + '</p>' +
      '<div class="vg-stats">' + stats + '</div>' +
    '</section>';
  }

  function noteHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc;
    if (curKey === "advaita") {
      return '<aside class="vg-note"><b>' + esc(tx("कर्तृत्व एवं उपलब्धता पर टिप्पणी", "A note on attribution and availability")) + '</b> ' +
        esc(tx("यह सूची आदि शंकराचार्य के नाम से प्रचलित रचनाओं की है; अनेक रचनाओं के कर्तृत्व पर विद्वानों में मतभेद है। जहाँ पुस्तकालय की पुस्तक में रचना का पाठ है पर वह शांकरभाष्य नहीं है (जैसे ईशादि उपनिषदें और ब्रह्मसूत्र), वहाँ पुस्तक के नीचे यह लिखा है। जिन रचनाओं पर 'शीघ्र' लिखा है, वे अभी संग्रह में नहीं हैं।",
               "This lists the works that tradition ascribes to Ādi Śaṅkarācārya; the authorship of many is disputed. Where the library holds the text but not Śaṅkara’s commentary on it (the Upaniṣads and the Brahma Sūtras), the line under the book says so. Works marked “Soon” are not in the library yet.")) +
        '</aside>';
    }
    return '<aside class="vg-note"><b>' + esc(tx("वर्गीकरण पर एक टिप्पणी", "A note on classification")) + '</b> ' +
      esc(tx("यह एक चयनित आधारभूत सूची है, सम्पूर्ण ग्रन्थ-सूची नहीं। कुछ ग्रन्थों के कर्तृत्व पर मतभेद है, कुछ के अनेक पाठ-भेद हैं और कुछ एक से अधिक परम्पराओं में आते हैं।",
             "This is a curated foundational catalogue, not an exhaustive bibliography. Some works have disputed attribution, multiple recensions, or belong to more than one tradition.")) +
      '</aside>';
  }

  function pageHtml(ctx) {
    pick(ctx);
    resolve(ctx);
    var tx = ctx.tx, esc = ctx.esc, adv = curKey === "advaita";
    return '<div class="vg-page">' +
      heroHtml(ctx) +
      '<div class="vg-tools">' +
        '<label class="vg-search"><span aria-hidden="true">&#128269;</span>' +
          '<input type="search" id="vgSearch" autocomplete="off" placeholder="' + esc(tx("संस्कृत या अंग्रेज़ी नाम से खोजें…", "Search by Sanskrit or English title…")) + '" value="' + esc(state.q) + '"></label>' +
        '<label class="vg-only"><input type="checkbox" id="vgOnlyLib"' + (state.onlyLib ? " checked" : "") + '> ' + esc(tx("केवल उपलब्ध ग्रंथ", "Only books in the library")) + '</label>' +
      '</div>' +
      (adv ? '' : featureHtml(ctx)) +
      '<div class="vg-label"><span>' + esc(adv ? tx("खण्ड के अनुसार देखें", "Browse by section") : tx("शाखा के अनुसार देखें", "Browse by branch")) + '</span></div>' +
      '<div class="vg-chips" id="vgChips">' + chipsHtml(ctx) + '</div>' +
      '<div class="vg-treebar"><h2>' + esc(adv ? tx("रचना-सूची", "Works") : tx("शास्त्र-वृक्ष", "Scripture tree")) + '</h2>' +
        '<span><button type="button" class="vg-link" id="vgExpand">' + esc(tx("सब खोलें", "Expand all")) + '</button>' +
        '<button type="button" class="vg-link" id="vgCollapse">' + esc(tx("बन्द करें", "Collapse")) + '</button></span></div>' +
      '<div class="vg-tree" id="vgTree">' + treeHtml(ctx) + '</div>' +
      noteHtml(ctx) +
    '</div>';
  }

  /* ---------------- behaviour ---------------- */

  function mount(ctx) {
    var treeEl = document.getElementById("vgTree");
    if (!treeEl) return;
    var chipsEl = document.getElementById("vgChips");
    var input = document.getElementById("vgSearch");
    var timer = null;

    function redraw() { treeEl.innerHTML = treeHtml(ctx); }
    function redrawChips() { chipsEl.innerHTML = chipsHtml(ctx); }

    treeEl.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-vg-toggle]");
      if (!btn) return;
      var k = btn.getAttribute("data-vg-toggle");
      state.open[k] = !state.open[k];
      var box = btn.parentElement, on = !!state.open[k];
      box.classList.toggle("is-open", on);
      btn.setAttribute("aria-expanded", on ? "true" : "false");
    });

    chipsEl.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-vg-branch]");
      if (!chip) return;
      state.branch = chip.getAttribute("data-vg-branch");
      if (state.branch !== "all") state.open[state.branch] = true;
      redrawChips(); redraw();
    });

    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = input.value; redraw(); }, 120);
    });
    document.getElementById("vgOnlyLib").addEventListener("change", function (e) {
      state.onlyLib = e.target.checked; redraw();
    });
    document.getElementById("vgExpand").addEventListener("click", function () {
      CUR.forEach(function (br) {
        state.open[br.k] = true;
        br.groups.forEach(function (g, gi) { state.open[br.k + "/" + gi] = true; });
      });
      redraw();
    });
    document.getElementById("vgCollapse").addEventListener("click", function () {
      state.open = {}; redraw();
    });
  }

  window.SwadhyayVangmay = { pageHtml: pageHtml, mount: mount };
})();
