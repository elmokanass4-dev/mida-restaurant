import menuImage0 from '../assets/images/hero_braise_burger_1791299458120.jpg';
import menuImage1 from '../assets/images/handspun_shake_dessert_1791299501728.jpg';
import menuImage2 from '../assets/images/truffle_crispy_fries_1791299471201.jpg';
import menuImage3 from '../assets/images/caesar_deluxe_salad_1791299488018.jpg';
import { Restaurant, Category, Dish, Order, CustomerProfile, LoyaltyLedgerEntry } from '../types';

export const BRAISE_BURGER_ID = 'braise-burger';
export const RIAD_ATLAS_ID = 'riad-atlas';

export const SEED_RESTAURANTS: Restaurant[] = [
  {
    id: BRAISE_BURGER_ID,
    slug: 'braise-burger',
    name: 'Braise Burger',
    tagline: {
      fr: 'Burgers gastronomiques au feu de braise & frites artisanales à Meknès',
      ar: 'برغر فاخر على نار الفحم وبطاطس حرفية في مكناس',
      en: 'Artisan wood-fired gourmet burgers & hand-cut fries in Meknes'
    },
    city: 'Meknès, Maroc',
    address: 'Boulevard Allal Ben Abdallah, Hamria, Meknès',
    phone: '+212 5 35 52 14 80',
    currency: 'MAD',
    timezone: 'Africa/Casablanca',
    accentColor: '#d97706',
    coverImage: menuImage0,
    openingHours: '11:30 - 23:30 (7j/7)',
    isOpen: true,
    orderingModes: {
      table: true,
      pickup: true,
      delivery: true
    },
    deliverySettings: {
      minOrderMAD: 60,
      deliveryFeeMAD: 15,
      estimatedRange: '30-45 min',
      isPaused: false,
      zones: [
        { id: 'z1', name: 'Hamria / Ville Nouvelle', feeMAD: 15, minSpendMAD: 60, active: true },
        { id: 'z2', name: 'Médina Historique & Riad', feeMAD: 20, minSpendMAD: 80, active: true },
        { id: 'z3', name: 'Bassatine & Route de Fès', feeMAD: 25, minSpendMAD: 100, active: true }
      ]
    },
    tableCount: 6,
    tables: [
      { tableNumber: 1, label: 'Table 1 (Terrasse)', sessionToken: 'bb-tbl-t1-9a7c', capacity: 2 },
      { tableNumber: 2, label: 'Table 2 (Salle RDC)', sessionToken: 'bb-tbl-t2-4b2e', capacity: 4 },
      { tableNumber: 3, label: 'Table 3 (Banquette Cuir)', sessionToken: 'bb-tbl-t3-8d1f', capacity: 4 },
      { tableNumber: 4, label: 'Table 4 (Grande Table Famille)', sessionToken: 'bb-tbl-t4-3e9a', capacity: 6 },
      { tableNumber: 5, label: 'Table 5 (Mezzanine Cosy)', sessionToken: 'bb-tbl-t5-6f4c', capacity: 2 },
      { tableNumber: 6, label: 'Table 6 (Verrière Lumineuse)', sessionToken: 'bb-tbl-t6-2a8b', capacity: 4 }
    ],
    prepTimeEstimateMinutes: 20,
    taxRatePercent: 10,
    loyaltyConfig: {
      pointsPerMAD: 1,
      pointsToRedeem: 100,
      rewardValueMAD: 15,
      welcomePoints: 50
    },
    returnCampaigns: [
      {
        id: 'camp-inactivity-21',
        name: 'Campagne Réactivation Gourmet (21 jours)',
        enabled: true,
        triggerDaysInactive: 21,
        minPastOrders: 1,
        rewardType: 'discount_percent',
        discountPercent: 15,
        minSpendMAD: 100,
        maxDiscountMAD: 30,
        expiryDays: 7,
        frequencyCapDays: 30,
        cooldownPeriodDays: 60,
        messageTemplate: {
          fr: 'Sarah, vous nous manquez chez Braise Burger ! -15% sur votre commande avec le code RETOUR15.',
          ar: 'سارة، اشتقنا إليك في بريز برغر! خصم 15% على طلبك القادم مع كود RETOUR15.',
          en: 'Sarah, we miss you at Braise Burger! Enjoy 15% off your next meal with code RETOUR15.'
        },
        stats: {
          eligibleCount: 14,
          sentCount: 12,
          redeemedCount: 5,
          incrementalSalesMAD: 640
        }
      },
      {
        id: 'camp-frequent-sides',
        name: 'Fidélité Passionnés (Frites Truffées Offertes)',
        enabled: true,
        triggerDaysInactive: 7,
        minPastOrders: 3,
        rewardType: 'free_item',
        freeItemDishId: 'dish-truffle-fries',
        freeItemDishName: 'Truffle Fries artisanales',
        minSpendMAD: 80,
        expiryDays: 5,
        frequencyCapDays: 14,
        cooldownPeriodDays: 30,
        messageTemplate: {
          fr: 'Merci pour votre fidélité ! Vos Frites Truffées sont offertes dès 80 MAD commandés.',
          ar: 'شكراً لوفائك الدائم! بطاطس الترفل الفاخرة مهداة لك عند طلب أكثر من 80 درهم.',
          en: 'Thank you for your loyalty! Your Truffle Fries are on the house on orders over 80 MAD.'
        },
        stats: {
          eligibleCount: 22,
          sentCount: 19,
          redeemedCount: 11,
          incrementalSalesMAD: 1320
        }
      }
    ]
  },
  {
    id: RIAD_ATLAS_ID,
    slug: 'riad-atlas',
    name: 'Riad Atlas Café',
    tagline: {
      fr: 'Salon de thé marocain traditionnel & délices du terroir',
      ar: 'مقهى مغربي تقليدي ونكهات أصيلة من الأطلس',
      en: 'Traditional Moroccan tea salon & authentic pastries'
    },
    city: 'Meknès, Médina',
    address: 'Place El Hedim, Médina, Meknès',
    phone: '+212 5 35 53 10 20',
    currency: 'MAD',
    timezone: 'Africa/Casablanca',
    accentColor: '#059669',
    coverImage: menuImage1,
    openingHours: '09:00 - 22:00 (7j/7)',
    isOpen: true,
    orderingModes: {
      table: true,
      pickup: true,
      delivery: false
    },
    deliverySettings: {
      minOrderMAD: 50,
      deliveryFeeMAD: 10,
      estimatedRange: '25-35 min',
      isPaused: true,
      zones: []
    },
    tableCount: 4,
    tables: [
      { tableNumber: 1, label: 'Table Patio Fontaine', sessionToken: 'ra-tbl-t1-11aa', capacity: 4 },
      { tableNumber: 2, label: 'Table Salon Andalou', sessionToken: 'ra-tbl-t2-22bb', capacity: 6 }
    ],
    prepTimeEstimateMinutes: 15,
    taxRatePercent: 10,
    loyaltyConfig: {
      pointsPerMAD: 1,
      pointsToRedeem: 80,
      rewardValueMAD: 10,
      welcomePoints: 20
    },
    returnCampaigns: []
  }
];

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-burgers',
    restaurantId: BRAISE_BURGER_ID,
    name: { fr: 'Burgers Braisés', ar: 'برغر على الفحم', en: 'Signature Burgers' },
    slug: 'burgers',
    sortOrder: 1
  },
  {
    id: 'cat-sides',
    restaurantId: BRAISE_BURGER_ID,
    name: { fr: 'Accompagnements', ar: 'أطباق جانبية', en: 'Artisanal Sides' },
    slug: 'sides',
    sortOrder: 2
  },
  {
    id: 'cat-salads',
    restaurantId: BRAISE_BURGER_ID,
    name: { fr: 'Salades Fraîches', ar: 'سلطات طازجة', en: 'Gourmet Salads' },
    slug: 'salads',
    sortOrder: 3
  },
  {
    id: 'cat-shakes-desserts',
    restaurantId: BRAISE_BURGER_ID,
    name: { fr: 'Milkshakes & Douceurs', ar: 'مشروبات وحلويات', en: 'Handspun Shakes' },
    slug: 'desserts',
    sortOrder: 4
  },
  {
    id: 'cat-drinks',
    restaurantId: BRAISE_BURGER_ID,
    name: { fr: 'Boissons & Thés', ar: 'مشروبات منعشة', en: 'Beverages' },
    slug: 'drinks',
    sortOrder: 5
  },
  // Riad Atlas Category
  {
    id: 'cat-riad-tea',
    restaurantId: RIAD_ATLAS_ID,
    name: { fr: 'Thés & Pâtisseries', ar: 'شاي وحلويات مغربية', en: 'Moroccan Tea & Sweets' },
    slug: 'moroccan-tea',
    sortOrder: 1
  }
];

export const SEED_DISHES: Dish[] = [
  {
    id: 'dish-heirloom-burger',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-burgers',
    name: {
      fr: 'Le Braisé Signature (The Heirloom)',
      ar: 'برغر البريز المميز (ذا إيرلوم)',
      en: 'The Heirloom Burger'
    },
    description: {
      fr: 'Steak de bœuf charolais braisé, aïoli à la truffe, cheddar affiné fondant, roquette fraîche et oignons croustillants sur brioche dorée.',
      ar: 'لحم بقري فاخر مشوي على الفحم، آيولي الترفل، جبن شيدر معتق، جرجير طازج، وبصل مقرمش في خبز بريوش مذهب.',
      en: 'Gourmet beef patty, truffle aioli, aged cheddar, fresh arugula, and crispy onions on toasted brioche.'
    },
    priceMAD: 85,
    image: menuImage0,
    isAvailable: true,
    isFeatured: true,
    ingredients: {
      fr: ['Bœuf charolais halal 150g', 'Pain brioché maison', 'Cheddar rouge affiné 12 mois', 'Aïoli maison à la truffe noire', 'Roquette sauvage', 'Oignons frits croustillants'],
      ar: ['لحم بقر حلال 150غ', 'خبز بريوش محلي', 'جبن شيدر معتق', 'آيولي الترفل الأسود', 'جرجير بري', 'بصل مقرمش'],
      en: ['Halal beef patty 150g', 'Artisan brioche bun', '12-month aged cheddar', 'Black truffle aioli', 'Wild arugula', 'Crispy fried onions']
    },
    verifiedAllergens: ['Gluten', 'Lactose', 'Oeufs'],
    dietaryLabels: ['Halal Certifié', 'Signature du Chef', 'Bestseller'],
    modifierGroups: [
      {
        id: 'mod-patty-size',
        name: { fr: 'Taille du steak', ar: 'حجم اللحم', en: 'Patty size' },
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'opt-patty-single', name: { fr: 'Simple Patty (150g)', ar: 'شريحة واحدة (150غ)', en: 'Single Patty (150g)' }, priceMAD: 0 },
          { id: 'opt-patty-double', name: { fr: 'Double Patty (300g)', ar: 'شريحتان (300غ)', en: 'Double Patty (300g)' }, priceMAD: 25 }
        ]
      },
      {
        id: 'mod-cooking',
        name: { fr: 'Cuisson de la viande', ar: 'درجة طهي اللحم', en: 'Meat doneness' },
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'opt-cook-medium', name: { fr: 'À point (recommandé)', ar: 'متوسط الطهي (موصى به)', en: 'Medium (recommended)' }, priceMAD: 0 },
          { id: 'opt-cook-well', name: { fr: 'Bien cuit', ar: 'مطهو جيداً', en: 'Well done' }, priceMAD: 0 }
        ]
      },
      {
        id: 'mod-side-choice',
        name: { fr: 'Choix de l\'accompagnement', ar: 'الطبق الجانبي', en: 'Side dish' },
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'opt-side-fries', name: { fr: 'Frites rustiques maison', ar: 'بطاطس مقلية منزلية', en: 'House rustic fries' }, priceMAD: 0 },
          { id: 'opt-side-truffle', name: { fr: 'Frites truffées & parmesan (+18 MAD)', ar: 'بطاطس الترفل والبارميزان (+18 درهم)', en: 'Truffle fries & parmesan (+18 MAD)' }, priceMAD: 18 },
          { id: 'opt-side-salad', name: { fr: 'Petite salade verte', ar: 'سلطة خضراء صغيرة', en: 'Side green salad' }, priceMAD: 0 }
        ]
      },
      {
        id: 'mod-extras',
        name: { fr: 'Suppléments gourmands (jusqu\'à 3)', ar: 'إضافات شهية (حتى 3)', en: 'Extras (up to 3)' },
        required: false,
        minSelections: 0,
        maxSelections: 3,
        options: [
          { id: 'opt-ex-bacon', name: { fr: 'Bacon de bœuf fumé croustillant', ar: 'لحم بقري مقدد مدخن', en: 'Crispy smoked beef bacon' }, priceMAD: 12 },
          { id: 'opt-ex-cheddar', name: { fr: 'Double tranche cheddar fondu', ar: 'شريحة شيدر إضافية ذائبة', en: 'Extra melted cheddar slice' }, priceMAD: 10 },
          { id: 'opt-ex-onions', name: { fr: 'Oignons caramélisés au thym', ar: 'بصل مكرمل بالزعتر', en: 'Caramelized thyme onions' }, priceMAD: 6 },
          { id: 'opt-ex-sauce', name: { fr: 'Pot d\'aïoli à la truffe supplémentaire', ar: 'صلصة آيولي الترفل إضافية', en: 'Extra truffle aioli dip' }, priceMAD: 8 }
        ]
      },
      {
        id: 'mod-removals',
        name: { fr: 'Retirer des ingrédients (Optionnel)', ar: 'إزالة مكونات (اختياري)', en: 'Remove ingredients (Optional)' },
        required: false,
        minSelections: 0,
        maxSelections: 3,
        options: [
          { id: 'opt-rem-onions', name: { fr: 'Sans oignons croustillants', ar: 'بدون بصل مقرمش', en: 'No crispy onions' }, priceMAD: 0 },
          { id: 'opt-rem-arugula', name: { fr: 'Sans roquette', ar: 'بدون جرجير', en: 'No arugula' }, priceMAD: 0 }
        ]
      }
    ]
  },
  {
    id: 'dish-smokey-bbq',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-burgers',
    name: {
      fr: 'Le Smokey BBQ & Bacon',
      ar: 'سموكي باربكيو وبيكون',
      en: 'The Smokey BBQ Stack'
    },
    description: {
      fr: 'Steak braisé, bacon de bœuf halal croustillant, cheddar fondu, sauce barbecue fumée artisanale et pickles maison.',
      ar: 'شريحة لحم مشوية، بيكون بقر حلال مقرمش، شيدر ذائب، صلصة باربكيو مدخنة وخيار مخلل منزلي.',
      en: 'Charcoal-grilled patty, crisp smoked beef bacon, melted cheddar, house smoky BBQ sauce, and pickled relish.'
    },
    priceMAD: 89,
    image: menuImage0,
    isAvailable: true,
    ingredients: {
      fr: ['Bœuf charolais 150g', 'Bacon de bœuf fumé halal', 'Cheddar affiné', 'Sauce barbecue fumée', 'Pickles de concombre'],
      ar: ['لحم بقر 150غ', 'بيكون بقر مدخن', 'جبن شيدر', 'صلصة باربكيو', 'مخلل خيار'],
      en: ['Beef patty 150g', 'Halal smoked beef bacon', 'Aged cheddar', 'Smoky BBQ sauce', 'Cucumber pickles']
    },
    verifiedAllergens: ['Gluten', 'Lactose', 'Moutarde'],
    dietaryLabels: ['Halal Certifié', 'Coup de Cœur'],
    modifierGroups: [
      {
        id: 'mod-cooking-smokey',
        name: { fr: 'Cuisson', ar: 'الطهي', en: 'Doneness' },
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'opt-smokey-med', name: { fr: 'À point', ar: 'متوسط', en: 'Medium' }, priceMAD: 0 },
          { id: 'opt-smokey-well', name: { fr: 'Bien cuit', ar: 'مطهو جيداً', en: 'Well done' }, priceMAD: 0 }
        ]
      }
    ]
  },
  {
    id: 'dish-harissa-crunch',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-burgers',
    name: {
      fr: 'Le Crispy Harissa Crunch',
      ar: 'كريسبي هريسة كرانش',
      en: 'Crispy Harissa Crunch Chicken'
    },
    description: {
      fr: 'Filet de poulet fermier extra croustillant mariné au paprika fumé, émulsion harissa douce et miel d\'oranger, salade croquante.',
      ar: 'صدر دجاج مقرمش متبل بالفلفل الحلو، صوص هريسة معتدلة وعسل زهر البرتقال، سلطة طازجة مقرمشة.',
      en: 'Super crispy farm chicken breast, smoked spices marinade, sweet harissa honey emulsion, crunchy slaw.'
    },
    priceMAD: 75,
    image: menuImage0,
    isAvailable: true,
    ingredients: {
      fr: ['Poulet fermier pané', 'Harissa douce artisanale', 'Miel de fleur d\'oranger', 'Salade iceberg', 'Pickles d\'oignons rouges'],
      ar: ['دجاج بلدي مقرمش', 'هريسة منزلية خفيفة', 'عسل البرتقال', 'خس آيسبيرغ', 'مخلل بصل'],
      en: ['Crispy chicken breast', 'Sweet artisan harissa', 'Orange blossom honey', 'Iceberg lettuce', 'Pickled red onions']
    },
    verifiedAllergens: ['Gluten', 'Oeufs', 'Lactose'],
    dietaryLabels: ['Halal Certifié', 'Épicé Doux'],
    modifierGroups: []
  },
  {
    id: 'dish-halloumi-veggie',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-burgers',
    name: {
      fr: 'Le Végé Halloumi Grillé',
      ar: 'برغر الحلومي المشوي النباتي',
      en: 'Grilled Halloumi Veggie'
    },
    description: {
      fr: 'Généreux pavé de halloumi doré, poivrons rouges rôtis, compotée d\'aubergine zaalouk au cumin, roquette fraîche.',
      ar: 'قطعة سخية من جبن الحلوم المشوي الذهبي، فلفل أحمر مشوي، زعلوك الباذنجان بالكمون، وجرجير طازج.',
      en: 'Golden thick-cut grilled halloumi, wood-roasted red bell peppers, spiced cumin eggplant zaalouk, fresh arugula.'
    },
    priceMAD: 72,
    image: menuImage0,
    isAvailable: true,
    ingredients: {
      fr: ['Halloumi au lait de brebis', 'Caviar d\'aubergine zaalouk', 'Poivrons rouges rôtis', 'Pesto de menthe fraîche'],
      ar: ['جبن حلوم بلدي', 'زعلوك الباذنجان', 'فلفل أحمر مشوي', 'بيستو النعناع'],
      en: ['Grilled halloumi cheese', 'Eggplant zaalouk', 'Roasted sweet peppers', 'Mint pesto']
    },
    verifiedAllergens: ['Lactose', 'Gluten'],
    dietaryLabels: ['Végétarien', 'Recette Méditerranéenne'],
    modifierGroups: []
  },
  // Sides
  {
    id: 'dish-truffle-fries',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-sides',
    name: {
      fr: 'Truffle Fries Artisanales',
      ar: 'بطاطس مقلية بالترفل والبارميزان',
      en: 'Artisanal Truffle Fries'
    },
    description: {
      fr: 'Frites fraîches taillées main, arrosées d\'huile de truffe blanche parfumée, copeaux de parmesan affiné et persil frais ciselé, servies avec dip aïoli.',
      ar: 'بطاطس طازجة مقطعة يدوياً، زيت الترفل الأبيض المعطر، رقائق بارميزان معتق وبقدونس طازج، تقدم مع صوص الآيولي.',
      en: 'Hand-cut golden fries drizzled with white truffle oil, shaved aged parmesan, and fresh herbs, served with truffle dip.'
    },
    priceMAD: 32,
    image: menuImage2,
    isAvailable: true,
    isFeatured: true,
    ingredients: {
      fr: ['Pommes de terre fraîches du Saïss', 'Huile de truffe blanche', 'Parmesan Reggiano 18 mois', 'Persil plat', 'Aïoli maison'],
      ar: ['بطاطس طازجة من منطقة سايس', 'زيت الترفل الأبيض', 'بارميزان معتق', 'بقدونس طازج', 'آيولي منزلي'],
      en: ['Fresh local potatoes', 'White truffle oil', '18-month Parmesan Reggiano', 'Flat parsley', 'House aioli']
    },
    verifiedAllergens: ['Lactose', 'Oeufs'],
    dietaryLabels: ['Végétarien', 'Bestseller'],
    modifierGroups: []
  },
  {
    id: 'dish-rustic-fries',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-sides',
    name: {
      fr: 'Frites Rustiques Maison',
      ar: 'بطاطس مقلية قروية',
      en: 'House Rustic Fries'
    },
    description: {
      fr: 'Frites fraîches double cuisson, assaisonnées au sel de Guérande et touche de paprika fumé.',
      ar: 'بطاطس مقلية مزدوجة القرمشة متبلة بملح نقي ولمسة بابريكا مدخنة.',
      en: 'Double-cooked crispy rustic fries with sea salt and smoked paprika.'
    },
    priceMAD: 22,
    image: menuImage2,
    isAvailable: true,
    ingredients: {
      fr: ['Pommes de terre fraîches', 'Sel marin', 'Paprika doux fumé'],
      ar: ['بطاطس طازجة', 'ملح بحري', 'بابريكا مدخنة'],
      en: ['Fresh potatoes', 'Sea salt', 'Smoked paprika']
    },
    verifiedAllergens: [],
    dietaryLabels: ['Végan', 'Sans Gluten'],
    modifierGroups: []
  },
  {
    id: 'dish-loaded-fries',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-sides',
    name: {
      fr: 'Loaded Fries Bœuf Braisé & Cheddar',
      ar: 'بطاطس لودد باللحم المفتت والشيدر',
      en: 'Braised Beef Loaded Fries'
    },
    description: {
      fr: 'Grosse portion de frites garnie d\'effiloché de bœuf braisé fondant, sauce cheddar chaude fondue et piments jalapeños.',
      ar: 'كمية وفيرة من البطاطس مغطاة بلحم البقر المفتت المطهو ببطء، صوص الشيدر الساخن وفلفل الهالبينو.',
      en: 'Crispy fries loaded with slow-cooked shredded braised beef, warm cheddar cheese sauce, and sliced jalapeños.'
    },
    priceMAD: 45,
    image: menuImage2,
    isAvailable: true,
    ingredients: {
      fr: ['Frites fraîches', 'Effiloché de bœuf braisé 6h', 'Sauce cheddar fondue', 'Jalapeños marinés', 'Oignons frits'],
      ar: ['بطاطس طازجة', 'لحم بقر مطهو 6 ساعات', 'صلصة شيدر ذائبة', 'هالبينو', 'بصل مقلي'],
      en: ['Crispy fries', '6-hour braised shredded beef', 'Melted cheddar sauce', 'Pickled jalapeños', 'Crispy onions']
    },
    verifiedAllergens: ['Lactose', 'Gluten'],
    dietaryLabels: ['Halal Certifié', 'Très Gourmand'],
    modifierGroups: []
  },
  // Salads
  {
    id: 'dish-caesar-deluxe',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-salads',
    name: {
      fr: 'Salade Caesar Deluxe',
      ar: 'سلطة سيزر ديلوكس بالدجاج',
      en: 'Caesar Deluxe Salad'
    },
    description: {
      fr: 'Cœurs de romaine croquants, aiguillettes de poulet grillé aux herbes, copeaux de parmesan reggiano, croûtons dorés à l\'ail et sauce Caesar onctueuse.',
      ar: 'قلوب الخس المقرمشة، شرائح دجاج مشوي متبل بالأعشاب، رقائق جبن البارميزان، خبز محمص بالثوم، وصلصة سيزر غنية.',
      en: 'Crisp romaine hearts, herb-grilled tender chicken slices, shaved Parmesan Reggiano, garlic herb croutons, and creamy Caesar dressing.'
    },
    priceMAD: 48,
    image: menuImage3,
    isAvailable: true,
    isFeatured: true,
    ingredients: {
      fr: ['Salade romaine fraîche', 'Poulet fermier grillé', 'Parmesan 18 mois', 'Croûtons de pain au levain', 'Sauce Caesar maison'],
      ar: ['خس روماني طازج', 'دجاج مشوي', 'جبن بارميزان', 'خبز محمص بالثوم', 'صلصة سيزر خاصة'],
      en: ['Romaine lettuce', 'Grilled chicken breast', 'Shaved parmesan', 'Sourdough garlic croutons', 'House Caesar dressing']
    },
    verifiedAllergens: ['Gluten', 'Lactose', 'Oeufs', 'Moutarde'],
    dietaryLabels: ['Halal Certifié', 'Riche en Protéines'],
    modifierGroups: []
  },
  // Shakes & Desserts
  {
    id: 'dish-shake-caramel',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-shakes-desserts',
    name: {
      fr: 'Handspun Shake Caramel & Noix',
      ar: 'ميلك شيك كراميل ومكسرات محمصة',
      en: 'Handspun Salted Caramel Shake'
    },
    description: {
      fr: 'Crème glacée vanille artisanale battue à la main, caramel au beurre salé, noix caramélisées croquantes et nuage de chantilly.',
      ar: 'آيس كريم فانيليا محضر يدوياً، كراميل بالزبدة المملحة، مكسرات مكرملة مقرمشة وكريمة خفق غنية.',
      en: 'Artisan vanilla ice cream handspun with salted butter caramel, crunchy caramelized nuts, and whipped cream swirl.'
    },
    priceMAD: 38,
    image: menuImage1,
    isAvailable: true,
    isFeatured: true,
    ingredients: {
      fr: ['Glace vanille artisanale', 'Lait entier pasteurisé', 'Caramel beurre salé maison', 'Noix de pécan caramélisées', 'Crème chantilly fraîche'],
      ar: ['آيس كريم فانيليا', 'حليب طازج', 'كراميل مملح', 'مكسرات مكرملة', 'كريمة مخفوقة'],
      en: ['Artisan vanilla ice cream', 'Whole milk', 'House salted caramel', 'Caramelized pecans', 'Fresh whipped cream']
    },
    verifiedAllergens: ['Lactose', 'Fruits à coque'],
    dietaryLabels: ['Végétarien', 'Fait Maison'],
    modifierGroups: []
  },
  {
    id: 'dish-shake-choc',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-shakes-desserts',
    name: {
      fr: 'Milkshake Chocolat Noir 70%',
      ar: 'ميلك شيك شوكولاتة داكنة 70%',
      en: 'Dark Chocolate Intense Shake'
    },
    description: {
      fr: 'Glace chocolat noir grand cru, coulis de chocolat noir fondu et copeaux croquants de fèves de cacao.',
      ar: 'آيس كريم شوكولاتة داكنة نقية، صوص شوكولاتة بلجيكية وحبيبات كاكاو مقرمشة.',
      en: 'Grand Cru dark chocolate ice cream, melted Belgian chocolate drizzle, and cacao nibs.'
    },
    priceMAD: 38,
    image: menuImage1,
    isAvailable: true,
    ingredients: {
      fr: ['Glace chocolat 70%', 'Lait entier', 'Chocolat noir fondu', 'Chantilly'],
      ar: ['آيس كريم شوكولاتة', 'حليب كامل الدسم', 'شوكولاتة مذابة', 'كريمة'],
      en: ['70% dark chocolate ice cream', 'Whole milk', 'Melted dark chocolate', 'Whipped cream']
    },
    verifiedAllergens: ['Lactose'],
    dietaryLabels: ['Végétarien'],
    modifierGroups: []
  },
  {
    id: 'dish-fondant-choc',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-shakes-desserts',
    name: {
      fr: 'Fondant au Chocolat Cœur Coulant',
      ar: 'فوندان الشوكولاتة الذائب',
      en: 'Molten Chocolate Lava Cake'
    },
    description: {
      fr: 'Gâteau moelleux au chocolat noir avec cœur tiède ultra coulant, servi avec une boule de glace vanille bourbon.',
      ar: 'كعكة شوكولاتة دافئة مع قلب شوكولاتة سائل يذوب في الفم، تقدم مع آيس كريم فانيليا بوربون.',
      en: 'Warm dark chocolate sponge cake with liquid molten centre, served with Bourbon vanilla ice cream scoop.'
    },
    priceMAD: 35,
    image: menuImage1,
    // Sold out to fulfill prompt specification: "At least one sold-out item"
    isAvailable: false,
    ingredients: {
      fr: ['Chocolat noir 65%', 'Beurre doux', 'Farine bio', 'Œufs frais', 'Glace vanille'],
      ar: ['شوكولاتة داكنة', 'زبدة', 'دقيق', 'بيض طازج', 'فانيليا'],
      en: ['Dark chocolate 65%', 'Butter', 'Flour', 'Eggs', 'Vanilla ice cream']
    },
    verifiedAllergens: ['Gluten', 'Lactose', 'Oeufs'],
    dietaryLabels: ['Végétarien', 'Épuisé ce soir'],
    modifierGroups: []
  },
  // Beverages
  {
    id: 'dish-ice-tea',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-drinks',
    name: {
      fr: 'Thé Glacé Maison Menthe & Citron Vert',
      ar: 'شاي مثلج بالنعناع المكناسي والليمون الأخضر',
      en: 'House Iced Mint & Lime Tea'
    },
    description: {
      fr: 'Infusion fraîche de menthe verte marocaine de Meknès, thé vert gunpowder, jus de citron vert pressé et sucre de canne léger.',
      ar: 'مستحلب النعناع المكناسي الطازج مع الشاي الأخضر الأصيل وعصير الليمون الأخضر المنعش.',
      en: 'Fresh Moroccan garden mint infusion with gunpowder green tea, fresh lime juice, and light cane sugar over ice.'
    },
    priceMAD: 20,
    image: menuImage1,
    isAvailable: true,
    ingredients: {
      fr: ['Menthe fraîche de Meknès', 'Thé vert gunpowder', 'Citron vert', 'Sucre de canne'],
      ar: ['نعناع مكناسي طازج', 'شاي أخضر', 'ليمون أخضر', 'سكر القصب'],
      en: ['Fresh Meknes spearmint', 'Gunpowder green tea', 'Lime juice', 'Cane sugar']
    },
    verifiedAllergens: [],
    dietaryLabels: ['Végan', 'Boisson Rafraîchissante'],
    modifierGroups: []
  },
  {
    id: 'dish-orange-juice',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-drinks',
    name: {
      fr: 'Jus d\'Orange Frais Pressé du Saïss',
      ar: 'عصير برتقال سايس طازج معصور',
      en: 'Fresh Squeezed Saïss Orange Juice'
    },
    description: {
      fr: 'Oranges douces de la plaine du Saïss pressées à la commande, sans eau ni sucre ajouté.',
      ar: 'برتقال طبيعي من سهول سايس معصور فوراً عند الطلب دون أي إضافات.',
      en: '100% pure fresh-squeezed Moroccan oranges from the fertile Saïss valley, no added sugar.'
    },
    priceMAD: 22,
    image: menuImage1,
    isAvailable: true,
    ingredients: {
      fr: ['Oranges fraîches 100% pur jus'],
      ar: ['برتقال طبيعي 100%'],
      en: ['100% pure fresh oranges']
    },
    verifiedAllergens: [],
    dietaryLabels: ['100% Naturel', 'Végan'],
    modifierGroups: []
  },
  {
    id: 'dish-water-sidiali',
    restaurantId: BRAISE_BURGER_ID,
    categoryId: 'cat-drinks',
    name: {
      fr: 'Eau Minérale Naturelle Sidi Ali (50cl)',
      ar: 'مياه معدنية طبيعية سيدي علي (50سل)',
      en: 'Sidi Ali Mineral Water (50cl)'
    },
    description: {
      fr: 'Bouteille en verre servie fraîche.',
      ar: 'قنينة زجاجية تقدم باردة.',
      en: 'Glass bottle served chilled.'
    },
    priceMAD: 12,
    image: menuImage1,
    isAvailable: true,
    ingredients: {
      fr: ['Eau minérale'],
      ar: ['مياه معدنية'],
      en: ['Natural mineral water']
    },
    verifiedAllergens: [],
    dietaryLabels: [],
    modifierGroups: []
  },
  // Dish for second tenant (Riad Atlas)
  {
    id: 'dish-riad-tea-pastries',
    restaurantId: RIAD_ATLAS_ID,
    categoryId: 'cat-riad-tea',
    name: {
      fr: 'Thé à la Menthe Cérémonial & Cornes de Gazelle',
      ar: 'أتاي مغربي تقليدي وكعب الغزال',
      en: 'Ceremonial Mint Tea & Gazelle Horns'
    },
    description: {
      fr: 'Service traditionnel au samovar avec cornes de gazelle artisanales aux amandes et fleur d\'oranger.',
      ar: 'تقديم أصيل بالشاي المنعنع وحلويات كعب الغزال باللوز وماء الزهر الفاسي.',
      en: 'Traditional Moroccan mint tea served with artisanal almond gazelle horns.'
    },
    priceMAD: 45,
    image: menuImage1,
    isAvailable: true,
    ingredients: {
      fr: ['Thé vert', 'Menthe fraîche', 'Amandes de l\'Atlas', 'Fleur d\'oranger'],
      ar: ['شاي أخضر', 'نعناع', 'لوز', 'ماء زهر'],
      en: ['Green tea', 'Mint', 'Almonds', 'Orange blossom']
    },
    verifiedAllergens: ['Fruits à coque', 'Gluten'],
    dietaryLabels: ['Traditionnel'],
    modifierGroups: []
  }
];

export const SEED_CUSTOMER: CustomerProfile = {
  id: 'cust-sarah-m',
  restaurantId: BRAISE_BURGER_ID,
  name: 'Sarah Mansouri',
  phone: '+212 6 61 23 45 67',
  email: 'sarah.mansouri@example.ma',
  loyaltyPoints: 140,
  favoriteDishIds: ['dish-heirloom-burger', 'dish-truffle-fries'],
  totalOrdersCount: 4,
  totalSpentMAD: 380,
  lastPurchaseDate: '2026-09-12T19:30:00Z', // 24 days ago: qualifies for 21-day inactivity campaign!
  marketingConsent: true,
  marketingConsentTimestamp: '2026-06-10T14:12:00Z',
  availableOffers: [
    {
      id: 'off-sarah-return15',
      campaignId: 'camp-inactivity-21',
      title: {
        fr: 'Offre Retour -15% sur votre commande',
        ar: 'عرض عودة: خصم 15% على طلبك',
        en: 'Welcome Back: 15% off your order'
      },
      code: 'RETOUR15',
      description: {
        fr: 'Valable dès 100 MAD d\'achat sur toute la carte braisée (Max 30 MAD). Non cumulable.',
        ar: 'صالح عند الطلب بقيمة 100 درهم أو أكثر (الحد الأقصى للخصم 30 درهم).',
        en: 'Valid on orders over 100 MAD across the menu (Max 30 MAD discount).'
      },
      minSpendMAD: 100,
      discountPercent: 15,
      expiresAt: '2026-10-15T23:59:59Z',
      isRedeemed: false
    }
  ]
};

export const SEED_LOYALTY_LEDGER: LoyaltyLedgerEntry[] = [
  {
    id: 'led-1',
    restaurantId: BRAISE_BURGER_ID,
    customerId: 'cust-sarah-m',
    timestamp: '2026-06-10T14:15:00Z',
    pointsDelta: 50,
    type: 'welcome',
    description: 'Bonus de bienvenue au programme fidélité Braise Club'
  },
  {
    id: 'led-2',
    restaurantId: BRAISE_BURGER_ID,
    customerId: 'cust-sarah-m',
    timestamp: '2026-07-02T20:45:00Z',
    pointsDelta: 95,
    type: 'earned',
    orderId: 'ord_hist_01',
    description: 'Points gagnés sur commande sur place (95 MAD)'
  },
  {
    id: 'led-3',
    restaurantId: BRAISE_BURGER_ID,
    customerId: 'cust-sarah-m',
    timestamp: '2026-08-15T13:20:00Z',
    pointsDelta: -100,
    type: 'redeemed',
    orderId: 'ord_hist_02',
    description: 'Remise fidélité de 15 MAD utilisée sur commande'
  },
  {
    id: 'led-4',
    restaurantId: BRAISE_BURGER_ID,
    customerId: 'cust-sarah-m',
    timestamp: '2026-09-12T19:35:00Z',
    pointsDelta: 95,
    type: 'earned',
    orderId: 'ord_hist_03',
    description: 'Points gagnés sur commande livrée (95 MAD)'
  }
];

export const SEED_ORDERS: Order[] = [
  // 1. Submitted order waiting for staff action
  {
    id: 'ord-1042',
    orderNumber: 'BB-1042',
    secureRef: 'ord_live_8f2a1b',
    restaurantId: BRAISE_BURGER_ID,
    mode: 'table',
    tableNumber: 3,
    tableSessionToken: 'bb-tbl-t3-8d1f',
    customerName: 'Karim Bennani',
    customerPhone: '+212 6 62 44 88 12',
    customerNotes: 'Merci de servir les frites bien chaudes.',
    items: [
      {
        dishId: 'dish-heirloom-burger',
        dishName: 'The Heirloom Burger',
        image: menuImage0,
        unitPriceMAD: 85,
        quantity: 1,
        selectedModifiers: [
          { groupId: 'mod-patty-size', groupName: 'Taille du steak', optionId: 'opt-patty-single', optionName: 'Simple (150g)', priceMAD: 0 },
          { groupId: 'mod-cooking', groupName: 'Cuisson', optionId: 'opt-cook-medium', optionName: 'À point', priceMAD: 0 },
          { groupId: 'mod-side-choice', groupName: 'Accompagnement', optionId: 'opt-side-truffle', optionName: 'Frites truffées & parmesan (+18 MAD)', priceMAD: 18 }
        ],
        lineTotalMAD: 103
      },
      {
        dishId: 'dish-ice-tea',
        dishName: 'Thé Glacé Maison Menthe & Citron Vert',
        image: menuImage1,
        unitPriceMAD: 20,
        quantity: 1,
        selectedModifiers: [],
        lineTotalMAD: 20
      }
    ],
    subtotalMAD: 123,
    discountMAD: 0,
    deliveryFeeMAD: 0,
    taxRatePercent: 10,
    taxAmountMAD: 11.18,
    totalMAD: 123,
    status: 'submitted',
    paymentStatus: 'unpaid',
    paymentMethod: 'counter',
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString()
  },
  // 2. Accepted / Preparing order
  {
    id: 'ord-1041',
    orderNumber: 'BB-1041',
    secureRef: 'ord_live_7c3e9a',
    restaurantId: BRAISE_BURGER_ID,
    mode: 'pickup',
    customerName: 'Yassine Alami',
    customerPhone: '+212 6 63 99 11 22',
    customerNotes: 'Je viendrai en scooter vers 20h.',
    items: [
      {
        dishId: 'dish-smokey-bbq',
        dishName: 'Le Smokey BBQ & Bacon',
        image: menuImage0,
        unitPriceMAD: 89,
        quantity: 2,
        selectedModifiers: [
          { groupId: 'mod-cooking-smokey', groupName: 'Cuisson', optionId: 'opt-smokey-well', optionName: 'Bien cuit', priceMAD: 0 }
        ],
        lineTotalMAD: 178
      },
      {
        dishId: 'dish-shake-caramel',
        dishName: 'Handspun Shake Caramel & Noix',
        image: menuImage1,
        unitPriceMAD: 38,
        quantity: 1,
        selectedModifiers: [],
        lineTotalMAD: 38
      }
    ],
    subtotalMAD: 216,
    discountMAD: 0,
    deliveryFeeMAD: 0,
    taxRatePercent: 10,
    taxAmountMAD: 19.64,
    totalMAD: 216,
    status: 'preparing',
    paymentStatus: 'paid',
    paymentMethod: 'card_terminal',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
    estimatedReadyAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    staffAttribution: 'Chef Ahmed'
  },
  // 3. Ready order for Table 1
  {
    id: 'ord-1040',
    orderNumber: 'BB-1040',
    secureRef: 'ord_live_4b6d8f',
    restaurantId: BRAISE_BURGER_ID,
    mode: 'table',
    tableNumber: 1,
    tableSessionToken: 'bb-tbl-t1-9a7c',
    customerName: 'Amine Tazi',
    customerPhone: '+212 6 70 12 34 56',
    items: [
      {
        dishId: 'dish-caesar-deluxe',
        dishName: 'Salade Caesar Deluxe',
        image: menuImage3,
        unitPriceMAD: 48,
        quantity: 1,
        selectedModifiers: [],
        lineTotalMAD: 48
      },
      {
        dishId: 'dish-water-sidiali',
        dishName: 'Eau Sidi Ali (50cl)',
        image: menuImage1,
        unitPriceMAD: 12,
        quantity: 1,
        selectedModifiers: [],
        lineTotalMAD: 12
      }
    ],
    subtotalMAD: 60,
    discountMAD: 0,
    deliveryFeeMAD: 0,
    taxRatePercent: 10,
    taxAmountMAD: 5.45,
    totalMAD: 60,
    status: 'ready',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
    staffAttribution: 'Serveur Mehdi'
  },
  // 4. Out for delivery in Hamria
  {
    id: 'ord-1039',
    orderNumber: 'BB-1039',
    secureRef: 'ord_live_1a9c3d',
    restaurantId: BRAISE_BURGER_ID,
    mode: 'delivery',
    customerName: 'Nadia El Fassi',
    customerPhone: '+212 6 65 88 99 00',
    deliveryAddress: 'Résidence Les Orangers, Appt 14, Hamria, Meknès',
    deliveryZoneId: 'z1',
    customerNotes: 'Sonner à l\'interphone El Fassi 2ème étage.',
    items: [
      {
        dishId: 'dish-harissa-crunch',
        dishName: 'Le Crispy Harissa Crunch',
        image: menuImage0,
        unitPriceMAD: 75,
        quantity: 1,
        selectedModifiers: [],
        lineTotalMAD: 75
      },
      {
        dishId: 'dish-truffle-fries',
        dishName: 'Truffle Fries Artisanales',
        image: menuImage2,
        unitPriceMAD: 32,
        quantity: 1,
        selectedModifiers: [],
        lineTotalMAD: 32
      }
    ],
    subtotalMAD: 107,
    discountMAD: 0,
    deliveryFeeMAD: 15,
    taxRatePercent: 10,
    taxAmountMAD: 11.09,
    totalMAD: 122,
    status: 'out_for_delivery',
    paymentStatus: 'pending',
    paymentMethod: 'cash',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 36 * 60 * 1000).toISOString(),
    staffAttribution: 'Livreur Rachid'
  },
  // 5. Completed order
  {
    id: 'ord-1038',
    orderNumber: 'BB-1038',
    secureRef: 'ord_live_9d4f2a',
    restaurantId: BRAISE_BURGER_ID,
    mode: 'table',
    tableNumber: 2,
    customerName: 'Omar Chraibi',
    customerPhone: '+212 6 61 77 88 99',
    items: [
      {
        dishId: 'dish-heirloom-burger',
        dishName: 'The Heirloom Burger',
        image: menuImage0,
        unitPriceMAD: 85,
        quantity: 2,
        selectedModifiers: [],
        lineTotalMAD: 170
      }
    ],
    subtotalMAD: 170,
    discountMAD: 0,
    deliveryFeeMAD: 0,
    taxRatePercent: 10,
    taxAmountMAD: 15.45,
    totalMAD: 170,
    status: 'completed',
    paymentStatus: 'paid',
    paymentMethod: 'card_terminal',
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    staffAttribution: 'Serveur Mehdi'
  },
  // 6. Refunded / Cancelled order (audit requirement from prompt)
  {
    id: 'ord-1035',
    orderNumber: 'BB-1035',
    secureRef: 'ord_live_3b5e1c',
    restaurantId: BRAISE_BURGER_ID,
    mode: 'pickup',
    customerName: 'Hassan Belghiti',
    customerPhone: '+212 6 64 33 22 11',
    customerNotes: 'Annulé par le client suite à un imprévu.',
    items: [
      {
        dishId: 'dish-halloumi-veggie',
        dishName: 'Le Végé Halloumi Grillé',
        image: menuImage0,
        unitPriceMAD: 72,
        quantity: 1,
        selectedModifiers: [],
        lineTotalMAD: 72
      }
    ],
    subtotalMAD: 72,
    discountMAD: 0,
    deliveryFeeMAD: 0,
    taxRatePercent: 10,
    taxAmountMAD: 6.55,
    totalMAD: 72,
    status: 'cancelled',
    paymentStatus: 'refunded',
    paymentMethod: 'card_terminal',
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    refundReason: 'Annulation demandée avant lancement en cuisine - Remboursement effectué sur terminal TPE.',
    staffAttribution: 'Manager Othmane'
  }
];
