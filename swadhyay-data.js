// Book catalogue -- 567 real book files. Per book: author, tikakar (commentator), translator and
// publisher, as printed in the book itself (title page / front matter). Several people in one
// field are separated by "; ". An empty string means the book does not state it.
// Optional "swith_arth": "yes" switches on the reader's अर्थ show/hide button (meaning, commentary and
// footnotes can be hidden so only the shloks/chaupais and their speaker labels remain -- for पाठ). The same
// entry then needs "arth_hide": the book's own paragraph classes that carry that meaning, comma separated
// ("Name" = that exact class, "Name*" = any class containing Name, "Name!Other" = Name unless the paragraph also has Other). Classes differ per edition, so check
// the book's HTML first; a tagged book without "arth_hide" gets no button.
var SWADHYAY_BOOKS_RAW = [
    {
        "file":  "मानस-मुक्ता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  111.9
    },
    {
        "file":  "यह कलियुग है!.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  89
    },
    {
        "file":  "जीवन्मुक्तिके रहस्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  273.2
    },
    {
        "file":  "मेरे नाथ! मेरे प्रभो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  113
    },
    {
        "file":  "ईस्वर अंस जीव अबिनासी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  665.4
    },
    {
        "file":  "अयोध्या-माहात्म्य.html",
        "category":  "Teerth Sthal",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रीविश्वेश्वरीप्रसादजी शुक्ल",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1806.1
    },
    {
        "file":  "श्रीलिङ्ग-महापुराण (केवल हिन्दी).html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3463.1
    },
    {
        "file":  "गीता चिंतन.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2071.3
    },
    {
        "file":  "शिव स्तोत्र रत्नाकर.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  821.1
    },
    {
        "file":  "श्रीकृष्ण विज्ञान.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "पुरोहित रामप्रताप",
        "publisher":  "",
        "sizeKB":  475.8
    },
    {
        "file":  "अमोघ शिवकवच.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  53.6
    },
    {
        "file":  "आदित्यहृदयस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  29.3
    },
    {
        "file":  "श्रीहनुमानचालीसा.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  116.3
    },
    {
        "file":  "रामरक्षास्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  32.8
    },
    {
        "file":  "तिरुपति-यात्रा.html",
        "category":  "Teerth Sthal",
        "author":  "डॉ. आकेल्ल विभीषण शर्मा",
        "tikakar":  "",
        "translator":  "डॉ. एस.टी. अरुण कुमारी",
        "publisher":  "तिरुमल तिरुपति देवस्थानम्, तिरुपति",
        "sizeKB":  253.7
    },
    {
        "file":  "अयोध्या-दर्शन.html",
        "category":  "Teerth Sthal",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  444.3
    },
    {
        "file":  "चित्त शुद्धि भाग - 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  673.9
    },
    {
        "file":  "चित्त शुद्धि भाग - 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  849.6
    },
    {
        "file":  "जीवन पथ.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  424.6
    },
    {
        "file":  "जीवन-दर्शन भाग 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  518.7
    },
    {
        "file":  "जीवन-दर्शन भाग 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  574.5
    },
    {
        "file":  "दर्शन और नीति.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  341.6
    },
    {
        "file":  "दुःख का प्रभाव.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  403.7
    },
    {
        "file":  "पथ प्रदीप.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  246.7
    },
    {
        "file":  "पाथेय - 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  519.1
    },
    {
        "file":  "पाथेय - 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  453.4
    },
    {
        "file":  "प्रबोधनी.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  58.7
    },
    {
        "file":  "प्रश्नोत्तरी संतवाणी - 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  356.9
    },
    {
        "file":  "प्रश्नोत्तरी संतवाणी - 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  542.9
    },
    {
        "file":  "प्रार्थना तथा पद.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  33.1
    },
    {
        "file":  "प्रेरणा पथ.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  729.3
    },
    {
        "file":  "मंगलमय विधान.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  236.5
    },
    {
        "file":  "मानव की मांग.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  844.1
    },
    {
        "file":  "मानव सेवा संघ परिचय.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  221.2
    },
    {
        "file":  "मानवता के मूल सिधान्त.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  285.7
    },
    {
        "file":  "मानव–दर्शन.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  717.5
    },
    {
        "file":  "मूक-सत्संग तया नित्य-योग.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  764.6
    },
    {
        "file":  "मैं की खोज.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  190.1
    },
    {
        "file":  "रजत जयन्ती स्मारिका.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  987.2
    },
    {
        "file":  "सत्संग और साधन.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  231.8
    },
    {
        "file":  "सन्त उद्बोधन.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  720.0
    },
    {
        "file":  "सन्त-जीवन-दर्पण.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  325.8
    },
    {
        "file":  "सन्त पत्रावली - 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  551.5
    },
    {
        "file":  "सन्त पत्रावली - 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  673.0
    },
    {
        "file":  "सन्त पत्रावली - 3.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  293.4
    },
    {
        "file":  "सन्त वाणी भाग -1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  464.0
    },
    {
        "file":  "सन्त वाणी भाग -2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  494.1
    },
    {
        "file":  "सन्त वाणी भाग -3.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  507.9
    },
    {
        "file":  "सन्त वाणी भाग -4.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  797.9
    },
    {
        "file":  "सन्त वाणी भाग -5B.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  423.2
    },
    {
        "file":  "सन्त वाणी भाग -6.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  574.1
    },
    {
        "file":  "सन्त वाणी भाग -7.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  575.4
    },
    {
        "file":  "सन्त वाणी भाग -8.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  501.6
    },
    {
        "file":  "सन्त वाणी भाग- 5A.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  383.6
    },
    {
        "file":  "सन्त समागम भाग - 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  716.2
    },
    {
        "file":  "सन्त समागम भाग - 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  505.4
    },
    {
        "file":  "सन्त समागम भाग - 3.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  490.1
    },
    {
        "file":  "सन्त सौरभ (सन्त वाणी ).html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  890.8
    },
    {
        "file":  "सन्त हृदयोद्गार.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  112.2
    },
    {
        "file":  "साधन-तत्त्व.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  333.4
    },
    {
        "file":  "साधन-त्रिवेणी.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  392.6
    },
    {
        "file":  "साधन-निधि.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  237.7
    },
    {
        "file":  "शिव-आराधना.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  108.8
    },
    {
        "file":  "u_बृहदारण्यकोपनिषत्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  624
    },
    {
        "file":  "अच्छे बनो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  273.3
    },
    {
        "file":  "अध्यात्म-पथ-प्रदर्शक.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी चिदानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1678
    },
    {
        "file":  "अध्यात्मरामायण.html",
        "category":  "Itihasas",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रीमुनिलाल गुप्त",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2900.9
    },
    {
        "file":  "अध्यात्मविषयक पत्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  493.7
    },
    {
        "file":  "अनन्य भक्तिसे भगवत्प्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  647.8
    },
    {
        "file":  "अनन्यभक्ति कैसे प्राप्त हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  434.6
    },
    {
        "file":  "अनुराग पदावली.html",
        "category":  "Bajans",
        "author":  "श्रीसूरदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  890.4
    },
    {
        "file":  "अनुस्मृति.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  28.9
    },
    {
        "file":  "अन्त्यकर्म श्राद्धप्रकाश.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "पं० श्रीजोषणरामजी पाण्डेय ‘अग्निहोत्री’; पं० श्रीलालबिहारीजी मिश्र; पं० श्रीरामकृष्णजी शास्त्री",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3183.9
    },
    {
        "file":  "अपात्रको भी भगवत्प्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  616.8
    },
    {
        "file":  "अमरता की ओर.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  358.6
    },
    {
        "file":  "अमूल्य वचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  848.2
    },
    {
        "file":  "अमूल्य शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  626.7
    },
    {
        "file":  "अमूल्य समय का सदुपयोग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  462.1
    },
    {
        "file":  "अमृत कण.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1156.2
    },
    {
        "file":  "अमृत के घूँट.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० रामचरण महेन्द्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  782.9
    },
    {
        "file":  "अमृत बिन्दु.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  368.2
    },
    {
        "file":  "अमृत वचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  502.7
    },
    {
        "file":  "अवतार का सिद्धान्त.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  64.8
    },
    {
        "file":  "अष्टावक्रगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  224
    },
    {
        "file":  "असीम नीचता और असीम साधुता.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  427.6
    },
    {
        "file":  "आचार्य के सदुपेदश.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  74
    },
    {
        "file":  "आत्मकल्याण के विविध उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  426.2
    },
    {
        "file":  "आत्मोद्धारके सरल उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  812.7
    },
    {
        "file":  "आत्मोद्धारके साधन भाग - १.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  754.7
    },
    {
        "file":  "आदर्श उपकार.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  442.5
    },
    {
        "file":  "आदर्श कहानियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  321.4
    },
    {
        "file":  "आदर्श देवियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  207.6
    },
    {
        "file":  "आदर्श नारी सुशीला.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  170
    },
    {
        "file":  "आदर्श भक्त.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  294.5
    },
    {
        "file":  "आदर्श भ्रातृ प्रेम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  286.7
    },
    {
        "file":  "आदर्श मानव हृदय.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  430.3
    },
    {
        "file":  "आध्यात्मिक कहानियाँ.html",
        "category":  "Siksha evam Katha",
        "author":  "सुदर्शनसिंह ‘चक्र’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  728.8
    },
    {
        "file":  "आध्यात्मिक प्रवचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  580.5
    },
    {
        "file":  "आनन्द का स्वरूप.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  756.8
    },
    {
        "file":  "आनन्द की लहरें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  120.7
    },
    {
        "file":  "आनन्द कैसे मिले.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  390.6
    },
    {
        "file":  "आनन्द मार्ग.html",
        "category":  "Siksha evam Katha",
        "author":  "चौधरी रघुनन्दनप्रसाद सिंह",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  906.5
    },
    {
        "file":  "आनन्दमय जीवन.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० रामचरण महेन्द्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  775.1
    },
    {
        "file":  "आरती-संग्रह.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  216.8
    },
    {
        "file":  "आवश्यक शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  319.7
    },
    {
        "file":  "आवागमन से मुक्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  411.9
    },
    {
        "file":  "इसी जन्ममें परमात्मप्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  532.1
    },
    {
        "file":  "ईशावास्योपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  105.4
    },
    {
        "file":  "केनोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  142.3
    },
    {
        "file":  "कठोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  454.1
    },
    {
        "file":  "प्रश्नोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "जगद्गुरु आदि शंकराचार्य",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  419.9
    },
    {
        "file":  "मुण्डकोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  272.4
    },
    {
        "file":  "माण्डूक्योपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  90
    },
    {
        "file":  "ऐतरेयोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  166
    },
    {
        "file":  "तैत्तिरीयोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  494.6
    },
    {
        "file":  "श्वेताश्वतरोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  450.5
    },
    {
        "file":  "ईश्वर और संसार.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  943.7
    },
    {
        "file":  "ईश्वर की सत्ता और महत्ता.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1510
    },
    {
        "file":  "ईश्वर दयालु और न्यायकारी है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  47.5
    },
    {
        "file":  "ईश्वर.html",
        "category":  "Siksha evam Katha",
        "author":  "महामना मदनमोहन मालवीय",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  98.1
    },
    {
        "file":  "ईश्वरसाक्षात्कार के लिये नाम-जप सर्वोपरि साधन है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  54.7
    },
    {
        "file":  "उद्धव संदेश.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० महानामव्रत ब्रह्मचारी",
        "tikakar":  "",
        "translator":  "चतुर्भुज तोषनीवाल",
        "publisher":  "गीताप्रेस",
        "sizeKB":  732.3
    },
    {
        "file":  "उद्धार कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  337
    },
    {
        "file":  "उपदेशप्रद कहानियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  615.2
    },
    {
        "file":  "उपनिषदों के चौदह रत्न.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  289
    },
    {
        "file":  "एक नयी बात.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  95.2
    },
    {
        "file":  "एक महात्मा का प्रसाद.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  884.2
    },
    {
        "file":  "एक महापुरुषके अनुभवकी बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  403.8
    },
    {
        "file":  "एक लोटा पानी.html",
        "category":  "Siksha evam Katha",
        "author":  "श्री पारसनाथ सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  463.7
    },
    {
        "file":  "एक संत की वसीयत.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  46.9
    },
    {
        "file":  "एकादशी व्रत का माहात्म्य.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  297
    },
    {
        "file":  "एकै साधै सब सधै.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  248.8
    },
    {
        "file":  "कर्णवास का सत्संग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  493.1
    },
    {
        "file":  "कर्म रहस्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  262.3
    },
    {
        "file":  "कर्मयोग का तत्त्व.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1309.7
    },
    {
        "file":  "कलेजे के अक्षर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  425.4
    },
    {
        "file":  "कल्याण कुंज.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  402.4
    },
    {
        "file":  "कल्याण पथ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  511.2
    },
    {
        "file":  "कल्याण प्राप्ति के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1070.3
    },
    {
        "file":  "भक्त-चरिताङ्क.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  7371.3
    },
    {
        "file":  "कल्याणकारी आचरण.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  61.7
    },
    {
        "file":  "कल्याणकारी दोहा संग्रह.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  452.9
    },
    {
        "file":  "कल्याणकारी प्रवचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  436
    },
    {
        "file":  "कवितावली.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "इन्द्रदेवनारायण",
        "publisher":  "गीताप्रेस",
        "sizeKB":  646.4
    },
    {
        "file":  "किसान और गाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  142.2
    },
    {
        "file":  "क्या करें क्या न करें.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1098.5
    },
    {
        "file":  "क्या गुरु बिना मुक्ति नहीं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  207.9
    },
    {
        "file":  "गंगालहरी.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  80
    },
    {
        "file":  "गजलगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  8.8
    },
    {
        "file":  "गजेंद्रमोक्ष.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  58.2
    },
    {
        "file":  "गणेशस्तोत्ररत्नाकर.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "swith_arth":  "yes",
        "arth_hide":  "Normal!center-tight, Footnotes*, para-style-override-7",
        "sizeKB":  1014.2
    },
    {
        "file":  "गयाश्राद्धपद्धति_माहात्म्य तथा_गयायात्राविधानसहित.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "पं० श्रीरामकृष्णजी शास्त्री",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  926.1
    },
    {
        "file":  "गीता के परम प्रचारक.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1674.9
    },
    {
        "file":  "गीता ज्ञान प्रवेशिका.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1385.8
    },
    {
        "file":  "गीता दर्पण.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2714.2
    },
    {
        "file":  "गीता पढ़ने के लाभ.html",
        "category":  "Gita",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  68.7
    },
    {
        "file":  "गीता बाल प्रश्नोत्तरी.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  185.5
    },
    {
        "file":  "गीता माधुर्य.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  465.1
    },
    {
        "file":  "गीता माधुर्यम्.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  437.6
    },
    {
        "file":  "गीता संग्रह.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2218.3
    },
    {
        "file":  "गीता-निबन्धावली.html",
        "category":  "Gita",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  233.7
    },
    {
        "file":  "गीता-प्रबोधनी.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1390.2
    },
    {
        "file":  "गीतावली.html",
        "category":  "Gita",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1326.5
    },
    {
        "file":  "गीतोक्त संन्यास या सांख्ययोग का स्वरूप.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  102.3
    },
    {
        "file":  "गुरु और माता-पिता के भक्त बालक.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  156
    },
    {
        "file":  "गृहस्थमें कैसे रहें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  461.7
    },
    {
        "file":  "गो सेवा के चमत्कार.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  237.3
    },
    {
        "file":  "गोपी प्रेम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  164.1
    },
    {
        "file":  "गोवध भारतका कलंक एवं गायका माहात्म्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  156.6
    },
    {
        "file":  "चिन्ता शोक कैसे मिटें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  518.3
    },
    {
        "file":  "चेतावनी और सामयिक चेतावनी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  119
    },
    {
        "file":  "चेतावनी पद संग्रह.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  684
    },
    {
        "file":  "चोखी कहानियाँ.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  168.6
    },
    {
        "file":  "जन्म-मरण से छुटकारा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  407
    },
    {
        "file":  "जानकी मंगल.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  160.6
    },
    {
        "file":  "जित देखूँ तित तू.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  513.3
    },
    {
        "file":  "जिन खोजा तिन पाइया.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  320.9
    },
    {
        "file":  "जीवन का कर्तव्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  591.6
    },
    {
        "file":  "जीवन का सत्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  279.8
    },
    {
        "file":  "जीवन में नया प्रकाश.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० रामचरण महेन्द्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  907.5
    },
    {
        "file":  "जीवन संजीवनी.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० श्रीराजारामजी गुप्ता",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1246.6
    },
    {
        "file":  "जीवन सुधार की बातें.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  524.9
    },
    {
        "file":  "जीवनचर्या विज्ञान.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी शंकरानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1063
    },
    {
        "file":  "जीवनोपयोगी कल्याण मार्ग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  181.2
    },
    {
        "file":  "जीवनोपयोगी प्रवचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  389.8
    },
    {
        "file":  "जैमिनीकृत महाभारतमें भक्तोंकी गाथा.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2001.4
    },
    {
        "file":  "ज्ञान के दीप जले.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  804.3
    },
    {
        "file":  "ज्ञान मणि माला.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीमगनलाल हरिभाई व्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  203
    },
    {
        "file":  "ज्ञानयोग का तत्त्व.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1200.4
    },
    {
        "file":  "तत्त्वचिन्तामणि.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  10508.2
    },
    {
        "file":  "तत्त्वज्ञान कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  404.4
    },
    {
        "file":  "तत्त्वविचार.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीज्वालाप्रसादजी कानोड़िया",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  609.3
    },
    {
        "file":  "तर्पण विधि.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  80.2
    },
    {
        "file":  "तात्त्विक प्रवचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  281.1
    },
    {
        "file":  "तुलसी दल.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  864.8
    },
    {
        "file":  "तू ही तू.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  117.8
    },
    {
        "file":  "त्याग की महिमा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  408.6
    },
    {
        "file":  "त्याग से भगवत्प्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  47.6
    },
    {
        "file":  "त्रिपिण्डीश्राद्धपद्धति.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "पं० श्रीरामकृष्णजी शास्त्री",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  431.4
    },
    {
        "file":  "दत्तात्रेय वज्र कवच.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  96.5
    },
    {
        "file":  "दाम्पत्य जीवन का आदर्श.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  458.3
    },
    {
        "file":  "दिव्य सन्देश.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  52.4
    },
    {
        "file":  "दिव्य सुख की सरिता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  320.6
    },
    {
        "file":  "दीन-दुखियों के प्रति कर्तव्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  75
    },
    {
        "file":  "दुःखोंका नाश कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  509.4
    },
    {
        "file":  "दुख क्यों होते हैं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  890.1
    },
    {
        "file":  "दुख में भगवत्कृपा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  744.7
    },
    {
        "file":  "दुर्गति से बचो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  112
    },
    {
        "file":  "देवर्षि नारद.html",
        "category":  "Siksha evam Katha",
        "author":  "चतुर्वेदी पं० श्रीद्वारकाप्रसाद शर्मा",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  700.8
    },
    {
        "file":  "देवीस्तोत्ररत्नाकर.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  923.7
    },
    {
        "file":  "देश की वर्तमान दशा तथा उसका परिणाम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  236.3
    },
    {
        "file":  "दैनिक कल्याण सूत्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  244.5
    },
    {
        "file":  "दोहावली.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "publisher":  "गीताप्रेस",
        "sizeKB":  581.7
    },
    {
        "file":  "धर्म के नाम पर पाप.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  121.5
    },
    {
        "file":  "धर्म क्या है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  38.8
    },
    {
        "file":  "धर्मसे लाभ और अधर्म से हानि.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  689.2
    },
    {
        "file":  "ध्यान और मानसिक पूजा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  98.8
    },
    {
        "file":  "ध्यानावस्था में प्रभु से वार्तालाप.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  107.6
    },
    {
        "file":  "नल दमयन्ती.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  161.6
    },
    {
        "file":  "नवधा भक्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  313
    },
    {
        "file":  "नाम जप की महिमा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  59.1
    },
    {
        "file":  "नारद भक्ति सूत्र.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  35.3
    },
    {
        "file":  "नारी धर्म.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  138.1
    },
    {
        "file":  "नारी-शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  500.5
    },
    {
        "file":  "नित्यकर्म-पूजाप्रकाश.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "परमाचार्य पं. श्रीरामभवनजी मिश्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1335.1
    },
    {
        "file":  "नित्यकर्म-प्रयोग.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  440.3
    },
    {
        "file":  "नित्ययोग की प्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  388.6
    },
    {
        "file":  "निष्काम श्रद्धा और प्रेम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  593.1
    },
    {
        "file":  "निष्कामभाव से भगवत्प्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  417.6
    },
    {
        "file":  "नेत्रों में भगवान् को बसा लें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  401.6
    },
    {
        "file":  "नैवेद्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  815.6
    },
    {
        "file":  "पंचदेव अथर्वशीर्ष संग्रह.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  228.6
    },
    {
        "file":  "पद-रत्नाकर.html",
        "category":  "Bajans",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3412.2
    },
    {
        "file":  "पदच्छेद.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1839.7
    },
    {
        "file":  "परम पिता से प्रार्थना.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  26.7
    },
    {
        "file":  "परम शान्ति का मार्ग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1244.7
    },
    {
        "file":  "परम साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1182.6
    },
    {
        "file":  "परम सेवा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  663.1
    },
    {
        "file":  "परमानन्द की खेती.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  703.8
    },
    {
        "file":  "परमार्थ की मन्दाकिनी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  369.5
    },
    {
        "file":  "परमार्थ सूत्र संग्रह.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  622.7
    },
    {
        "file":  "परलोक और पुनर्जन्म.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  82.1
    },
    {
        "file":  "परलोक और पुनर्जन्मकी सत्य घटनाएँ.html",
        "category":  "Siksha evam Katha",
        "author":  "भक्त रामशरणदास पिलखुआ",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  494.3
    },
    {
        "file":  "परोपकार और सच्चाई का फल.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  451
    },
    {
        "file":  "पाण्डवगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  78.8
    },
    {
        "file":  "पातञ्जलयोगदर्शन.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीहरिकृष्णदास गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  572
    },
    {
        "file":  "पातञ्जलयोगप्रदीप.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीस्वामी ओमानन्द तीर्थ",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  4191.4
    },
    {
        "file":  "पारमार्थिक पत्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  665.2
    },
    {
        "file":  "पार्वती मंगल.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  116.9
    },
    {
        "file":  "पिता की सीख.html",
        "category":  "Siksha evam Katha",
        "author":  "श्री हनुमानप्रसाद गोयल",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  402.5
    },
    {
        "file":  "पुरुषोत्तमसहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  221.8
    },
    {
        "file":  "पूजा के फूल.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "भूपेन्द्रनाथ देवशर्मा",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1231.8
    },
    {
        "file":  "पूर्ण-समर्पण_भगवच्चर्चा भाग-६.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1233.1
    },
    {
        "file":  "पौराणिक कथाएँ.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  413.1
    },
    {
        "file":  "पौराणिक कहानियाँ.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  403.5
    },
    {
        "file":  "प्रतिकूलता में प्रसन्नता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  430.3
    },
    {
        "file":  "प्रत्यक्ष भगवद्दर्शन के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  756.2
    },
    {
        "file":  "प्रश्नोत्तर मणिमाला.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  600.4
    },
    {
        "file":  "प्रश्नोत्तरी.html",
        "category":  "Siksha evam Katha",
        "author":  "जगद्गुरु आदि शंकराचार्य",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  47.4
    },
    {
        "file":  "प्राचीन भक्त.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  458.3
    },
    {
        "file":  "प्रार्थना.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  222.2
    },
    {
        "file":  "प्रेम का सच्चा स्वरूप.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  55.9
    },
    {
        "file":  "प्रेम के वश में भगवान्.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  409.5
    },
    {
        "file":  "प्रेम दर्शन (नारद भक्ति सूत्र की व्याख्या).html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  586.5
    },
    {
        "file":  "प्रेम में विलक्षण एकता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  554.2
    },
    {
        "file":  "प्रेम योग.html",
        "category":  "Siksha evam Katha",
        "author":  "वियोगी हरि",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1034.9
    },
    {
        "file":  "प्रेम सत्संग सुधा माला.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  666.9
    },
    {
        "file":  "प्रेमयोग का तत्त्व.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1224.4
    },
    {
        "file":  "प्रेमी भक्त उद्धव.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीशान्तनुविहारीजी द्विवेदी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  194.2
    },
    {
        "file":  "प्रेमी भक्त.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  271
    },
    {
        "file":  "प्रेरक कहानियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  241.4
    },
    {
        "file":  "बड़ोंके जीवन से शिक्षा.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  224.1
    },
    {
        "file":  "बलिवैश्वदेव-विधि.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  37.1
    },
    {
        "file":  "बाल अमृत वचन.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  64.6
    },
    {
        "file":  "बाल प्रश्नोत्तरी.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  67.4
    },
    {
        "file":  "बाल शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  192.5
    },
    {
        "file":  "बालकों की बोलचाल.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  42.3
    },
    {
        "file":  "बालकों के कर्तव्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  263.4
    },
    {
        "file":  "ब्रह्मचर्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  94.7
    },
    {
        "file":  "भक्त कुसुम.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  244.6
    },
    {
        "file":  "भक्त चन्द्रिका.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  256.9
    },
    {
        "file":  "भक्त दिवाकर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  327.4
    },
    {
        "file":  "भक्त नरसिंह मेहता.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  492
    },
    {
        "file":  "भक्त नारी.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  188.2
    },
    {
        "file":  "भक्त बालक.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  211.4
    },
    {
        "file":  "भक्त महिलारत्न.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  291.6
    },
    {
        "file":  "भक्त रत्नाकर .html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  307.2
    },
    {
        "file":  "भक्त सरोज.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  317.9
    },
    {
        "file":  "भक्त सुधाकर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  311.4
    },
    {
        "file":  "भक्त सुमन.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  334.4
    },
    {
        "file":  "भक्त सौरभ.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  337.2
    },
    {
        "file":  "भक्त-पंचरत्न.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  280.9
    },
    {
        "file":  "भक्त-सप्तरत्न.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  271.8
    },
    {
        "file":  "भक्तराज ध्रुव.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीशान्तनुविहारीजी द्विवेदी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  146.3
    },
    {
        "file":  "भक्तराज हनुमान्.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीशान्तनुविहारीजी द्विवेदी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  241.5
    },
    {
        "file":  "भक्ति भक्त भगवान्.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  806.9
    },
    {
        "file":  "भक्ति सुधा.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी श्रीकरपात्रीजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6390.2
    },
    {
        "file":  "भगवच्चर्चा (भाग-५).html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1245.5
    },
    {
        "file":  "भगवच्चर्चा (सभी छहों भाग एक साथ).html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6773.2
    },
    {
        "file":  "भगवच्चर्चा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1247.4
    },
    {
        "file":  "भगवत्तत्त्व.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  146
    },
    {
        "file":  "भगवत्पथ दर्शन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  538.9
    },
    {
        "file":  "भगवत्प्राप्ति एवं हिंदू संस्कृति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1288
    },
    {
        "file":  "भगवत्प्राप्ति कठिन नहीं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  414.8
    },
    {
        "file":  "भगवत्प्राप्ति की युक्तियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  414.8
    },
    {
        "file":  "भगवत्प्राप्ति की सुगमता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  432.8
    },
    {
        "file":  "भगवत्प्राप्ति के विविध उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  152.6
    },
    {
        "file":  "भगवत्प्राप्ति के सुगम साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  402.6
    },
    {
        "file":  "भगवत्प्राप्ति कैसे ह.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  399.2
    },
    {
        "file":  "भगवत्प्राप्ति सहज है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  470
    },
    {
        "file":  "भगवत्प्राप्तिकी अमूल्य बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  399.5
    },
    {
        "file":  "भगवत्प्राप्तिमें भावकी प्रधानता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  585
    },
    {
        "file":  "भगवत्प्रेम प्राप्ति के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  503.7
    },
    {
        "file":  "भगवत्प्रेमकी प्राप्ति कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  141
    },
    {
        "file":  "भगवद्दर्शन की उत्कण्ठा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  833.4
    },
    {
        "file":  "भगवन्नाम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  227.5
    },
    {
        "file":  "भगवान_् और उनकी भक्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  401.5
    },
    {
        "file":  "भगवान_् के रहने के पाँच स्थान.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  181
    },
    {
        "file":  "भगवान_् के सामने सच्चा सो सच्चा.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  417.3
    },
    {
        "file":  "भगवान_् पर विश्वास.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  191.3
    },
    {
        "file":  "भगवान_् से अपनापन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  283.2
    },
    {
        "file":  "भगवान् का हेतु रहित सौहार्द.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  56.6
    },
    {
        "file":  "भगवान् की दया.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  107.9
    },
    {
        "file":  "भगवान् की पूजा के पुष्प.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  446
    },
    {
        "file":  "भगवान् के स्वभाव का रहस्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  643.9
    },
    {
        "file":  "भगवान् क्या है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  92
    },
    {
        "file":  "भगवान् श्रीकृष्ण की कृपा तथा दिव्य प्रेमकी प्राप्तिके लिये.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  64.2
    },
    {
        "file":  "भगवान् सदा तुम्हारे साथ हैं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  469.5
    },
    {
        "file":  "भगवान् कैसे मिलें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  409.2
    },
    {
        "file":  "भजन-संग्रह.html",
        "category":  "Bajans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1271.6
    },
    {
        "file":  "भजनामृत.html",
        "category":  "Bajans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  348.6
    },
    {
        "file":  "भले का फल भला.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  85.5
    },
    {
        "file":  "भवरोगकी रामबाण दवा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  513.4
    },
    {
        "file":  "भागवत नवनीत.html",
        "category":  "Siksha evam Katha",
        "author":  "सन्त श्रीरामचन्द्र केशव डोंगरेजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3970.7
    },
    {
        "file":  "भागवतरत्न प्रह्लाद.html",
        "category":  "Siksha evam Katha",
        "author":  "चतुर्वेदी पं० श्रीद्वारकाप्रसाद शर्मा",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  985.3
    },
    {
        "file":  "भागवतस्तुतिसंग्रह.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "पं० नित्यानन्द पाण्डेय",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2387.6
    },
    {
        "file":  "भारतीय संस्कृति तथा शास्त्रों में नारी धर्म.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  160.8
    },
    {
        "file":  "भीष्मस्तवराज.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  33.5
    },
    {
        "file":  "भूले न भुलाये.html",
        "category":  "Siksha evam Katha",
        "author":  "रामेश्वर टांटिया",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  504.3
    },
    {
        "file":  "मधुर.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1019.8
    },
    {
        "file":  "मन को वश करने के कुछ उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  62.3
    },
    {
        "file":  "मनुष्य का परम कर्तव्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1261.2
    },
    {
        "file":  "मनुष्य जीवन का उद्देश्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  416
    },
    {
        "file":  "मनुष्य जीवन की सफलता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1107.7
    },
    {
        "file":  "महत्त्वपूर्ण कल्याणकारी बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  406.4
    },
    {
        "file":  "महत्त्वपूर्ण चेतावनी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  423.1
    },
    {
        "file":  "महत्त्वपूर्ण प्रश्नोत्तर.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  903.9
    },
    {
        "file":  "महत्वपूर्ण शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1482.1
    },
    {
        "file":  "महाकुम्भ पर्व.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  210.7
    },
    {
        "file":  "महात्मा किसे कहते हैं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  76.3
    },
    {
        "file":  "महात्मा विदुर.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीशान्तनुविहारीजी द्विवेदी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  168
    },
    {
        "file":  "महात्माओं की अहैतु की दया.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  403.7
    },
    {
        "file":  "महापाप से बचो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  136.9
    },
    {
        "file":  "महाभारत के कुछ आदर्श पात्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  407.9
    },
    {
        "file":  "महाभाव कल्लोलिनी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  245.5
    },
    {
        "file":  "माघ मास माहात्म्य.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  195.1
    },
    {
        "file":  "मातृशक्ति का घोर अपमान.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  154
    },
    {
        "file":  "मानव कल्याण के साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  759.6
    },
    {
        "file":  "मानव जीवन का लक्ष्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  867.4
    },
    {
        "file":  "मानव धर्म.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  303.8
    },
    {
        "file":  "मानवता का पुजारी.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  418.3
    },
    {
        "file":  "मानवमात्र के कल्याण के लिये.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  734.1
    },
    {
        "file":  "मानस में नाम-वन्दना.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  544.2
    },
    {
        "file":  "मानस रहस्य.html",
        "category":  "Siksha evam Katha",
        "author":  "जयरामदास ‘दीन’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1680.8
    },
    {
        "file":  "मानस शंका समाधान.html",
        "category":  "Siksha evam Katha",
        "author":  "जयरामदास ‘दीन’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  584.9
    },
    {
        "file":  "मानसिक दक्षता.html",
        "category":  "Siksha evam Katha",
        "author":  "श्री राजेन्द्र बिहारी लाल",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1035.3
    },
    {
        "file":  "मूर्ति पूजा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  74.5
    },
    {
        "file":  "मेरा अनुभव.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  582.8
    },
    {
        "file":  "मेरे तो गिरधर गोपाल.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  413
    },
    {
        "file":  "यह विकास है या विनाश जरा सोचिये.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  103.7
    },
    {
        "file":  "रहस्यमय प्रवचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  567
    },
    {
        "file":  "रामस्तवराज.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  77.9
    },
    {
        "file":  "रामाज्ञा प्रश्न.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  274.7
    },
    {
        "file":  "रामायण के कुछ आदर्श पात्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  511.9
    },
    {
        "file":  "रुद्राष्टाध्यायी.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  532
    },
    {
        "file":  "लघुसिद्धान्तकौमुदी.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1295.3
    },
    {
        "file":  "लोक परलोक का सुधार.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  663.7
    },
    {
        "file":  "वर्तमान शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  155.7
    },
    {
        "file":  "वासुदेवः सर्वम्.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  224.9
    },
    {
        "file":  "वास्तविक त्याग.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  378.3
    },
    {
        "file":  "वास्तविक सुख.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  335.8
    },
    {
        "file":  "विदुरनीति.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  475.8
    },
    {
        "file":  "विनय-पत्रिका.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1449
    },
    {
        "file":  "विरह पदावली.html",
        "category":  "Bajans",
        "author":  "श्रीसूरदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  853.7
    },
    {
        "file":  "विवाह में दहेज.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  38.9
    },
    {
        "file":  "विवेक चूडामणि.html",
        "category":  "Vedant",
        "author":  "जगद्गुरु आदि शंकराचार्य",
        "tikakar":  "",
        "translator":  "श्रीमुनिलाल गुप्त",
        "publisher":  "गीताप्रेस",
        "sizeKB":  553.1
    },
    {
        "file":  "वीर बालक.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  178.5
    },
    {
        "file":  "वेदान्त-दर्शन (ब्रह्मसूत्र).html",
        "category":  "Vedant",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1975.4
    },
    {
        "file":  "योग-दर्शन.html",
        "category":  "Vedant",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  521.8
    },
    {
        "file":  "वैदिक सूक्त संग्रह.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  940.4
    },
    {
        "file":  "वैराग्य संदीपनी.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  53.4
    },
    {
        "file":  "वैराग्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  88.9
    },
    {
        "file":  "वैशाख कार्तिक माघ मास माहात्म्य.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1148.3
    },
    {
        "file":  "व्यवहार और परमार्थ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  820
    },
    {
        "file":  "व्यवहार दर्शन पीयूष.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रद्धेय ब्रह्मचारी श्रीत्र्यम्बकेश्वरजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  320.1
    },
    {
        "file":  "व्यवहार सुधार और परमार्थ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  392.5
    },
    {
        "file":  "व्यवहारमें परमार्थकी कला.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  756.7
    },
    {
        "file":  "व्यापार सुधार की आवश्यकता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  68.1
    },
    {
        "file":  "व्रत परिचय.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "पं० हनूमान शर्मा",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1607.3
    },
    {
        "file":  "अनंत चतुर्दशी व्रत महत्व व पूजा विधि एवं कथा.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  70.4
    },
    {
        "file":  "शक्तिपीठ दर्शन.html",
        "category":  "Teerth Sthal",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  540.6
    },
    {
        "file":  "शतनामस्तोत्रसंग्रह.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  813.1
    },
    {
        "file":  "शतश्लोकी.html",
        "category":  "Siksha evam Katha",
        "author":  "जगद्गुरु आदि शंकराचार्य",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  196.5
    },
    {
        "file":  "शरणागति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  211.5
    },
    {
        "file":  "शाण्डिल्य-भक्ति-सूत्र.html",
        "category":  "Siksha evam Katha",
        "author":  "मुनिवर शाण्डिल्य",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  93.3
    },
    {
        "file":  "शान्ति का उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  517.4
    },
    {
        "file":  "शान्ति कैसे मिले.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  903.4
    },
    {
        "file":  "शिक्षाप्रद ग्यारह कहानियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  384.3
    },
    {
        "file":  "शिक्षाप्रद पत्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  699.7
    },
    {
        "file":  "शिखा (चोटी) धारणकी आवश्यकता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  123.8
    },
    {
        "file":  "शिव स्मरण.html",
        "category":  "Siksha evam Katha",
        "author":  "सुदर्शनसिंह ‘चक्र’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  215.3
    },
    {
        "file":  "शिवमहिम्नस्तोत्र.html",
        "category":  "Stotra evam Naamavali",
        "author":  "श्रीपुष्पदन्त",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  113.6
    },
    {
        "file":  "शीघ्र कल्याण के सोपान.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  836.5
    },
    {
        "file":  "शोक नाश के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  50.1
    },
    {
        "file":  "श्रद्धा विश्वास और प्रेम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  841.1
    },
    {
        "file":  "श्रावणमासमाहात्म्य.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  892.1
    },
    {
        "file":  "श्री एकनाथ चरित्र.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  705.3
    },
    {
        "file":  "श्री गर्ग संहिता.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "पं० श्रीरामनारायणदत्तजी शास्त्री पाण्डेय ‘राम’; पं० श्रीगदाधरजी शर्मा; पं० श्रीरामाधारजी शुक्ल",
        "publisher":  "गीताप्रेस",
        "sizeKB":  4672.8
    },
    {
        "file":  "श्री प्रेम सुधा सागर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2601.9
    },
    {
        "file":  "श्री भगवन्नाम-चिन्तन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  703.3
    },
    {
        "file":  "श्री राम चिन्तन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  604
    },
    {
        "file":  "श्री सत्यनारायण व्रत कथा.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  294.1
    },
    {
        "file":  "श्री सीताराम भजन.html",
        "category":  "Bajans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  61.5
    },
    {
        "file":  "श्रीआद्यशंकराचार्यविरचित अपरोक्षानुभूति.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रीमुनिलाल गुप्त; सहित",
        "publisher":  "गीताप्रेस",
        "sizeKB":  97.7
    },
    {
        "file":  "श्रीकृष्ण गीतावली.html",
        "category":  "Bajans",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  227.7
    },
    {
        "file":  "श्रीरामचरितमानस.html",
        "category":  "Itihasas",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "swith_arth":  "yes",
        "arth_hide":  "Normal, Footnotes*",
        "sizeKB":  5743.4
    },
    {
        "file":  "श्रीकृष्ण बाल माधुरी.html",
        "category":  "Balaupayogi",
        "author":  "श्रीसूरदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1032.1
    },
    {
        "file":  "श्रीगङ्गासहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  160.7
    },
    {
        "file":  "श्रीगोविन्ददामोदरस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  93.6
    },
    {
        "file":  "श्रीजैमिनीयाश्वमेधपर्व.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "पं० श्रीरामाधारजी शुक्ल",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3914.7
    },
    {
        "file":  "श्रीतुकाराम-चरित्र.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीलक्ष्मण रामचन्द्र पांगारकर",
        "tikakar":  "",
        "translator":  "श्रीलक्ष्मण नारायण गर्दे",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2136.8
    },
    {
        "file":  "श्रीदुर्गाचालीसा एवं श्रीविन्ध्येश्वरीचालीसा.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  28.2
    },
    {
        "file":  "श्रीदुर्गासप्तशती.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "पं० श्रीरामनारायणदत्तजी शास्त्री पाण्डेय ‘राम’",
        "publisher":  "गीताप्रेस",
        "sizeKB":  914.2
    },
    {
        "file":  "श्रीनरसिंहपुराण.html",
        "category":  "Upa Puran",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2415.8
    },
    {
        "file":  "श्रीविष्णुपुराण.html",
        "category":  "Purans",
        "author":  "श्रीपराशरमुनि",
        "tikakar":  "",
        "translator":  "श्रीमुनिलाल गुप्त",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3837.2
    },
    {
        "file":  "मत्स्यमहापुराण.html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  8648
    },
    {
        "file":  "श्रीनारायणकवच.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  50.4
    },
    {
        "file":  "श्रीप्रेमभक्तिप्रकाश.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  49.8
    },
    {
        "file":  "श्रीभक्तमाल.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीनाभादासजी",
        "tikakar":  "श्रीप्रियादासजी",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6427.6
    },
    {
        "file":  "श्रीभगवन्नाम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  169.2
    },
    {
        "file":  "श्रीभीष्मपितामह.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी अखण्डानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  521.4
    },
    {
        "file":  "श्रीमद्भगवद्गीता माहात्म्य की कहानियाँ.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  228.9
    },
    {
        "file":  "श्रीमद्भगवद्गीता शांकरभाष्य.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रीहरिकृष्णदास गोयन्दका; सहित",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3272.6
    },
    {
        "file":  "श्रीमद्भगवद्गीता श्रीरामानुज भाष्य.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रीहरिकृष्णदास गोयन्दका; सहित",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2486.9
    },
    {
        "file":  "श्रीमद्भगवद्गीता_तत्त्वविवेचनी हिन्दी_टीकासहित.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5902
    },
    {
        "file":  "श्रीमद्भगवद्गीता_तत्त्वविवेचनी पदच्छेद_अन्वयसहित.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6713
    },
    {
        "file":  "श्रीमद्भगवद्गीता_मोटे_अक्षरोंमें.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  859.3
    },
    {
        "file":  "श्रीमद्भगवद्गीता_साधक_संजीवनी.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  12055.9
    },
    {
        "file":  "श्रीमद्वाल्मीकीय रामायण.html",
        "category":  "Itihasas",
        "author":  "महर्षि वाल्मीकि",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  17306.8
    },
    {
        "file":  "श्रीमद‍्भागवतमहापुराण.html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  15178.8
    },
    {
        "file":  "श्रीराधा माधव चिन्तन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3973.9
    },
    {
        "file":  "श्रीराधा माधव रस सुधा (षोडश गीत).html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  107
    },
    {
        "file":  "श्रीराधिकासहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  167.6
    },
    {
        "file":  "श्रीरामकृष्णलीला भजनावली.html",
        "category":  "Bajans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  657.1
    },
    {
        "file":  "श्रीरामगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  87.8
    },
    {
        "file":  "श्रीरामसहस्रनामस्तोत्रम् नामावली तथा संक्षिप्त प्रयोग-विधि सहित.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  143.3
    },
    {
        "file":  "श्रीलक्ष्मीसहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  144.7
    },
    {
        "file":  "श्रीललितासहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  343.2
    },
    {
        "file":  "श्रीवामनपुराण.html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3775.6
    },
    {
        "file":  "श्रीविष्णुसहस्रनाम (शांकरभाष्य, हिन्दी अनुवाद सहित).html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "स्वामी श्रीभोलेबाबाजी",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1248.3
    },
    {
        "file":  "श्रीविष्णुसहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  68.8
    },
    {
        "file":  "श्रीशिवचालीसा.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  24.2
    },
    {
        "file":  "श्रीशिवसहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  146.8
    },
    {
        "file":  "श्रीशुक सुधा सागर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  8278.3
    },
    {
        "file":  "श्रीश्रीचैतन्य-चरितावली.html",
        "category":  "Siksha evam Katha",
        "author":  "प्रभुदत्त ब्रह्मचारी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5258.9
    },
    {
        "file":  "श्रीहनुमानचालीसा (लाल रंग में).html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  29
    },
    {
        "file":  "श्रीहरिवंशपुराण.html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "पं० श्रीरामनारायणदत्तजी शास्त्री पाण्डेय ‘राम’",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  11649.6
    },
    {
        "file":  "संक्षिप्त गरुडपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  4567
    },
    {
        "file":  "संक्षिप्त नारदपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5477.7
    },
    {
        "file":  "संक्षिप्त पद्मपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  8120.5
    },
    {
        "file":  "संक्षिप्त ब्रह्मपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2938.3
    },
    {
        "file":  "संक्षिप्त ब्रह्मवैवर्तपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5792.7
    },
    {
        "file":  "संक्षिप्त महाभारत.html",
        "category":  "Itihasas",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  14862.9
    },
    {
        "file":  "संक्षिप्त मार्कण्डेयपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1997.1
    },
    {
        "file":  "संक्षिप्त योगवासिष्ठ.html",
        "category":  "Vedant",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5097.4
    },
    {
        "file":  "संक्षिप्त शिवपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5036.9
    },
    {
        "file":  "संक्षिप्त श्रीमद्देवीभागवत.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6069.4
    },
    {
        "file":  "संक्षिप्त श्रीवराहपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2825.1
    },
    {
        "file":  "संक्षिप्त स्कन्दपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  10263.4
    },
    {
        "file":  "संत महिमा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  95.4
    },
    {
        "file":  "संत वाणी.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  939.7
    },
    {
        "file":  "संत समागम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  353.2
    },
    {
        "file":  "संतानगोपालस्तोत्र (संतानप्राप्तिके शास्त्रीय उपाय).html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  140.4
    },
    {
        "file":  "संध्या.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  28.7
    },
    {
        "file":  "संध्योपासनविधि और तर्पण एवं बलिवैश्वदेव विधि.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  185.4
    },
    {
        "file":  "संसार का असर कैसे छूटे.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  62.7
    },
    {
        "file":  "संस्कार प्रकाश.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1902.7
    },
    {
        "file":  "सच्चा गुरु कौन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  104.5
    },
    {
        "file":  "सच्चा सुख और उसकी प्राप्ति के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  101
    },
    {
        "file":  "सच्ची सलाह.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  508.5
    },
    {
        "file":  "सच्चे और ईमानदार बालक.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  116.6
    },
    {
        "file":  "सती द्रौपदी.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी अखण्डानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  506.1
    },
    {
        "file":  "सती सुकला.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीरामनाथ ‘सुमन’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  199.3
    },
    {
        "file":  "सत्य एवं प्रेरक घटनाएँ.html",
        "category":  "Siksha evam Katha",
        "author":  "भक्त रामशरणदास पिलखुआ",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  579
    },
    {
        "file":  "सत्य की खोज.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  316.9
    },
    {
        "file":  "सत्य की शरण से मुक्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  81.5
    },
    {
        "file":  "सत्यप्रेमी हरिश्चन्द्र.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीशान्तनुविहारीजी द्विवेदी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  149.4
    },
    {
        "file":  "सत्संग का प्रसाद.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  260.6
    },
    {
        "file":  "सत्संग की कुछ सार बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  48.7
    },
    {
        "file":  "सत्संग की मार्मिक बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  485.4
    },
    {
        "file":  "सत्संग की विलक्षणता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  195.9
    },
    {
        "file":  "सत्संग के अमृत कण.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  22.6
    },
    {
        "file":  "सत्संग के फूल.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  572.8
    },
    {
        "file":  "सत्संग के बिखरे मोती.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  766.2
    },
    {
        "file":  "सत्संग माला.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीमगनलाल हरिभाई व्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  311.5
    },
    {
        "file":  "सत्संग मुक्ताहार.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  253
    },
    {
        "file":  "सत्संग-सुधा.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  694
    },
    {
        "file":  "सन्ध्या, सन्ध्या गायत्री का महत्त्व और ब्रह्मचर्य.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  259.3
    },
    {
        "file":  "सफलता के शिखर की सीढ़ियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  363.9
    },
    {
        "file":  "सब जग ईश्वररूप है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  362.2
    },
    {
        "file":  "सब साधनोंका सार.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  252.2
    },
    {
        "file":  "समता अमृत और विषमता विष.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  810.3
    },
    {
        "file":  "समाज सुधार.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  157.1
    },
    {
        "file":  "सम्पूर्ण दुखोंका अभाव कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  400.5
    },
    {
        "file":  "सर्वोच्च पद की प्राप्ति का साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  62.3
    },
    {
        "file":  "सहज साधना.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  202.3
    },
    {
        "file":  "सहस्रनामस्तोत्रसंग्रह.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2930.5
    },
    {
        "file":  "सागरके मोती.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  517.2
    },
    {
        "file":  "साधक में साधुता.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीगयाप्रसादजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  867.9
    },
    {
        "file":  "साधकों के प्रति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  301.1
    },
    {
        "file":  "साधकोंका सहारा भगवच्चर्चा भाग-४.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1370
    },
    {
        "file":  "साधन और साध्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  317.4
    },
    {
        "file":  "साधन की आवश्यकता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  575.8
    },
    {
        "file":  "साधन नवनीत.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  681.8
    },
    {
        "file":  "साधन पथ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  200
    },
    {
        "file":  "साधन सुधा निधि.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5798.1
    },
    {
        "file":  "साधन सुधा सिन्धु.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  10313.4
    },
    {
        "file":  "साधन-कल्पतरु.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  8972.2
    },
    {
        "file":  "साधना पथ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  419.3
    },
    {
        "file":  "साधनोपयोगी पत्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  608.8
    },
    {
        "file":  "सार संग्रह.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  48.8
    },
    {
        "file":  "सावित्री और सत्यवान्.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  98.4
    },
    {
        "file":  "सिद्धान्त एवं रहस्य की बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  570.6
    },
    {
        "file":  "सिनेमा – मनोरञ्जन या विनाश का साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  108.5
    },
    {
        "file":  "सुख-शान्ति का मार्ग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  883.8
    },
    {
        "file":  "सुखी जीवन.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीमैत्री देवी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  645.9
    },
    {
        "file":  "सुखी बनने के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  813.8
    },
    {
        "file":  "सुखी बनो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  337.2
    },
    {
        "file":  "सुन्दर समाज का निर्माण.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  553.7
    },
    {
        "file":  "सूक्ति सुधाकर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  907.3
    },
    {
        "file":  "सूर रामचरितावली.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीसूरदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  884.6
    },
    {
        "file":  "सूर विनय पत्रिका.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीसूरदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1154.8
    },
    {
        "file":  "स्त्रियों के लिये कर्तव्य शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  548.2
    },
    {
        "file":  "स्त्री धर्म प्रश्नोत्तरी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  151.2
    },
    {
        "file":  "स्वर्ण पथ.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० रामचरण महेन्द्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  763.5
    },
    {
        "file":  "स्वाधीन कैसे बनें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  128.6
    },
    {
        "file":  "हंसगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  43.6
    },
    {
        "file":  "हम ईश्वर को क्यों मानें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  104.3
    },
    {
        "file":  "हम कैसे रहें.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीलालबिहारीजी मिश्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  327.2
    },
    {
        "file":  "हमारा आश्चर्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  543.5
    },
    {
        "file":  "हमारा कर्तव्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  50.3
    },
    {
        "file":  "हृदय की आदर्श विशालता.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  419.5
    },
    {
        "file":  "ऋग्वेद.html",
        "category":  "Vedas",
        "author":  "महर्षि दयानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  39959.2
    },
    {
        "file":  "यजुर्वेद.html",
        "category":  "Vedas",
        "author":  "महर्षि दयानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  7322.6
    },
    {
        "file":  "सामवेद.html",
        "category":  "Vedas",
        "author":  "महर्षि दयानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5594.4
    },
    {
        "file":  "अथर्ववेद.html",
        "category":  "Vedas",
        "author":  "महर्षि दयानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  19880.6
    },
    {
        "file":  "महकते जीवन-फूल.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० रामचरण महेन्द्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1160.3
    },
    {
        "file":  "श्रीमद्भगवद्गीता - माहात्म्यसहित.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  847.8
    },
    {
        "file":  "श्रीकृष्ण.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  61.4
    },
    {
        "file":  "श्रीमद्देवीभागवतमहापुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  12359.4
    },
    {
        "file":  "महाभारत (आदिपर्व से स्वर्गारोहणपर्व).html",
        "category":  "Itihasas",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  67394.1
    },
    {
        "file":  "भक्तियोग.html",
        "category":  "Vedant",
        "author":  "स्वामी विवेकानन्द",
        "tikakar":  "",
        "translator":  "डॉ. विद्याभास्कर शुक्ल",
        "publisher":  "",
        "sizeKB":  360.8
    },
    {
        "file":  "राजयोग.html",
        "category":  "Vedant",
        "author":  "स्वामी विवेकानन्द",
        "tikakar":  "",
        "translator":  "पं. सूर्यकान्त त्रिपाठी 'निराला'; प्रा. श्री दिनेशचन्द्र गुह",
        "publisher":  "",
        "sizeKB":  949.6
    },
    {
        "file":  "स्वामी विवेकानन्द संक्षिप्त जीवनी तथा उपदेश.html",
        "category":  "Vedant",
        "author":  "स्वामी अपूर्वानन्द",
        "tikakar":  "",
        "translator":  "स्वामी वागीश्वरानन्द; स्वामी विदेहात्मानन्द",
        "publisher":  "",
        "sizeKB":  361.6
    },
    {
        "file":  "श्रीकृष्ण चैतन्य.html",
        "category":  "Balaupayogi",
        "author":  "डॉ. वै. वी. रमण राव",
        "tikakar":  "",
        "translator":  "डॉ. वी. जगन्नाथ रेड्डी",
        "publisher":  "तिरुमल तिरुपति देवस्थानम्",
        "sizeKB":  96
    },
    {
        "file":  "प्रेमयोग.html",
        "category":  "Vedant",
        "author":  "स्वामी विवेकानन्द",
        "tikakar":  "",
        "translator":  "स्व. पं. द्वारकानाथ तिवारी",
        "publisher":  "रामकृष्ण मठ",
        "sizeKB":  442.1
    },
    {
        "file":  "भक्त नंदनार.html",
        "category":  "Balaupayogi",
        "author":  "आचार्य के. सर्वोत्तम राव",
        "tikakar":  "",
        "translator":  "डॉ. एम. लक्ष्मणाचार्य",
        "publisher":  "तिरुमल तिरुपति देवस्थानम्",
        "sizeKB":  202.1
    },
    {
        "file":  "श्रीहनुमान-अङ्क.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5518
    },
    {
        "file":  "संक्षिप्त श्रीगणेशपुराण.html",
        "category":  "Upa Puran",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  4850.8
    },
    {
        "file":  "क्रान्तिकारी सन्तवाणी.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "करनाल मानव सेवा संघ",
        "sizeKB":  1282.3
    },
    {
        "file":  "चाणक्य नीति.html",
        "category":  "Siksha evam Katha",
        "author":  "कौटिल्य विष्णुगुप्त (चाणक्य)",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "sizeKB":  382.8
    },
    {
        "file":  "नीतिशतकं.html",
        "category":  "Siksha evam Katha",
        "author":  "भर्तृहरि",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "sizeKB":  176.2
    },
    {
        "file":  "श्रीगणेशसहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  157.3
    },
    {
        "file":  "अथर्वशिखोपनिषत्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "sizeKB":  39
    },
    {
        "file":  "ईश्वर दयालु और न्यायकारी है और अवतार का सिद्धान्त.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  110.6
    },
    {
        "file":  "ज्ञान-मणिमाला तथा सत्संग माला.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीमगनलाल हरिभाई व्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  510.9
    },
    {
        "file":  "गीता पढ़ने के लाभ ( त्याग से भगवत्प्राप्ति गजलगीता सहित).html",
        "category":  "Gita",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  114.8
    },
    {
        "file":  "धर्म क्या है भगवान् क्या है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  129.3
    },
    {
        "file":  "श्रीनारायणीयम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "श्रीभट्टनारायणतिरि",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1374.5
    },
    {
        "file":  "प्रेरणाप्रद कथाएँ.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  488.4
    },
    {
        "file":  "लव कुश चरित्र.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1051
    },
    {
        "file":  "हनुमान-बाहुक भावार्थ सहित.html",
        "category":  "Stotra evam Naamavali",
        "author":  "गोस्वामी तुलसीदास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  94.1
    },
    {
        "file":  "अग्निपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6203.3
    },
    {
        "file":  "कल्याण कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  516.5
    },
    {
        "file":  "परलोक और पुनर्जन्म एवं वैराग्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  169.4
    },
    {
        "file":  "भगवान् का हेतु रहित सौहार्द एवं महात्मा किसे कहते हैं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  131.2
    },
    {
        "file":  "प्रेमका सच्चा स्वरूप और शोकनाशके उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  104.3
    },
    {
        "file":  "संतवाणी—ढाई हजार अनमोल बोल.html",
        "category":  "Pravachan",
        "author":  "हनुमानप्रसाद पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  938.6
    },
    {
        "file":  "मूर्तिपूजा-नाम-जपकी महिमा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  131.9
    },
    {
        "file":  "स्तोत्ररत्नावली.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  945.9
    },
    {
        "file":  "श्रीपंचरत्नगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  368.5
    },
    {
        "file":  "नारी-अङ्क.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  7412.2
    },
    {
        "file":  "नारद भक्ति सूत्र एवं शाण्डिल्य भक्ति सूत्र.html",
        "category":  "Siksha evam Katha",
        "author":  "देवर्षि नारद एवं मुनिवर शाण्डिल्य",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  127.1
    },
    {
        "file":  "गरुडपुराण-सारोद्धार.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  912.2
    },
    {
        "file":  "मैं नहीं, मेरा नहीं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  666.6
    },
    {
        "file":  "रहस्यमयी वार्ता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  1126.9
    },
    {
        "file":  "पायो परम बिश्रामु.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  508.3
    },
    {
        "file":  "बन गये आप अकेले सब कुछ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  641.3
    },
    {
        "file":  "सरस भजनावली.html",
        "category":  "Bajans",
        "author":  "बजरंगलाल सोनी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  217.8
    },
    {
        "file":  "भगवत्कृपा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीतावाटिका प्रकाशन, गोरखपुर",
        "sizeKB":  204.4
    },
    {
        "file":  "भक्ति-रहस्य.html",
        "category":  "Pravachan",
        "author":  "महामहोपाध्याय पं० गोपीनाथ कविराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीतावाटिका प्रकाशन, गोरखपुर",
        "sizeKB":  823.8
    },
    {
        "file":  "ब्रज-भाव.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीतावाटिका प्रकाशन, गोरखपुर",
        "sizeKB":  696.7
    },
    {
        "file":  "प्रेम और प्रेमी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीतावाटिका प्रकाशन, गोरखपुर",
        "sizeKB":  667.8
    },
    {
        "file":  "सुखी होनेके उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीतावाटिका प्रकाशन, गोरखपुर",
        "sizeKB":  691.3
    },
    {
        "file":  "कालियनागपर कृपा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीतावाटिका प्रकाशन, गोरखपुर",
        "sizeKB":  661.6
    },
    {
        "file":  "सरस-प्रसंग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीतावाटिका प्रकाशन, गोरखपुर",
        "sizeKB":  789.6
    },
    {
        "file":  "भाईजी चरितामृत.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीतावाटिका प्रकाशन, गोरखपुर",
        "sizeKB":  1115
    },
    {
        "file":  "जैसा बीज वैसा फल.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीतावाटिका प्रकाशन, गोरखपुर",
        "sizeKB":  652.9
    },
    {
        "file":  "योग एवं भक्ति.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीतावाटिका प्रकाशन, गोरखपुर",
        "sizeKB":  659.7
    },
    {
        "file":  "कौषीतकिब्राह्मणोपनिषत्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "स्वामी महेशानन्द गिरि",
        "translator":  "",
        "publisher":  "मेहता चेरीटेबिल प्रज्ञालय ट्रस्ट",
        "sizeKB":  174.3
    },
    {
        "file":  "पाणिनीयशिक्षा.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "अवस्थी बच्चूलाल ज्ञान",
        "translator":  "बालकृष्ण शर्मा",
        "publisher":  "कालिदास अकादेमी, उज्जैन",
        "sizeKB":  627.4
    },
    {
        "file":  "नारदीयशिक्षा.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "sizeKB":  487.3
    },
    {
        "file":  "सामवेदीया लोमशी शिक्षा.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "sizeKB":  230.6
    },
    {
        "file":  "संक्षिप्त कूर्मपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2273.4
    },
    {
        "file":  "श्रीअष्टलक्ष्मीमहामन्त्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "sizeKB":  51.8
    },
    {
        "file":  "श्री कार्तवीर्यार्जुन मन्त्र.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "sizeKB":  117.1
    },
    {
        "file":  "नवग्रह-मन्त्र-मञ्जरी.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "sizeKB":  81.5
    },
    {
        "file":  "श्री गुर्वष्टकम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "जगद्गुरु आदि शंकराचार्य",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "stotra":  "guru",
        "swith_arth":  "yes",
        "arth_hide":  "stotra-arth*",
        "sizeKB":  32.1
    },
    {
        "file":  "श्री अन्नपूर्णाकवचम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "जगद्गुरु आदि शंकराचार्य",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "stotra":  "devi",
        "swith_arth":  "yes",
        "arth_hide":  "stotra-arth*",
        "sizeKB":  69.3
    },
    {
        "file":  "तैत्तिरीयोपनिषद् (शांकरभाष्य).html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "जगद्गुरु आदि शंकराचार्य",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  875.9
    },
    {
        "file":  "श्वेताश्वतरोपनिषद् (शांकरभाष्य).html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "जगद्गुरु आदि शंकराचार्य",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  938.7
    },
    {
        "file":  "शिवपुराण-कथासार.html",
        "category":  "Purans",
        "author":  "राधेश्याम खेमका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  585.2
    },
    {
        "file":  "जगदम्बा अपराधक्षमापण स्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "stotra":  "devi",
        "swith_arth":  "yes",
        "arth_hide":  "stotra-arth*",
        "sizeKB":  29.2
    },
    {
        "file":  "श्रीगणेशापराधक्षमापणस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "stotra":  "ganesha",
        "swith_arth":  "yes",
        "arth_hide":  "stotra-arth*",
        "sizeKB":  111.6
    },
    {
        "file":  "श्रीदत्तात्रेयापराधक्षमापणस्तोत्रम् २.html",
        "category":  "Stotra evam Naamavali",
        "author":  "श्रीमद् वासुदेवानन्दसरस्वती (टेंबे स्वामी)",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "stotra":  "guru",
        "swith_arth":  "yes",
        "arth_hide":  "stotra-arth*",
        "sizeKB":  45.1
    },
    {
        "file":  "श्रीललितात्रिपुरसुन्दरी-अपराधक्षमापणस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "stotra":  "devi",
        "swith_arth":  "yes",
        "arth_hide":  "stotra-arth*",
        "sizeKB":  80.6
    },
    {
        "file":  "श्रीगणेशभुजङ्गप्रयातस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "आदि शंकराचार्य",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "stotra":  "ganesha",
        "swith_arth":  "yes",
        "arth_hide":  "stotra-arth*",
        "sizeKB":  35
    },
    {
        "file":  "आत्मोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "कल्याण सेवा ट्रस्ट",
        "stview":  "yes",
        "swith_arth":  "yes",
        "arth_hide":  "stotra-arth*",
        "sizeKB":  147.8
    },
    {
        "file":  "जीवन-निर्माण.html",
        "category":  "Siksha evam Katha",
        "author":  "सुदर्शनसिंह ‘चक्र’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "",
        "sizeKB":  77.6
    },
    {
        "file":  "कल्कि अवतार.html",
        "category":  "Siksha evam Katha",
        "author":  "सुदर्शनसिंह ‘चक्र’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "",
        "sizeKB":  733.5
    },
    {
        "file":  "ब्रज का एक दिन.html",
        "category":  "Siksha evam Katha",
        "author":  "सुदर्शनसिंह ‘चक्र’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "श्री राम अध्यात्म प्रन्यास, हनुमद्धाम, शुकतीर्थ",
        "sizeKB":  354.1
    },
    {
        "file":  "भारतीय मनोविज्ञान.html",
        "category":  "Siksha evam Katha",
        "author":  "सुदर्शनसिंह ‘चक्र’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "आनन्द कानन प्रकाशन",
        "sizeKB":  322.2
    },
    {
        "file":  "श्रीकृष्णांक.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5591.2
    },
    {
        "file":  "सुन्दरकाण्ड (सटीक).html",
        "category":  "Itihasas",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "swith_arth":  "yes",
        "arth_hide":  "TEXT",
        "sizeKB":  294.8
    }
];
