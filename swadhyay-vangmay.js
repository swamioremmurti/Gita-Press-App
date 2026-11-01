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
          ["Aitareya Upaniṣad", "ऐतरेय उपनिषद्", "ऐतरेयोपनिषद्"], ["Kauṣītaki Upaniṣad", "कौषीतकि उपनिषद्"] ] },
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
        { r: "Śikṣā (phonetics)", d: "शिक्षा", t: [
          ["Pāṇinīya Śikṣā", "पाणिनीय शिक्षा"], ["Yājñavalkya Śikṣā", "याज्ञवल्क्य शिक्षा"], ["Nāradīya Śikṣā", "नारदीय शिक्षा"] ] },
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
          ["Kūrma Purāṇa", "कूर्मपुराण"], ["Matsya Purāṇa", "मत्स्यपुराण", "मत्स्यमहापुराण"],
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

  /* ---------------- helpers ---------------- */

  function norm(s) {
    return String(s || "").normalize("NFC").replace(/[‌‍]/g, "").replace(/\s+/g, " ").trim();
  }
  // search form: lower-case Latin with diacritics stripped, so "rgveda" finds "Ṛgveda"
  function fold(s) {
    return norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  var state = { q: "", branch: "all", onlyLib: false, open: { "shruti": true, "shruti/0": true } };
  var resolved = null;   // TREE with each text's `book` filled in (built once per page view)

  function resolve(ctx) {
    var byFile = {}, list = [];
    (ctx.books || []).forEach(function (b) {
      var f = norm(String(b.file || "").replace(/\.html$/, ""));
      byFile[f] = b; list.push([f, b]);
    });
    var used = 0, total = 0, seen = {};
    TREE.forEach(function (br) {
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
          if (b) { t.book = b; if (!seen[b.file]) { seen[b.file] = 1; used++; } }
        });
      });
    });
    resolved = { total: total, books: used };
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
    var meta = b ? esc(b.author || "") : esc(tx("संग्रह में अभी उपलब्ध नहीं", "Not in the library yet"));
    var body = '<span class="vg-thumb-wrap">' + thumb + '</span>' +
      '<span class="vg-text-body">' +
        '<span class="vg-text-r">' + esc(tx(t[1], t[0])) + '</span>' +
        (tx("", "x") ? '<span class="vg-text-d">' + esc(t[1]) + '</span>' : '') +
        '<span class="vg-text-m">' + meta + '</span>' +
      '</span>' +
      (b ? '<span class="vg-go" aria-hidden="true">›</span>' : '<span class="vg-soon">' + esc(tx("शीघ्र", "Soon")) + '</span>');
    return b
      ? '<a class="vg-text is-open" href="' + esc(ctx.bookPath(b)) + '" title="' + esc(tx("पुस्तक खोलें", "Open in the reader")) + '">' + body + '</a>'
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
    TREE.forEach(function (br) {
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
            '<span class="vg-ic vg-c-' + br.k + '" aria-hidden="true">' + br.ic + '</span>' +
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
    TREE.forEach(function (br) {
      h += '<button type="button" class="vg-chip' + (state.branch === br.k ? " is-on" : "") + '" data-vg-branch="' + br.k + '">' +
        '<span aria-hidden="true">' + br.ic + '</span> ' + esc(tx(br.d, br.r)) + '</button>';
    });
    return h;
  }

  function pageHtml(ctx) {
    resolve(ctx);
    var tx = ctx.tx, esc = ctx.esc;
    return '<div class="vg-page">' +
      '<section class="vg-hero">' +
        '<div class="vg-eyebrow">' + esc(tx("वाङ्मय", "VĀṄMAYA")) + ' &bull; SCRIPTURE EXPLORER</div>' +
        '<h1><span>' + esc(tx("शास्त्रों का अन्वेषण", "Explore the Scriptures")) + '</span></h1>' +
        '<p>' + esc(tx("सनातन धर्म की विशाल ज्ञान-परम्परा को शाखा, वर्ग और ग्रंथ के क्रम से देखें। जो ग्रंथ पुस्तकालय में हैं, उनपर क्लिक करके सीधे पढ़ें।",
                      "Discover the vast knowledge tradition of Sanātana Dharma. Texts that are in this library open straight in the reader.")) + '</p>' +
        '<div class="vg-stats">' +
          '<div><i class="vg-si vg-si-1" aria-hidden="true">&#128214;</i><p><b>' + TREE.length + '</b><span>' + esc(tx("मुख्य शाखाएँ", "Major branches")) + '</span></p></div>' +
          '<div><i class="vg-si vg-si-2" aria-hidden="true">&#128218;</i><p><b>' + resolved.total + '</b><span>' + esc(tx("ग्रंथ-प्रविष्टियाँ", "Book entries")) + '</span></p></div>' +
          '<div class="is-lib"><i class="vg-si vg-si-3" aria-hidden="true">&#128215;</i><p><b>' + resolved.books + '</b><span>' + esc(tx("पुस्तकालय में उपलब्ध", "Available in the library")) + '</span></p></div>' +
          '<div><i class="vg-si vg-si-4" aria-hidden="true">ॐ</i><p><b>संस्कृत</b><span>' + esc(tx("मूल परम्परा", "Core tradition")) + '</span></p></div>' +
        '</div>' +
      '</section>' +
      '<div class="vg-tools">' +
        '<label class="vg-search"><span aria-hidden="true">&#128269;</span>' +
          '<input type="search" id="vgSearch" autocomplete="off" placeholder="' + esc(tx("संस्कृत या अंग्रेज़ी नाम से खोजें…", "Search by Sanskrit or English title…")) + '" value="' + esc(state.q) + '"></label>' +
        '<label class="vg-only"><input type="checkbox" id="vgOnlyLib"' + (state.onlyLib ? " checked" : "") + '> ' + esc(tx("केवल उपलब्ध ग्रंथ", "Only books in the library")) + '</label>' +
      '</div>' +
      '<div class="vg-label"><span>' + esc(tx("शाखा के अनुसार देखें", "Browse by branch")) + '</span></div>' +
      '<div class="vg-chips" id="vgChips">' + chipsHtml(ctx) + '</div>' +
      '<div class="vg-treebar"><h2>' + esc(tx("शास्त्र-वृक्ष", "Scripture tree")) + '</h2>' +
        '<span><button type="button" class="vg-link" id="vgExpand">' + esc(tx("सब खोलें", "Expand all")) + '</button>' +
        '<button type="button" class="vg-link" id="vgCollapse">' + esc(tx("बन्द करें", "Collapse")) + '</button></span></div>' +
      '<div class="vg-tree" id="vgTree">' + treeHtml(ctx) + '</div>' +
      '<aside class="vg-note"><b>' + esc(tx("वर्गीकरण पर एक टिप्पणी", "A note on classification")) + '</b> ' +
        esc(tx("यह एक चयनित आधारभूत सूची है, सम्पूर्ण ग्रन्थ-सूची नहीं। कुछ ग्रन्थों के कर्तृत्व पर मतभेद है, कुछ के अनेक पाठ-भेद हैं और कुछ एक से अधिक परम्पराओं में आते हैं।",
               "This is a curated foundational catalogue, not an exhaustive bibliography. Some works have disputed attribution, multiple recensions, or belong to more than one tradition.")) +
      '</aside>' +
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
      TREE.forEach(function (br) {
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
