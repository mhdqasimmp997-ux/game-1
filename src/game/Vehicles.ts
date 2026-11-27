import * as THREE from 'three';
import { ProceduralMaterialSet } from '../engine/Textures';
import { InspectionHotspot, VehicleType } from '../types/game';
import { VEHICLE_CATALOG, SPECIAL_VEHICLE_SPECS } from '../data/gameData';

export interface VehicleRig {
  root: THREE.Group;
  bodyTiltGroup: THREE.Group;
  shadowMeshes: THREE.Mesh[];
  wheels: THREE.Mesh[];
  frontSteerPivots: THREE.Group[];
  driverDoorPivot: THREE.Group;
  driverDoorHitbox: THREE.Mesh;
  trunkPivot: THREE.Group;
  trunkHitbox: THREE.Mesh;
  headlights: THREE.Mesh[];
  brakeLights: THREE.Mesh[];
  leftIndicators: THREE.Mesh[];
  rightIndicators: THREE.Mesh[];
  sirenRed?: THREE.Mesh;
  sirenBlue?: THREE.Mesh;
  cementDrum?: THREE.Mesh;
  towBoomPivot?: THREE.Group;
  towCradlePivot?: THREE.Group;
  winchCable?: THREE.Mesh;
  hotspotMarkers: THREE.Mesh[];
  plateCanvas: HTMLCanvasElement;
  plateTexture: THREE.CanvasTexture;
  plateMat: THREE.MeshStandardMaterial;
  vehicleType: VehicleType;
  halfWidth: number;
  halfLength: number;
  doorOpen: boolean;
  trunkOpen: boolean;
  headlightsOn: boolean;
  sirenOn: boolean;
  indicatorState: -1 | 0 | 1;
  towDeployed?: boolean;
  isTowed?: boolean;
  _lastHeadlightsOn?: boolean;
  _lastBrakeState?: number;
  _lastLeftBlink?: boolean;
  _lastRightBlink?: boolean;
  _lastSirenPhase?: number;
}

// Shared PBR materials across all vehicles (minimizes WebGL shader switches)
const TRIM_MAT = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.72, metalness: 0.15 });
const INTERIOR_MAT = new THREE.MeshStandardMaterial({ color: 0x2c2927, roughness: 0.85, metalness: 0.05 });
const PARCEL_MAT = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.82, metalness: 0.04 });
const SUSPICIOUS_MAT = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.52, metalness: 0.28 });
const BAND_MAT = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 0.65, roughness: 0.4 });
const POLICE_STRIPE_MAT = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.12 });
const REEFER_MAT = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.32, metalness: 0.25, envMapIntensity: 0.9 });
const CONSTRUCTION_MAT = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.58, metalness: 0.32 });
const CONTAINER_MAT = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.48, metalness: 0.42 });
const CEMENT_MAT = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.42, metalness: 0.38 });
const HOUSING_DARK_MAT = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.5, metalness: 0.35 });
const HAZARD_ORANGE_MAT = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4, metalness: 0.2 });
const ARMOR_STEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x464b52, roughness: 0.44, metalness: 0.42 });
const ARMOR_TRIM_MAT = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.52, metalness: 0.48 });
const GREEN_HEAVY_MAT = new THREE.MeshStandardMaterial({ color: 0x4c5f43, roughness: 0.58, metalness: 0.24 });
const GREEN_SAGE_MAT = new THREE.MeshStandardMaterial({ color: 0x5c6d4e, roughness: 0.5, metalness: 0.22 });
const TOW_YELLOW_MAT = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.38, metalness: 0.35 });
const INVISIBLE_MAT = new THREE.MeshBasicMaterial({ visible: false });

const HL_MAT_OFF = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 0.25, roughness: 0.15 });
const HL_MAT_ON = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 2.8, roughness: 0.1 });
const BL_MAT_OFF = new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0xef4444, emissiveIntensity: 0.14, roughness: 0.2 });
const BL_MAT_DIM = new THREE.MeshStandardMaterial({ color: 0xb91c1c, emissive: 0xef4444, emissiveIntensity: 0.85, roughness: 0.2 });
const BL_MAT_ON = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xef4444, emissiveIntensity: 2.9, roughness: 0.15 });
const IND_MAT_OFF = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xf59e0b, emissiveIntensity: 0.05, roughness: 0.25 });
const IND_MAT_ON = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 2.7, roughness: 0.15 });
const SIREN_RED_OFF = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.2 });
const SIREN_RED_ON = new THREE.MeshStandardMaterial({ color: 0xff5555, emissive: 0xef4444, emissiveIntensity: 3.8 });
const SIREN_BLUE_OFF = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.2 });
const SIREN_BLUE_ON = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x3b82f6, emissiveIntensity: 3.8 });

export const HS_MAT_UNSCANNED = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0ea5e9,
  emissiveIntensity: 1.8,
  transparent: true,
  opacity: 0.88,
});
export const HS_MAT_CLEAR = new THREE.MeshStandardMaterial({
  color: 0x22c55e,
  emissive: 0x16a34a,
  emissiveIntensity: 1.8,
  transparent: true,
  opacity: 0.88,
});
export const HS_MAT_ISSUE = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  emissive: 0xdc2626,
  emissiveIntensity: 1.8,
  transparent: true,
  opacity: 0.88,
});

let cachedArmoredPanelMat: THREE.MeshStandardMaterial | null = null;
function getArmoredPanelMat(): THREE.MeshStandardMaterial {
  if (cachedArmoredPanelMat) return cachedArmoredPanelMat;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#464b52';
  ctx.fillRect(0, 0, 512, 256);
  // Subtle welded armor plate seams & rivets
  ctx.strokeStyle = '#2d3138';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 240);
  ctx.beginPath();
  ctx.moveTo(170, 8);
  ctx.lineTo(170, 248);
  ctx.stroke();
  ctx.fillStyle = '#6b7280';
  for (let x = 22; x < 495; x += 28) {
    ctx.fillRect(x, 16, 4, 4);
    ctx.fillRect(x, 236, 4, 4);
  }
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ARMORED', 330, 118);
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('SECURITY', 330, 166);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('CASH TRANSPORT · SECURED', 330, 205);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedArmoredPanelMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.44, metalness: 0.38 });
  return cachedArmoredPanelMat;
}

let cachedGreenBoxMat: THREE.MeshStandardMaterial | null = null;
function getGreenBoxMat(): THREE.MeshStandardMaterial {
  if (cachedGreenBoxMat) return cachedGreenBoxMat;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#4c5f43';
  ctx.fillRect(0, 0, 512, 256);
  // Subtle camo/utility weathering + vertical steel panel ribs & rivets
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(30,42,26,0.12)' : 'rgba(110,130,96,0.09)';
    ctx.fillRect((i * 73) % 480, (i * 41) % 220, 48, 36);
  }
  ctx.strokeStyle = '#2f3c29';
  ctx.lineWidth = 4;
  for (let x = 0; x <= 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  ctx.strokeRect(4, 194, 504, 18);
  ctx.fillStyle = '#33422d';
  for (let x = 16; x < 500; x += 32) {
    ctx.fillRect(x, 12, 4, 4);
    ctx.fillRect(x, 184, 4, 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedGreenBoxMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.22 });
  return cachedGreenBoxMat;
}

let cachedCanvasTarpMat: THREE.MeshStandardMaterial | null = null;
function getCanvasTarpMat(): THREE.MeshStandardMaterial {
  if (cachedCanvasTarpMat) return cachedCanvasTarpMat;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#5a6849';
  ctx.fillRect(0, 0, 512, 256);
  // Woven canvas grain & natural vertical taut tarp folds
  for (let x = 0; x < 512; x += 48) {
    const grad = ctx.createLinearGradient(x, 0, x + 48, 0);
    grad.addColorStop(0, 'rgba(28,34,22,0.16)');
    grad.addColorStop(0.45, 'rgba(130,145,108,0.11)');
    grad.addColorStop(1, 'rgba(28,34,22,0.14)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 48, 256);
  }
  // Horizontal weave & grommet strap strip near bottom
  ctx.strokeStyle = 'rgba(24,28,20,0.22)';
  ctx.lineWidth = 2;
  for (let y = 8; y < 220; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  // Bottom zig-zag lashing rope over drop-side hooks
  ctx.fillStyle = '#475339';
  ctx.fillRect(0, 212, 512, 44);
  ctx.strokeStyle = '#2f3726';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= 512; x += 28) {
    if (x === 0) ctx.moveTo(x, 216);
    else ctx.lineTo(x - 14, 248);
    ctx.lineTo(x, 216);
  }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedCanvasTarpMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.03 });
  return cachedCanvasTarpMat;
}

let cachedTowDoorMat: THREE.MeshStandardMaterial | null = null;
function getTowDoorMat(): THREE.MeshStandardMaterial {
  if (cachedTowDoorMat) return cachedTowDoorMat;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#16243b';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 88, 256, 16);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POLICE RECOVERY', 128, 42);
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('TOW UNIT T-04', 128, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedTowDoorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.36, metalness: 0.32 });
  return cachedTowDoorMat;
}

const paintMatCache = new Map<number, THREE.MeshPhysicalMaterial>();
function getPaintMaterial(hex: number): THREE.MeshPhysicalMaterial {
  let m = paintMatCache.get(hex);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({
      color: hex,
      roughness: 0.28,
      metalness: 0.48,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.3,
    });
    paintMatCache.set(hex, m);
  }
  return m;
}

const wheelGeoCache = new Map<
  number,
  { tire: THREE.CylinderGeometry; sidewall: THREE.CylinderGeometry; rim: THREE.CylinderGeometry; hub: THREE.CylinderGeometry }
>();
function getWheelGeos(radius: number) {
  let g = wheelGeoCache.get(radius);
  if (!g) {
    const tire = new THREE.CylinderGeometry(radius, radius, 0.27, 16);
    tire.rotateZ(Math.PI / 2);
    const sidewall = new THREE.CylinderGeometry(radius * 0.78, radius * 0.78, 0.276, 14);
    sidewall.rotateZ(Math.PI / 2);
    const rim = new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, 0.284, 10);
    rim.rotateZ(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, 0.296, 8);
    hub.rotateZ(Math.PI / 2);
    g = { tire, sidewall, rim, hub };
    wheelGeoCache.set(radius, g);
  }
  return g;
}

const SHARED_GEO = {
  plate: new THREE.PlaneGeometry(0.56, 0.14),
  hlHousing: new THREE.BoxGeometry(0.32, 0.17, 0.05),
  hl: new THREE.BoxGeometry(0.26, 0.12, 0.06),
  ind: new THREE.BoxGeometry(0.11, 0.11, 0.07),
  mirror: new THREE.BoxGeometry(0.18, 0.14, 0.09),
  mirrorArm: new THREE.BoxGeometry(0.12, 0.04, 0.05),
  seat: new THREE.BoxGeometry(0.48, 0.62, 0.46),
  headrest: new THREE.BoxGeometry(0.24, 0.18, 0.12),
  steerWheel: (() => {
    const g = new THREE.TorusGeometry(0.16, 0.025, 6, 14);
    return g;
  })(),
  doorHandle: new THREE.BoxGeometry(0.055, 0.045, 0.16),
  doorHitbox: new THREE.BoxGeometry(0.45, 1.35, 1.15),
  trunkHandle: new THREE.BoxGeometry(0.24, 0.05, 0.06),
  hotspot: new THREE.SphereGeometry(0.24, 12, 10),
  exhaust: (() => {
    const g = new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8);
    g.rotateX(Math.PI / 2);
    return g;
  })(),
  antenna: new THREE.CylinderGeometry(0.008, 0.014, 0.45, 5),
  stackPipe: new THREE.CylinderGeometry(0.055, 0.065, 1.75, 8),
  jeepSpare: (() => {
    const g = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 14);
    g.rotateX(Math.PI / 2);
    return g;
  })(),
  contactShadowPlane: (() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  })(),
};

function makePlateTexture(plateText: string): { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, 0, 30, 64);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(15, 22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 60);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(plateText, 143, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, tex };
}

export function createVehicleMesh(
  type: VehicleType,
  paintHex: number,
  mats: ProceduralMaterialSet,
  plateText: string,
  hotspots: InspectionHotspot[] = [],
  caseId = ''
): VehicleRig {
  const root = new THREE.Group();
  const bodyTiltGroup = new THREE.Group();
  root.add(bodyTiltGroup);
  const shadowMeshes: THREE.Mesh[] = [];

  const isPolice = type === 'police_car' || type === 'armored_security' || type === 'police_tow_truck';
  const catalogSpec = VEHICLE_CATALOG.find((v) => v.type === type);
  const specialSpec =
    type === 'police_car' || type === 'armored_security' || type === 'police_tow_truck'
      ? SPECIAL_VEHICLE_SPECS[type]
      : undefined;
  const width = catalogSpec?.width ?? specialSpec?.width ?? 1.95;
  const length = catalogSpec?.length ?? specialSpec?.length ?? 4.5;

  const actualColor =
    type === 'armored_security'
      ? 0x464b52
      : type === 'green_heavy_truck'
      ? 0x4c5f43
      : type === 'green_covered_truck'
      ? 0x5c6d4e
      : isPolice
      ? 0x16243b
      : paintHex;
  const paintMat =
    type === 'armored_security'
      ? ARMOR_STEEL_MAT
      : type === 'green_heavy_truck'
      ? GREEN_HEAVY_MAT
      : type === 'green_covered_truck'
      ? GREEN_SAGE_MAT
      : getPaintMaterial(actualColor);

  const isCustomRef =
    type === 'armored_security' ||
    type === 'green_heavy_truck' ||
    type === 'green_covered_truck' ||
    type === 'police_tow_truck';

  const isTruck =
    type === 'mini_truck' ||
    type === 'heavy_cargo_truck' ||
    type === 'container_truck' ||
    type === 'refrigerated_truck' ||
    type === 'flatbed_truck' ||
    type === 'construction_truck' ||
    type === 'cement_truck' ||
    type === 'fuel_truck' ||
    type === 'livestock_truck' ||
    isCustomRef;
  const isBus = type === 'bus' || type === 'tourist_bus';
  const isVan = type === 'delivery_van' || type === 'cargo_van' || type === 'passenger_van';

  const wheelRadius =
    type === 'green_heavy_truck' || type === 'green_covered_truck' || type === 'armored_security'
      ? 0.54
      : isTruck || isBus
      ? 0.48
      : type === 'suv' || type === 'jeep' || type === 'pickup'
      ? 0.41
      : 0.34;
  const chassisH = isCustomRef ? 0.58 : isTruck || isBus ? 0.78 : 0.56;
  const groundClearance = isCustomRef ? wheelRadius * 0.85 : wheelRadius * 0.72;
  const cabinBaseY = groundClearance + chassisH;

  // Soft Ground Contact Shadow (keeps vehicle visually planted on asphalt)
  const contactShadow = new THREE.Mesh(SHARED_GEO.contactShadowPlane, mats.contactShadow);
  contactShadow.position.y = 0.025;
  contactShadow.scale.set(width * 1.28, 1, length * 1.12);
  root.add(contactShadow);

  // Lower Chassis + Side Rocker Skirts
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(isCustomRef ? width * 0.88 : width, chassisH, length * (isCustomRef ? 0.96 : 1)),
    isCustomRef ? TRIM_MAT : paintMat
  );
  chassis.position.y = groundClearance + chassisH * 0.5;
  chassis.receiveShadow = true;
  shadowMeshes.push(chassis);
  bodyTiltGroup.add(chassis);

  if (!isCustomRef) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.14, length * 0.96), TRIM_MAT);
    skirt.position.set(0, groundClearance + 0.07, 0);
    bodyTiltGroup.add(skirt);

    // Front Grille & Chrome Trim Bar
    const grilleH = isTruck || isBus ? 0.42 : 0.24;
    const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.52, grilleH, 0.07), HOUSING_DARK_MAT);
    grille.position.set(0, groundClearance + chassisH * 0.55, -length * 0.5 - 0.025);
    const grilleChrome = new THREE.Mesh(new THREE.BoxGeometry(width * 0.54, 0.045, 0.085), mats.chrome);
    grilleChrome.position.set(0, groundClearance + chassisH * 0.64, -length * 0.5 - 0.025);
    bodyTiltGroup.add(grille, grilleChrome);
  }

  if (type === 'police_car') {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.03, chassisH * 0.68, 1.88),
      POLICE_STRIPE_MAT
    );
    stripe.position.set(0, groundClearance + chassisH * 0.5, 0);
    const badgeStrip = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.07, length * 0.92), HAZARD_ORANGE_MAT);
    badgeStrip.position.set(0, groundClearance + chassisH * 0.85, 0);
    bodyTiltGroup.add(stripe, badgeStrip);
  }

  let cementDrum: THREE.Mesh | undefined;
  let towBoomPivot: THREE.Group | undefined;
  let towCradlePivot: THREE.Group | undefined;
  let winchCable: THREE.Mesh | undefined;
  let cabinOffsetZ = 0.1;
  let cabinLength = 2.1;
  let cabinH = 0.68;

  if (type === 'armored_security') {
    // ── VEHICLE 1: ARMORED POLICE / SECURITY TRUCK (Reference 1) ──────────
    const hoodLen = 1.68;
    const hoodZ = -length * 0.5 + hoodLen * 0.5 + 0.12;
    cabinLength = 1.65;
    cabinH = 1.56;
    cabinOffsetZ = hoodZ + hoodLen * 0.5 + cabinLength * 0.5 - 0.05;

    // Sloped Armored Hood + Side Louvers + Tall Rectangular Louvered Grille
    const hoodBase = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.82, hoodLen), ARMOR_STEEL_MAT);
    hoodBase.position.set(0, cabinBaseY + 0.34, hoodZ);
    hoodBase.rotation.x = 0.08;
    shadowMeshes.push(hoodBase);

    const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(width * 0.52, 0.78, 0.1), ARMOR_TRIM_MAT);
    grilleFrame.position.set(0, cabinBaseY + 0.3, -length * 0.5 + 0.08);
    bodyTiltGroup.add(hoodBase, grilleFrame);

    for (let s = 0; s < 5; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.44, 0.045, 0.12), HOUSING_DARK_MAT);
      slat.position.set(0, cabinBaseY + 0.06 + s * 0.12, -length * 0.5 + 0.09);
      bodyTiltGroup.add(slat);
    }

    // Flared Trapezoidal Front Fenders + Wire-Guarded Headlight Pods
    [-1, 1].forEach((side) => {
      const fender = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 1.35), ARMOR_STEEL_MAT);
      fender.position.set(side * (width * 0.43), cabinBaseY + 0.04, hoodZ - 0.1);
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.18), HOUSING_DARK_MAT);
      pod.position.set(side * (width * 0.42), cabinBaseY + 0.04, -length * 0.5 + 0.18);
      // Wire brush guard bars over headlamps
      const guardTop = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.025, 0.22), ARMOR_TRIM_MAT);
      guardTop.position.set(side * (width * 0.42), cabinBaseY + 0.14, -length * 0.5 + 0.15);
      const guardBot = guardTop.clone();
      guardBot.position.y = cabinBaseY - 0.05;
      bodyTiltGroup.add(fender, pod, guardTop, guardBot);

      // Tow shackles on heavy armored front bumper
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 6, 12), ARMOR_TRIM_MAT);
      shackle.position.set(side * 0.52, groundClearance + 0.14, -length * 0.5 - 0.12);
      bodyTiltGroup.add(shackle);

      // Side engine louvers ahead of cab doors
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.32), ARMOR_TRIM_MAT);
      vent.position.set(side * (width * 0.48), cabinBaseY + 0.48, cabinOffsetZ - cabinLength * 0.45);
      bodyTiltGroup.add(vent);

      // Underbody fuel/battery storage boxes between axles
      const tankBox = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 1.15), ARMOR_TRIM_MAT);
      tankBox.position.set(side * (width * 0.4), groundClearance + 0.2, 0.15);
      bodyTiltGroup.add(tankBox);
    });

    // Armored Cab + Rear Cash-Transport Vault Body
    const vaultLen = length - hoodLen - 0.36;
    const vaultZ = hoodZ + hoodLen * 0.5 + vaultLen * 0.5 - 0.05;
    const armoredBody = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, cabinH, vaultLen), ARMOR_STEEL_MAT);
    armoredBody.position.set(0, cabinBaseY + cabinH * 0.5, vaultZ);
    armoredBody.receiveShadow = true;
    shadowMeshes.push(armoredBody);
    bodyTiltGroup.add(armoredBody);

    // Side "ARMORED SECURITY" Decal Plates on Rear Vault Sides
    const decalMat = getArmoredPanelMat();
    const decalGeo = new THREE.PlaneGeometry(vaultLen * 0.58, cabinH * 0.72);
    [-1, 1].forEach((side) => {
      const decal = new THREE.Mesh(decalGeo, decalMat);
      decal.position.set(side * (width * 0.482), cabinBaseY + cabinH * 0.5, vaultZ + vaultLen * 0.18);
      decal.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      bodyTiltGroup.add(decal);

      // Recessed Armored Crew & Front Cab Windows + Louver Vents
      const cabWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.72), mats.glass);
      cabWin.position.set(side * (width * 0.485), cabinBaseY + cabinH * 0.68, cabinOffsetZ - 0.12);
      const crewWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.42), mats.glass);
      crewWin.position.set(side * (width * 0.485), cabinBaseY + cabinH * 0.68, cabinOffsetZ + 0.95);
      bodyTiltGroup.add(cabWin, crewWin);

      // Upper rear louver vents
      [0.45, 1.45].forEach((vz) => {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.34), ARMOR_TRIM_MAT);
        louver.position.set(side * (width * 0.485), cabinBaseY + cabinH * 0.82, vaultZ + vz);
        bodyTiltGroup.add(louver);
      });
    });

    // Split V-Windshield with Center Pillar + Protruding Roof Visor & Clearance Lights
    const wsL = new THREE.Mesh(new THREE.BoxGeometry(width * 0.41, 0.62, 0.08), mats.glass);
    wsL.position.set(-width * 0.22, cabinBaseY + cabinH * 0.68, cabinOffsetZ - cabinLength * 0.5 - 0.02);
    wsL.rotation.set(0.18, -0.1, 0);
    const wsR = new THREE.Mesh(new THREE.BoxGeometry(width * 0.41, 0.62, 0.08), mats.glass);
    wsR.position.set(width * 0.22, cabinBaseY + cabinH * 0.68, cabinOffsetZ - cabinLength * 0.5 - 0.02);
    wsR.rotation.set(0.18, 0.1, 0);
    const centerPillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.66, 0.12), ARMOR_TRIM_MAT);
    centerPillar.position.set(0, cabinBaseY + cabinH * 0.68, cabinOffsetZ - cabinLength * 0.5 - 0.03);
    centerPillar.rotation.x = 0.18;

    const visor = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.14, 0.44), ARMOR_TRIM_MAT);
    visor.position.set(0, cabinBaseY + cabinH - 0.02, cabinOffsetZ - cabinLength * 0.5 - 0.12);
    visor.rotation.x = 0.14;
    const roofPod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.22), HOUSING_DARK_MAT);
    roofPod.position.set(0, cabinBaseY + cabinH + 0.12, cabinOffsetZ - cabinLength * 0.42);
    bodyTiltGroup.add(wsL, wsR, centerPillar, visor, roofPod);

    // 3 Clearance LEDs + 3 Whip Antennas
    [-0.36, 0, 0.36].forEach((cx) => {
      const clr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.06), IND_MAT_ON);
      clr.position.set(cx, cabinBaseY + cabinH + 0.01, cabinOffsetZ - cabinLength * 0.5 - 0.32);
      bodyTiltGroup.add(clr);
    });
    [-0.5, 0.1, 0.65].forEach((ax, idx) => {
      const ant = new THREE.Mesh(SHARED_GEO.antenna, TRIM_MAT);
      ant.position.set(idx === 1 ? -0.5 : 0.5, cabinBaseY + cabinH + 0.22, vaultZ + ax);
      bodyTiltGroup.add(ant);
    });
  } else if (type === 'green_heavy_truck') {
    // ── VEHICLE 2: GREEN HEAVY BOX CARGO TRUCK (Reference 2) ───────────────
    const hoodLen = 1.48;
    const hoodZ = -length * 0.5 + hoodLen * 0.5 + 0.15;
    cabinLength = 1.65;
    cabinH = 1.54;
    cabinOffsetZ = hoodZ + hoodLen * 0.5 + cabinLength * 0.5 - 0.05;

    // Sloped Angular Military Hood & Radiator Nose
    const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.74, 0.78, hoodLen), GREEN_HEAVY_MAT);
    hood.position.set(0, cabinBaseY + 0.34, hoodZ);
    hood.rotation.x = 0.12;
    shadowMeshes.push(hood);
    const frontNose = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.68, 0.12), HOUSING_DARK_MAT);
    frontNose.position.set(0, cabinBaseY + 0.26, -length * 0.5 + 0.14);
    bodyTiltGroup.add(hood, frontNose);

    // Armored-style Driver Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, cabinH, cabinLength), GREEN_HEAVY_MAT);
    cab.position.set(0, cabinBaseY + cabinH * 0.5, cabinOffsetZ);
    cab.receiveShadow = true;
    shadowMeshes.push(cab);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.6, 0.08), mats.glass);
    ws.position.set(0, cabinBaseY + cabinH * 0.68, cabinOffsetZ - cabinLength * 0.5 - 0.01);
    ws.rotation.x = 0.1;
    bodyTiltGroup.add(cab, ws);

    // Cab Side Windows, Step Rungs, Underbody Fuel Tank & Roof Antennas
    [-1, 1].forEach((side) => {
      const cWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.78), mats.glass);
      cWin.position.set(side * (width * 0.455), cabinBaseY + cabinH * 0.68, cabinOffsetZ - 0.06);
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.55), TRIM_MAT);
      step.position.set(side * (width * 0.46), groundClearance + 0.06, cabinOffsetZ);
      const fuel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.95), GREEN_HEAVY_MAT);
      fuel.position.set(side * (width * 0.42), groundClearance + 0.22, cabinOffsetZ + cabinLength * 0.68);
      bodyTiltGroup.add(cWin, step, fuel);
    });
    [-0.45, 0.45].forEach((ax) => {
      const ant = new THREE.Mesh(SHARED_GEO.antenna, TRIM_MAT);
      ant.position.set(ax, cabinBaseY + cabinH + 0.22, cabinOffsetZ + 0.35);
      bodyTiltGroup.add(ant);
    });

    // Separated Tall Olive-Green Ribbed Box Cargo Compartment
    const cargoLen = length - hoodLen - cabinLength - 0.35;
    const cargoZ = cabinOffsetZ + cabinLength * 0.5 + cargoLen * 0.5 + 0.12;
    const boxH = 2.02;
    const boxMat = getGreenBoxMat();
    const box = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, boxH, cargoLen), boxMat);
    box.position.set(0, cabinBaseY + boxH * 0.5, cargoZ);
    box.receiveShadow = true;
    shadowMeshes.push(box);
    bodyTiltGroup.add(box);

    // Cargo Box Side Upper Vent Hatches & Underbody Toolboxes
    [-1, 1].forEach((side) => {
      const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.42), ARMOR_TRIM_MAT);
      hatch.position.set(side * (width * 0.495), cabinBaseY + boxH * 0.75, cargoZ - cargoLen * 0.34);
      const tbox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.72), GREEN_HEAVY_MAT);
      tbox.position.set(side * (width * 0.44), groundClearance + 0.22, cargoZ - cargoLen * 0.32);
      bodyTiltGroup.add(hatch, tbox);
    });
  } else if (type === 'green_covered_truck') {
    // ── VEHICLE 3: GREEN COVERED CARGO TRUCK (Reference 3 - Zetros) ────────
    const hoodLen = 1.55;
    const hoodZ = -length * 0.5 + hoodLen * 0.5 + 0.14;
    cabinLength = 1.52;
    cabinH = 1.46;
    cabinOffsetZ = hoodZ + hoodLen * 0.5 + cabinLength * 0.5 - 0.04;

    // Sculpted Sage-Green Hood + 4-Slat Horizontal Grille + Center Round Emblem
    const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.74, hoodLen), GREEN_SAGE_MAT);
    hood.position.set(0, cabinBaseY + 0.32, hoodZ);
    hood.rotation.x = 0.06;
    shadowMeshes.push(hood);
    const grilleBack = new THREE.Mesh(new THREE.BoxGeometry(width * 0.56, 0.62, 0.08), HOUSING_DARK_MAT);
    grilleBack.position.set(0, cabinBaseY + 0.28, -length * 0.5 + 0.14);
    const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), ARMOR_TRIM_MAT);
    emblem.rotation.x = Math.PI / 2;
    emblem.position.set(0, cabinBaseY + 0.3, -length * 0.5 + 0.16);
    bodyTiltGroup.add(hood, grilleBack, emblem);
    for (let s = 0; s < 4; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.56, 0.045, 0.09), GREEN_SAGE_MAT);
      slat.position.set(0, cabinBaseY + 0.08 + s * 0.13, -length * 0.5 + 0.15);
      bodyTiltGroup.add(slat);
    }

    // Cab + Roof Rack + A-pillar Black Intake Snorkel + Mid-Chassis Spare Wheel
    const cab = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, cabinH, cabinLength), GREEN_SAGE_MAT);
    cab.position.set(0, cabinBaseY + cabinH * 0.5, cabinOffsetZ);
    cab.receiveShadow = true;
    shadowMeshes.push(cab);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.62, 0.08), mats.glass);
    ws.position.set(0, cabinBaseY + cabinH * 0.68, cabinOffsetZ - cabinLength * 0.5 - 0.01);
    ws.rotation.x = 0.08;
    const roofRack = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.12, 0.95), TRIM_MAT);
    roofRack.position.set(0, cabinBaseY + cabinH + 0.06, cabinOffsetZ - 0.1);
    const snorkelPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, cabinH + 0.25, 8), TRIM_MAT);
    snorkelPipe.position.set(width * 0.47, cabinBaseY + cabinH * 0.58, cabinOffsetZ - cabinLength * 0.44);
    const snorkelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.14, 10), TRIM_MAT);
    snorkelCap.position.set(width * 0.47, cabinBaseY + cabinH + 0.18, cabinOffsetZ - cabinLength * 0.44);
    bodyTiltGroup.add(cab, ws, roofRack, snorkelPipe, snorkelCap);

    [-1, 1].forEach((side) => {
      const cWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.78), mats.glass);
      cWin.position.set(side * (width * 0.465), cabinBaseY + cabinH * 0.68, cabinOffsetZ - 0.08);
      const flare = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 1.35), GREEN_SAGE_MAT);
      flare.position.set(side * (width * 0.44), cabinBaseY + 0.05, hoodZ - 0.05);
      // Tow hooks on heavy bumper
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 10), GREEN_SAGE_MAT);
      hook.position.set(side * 0.48, groundClearance + 0.14, -length * 0.5 - 0.12);
      bodyTiltGroup.add(cWin, flare, hook);
    });

    // Mid-chassis mounted spare wheel & toolbox
    const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 14), mats.rubber);
    spareTire.rotation.x = Math.PI / 2;
    spareTire.position.set(-width * 0.28, groundClearance + 0.15, cabinOffsetZ + cabinLength * 0.78);
    bodyTiltGroup.add(spareTire);

    // Drop-Side Flatbed + Pitched Extruded Woven Canvas Tarp Cover
    const cargoLen = length - hoodLen - cabinLength - 0.28;
    const cargoZ = cabinOffsetZ + cabinLength * 0.5 + cargoLen * 0.5 + 0.1;
    const bedSides = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.46, cargoLen), GREEN_SAGE_MAT);
    bedSides.position.set(0, cabinBaseY + 0.23, cargoZ);
    bodyTiltGroup.add(bedSides);

    const tarpW = width * 0.96;
    const tarpShape = new THREE.Shape();
    tarpShape.moveTo(-tarpW * 0.5, 0);
    tarpShape.lineTo(tarpW * 0.5, 0);
    tarpShape.lineTo(tarpW * 0.5, 1.25);
    tarpShape.lineTo(tarpW * 0.34, 1.66);
    tarpShape.lineTo(-tarpW * 0.34, 1.66);
    tarpShape.lineTo(-tarpW * 0.5, 1.25);
    tarpShape.closePath();
    const tarpGeo = new THREE.ExtrudeGeometry(tarpShape, {
      depth: cargoLen,
      bevelEnabled: false,
    });
    tarpGeo.translate(0, 0, -cargoLen * 0.5);
    const tarpMesh = new THREE.Mesh(tarpGeo, getCanvasTarpMat());
    tarpMesh.position.set(0, cabinBaseY + 0.42, cargoZ);
    tarpMesh.receiveShadow = true;
    shadowMeshes.push(tarpMesh);
    bodyTiltGroup.add(tarpMesh);
  } else if (type === 'police_tow_truck') {
    // ── POLICE HEAVY RECOVERY TOW TRUCK ───────────────────────────────────
    cabinLength = 1.85;
    cabinH = 1.48;
    cabinOffsetZ = -length * 0.5 + cabinLength * 0.5 + 0.18;

    const cab = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, cabinH, cabinLength), paintMat);
    cab.position.set(0, cabinBaseY + cabinH * 0.5, cabinOffsetZ);
    cab.receiveShadow = true;
    shadowMeshes.push(cab);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, cabinH * 0.52, 0.08), mats.glass);
    ws.position.set(0, cabinBaseY + cabinH * 0.62, cabinOffsetZ - cabinLength * 0.5 - 0.01);
    bodyTiltGroup.add(cab, ws);

    const towDoorMat = getTowDoorMat();
    [-1, 1].forEach((side) => {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.58), towDoorMat);
      decal.position.set(side * (width * 0.465), cabinBaseY + 0.38, cabinOffsetZ);
      decal.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      bodyTiltGroup.add(decal);
    });

    // Wrecker Deck + Hazard Side Bodies
    const bedLen = length - cabinLength - 0.45;
    const bedZ = cabinOffsetZ + cabinLength * 0.5 + bedLen * 0.5 + 0.12;
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.62, bedLen), paintMat);
    bedBase.position.set(0, cabinBaseY + 0.31, bedZ);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.14, bedLen * 0.95), TOW_YELLOW_MAT);
    stripe.position.set(0, cabinBaseY + 0.44, bedZ);
    const headacheRack = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 1.32, 0.18), TRIM_MAT);
    headacheRack.position.set(0, cabinBaseY + 0.72, bedZ - bedLen * 0.45);
    shadowMeshes.push(bedBase);
    bodyTiltGroup.add(bedBase, stripe, headacheRack);

    // Articulated Hydraulic Tow Boom + Wheel-Lift Stinger + Winch Cable
    towBoomPivot = new THREE.Group();
    towBoomPivot.position.set(0, cabinBaseY + 0.58, bedZ - 0.25);
    const mainBoom = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, bedLen * 0.85), TOW_YELLOW_MAT);
    mainBoom.position.set(0, 0.22, bedLen * 0.38);
    mainBoom.rotation.x = -0.24;
    const teleArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 1.3), mats.brushedSteel);
    teleArm.position.set(0, 0.36, bedLen * 0.72);
    teleArm.rotation.x = -0.24;
    towBoomPivot.add(mainBoom, teleArm);

    towCradlePivot = new THREE.Group();
    towCradlePivot.position.set(0, -0.35, bedLen * 0.56);
    const stingerBar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 1.45), TRIM_MAT);
    stingerBar.position.set(0, 0, 0.55);
    const crossT = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.14, 0.24), TOW_YELLOW_MAT);
    crossT.position.set(0, 0, 1.24);
    towCradlePivot.add(stingerBar, crossT);
    towBoomPivot.add(towCradlePivot);

    const cableGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6);
    cableGeo.rotateX(Math.PI / 2);
    winchCable = new THREE.Mesh(cableGeo, mats.brushedSteel);
    winchCable.position.set(0, 0.05, bedLen * 0.88);
    winchCable.visible = false;
    towBoomPivot.add(winchCable);

    bodyTiltGroup.add(towBoomPivot);
  } else if (isTruck) {
    cabinLength = 1.78;
    cabinH = type === 'heavy_cargo_truck' || type === 'container_truck' ? 1.48 : 1.28;
    cabinOffsetZ = -length * 0.5 + cabinLength * 0.5 + 0.15;

    const cab = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, cabinH, cabinLength), paintMat);
    cab.position.set(0, cabinBaseY + cabinH * 0.5, cabinOffsetZ);
    cab.receiveShadow = true;
    shadowMeshes.push(cab);
    bodyTiltGroup.add(cab);

    // Aerodynamic Roof Visor & Wind Deflector
    const visor = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.1, 0.36), TRIM_MAT);
    visor.position.set(0, cabinBaseY + cabinH - 0.08, cabinOffsetZ - cabinLength * 0.5 - 0.08);
    visor.rotation.x = 0.25;
    bodyTiltGroup.add(visor);

    if (type !== 'mini_truck') {
      const deflector = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.36, 1.1), paintMat);
      deflector.position.set(0, cabinBaseY + cabinH + 0.14, cabinOffsetZ + 0.15);
      deflector.rotation.x = -0.22;
      bodyTiltGroup.add(deflector);

      // Dual Vertical Chrome Exhaust Stacks behind cab
      [-1, 1].forEach((side) => {
        const stack = new THREE.Mesh(SHARED_GEO.stackPipe, mats.chrome);
        stack.position.set(side * (width * 0.44), cabinBaseY + cabinH * 0.65, cabinOffsetZ + cabinLength * 0.5 + 0.06);
        bodyTiltGroup.add(stack);
      });
    }

    // Side Fuel Tanks & Step Rails
    [-1, 1].forEach((side) => {
      const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.15, 10), mats.brushedSteel);
      fuelTank.rotation.x = Math.PI / 2;
      fuelTank.position.set(side * (width * 0.44), groundClearance + 0.24, cabinOffsetZ + cabinLength * 0.72);
      bodyTiltGroup.add(fuelTank);
    });

    const ws = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, cabinH * 0.52, 0.08), mats.glass);
    ws.position.set(0, cabinBaseY + cabinH * 0.58, cabinOffsetZ - cabinLength * 0.5 - 0.01);
    bodyTiltGroup.add(ws);

    const cargoLen = length - cabinLength - 0.45;
    const cargoZ = cabinOffsetZ + cabinLength * 0.5 + cargoLen * 0.5 + 0.15;

    if (type === 'cement_truck') {
      const drumGeo = new THREE.CylinderGeometry(0.75, 1.0, cargoLen * 0.9, 14);
      drumGeo.rotateX(Math.PI / 2 - 0.16);
      cementDrum = new THREE.Mesh(drumGeo, CEMENT_MAT);
      cementDrum.position.set(0, cabinBaseY + 1.02, cargoZ);
      shadowMeshes.push(cementDrum);
      const stripeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.35, 14), POLICE_STRIPE_MAT);
      stripeRing.rotation.x = Math.PI / 2;
      cementDrum.add(stripeRing);
      const chute = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.9), mats.brushedSteel);
      chute.position.set(0, cabinBaseY + 0.55, length * 0.5 - 0.1);
      chute.rotation.x = -0.35;
      bodyTiltGroup.add(cementDrum, chute);
    } else if (type === 'fuel_truck') {
      const tankGeo = new THREE.CylinderGeometry(0.96, 0.96, cargoLen * 0.94, 16);
      tankGeo.rotateX(Math.PI / 2);
      const tank = new THREE.Mesh(tankGeo, mats.chrome);
      tank.position.set(0, cabinBaseY + 1.02, cargoZ);
      shadowMeshes.push(tank);
      const placard = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.36, 0.36), HAZARD_ORANGE_MAT);
      placard.position.set(0, cabinBaseY + 1.02, cargoZ);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, cargoLen * 0.78), TRIM_MAT);
      topRail.position.set(0, cabinBaseY + 1.98, cargoZ);
      bodyTiltGroup.add(tank, placard, topRail);
    } else if (type === 'flatbed_truck') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.22, cargoLen), mats.woodPlank);
      bed.position.set(0, cabinBaseY + 0.11, cargoZ);
      bodyTiltGroup.add(bed);
      const logGeo = new THREE.CylinderGeometry(0.22, 0.22, cargoLen * 0.88, 10);
      logGeo.rotateX(Math.PI / 2);
      [-0.48, 0, 0.48].forEach((lx) => {
        const log = new THREE.Mesh(logGeo, mats.bark);
        log.position.set(lx, cabinBaseY + 0.44, cargoZ);
        bodyTiltGroup.add(log);
      });
      // Steel stanchion stakes on sides
      [-cargoLen * 0.32, cargoLen * 0.32].forEach((sz) => {
        [-1, 1].forEach((side) => {
          const stake = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.08), mats.structuralSteel);
          stake.position.set(side * (width * 0.46), cabinBaseY + 0.65, cargoZ + sz);
          bodyTiltGroup.add(stake);
        });
      });
    } else if (type === 'livestock_truck') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 1.78, cargoLen), mats.woodPlank);
      frame.position.set(0, cabinBaseY + 0.89, cargoZ);
      shadowMeshes.push(frame);
      const metalCap = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.14, cargoLen + 0.06), mats.corrugatedMetal);
      metalCap.position.set(0, cabinBaseY + 1.82, cargoZ);
      bodyTiltGroup.add(frame, metalCap);
    } else {
      const boxH = type === 'container_truck' ? 2.18 : type === 'mini_truck' ? 1.58 : 1.98;
      const boxMat =
        type === 'refrigerated_truck'
          ? REEFER_MAT
          : type === 'construction_truck'
          ? CONSTRUCTION_MAT
          : type === 'container_truck'
          ? CONTAINER_MAT
          : mats.corrugatedMetal;
      const box = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, boxH, cargoLen), boxMat);
      box.position.set(0, cabinBaseY + boxH * 0.5, cargoZ);
      box.receiveShadow = true;
      shadowMeshes.push(box);
      // Corner steel structural edge rails
      const cornerGeo = new THREE.BoxGeometry(width * 0.98, 0.09, cargoLen + 0.04);
      const topCorner = new THREE.Mesh(cornerGeo, TRIM_MAT);
      topCorner.position.set(0, cabinBaseY + boxH - 0.02, cargoZ);
      bodyTiltGroup.add(box, topCorner);
      if (type === 'refrigerated_truck') {
        const reeferUnit = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 0.65, 0.34), HOUSING_DARK_MAT);
        reeferUnit.position.set(0, cabinBaseY + boxH - 0.45, cargoZ - cargoLen * 0.5 - 0.14);
        bodyTiltGroup.add(reeferUnit);
      }
    }
  } else {
    cabinLength = isBus
      ? length * 0.92
      : isVan
      ? length * 0.72
      : type === 'hatchback' || type === 'family_car'
      ? length * 0.62
      : type === 'pickup'
      ? 1.85
      : length * 0.48;
    cabinH = isBus ? 1.68 : isVan ? 1.18 : 0.74;
    cabinOffsetZ = isBus ? 0 : isVan ? 0.35 : type === 'pickup' ? -0.55 : 0.12;

    // Sculpted sloped hood accent for passenger cars/SUVs/pickups
    if (!isBus && !isVan) {
      const hoodLen = length * 0.5 - (cabinLength * 0.5 - cabinOffsetZ) - 0.15;
      if (hoodLen > 0.35) {
        const hoodScoop = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.07, hoodLen), paintMat);
        hoodScoop.position.set(0, cabinBaseY + 0.03, -length * 0.5 + hoodLen * 0.5 + 0.14);
        hoodScoop.rotation.x = 0.04;
        bodyTiltGroup.add(hoodScoop);
      }
    }

    const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.11, cabinLength * 0.9), paintMat);
    roof.position.set(0, cabinBaseY + cabinH - 0.05, cabinOffsetZ);
    shadowMeshes.push(roof);
    bodyTiltGroup.add(roof);

    // Roof rails (SUV/Jeep/Wagon) or Bus HVAC pods + Antenna
    if (type === 'suv' || type === 'family_car' || type === 'jeep') {
      [-1, 1].forEach((side) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, cabinLength * 0.72), mats.brushedSteel);
        rail.position.set(side * (width * 0.36), cabinBaseY + cabinH + 0.03, cabinOffsetZ);
        bodyTiltGroup.add(rail);
      });
    } else if (isBus) {
      [-1.4, 1.4].forEach((az) => {
        const hvac = new THREE.Mesh(new THREE.BoxGeometry(width * 0.55, 0.24, 1.5), REEFER_MAT);
        hvac.position.set(0, cabinBaseY + cabinH + 0.12, az);
        bodyTiltGroup.add(hvac);
      });
    } else {
      const ant = new THREE.Mesh(SHARED_GEO.antenna, TRIM_MAT);
      ant.position.set(0, cabinBaseY + cabinH + 0.15, cabinOffsetZ + cabinLength * 0.35);
      ant.rotation.x = 0.35;
      bodyTiltGroup.add(ant);
    }

    const glassFBGeo = new THREE.BoxGeometry(width * 0.82, cabinH * 0.82, 0.07);
    const fGlass = new THREE.Mesh(glassFBGeo, mats.glass);
    fGlass.position.set(0, cabinBaseY + cabinH * 0.47, cabinOffsetZ - cabinLength * 0.47);
    fGlass.rotation.x = isBus || isVan ? 0.08 : 0.34;
    const rGlass = new THREE.Mesh(glassFBGeo, mats.glass);
    rGlass.position.set(0, cabinBaseY + cabinH * 0.47, cabinOffsetZ + cabinLength * 0.47);
    rGlass.rotation.x = isBus || isVan ? -0.06 : -0.3;
    bodyTiltGroup.add(fGlass, rGlass);

    const sWinGeo = new THREE.BoxGeometry(0.06, cabinH * 0.72, cabinLength * 0.82);
    const pilGeo = new THREE.BoxGeometry(0.095, cabinH, 0.12);
    [-1, 1].forEach((side) => {
      const sWin = new THREE.Mesh(sWinGeo, mats.glass);
      sWin.position.set(side * (width * 0.44), cabinBaseY + cabinH * 0.47, cabinOffsetZ);
      bodyTiltGroup.add(sWin);

      const pilPositions = isBus ? [-0.44, -0.15, 0.15, 0.44] : [-0.42, 0, 0.42];
      pilPositions.forEach((pz) => {
        const pil = new THREE.Mesh(pilGeo, paintMat);
        pil.position.set(side * (width * 0.45), cabinBaseY + cabinH * 0.5, cabinOffsetZ + pz * cabinLength);
        bodyTiltGroup.add(pil);
      });
    });

    if (type === 'pickup') {
      const wallGeo = new THREE.BoxGeometry(0.12, 0.48, 1.72);
      [-1, 1].forEach((side) => {
        const wall = new THREE.Mesh(wallGeo, paintMat);
        wall.position.set(side * (width * 0.45), cabinBaseY + 0.24, length * 0.5 - 0.9);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 1.74), TRIM_MAT);
        cap.position.set(side * (width * 0.45), cabinBaseY + 0.49, length * 0.5 - 0.9);
        bodyTiltGroup.add(wall, cap);
      });
    }
    if (type === 'jeep') {
      const spare = new THREE.Mesh(SHARED_GEO.jeepSpare, mats.rubber);
      spare.position.set(0, cabinBaseY + 0.26, length * 0.5 + 0.13);
      const spareRim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.24, 10), mats.chrome);
      spareRim.rotation.x = Math.PI / 2;
      spare.add(spareRim);
      bodyTiltGroup.add(spare);
    }
  }

  // Interior seats, headrests, dashboard & steering wheel
  [-0.4, 0.4].forEach((sx) => {
    const seat = new THREE.Mesh(SHARED_GEO.seat, INTERIOR_MAT);
    seat.position.set(sx, cabinBaseY + 0.14, cabinOffsetZ - 0.08);
    const hr = new THREE.Mesh(SHARED_GEO.headrest, INTERIOR_MAT);
    hr.position.set(sx, cabinBaseY + 0.52, cabinOffsetZ - 0.04);
    bodyTiltGroup.add(seat, hr);
  });
  const dash = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, 0.24, 0.4), TRIM_MAT);
  dash.position.set(0, cabinBaseY + 0.12, cabinOffsetZ - cabinLength * 0.35);
  const steer = new THREE.Mesh(SHARED_GEO.steerWheel, TRIM_MAT);
  steer.position.set(-0.4, cabinBaseY + 0.32, cabinOffsetZ - cabinLength * 0.26);
  steer.rotation.x = 0.45;
  bodyTiltGroup.add(dash, steer);

  // Driver Door Pivot + Raycast Hitbox
  const driverDoorPivot = new THREE.Group();
  driverDoorPivot.position.set(-width * 0.5 - 0.01, groundClearance + chassisH * 0.5, cabinOffsetZ - 0.45);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, chassisH * 0.86, 0.96), paintMat);
  doorPanel.position.set(0, 0, 0.48);
  const doorRubStrip = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.08, 0.92), TRIM_MAT);
  doorRubStrip.position.set(0, -0.08, 0.48);
  const doorHandle = new THREE.Mesh(SHARED_GEO.doorHandle, mats.chrome);
  doorHandle.position.set(-0.04, 0.16, 0.78);
  driverDoorPivot.add(doorPanel, doorRubStrip, doorHandle);
  bodyTiltGroup.add(driverDoorPivot);

  const driverDoorHitbox = new THREE.Mesh(SHARED_GEO.doorHitbox, INVISIBLE_MAT);
  driverDoorHitbox.position.set(-width * 0.5 - 0.08, groundClearance + chassisH * 0.7, cabinOffsetZ);
  driverDoorHitbox.userData.interactId = `veh_door:${caseId}`;
  driverDoorHitbox.userData.interactLabel = '[OPEN DOOR]';
  bodyTiltGroup.add(driverDoorHitbox);

  // Rear Trunk / Cargo Doors Pivot + Interactive Hitbox + Visible 3D Cargo Props
  const trunkPivot = new THREE.Group();
  const isLargeCargo = isTruck || isVan;
  trunkPivot.position.set(0, isLargeCargo ? cabinBaseY + 1.55 : cabinBaseY + 0.25, length * 0.5 - 0.02);
  const trunkDoorMat =
    type === 'green_heavy_truck'
      ? getGreenBoxMat()
      : type === 'green_covered_truck'
      ? getCanvasTarpMat()
      : type === 'armored_security'
      ? ARMOR_STEEL_MAT
      : isLargeCargo
      ? mats.corrugatedMetal
      : paintMat;
  const trunkDoor = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.84, isLargeCargo ? 1.45 : 0.44, 0.08),
    trunkDoorMat
  );
  trunkDoor.position.set(0, isLargeCargo ? -0.72 : -0.18, 0.02);
  const trunkHandle = new THREE.Mesh(SHARED_GEO.trunkHandle, isCustomRef ? ARMOR_TRIM_MAT : mats.chrome);
  trunkHandle.position.set(0, isLargeCargo ? -1.1 : -0.25, 0.07);
  if (type === 'police_tow_truck') {
    trunkPivot.visible = false;
  } else {
    trunkPivot.add(trunkDoor, trunkHandle);
  }
  bodyTiltGroup.add(trunkPivot);

  const hasCargoContraband = hotspots.some((h) => h.area === 'cargo' && h.isIssue);
  if (
    type !== 'cement_truck' &&
    type !== 'fuel_truck' &&
    type !== 'flatbed_truck' &&
    type !== 'armored_security' &&
    type !== 'police_tow_truck'
  ) {
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.45, 0.65), mats.woodPlank);
    c1.position.set(-width * 0.2, cabinBaseY + 0.24, length * 0.5 - 0.55);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.38, 0.6), PARCEL_MAT);
    c2.position.set(width * 0.2, cabinBaseY + 0.2, length * 0.5 - 0.52);
    bodyTiltGroup.add(c1, c2);
    if (hasCargoContraband) {
      const suspiciousCrate = new THREE.Mesh(new THREE.BoxGeometry(width * 0.36, 0.48, 0.58), SUSPICIOUS_MAT);
      suspiciousCrate.position.set(0, cabinBaseY + 0.65, length * 0.5 - 0.55);
      const band = new THREE.Mesh(new THREE.BoxGeometry(width * 0.38, 0.08, 0.6), BAND_MAT);
      band.position.copy(suspiciousCrate.position);
      bodyTiltGroup.add(suspiciousCrate, band);
    }
  }

  const trunkHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.85, isLargeCargo ? 1.55 : 0.85, 0.55),
    INVISIBLE_MAT
  );
  trunkHitbox.position.set(0, cabinBaseY + (isLargeCargo ? 0.75 : 0.22), length * 0.5 + 0.1);
  if (type !== 'police_tow_truck') {
    trunkHitbox.userData.interactId = `veh_trunk:${caseId}`;
    trunkHitbox.userData.interactLabel = isLargeCargo ? '[OPEN/CLOSE CARGO DOORS]' : '[OPEN/CLOSE TRUNK]';
  }
  bodyTiltGroup.add(trunkHitbox);

  // Sculpted Bumpers + Exhaust Tailpipe
  const bumpGeo = new THREE.BoxGeometry(width + 0.08, isCustomRef ? 0.28 : 0.18, isCustomRef ? 0.24 : 0.18);
  const fBumpMat =
    type === 'armored_security'
      ? ARMOR_TRIM_MAT
      : type === 'green_covered_truck'
      ? GREEN_SAGE_MAT
      : TRIM_MAT;
  const fBump = new THREE.Mesh(bumpGeo, fBumpMat);
  fBump.position.set(0, groundClearance + 0.14, -length * 0.5 - 0.03);
  bodyTiltGroup.add(fBump);
  if (!isCustomRef) {
    const fBumpChrome = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.04, 0.19), mats.chrome);
    fBumpChrome.position.set(0, groundClearance + 0.19, -length * 0.5 - 0.03);
    bodyTiltGroup.add(fBumpChrome);
  }
  const rBump = new THREE.Mesh(bumpGeo, fBumpMat);
  rBump.position.set(0, groundClearance + 0.14, length * 0.5 + 0.03);
  const exhaust = new THREE.Mesh(SHARED_GEO.exhaust, isCustomRef ? TRIM_MAT : mats.chrome);
  exhaust.position.set(-width * 0.32, groundClearance + 0.06, length * 0.5 + 0.08);
  bodyTiltGroup.add(rBump, exhaust);

  // Crisp License Plates
  const { canvas: plateCanvas, tex: plateTexture } = makePlateTexture(plateText);
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTexture, roughness: 0.45, metalness: 0.08 });
  const frontPlate = new THREE.Mesh(SHARED_GEO.plate, plateMat);
  frontPlate.position.set(0, groundClearance + 0.15, -length * 0.5 - (isCustomRef ? 0.155 : 0.125));
  frontPlate.rotation.y = Math.PI;
  const rearPlate = new THREE.Mesh(SHARED_GEO.plate, plateMat);
  rearPlate.position.set(0, groundClearance + 0.28, length * 0.5 + (isCustomRef ? 0.155 : 0.125));
  bodyTiltGroup.add(frontPlate, rearPlate);

  // Recessed Headlight & Taillight Clusters + Indicators
  const headlights: THREE.Mesh[] = [];
  const brakeLights: THREE.Mesh[] = [];
  const leftIndicators: THREE.Mesh[] = [];
  const rightIndicators: THREE.Mesh[] = [];
  const frontLightY = isCustomRef ? cabinBaseY + 0.04 : groundClearance + chassisH * 0.62;
  const frontLightZ = isCustomRef ? -length * 0.5 + 0.08 : -length * 0.5 - 0.015;

  [-1, 1].forEach((side) => {
    const fHousing = new THREE.Mesh(SHARED_GEO.hlHousing, HOUSING_DARK_MAT);
    fHousing.position.set(side * (width * 0.36), frontLightY, frontLightZ);
    const hl = new THREE.Mesh(SHARED_GEO.hl, HL_MAT_OFF);
    hl.position.set(side * (width * 0.36), frontLightY, frontLightZ - 0.015);
    bodyTiltGroup.add(fHousing, hl);
    headlights.push(hl);

    const rHousing = new THREE.Mesh(SHARED_GEO.hlHousing, HOUSING_DARK_MAT);
    rHousing.position.set(side * (width * 0.36), groundClearance + chassisH * 0.62, length * 0.5 + 0.015);
    const bl = new THREE.Mesh(SHARED_GEO.hl, BL_MAT_OFF);
    bl.position.set(side * (width * 0.36), groundClearance + chassisH * 0.62, length * 0.5 + 0.026);
    bodyTiltGroup.add(rHousing, bl);
    brakeLights.push(bl);

    const fInd = new THREE.Mesh(SHARED_GEO.ind, IND_MAT_OFF);
    fInd.position.set(side * (width * 0.45), frontLightY, frontLightZ - 0.014);
    const rInd = new THREE.Mesh(SHARED_GEO.ind, IND_MAT_OFF);
    rInd.position.set(side * (width * 0.45), groundClearance + chassisH * 0.62, length * 0.5 + 0.024);
    bodyTiltGroup.add(fInd, rInd);
    if (side < 0) leftIndicators.push(fInd, rInd);
    else rightIndicators.push(fInd, rInd);
  });

  // Side Mirrors on Mounting Stalks
  [-1, 1].forEach((side) => {
    const mirArm = new THREE.Mesh(SHARED_GEO.mirrorArm, TRIM_MAT);
    mirArm.position.set(side * (width * 0.49), cabinBaseY + (isCustomRef ? 0.95 : 0.25), cabinOffsetZ - cabinLength * 0.32);
    const mir = new THREE.Mesh(SHARED_GEO.mirror, isCustomRef ? TRIM_MAT : paintMat);
    mir.position.set(side * (width * 0.56), cabinBaseY + (isCustomRef ? 0.96 : 0.26), cabinOffsetZ - cabinLength * 0.32);
    bodyTiltGroup.add(mirArm, mir);
  });

  // Police / Armored / Tow Emergency Lightbars & Beacons
  let sirenRed: THREE.Mesh | undefined;
  let sirenBlue: THREE.Mesh | undefined;
  if (isPolice) {
    if (type === 'armored_security') {
      sirenRed = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 10), SIREN_RED_OFF);
      sirenRed.position.set(-0.44, cabinBaseY + cabinH + 0.12, cabinOffsetZ - cabinLength * 0.42);
      sirenBlue = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 10), SIREN_BLUE_OFF);
      sirenBlue.position.set(0.44, cabinBaseY + cabinH + 0.12, cabinOffsetZ - cabinLength * 0.42);
      bodyTiltGroup.add(sirenRed, sirenBlue);
    } else {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.07, 0.26), HOUSING_DARK_MAT);
      bar.position.set(0, cabinBaseY + cabinH + 0.04, cabinOffsetZ);
      sirenRed = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.22), SIREN_RED_OFF);
      sirenRed.position.set(-0.31, cabinBaseY + cabinH + 0.09, cabinOffsetZ);
      sirenBlue = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.22), SIREN_BLUE_OFF);
      sirenBlue.position.set(0.31, cabinBaseY + cabinH + 0.09, cabinOffsetZ);
      bodyTiltGroup.add(bar, sirenRed, sirenBlue);
    }
  }

  // Detailed Multi-Part Wheels (tire + sidewall + alloy rim + center hub)
  const wheels: THREE.Mesh[] = [];
  const frontSteerPivots: THREE.Group[] = [];
  const { tire: wheelGeo, sidewall: sidewallGeo, rim: rimGeo, hub: hubGeo } = getWheelGeos(wheelRadius);

  const axlePositions =
    type === 'armored_security'
      ? [-length * 0.32, length * 0.32]
      : length > 7.2
      ? [-length * 0.36, length * 0.19, length * 0.39]
      : [-length * 0.34, length * 0.34];
  axlePositions.forEach((az, idx) => {
    [-1, 1].forEach((side) => {
      const sp = new THREE.Group();
      sp.position.set(side * (width * 0.46), wheelRadius, az);
      const tire = new THREE.Mesh(wheelGeo, mats.rubber);
      if (type === 'armored_security' && idx > 0) {
        tire.scale.x = 1.48; // Heavy dual-style rear tires on Armored Security Truck
      } else if (isCustomRef) {
        tire.scale.x = 1.24; // Wide rugged military/recovery off-road tires
      }
      const sidewall = new THREE.Mesh(sidewallGeo, TRIM_MAT);
      const rim = new THREE.Mesh(
        rimGeo,
        type === 'green_heavy_truck'
          ? GREEN_HEAVY_MAT
          : type === 'green_covered_truck'
          ? GREEN_SAGE_MAT
          : type === 'armored_security'
          ? ARMOR_TRIM_MAT
          : mats.chrome
      );
      const hub = new THREE.Mesh(hubGeo, HOUSING_DARK_MAT);
      tire.add(sidewall, rim, hub);
      sp.add(tire);
      root.add(sp);
      wheels.push(tire);
      if (idx === 0) frontSteerPivots.push(sp);
    });
  });

  // Lens Inspection 3D Hotspot Markers
  const hotspotMarkers: THREE.Mesh[] = [];
  for (const hs of hotspots) {
    const marker = new THREE.Mesh(SHARED_GEO.hotspot, HS_MAT_UNSCANNED);
    marker.position.set(hs.localOffset[0], hs.localOffset[1], hs.localOffset[2]);
    marker.visible = false;
    marker.userData.interactId = `lens_spot:${caseId}:${hs.id}`;
    marker.userData.interactLabel = `[INSPECT] ${hs.partLabel}`;
    bodyTiltGroup.add(marker);
    hotspotMarkers.push(marker);
  }

  return {
    root,
    bodyTiltGroup,
    shadowMeshes,
    wheels,
    frontSteerPivots,
    driverDoorPivot,
    driverDoorHitbox,
    trunkPivot,
    trunkHitbox,
    headlights,
    brakeLights,
    leftIndicators,
    rightIndicators,
    sirenRed,
    sirenBlue,
    cementDrum,
    towBoomPivot,
    towCradlePivot,
    winchCable,
    hotspotMarkers,
    plateCanvas,
    plateTexture,
    plateMat,
    vehicleType: type,
    halfWidth: width * 0.52,
    halfLength: length * 0.52,
    doorOpen: false,
    trunkOpen: false,
    headlightsOn: false,
    sirenOn: false,
    indicatorState: 0,
    towDeployed: false,
    isTowed: false,
  };
}

export function setVehicleShadowCasting(rig: VehicleRig, enabled: boolean) {
  for (const m of rig.shadowMeshes) {
    m.castShadow = enabled;
  }
}

export function disposeVehicleRig(rig: VehicleRig) {
  rig.plateTexture.dispose();
  rig.plateMat.dispose();
}

export function animateVehicleRig(
  rig: VehicleRig,
  dt: number,
  speed: number,
  steerAngle: number,
  braking: boolean,
  elapsed: number
) {
  if (speed !== 0) {
    const angularVel = speed / 0.38;
    for (let i = 0; i < rig.wheels.length; i++) {
      // When front wheels are lifted on tow cradle, only rear wheels roll on asphalt
      if (rig.isTowed && i < 2) continue;
      rig.wheels[i].rotation.x -= angularVel * dt;
    }
  }
  for (const sp of rig.frontSteerPivots) {
    if (Math.abs(sp.rotation.y - steerAngle) > 0.002) {
      sp.rotation.y = THREE.MathUtils.damp(sp.rotation.y, steerAngle, 12, dt);
    }
  }
  if (rig.cementDrum) {
    rig.cementDrum.rotation.z += dt * 0.9;
  }

  const targetLiftY = rig.isTowed ? 0.2 : 0;
  if (Math.abs(rig.bodyTiltGroup.position.y - targetLiftY) > 0.001) {
    rig.bodyTiltGroup.position.y = THREE.MathUtils.damp(rig.bodyTiltGroup.position.y, targetLiftY, 6, dt);
  }

  const targetPitch = rig.isTowed
    ? 0.062
    : braking
    ? 0.022
    : THREE.MathUtils.clamp(-speed * 0.001, -0.018, 0.018);
  if (Math.abs(rig.bodyTiltGroup.rotation.x - targetPitch) > 0.0005) {
    rig.bodyTiltGroup.rotation.x = THREE.MathUtils.damp(rig.bodyTiltGroup.rotation.x, targetPitch, 8, dt);
  }

  if (rig.towBoomPivot && rig.towCradlePivot) {
    const boomTarget = rig.towDeployed ? 0.24 : 0;
    const cradleTarget = rig.towDeployed ? -0.18 : 0.12;
    rig.towBoomPivot.rotation.x = THREE.MathUtils.damp(rig.towBoomPivot.rotation.x, boomTarget, 5, dt);
    rig.towCradlePivot.rotation.x = THREE.MathUtils.damp(rig.towCradlePivot.rotation.x, cradleTarget, 5, dt);
    if (rig.winchCable) {
      rig.winchCable.visible = Boolean(rig.towDeployed);
    }
  }

  const targetDoor = rig.doorOpen ? 1.08 : 0;
  if (Math.abs(rig.driverDoorPivot.rotation.y - targetDoor) > 0.002) {
    rig.driverDoorPivot.rotation.y = THREE.MathUtils.damp(rig.driverDoorPivot.rotation.y, targetDoor, 8, dt);
  }
  const targetTrunk = rig.trunkOpen ? -1.1 : 0;
  if (Math.abs(rig.trunkPivot.rotation.x - targetTrunk) > 0.002) {
    rig.trunkPivot.rotation.x = THREE.MathUtils.damp(rig.trunkPivot.rotation.x, targetTrunk, 8, dt);
  }

  if (rig._lastHeadlightsOn !== rig.headlightsOn) {
    rig._lastHeadlightsOn = rig.headlightsOn;
    const mat = rig.headlightsOn ? HL_MAT_ON : HL_MAT_OFF;
    for (const hl of rig.headlights) hl.material = mat;
  }

  const brakeState = braking ? 2 : rig.headlightsOn ? 1 : 0;
  if (rig._lastBrakeState !== brakeState) {
    rig._lastBrakeState = brakeState;
    const mat = brakeState === 2 ? BL_MAT_ON : brakeState === 1 ? BL_MAT_DIM : BL_MAT_OFF;
    for (const bl of rig.brakeLights) bl.material = mat;
  }

  const blink = rig.indicatorState !== 0 && Math.sin(elapsed * 8) > 0;
  const leftOn = rig.indicatorState === -1 && blink;
  if (rig._lastLeftBlink !== leftOn) {
    rig._lastLeftBlink = leftOn;
    const mat = leftOn ? IND_MAT_ON : IND_MAT_OFF;
    for (const li of rig.leftIndicators) li.material = mat;
  }
  const rightOn = rig.indicatorState === 1 && blink;
  if (rig._lastRightBlink !== rightOn) {
    rig._lastRightBlink = rightOn;
    const mat = rightOn ? IND_MAT_ON : IND_MAT_OFF;
    for (const ri of rig.rightIndicators) ri.material = mat;
  }

  if (rig.sirenRed && rig.sirenBlue) {
    const sState = rig.sirenOn ? (Math.sin(elapsed * 14) > 0 ? 1 : 2) : 0;
    if (rig._lastSirenPhase !== sState) {
      rig._lastSirenPhase = sState;
      rig.sirenRed.material = sState === 1 ? SIREN_RED_ON : SIREN_RED_OFF;
      rig.sirenBlue.material = sState === 2 ? SIREN_BLUE_ON : SIREN_BLUE_OFF;
    }
  }

  for (let i = 0; i < rig.hotspotMarkers.length; i++) {
    const m = rig.hotspotMarkers[i];
    if (m.visible) {
      const sc = 1 + Math.sin(elapsed * 5 + i) * 0.15;
      m.scale.setScalar(sc);
    }
  }
}
