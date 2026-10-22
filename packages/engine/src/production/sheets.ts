import type { ProductionSheet } from "./types";

// Simple first lines (D-06 sub-units: mL, kcal, Ws). Figures are starting values to calibrate.
export const PRODUCTION_SHEETS: readonly ProductionSheet[] = [
  {
    id: "waterTreatment",
    label: "Traitement de l'eau",
    inputs: [{ kind: "energy", amount: 6_000_000 }],
    output: { kind: "water", amount: 500_000 },
    durationSteps: 30,
    equipment: "station de traitement",
    profession: "waterTechnician",
    operators: 1,
    capacity: 2,
  },
  {
    id: "hydroponicFarm",
    label: "Culture hydroponique",
    inputs: [
      { kind: "water", amount: 200_000 },
      { kind: "energy", amount: 12_000_000 },
    ],
    output: { kind: "food", amount: 40_000 },
    durationSteps: 240,
    equipment: "bac hydroponique",
    profession: "farmer",
    operators: 1,
    capacity: 4,
  },
  {
    id: "turbine",
    label: "Turbine d'appoint",
    inputs: [{ kind: "spareParts", amount: 1 }],
    output: { kind: "energy", amount: 180_000_000 },
    durationSteps: 60,
    equipment: "turbine",
    profession: "energyOperator",
    operators: 1,
    capacity: 1,
  },
];

const byId = new Map(PRODUCTION_SHEETS.map((s) => [s.id, s]));

export const getSheet = (id: string): ProductionSheet => {
  const sheet = byId.get(id);
  if (!sheet) throw new Error(`unknown production sheet ${id}`);
  return sheet;
};
