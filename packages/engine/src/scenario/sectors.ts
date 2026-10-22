import type { RoomFunction } from "../spatial";

export const SECTOR_TYPES = [
  "housing",
  "catering",
  "agriculture",
  "complementaryFood",
  "waterSanitation",
  "energy",
  "airVentilation",
  "maintenanceIndustry",
  "health",
  "logistics",
  "recyclingWaste",
  "educationArchives",
  "administration",
  "security",
  "communications",
  "cultureSociability",
  "externalAccess",
] as const;

export type SectorType = (typeof SECTOR_TYPES)[number];

/** Resources a sector depends on (concept §3.4, last column). */
export type Dependency =
  | "water"
  | "power"
  | "air"
  | "light"
  | "food"
  | "seeds"
  | "nutrients"
  | "parts"
  | "materials"
  | "filters"
  | "medicalSupplies"
  | "containers"
  | "staff"
  | "documents"
  | "equipment"
  | "information";

export interface SectorDefinition {
  type: SectorType;
  label: string;
  /** Typical rooms and equipment. */
  rooms: string[];
  /** Main activities. */
  activities: string[];
  dependencies: Dependency[];
  /** Function given to the rooms of this sector in the spatial model. */
  roomFunction: RoomFunction;
}

const sector = (
  type: SectorType,
  label: string,
  roomFunction: RoomFunction,
  rooms: string[],
  activities: string[],
  dependencies: Dependency[],
): SectorDefinition => ({ type, label, rooms, activities, dependencies, roomFunction });

/** Sector types of concept §3.4; equipment, recipes and capacities are balanced at prototype. */
export const SECTOR_CATALOG: readonly SectorDefinition[] = [
  sector(
    "housing",
    "Habitat",
    "housing",
    ["dwellings", "dormitories", "sanitary", "common rooms"],
    ["rest", "family life", "hygiene"],
    ["water", "air", "light", "staff"],
  ),
  sector(
    "catering",
    "Restauration",
    "canteen",
    ["kitchens", "preparation", "refectories", "local stores"],
    ["food processing", "food distribution"],
    ["water", "power", "food", "containers"],
  ),
  sector(
    "agriculture",
    "Agriculture",
    "technical",
    ["crops", "nurseries", "irrigation", "harvest preparation"],
    ["plant production"],
    ["water", "seeds", "nutrients", "air", "light"],
  ),
  sector(
    "complementaryFood",
    "Production alimentaire complémentaire",
    "technical",
    ["scenario-specific installations"],
    ["food diversification"],
    ["water", "power", "nutrients", "materials"],
  ),
  sector(
    "waterSanitation",
    "Eau et assainissement",
    "technical",
    ["tanks", "pumps", "filtration", "wastewater treatment"],
    ["storage", "circulation", "treatment", "checks"],
    ["power", "filters", "staff"],
  ),
  sector(
    "energy",
    "Énergie",
    "technical",
    ["generation", "distribution", "control boards", "storage"],
    ["power production", "power distribution"],
    ["parts", "materials", "staff"],
  ),
  sector(
    "airVentilation",
    "Air et ventilation",
    "technical",
    ["fans", "ducts", "filters", "sensors", "regeneration"],
    ["air renewal", "air treatment"],
    ["power", "parts", "filters"],
  ),
  sector(
    "maintenanceIndustry",
    "Maintenance et industrie",
    "workshop",
    ["mechanical workshop", "tooling", "parts fabrication", "technical store"],
    ["diagnosis", "repair", "fabrication"],
    ["materials", "power", "documents", "staff"],
  ),
  sector(
    "health",
    "Santé",
    "infirmary",
    ["consultation", "infirmary", "pharmacy", "care rooms"],
    ["care", "medical rest", "follow-up"],
    ["staff", "water", "power", "medicalSupplies"],
  ),
  sector(
    "logistics",
    "Logistique",
    "storage",
    ["depots", "reception", "sorting", "order preparation", "carrying relays"],
    ["stock distribution", "deliveries"],
    ["containers", "staff"],
  ),
  sector(
    "recyclingWaste",
    "Recyclage et déchets",
    "technical",
    ["collection", "sorting", "dismantling", "treatment", "residue storage"],
    ["material recovery", "waste disposal"],
    ["power", "water", "equipment"],
  ),
  sector(
    "educationArchives",
    "Éducation et archives",
    "school",
    ["classes", "learning spaces", "library", "technical archives"],
    ["training", "skill transmission", "record keeping"],
    ["staff", "documents"],
  ),
  sector(
    "administration",
    "Administration et vie collective",
    "technical",
    ["offices", "council", "reception", "meeting rooms"],
    ["assignments", "arbitration", "registers", "decisions"],
    ["information", "staff"],
  ),
  sector(
    "security",
    "Sécurité",
    "technical",
    ["posts", "access control", "intervention rooms", "holding"],
    ["patrols", "rule enforcement"],
    ["staff", "equipment", "information"],
  ),
  sector(
    "communications",
    "Communications et surveillance",
    "technical",
    ["relays", "intercoms", "terminals", "camera supervision"],
    ["message transmission", "observation"],
    ["power", "equipment", "information"],
  ),
  sector(
    "cultureSociability",
    "Culture et sociabilité",
    "technical",
    ["meeting spaces", "leisure", "gatherings", "memorial places"],
    ["relations", "relaxation", "cultural transmission"],
    ["staff", "information"],
  ),
  sector(
    "externalAccess",
    "Accès extérieur",
    "technical",
    ["airlocks", "inspection", "preparation", "decontamination"],
    ["surface interface"],
    ["equipment", "staff", "air"],
  ),
];

export const getSector = (type: SectorType): SectorDefinition =>
  SECTOR_CATALOG.find((s) => s.type === type)!;
