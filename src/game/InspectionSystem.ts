import {
  DifficultyLevel,
  DocumentItem,
  DriverPersonality,
  InspectionCase,
  InspectionHotspot,
} from '../types/game';
import { VEHICLE_CATALOG } from '../data/gameData';

const FIRST_NAMES = [
  'Arjun', 'Vikram', 'Elena', 'Tomasz', 'Marek', 'Sonia', 'Lukas', 'Nadia',
  'Pavel', 'Katarina', 'Rajan', 'Daria', 'Igor', 'Meera', 'Zora', 'Salim',
];
const LAST_NAMES = [
  'Menon', 'Kovacs', 'Novak', 'Petrov', 'Bielik', 'Horvat', 'Varma', 'Sokol',
  'Moroz', 'Varga', 'Kralj', 'Belov', 'Nair', 'Zeman',
];
const NATIONALITIES = ['Osteria', 'Karsavia', 'Valenland', 'Nordmark', 'Balkanova'];
const PERSONALITIES: DriverPersonality[] = [
  'friendly', 'nervous', 'quiet', 'polite', 'impatient', 'confused', 'frustrated',
];

const COLORS = [
  { name: 'Slate Silver', hex: 0x94a3b8 },
  { name: 'Midnight Blue', hex: 0x1e3a5f },
  { name: 'Forest Green', hex: 0x2d4a3e },
  { name: 'Crimson Red', hex: 0x8f2424 },
  { name: 'Arctic White', hex: 0xe5e7eb },
  { name: 'Ochre Gold', hex: 0xb48432 },
  { name: 'Charcoal', hex: 0x27272a },
];

const LEGAL_CARGO_LIST = [
  'Kiln-Dried Timber Crates',
  'Packaged Food Provisions',
  'Automotive Replacement Parts',
  'Agricultural Seed Pallets',
  'Building Hardware & Piping',
  'Chilled Dairy Containers',
  'Bulk Industrial Cement',
  'Passenger Luggage & Parcels',
];

const UNDECLARED_ITEMS = [
  { item: 'Unmarked Sealed Crates (Electronics)', police: true },
  { item: 'Undeclared Restricted Fuel Drums', police: false },
  { item: 'Hidden Faux-Floor Compartment Packages', police: true },
  { item: 'Tampered Container Security Seal', police: true },
  { item: 'Unlisted Commercial Textile Bales', police: false },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genReg(): string {
  const letters = 'ABCDEFGHJKLMNPRSTUVXZ';
  const a = letters[Math.floor(Math.random() * letters.length)];
  const b = letters[Math.floor(Math.random() * letters.length)];
  const c = letters[Math.floor(Math.random() * letters.length)];
  const d = letters[Math.floor(Math.random() * letters.length)];
  const n1 = 10 + Math.floor(Math.random() * 89);
  const n2 = 1000 + Math.floor(Math.random() * 8999);
  return `${a}${b}-${n1}-${c}${d}-${n2}`;
}

export function generateBorderCase(day: number, difficulty: DifficultyLevel): InspectionCase {
  // Bias slightly toward commercial cargo trucks as requested
  const pool =
    Math.random() < 0.62
      ? VEHICLE_CATALOG.filter((v) => v.isCommercial)
      : VEHICLE_CATALOG;
  const spec = pick(pool);
  const color = pick(COLORS);
  const registration = genReg();

  const driverName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const driverAge = 23 + Math.floor(Math.random() * 39);
  const driverNationality = pick(NATIONALITIES);
  const driverSeed = 1000 + Math.floor(Math.random() * 8999);
  const personality = pick(PERSONALITIES);

  // Clean vs Violation ratio (not every vehicle has an issue!)
  const issueChance =
    difficulty === 'cadet' ? 0.38 : difficulty === 'standard' ? 0.48 : 0.58;
  const hasAnyIssue = Math.random() < Math.min(0.68, issueChance + (day - 1) * 0.02);

  // Weight calculation
  const isOverweight = hasAnyIssue && Math.random() < 0.45;
  const actualWeightKg = isOverweight
    ? spec.permittedWeightKg + 650 + Math.floor(Math.random() * 2400)
    : Math.round(spec.baseWeightKg + Math.random() * (spec.permittedWeightKg - spec.baseWeightKg) * 0.72);
  const weightDifferenceKg = actualWeightKg - spec.permittedWeightKg;

  // Document issues
  const docRoll = hasAnyIssue ? Math.random() : 1.0;
  const hasExpiredDoc = hasAnyIssue && docRoll < 0.25;
  const hasPlateMismatch = hasAnyIssue && docRoll >= 0.25 && docRoll < 0.48;
  const hasPhotoMismatch = hasAnyIssue && docRoll >= 0.48 && docRoll < 0.65;
  const hasMissingDetails = hasAnyIssue && docRoll >= 0.65 && docRoll < 0.8;
  const documentsValidActual = !(hasExpiredDoc || hasPlateMismatch || hasPhotoMismatch || hasMissingDetails);

  const declaredCargo = pick(LEGAL_CARGO_LIST);
  const regOnPaper = hasPlateMismatch ? genReg() : registration;
  const docExpiry = hasExpiredDoc ? '2025-07-14' : '2028-09-20';
  const docOwnerName = hasMissingDetails ? '[BLANK / UNSTAMPED]' : driverName;

  const documents: DocumentItem[] = [
    {
      id: 'id_card',
      type: 'id_card',
      title: 'Driver Identification Card',
      holderName: docOwnerName,
      dob: `${2026 - driverAge}-04-12`,
      nationality: driverNationality,
      documentNumber: `ID-${100000 + Math.floor(Math.random() * 899999)}`,
      issueDate: '2022-03-10',
      expiryDate: '2029-03-10',
      issuingAuthority: `${driverNationality} Civil Registry`,
      photoSeed: driverSeed,
      photoMatchesDriver: !hasPhotoMismatch,
      missingDetails: hasMissingDetails,
      isAuthentic: !hasPhotoMismatch && !hasMissingDetails,
    },
    {
      id: 'license',
      type: 'license',
      title: spec.isCommercial ? 'Commercial Driving Licence' : 'Standard Driving Licence',
      holderName: driverName,
      dob: `${2026 - driverAge}-04-12`,
      nationality: driverNationality,
      documentNumber: `DL-${40000 + Math.floor(Math.random() * 59999)}`,
      issueDate: '2021-06-18',
      expiryDate: docExpiry,
      issuingAuthority: 'Frontier Transport Directorate',
      photoSeed: driverSeed,
      photoMatchesDriver: !hasPhotoMismatch,
      isAuthentic: !hasExpiredDoc,
    },
    {
      id: 'registration',
      type: 'registration',
      title: 'Vehicle Registration Certificate',
      holderName: driverName,
      dob: `${2026 - driverAge}-04-12`,
      nationality: driverNationality,
      documentNumber: `RC-${20000 + Math.floor(Math.random() * 79999)}`,
      issueDate: '2023-11-01',
      expiryDate: '2028-11-01',
      issuingAuthority: 'National Motor Registry',
      photoSeed: driverSeed,
      photoMatchesDriver: true,
      vehiclePlate: regOnPaper,
      vehicleModel: spec.label,
      isAuthentic: !hasPlateMismatch,
    },
    {
      id: 'insurance',
      type: 'insurance',
      title: 'Border Transit Insurance',
      holderName: driverName,
      dob: `${2026 - driverAge}-04-12`,
      nationality: driverNationality,
      documentNumber: `IN-${80000 + Math.floor(Math.random() * 19999)}`,
      issueDate: '2026-01-10',
      expiryDate: '2027-01-10',
      issuingAuthority: 'Continental Mutual Assurance',
      photoSeed: driverSeed,
      photoMatchesDriver: true,
      vehiclePlate: regOnPaper,
      isAuthentic: true,
    },
  ];

  if (spec.isCommercial) {
    documents.push(
      {
        id: 'transport_permit',
        type: 'transport_permit',
        title: 'Commercial Transport Permit',
        holderName: driverName,
        dob: `${2026 - driverAge}-04-12`,
        nationality: driverNationality,
        documentNumber: `TP-${3000 + Math.floor(Math.random() * 6999)}`,
        issueDate: '2026-02-01',
        expiryDate: hasExpiredDoc ? '2026-05-01' : '2027-02-01',
        issuingAuthority: 'Border Freight Commission',
        photoSeed: driverSeed,
        photoMatchesDriver: true,
        isAuthentic: !hasExpiredDoc,
      },
      {
        id: 'cargo_declaration',
        type: 'cargo_declaration',
        title: 'Cargo Manifest & Declaration',
        holderName: driverName,
        dob: `${2026 - driverAge}-04-12`,
        nationality: driverNationality,
        documentNumber: `CD-${6000 + Math.floor(Math.random() * 3999)}`,
        issueDate: '2026-11-25',
        expiryDate: '2026-12-05',
        issuingAuthority: 'Customs Dispatch Desk',
        photoSeed: driverSeed,
        photoMatchesDriver: true,
        declaredCargo,
        declaredWeightKg: Math.max(400, actualWeightKg - spec.baseWeightKg),
        isAuthentic: true,
      }
    );
  } else {
    documents.push({
      id: 'travel_permit',
      type: 'travel_permit',
      title: 'Cross-Border Travel Permit',
      holderName: driverName,
      dob: `${2026 - driverAge}-04-12`,
      nationality: driverNationality,
      documentNumber: `TR-${1000 + Math.floor(Math.random() * 8999)}`,
      issueDate: '2026-11-20',
      expiryDate: '2026-12-20',
      issuingAuthority: 'Frontier Visa Office',
      photoSeed: driverSeed,
      photoMatchesDriver: true,
      isAuthentic: true,
    });
  }

  // Physical Lens Inspection Hotspots
  const hasPhysicalIssue = hasAnyIssue && Math.random() < 0.55;
  const badItem = pick(UNDECLARED_ITEMS);
  const badZone = pick(['cargo', 'interior', 'wheels'] as const);

  const halfW = spec.width * 0.5;
  const halfL = spec.length * 0.5;

  const hotspots: InspectionHotspot[] = [
    {
      id: 'hs_front',
      area: 'exterior',
      partLabel: 'Front Bumper & Plate',
      localOffset: [0, 0.7, -halfL - 0.15],
      findingText: `Front registration plate ${registration} clearly mounted. Headlights intact.`,
      isIssue: false,
      issueSeverity: 'none',
      inspected: false,
    },
    {
      id: 'hs_wheels',
      area: 'exterior',
      partLabel: 'Wheels, Tyres & Undercarriage',
      localOffset: [-halfW - 0.1, 0.45, 0.5],
      findingText:
        hasPhysicalIssue && badZone === 'wheels'
          ? 'Severely worn tyre tread & suspicious bolted underbody box.'
          : 'Tyre pressure, tread depth, and chassis undercarriage normal.',
      isIssue: hasPhysicalIssue && badZone === 'wheels',
      issueSeverity: hasPhysicalIssue && badZone === 'wheels' ? 'major' : 'none',
      inspected: false,
    },
    {
      id: 'hs_interior',
      area: 'interior',
      partLabel: 'Cabin Dashboard & Storage',
      localOffset: [-halfW - 0.1, 1.3, -halfL * 0.25],
      findingText:
        hasPhysicalIssue && badZone === 'interior'
          ? `Found concealed package under seat: ${badItem.item}`
          : 'Cabin seats, dashboard, and door pockets clear of undeclared items.',
      isIssue: hasPhysicalIssue && badZone === 'interior',
      issueSeverity: hasPhysicalIssue && badZone === 'interior' ? (badItem.police ? 'police' : 'major') : 'none',
      inspected: false,
    },
    {
      id: 'hs_cargo',
      area: 'cargo',
      partLabel: spec.isCommercial ? 'Cargo Compartment / Container' : 'Rear Boot & Storage',
      localOffset: [0, 1.15, halfL + 0.15],
      findingText:
        hasPhysicalIssue && badZone === 'cargo'
          ? `Discrepancy in cargo bay: ${badItem.item} not on declaration!`
          : spec.isCommercial
          ? `Cargo matches manifest (${declaredCargo}). Seals intact.`
          : 'Rear luggage boot contains normal personal bags only.',
      isIssue: hasPhysicalIssue && badZone === 'cargo',
      issueSeverity: hasPhysicalIssue && badZone === 'cargo' ? (badItem.police ? 'police' : 'major') : 'none',
      inspected: false,
    },
  ];

  const issuesSummary: string[] = [];
  if (isOverweight) issuesSummary.push(`Overweight by +${weightDifferenceKg.toLocaleString()} kg`);
  if (hasExpiredDoc) issuesSummary.push('Expired driving licence / permit');
  if (hasPlateMismatch) issuesSummary.push(`Registration plate mismatch (Paper: ${regOnPaper} vs Actual: ${registration})`);
  if (hasPhotoMismatch) issuesSummary.push('ID card photograph does not match driver');
  if (hasMissingDetails) issuesSummary.push('Missing holder details / unstamped ID');
  const physicalBad = hotspots.find((h) => h.isIssue);
  if (physicalBad) issuesSummary.push(physicalBad.findingText);

  const requiresPolice =
    (physicalBad?.issueSeverity === 'police') ||
    hasPhotoMismatch ||
    (isOverweight && !documentsValidActual);

  return {
    caseId: `CASE-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    vehicleType: spec.type,
    vehicleLabel: spec.label,
    isCommercial: spec.isCommercial,
    colorName: color.name,
    colorHex: color.hex,
    registration,
    driverName,
    driverAge,
    driverNationality,
    driverSeed,
    personality,
    actualWeightKg,
    permittedWeightKg: spec.permittedWeightKg,
    weightDifferenceKg,
    isOverweight,
    documents,
    documentsValidActual,
    hotspots,
    physicalValidActual: !physicalBad,
    requiresPolice,
    policeReason: requiresPolice
      ? physicalBad?.issueSeverity === 'police'
        ? 'Suspected undeclared contraband / tampered seal requiring Police verification.'
        : 'Serious identity / multi-violation discrepancy requiring Police intervention.'
      : undefined,
    issuesSummary,
    weighbridgeVerdict: 'pending',
    documentsVerdict: 'pending',
    physicalVerdict: 'pending',
    recordedFindings: [],
    finalDecision: 'pending',
  };
}
