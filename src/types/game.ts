export type GraphicsPreset = 'very_low' | 'low' | 'medium' | 'high' | 'ultra';

export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'fog';

export type DifficultyLevel = 'cadet' | 'standard' | 'veteran';

export type VehicleType =
  | 'small_car'
  | 'sedan'
  | 'hatchback'
  | 'suv'
  | 'jeep'
  | 'pickup'
  | 'family_car'
  | 'luxury_car'
  | 'delivery_van'
  | 'cargo_van'
  | 'passenger_van'
  | 'mini_truck'
  | 'heavy_cargo_truck'
  | 'container_truck'
  | 'refrigerated_truck'
  | 'flatbed_truck'
  | 'construction_truck'
  | 'cement_truck'
  | 'fuel_truck'
  | 'livestock_truck'
  | 'bus'
  | 'tourist_bus'
  | 'police_car'
  | 'armored_security'
  | 'green_heavy_truck'
  | 'green_covered_truck'
  | 'police_tow_truck';

export type DriverPersonality =
  | 'friendly'
  | 'nervous'
  | 'quiet'
  | 'polite'
  | 'impatient'
  | 'confused'
  | 'frustrated';

export type CharacterRole =
  | 'border_officer'
  | 'police_officer'
  | 'driver'
  | 'tourist'
  | 'local'
  | 'trucker'
  | 'official'
  | 'medic'
  | 'smuggler'
  | 'story_npc';

export type DriverEmotion =
  | 'neutral'
  | 'happy'
  | 'relieved'
  | 'sad'
  | 'disappointed'
  | 'nervous'
  | 'frustrated'
  | 'angry'
  | 'confused';

export interface GraphicsSettings {
  preset: GraphicsPreset;
  resolutionScale: number; // 0.5 to 1.0
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  lightingQuality: 'low' | 'medium' | 'high';
  reflectionQuality: 'off' | 'low' | 'medium';
  textureQuality: 'low' | 'medium' | 'high';
  antiAliasing: 'off' | 'fxaa';
  renderDistance: number; // 90 to 300
  vegetationQuality: 'low' | 'medium' | 'high';
  particleQuality: 'off' | 'low' | 'medium';
  postProcessing: boolean;
  fov: number;
  fpsLimit: 0 | 30 | 60;
  fullscreen: boolean;
}

export interface AudioSettings {
  master: number;
  sfx: number;
  engine: number;
  ambient: number;
  music: number;
  dialogue: number;
  notifications: number;
}

export interface ControlSettings {
  mouseSensitivity: number;
  invertY: boolean;
  headBob: boolean;
}

export interface AllSettings {
  graphics: GraphicsSettings;
  audio: AudioSettings;
  controls: ControlSettings;
}

export interface DocumentItem {
  id: string;
  type:
    | 'id_card'
    | 'license'
    | 'registration'
    | 'transport_permit'
    | 'cargo_declaration'
    | 'insurance'
    | 'travel_permit';
  title: string;
  holderName: string;
  dob: string;
  nationality: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  photoSeed: number;
  photoMatchesDriver: boolean;
  vehiclePlate?: string;
  vehicleModel?: string;
  declaredCargo?: string;
  declaredWeightKg?: number;
  missingDetails?: boolean;
  isAuthentic: boolean;
}

export interface InspectionHotspot {
  id: string;
  area: 'exterior' | 'interior' | 'cargo';
  partLabel: string;
  localOffset: [number, number, number];
  findingText: string;
  isIssue: boolean;
  issueSeverity: 'none' | 'minor' | 'major' | 'police';
  inspected: boolean;
}

export interface InspectionCase {
  caseId: string;
  vehicleType: VehicleType;
  vehicleLabel: string;
  isCommercial: boolean;
  colorName: string;
  colorHex: number;
  registration: string;
  driverName: string;
  driverAge: number;
  driverNationality: string;
  driverSeed: number;
  personality: DriverPersonality;
  actualWeightKg: number;
  permittedWeightKg: number;
  weightDifferenceKg: number;
  isOverweight: boolean;
  documents: DocumentItem[];
  documentsValidActual: boolean;
  hotspots: InspectionHotspot[];
  physicalValidActual: boolean;
  requiresPolice: boolean;
  policeReason?: string;
  issuesSummary: string[];
  // Player manual verification states
  weighbridgeVerdict: 'pending' | 'pass' | 'fail';
  documentsVerdict: 'pending' | 'valid' | 'invalid';
  physicalVerdict: 'pending' | 'clear' | 'issues_found';
  recordedFindings: string[];
  finalDecision: 'pending' | 'approved' | 'rejected' | 'further_inspection';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HOLDING';
  rejectionReason?: string;
}

export interface InspectionHistoryEntry {
  caseId: string;
  vehicleLabel: string;
  registration: string;
  driverName: string;
  decision: 'approved' | 'rejected' | 'police_handled';
  reason: string;
  timestamp: string;
}

export interface QueueAlertInfo {
  vehicleLabel: string;
  registration: string;
  lane: number;
  queuePosition: number;
  status: string;
  totalWaiting: number;
}

export interface DailyTarget {
  id: string;
  title: string;
  type: 'inspect_any' | 'inspect_trucks' | 'catch_violations' | 'accurate_streak';
  target: number;
  progress: number;
  completed: boolean;
  rewardXp: number;
  rewardCash: number;
}

export interface PlayerCareerStats {
  xp: number;
  cash: number;
  rankIndex: number;
  day: number;
  difficulty: DifficultyLevel;
  timeOfDay: number;
  weather: WeatherType;
  totalInspected: number;
  accurateDecisions: number;
  trucksInspected: number;
  violationsCaught: number;
  policeAssistsCalled: number;
  unlockedTools: {
    zoomLens: boolean;
    uvScanner: boolean;
    rapidWeigh: boolean;
  };
  history: InspectionHistoryEntry[];
}

export interface SaveSlotData {
  slotId: string;
  savedAt: string;
  stats: PlayerCareerStats;
  dailyTargets: DailyTarget[];
}

export type ActiveModalType =
  | null
  | 'main_menu'
  | 'pause'
  | 'computer'
  | 'weighbridge'
  | 'documents'
  | 'report'
  | 'driver_menu'
  | 'bulletin'
  | 'settings'
  | 'career'
  | 'save_load';
