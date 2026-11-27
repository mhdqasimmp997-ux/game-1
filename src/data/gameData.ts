import {
  AllSettings,
  DailyTarget,
  GraphicsPreset,
  GraphicsSettings,
  PlayerCareerStats,
  VehicleType,
} from '../types/game';

export const GRAPHICS_PRESETS: Record<GraphicsPreset, GraphicsSettings> = {
  very_low: {
    preset: 'very_low',
    resolutionScale: 0.65,
    shadowQuality: 'off',
    lightingQuality: 'low',
    reflectionQuality: 'off',
    textureQuality: 'low',
    antiAliasing: 'off',
    renderDistance: 110,
    vegetationQuality: 'low',
    particleQuality: 'off',
    postProcessing: false,
    fov: 72,
    fpsLimit: 30,
    fullscreen: false,
  },
  low: {
    preset: 'low',
    resolutionScale: 0.8,
    shadowQuality: 'low',
    lightingQuality: 'low',
    reflectionQuality: 'off',
    textureQuality: 'low',
    antiAliasing: 'off',
    renderDistance: 150,
    vegetationQuality: 'low',
    particleQuality: 'low',
    postProcessing: false,
    fov: 74,
    fpsLimit: 60,
    fullscreen: false,
  },
  medium: {
    preset: 'medium',
    resolutionScale: 0.9,
    shadowQuality: 'medium',
    lightingQuality: 'medium',
    reflectionQuality: 'low',
    textureQuality: 'medium',
    antiAliasing: 'fxaa',
    renderDistance: 200,
    vegetationQuality: 'medium',
    particleQuality: 'low',
    postProcessing: false,
    fov: 74,
    fpsLimit: 60,
    fullscreen: false,
  },
  high: {
    preset: 'high',
    resolutionScale: 1.0,
    shadowQuality: 'high',
    lightingQuality: 'high',
    reflectionQuality: 'medium',
    textureQuality: 'high',
    antiAliasing: 'fxaa',
    renderDistance: 250,
    vegetationQuality: 'high',
    particleQuality: 'medium',
    postProcessing: true,
    fov: 75,
    fpsLimit: 0,
    fullscreen: false,
  },
  ultra: {
    preset: 'ultra',
    resolutionScale: 1.0,
    shadowQuality: 'high',
    lightingQuality: 'high',
    reflectionQuality: 'medium',
    textureQuality: 'high',
    antiAliasing: 'fxaa',
    renderDistance: 300,
    vegetationQuality: 'high',
    particleQuality: 'medium',
    postProcessing: true,
    fov: 76,
    fpsLimit: 0,
    fullscreen: false,
  },
};

// Default to Low Graphics preset optimized for integrated GPUs (e.g. Intel UHD 610)
export const DEFAULT_SETTINGS: AllSettings = {
  graphics: { ...GRAPHICS_PRESETS.low },
  audio: {
    master: 0.75,
    sfx: 0.85,
    engine: 0.7,
    ambient: 0.55,
    music: 0.3,
    dialogue: 0.85,
    notifications: 0.85,
  },
  controls: {
    mouseSensitivity: 1.0,
    invertY: false,
    headBob: true,
  },
};

export const RANKS = [
  { name: 'Probationary Inspector', xpRequired: 0 },
  { name: 'Checkpoint Officer', xpRequired: 200 },
  { name: 'Senior Border Inspector', xpRequired: 550 },
  { name: 'Customs Supervisor', xpRequired: 1050 },
  { name: 'Chief Gate Commander', xpRequired: 1800 },
];

export const INITIAL_STATS: PlayerCareerStats = {
  xp: 0,
  cash: 250,
  rankIndex: 0,
  day: 1,
  difficulty: 'standard',
  timeOfDay: 8.5,
  weather: 'clear',
  totalInspected: 0,
  accurateDecisions: 0,
  trucksInspected: 0,
  violationsCaught: 0,
  policeAssistsCalled: 0,
  unlockedTools: {
    zoomLens: true,
    uvScanner: true,
    rapidWeigh: false,
  },
};

export const INITIAL_DAILY_TARGETS: DailyTarget[] = [
  {
    id: 'dt_inspect_10',
    title: 'Inspect 10 Vehicles',
    type: 'inspect_any',
    target: 10,
    progress: 0,
    completed: false,
    rewardXp: 180,
    rewardCash: 220,
  },
  {
    id: 'dt_trucks_5',
    title: 'Verify 5 Cargo Trucks',
    type: 'inspect_trucks',
    target: 5,
    progress: 0,
    completed: false,
    rewardXp: 150,
    rewardCash: 180,
  },
  {
    id: 'dt_violations_3',
    title: 'Identify 3 Document or Weight Violations',
    type: 'catch_violations',
    target: 3,
    progress: 0,
    completed: false,
    rewardXp: 160,
    rewardCash: 200,
  },
];

export interface VehicleCatalogEntry {
  type: VehicleType;
  label: string;
  isCommercial: boolean;
  isTruck: boolean;
  permittedWeightKg: number;
  baseWeightKg: number;
  length: number;
  width: number;
}

export const VEHICLE_CATALOG: VehicleCatalogEntry[] = [
  { type: 'small_car', label: 'Compact City Car', isCommercial: false, isTruck: false, permittedWeightKg: 1600, baseWeightKg: 1180, length: 3.8, width: 1.78 },
  { type: 'hatchback', label: '5-Door Hatchback', isCommercial: false, isTruck: false, permittedWeightKg: 1800, baseWeightKg: 1320, length: 4.1, width: 1.82 },
  { type: 'sedan', label: 'Aurelia Touring Sedan', isCommercial: false, isTruck: false, permittedWeightKg: 2100, baseWeightKg: 1540, length: 4.5, width: 1.88 },
  { type: 'family_car', label: 'Estate Family Wagon', isCommercial: false, isTruck: false, permittedWeightKg: 2300, baseWeightKg: 1720, length: 4.65, width: 1.9 },
  { type: 'luxury_car', label: 'Executive Saloon', isCommercial: false, isTruck: false, permittedWeightKg: 2450, baseWeightKg: 1890, length: 4.9, width: 1.94 },
  { type: 'suv', label: 'Kodiak 4x4 SUV', isCommercial: false, isTruck: false, permittedWeightKg: 2800, baseWeightKg: 2180, length: 4.7, width: 2.0 },
  { type: 'jeep', label: 'Trailblazer Off-Road Jeep', isCommercial: false, isTruck: false, permittedWeightKg: 2600, baseWeightKg: 2040, length: 4.35, width: 1.96 },
  { type: 'pickup', label: 'Bison Utility Pickup', isCommercial: false, isTruck: false, permittedWeightKg: 3200, baseWeightKg: 2420, length: 5.0, width: 2.02 },
  { type: 'delivery_van', label: 'Parcel Delivery Van', isCommercial: true, isTruck: false, permittedWeightKg: 3500, baseWeightKg: 2850, length: 5.2, width: 2.05 },
  { type: 'cargo_van', label: 'High-Roof Cargo Van', isCommercial: true, isTruck: false, permittedWeightKg: 4200, baseWeightKg: 3450, length: 5.6, width: 2.1 },
  { type: 'passenger_van', label: 'Shuttle Passenger Van', isCommercial: true, isTruck: false, permittedWeightKg: 3800, baseWeightKg: 3100, length: 5.4, width: 2.06 },
  { type: 'mini_truck', label: 'Light Box Mini Truck', isCommercial: true, isTruck: true, permittedWeightKg: 5500, baseWeightKg: 4650, length: 5.8, width: 2.15 },
  { type: 'heavy_cargo_truck', label: 'Heavy Cargo Truck', isCommercial: true, isTruck: true, permittedWeightKg: 16000, baseWeightKg: 13900, length: 7.4, width: 2.38 },
  { type: 'container_truck', label: 'ISO Container Hauler', isCommercial: true, isTruck: true, permittedWeightKg: 24000, baseWeightKg: 21200, length: 8.6, width: 2.45 },
  { type: 'refrigerated_truck', label: 'Cold-Chain Reefer Truck', isCommercial: true, isTruck: true, permittedWeightKg: 18000, baseWeightKg: 15800, length: 7.8, width: 2.4 },
  { type: 'flatbed_truck', label: 'Flatbed Timber Carrier', isCommercial: true, isTruck: true, permittedWeightKg: 19000, baseWeightKg: 16400, length: 7.9, width: 2.4 },
  { type: 'construction_truck', label: 'Construction Tipper Truck', isCommercial: true, isTruck: true, permittedWeightKg: 20000, baseWeightKg: 17500, length: 7.4, width: 2.42 },
  { type: 'cement_truck', label: 'Concrete Mixer Truck', isCommercial: true, isTruck: true, permittedWeightKg: 22000, baseWeightKg: 19600, length: 7.6, width: 2.42 },
  { type: 'fuel_truck', label: 'Fuel Tanker Carrier', isCommercial: true, isTruck: true, permittedWeightKg: 21000, baseWeightKg: 18400, length: 8.0, width: 2.42 },
  { type: 'livestock_truck', label: 'Livestock Transport Truck', isCommercial: true, isTruck: true, permittedWeightKg: 15000, baseWeightKg: 13200, length: 7.5, width: 2.38 },
  { type: 'bus', label: 'Public Transit Bus', isCommercial: true, isTruck: false, permittedWeightKg: 14500, baseWeightKg: 12900, length: 8.4, width: 2.42 },
  { type: 'tourist_bus', label: 'Interstate Tourist Coach', isCommercial: true, isTruck: false, permittedWeightKg: 16500, baseWeightKg: 14200, length: 8.8, width: 2.45 },
];
