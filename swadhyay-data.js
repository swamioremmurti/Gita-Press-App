// Book catalogue -- 568 real book files. Per book: author, tikakar (commentator), translator and
// publisher, as printed in the book itself (title page / front matter). Several people in one
// field are separated by "; ". An empty string means the book does not state it.
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
        "sizeKB":  87.9
    },
    {
        "file":  "जीवन्मुक्तिके रहस्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  272.4
    },
    {
        "file":  "मेरे नाथ! मेरे प्रभो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  112.8
    },
    {
        "file":  "ईस्वर अंस जीव अबिनासी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीता प्रकाशन, गोरखपुर",
        "sizeKB":  663.6
    },
    {
        "file":  "अयोध्या-माहात्म्य.html",
        "category":  "Teerth Sthal",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रीविश्वेश्वरीप्रसादजी शुक्ल",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1800.2
    },
    {
        "file":  "श्रीलिङ्ग-महापुराण (केवल हिन्दी).html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3453.6
    },
    {
        "file":  "गिता चिंतन.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2103.7
    },
    {
        "file":  "शिव स्तोत्र रत्नाकर.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  818.3
    },
    {
        "file":  "श्रीकृष्ण विज्ञान.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "पुरोहित रामप्रताप",
        "publisher":  "गीताप्रेस",
        "sizeKB":  505.8
    },
    {
        "file":  "अमोघ शिवकवच.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  53.7
    },
    {
        "file":  "आदित्यहृदयस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  28.9
    },
    {
        "file":  "श्रीहनुमानचालीसा.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  117.4
    },
    {
        "file":  "रामरक्षास्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  32.9
    },
    {
        "file":  "तिरुपति-यात्रा.html",
        "category":  "Teerth Sthal",
        "author":  "डॉ. आकेल्ल विभीषण शर्मा",
        "tikakar":  "",
        "translator":  "डॉ. एस.टी. अरुण कुमारी",
        "publisher":  "तिरुमल तिरुपति देवस्थानम्, तिरुपति",
        "sizeKB":  253
    },
    {
        "file":  "अयोध्या-दर्शन.html",
        "category":  "Teerth Sthal",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  443.8
    },
    {
        "file":  "चित शुधि भाग - 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  672.1
    },
    {
        "file":  "चित शुधि भाग - 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  848
    },
    {
        "file":  "जीवन पथ.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  424
    },
    {
        "file":  "जीवन-दर्शन भाग 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  517
    },
    {
        "file":  "जीवन-दर्शन भाग 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  572.9
    },
    {
        "file":  "दर्शन और नीति.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  340.9
    },
    {
        "file":  "दुःख का प्रभाव.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  402.2
    },
    {
        "file":  "पथ प्रदीप.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  246.1
    },
    {
        "file":  "पाथेय - 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  514.9
    },
    {
        "file":  "पाथेय - 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  450.1
    },
    {
        "file":  "प्रबोधनी.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  58.5
    },
    {
        "file":  "प्रश्नोत्तरी संतवाणी - 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  343.7
    },
    {
        "file":  "प्रश्नोत्तरी संतवाणी - 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  516.7
    },
    {
        "file":  "प्रार्थना तथा पद.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  32.5
    },
    {
        "file":  "प्रेरणा पथ.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  728.5
    },
    {
        "file":  "मंगलमय विधान.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  236.2
    },
    {
        "file":  "मानव की मांग.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  841.6
    },
    {
        "file":  "मानव सेवा संघ परिचय.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  220.3
    },
    {
        "file":  "मानवता के मूल सिधान्त.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  284.9
    },
    {
        "file":  "मानव–दर्शन.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  716.9
    },
    {
        "file":  "मूक-सत्संग तया नित्य-योग.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  762.9
    },
    {
        "file":  "मैं की खोज.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  189.9
    },
    {
        "file":  "रजत जयन्ती स्मारिका.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  984.8
    },
    {
        "file":  "सत्संग और साधन.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  231.3
    },
    {
        "file":  "सन्त उद्बोधन.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  716
    },
    {
        "file":  "सन्त-जीवन-दर्पण.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  325.3
    },
    {
        "file":  "सन्त पत्रावली - 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  547.4
    },
    {
        "file":  "सन्त पत्रावली - 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  668.9
    },
    {
        "file":  "सन्त पत्रावली - 3.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  290.4
    },
    {
        "file":  "सन्त वाणी   -Cassette Reference.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  6.1
    },
    {
        "file":  "सन्त वाणी भाग -1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  463.4
    },
    {
        "file":  "सन्त वाणी भाग -2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  493.1
    },
    {
        "file":  "सन्त वाणी भाग -3.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  506.7
    },
    {
        "file":  "सन्त वाणी भाग -4.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  796.7
    },
    {
        "file":  "सन्त वाणी भाग -5B.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  421.9
    },
    {
        "file":  "सन्त वाणी भाग -6.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  572.9
    },
    {
        "file":  "सन्त वाणी भाग -7.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  573.9
    },
    {
        "file":  "सन्त वाणी भाग -8.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  500.6
    },
    {
        "file":  "सन्त वाणी भाग- 5A.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  382.8
    },
    {
        "file":  "सन्त समागम भाग - 1.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  713.3
    },
    {
        "file":  "सन्त समागम भाग - 2.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  504
    },
    {
        "file":  "सन्त समागम भाग - 3.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  488
    },
    {
        "file":  "सन्त सौरभ (सन्त वाणी ).html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  887.9
    },
    {
        "file":  "सन्त हृदयोद्गार.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  111.5
    },
    {
        "file":  "साधन-तत्त्व.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  332.9
    },
    {
        "file":  "साधन-त्रिवेणी.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  391.7
    },
    {
        "file":  "साधन-निधि.html",
        "category":  "Swami Sharnanand Sahitya",
        "author":  "स्वामी शरणानन्द जी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "मानव सेवा संघ, वृन्दावन",
        "sizeKB":  236.8
    },
    {
        "file":  "शिव-आराधना.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  110
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
        "sizeKB":  275.1
    },
    {
        "file":  "अध्यात्म-पथ-प्रदर्शक.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी चिदानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1678.6
    },
    {
        "file":  "अध्यात्मरामायण.html",
        "category":  "Itihasas",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रीमुनिलाल गुप्त",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2958
    },
    {
        "file":  "अध्यात्मविषयक पत्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  493.9
    },
    {
        "file":  "अनन्य भक्तिसे भगवत्प्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  646
    },
    {
        "file":  "अनन्यभक्ति कैसे प्राप्त हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  435.4
    },
    {
        "file":  "अनुराग पदावली.html",
        "category":  "Bajans",
        "author":  "श्रीसूरदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  912.1
    },
    {
        "file":  "अनुस्मृति.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  30.5
    },
    {
        "file":  "अन्त्यकर्म श्राद्धप्रकाश.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "पं० श्रीजोषणरामजी पाण्डेय ‘अग्निहोत्री’; पं० श्रीलालबिहारीजी मिश्र; पं० श्रीरामकृष्णजी शास्त्री",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3298.1
    },
    {
        "file":  "अपात्रको भी भगवत्प्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  617.1
    },
    {
        "file":  "अमरता की ओर.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  359.9
    },
    {
        "file":  "अमूल्य वचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  850
    },
    {
        "file":  "अमूल्य शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  633.9
    },
    {
        "file":  "अमूल्य समय का सदुपयोग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  463.4
    },
    {
        "file":  "अमृत कण.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1160.4
    },
    {
        "file":  "अमृत के घूँट.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० रामचरण महेन्द्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  784.4
    },
    {
        "file":  "अमृत बिन्दु.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  369.5
    },
    {
        "file":  "अमृत वचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  501.1
    },
    {
        "file":  "अवतार का सिद्धान्त.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  65.4
    },
    {
        "file":  "अष्टावक्रगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  228.2
    },
    {
        "file":  "असीम नीचता और असीम साधुता.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  432.3
    },
    {
        "file":  "आचार्य के सदुपेदश.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  74.1
    },
    {
        "file":  "आत्मकल्याण के विविध उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  428.4
    },
    {
        "file":  "आत्मोद्धारके सरल उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  810.6
    },
    {
        "file":  "आत्मोद्धारके साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  756.2
    },
    {
        "file":  "आदर्श उपकार.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  446.4
    },
    {
        "file":  "आदर्श कहानियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  323.7
    },
    {
        "file":  "आदर्श देवियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  210.7
    },
    {
        "file":  "आदर्श नारी सुशीला.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  171.2
    },
    {
        "file":  "आदर्श भक्त.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  297.8
    },
    {
        "file":  "आदर्श भ्रातृ प्रेम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  292.2
    },
    {
        "file":  "आदर्श मानव हृदय.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  434.6
    },
    {
        "file":  "आध्यात्मिक कहानियाँ.html",
        "category":  "Siksha evam Katha",
        "author":  "सुदर्शनसिंह ‘चक्र’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  728.9
    },
    {
        "file":  "आध्यात्मिक प्रवचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  583.8
    },
    {
        "file":  "आनन्द का स्वरूप.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  764.9
    },
    {
        "file":  "आनन्द की लहरें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  121.2
    },
    {
        "file":  "आनन्द कैसे मिले.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  392.5
    },
    {
        "file":  "आनन्द मार्ग.html",
        "category":  "Siksha evam Katha",
        "author":  "चौधरी रघुनन्दनप्रसाद सिंह",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  909.6
    },
    {
        "file":  "आनन्दमय जीवन.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० रामचरण महेन्द्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  776.6
    },
    {
        "file":  "आरती-संग्रह.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  219.1
    },
    {
        "file":  "आवश्यक शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  320.9
    },
    {
        "file":  "आवागमन से मुक्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  414.5
    },
    {
        "file":  "इसी जन्ममें परमात्मप्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  533.9
    },
    {
        "file":  "ईशावास्योपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  111.3
    },
    {
        "file":  "केनोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  153.4
    },
    {
        "file":  "कठोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  482.3
    },
    {
        "file":  "प्रश्नोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "जगद्गुरु आदि शंकराचार्य",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  418.1
    },
    {
        "file":  "मुण्डकोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  293.1
    },
    {
        "file":  "माण्डूक्योपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  94.7
    },
    {
        "file":  "ऐतरेयोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  181.4
    },
    {
        "file":  "तैत्तिरीयोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  530.9
    },
    {
        "file":  "श्वेताश्वतरोपनिषद्.html",
        "category":  "Upanishad",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  482
    },
    {
        "file":  "ईश्वर और संसार.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  948.4
    },
    {
        "file":  "ईश्वर की सत्ता और महत्ता.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1516.1
    },
    {
        "file":  "ईश्वर दयालु और न्यायकारी है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  47.9
    },
    {
        "file":  "ईश्वर.html",
        "category":  "Siksha evam Katha",
        "author":  "महामना मदनमोहन मालवीय",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  99
    },
    {
        "file":  "ईश्वरसाक्षात्कार के लिये नाम-जप सर्वोपरि साधन है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  56.3
    },
    {
        "file":  "उद्धव संदेश.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० महानामव्रत ब्रह्मचारी",
        "tikakar":  "",
        "translator":  "चतुर्भुज तोषनीवाल",
        "publisher":  "गीताप्रेस",
        "sizeKB":  736.8
    },
    {
        "file":  "उद्धार कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  340.8
    },
    {
        "file":  "उपदेशप्रद कहानियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  616.7
    },
    {
        "file":  "उपनिषदों के चौदह रत्न.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  290.5
    },
    {
        "file":  "एक नयी बात.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  96
    },
    {
        "file":  "एक महात्मा का प्रसाद.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  887.8
    },
    {
        "file":  "एक महापुरुषके अनुभवकी बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  406.4
    },
    {
        "file":  "एक लोटा पानी.html",
        "category":  "Siksha evam Katha",
        "author":  "श्री पारसनाथ सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  467.4
    },
    {
        "file":  "एक संत की वसीयत.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  48
    },
    {
        "file":  "एकादशी व्रत का माहात्म्य.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  300.1
    },
    {
        "file":  "एकै साधै सब सधै.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  249.9
    },
    {
        "file":  "कर्णवास का सत्संग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  497.3
    },
    {
        "file":  "कर्म रहस्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  256.2
    },
    {
        "file":  "कर्मयोग का तत्त्व.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1313.7
    },
    {
        "file":  "कलेजे के अक्षर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  428.5
    },
    {
        "file":  "कल्याण कुंज.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  404.7
    },
    {
        "file":  "कल्याण पथ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  516.9
    },
    {
        "file":  "कल्याण प्राप्ति के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1075.2
    },
    {
        "file":  "कल्याण_भक्त-चरिताङ्क.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  8213.8
    },
    {
        "file":  "कल्याणकारी आचरण.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  62.9
    },
    {
        "file":  "कल्याणकारी दोहा संग्रह.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  455.1
    },
    {
        "file":  "कल्याणकारी प्रवचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  438.8
    },
    {
        "file":  "कवितावली.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "इन्द्रदेवनारायण",
        "publisher":  "गीताप्रेस",
        "sizeKB":  662.9
    },
    {
        "file":  "किसान और गाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  144.2
    },
    {
        "file":  "क्या करें क्या न करें.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1097.5
    },
    {
        "file":  "क्या गुरु बिना मुक्ति नहीं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  209.7
    },
    {
        "file":  "गंगालहरी.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  80.3
    },
    {
        "file":  "गजलगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  9.9
    },
    {
        "file":  "गजेंद्रमोक्ष.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  56.1
    },
    {
        "file":  "श्रीगणेशसहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1034.3
    },
    {
        "file":  "गयाश्राद्धपद्धति_माहात्म्य तथा_गयायात्राविधानसहित.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "पं० श्रीरामकृष्णजी शास्त्री",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  965.1
    },
    {
        "file":  "गीता के परम प्रचारक.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1691.3
    },
    {
        "file":  "गीता ज्ञान प्रवेशिका.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1412.8
    },
    {
        "file":  "गीता दर्पण.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2730
    },
    {
        "file":  "गीता पढ़ने के लाभ.html",
        "category":  "Gita",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  69.6
    },
    {
        "file":  "गीता बाल प्रश्नोत्तरी.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  204.6
    },
    {
        "file":  "गीता माधुर्य.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  475.7
    },
    {
        "file":  "गीता माधुर्यम्.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  435.3
    },
    {
        "file":  "गीता संग्रह.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2214.5
    },
    {
        "file":  "गीता-निबन्धावली.html",
        "category":  "Gita",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  234.3
    },
    {
        "file":  "गीता-प्रबोधनी.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1428.6
    },
    {
        "file":  "गीतावली.html",
        "category":  "Gita",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1361.2
    },
    {
        "file":  "गीतोक्त संन्यास या सांख्ययोग का स्वरूप.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  102.9
    },
    {
        "file":  "गुरु और माता-पिता के भक्त बालक.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  157.6
    },
    {
        "file":  "गृहस्थमें कैसे रहें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  468.7
    },
    {
        "file":  "गो सेवा के चमत्कार.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  239.7
    },
    {
        "file":  "गोपी प्रेम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  164.5
    },
    {
        "file":  "गोवध भारत का कलंक.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  157.2
    },
    {
        "file":  "चिन्ता शोक कैसे मिटें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  521.9
    },
    {
        "file":  "चेतावनी और सामयिक चेतावनी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  119.7
    },
    {
        "file":  "चेतावनी पद संग्रह.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  689.7
    },
    {
        "file":  "चोखी कहानियाँ.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  170.6
    },
    {
        "file":  "जन्म-मरण से छुटकारा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  409.8
    },
    {
        "file":  "जानकी मंगल.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  165.1
    },
    {
        "file":  "जित देखूँ तित तू.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  516.7
    },
    {
        "file":  "जिन खोजा तिन पाइया.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  322.4
    },
    {
        "file":  "जीवन का कर्तव्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  592.1
    },
    {
        "file":  "जीवन का सत्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  281.4
    },
    {
        "file":  "जीवन में नया प्रकाश.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० रामचरण महेन्द्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  906.6
    },
    {
        "file":  "जीवन संजीवनी.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० श्रीराजारामजी गुप्ता",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1245.6
    },
    {
        "file":  "जीवन सुधार की बातें.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  526.3
    },
    {
        "file":  "जीवनचर्या विज्ञान.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी शंकरानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1067.1
    },
    {
        "file":  "जीवनोपयोगी कल्याण मार्ग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  182.9
    },
    {
        "file":  "जीवनोपयोगी प्रवचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  391.9
    },
    {
        "file":  "जैमिनीकृत महाभारतमें भक्तोंकी गाथा.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2015.8
    },
    {
        "file":  "ज्ञान के दीप जले.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  818.2
    },
    {
        "file":  "ज्ञान मणि माला.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीमगनलाल हरिभाई व्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  203.3
    },
    {
        "file":  "ज्ञानयोग का तत्त्व.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1200.2
    },
    {
        "file":  "तत्त्वचिन्तामणि.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  11155.1
    },
    {
        "file":  "तत्त्वज्ञान कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  406
    },
    {
        "file":  "तत्त्वविचार.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीज्वालाप्रसादजी कानोड़िया",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  616.3
    },
    {
        "file":  "तर्पण विधि.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  82
    },
    {
        "file":  "तात्त्विक प्रवचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  282.8
    },
    {
        "file":  "तुलसी दल.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  864.1
    },
    {
        "file":  "तू ही तू.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  118.4
    },
    {
        "file":  "त्याग की महिमा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  411.6
    },
    {
        "file":  "त्याग से भगवत्प्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  48.4
    },
    {
        "file":  "त्रिपिण्डीश्राद्धपद्धति.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "पं० श्रीरामकृष्णजी शास्त्री",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  443.1
    },
    {
        "file":  "दत्तात्रेय वज्र कवच.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  96.9
    },
    {
        "file":  "दाम्पत्य जीवन का आदर्श.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  464
    },
    {
        "file":  "दिव्य सन्देश.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  53
    },
    {
        "file":  "दिव्य सुख की सरिता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  326.9
    },
    {
        "file":  "दीन-दुखियों के प्रति कर्तव्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  75.5
    },
    {
        "file":  "दुःखोंका नाश कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  511
    },
    {
        "file":  "दुख क्यों होते हैं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  897.3
    },
    {
        "file":  "दुख में भगवत्कृपा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  744.9
    },
    {
        "file":  "दुर्गति से बचो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  112.8
    },
    {
        "file":  "देवर्षि नारद.html",
        "category":  "Siksha evam Katha",
        "author":  "चतुर्वेदी पं० श्रीद्वारकाप्रसाद शर्मा",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  706.7
    },
    {
        "file":  "देवीस्तोत्ररत्नाकर.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  926.1
    },
    {
        "file":  "देश की वर्तमान दशा तथा उसका परिणाम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  237.3
    },
    {
        "file":  "दैनिक कल्याण सूत्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  244.8
    },
    {
        "file":  "दोहावली.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "publisher":  "गीताप्रेस",
        "sizeKB":  615.7
    },
    {
        "file":  "धर्म के नाम पर पाप.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  121.9
    },
    {
        "file":  "धर्म क्या है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  39.9
    },
    {
        "file":  "धर्मसे लाभ और अधर्म से हानि.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  690.9
    },
    {
        "file":  "ध्यान और मानसिक पूजा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  100
    },
    {
        "file":  "ध्यानावस्था में प्रभु से वार्तालाप.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  107.4
    },
    {
        "file":  "नल दमयन्ती.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  163
    },
    {
        "file":  "नवधा भक्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  319.4
    },
    {
        "file":  "नाम जप की महिमा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  60.3
    },
    {
        "file":  "नारद भक्ति सूत्र.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  35.7
    },
    {
        "file":  "नारी धर्म.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  139.4
    },
    {
        "file":  "नारी-शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  503.1
    },
    {
        "file":  "नित्यकर्म-पूजाप्रकाश.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "परमाचार्य पं. श्रीरामभवनजी मिश्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1356.9
    },
    {
        "file":  "नित्यकर्म-प्रयोग.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  445.9
    },
    {
        "file":  "नित्ययोग की प्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  391.8
    },
    {
        "file":  "निष्काम श्रद्धा और प्रेम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  598.2
    },
    {
        "file":  "निष्कामभाव से भगवत्प्राप्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  418.4
    },
    {
        "file":  "नेत्रों में भगवान् को बसा लें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  404.8
    },
    {
        "file":  "नैवेद्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  818.2
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
        "sizeKB":  4190.4
    },
    {
        "file":  "पदच्छेद.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2583.7
    },
    {
        "file":  "परम पिता से प्रार्थना.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  27.4
    },
    {
        "file":  "परम शान्ति का मार्ग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1242
    },
    {
        "file":  "परम साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1184.3
    },
    {
        "file":  "परम सेवा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  671
    },
    {
        "file":  "परमानन्द की खेती.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  704.2
    },
    {
        "file":  "परमार्थ की मन्दाकिनी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  374.8
    },
    {
        "file":  "परमार्थ सूत्र संग्रह.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  620.6
    },
    {
        "file":  "परलोक और पुनर्जन्म.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  83.3
    },
    {
        "file":  "परलोक और पुनर्जन्मकी सत्य घटनाएँ.html",
        "category":  "Siksha evam Katha",
        "author":  "भक्त रामशरणदास पिलखुआ",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  498
    },
    {
        "file":  "परोपकार और सच्चाई का फल.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  457.8
    },
    {
        "file":  "पाण्डवगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  81
    },
    {
        "file":  "पातञ्जलयोगदर्शन.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीहरिकृष्णदास गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  590.7
    },
    {
        "file":  "पातञ्जलयोगप्रदीप.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीस्वामी ओमानन्द तीर्थ",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  4205.9
    },
    {
        "file":  "पारमार्थिक पत्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  670.9
    },
    {
        "file":  "पार्वती मंगल.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  120.2
    },
    {
        "file":  "पिता की सीख.html",
        "category":  "Siksha evam Katha",
        "author":  "श्री हनुमानप्रसाद गोयल",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  410.8
    },
    {
        "file":  "पुरुषोत्तमसहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  219.4
    },
    {
        "file":  "पूजा के फूल.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "भूपेन्द्रनाथ देवशर्मा",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1237.1
    },
    {
        "file":  "पूर्ण-समर्पण_भगवच्चर्चा भाग-६.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1236.1
    },
    {
        "file":  "पौराणिक कथाएँ.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  415
    },
    {
        "file":  "पौराणिक कहानियाँ.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  406.3
    },
    {
        "file":  "प्रतिकूलता में प्रसन्नता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  432
    },
    {
        "file":  "प्रत्यक्ष भगवद्दर्शन के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  755.8
    },
    {
        "file":  "प्रश्नोत्तर मणिमाला.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  610.3
    },
    {
        "file":  "प्रश्नोत्तरी.html",
        "category":  "Siksha evam Katha",
        "author":  "जगद्गुरु आदि शंकराचार्य",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  49.3
    },
    {
        "file":  "प्राचीन भक्त.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  461.6
    },
    {
        "file":  "प्रार्थना.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  223.8
    },
    {
        "file":  "प्रेम का सच्चा स्वरूप.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  57.3
    },
    {
        "file":  "प्रेम के वश में भगवान्.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  410.3
    },
    {
        "file":  "प्रेम दर्शन (नारद भक्ति सूत्र की व्याख्या).html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  588.7
    },
    {
        "file":  "प्रेम में विलक्षण एकता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  556.4
    },
    {
        "file":  "प्रेम योग.html",
        "category":  "Siksha evam Katha",
        "author":  "वियोगी हरि",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1034
    },
    {
        "file":  "प्रेम सत्संग सुधा माला.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  666.4
    },
    {
        "file":  "प्रेमयोग का तत्त्व.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1223
    },
    {
        "file":  "प्रेमी भक्त उद्धव.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीशान्तनुविहारीजी द्विवेदी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  195.5
    },
    {
        "file":  "प्रेमी भक्त.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  272.5
    },
    {
        "file":  "प्रेरक कहानियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  243.9
    },
    {
        "file":  "बड़ोंके जीवन से शिक्षा.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  225.9
    },
    {
        "file":  "बलिवैश्वदेव-विधि.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  37.7
    },
    {
        "file":  "बाल अमृत वचन.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  66.2
    },
    {
        "file":  "बाल प्रश्नोत्तरी.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  69.3
    },
    {
        "file":  "बाल शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  194.1
    },
    {
        "file":  "बालकों की बोलचाल.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  43.7
    },
    {
        "file":  "बालकों के कर्तव्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  265.5
    },
    {
        "file":  "ब्रह्मचर्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  95.5
    },
    {
        "file":  "भक्त कुसुम.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  246
    },
    {
        "file":  "भक्त चन्द्रिका.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  258.1
    },
    {
        "file":  "भक्त दिवाकर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  329.2
    },
    {
        "file":  "भक्त नरसिंह मेहता.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1106.3
    },
    {
        "file":  "भक्त नारी.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  192.5
    },
    {
        "file":  "भक्त बालक.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  212.9
    },
    {
        "file":  "भक्त महिलारत्न.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  293.6
    },
    {
        "file":  "भक्त रत्नाकर .html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  309.2
    },
    {
        "file":  "भक्त सरोज.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  319.9
    },
    {
        "file":  "भक्त सुधाकर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  313.1
    },
    {
        "file":  "भक्त सुमन.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  336.4
    },
    {
        "file":  "भक्त सौरभ.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  340.8
    },
    {
        "file":  "भक्त-पंचरत्न.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  281.8
    },
    {
        "file":  "भक्त-सप्तरत्न.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  272.9
    },
    {
        "file":  "भक्तराज ध्रुव.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीशान्तनुविहारीजी द्विवेदी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  147
    },
    {
        "file":  "भक्तराज हनुमान्.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीशान्तनुविहारीजी द्विवेदी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  244.4
    },
    {
        "file":  "भक्ति भक्त भगवान्.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  810.4
    },
    {
        "file":  "भक्ति सुधा.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी श्रीकरपात्रीजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6404.6
    },
    {
        "file":  "भगवच्चर्चा (भाग-५).html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1249.1
    },
    {
        "file":  "भगवच्चर्चा (सभी छहों भाग एक साथ).html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6781.3
    },
    {
        "file":  "भगवच्चर्चा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1257
    },
    {
        "file":  "भगवत्तत्त्व.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  147.6
    },
    {
        "file":  "भगवत्पथ दर्शन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  550.9
    },
    {
        "file":  "भगवत्प्राप्ति एवं हिंदू संस्कृति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1288.8
    },
    {
        "file":  "भगवत्प्राप्ति कठिन नहीं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  415.4
    },
    {
        "file":  "भगवत्प्राप्ति की युक्तियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  416.4
    },
    {
        "file":  "भगवत्प्राप्ति की सुगमता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  438.1
    },
    {
        "file":  "भगवत्प्राप्ति के विविध उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  155.7
    },
    {
        "file":  "भगवत्प्राप्ति के सुगम साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  405.5
    },
    {
        "file":  "भगवत्प्राप्ति कैसे ह.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  399.5
    },
    {
        "file":  "भगवत्प्राप्ति सहज है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  472.7
    },
    {
        "file":  "भगवत्प्राप्तिकी अमूल्य बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  400.6
    },
    {
        "file":  "भगवत्प्राप्तिमें भावकी प्रधानता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  586.1
    },
    {
        "file":  "भगवत्प्रेम प्राप्ति के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  507.9
    },
    {
        "file":  "भगवत्प्रेमकी प्राप्ति कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  142
    },
    {
        "file":  "भगवद्दर्शन की उत्कण्ठा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  841.9
    },
    {
        "file":  "भगवन्नाम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  229.4
    },
    {
        "file":  "भगवान_् और उनकी भक्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  402.8
    },
    {
        "file":  "भगवान_् के रहने के पाँच स्थान.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  182.6
    },
    {
        "file":  "भगवान_् के सामने सच्चा सो सच्चा.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  421.5
    },
    {
        "file":  "भगवान_् पर विश्वास.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  191.7
    },
    {
        "file":  "भगवान_् से अपनापन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  284.7
    },
    {
        "file":  "भगवान् का हेतु रहित सौहार्द.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  57.2
    },
    {
        "file":  "भगवान् की दया.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  108.5
    },
    {
        "file":  "भगवान् की पूजा के पुष्प.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  448.4
    },
    {
        "file":  "भगवान् के स्वभाव का रहस्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  649.3
    },
    {
        "file":  "भगवान् क्या है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  92.5
    },
    {
        "file":  "भगवान् श्रीकृष्ण की कृपा तथा दिव्य प्रेमकी प्राप्तिके लिये.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  64.9
    },
    {
        "file":  "भगवान् सदा तुम्हारे साथ हैं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  472.5
    },
    {
        "file":  "भगवान् कैसे मिलें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  411.9
    },
    {
        "file":  "भजन-संग्रह.html",
        "category":  "Bajans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1348.7
    },
    {
        "file":  "भजनामृत.html",
        "category":  "Bajans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  362
    },
    {
        "file":  "भले का फल भला.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  86.5
    },
    {
        "file":  "भवरोगकी रामबाण दवा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  512.8
    },
    {
        "file":  "भागवत नवनीत.html",
        "category":  "Siksha evam Katha",
        "author":  "सन्त श्रीरामचन्द्र केशव डोंगरेजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3992.5
    },
    {
        "file":  "भागवतरत्न प्रह्लाद.html",
        "category":  "Siksha evam Katha",
        "author":  "चतुर्वेदी पं० श्रीद्वारकाप्रसाद शर्मा",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  993.2
    },
    {
        "file":  "भागवतस्तुतिसंग्रह.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "पं० नित्यानन्द पाण्डेय",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2399.5
    },
    {
        "file":  "भारतीय संस्कृति तथा शास्त्रों में नारी धर्म.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  161.8
    },
    {
        "file":  "भीष्मस्तवराज.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  35.4
    },
    {
        "file":  "भूले न भुलाये.html",
        "category":  "Siksha evam Katha",
        "author":  "रामेश्वर टांटिया",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  506.6
    },
    {
        "file":  "मधुर.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1021.4
    },
    {
        "file":  "मन को वश करने के कुछ उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  62.7
    },
    {
        "file":  "मनुष्य का परम कर्तव्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1259.3
    },
    {
        "file":  "मनुष्य जीवन का उद्देश्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  419.9
    },
    {
        "file":  "मनुष्य जीवन की सफलता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1105.3
    },
    {
        "file":  "महत्त्वपूर्ण कल्याणकारी बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  407.3
    },
    {
        "file":  "महत्त्वपूर्ण चेतावनी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  425.6
    },
    {
        "file":  "महत्त्वपूर्ण प्रश्नोत्तर.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  909.9
    },
    {
        "file":  "महत्वपूर्ण शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1480.5
    },
    {
        "file":  "महाकुम्भ पर्व.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  212
    },
    {
        "file":  "महात्मा किसे कहते हैं.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  77.7
    },
    {
        "file":  "महात्मा विदुर.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीशान्तनुविहारीजी द्विवेदी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  168.8
    },
    {
        "file":  "महात्माओं की अहैतु की दया.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  404.1
    },
    {
        "file":  "महापाप से बचो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  138.5
    },
    {
        "file":  "महाभारत के कुछ आदर्श पात्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  409.6
    },
    {
        "file":  "महाभाव कल्लोलिनी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  246.9
    },
    {
        "file":  "माघ मास माहात्म्य.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  196.1
    },
    {
        "file":  "मातृशक्ति का घोर अपमान.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  155.4
    },
    {
        "file":  "मानव कल्याण के साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  763.6
    },
    {
        "file":  "मानव जीवन का लक्ष्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  871.1
    },
    {
        "file":  "मानव धर्म.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  304.7
    },
    {
        "file":  "मानवता का पुजारी.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  422.8
    },
    {
        "file":  "मानवमात्र के कल्याण के लिये.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  742.7
    },
    {
        "file":  "मानस में नाम-वन्दना.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  549.5
    },
    {
        "file":  "मानस रहस्य.html",
        "category":  "Siksha evam Katha",
        "author":  "जयरामदास ‘दीन’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1692.5
    },
    {
        "file":  "मानस शंका समाधान.html",
        "category":  "Siksha evam Katha",
        "author":  "जयरामदास ‘दीन’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  594
    },
    {
        "file":  "मानसिक दक्षता.html",
        "category":  "Siksha evam Katha",
        "author":  "श्री राजेन्द्र बिहारी लाल",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1038.1
    },
    {
        "file":  "मूर्ति पूजा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  75.2
    },
    {
        "file":  "मेरा अनुभव.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  586.6
    },
    {
        "file":  "मेरे तो गिरधर गोपाल.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  415.1
    },
    {
        "file":  "यह विकास है या विनाश जरा सोचिये.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  104.3
    },
    {
        "file":  "रहस्यमय प्रवचन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  568.2
    },
    {
        "file":  "रामस्तवराज.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  78.2
    },
    {
        "file":  "रामाज्ञा प्रश्न.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  281
    },
    {
        "file":  "रामायण के कुछ आदर्श पात्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  517.3
    },
    {
        "file":  "रुद्राष्टाध्यायी.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  549.9
    },
    {
        "file":  "लघुसिद्धान्तकौमुदी.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1302
    },
    {
        "file":  "लोक परलोक का सुधार.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  669.5
    },
    {
        "file":  "वर्तमान शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  156.9
    },
    {
        "file":  "वासुदेव सर्वम्.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  226.7
    },
    {
        "file":  "वास्तविक त्याग.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  382.1
    },
    {
        "file":  "वास्तविक सुख.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  337.2
    },
    {
        "file":  "विदुरनीति.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  488.3
    },
    {
        "file":  "विनय-पत्रिका.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1483.9
    },
    {
        "file":  "विरह पदावली.html",
        "category":  "Bajans",
        "author":  "श्रीसूरदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  872.9
    },
    {
        "file":  "विवाह में दहेज.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  39.6
    },
    {
        "file":  "विवेक चूडामणि.html",
        "category":  "Vedant",
        "author":  "जगद्गुरु आदि शंकराचार्य",
        "tikakar":  "",
        "translator":  "श्रीमुनिलाल गुप्त",
        "publisher":  "गीताप्रेस",
        "sizeKB":  556.3
    },
    {
        "file":  "वीर बालक.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  180.1
    },
    {
        "file":  "वेदान्त-दर्शन (ब्रह्मसूत्र).html",
        "category":  "Vedant",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2037.7
    },
    {
        "file":  "योग-दर्शन.html",
        "category":  "Vedant",
        "author":  "",
        "tikakar":  "श्रीहरिकृष्णदास गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  518.8
    },
    {
        "file":  "वैदिक सूक्त संग्रह.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  943.2
    },
    {
        "file":  "वैराग्य संदीपनी.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  55.5
    },
    {
        "file":  "वैराग्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  90.1
    },
    {
        "file":  "वैशाख कार्तिक माघ मास माहात्म्य.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1153
    },
    {
        "file":  "व्यवहार और परमार्थ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  826.6
    },
    {
        "file":  "व्यवहार दर्शन पीयूष.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रद्धेय ब्रह्मचारी श्रीत्र्यम्बकेश्वरजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  322.2
    },
    {
        "file":  "व्यवहार सुधार और परमार्थ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  395.7
    },
    {
        "file":  "व्यवहारमें परमार्थकी कला.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  760.8
    },
    {
        "file":  "व्यापार सुधार की आवश्यकता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  68.4
    },
    {
        "file":  "व्रत परिचय.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "पं० हनूमान शर्मा",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1636.2
    },
    {
        "file":  "अनंत चतुर्दशी व्रत महत्व व पूजा विधि एवं कथा.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  70.8
    },
    {
        "file":  "शक्तिपीठ दर्शन.html",
        "category":  "Teerth Sthal",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  543.8
    },
    {
        "file":  "शतनामस्तोत्रसंग्रह.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  831.9
    },
    {
        "file":  "शतश्लोकी.html",
        "category":  "Siksha evam Katha",
        "author":  "जगद्गुरु आदि शंकराचार्य",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  204.8
    },
    {
        "file":  "शरणागति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  214.3
    },
    {
        "file":  "शाण्डिल्य-भक्ति-सूत्र.html",
        "category":  "Siksha evam Katha",
        "author":  "मुनिवर शाण्डिल्य",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  94.4
    },
    {
        "file":  "शान्ति का उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  521
    },
    {
        "file":  "शान्ति कैसे मिले.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  908.7
    },
    {
        "file":  "शिक्षाप्रद ग्यारह कहानियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  385.6
    },
    {
        "file":  "शिक्षाप्रद पत्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  699.6
    },
    {
        "file":  "शिखा (चोटी) धारणकी आवश्यकता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  124.8
    },
    {
        "file":  "शिव स्मरण.html",
        "category":  "Siksha evam Katha",
        "author":  "सुदर्शनसिंह ‘चक्र’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  215.9
    },
    {
        "file":  "शिवमहिम्नस्तोत्र.html",
        "category":  "Stotra evam Naamavali",
        "author":  "श्रीपुष्पदन्त",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  114.3
    },
    {
        "file":  "शीघ्र कल्याण के सोपान.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  839.7
    },
    {
        "file":  "शोक नाश के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  50.5
    },
    {
        "file":  "श्रद्धा विश्वास और प्रेम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  842.9
    },
    {
        "file":  "श्रावणमासमाहात्म्य.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  913.6
    },
    {
        "file":  "श्री एकनाथ चरित्र.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  708.8
    },
    {
        "file":  "श्री गर्ग संहिता.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "पं० श्रीरामनारायणदत्तजी शास्त्री पाण्डेय ‘राम’; पं० श्रीगदाधरजी शर्मा; पं० श्रीरामाधारजी शुक्ल",
        "publisher":  "गीताप्रेस",
        "sizeKB":  4738.6
    },
    {
        "file":  "श्री प्रेम सुधा सागर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2612.1
    },
    {
        "file":  "श्री भगवन्नाम-चिन्तन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  704.2
    },
    {
        "file":  "श्री राम चिन्तन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  606.1
    },
    {
        "file":  "श्री सत्यनारायण व्रत कथा.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  304.3
    },
    {
        "file":  "श्री सीताराम भजन.html",
        "category":  "Bajans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  62.1
    },
    {
        "file":  "श्रीआद्यशंकराचार्यविरचित अपरोक्षानुभूति.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रीमुनिलाल गुप्त; सहित",
        "publisher":  "गीताप्रेस",
        "sizeKB":  98.7
    },
    {
        "file":  "श्रीकृष्ण गीतावली.html",
        "category":  "Bajans",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  234.6
    },
    {
        "file":  "श्रीरामचरितमानस.html",
        "category":  "Itihasas",
        "author":  "श्रीगोस्वामी तुलसीदासजी",
        "tikakar":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  4869.7
    },
    {
        "file":  "श्रीकृष्ण बाल माधुरी.html",
        "category":  "Balaupayogi",
        "author":  "श्रीसूरदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1059.4
    },
    {
        "file":  "श्रीगङ्गासहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  159.4
    },
    {
        "file":  "श्रीगोविन्ददामोदरस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  94.1
    },
    {
        "file":  "श्रीजैमिनीयाश्वमेधपर्व.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "पं० श्रीरामाधारजी शुक्ल",
        "publisher":  "गीताप्रेस",
        "sizeKB":  4006.4
    },
    {
        "file":  "श्रीतुकाराम-चरित्र.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीलक्ष्मण रामचन्द्र पांगारकर",
        "tikakar":  "",
        "translator":  "श्रीलक्ष्मण नारायण गर्दे",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2755.6
    },
    {
        "file":  "श्रीदुर्गाचालीसा एवं श्रीविन्ध्येश्वरीचालीसा.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  29.3
    },
    {
        "file":  "श्रीदुर्गासप्तशती.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "पं० श्रीरामनारायणदत्तजी शास्त्री पाण्डेय ‘राम’",
        "publisher":  "गीताप्रेस",
        "sizeKB":  916.4
    },
    {
        "file":  "श्रीनरसिंहपुराण.html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2466
    },
    {
        "file":  "श्रीविष्णुपुराण.html",
        "category":  "Purans",
        "author":  "श्रीपराशरमुनि",
        "tikakar":  "",
        "translator":  "श्रीमुनिलाल गुप्त",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3817.1
    },
    {
        "file":  "मत्स्यमहापुराण.html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  8608.4
    },
    {
        "file":  "श्रीनारायणकवच.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  51.8
    },
    {
        "file":  "श्रीप्रेमभक्तिप्रकाश.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  50.4
    },
    {
        "file":  "श्रीभक्तमाल.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीनाभादासजी",
        "tikakar":  "श्रीप्रियादासजी",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6499.3
    },
    {
        "file":  "श्रीभगवन्नाम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  170.1
    },
    {
        "file":  "श्रीभीष्मपितामह प्रथम पृष्ठ.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी अखण्डानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  522.8
    },
    {
        "file":  "श्रीभीष्मपितामह.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी अखण्डानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1149.4
    },
    {
        "file":  "श्रीमद्भगवद्गीता माहात्म्य की कहानियाँ.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  230.3
    },
    {
        "file":  "श्रीमद्भगवद्गीता शांकरभाष्य.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रीहरिकृष्णदास गोयन्दका; सहित",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3329.2
    },
    {
        "file":  "श्रीमद्भगवद्गीता श्रीरामानुज भाष्य.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "श्रीहरिकृष्णदास गोयन्दका; सहित",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2530.6
    },
    {
        "file":  "श्रीमद्भगवद्गीता_तत्त्वविवेचनी हिन्दी_टीकासहित.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6631.5
    },
    {
        "file":  "श्रीमद्भगवद्गीता_मोटे_अक्षरोंमें.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1661.6
    },
    {
        "file":  "श्रीमद्भगवद्गीता_साधक_संजीवनी.html",
        "category":  "Gita",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  12949.7
    },
    {
        "file":  "श्रीमद्वाल्मीकीय रामायण.html",
        "category":  "Itihasas",
        "author":  "महर्षि वाल्मीकि",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  17637.2
    },
    {
        "file":  "श्रीमद‍्भागवतमहापुराण.html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  15478.8
    },
    {
        "file":  "श्रीराधा माधव चिन्तन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3978.3
    },
    {
        "file":  "श्रीराधा माधव रस सुधा (षोडश गीत).html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  108.6
    },
    {
        "file":  "श्रीराधिकासहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  166.3
    },
    {
        "file":  "श्रीरामकृष्णलीला भजनावली.html",
        "category":  "Bajans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  700
    },
    {
        "file":  "श्रीरामगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  88.9
    },
    {
        "file":  "श्रीरामसहस्रनामस्तोत्रम् नामावली तथा संक्षिप्त प्रयोग-विधि सहित.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  141.5
    },
    {
        "file":  "श्रीलक्ष्मीसहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  143.4
    },
    {
        "file":  "श्रीललितासहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  340.6
    },
    {
        "file":  "श्रीवामनपुराण.html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  3770
    },
    {
        "file":  "श्रीविष्णुसहस्रनाम (शांकरभाष्य, हिन्दी अनुवाद सहित).html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "स्वामी श्रीभोलेबाबाजी",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1294.4
    },
    {
        "file":  "श्रीविष्णुसहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  76.8
    },
    {
        "file":  "श्रीशिवचालीसा.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  24.8
    },
    {
        "file":  "श्रीशिवसहस्रनामस्तोत्रम्.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  144.8
    },
    {
        "file":  "श्रीशुक सुधा सागर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  8316.6
    },
    {
        "file":  "श्रीश्रीचैतन्य-चरितावली.html",
        "category":  "Siksha evam Katha",
        "author":  "प्रभुदत्त ब्रह्मचारी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5884.3
    },
    {
        "file":  "श्रीहनुमानचालीसा (लाल रंग में).html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  29.9
    },
    {
        "file":  "श्रीहनुमानचालीसा (हिन्दी भावार्थसहित).html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  117.7
    },
    {
        "file":  "श्रीहरिवंशपुराण.html",
        "category":  "Purans",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "पं० श्रीरामनारायणदत्तजी शास्त्री पाण्डेय ‘राम’",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  11602.4
    },
    {
        "file":  "संक्षिप्त गरुडपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  4598.9
    },
    {
        "file":  "संक्षिप्त नारदपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5523.6
    },
    {
        "file":  "संक्षिप्त पद्मपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  8164.5
    },
    {
        "file":  "संक्षिप्त ब्रह्मपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2947.9
    },
    {
        "file":  "संक्षिप्त ब्रह्मवैवर्तपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5817.7
    },
    {
        "file":  "संक्षिप्त महाभारत.html",
        "category":  "Itihasas",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  14940.6
    },
    {
        "file":  "संक्षिप्त मार्कण्डेयपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2016.7
    },
    {
        "file":  "संक्षिप्त योगवासिष्ठ.html",
        "category":  "Vedant",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5130
    },
    {
        "file":  "संक्षिप्त शिवपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5071.8
    },
    {
        "file":  "संक्षिप्त श्रीमद्देवीभागवत.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  6100.7
    },
    {
        "file":  "संक्षिप्त श्रीवराहपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2829.3
    },
    {
        "file":  "संक्षिप्त स्कन्दपुराण.html",
        "category":  "Purans",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  10309.2
    },
    {
        "file":  "संत महिमा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  96.2
    },
    {
        "file":  "संत वाणी.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  933.2
    },
    {
        "file":  "संत समागम.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  357.7
    },
    {
        "file":  "संतानगोपालस्तोत्र (संतानप्राप्तिके शास्त्रीय उपाय).html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  140.9
    },
    {
        "file":  "संध्या.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  29.1
    },
    {
        "file":  "संध्योपासनविधि और तर्पण एवं बलिवैश्वदेव विधि.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  188.2
    },
    {
        "file":  "संसार का असर कैसे छूटे.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  63.6
    },
    {
        "file":  "संस्कार प्रकाश.html",
        "category":  "Nitya Puja evam Karmakand",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1919.8
    },
    {
        "file":  "सच्चा गुरु कौन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  106
    },
    {
        "file":  "सच्चा सुख और उसकी प्राप्ति के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  102.5
    },
    {
        "file":  "सच्ची सलाह.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  514.3
    },
    {
        "file":  "सच्चे और ईमानदार बालक.html",
        "category":  "Balaupayogi",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  119.1
    },
    {
        "file":  "सती द्रौपदी.html",
        "category":  "Siksha evam Katha",
        "author":  "स्वामी अखण्डानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  507.5
    },
    {
        "file":  "सती सुकला.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीरामनाथ ‘सुमन’",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  200.2
    },
    {
        "file":  "सत्य एवं प्रेरक घटनाएँ.html",
        "category":  "Siksha evam Katha",
        "author":  "भक्त रामशरणदास पिलखुआ",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  581.8
    },
    {
        "file":  "सत्य की खोज.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  319.6
    },
    {
        "file":  "सत्य की शरण से मुक्ति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  82.5
    },
    {
        "file":  "सत्यप्रेमी हरिश्चन्द्र.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीशान्तनुविहारीजी द्विवेदी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  150.3
    },
    {
        "file":  "सत्संग का प्रसाद.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  261.9
    },
    {
        "file":  "सत्संग की कुछ सार बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  48.9
    },
    {
        "file":  "सत्संग की मार्मिक बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  488.7
    },
    {
        "file":  "सत्संग की विलक्षणता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  196.6
    },
    {
        "file":  "सत्संग के अमृत कण.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  23.2
    },
    {
        "file":  "सत्संग के फूल.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  581.4
    },
    {
        "file":  "सत्संग के बिखरे मोती.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  764.3
    },
    {
        "file":  "सत्संग माला.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीमगनलाल हरिभाई व्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  311.6
    },
    {
        "file":  "सत्संग मुक्ताहार.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  254.2
    },
    {
        "file":  "सत्संग-सुधा.html",
        "category":  "Pravachan",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  696.9
    },
    {
        "file":  "सन्ध्या, सन्ध्या गायत्री का महत्त्व और ब्रह्मचर्य.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  262.4
    },
    {
        "file":  "सफलता के शिखर की सीढ़ियाँ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  369.4
    },
    {
        "file":  "सब जग ईश्वररूप है.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  364.7
    },
    {
        "file":  "सब साधनोंका सार.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  253.9
    },
    {
        "file":  "समता अमृत और विषमता विष.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  809.3
    },
    {
        "file":  "समाज सुधार.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  158
    },
    {
        "file":  "सम्पूर्ण दुखोंका अभाव कैसे हो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  402.9
    },
    {
        "file":  "सर्वोच्च पद की प्राप्ति का साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  62.8
    },
    {
        "file":  "सहज साधना.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  203.9
    },
    {
        "file":  "सहस्रनामस्तोत्रसंग्रह.html",
        "category":  "Stotra evam Naamavali",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  2943.5
    },
    {
        "file":  "सागरके मोती.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  517.1
    },
    {
        "file":  "साधक में साधुता.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीगयाप्रसादजी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  868.4
    },
    {
        "file":  "साधकों के प्रति.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  302.9
    },
    {
        "file":  "साधकोंका सहारा भगवच्चर्चा भाग-४.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1368.1
    },
    {
        "file":  "साधन और साध्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  320.9
    },
    {
        "file":  "साधन की आवश्यकता.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  580
    },
    {
        "file":  "साधन नवनीत.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  681.6
    },
    {
        "file":  "साधन पथ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  201.3
    },
    {
        "file":  "साधन सुधा निधि.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5836.2
    },
    {
        "file":  "साधन सुधा सिन्धु.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  10973.5
    },
    {
        "file":  "साधन-कल्पतरु.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  8959.9
    },
    {
        "file":  "साधना पथ.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  422.4
    },
    {
        "file":  "साधनोपयोगी पत्र.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  616.9
    },
    {
        "file":  "सार संग्रह.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  51.5
    },
    {
        "file":  "सावित्री और सत्यवान्.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  100
    },
    {
        "file":  "सिद्धान्त एवं रहस्य की बातें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  576.4
    },
    {
        "file":  "सिनेमा – मनोरञ्जन या विनाश का साधन.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  109.4
    },
    {
        "file":  "सुख-शान्ति का मार्ग.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  885.9
    },
    {
        "file":  "सुखी जीवन.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीमैत्री देवी",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  647.2
    },
    {
        "file":  "सुखी बनने के उपाय.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  817.4
    },
    {
        "file":  "सुखी बनो.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  340.8
    },
    {
        "file":  "सुन्दर समाज का निर्माण.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  558.3
    },
    {
        "file":  "सूक्ति सुधाकर.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  904.9
    },
    {
        "file":  "सूर रामचरितावली.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीसूरदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  904
    },
    {
        "file":  "सूर विनय पत्रिका.html",
        "category":  "Siksha evam Katha",
        "author":  "श्रीसूरदासजी",
        "tikakar":  "",
        "translator":  "सुदर्शन सिंह",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1179.3
    },
    {
        "file":  "स्त्रियों के लिये कर्तव्य शिक्षा.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  547.7
    },
    {
        "file":  "स्त्री धर्म प्रश्नोत्तरी.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  152.7
    },
    {
        "file":  "स्वर्ण पथ.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० रामचरण महेन्द्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  765.8
    },
    {
        "file":  "स्वाधीन कैसे बनें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  130.2
    },
    {
        "file":  "हंसगीता.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  45.1
    },
    {
        "file":  "हम ईश्वर को क्यों मानें.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  105.2
    },
    {
        "file":  "हम कैसे रहें.html",
        "category":  "Siksha evam Katha",
        "author":  "पं० श्रीलालबिहारीजी मिश्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  328.8
    },
    {
        "file":  "हमारा आश्चर्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  545.7
    },
    {
        "file":  "हमारा कर्तव्य.html",
        "category":  "Pravachan",
        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  50.8
    },
    {
        "file":  "हृदय की आदर्श विशालता.html",
        "category":  "Siksha evam Katha",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  423.1
    },
    {
        "file":  "ऋग्वेद.html",
        "category":  "Vedas",
        "author":  "महर्षि दयानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  39896.2
    },
    {
        "file":  "यजुर्वेद.html",
        "category":  "Vedas",
        "author":  "महर्षि दयानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  7310
    },
    {
        "file":  "सामवेद.html",
        "category":  "Vedas",
        "author":  "महर्षि दयानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  5580.9
    },
    {
        "file":  "अथर्ववेद.html",
        "category":  "Vedas",
        "author":  "महर्षि दयानन्द सरस्वती",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  19785.9
    },
    {
        "file":  "महकते जीवन-फूल.html",
        "category":  "Siksha evam Katha",
        "author":  "डॉ० रामचरण महेन्द्र",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  1156.2
    },
    {
        "file":  "श्रीमद्भगवद्गीता - माहात्म्यसहित.html",
        "category":  "Gita",
        "author":  "",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  846
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
        "sizeKB":  12283.2
    },
    {
        "file":  "महाभारत (आदिपर्व से स्वर्गारोहणपर्व).html",
        "category":  "Itihasas",
        "author":  "महर्षि वेदव्यास",
        "tikakar":  "",
        "translator":  "",
        "publisher":  "गीताप्रेस",
        "sizeKB":  68694.9
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
        "sizeKB":  947.6
    },
    {
        "file":  "स्वामी विवेकानन्द संक्षिप्त जीवनी तथा उपदेश.html",
        "category":  "Vedant",
        "author":  "स्वामी अपूर्वानन्द",
        "tikakar":  "",
        "translator":  "स्वामी वागीश्वरानन्द; स्वामी विदेहात्मानन्द",
        "publisher":  "",
        "sizeKB":  360.6
    },
    {
        "file":  "श्रीकृष्ण चैतन्य.html",
        "category":  "Balaupayogi",
        "author":  "डॉ. वै. वी. रमण राव",
        "tikakar":  "",
        "translator":  "डॉ. वी. जगन्नाथ रेड्डी",
        "publisher":  "",
        "sizeKB":  92.8
    },
    {
        "file":  "प्रेमयोग.html",
        "category":  "Vedant",
        "author":  "स्वामी विवेकानन्द",
        "tikakar":  "",
        "translator":  "स्व. पं. द्वारकानाथ तिवारी",
        "publisher":  "रामकृष्ण मठ",
        "sizeKB":  434.2
    }
];
