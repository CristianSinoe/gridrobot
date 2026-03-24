export type RobotCapacityUnit = "units" | "kg";
export type RobotSupport =
  | "UNIT_LOAD"
  | "BULK_LOAD"
  | "NON_FRAGILE"
  | "FRAGILE"
  | "REFRIGERATED";

export interface RobotCatalogEntry {
  code: string;
  name: string;
  physicalWeightKg: number;
  speedCellsPerSec: number;
  capacityValue: number;
  capacityUnit: RobotCapacityUnit;
  supports: RobotSupport[];
  status: "activo" | "inactivo" | "mantenimiento" | "en_espera";
  isActive: boolean;
}

export const ROBOT_CATALOG: RobotCatalogEntry[] = [
  {
    code: "R01",
    name: "Sinoe Prime",
    physicalWeightKg: 68,
    speedCellsPerSec: 1.8,
    capacityValue: 40,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "NON_FRAGILE"],
    status: "activo",
    isActive: true
  },
  {
    code: "R02",
    name: "Alison Vector",
    physicalWeightKg: 82,
    speedCellsPerSec: 1.4,
    capacityValue: 80,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "NON_FRAGILE", "FRAGILE"],
    status: "activo",
    isActive: true
  },
  {
    code: "R03",
    name: "Yatana Core",
    physicalWeightKg: 96,
    speedCellsPerSec: 1.2,
    capacityValue: 60,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "REFRIGERATED", "FRAGILE"],
    status: "activo",
    isActive: true
  },
  {
    code: "R04",
    name: "Angel Sentinel",
    physicalWeightKg: 108,
    speedCellsPerSec: 1.1,
    capacityValue: 100,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "REFRIGERATED", "NON_FRAGILE"],
    status: "inactivo",
    isActive: false
  },
  {
    code: "R05",
    name: "Bulk Rover S",
    physicalWeightKg: 110,
    speedCellsPerSec: 0.9,
    capacityValue: 120,
    capacityUnit: "kg",
    supports: ["BULK_LOAD", "NON_FRAGILE"],
    status: "mantenimiento",
    isActive: false
  },
  {
    code: "R06",
    name: "Bulk Rover M",
    physicalWeightKg: 130,
    speedCellsPerSec: 0.8,
    capacityValue: 180,
    capacityUnit: "kg",
    supports: ["BULK_LOAD", "NON_FRAGILE"],
    status: "inactivo",
    isActive: false
  },
  {
    code: "R07",
    name: "Bulk Liquid",
    physicalWeightKg: 125,
    speedCellsPerSec: 0.85,
    capacityValue: 150,
    capacityUnit: "kg",
    supports: ["BULK_LOAD"],
    status: "activo",
    isActive: true
  },
  {
    code: "R08",
    name: "GlassCare A",
    physicalWeightKg: 78,
    speedCellsPerSec: 1.3,
    capacityValue: 50,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "FRAGILE"],
    status: "activo",
    isActive: true
  },
  {
    code: "R09",
    name: "GlassCare B",
    physicalWeightKg: 84,
    speedCellsPerSec: 1.25,
    capacityValue: 70,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "FRAGILE"],
    status: "en_espera",
    isActive: true
  },
  {
    code: "R10",
    name: "Polar Box",
    physicalWeightKg: 102,
    speedCellsPerSec: 1.0,
    capacityValue: 90,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "REFRIGERATED"],
    status: "inactivo",
    isActive: false
  },
  {
    code: "R11",
    name: "Swift Pick",
    physicalWeightKg: 60,
    speedCellsPerSec: 2.2,
    capacityValue: 25,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "NON_FRAGILE"],
    status: "activo",
    isActive: true
  },
  {
    code: "R12",
    name: "Swift Fragile",
    physicalWeightKg: 64,
    speedCellsPerSec: 2.0,
    capacityValue: 20,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "FRAGILE"],
    status: "activo",
    isActive: true
  },
  {
    code: "R13",
    name: "HeavyCrate 1",
    physicalWeightKg: 145,
    speedCellsPerSec: 0.75,
    capacityValue: 140,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "NON_FRAGILE"],
    status: "mantenimiento",
    isActive: false
  },
  {
    code: "R14",
    name: "HeavyCrate 2",
    physicalWeightKg: 150,
    speedCellsPerSec: 0.7,
    capacityValue: 220,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "NON_FRAGILE"],
    status: "inactivo",
    isActive: false
  },
  {
    code: "R15",
    name: "Hybrid Flex",
    physicalWeightKg: 92,
    speedCellsPerSec: 1.35,
    capacityValue: 75,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "FRAGILE", "NON_FRAGILE"],
    status: "activo",
    isActive: true
  },
  {
    code: "R16",
    name: "Hybrid Bulk",
    physicalWeightKg: 118,
    speedCellsPerSec: 0.95,
    capacityValue: 100,
    capacityUnit: "kg",
    supports: ["BULK_LOAD", "UNIT_LOAD", "NON_FRAGILE"],
    status: "en_espera",
    isActive: true
  },
  {
    code: "R17",
    name: "ColdFrag X",
    physicalWeightKg: 112,
    speedCellsPerSec: 1.05,
    capacityValue: 55,
    capacityUnit: "units",
    supports: ["REFRIGERATED", "FRAGILE", "UNIT_LOAD"],
    status: "activo",
    isActive: true
  },
  {
    code: "R18",
    name: "SandMover",
    physicalWeightKg: 135,
    speedCellsPerSec: 0.78,
    capacityValue: 200,
    capacityUnit: "kg",
    supports: ["BULK_LOAD"],
    status: "inactivo",
    isActive: false
  },
  {
    code: "R19",
    name: "BottleLine",
    physicalWeightKg: 88,
    speedCellsPerSec: 1.5,
    capacityValue: 110,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "FRAGILE", "REFRIGERATED"],
    status: "activo",
    isActive: true
  },
  {
    code: "R20",
    name: "Omni Reserve",
    physicalWeightKg: 120,
    speedCellsPerSec: 1.1,
    capacityValue: 130,
    capacityUnit: "units",
    supports: ["UNIT_LOAD", "NON_FRAGILE", "FRAGILE", "REFRIGERATED"],
    status: "inactivo",
    isActive: false
  }
];

export const FIXED_RUNTIME_ASSIGNMENTS = [
  { nodeCode: "PC-B01", robotCode: "R03" },
  { nodeCode: "PC-B02", robotCode: "R11" },
  { nodeCode: "PC-B03", robotCode: "R16" }
] as const;
