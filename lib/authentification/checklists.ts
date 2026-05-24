export type CheckCategory =
  | "structure"
  | "materiaux"
  | "coutures"
  | "gravures"
  | "holos"
  | "serial"
  | "packaging"
  | "quincaillerie"
  | "toile";

export type CheckPoint = {
  id: string;
  label: string;
  detail: string;
  category: CheckCategory;
  critical: boolean; // point eliminatoire si non valide
  photo?: string; // chemin relatif /public/auth/<brand>/<id>.jpg
};

export type BrandModel = {
  id: string;
  label: string;
  checklist: CheckPoint[];
};

export type BrandChecklist = {
  id: string;
  label: string;
  models: BrandModel[];
  genericChecklist: CheckPoint[]; // points communs a tous les modeles de la marque
};

// ─── Hermes ───────────────────────────────────────────────

const hermesGeneric: CheckPoint[] = [
  {
    id: "hermes_coutures_saddlestitch",
    label: "Coutures sellier (saddle stitch) manuelles",
    detail: "Les points doivent etre inclines, reguliers et legerement en relief. Une couture machine = faux (points droits et plats).",
    category: "coutures",
    critical: true,
    photo: "/auth/hermes/coutures_saddlestitch.jpg",
  },
  {
    id: "hermes_gravure_hermes_paris",
    label: "Gravure 'Hermes Paris' sur les fermoirs",
    detail: "Lettres nettes, equidistantes, sans bavure. La gravure est profonde et propre. Les caracteres sont serifs.",
    category: "gravures",
    critical: true,
    photo: "/auth/hermes/gravure_fermoir.jpg",
  },
  {
    id: "hermes_cuir_odeur",
    label: "Odeur et texture du cuir",
    detail: "Cuir Togo, Clemence ou Box authentique : odeur animale caracteristique, grain regulier. Pas d'odeur de plastique ou de colle.",
    category: "materiaux",
    critical: true,
  },
  {
    id: "hermes_quincaillerie_poids",
    label: "Poids et qualite de la quincaillerie",
    detail: "Palladium ou plaque or : lourd, froid au toucher, sans rayures superficielles. Le verrou 'cliquete' sec et precis.",
    category: "quincaillerie",
    critical: true,
    photo: "/auth/hermes/quincaillerie.jpg",
  },
  {
    id: "hermes_stamp_blind",
    label: "Blind stamp (lettre + annee de fabrication)",
    detail: "Tamponne a l'or ou a l'argent sur la bande interieure. Lettres et carres parfaitement alignes. Consultez le guide des blind stamps Hermes.",
    category: "serial",
    critical: true,
    photo: "/auth/hermes/blind_stamp.jpg",
  },
  {
    id: "hermes_toile_point",
    label: "Point de la toile (si modele toile)",
    detail: "Toile H herringbone : motif net, fils bien tisses, pas de fil lache. Couleur homogene.",
    category: "toile",
    critical: false,
  },
  {
    id: "hermes_doublure",
    label: "Doublure interieure chevre ou box",
    detail: "Doublure en peau retournee, grain fin. Coutures interieures parfaites. Poche interieure avec logo Hermes.",
    category: "materiaux",
    critical: false,
    photo: "/auth/hermes/doublure.jpg",
  },
];

const hermesModels: BrandModel[] = [
  {
    id: "birkin",
    label: "Birkin",
    checklist: [
      {
        id: "birkin_clochette",
        label: "Clochette et cadenas assortis",
        detail: "Clochette en cuir de la meme peau que le sac. Cadenas grave 'Hermes Paris'. La cle doit rentrer et tourner. Le numero du cadenas correspond a la cle.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/hermes/birkin_clochette.jpg",
      },
      {
        id: "birkin_sangle",
        label: "Sangle et boucle symetriques",
        detail: "Les deux sangles laterales sont identiques en longueur et positionnement. La boucle double tour est symetrique.",
        category: "structure",
        critical: false,
        photo: "/auth/hermes/birkin_sangle.jpg",
      },
      {
        id: "birkin_fond_plat",
        label: "Fond plat et rigide",
        detail: "Le fond reste plat quand le sac est pose. Pas d'affaissement lateral.",
        category: "structure",
        critical: false,
      },
    ],
  },
  {
    id: "kelly",
    label: "Kelly",
    checklist: [
      {
        id: "kelly_sanglon",
        label: "Sanglons et boucle Kelly",
        detail: "Trois sanglons identiques. La boucle est en T et tourne sans friction. L'embase est solidement rivetee.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/hermes/kelly_sanglon.jpg",
      },
      {
        id: "kelly_couture_retournee",
        label: "Coutures retournees (Kelly retourne)",
        detail: "Sur le Kelly retourne, les coutures sont a l'interieur. Sur le Kelly sellier, elles sont a l'exterieur et plus rigides.",
        category: "coutures",
        critical: false,
      },
    ],
  },
  {
    id: "constance",
    label: "Constance",
    checklist: [
      {
        id: "constance_h_closure",
        label: "Fermoir H en metal massif",
        detail: "Le H est solide, sans jeu. Le mecanisme de fermeture est precis — pas de frottement. Grave 'Hermes' au dos.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/hermes/constance_h.jpg",
      },
    ],
  },
];

// ─── Chanel ───────────────────────────────────────────────

const chanelGeneric: CheckPoint[] = [
  {
    id: "chanel_cc_logo_symetrie",
    label: "Symetrie parfaite des CC entrelaces",
    detail: "Le C gauche passe devant en haut, le C droit passe devant en bas. Toujours. Un logo inverse = faux.",
    category: "gravures",
    critical: true,
    photo: "/auth/chanel/cc_logo.jpg",
  },
  {
    id: "chanel_serial_sticker",
    label: "Sticker holographique + serie authenticity card",
    detail: "Depuis 1984. Le sticker (dans le sac) et la carte ont le meme numero serie. Sticker : reflets arc-en-ciel, motif 'CHANEL' en micro-texte. Post-2021 : puce NFC.",
    category: "holos",
    critical: true,
    photo: "/auth/chanel/serial_sticker.jpg",
  },
  {
    id: "chanel_coutures",
    label: "Coutures coton cirees paralleles",
    detail: "Coutures en coton ciree blanc ou noir selon modele. Regulieres, tendues, sans fil lache. Nombre de points au cm constant.",
    category: "coutures",
    critical: true,
    photo: "/auth/chanel/coutures.jpg",
  },
  {
    id: "chanel_cuir_matelasse",
    label: "Matelassage regulier et profond",
    detail: "Les losanges sont uniformes en taille. Les coutures qui forment le matelassage ne traversent pas le dos du cuir. Bords pas gondoles.",
    category: "structure",
    critical: true,
    photo: "/auth/chanel/matelassage.jpg",
  },
  {
    id: "chanel_quincaillerie_lourde",
    label: "Chaine et quincaillerie lourdes",
    detail: "La chaine entrelacee cuir/metal est lourde et tombe bien. Pas de torsion. Les maillons ne s'ouvrent pas a la main.",
    category: "quincaillerie",
    critical: false,
    photo: "/auth/chanel/chaine.jpg",
  },
];

const chanelModels: BrandModel[] = [
  {
    id: "classic_flap",
    label: "Classic Flap",
    checklist: [
      {
        id: "classicflap_fermeture_mademoiselle",
        label: "Fermeture : Mademoiselle vs Double Flap",
        detail: "Vintage Mademoiselle : fermoir droit (pas de CC). Double Flap avec CC : post-1955. Verifiez la coherence avec le numero de serie.",
        category: "quincaillerie",
        critical: false,
        photo: "/auth/chanel/classicflap_fermoir.jpg",
      },
      {
        id: "classicflap_poche_interieure",
        label: "Poche interieure zippee alignee",
        detail: "La poche zip interieure est bien centree. La tirette du zip est en metal grave 'CHANEL'.",
        category: "structure",
        critical: false,
      },
    ],
  },
  {
    id: "boy_bag",
    label: "Boy Bag",
    checklist: [
      {
        id: "boy_fermoir_vieilli",
        label: "Fermoir CC rectangulaire",
        detail: "Le fermoir clique sec. Il n'y a pas de jeu lateral. Grave 'CHANEL' sur le dessous.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/chanel/boy_fermoir.jpg",
      },
    ],
  },
];

// ─── Louis Vuitton ────────────────────────────────────────

const lvGeneric: CheckPoint[] = [
  {
    id: "lv_toile_alignement",
    label: "Alignement parfait de la toile monogramme",
    detail: "Les LV et fleurs sont symetriques par rapport au centre. Sur les grandes faces, le motif se reflecte en miroir. Les motifs ne sont jamais coupes par les coutures.",
    category: "toile",
    critical: true,
    photo: "/auth/lv/toile_alignement.jpg",
  },
  {
    id: "lv_date_code",
    label: "Date code correct et lisible",
    detail: "Format : 2 lettres (usine) + 4 chiffres (mois/annee). Depuis 2021 : microchip remplace le date code. Consultez le guide des codes LV par periode.",
    category: "serial",
    critical: true,
    photo: "/auth/lv/date_code.jpg",
  },
  {
    id: "lv_lozine",
    label: "Lozine (bords) droit et regulier",
    detail: "La lozine (bord protecteur) est appliquee proprement, sans bulle ni irregularite. Couleur uniforme.",
    category: "materiaux",
    critical: true,
    photo: "/auth/lv/lozine.jpg",
  },
  {
    id: "lv_vachetta_patine",
    label: "Patine du cuir vachetta coherente",
    detail: "Le cuir naturel vachetta (anses, fond) patine au miel avec le temps. Couleur uniforme sur toutes les pieces en vachetta. Une teinte trop orange = peinture.",
    category: "materiaux",
    critical: false,
    photo: "/auth/lv/vachetta.jpg",
  },
  {
    id: "lv_zip_lampo",
    label: "Zip Lampo ou Eclair grave",
    detail: "Les zips sont graves 'LOUIS VUITTON' ou portent la marque 'Lampo' ou 'Eclair'. Pas de zip YKK sur les anciens modeles.",
    category: "quincaillerie",
    critical: true,
    photo: "/auth/lv/zip.jpg",
  },
  {
    id: "lv_coutures_lin",
    label: "Coutures en fil de lin jaune/doré",
    detail: "Fil de lin ciree, couleur miel. Points reguliers et senses (pas de fil tire).",
    category: "coutures",
    critical: false,
  },
];

const lvModels: BrandModel[] = [
  {
    id: "speedy",
    label: "Speedy",
    checklist: [
      {
        id: "speedy_serrure",
        label: "Serrure S-lock et clochette",
        detail: "La serrure S-lock ferme avec les deux cles identiques. Grave 'LOUIS VUITTON'. La clochette a le meme cuir que les anses.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/lv/speedy_serrure.jpg",
      },
    ],
  },
  {
    id: "neverfull",
    label: "Neverfull",
    checklist: [
      {
        id: "neverfull_sangles_laterales",
        label: "Sangles laterales fonctionnelles",
        detail: "Les sangles cintrent le sac de facon symetrique. Les passants en cuir sont reguliers.",
        category: "structure",
        critical: false,
      },
    ],
  },
  {
    id: "pochette_metis",
    label: "Pochette Metis",
    checklist: [
      {
        id: "pochette_metis_clasp",
        label: "Fermoir a clip precis",
        detail: "Le fermoir s'ouvre et se ferme sans effort excessif. Le claquement est sec. Grave 'LOUIS VUITTON' cote interieur.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/lv/metis_clasp.jpg",
      },
    ],
  },
];

// ─── Gucci ────────────────────────────────────────────────

const gucciGeneric: CheckPoint[] = [
  {
    id: "gucci_serial_interieur",
    label: "Numero de serie grave dans la doublure",
    detail: "Grave en relief sur une etiquette en cuir interieure. Format : plusieurs chiffres, precede parfois du numero de style. Les lettres sont parfaitement alignees.",
    category: "serial",
    critical: true,
    photo: "/auth/gucci/serial.jpg",
  },
  {
    id: "gucci_gg_toile",
    label: "Toile GG supreme : texture et couleur",
    detail: "La toile GG Supreme est rigide et traitee. Les GG sont bruns sur fond beige. Les motifs ne decolorent pas au lavage.",
    category: "toile",
    critical: true,
    photo: "/auth/gucci/gg_toile.jpg",
  },
  {
    id: "gucci_coutures_rouges_vertes",
    label: "Bandes rouge-vert-rouge sur les accessoires Web",
    detail: "La bande Web est tissee, pas imprimee. Les couleurs sont precises : rouge Gucci specifique, pas d'autre teinte.",
    category: "materiaux",
    critical: false,
    photo: "/auth/gucci/web_stripe.jpg",
  },
  {
    id: "gucci_quincaillerie_gravee",
    label: "Quincaillerie gravee 'GUCCI'",
    detail: "Tous les elements metal sont graves ou estampes 'GUCCI'. La police est constante. Pas de vis apparentes sur les boucles.",
    category: "quincaillerie",
    critical: true,
  },
];

const gucciModels: BrandModel[] = [
  {
    id: "dionysus",
    label: "Dionysus",
    checklist: [
      {
        id: "dionysus_fermoir_tigre",
        label: "Fermoir tete de tigre",
        detail: "Le tigre est detaille, en metal pese. Les yeux peuvent etre en email ou cristaux. Le mecanisme push-down est precis.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/gucci/dionysus_tigre.jpg",
      },
    ],
  },
  {
    id: "horsebit_1955",
    label: "Horsebit 1955",
    checklist: [
      {
        id: "horsebit_mors",
        label: "Mors de cheval en metal plein",
        detail: "Le mors (horsebit) est en metal massif, lourd. Grave 'GUCCI' sur l'un des anneaux.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/gucci/horsebit.jpg",
      },
    ],
  },
];

// ─── Dior ─────────────────────────────────────────────────

const diorGeneric: CheckPoint[] = [
  {
    id: "dior_coutures_matelassage",
    label: "Matelassage et coutures Cannage",
    detail: "Le motif Cannage (rempaillage) est regulier. Les losanges sont symetriques. Coutures fines et tendues.",
    category: "coutures",
    critical: true,
    photo: "/auth/dior/cannage.jpg",
  },
  {
    id: "dior_qr_code_interieur",
    label: "QR code et numero de serie interieur",
    detail: "Depuis 2021, chaque sac a un QR code + serial sur la languette interieure. Le QR pointe vers dior.com. Avant 2021 : juste le serial.",
    category: "serial",
    critical: true,
    photo: "/auth/dior/qr_serial.jpg",
  },
  {
    id: "dior_quincaillerie_cd",
    label: "Quincaillerie CD grave et lisse",
    detail: "Le logo CD est precis, sans bavure. La finition est lisse. Le metal est froid et lourd. Pas de tache d'oxydation sur un modele recente.",
    category: "quincaillerie",
    critical: true,
    photo: "/auth/dior/cd_quincaillerie.jpg",
  },
];

const diorModels: BrandModel[] = [
  {
    id: "lady_dior",
    label: "Lady Dior",
    checklist: [
      {
        id: "ladydior_charmes",
        label: "Charmes D-I-O-R en metal",
        detail: "Les 4 charmes sont graves, equilibres, et de hauteur identique. Ils tintent mais ne s'entrechoquent pas fort. Metal lourd.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/dior/ladydior_charmes.jpg",
      },
    ],
  },
  {
    id: "book_tote",
    label: "Book Tote",
    checklist: [
      {
        id: "booktote_broderie",
        label: "Broderie dense et reversible",
        detail: "La broderie est visible des deux cotes. Les fils ne depassent pas. Le 'Christian Dior Paris' est brode, pas imprime.",
        category: "materiaux",
        critical: true,
        photo: "/auth/dior/booktote_broderie.jpg",
      },
    ],
  },
];

// ─── Bottega Veneta ───────────────────────────────────────

const bottegaGeneric: CheckPoint[] = [
  {
    id: "bottega_intrecciato_regulier",
    label: "Intrecciato regulier et serre",
    detail: "Le tressage est identique sur toute la surface. Aucun point lache ou irreguler. Les bandes de cuir ont une largeur constante.",
    category: "materiaux",
    critical: true,
    photo: "/auth/bottega/intrecciato.jpg",
  },
  {
    id: "bottega_logo_invisible",
    label: "Absence de logo exterieur (principe de la marque)",
    detail: "Bottega Veneta n'appose pas de logo visible a l'exterieur. Si tu vois un logo grave ou estampe en evidence a l'exterieur, c'est suspect.",
    category: "structure",
    critical: true,
  },
  {
    id: "bottega_coutures_cuir",
    label: "Coutures en cuir naturel interieur",
    detail: "La doublure interieure est en chevre (peau lisse et fine). Coutures propres. Pas de doublure synthetique sur les modeles premium.",
    category: "coutures",
    critical: false,
  },
];

const bottegaModels: BrandModel[] = [
  {
    id: "jodie",
    label: "Jodie / Cassette",
    checklist: [
      {
        id: "jodie_noeud",
        label: "Noeud central symetrique",
        detail: "Le noeud est forme d'une seule piece de cuir continue, pas de couture centrale. La compression est uniforme.",
        category: "structure",
        critical: false,
        photo: "/auth/bottega/jodie_noeud.jpg",
      },
    ],
  },
];

// ─── Balenciaga ───────────────────────────────────────────

const balenciagaGeneric: CheckPoint[] = [
  {
    id: "balenciaga_balenciaga_police",
    label: "Police Balenciaga reguliere",
    detail: "Le logo 'BALENCIAGA' est en police Grotesque. Lettres equidistantes, meme taille. Pas de police serife ou mal espacee.",
    category: "gravures",
    critical: true,
    photo: "/auth/balenciaga/logo_police.jpg",
  },
  {
    id: "balenciaga_zip_riri_lampo",
    label: "Zip RIRI ou Lampo grave",
    detail: "Les zips sont marques RIRI (suisse) ou Lampo. Pas de zip sans marque ou marque inconnue sur les modeles premium.",
    category: "quincaillerie",
    critical: true,
    photo: "/auth/balenciaga/zip_riri.jpg",
  },
  {
    id: "balenciaga_cuir_naturel",
    label: "Cuir naturel veille (Motorcycle / City)",
    detail: "Le cuir des City bags est mou, leger et veilli naturellement. Grain irregulier. Pas de surface trop uniforme.",
    category: "materiaux",
    critical: false,
  },
];

const balenciagaModels: BrandModel[] = [
  {
    id: "city_bag",
    label: "City Bag",
    checklist: [
      {
        id: "city_miroir_pendentif",
        label: "Miroir pendentif Balenciaga",
        detail: "Le petit miroir rond est grave 'BALENCIAGA' sur le fond. Il est en metal massif, pas creux. La chaine est solidement fixee.",
        category: "quincaillerie",
        critical: false,
        photo: "/auth/balenciaga/city_miroir.jpg",
      },
    ],
  },
  {
    id: "le_cagole",
    label: "Le Cagole",
    checklist: [
      {
        id: "cagole_clous",
        label: "Clous en metal reguliers et symetriques",
        detail: "Les clous sont places geometriquement. Pas de clou tordu, dore irregulierement ou de taille differente.",
        category: "quincaillerie",
        critical: false,
        photo: "/auth/balenciaga/cagole_clous.jpg",
      },
    ],
  },
];

// ─── Burberry ─────────────────────────────────────────────

const burberryGeneric: CheckPoint[] = [
  {
    id: "burberry_check_tisse",
    label: "Check tisse (pas imprime) sur les modeles classiques",
    detail: "Le check Burberry est tisse dans le tissu, pas imprime dessus. Les fils sont visibles des deux cotes. Le motif est parfaitement regulier.",
    category: "toile",
    critical: true,
    photo: "/auth/burberry/check_tisse.jpg",
  },
  {
    id: "burberry_check_alignement",
    label: "Alignement du check aux coutures",
    detail: "Sur les sacs en check, le motif se poursuit de facon continue a travers les coutures. Aucun decalage.",
    category: "coutures",
    critical: true,
    photo: "/auth/burberry/check_alignement.jpg",
  },
  {
    id: "burberry_label_interieur",
    label: "Label interieur 'BURBERRY' brode ou grave",
    detail: "Le label interieur est en cuir grave ou tissu brode. Police propre et nette. Presente le code pays de fabrication.",
    category: "serial",
    critical: false,
    photo: "/auth/burberry/label.jpg",
  },
];

const burberryModels: BrandModel[] = [
  {
    id: "tb_bag",
    label: "TB Bag",
    checklist: [
      {
        id: "tb_initiales_lourdes",
        label: "Initiales TB en metal massif",
        detail: "Les deux lettres TB sont en metal lourd, grave en relief. Pas de lettres en plastique ou aluminium leger.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/burberry/tb_initiales.jpg",
      },
    ],
  },
];

// ─── Moncler ──────────────────────────────────────────────

const monclerGeneric: CheckPoint[] = [
  {
    id: "moncler_badge_patch",
    label: "Badge Moncler brode regulier",
    detail: "Le canard Moncler est brode proprement. Couleurs : rouge, blanc, bleu fonce. Les fils sont secs, pas de fil depasse. Fond du badge blanc cassé.",
    category: "gravures",
    critical: true,
    photo: "/auth/moncler/badge.jpg",
  },
  {
    id: "moncler_zip_ykk_marlin",
    label: "Zip YKK ou Marlin de qualite",
    detail: "Les zips sont YKK ou Marlin. La tirette glisse sans resistance et sans coincement. La tirette elle-meme est solide.",
    category: "quincaillerie",
    critical: true,
  },
  {
    id: "moncler_duvet_repartition",
    label: "Repartition homogene du duvet (doudounes)",
    detail: "Le duvet est uniformement reparti dans chaque compartiment. Pas de zone vide. En pressant le tissu, il revient immediatement.",
    category: "materiaux",
    critical: false,
  },
  {
    id: "moncler_etiquette_interieure",
    label: "Etiquette interieure avec QR code",
    detail: "L'etiquette interieure comporte le logo Moncler, le pays de fabrication (souvent Europe) et depuis 2020 un QR code de traçabilite.",
    category: "serial",
    critical: true,
    photo: "/auth/moncler/etiquette_qr.jpg",
  },
];

const monclerModels: BrandModel[] = [
  {
    id: "maya",
    label: "Maya / Alyx",
    checklist: [
      {
        id: "maya_coutures_bandes",
        label: "Bandes colorees sur les coutures (si present)",
        detail: "Certains modeles Maya ont des bandes de couleur sur les coutures laterales. Elles sont dans la couleur de la gamme correspondante.",
        category: "coutures",
        critical: false,
      },
    ],
  },
];

// ─── Celine ───────────────────────────────────────────────

const celineGeneric: CheckPoint[] = [
  {
    id: "celine_police_sans_accent",
    label: "Police CELINE sans accent (e accentue)",
    detail: "Depuis 2018 (Slimane), le logo est 'CELINE' sans accent sur le E. Avant (Phoebe Philo) : 'CELINE' avec accent. Verifiez la coherence avec le modele et l'annee.",
    category: "gravures",
    critical: true,
    photo: "/auth/celine/logo_police.jpg",
  },
  {
    id: "celine_cuir_box",
    label: "Cuir Box lisse et brillant",
    detail: "Le cuir Box Celine est extreme brillant et lisse au toucher, froid et fin. Pas de grain apparent. Le pli disparait quasi-immediatement.",
    category: "materiaux",
    critical: false,
  },
  {
    id: "celine_serial_interieur",
    label: "Serial interieur grave sur etiquette cuir",
    detail: "Petit rectangle de cuir cousu a l'interieur. Grave en relief. Le numero de serie est unique et tracable.",
    category: "serial",
    critical: true,
    photo: "/auth/celine/serial.jpg",
  },
];

const celineModels: BrandModel[] = [
  {
    id: "classic_box",
    label: "Classic Box",
    checklist: [
      {
        id: "classicbox_fermoir_swivel",
        label: "Fermoir swivel pivotant",
        detail: "La boucle pivote librement a 360 degres. La fermeture est magnetique et precise. Grave 'CELINE PARIS'.",
        category: "quincaillerie",
        critical: true,
        photo: "/auth/celine/classic_box_fermoir.jpg",
      },
    ],
  },
  {
    id: "luggage",
    label: "Luggage / Phantom",
    checklist: [
      {
        id: "luggage_oreilles",
        label: "Oreilles laterales en cuir integral",
        detail: "Les oreilles (handles lateraux) sont taillees dans le cuir sans couture centrale. Massives et rigides.",
        category: "structure",
        critical: false,
        photo: "/auth/celine/luggage_oreilles.jpg",
      },
    ],
  },
];

// ─── Courrèges ────────────────────────────────────────────

const courregesGeneric: CheckPoint[] = [
  {
    id: "courreges_logo_ac",
    label: "Logo AC en cercle regulier",
    detail: "Le monogramme AC (Andre Courreges) est parfaitement centre dans le cercle. Trait d'epaisseur constante. Police geometrique.",
    category: "gravures",
    critical: true,
    photo: "/auth/courreges/logo_ac.jpg",
  },
  {
    id: "courreges_vinyle",
    label: "Vinyle ou cuir epais caracteristique",
    detail: "Les pieces Courreges utilisent souvent du vinyle blanc ou du cuir epais aux couleurs vives. La surface doit etre homogene, sans bulle.",
    category: "materiaux",
    critical: false,
  },
];

const courregesModels: BrandModel[] = [
  {
    id: "ac_bag",
    label: "AC Bag",
    checklist: [
      {
        id: "ac_bag_bandouliere",
        label: "Bandouliere reglable en metal",
        detail: "Les chainettes de reglage sont en metal lourd. Le systeme de blocage est precis et ne glisse pas involontairement.",
        category: "quincaillerie",
        critical: false,
      },
    ],
  },
];

// ─── Export ───────────────────────────────────────────────

export const BRAND_CHECKLISTS: BrandChecklist[] = [
  { id: "hermes",     label: "Hermes",           models: hermesModels,     genericChecklist: hermesGeneric },
  { id: "chanel",     label: "Chanel",            models: chanelModels,     genericChecklist: chanelGeneric },
  { id: "lv",         label: "Louis Vuitton",     models: lvModels,         genericChecklist: lvGeneric },
  { id: "gucci",      label: "Gucci",             models: gucciModels,      genericChecklist: gucciGeneric },
  { id: "dior",       label: "Dior",              models: diorModels,       genericChecklist: diorGeneric },
  { id: "bottega",    label: "Bottega Veneta",    models: bottegaModels,    genericChecklist: bottegaGeneric },
  { id: "balenciaga", label: "Balenciaga",        models: balenciagaModels, genericChecklist: balenciagaGeneric },
  { id: "burberry",   label: "Burberry",          models: burberryModels,   genericChecklist: burberryGeneric },
  { id: "moncler",    label: "Moncler",           models: monclerModels,    genericChecklist: monclerGeneric },
  { id: "celine",     label: "Celine",            models: celineModels,     genericChecklist: celineGeneric },
  { id: "courreges",  label: "Courreges",         models: courregesModels,  genericChecklist: courregesGeneric },
];

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  structure:    "Structure",
  materiaux:    "Materiaux",
  coutures:     "Coutures",
  gravures:     "Gravures / Logos",
  holos:        "Holos / Sceaux",
  serial:       "Serial / Date code",
  packaging:    "Packaging",
  quincaillerie:"Quincaillerie",
  toile:        "Toile / Tissu",
};

export function buildFullChecklist(brandId: string, modelId?: string): CheckPoint[] {
  const brand = BRAND_CHECKLISTS.find((b) => b.id === brandId);
  if (!brand) return [];
  const model = modelId ? brand.models.find((m) => m.id === modelId) : undefined;
  const modelPoints = model?.checklist ?? [];
  return [...brand.genericChecklist, ...modelPoints];
}
