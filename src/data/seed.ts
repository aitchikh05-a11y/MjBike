/**
 * Seed content for the local demo store (`npm run dev` without Supabase).
 *
 * It mirrors `supabase/seed.sql` so the demo and the real database behave the same.
 * Business facts here are the verified ones (name, phone, hours, Instagram, Maps).
 * Prices, services and the fleet are editable content — change them in the admin,
 * and keep `supabase/seed.sql` in sync when you deploy.
 */
import type {
  AvailabilityBlock,
  AvailabilityRule,
  Bicycle,
  GalleryItem,
  Offer,
  Service,
  SiteSettings,
  Testimonial,
} from '@shared/domain/types';

export const DEMO_IDS = {
  settings: 'stg-0000-0000-0000-000000000001',
  services: {
    cityRental: 'svc-0000-0000-0000-000000000001',
    ebikeRental: 'svc-0000-0000-0000-000000000002',
    medinaTour: 'svc-0000-0000-0000-000000000003',
    sunsetTour: 'svc-0000-0000-0000-000000000004',
    lesson: 'svc-0000-0000-0000-000000000005',
    teamBuilding: 'svc-0000-0000-0000-000000000006',
  },
  offers: {
    sunset: 'off-0000-0000-0000-000000000001',
    family: 'off-0000-0000-0000-000000000002',
    ebikeDay: 'off-0000-0000-0000-000000000003',
  },
  profiles: {
    owner: 'prf-0000-0000-0000-000000000001',
    admin: 'prf-0000-0000-0000-000000000002',
    staff: 'prf-0000-0000-0000-000000000003',
  },
} as const;

const ADDONS = [
  {
    id: 'helmet',
    price: 20,
    name: { en: 'Extra helmet', fr: 'Casque supplémentaire', ar: 'خوذة إضافية' },
    description: {
      en: 'A second helmet so you can ride with a friend.',
      fr: 'Un second casque pour rouler à deux.',
      ar: 'خوذة ثانية للتنقل مع صديق.',
    },
  },
  {
    id: 'child-seat',
    price: 40,
    name: { en: 'Child seat', fr: 'Siège enfant', ar: 'مقعد أطفال' },
    description: {
      en: 'Rear child seat fitted before you arrive, for children up to 22 kg.',
      fr: 'Siège enfant arrière installé avant votre arrivée, jusqu’à 22 kg.',
      ar: 'مقعد أطفال خلفي يُثبَّت قبل وصولكم، للأطفال حتى 22 كغ.',
    },
  },
  {
    id: 'local-guide',
    price: 150,
    name: { en: 'Local guide', fr: 'Guide local', ar: 'مرشد محلي' },
    description: {
      en: 'A licensed local guide rides with you and tells you the story of the city.',
      fr: 'Un guide local agréé vous accompagne et raconte l’histoire de la ville.',
      ar: 'مرشد محلي معتمد يرافقكم ويروي لكم حكاية المدينة.',
    },
  },
  {
    id: 'picnic',
    price: 60,
    name: { en: 'Picnic stop', fr: 'Pause pique-nique', ar: 'توقف للتنزه' },
    description: {
      en: 'Water, mint tea and Moroccan pastries delivered to a scenic stop.',
      fr: 'Eau, thé à la menthe et pâtisseries marocaines livrés à une halte panoramique.',
      ar: 'ماء وشاي بالنعناع وحلويات مغربية تُقدَّم في محطة بإطلالة جميلة.',
    },
  },
];

export const SEED_SERVICES: Service[] = [
  {
    id: DEMO_IDS.services.cityRental,
    slug: 'city-bike-rental',
    kind: 'rental',
    image_url: '/images/service-rentals.jpg',
    gallery: ['/images/service-rentals.jpg', '/images/gallery-coastal-sunset.jpg'],
    price_unit: 'per_bike',
    base_price: 50,
    duration_options: [
      { hours: 1, price: 50 },
      { hours: 2, price: 90 },
      { hours: 4, price: 160 },
      { hours: 8, price: 280 },
    ],
    default_duration_hours: 4,
    capacity: 12,
    min_units: 1,
    max_units: 10,
    addons: ADDONS,
    is_active: true,
    is_featured: true,
    sort_order: 1,
    created_at: '2025-01-05T09:00:00.000Z',
    updated_at: '2025-01-05T09:00:00.000Z',
    translations: [
      {
        locale: 'en',
        name: 'City bike rental',
        short_description: 'Explore Tangier at your own pace with a well-maintained city bike, helmet and lock included.',
        description:
          'Pick up a city bike near the centre of Tangier and ride wherever the day takes you — the corniche, the medina gates or a café in Malabata. Every bike is checked before it leaves, and you get a helmet, a lock and a route map. Helmets for children, child seats and extra helmets can be added when you book.',
        highlights: ['Helmet, lock and route map included', 'Bikes checked before every rental', 'Hourly, half-day and full-day rates'],
        meta_title: 'Bike Rental in Tangier — City Bikes from 50 MAD',
        meta_description: 'Rent a city bike in Tangier by the hour or the day. Helmet, lock and route advice included.',
      },
      {
        locale: 'fr',
        name: 'Location de vélo de ville',
        short_description: 'Découvrez Tanger à votre rythme avec un vélo de ville bien entretenu, casque et antivol inclus.',
        description:
          'Récupérez un vélo de ville près du centre de Tanger et roulez où bon vous semble : la corniche, les portes de la médina ou un café à Malabata. Chaque vélo est révisé avant chaque location, et vous recevez un casque, un antivol et une carte d’itinéraires. Casques enfants, sièges enfants et casques supplémentaires peuvent être ajoutés à la réservation.',
        highlights: ['Casque, antivol et carte inclus', 'Vélos révisés avant chaque location', 'Tarifs à l’heure, demi-journée et journée'],
        meta_title: 'Location de vélo à Tanger — vélos de ville dès 50 MAD',
        meta_description: 'Louez un vélo de ville à Tanger à l’heure ou à la journée. Casque, antivol et conseils d’itinéraire inclus.',
      },
      {
        locale: 'ar',
        name: 'تأجير دراجة المدينة',
        short_description: 'اكتشف طنجة على إيقاعك مع دراجة مدينة مُعتنى بها، والخوذة والقفل مشمولان.',
        description:
          'استلم دراجة مدينة قرب وسط طنجة وانطلق حيث تشاء: الكورنيش، أبواب المدينة العتيقة أو مقهى في مالاباطا. تُفحص كل دراجة قبل كل كراء، وتحصل على خوذة وقفل وخريطة للمسارات. يمكن إضافة خوذات للأطفال ومقاعد أطفال وخوذات إضافية عند الحجز.',
        highlights: ['الخوذة والقفل وخريطة المسارات مشمولة', 'فحص الدراجات قبل كل كراء', 'أسعار بالساعة ونصف اليوم واليوم الكامل'],
        meta_title: 'تأجير الدراجات في طنجة — دراجات المدينة من 50 درهماً',
        meta_description: 'استأجر دراجة مدينة في طنجة بالساعة أو باليوم. الخوذة والقفل والنصائح مشمولة.',
      },
    ],
  },
  {
    id: DEMO_IDS.services.ebikeRental,
    slug: 'electric-bike-rental',
    kind: 'rental',
    image_url: '/images/hero-cycling-tangier.jpg',
    gallery: ['/images/hero-cycling-tangier.jpg', '/images/gallery-cafe-stop.jpg'],
    price_unit: 'per_bike',
    base_price: 90,
    duration_options: [
      { hours: 1, price: 90 },
      { hours: 3, price: 220 },
      { hours: 6, price: 380 },
      { hours: 8, price: 450 },
    ],
    default_duration_hours: 3,
    capacity: 6,
    min_units: 1,
    max_units: 6,
    addons: ADDONS,
    is_active: true,
    is_featured: true,
    sort_order: 2,
    created_at: '2025-01-05T09:00:00.000Z',
    updated_at: '2025-01-05T09:00:00.000Z',
    translations: [
      {
        locale: 'en',
        name: 'Electric bike rental',
        short_description: 'Cover more ground with a pedal-assist e-bike — the hills between the city and Cap Spartel disappear.',
        description:
          'Our electric bikes make light work of Tangier’s hills, so you can ride out to Cap Spartel, the Caves of Hercules or the lighthouse without worrying about the climb back. You get a charged battery, a helmet and a short briefing before you leave, and we swap batteries if you plan a long day.',
        highlights: ['Pedal-assist e-bikes with a full battery', 'Helmet and briefing included', 'Battery swap available for long rides'],
        meta_title: 'E-Bike Rental Tangier — Electric Bikes with Helmet',
        meta_description: 'Rent a pedal-assist electric bike in Tangier and reach Cap Spartel and the coast without the climb.',
      },
      {
        locale: 'fr',
        name: 'Location de vélo électrique',
        short_description: 'Couvrez plus de distance avec un vélo à assistance électrique : les côtes vers Cap Spartel disparaissent.',
        description:
          'Nos vélos électriques rendent les côtes de Tanger faciles : filez vers Cap Spartel, les grottes d’Hercule ou le phare sans redouter le retour. Batterie chargée, casque et briefing de prise en main compris, et nous échangeons la batterie si vous partez pour une longue journée.',
        highlights: ['Vélos à assistance électrique batterie pleine', 'Casque et briefing inclus', 'Échange de batterie pour les longues sorties'],
        meta_title: 'Location de vélo électrique à Tanger — casque inclus',
        meta_description: 'Louez un vélo à assistance électrique à Tanger et rejoignez Cap Spartel sans la montée.',
      },
      {
        locale: 'ar',
        name: 'تأجير دراجة كهربائية',
        short_description: 'اقطع مسافة أطول بدراجة بمساعدة كهربائية، فتختفي المرتفعات بين المدينة ورأس سبارطيل.',
        description:
          'تجعل دراجاتنا الكهربائية مرتفعات طنجة سهلة، فتصل إلى رأس سبارطيل أو مغارة هرقل أو المنارة دون قلق من العودة صعوداً. تحصل على بطارية مشحونة وخوذة وتوجيه قصير قبل الانطلاق، ونبدّل البطارية إن خططت ليوم طويل.',
        highlights: ['دراجات بمساعدة كهربائية وبطارية ممتلئة', 'الخوذة والتوجيه مشمولان', 'إمكانية تبديل البطارية للرحلات الطويلة'],
        meta_title: 'تأجير الدراجات الكهربائية بطنجة — الخوذة مشمولة',
        meta_description: 'استأجر دراجة كهربائية في طنجة وابلغ رأس سبارطيل والساحل دون عناء الصعود.',
      },
    ],
  },
  {
    id: DEMO_IDS.services.medinaTour,
    slug: 'medina-kasbah-tour',
    kind: 'tour',
    image_url: '/images/service-tours.jpg',
    gallery: ['/images/service-tours.jpg', '/images/gallery-group-fun.jpg'],
    price_unit: 'per_person',
    base_price: 250,
    duration_options: [{ hours: 3, price: 250 }],
    default_duration_hours: 3,
    capacity: 12,
    min_units: 1,
    max_units: 12,
    addons: ADDONS,
    is_active: true,
    is_featured: true,
    sort_order: 3,
    created_at: '2025-01-05T09:00:00.000Z',
    updated_at: '2025-01-05T09:00:00.000Z',
    translations: [
      {
        locale: 'en',
        name: 'Medina & Kasbah guided ride',
        short_description: 'A gentle three-hour ride through the medina, the kasbah and the sea gate with a local guide.',
        description:
          'We start at the shop, roll along the bay and climb slowly into the medina, stopping at the Grand Socco, the kasbah walls and the café terraces above the strait. The pace is relaxed and made for photographs. The ride is led by a local guide who grew up in the city, and we keep groups small so there is time for questions.',
        highlights: ['Local guide with you for the whole ride', 'Small groups, relaxed pace', 'Photo stops above the Strait of Gibraltar'],
        meta_title: 'Guided Bike Tour of the Tangier Medina & Kasbah',
        meta_description: 'Ride the Tangier medina and kasbah on a three-hour guided bike tour with a local guide. Small groups.',
      },
      {
        locale: 'fr',
        name: 'Balade guidée médina & kasbah',
        short_description: 'Trois heures de balade tranquille dans la médina, la kasbah et la porte de la mer, avec un guide local.',
        description:
          'Nous partons de la boutique, longeons la baie puis montons doucement dans la médina, avec des arrêts au Grand Socco, aux remparts de la kasbah et aux terrasses de café au-dessus du détroit. Le rythme est détendu et pensé pour les photos. La balade est menée par un guide local qui a grandi dans la ville, et nous gardons des groupes réduits pour laisser place aux questions.',
        highlights: ['Guide local présent pendant toute la balade', 'Petits groupes, rythme détendu', 'Arrêts photo au-dessus du détroit de Gibraltar'],
        meta_title: 'Balade à vélo guidée dans la médina et la kasbah de Tanger',
        meta_description: 'Parcourez la médina et la kasbah de Tanger lors d’une balade guidée de trois heures. Petits groupes.',
      },
      {
        locale: 'ar',
        name: 'جولة مرشدة في المدينة العتيقة والقصبة',
        short_description: 'ثلاث ساعات من الجولة الهادئة في المدينة العتيقة والقصبة وباب البحر مع مرشد محلي.',
        description:
          'ننطلق من المتجر، ونسير بمحاذاة الخليج ثم نصعد بهدوء إلى المدينة العتيقة، مع توقفات في سوق البارود الكبير وأسوار القصبة ومقاهي التراسات المطلة على المضيق. الإيقاع هادئ ومهيأ للتصوير. يرافقكم مرشد محلي نشأ في المدينة، ونحافظ على مجموعات صغيرة لإتاحة الوقت للأسئلة.',
        highlights: ['مرشد محلي يرافقكم طوال الجولة', 'مجموعات صغيرة وإيقاع هادئ', 'توقفات للتصوير فوق مضيق جبل طارق'],
        meta_title: 'جولة دراجات مرشدة في مدينة طنجة العتيقة والقصبة',
        meta_description: 'اكتشف مدينة طنجة العتيقة والقصبة في جولة دراجات مرشدة من ثلاث ساعات مع مرشد محلي.',
      },
    ],
  },
  {
    id: DEMO_IDS.services.sunsetTour,
    slug: 'atlantic-sunset-ride',
    kind: 'tour',
    image_url: '/images/gallery-coastal-sunset.jpg',
    gallery: ['/images/gallery-coastal-sunset.jpg', '/images/gallery-cafe-stop.jpg'],
    price_unit: 'per_person',
    base_price: 320,
    duration_options: [{ hours: 3.5, price: 320 }],
    default_duration_hours: 3.5,
    capacity: 10,
    min_units: 1,
    max_units: 10,
    addons: ADDONS,
    is_active: true,
    is_featured: true,
    sort_order: 4,
    created_at: '2025-01-05T09:00:00.000Z',
    updated_at: '2025-01-05T09:00:00.000Z',
    translations: [
      {
        locale: 'en',
        name: 'Atlantic sunset ride',
        short_description: 'Follow the corniche west as the light turns gold, with a mint tea stop on the cliffs.',
        description:
          'An evening ride along the Atlantic side of Tangier, timed so you are on the cliffs when the sun drops into the ocean. We ride at an easy pace, stop for mint tea and pastries, and come back through the city lights. Bring a light jacket: the wind picks up after sunset.',
        highlights: ['Timed for the sunset over the Atlantic', 'Mint tea stop included', 'Easy pace on quiet roads'],
        meta_title: 'Sunset Bike Ride in Tangier — Atlantic Corniche Tour',
        meta_description: 'Join a guided sunset bike ride along the Tangier corniche, with a mint tea stop above the ocean.',
      },
      {
        locale: 'fr',
        name: 'Balade coucher de soleil atlantique',
        short_description: 'Suivez la corniche vers l’ouest quand la lumière devient dorée, avec une pause thé sur les falaises.',
        description:
          'Une balade en soirée le long de la façade atlantique de Tanger, calée pour être sur les falaises au moment où le soleil plonge dans l’océan. Nous roulons tranquillement, faisons une pause thé à la menthe et pâtisseries, puis revenons par les lumières de la ville. Prenez une veste légère : le vent se lève après le coucher du soleil.',
        highlights: ['Calée sur le coucher de soleil atlantique', 'Pause thé à la menthe incluse', 'Rythme facile sur des routes calmes'],
        meta_title: 'Balade à vélo au coucher du soleil à Tanger',
        meta_description: 'Participez à une balade guidée au coucher du soleil sur la corniche de Tanger, avec pause thé.',
      },
      {
        locale: 'ar',
        name: 'جولة غروب الأطلسي',
        short_description: 'اتبع الكورنيش غرباً حين يتحول الضوء إلى ذهبي، مع توقف لشاي بالنعناع على المنحدرات.',
        description:
          'جولة مسائية على الواجهة الأطلسية لطنجة، موقوتة لتكون على المنحدرات حين تغرب الشمس في المحيط. نسير بإيقاع هادئ، ونتوقف لشاي بالنعناع والحلويات، ثم نعود عبر أضواء المدينة. خذ معك سترة خفيفة فالريح تشتد بعد الغروب.',
        highlights: ['موقوتة مع غروب الشمس على الأطلسي', 'توقف الشاي بالنعناع مشمول', 'إيقاع سهل على طرق هادئة'],
        meta_title: 'جولة دراجات عند الغروب في طنجة — كورنيش الأطلسي',
        meta_description: 'شارك في جولة دراجات مرشدة عند الغروب على كورنيش طنجة مع توقف لشاي بالنعناع.',
      },
    ],
  },
  {
    id: DEMO_IDS.services.lesson,
    slug: 'cycling-lesson',
    kind: 'lesson',
    image_url: '/images/service-lessons.jpg',
    gallery: ['/images/service-lessons.jpg'],
    price_unit: 'per_person',
    base_price: 180,
    duration_options: [{ hours: 1.5, price: 180 }],
    default_duration_hours: 1.5,
    capacity: 4,
    min_units: 1,
    max_units: 4,
    addons: ADDONS,
    is_active: true,
    is_featured: false,
    sort_order: 5,
    created_at: '2025-01-05T09:00:00.000Z',
    updated_at: '2025-01-05T09:00:00.000Z',
    translations: [
      {
        locale: 'en',
        name: 'Cycling lesson',
        short_description: 'Learn to ride, or ride with more confidence, in a quiet spot by the sea.',
        description:
          'A one-to-one or small-group lesson for adults and children who want to learn to ride or feel safer in traffic. We start on a flat, car-free stretch near the coast, use a bike that fits you, and finish with a short ride together. Helmets are provided for everyone.',
        highlights: ['Private or small-group lesson', 'Bike and helmet provided', 'Flat, traffic-free practice area'],
        meta_title: 'Cycling Lessons in Tangier — Learn to Ride',
        meta_description: 'Book a private cycling lesson in Tangier for adults or children. Bike, helmet and a calm practice area.',
      },
      {
        locale: 'fr',
        name: 'Cours de vélo',
        short_description: 'Apprenez à faire du vélo, ou gagnez en confiance, dans un endroit calme au bord de la mer.',
        description:
          'Un cours individuel ou en petit groupe pour adultes et enfants qui veulent apprendre à pédaler ou se sentir plus à l’aise dans la circulation. Nous commençons sur un terrain plat et sans voitures près de la côte, avec un vélo adapté à votre taille, puis terminons par une courte sortie ensemble. Les casques sont fournis.',
        highlights: ['Cours individuel ou petit groupe', 'Vélo et casque fournis', 'Terrain plat et sans circulation'],
        meta_title: 'Cours de vélo à Tanger — apprendre à rouler',
        meta_description: 'Réservez un cours de vélo privé à Tanger pour adultes ou enfants. Vélo, casque et terrain calme inclus.',
      },
      {
        locale: 'ar',
        name: 'درس في ركوب الدراجة',
        short_description: 'تعلّم ركوب الدراجة أو اكتسب ثقة أكبر في مكان هادئ قرب البحر.',
        description:
          'درس فردي أو في مجموعة صغيرة للكبار والصغار الراغبين في تعلم الركوب أو الشعور بأمان أكبر في الطريق. نبدأ في مساحة مستوية خالية من السيارات قرب الساحل، بدراجة تناسب مقاسك، وننهي بجولة قصيرة معاً. الخوذات متوفرة للجميع.',
        highlights: ['درس فردي أو لمجموعة صغيرة', 'الدراجة والخوذة متوفرتان', 'مساحة تدريب مستوية وخالية من السيارات'],
        meta_title: 'دروس ركوب الدراجة في طنجة — تعلم الركوب',
        meta_description: 'احجز درساً خاصاً في ركوب الدراجة بطنجة للكبار أو الصغار. الدراجة والخوذة ومكان هادئ للتدريب.',
      },
    ],
  },
  {
    id: DEMO_IDS.services.teamBuilding,
    slug: 'team-building-ride',
    kind: 'experience',
    image_url: '/images/service-teambuilding.jpg',
    gallery: ['/images/service-teambuilding.jpg', '/images/gallery-group-fun.jpg'],
    price_unit: 'per_group',
    base_price: 1500,
    duration_options: [
      { hours: 3, price: 1500 },
      { hours: 5, price: 2200 },
    ],
    default_duration_hours: 3,
    capacity: 20,
    min_units: 4,
    max_units: 20,
    addons: ADDONS,
    is_active: true,
    is_featured: true,
    sort_order: 6,
    created_at: '2025-01-05T09:00:00.000Z',
    updated_at: '2025-01-05T09:00:00.000Z',
    translations: [
      {
        locale: 'en',
        name: 'Team building ride',
        short_description: 'A private cycling challenge for companies and groups, built around your team and your timetable.',
        description:
          'We plan a private ride for your team: a warm-up, a route with a few friendly challenges, a stop where everyone regroups, and a leader who keeps the group together whatever the fitness levels. Bikes, helmets, water and a support vehicle are included, and we can add a meal or a meeting room afterwards.',
        highlights: ['Private route planned around your group', 'Bikes, helmets and support vehicle included', 'Options for a meal or meeting room'],
        meta_title: 'Cycling Team Building in Tangier — Private Group Rides',
        meta_description: 'Organise a cycling team-building experience in Tangier: private route, bikes, helmets and support vehicle.',
      },
      {
        locale: 'fr',
        name: 'Sortie team building',
        short_description: 'Un défi à vélo privé pour les entreprises et les groupes, construit autour de votre équipe et de votre emploi du temps.',
        description:
          'Nous concevons une sortie privée pour votre équipe : un échauffement, un parcours avec quelques défis amicaux, une halte pour se retrouver, et un chef de groupe qui garde tout le monde ensemble quels que soient les niveaux. Vélos, casques, eau et véhicule d’assistance inclus ; nous pouvons ajouter un repas ou une salle de réunion.',
        highlights: ['Parcours privé adapté à votre groupe', 'Vélos, casques et véhicule d’assistance', 'Options repas ou salle de réunion'],
        meta_title: 'Team building à vélo à Tanger — sorties privées',
        meta_description: 'Organisez un team building à vélo à Tanger : parcours privé, vélos, casques et véhicule d’assistance.',
      },
      {
        locale: 'ar',
        name: 'جولة بناء الفريق',
        short_description: 'تحدٍّ خاص بالدراجات للشركات والمجموعات، مصمم حول فريقكم ووقتكم.',
        description:
          'نصمم جولة خاصة لفريقكم: تسخين، ثم مسار يتضمن تحديات ودية، وتوقف يجمع الجميع، ومشرف يحافظ على تماسك المجموعة مهما اختلفت اللياقة. الدراجات والخوذات والماء وسيارة الدعم مشمولة، ويمكن إضافة وجبة أو قاعة اجتماعات بعد الجولة.',
        highlights: ['مسار خاص مصمم لمجموعتكم', 'الدراجات والخوذات وسيارة الدعم مشمولة', 'خيارات وجبة أو قاعة اجتماعات'],
        meta_title: 'بناء الفريق بالدراجات في طنجة — جولات خاصة',
        meta_description: 'نظّم تجربة بناء فريق بالدراجات في طنجة: مسار خاص ودراجات وخوذات وسيارة دعم.',
      },
    ],
  },
];

export const SEED_OFFERS: Offer[] = [
  {
    id: DEMO_IDS.offers.sunset,
    slug: 'sunset-ride-offer',
    service_id: DEMO_IDS.services.sunsetTour,
    image_url: '/images/offer-sunset-ride.jpg',
    price: 260,
    compare_at_price: 320,
    duration_hours: 3.5,
    validity_start: '2025-01-01',
    validity_end: '2026-12-31',
    capacity: 10,
    bookings_count: 0,
    status: 'published',
    is_featured: true,
    sort_order: 1,
    created_at: '2025-01-05T09:00:00.000Z',
    updated_at: '2025-01-05T09:00:00.000Z',
    translations: [
      {
        locale: 'en',
        title: 'Sunset ride — mint tea included',
        short_description: 'The Atlantic sunset ride at a reduced price, with the mint tea stop on us.',
        description:
          'Book the evening ride along the Atlantic corniche at a reduced rate. The price includes the guide, the bike, the helmet and the mint tea stop on the cliffs. Available every day except during Ramadan evenings.',
        included: ['Guided 3.5-hour ride', 'Bike and helmet', 'Mint tea and pastries'],
      },
      {
        locale: 'fr',
        title: 'Balade au coucher du soleil — thé offert',
        short_description: 'La balade atlantique au coucher du soleil à prix réduit, pause thé à la menthe offerte.',
        description:
          'Réservez la balade du soir le long de la corniche atlantique à tarif réduit. Le prix comprend le guide, le vélo, le casque et la pause thé à la menthe sur les falaises. Disponible tous les jours sauf les soirs du Ramadan.',
        included: ['Balade guidée de 3 h 30', 'Vélo et casque', 'Thé à la menthe et pâtisseries'],
      },
      {
        locale: 'ar',
        title: 'جولة الغروب — الشاي مشمول',
        short_description: 'جولة غروب الأطلسي بسعر مخفض، مع توقف الشاي بالنعناع على حسابنا.',
        description:
          'احجز الجولة المسائية على كورنيش الأطلسي بسعر مخفض. يشمل السعر المرشد والدراجة والخوذة وتوقف الشاي بالنعناع على المنحدرات. متاحة كل يوم عدا أمسيات رمضان.',
        included: ['جولة مرشدة لمدة 3.5 ساعات', 'الدراجة والخوذة', 'شاي بالنعناع وحلويات'],
      },
    ],
  },
  {
    id: DEMO_IDS.offers.family,
    slug: 'family-weekend-pack',
    service_id: DEMO_IDS.services.cityRental,
    image_url: '/images/gallery-group-fun.jpg',
    price: 420,
    compare_at_price: 560,
    duration_hours: 4,
    validity_start: '2025-01-01',
    validity_end: '2026-12-31',
    capacity: 8,
    bookings_count: 0,
    status: 'published',
    is_featured: true,
    sort_order: 2,
    created_at: '2025-01-05T09:00:00.000Z',
    updated_at: '2025-01-05T09:00:00.000Z',
    translations: [
      {
        locale: 'en',
        title: 'Family weekend pack',
        short_description: 'Four city bikes for half a day, with helmets, a child seat and a picnic stop.',
        description:
          'A half-day package for a family of four: four city bikes, four helmets, one child seat and a picnic stop with water and pastries at a viewpoint on the corniche. Available on Saturdays and Sundays, subject to availability.',
        included: ['4 city bikes for 4 hours', '4 helmets and 1 child seat', 'Picnic stop with water and pastries'],
      },
      {
        locale: 'fr',
        title: 'Pack famille du week-end',
        short_description: 'Quatre vélos de ville pour une demi-journée, casques, siège enfant et pause pique-nique.',
        description:
          'Un forfait demi-journée pour une famille de quatre : quatre vélos de ville, quatre casques, un siège enfant et une pause pique-nique avec eau et pâtisseries à un point de vue de la corniche. Disponible les samedis et dimanches, selon disponibilité.',
        included: ['4 vélos de ville pour 4 heures', '4 casques et 1 siège enfant', 'Pause pique-nique eau et pâtisseries'],
      },
      {
        locale: 'ar',
        title: 'عرض عطلة نهاية الأسبوع للعائلة',
        short_description: 'أربع دراجات مدينة لنصف يوم، مع الخوذات ومقعد أطفال وتوقف للتنزه.',
        description:
          'عرض لنصف يوم لعائلة من أربعة أفراد: أربع دراجات مدينة وأربع خوذات ومقعد أطفال وتوقف للتنزه مع الماء والحلويات في نقطة إطلالة على الكورنيش. متاح يومي السبت والأحد حسب التوفر.',
        included: ['4 دراجات مدينة لمدة 4 ساعات', '4 خوذات ومقعد أطفال واحد', 'توقف للتنزه مع الماء والحلويات'],
      },
    ],
  },
  {
    id: DEMO_IDS.offers.ebikeDay,
    slug: 'ebike-day-pass',
    service_id: DEMO_IDS.services.ebikeRental,
    image_url: '/images/hero-cycling-tangier.jpg',
    price: 390,
    compare_at_price: 450,
    duration_hours: 8,
    validity_start: '2025-01-01',
    validity_end: '2026-12-31',
    capacity: 6,
    bookings_count: 0,
    status: 'published',
    is_featured: false,
    sort_order: 3,
    created_at: '2025-01-05T09:00:00.000Z',
    updated_at: '2025-01-05T09:00:00.000Z',
    translations: [
      {
        locale: 'en',
        title: 'E-bike day pass',
        short_description: 'A full day on an electric bike, with a spare battery for the ride to Cap Spartel.',
        description:
          'Take an electric bike for the whole day and ride out to Cap Spartel, the lighthouse and the Caves of Hercules. A spare battery is included so distance is never the problem. Return before closing time (21:00).',
        included: ['E-bike for 8 hours', 'Spare battery', 'Helmet and lock'],
      },
      {
        locale: 'fr',
        title: 'Forfait journée vélo électrique',
        short_description: 'Une journée complète en vélo électrique, avec batterie de rechange pour Cap Spartel.',
        description:
          'Prenez un vélo électrique pour la journée et roulez vers Cap Spartel, le phare et les grottes d’Hercule. Une batterie de rechange est incluse pour que la distance ne soit jamais un problème. Retour avant la fermeture (21 h).',
        included: ['Vélo électrique pendant 8 heures', 'Batterie de rechange', 'Casque et antivol'],
      },
      {
        locale: 'ar',
        title: 'عرض اليوم الكامل للدراجة الكهربائية',
        short_description: 'يوم كامل على دراجة كهربائية، مع بطارية احتياطية لرحلة رأس سبارطيل.',
        description:
          'خذ دراجة كهربائية ليوم كامل وانطلق نحو رأس سبارطيل والمنارة ومغارة هرقل. البطارية الاحتياطية مشمولة حتى لا تكون المسافة عائقاً. الإرجاع قبل وقت الإغلاق (21:00).',
        included: ['دراجة كهربائية لمدة 8 ساعات', 'بطارية احتياطية', 'الخوذة والقفل'],
      },
    ],
  },
];

export const SEED_GALLERY: GalleryItem[] = [
  {
    id: 'gal-0000-0000-0000-000000000001',
    kind: 'image',
    media_url: '/images/hero-cycling-tangier.jpg',
    thumbnail_url: null,
    title: { en: 'Riding the Tangier corniche', fr: 'Sur la corniche de Tanger', ar: 'على كورنيش طنجة' },
    caption: {
      en: 'The bay opens up as you ride west along the corniche.',
      fr: 'La baie s’ouvre en roulant vers l’ouest le long de la corniche.',
      ar: 'ينفتح الخليج أمامك وأنت تسير غرباً على الكورنيش.',
    },
    category: 'coastal',
    is_published: true,
    is_featured: true,
    sort_order: 1,
    created_at: '2025-01-05T09:00:00.000Z',
  },
  {
    id: 'gal-0000-0000-0000-000000000002',
    kind: 'image',
    media_url: '/images/gallery-coastal-sunset.jpg',
    thumbnail_url: null,
    title: { en: 'Sunset over the Atlantic', fr: 'Coucher de soleil sur l’Atlantique', ar: 'الغروب على الأطلسي' },
    caption: {
      en: 'Our evening ride stops here when the light turns gold.',
      fr: 'Notre balade du soir s’arrête ici quand la lumière devient dorée.',
      ar: 'تتوقف جولتنا المسائية هنا حين يتحول الضوء إلى ذهبي.',
    },
    category: 'coastal',
    is_published: true,
    is_featured: true,
    sort_order: 2,
    created_at: '2025-01-05T09:00:00.000Z',
  },
  {
    id: 'gal-0000-0000-0000-000000000003',
    kind: 'image',
    media_url: '/images/gallery-group-fun.jpg',
    thumbnail_url: null,
    title: { en: 'Group rides', fr: 'Sorties de groupe', ar: 'جولات جماعية' },
    caption: {
      en: 'Groups regroup before the last climb.',
      fr: 'Le groupe se retrouve avant la dernière montée.',
      ar: 'تتجمع المجموعة قبل الصعود الأخير.',
    },
    category: 'team',
    is_published: true,
    is_featured: false,
    sort_order: 3,
    created_at: '2025-01-05T09:00:00.000Z',
  },
  {
    id: 'gal-0000-0000-0000-000000000004',
    kind: 'image',
    media_url: '/images/gallery-cafe-stop.jpg',
    thumbnail_url: null,
    title: { en: 'Mint tea stop', fr: 'Pause thé à la menthe', ar: 'توقف الشاي بالنعناع' },
    caption: {
      en: 'A pause on the cliffs, with tea and pastries.',
      fr: 'Une pause sur les falaises, avec thé et pâtisseries.',
      ar: 'استراحة على المنحدرات مع الشاي والحلويات.',
    },
    category: 'tours',
    is_published: true,
    is_featured: false,
    sort_order: 4,
    created_at: '2025-01-05T09:00:00.000Z',
  },
  {
    id: 'gal-0000-0000-0000-000000000005',
    kind: 'image',
    media_url: '/images/gallery-maintenance.jpg',
    thumbnail_url: null,
    title: { en: 'Workshop checks', fr: 'Contrôle à l’atelier', ar: 'فحص في الورشة' },
    caption: {
      en: 'Every bike is checked in the workshop before a rental.',
      fr: 'Chaque vélo est contrôlé à l’atelier avant une location.',
      ar: 'تُفحص كل دراجة في الورشة قبل الكراء.',
    },
    category: 'rentals',
    is_published: true,
    is_featured: false,
    sort_order: 5,
    created_at: '2025-01-05T09:00:00.000Z',
  },
];

/** No invented reviews: testimonials stay empty until real, consented ones are added. */
export const SEED_TESTIMONIALS: Testimonial[] = [];

export const SEED_AVAILABILITY_RULES: AvailabilityRule[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  id: `rul-0000-0000-0000-00000000000${dayOfWeek + 1}`,
  service_id: null,
  day_of_week: dayOfWeek,
  open_time: '09:00',
  close_time: '21:00',
  slot_interval_minutes: 60,
  capacity: null,
  is_active: true,
}));

export const SEED_AVAILABILITY_BLOCKS: AvailabilityBlock[] = [];

export const SEED_BICYCLES: Bicycle[] = [
  { code: 'CTY-01', name: 'City bike — size M', category: 'city', size: 'M', serviceId: DEMO_IDS.services.cityRental, quantity: 4, status: 'available' },
  { code: 'CTY-02', name: 'City bike — size L', category: 'city', size: 'L', serviceId: DEMO_IDS.services.cityRental, quantity: 4, status: 'available' },
  { code: 'CTY-03', name: 'City bike — size S', category: 'city', size: 'S', serviceId: DEMO_IDS.services.cityRental, quantity: 3, status: 'available' },
  { code: 'HYB-01', name: 'Hybrid bike — size M', category: 'hybrid', size: 'M', serviceId: DEMO_IDS.services.cityRental, quantity: 2, status: 'available' },
  { code: 'EBK-01', name: 'Electric bike — step-through', category: 'electric', size: 'M', serviceId: DEMO_IDS.services.ebikeRental, quantity: 3, status: 'available' },
  { code: 'EBK-02', name: 'Electric bike — mountain', category: 'electric', size: 'L', serviceId: DEMO_IDS.services.ebikeRental, quantity: 3, status: 'available' },
  { code: 'KID-01', name: 'Kids bike 20"', category: 'kids', size: '20"', serviceId: DEMO_IDS.services.lesson, quantity: 2, status: 'available' },
  { code: 'KID-02', name: 'Kids bike 24"', category: 'kids', size: '24"', serviceId: DEMO_IDS.services.lesson, quantity: 2, status: 'available' },
].map((bike, index) => ({
  id: DEMO_IDS.services.cityRental.replace('svc-', 'bke-').replace('000000000001', String(index + 1).padStart(12, '0')),
  internal_code: bike.code,
  name: bike.name,
  category: bike.category,
  size: bike.size,
  service_id: bike.serviceId,
  quantity: bike.quantity,
  status: bike.status as Bicycle['status'],
  purchase_date: index % 3 === 0 ? '2024-03-12' : null,
  last_service_at: index % 2 === 0 ? '2025-06-01' : '2025-05-18',
  maintenance_notes: null,
  image_url: null,
  created_at: '2025-01-05T09:00:00.000Z',
}));

export const SEED_SETTINGS: SiteSettings = {
  id: DEMO_IDS.settings,
  business_name: 'MJ Bike Tangier',
  tagline: {
    en: 'Bike rental, guided rides and cycling experiences in Tangier.',
    fr: 'Location de vélos, balades guidées et expériences à vélo à Tanger.',
    ar: 'تأجير الدراجات وجولات مرشدة وتجارب على دراجتين في طنجة.',
  },
  phone: '+212 613 993 957',
  whatsapp: '212613993957',
  email: 'contact@mjbiketangier.com',
  address: {
    en: 'Tangier, Morocco',
    fr: 'Tanger, Maroc',
    ar: 'طنجة، المغرب',
  },
  maps_url: 'https://maps.app.goo.gl/V25hn98AexWHFd67g',
  instagram_url: 'https://www.instagram.com/mj.bike.tangier/',
  facebook_url: '',
  tiktok_url: '',
  youtube_url: '',
  opening_hours: [
    { days: 'Monday – Sunday', hours: '09:00 – 21:00' },
  ],
  about_claims: [
    {
      value: '8',
      label: {
        en: 'years of cycling experience in Tangier',
        fr: 'ans d’expérience du vélo à Tanger',
        ar: 'سنوات من الخبرة في الدراجات بطنجة',
      },
    },
    {
      value: '09:00 – 21:00',
      label: { en: 'open every day', fr: 'ouvert tous les jours', ar: 'مفتوح كل يوم' },
    },
    {
      value: 'EN · FR · AR',
      label: { en: 'we ride with you in three languages', fr: 'nous roulons avec vous en trois langues', ar: 'نرافقكم بثلاث لغات' },
    },
  ],
  faq: [
    {
      question: {
        en: 'Do you deliver bikes to hotels?',
        fr: 'Livrez-vous les vélos aux hôtels ?',
        ar: 'هل توصلون الدراجات إلى الفنادق؟',
      },
      answer: {
        en: 'For rentals of a full day or more we can often deliver within Tangier. Tell us your hotel when you book and we will confirm by email or WhatsApp.',
        fr: 'Pour les locations d’une journée ou plus, nous pouvons souvent livrer dans Tanger. Indiquez votre hôtel lors de la réservation et nous confirmerons par e-mail ou WhatsApp.',
        ar: 'بالنسبة للكراء ليوم كامل أو أكثر يمكننا غالباً التوصيل داخل طنجة. اذكر فندقك عند الحجز وسنؤكد بالبريد أو واتساب.',
      },
    },
    {
      question: {
        en: 'What happens if it rains?',
        fr: 'Que se passe-t-il s’il pleut ?',
        ar: 'ماذا يحدث إذا أمطرت؟',
      },
      answer: {
        en: 'If the weather makes the ride unsafe we will offer another time or a full refund for any payment already made. We contact you before your ride when the forecast is poor.',
        fr: 'Si la météo rend la sortie dangereuse, nous proposons un autre créneau ou le remboursement complet des sommes déjà versées. Nous vous contactons avant la sortie si les prévisions sont mauvaises.',
        ar: 'إذا كان الطقس يجعل الجولة غير آمنة سنقترح موعداً آخر أو استرداداً كاملاً لأي مبلغ دُفع. نتواصل معك قبل الجولة عند سوء الأحوال.',
      },
    },
  ],
  currency: 'MAD',
  timezone: 'Africa/Casablanca',
  updated_at: '2025-01-05T09:00:00.000Z',
};
