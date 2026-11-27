import * as THREE from 'three';
import { ProceduralMaterialSet } from '../engine/Textures';
import { InspectionHotspot, VehicleType } from '../types/game';
import { VEHICLE_CATALOG } from '../data/gameData';

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
  hotspotMarkers: THREE.Mesh[];
  plateCanvas: HTMLCanvasElement;
  plateTexture: THREE.CanvasTexture;
  plateMat: THREE.MeshLambertMaterial;
  vehicleType: VehicleType;
  halfWidth: number;
  halfLength: number;
  doorOpen: boolean;
  trunkOpen: boolean;
  headlightsOn: boolean;
  sirenOn: boolean;
  indicatorState: -1 | 0 | 1;
  _lastHeadlightsOn?: boolean;
  _lastBrakeState?: number;
  _lastLeftBlink?: boolean;
  _lastRightBlink?: boolean;
  _lastSirenPhase?: number;
}

// Shared static vehicle materials (dramatically reduces WebGL program/material switches)
const TRIM_MAT = new THREE.MeshLambertMaterial({ color: 0x1f2124 });
const INTERIOR_MAT = new THREE.MeshLambertMaterial({ color: 0x2d2a28 });
const PARCEL_MAT = new THREE.MeshLambertMaterial({ color: 0x92400e });
const SUSPICIOUS_MAT = new THREE.MeshLambertMaterial({ color: 0x18181b });
const BAND_MAT = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x7f1d1d, emissiveIntensity: 0.4 });
const POLICE_STRIPE_MAT = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
const REEFER_MAT = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
const CONSTRUCTION_MAT = new THREE.MeshLambertMaterial({ color: 0xb45309 });
const CONTAINER_MAT = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
const CEMENT_MAT = new THREE.MeshLambertMaterial({ color: 0xd97706 });
const HOUSING_DARK_MAT = new THREE.MeshLambertMaterial({ color: 0x18181b });
const INVISIBLE_MAT = new THREE.MeshBasicMaterial({ visible: false });

const HL_MAT_OFF = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 0.2 });
const HL_MAT_ON = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 2.5 });
const BL_MAT_OFF = new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0xef4444, emissiveIntensity: 0.1 });
const BL_MAT_DIM = new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0xef4444, emissiveIntensity: 0.7 });
const BL_MAT_ON = new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0xef4444, emissiveIntensity: 2.6 });
const IND_MAT_OFF = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xf59e0b, emissiveIntensity: 0 });
const IND_MAT_ON = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xf59e0b, emissiveIntensity: 2.4 });
const SIREN_RED_OFF = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.2 });
const SIREN_RED_ON = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 3.5 });
const SIREN_BLUE_OFF = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.2 });
const SIREN_BLUE_ON = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 3.5 });

export const HS_MAT_UNSCANNED = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0284c7,
  emissiveIntensity: 1.4,
  transparent: true,
  opacity: 0.85,
});
export const HS_MAT_CLEAR = new THREE.MeshStandardMaterial({
  color: 0x22c55e,
  emissive: 0x16a34a,
  emissiveIntensity: 1.4,
  transparent: true,
  opacity: 0.85,
});
export const HS_MAT_ISSUE = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  emissive: 0xdc2626,
  emissiveIntensity: 1.4,
  transparent: true,
  opacity: 0.85,
});

const paintMatCache = new Map<number, THREE.MeshStandardMaterial>();
function getPaintMaterial(hex: number): THREE.MeshStandardMaterial {
  let m = paintMatCache.get(hex);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.42, metalness: 0.35 });
    paintMatCache.set(hex, m);
  }
  return m;
}

const wheelGeoCache = new Map<number, { tire: THREE.CylinderGeometry; rim: THREE.CylinderGeometry }>();
function getWheelGeos(radius: number) {
  let g = wheelGeoCache.get(radius);
  if (!g) {
    const tire = new THREE.CylinderGeometry(radius, radius, 0.24, 10);
    tire.rotateZ(Math.PI / 2);
    const rim = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.26, 7);
    rim.rotateZ(Math.PI / 2);
    g = { tire, rim };
    wheelGeoCache.set(radius, g);
  }
  return g;
}

const SHARED_GEO = {
  plate: new THREE.PlaneGeometry(0.56, 0.14),
  hl: new THREE.BoxGeometry(0.26, 0.14, 0.06),
  ind: new THREE.BoxGeometry(0.12, 0.12, 0.07),
  mirror: new THREE.BoxGeometry(0.16, 0.12, 0.08),
  seat: new THREE.BoxGeometry(0.48, 0.58, 0.46),
  doorHandle: new THREE.BoxGeometry(0.06, 0.05, 0.16),
  doorHitbox: new THREE.BoxGeometry(0.45, 1.35, 1.15),
  trunkHandle: new THREE.BoxGeometry(0.24, 0.05, 0.06),
  hotspot: new THREE.SphereGeometry(0.24, 8, 8),
  jeepSpare: (() => {
    const g = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 10);
    g.rotateX(Math.PI / 2);
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
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, 28, 64);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 60);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(plateText, 142, 34);
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

  const isPolice = type === 'police_car';
  const catalogSpec = VEHICLE_CATALOG.find((v) => v.type === type);
  const width = catalogSpec?.width ?? 1.95;
  const length = catalogSpec?.length ?? 4.5;

  const actualColor = isPolice ? 0x16243b : paintHex;
  const paintMat = getPaintMaterial(actualColor);

  const isTruck =
    type === 'mini_truck' ||
    type === 'heavy_cargo_truck' ||
    type === 'container_truck' ||
    type === 'refrigerated_truck' ||
    type === 'flatbed_truck' ||
    type === 'construction_truck' ||
    type === 'cement_truck' ||
    type === 'fuel_truck' ||
    type === 'livestock_truck';
  const isBus = type === 'bus' || type === 'tourist_bus';
  const isVan = type === 'delivery_van' || type === 'cargo_van' || type === 'passenger_van';

  const wheelRadius = isTruck || isBus ? 0.48 : type === 'suv' || type === 'jeep' || type === 'pickup' ? 0.41 : 0.34;
  const chassisH = isTruck || isBus ? 0.76 : 0.56;
  const groundClearance = wheelRadius * 0.72;
  const cabinBaseY = groundClearance + chassisH;

  // Lower Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(width, chassisH, length), paintMat);
  chassis.position.y = groundClearance + chassisH * 0.5;
  chassis.receiveShadow = true;
  shadowMeshes.push(chassis);
  bodyTiltGroup.add(chassis);

  if (isPolice) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.03, chassisH * 0.68, 1.85),
      POLICE_STRIPE_MAT
    );
    stripe.position.set(0, groundClearance + chassisH * 0.5, 0);
    bodyTiltGroup.add(stripe);
  }

  let cementDrum: THREE.Mesh | undefined;
  let cabinOffsetZ = 0.1;
  let cabinLength = 2.1;
  let cabinH = 0.68;

  if (isTruck) {
    cabinLength = 1.75;
    cabinH = type === 'heavy_cargo_truck' || type === 'container_truck' ? 1.45 : 1.25;
    cabinOffsetZ = -length * 0.5 + cabinLength * 0.5 + 0.15;

    const cab = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, cabinH, cabinLength), paintMat);
    cab.position.set(0, cabinBaseY + cabinH * 0.5, cabinOffsetZ);
    shadowMeshes.push(cab);
    bodyTiltGroup.add(cab);

    const ws = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, cabinH * 0.5, 0.08), mats.glass);
    ws.position.set(0, cabinBaseY + cabinH * 0.58, cabinOffsetZ - cabinLength * 0.5 - 0.01);
    bodyTiltGroup.add(ws);

    const cargoLen = length - cabinLength - 0.45;
    const cargoZ = cabinOffsetZ + cabinLength * 0.5 + cargoLen * 0.5 + 0.15;

    if (type === 'cement_truck') {
      const drumGeo = new THREE.CylinderGeometry(0.75, 0.98, cargoLen * 0.9, 10);
      drumGeo.rotateX(Math.PI / 2 - 0.15);
      cementDrum = new THREE.Mesh(drumGeo, CEMENT_MAT);
      cementDrum.position.set(0, cabinBaseY + 1.0, cargoZ);
      shadowMeshes.push(cementDrum);
      bodyTiltGroup.add(cementDrum);
    } else if (type === 'fuel_truck') {
      const tankGeo = new THREE.CylinderGeometry(0.95, 0.95, cargoLen * 0.94, 12);
      tankGeo.rotateX(Math.PI / 2);
      const tank = new THREE.Mesh(tankGeo, mats.chrome);
      tank.position.set(0, cabinBaseY + 1.02, cargoZ);
      shadowMeshes.push(tank);
      bodyTiltGroup.add(tank);
    } else if (type === 'flatbed_truck') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.22, cargoLen), mats.woodPlank);
      bed.position.set(0, cabinBaseY + 0.11, cargoZ);
      bodyTiltGroup.add(bed);
      const logGeo = new THREE.CylinderGeometry(0.22, 0.22, cargoLen * 0.85, 7);
      logGeo.rotateX(Math.PI / 2);
      [-0.45, 0, 0.45].forEach((lx) => {
        const log = new THREE.Mesh(logGeo, mats.woodPlank);
        log.position.set(lx, cabinBaseY + 0.44, cargoZ);
        bodyTiltGroup.add(log);
      });
    } else if (type === 'livestock_truck') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 1.75, cargoLen), mats.woodPlank);
      frame.position.set(0, cabinBaseY + 0.88, cargoZ);
      shadowMeshes.push(frame);
      bodyTiltGroup.add(frame);
    } else {
      const boxH = type === 'container_truck' ? 2.15 : type === 'mini_truck' ? 1.55 : 1.95;
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
      bodyTiltGroup.add(box);
    }
  } else {
    cabinLength = isBus
      ? length * 0.92
      : isVan
      ? length * 0.72
      : type === 'hatchback' || type === 'family_car'
      ? length * 0.62
      : type === 'pickup'
      ? 1.8
      : length * 0.48;
    cabinH = isBus ? 1.65 : isVan ? 1.15 : 0.72;
    cabinOffsetZ = isBus ? 0 : isVan ? 0.35 : type === 'pickup' ? -0.55 : 0.1;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.1, cabinLength * 0.9), paintMat);
    roof.position.set(0, cabinBaseY + cabinH - 0.05, cabinOffsetZ);
    shadowMeshes.push(roof);
    bodyTiltGroup.add(roof);

    const glassFBGeo = new THREE.BoxGeometry(width * 0.82, cabinH * 0.8, 0.07);
    const fGlass = new THREE.Mesh(glassFBGeo, mats.glass);
    fGlass.position.set(0, cabinBaseY + cabinH * 0.46, cabinOffsetZ - cabinLength * 0.47);
    fGlass.rotation.x = isBus || isVan ? 0.08 : 0.32;
    const rGlass = new THREE.Mesh(glassFBGeo, mats.glass);
    rGlass.position.set(0, cabinBaseY + cabinH * 0.46, cabinOffsetZ + cabinLength * 0.47);
    rGlass.rotation.x = isBus || isVan ? -0.06 : -0.28;
    bodyTiltGroup.add(fGlass, rGlass);

    const sWinGeo = new THREE.BoxGeometry(0.06, cabinH * 0.7, cabinLength * 0.8);
    const pilGeo = new THREE.BoxGeometry(0.09, cabinH, 0.12);
    [-1, 1].forEach((side) => {
      const sWin = new THREE.Mesh(sWinGeo, mats.glass);
      sWin.position.set(side * (width * 0.44), cabinBaseY + cabinH * 0.46, cabinOffsetZ);
      bodyTiltGroup.add(sWin);

      [-0.42, 0.42].forEach((pz) => {
        const pil = new THREE.Mesh(pilGeo, paintMat);
        pil.position.set(side * (width * 0.45), cabinBaseY + cabinH * 0.5, cabinOffsetZ + pz * cabinLength);
        bodyTiltGroup.add(pil);
      });
    });

    if (type === 'pickup') {
      const wallGeo = new THREE.BoxGeometry(0.12, 0.46, 1.7);
      [-1, 1].forEach((side) => {
        const wall = new THREE.Mesh(wallGeo, paintMat);
        wall.position.set(side * (width * 0.45), cabinBaseY + 0.23, length * 0.5 - 0.9);
        bodyTiltGroup.add(wall);
      });
    }
    if (type === 'jeep') {
      const spare = new THREE.Mesh(SHARED_GEO.jeepSpare, mats.rubber);
      spare.position.set(0, cabinBaseY + 0.25, length * 0.5 + 0.12);
      bodyTiltGroup.add(spare);
    }
  }

  // Interior seats & dashboard
  [-0.4, 0.4].forEach((sx) => {
    const seat = new THREE.Mesh(SHARED_GEO.seat, INTERIOR_MAT);
    seat.position.set(sx, cabinBaseY + 0.15, cabinOffsetZ - 0.1);
    bodyTiltGroup.add(seat);
  });
  const dash = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, 0.22, 0.4), TRIM_MAT);
  dash.position.set(0, cabinBaseY + 0.12, cabinOffsetZ - cabinLength * 0.35);
  bodyTiltGroup.add(dash);

  // Driver Door Pivot + Raycast Hitbox
  const driverDoorPivot = new THREE.Group();
  driverDoorPivot.position.set(-width * 0.5 - 0.01, groundClearance + chassisH * 0.5, cabinOffsetZ - 0.45);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, chassisH * 0.85, 0.95), paintMat);
  doorPanel.position.set(0, 0, 0.48);
  const doorHandle = new THREE.Mesh(SHARED_GEO.doorHandle, mats.chrome);
  doorHandle.position.set(-0.04, 0.15, 0.78);
  driverDoorPivot.add(doorPanel, doorHandle);
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
  const trunkDoor = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.84, isLargeCargo ? 1.45 : 0.44, 0.08),
    isLargeCargo ? mats.corrugatedMetal : paintMat
  );
  trunkDoor.position.set(0, isLargeCargo ? -0.72 : -0.18, 0.02);
  const trunkHandle = new THREE.Mesh(SHARED_GEO.trunkHandle, mats.chrome);
  trunkHandle.position.set(0, isLargeCargo ? -1.1 : -0.25, 0.07);
  trunkPivot.add(trunkDoor, trunkHandle);
  bodyTiltGroup.add(trunkPivot);

  const hasCargoContraband = hotspots.some((h) => h.area === 'cargo' && h.isIssue);
  if (type !== 'cement_truck' && type !== 'fuel_truck' && type !== 'flatbed_truck') {
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
  trunkHitbox.userData.interactId = `veh_trunk:${caseId}`;
  trunkHitbox.userData.interactLabel = isLargeCargo ? '[OPEN/CLOSE CARGO DOORS]' : '[OPEN/CLOSE TRUNK]';
  bodyTiltGroup.add(trunkHitbox);

  // License Plates & Bumpers
  const bumpGeo = new THREE.BoxGeometry(width + 0.05, 0.18, 0.16);
  const fBump = new THREE.Mesh(bumpGeo, TRIM_MAT);
  fBump.position.set(0, groundClearance + 0.14, -length * 0.5 - 0.03);
  const rBump = new THREE.Mesh(bumpGeo, TRIM_MAT);
  rBump.position.set(0, groundClearance + 0.14, length * 0.5 + 0.03);
  bodyTiltGroup.add(fBump, rBump);

  const { canvas: plateCanvas, tex: plateTexture } = makePlateTexture(plateText);
  const plateMat = new THREE.MeshLambertMaterial({ map: plateTexture });
  const frontPlate = new THREE.Mesh(SHARED_GEO.plate, plateMat);
  frontPlate.position.set(0, groundClearance + 0.16, -length * 0.5 - 0.12);
  frontPlate.rotation.y = Math.PI;
  const rearPlate = new THREE.Mesh(SHARED_GEO.plate, plateMat);
  rearPlate.position.set(0, groundClearance + 0.28, length * 0.5 + 0.12);
  bodyTiltGroup.add(frontPlate, rearPlate);

  // Headlights, Brake lights, Indicators (using shared state-swapped materials!)
  const headlights: THREE.Mesh[] = [];
  const brakeLights: THREE.Mesh[] = [];
  const leftIndicators: THREE.Mesh[] = [];
  const rightIndicators: THREE.Mesh[] = [];

  [-1, 1].forEach((side) => {
    const hl = new THREE.Mesh(SHARED_GEO.hl, HL_MAT_OFF);
    hl.position.set(side * (width * 0.35), groundClearance + chassisH * 0.62, -length * 0.5 - 0.02);
    bodyTiltGroup.add(hl);
    headlights.push(hl);

    const bl = new THREE.Mesh(SHARED_GEO.hl, BL_MAT_OFF);
    bl.position.set(side * (width * 0.35), groundClearance + chassisH * 0.62, length * 0.5 + 0.02);
    bodyTiltGroup.add(bl);
    brakeLights.push(bl);

    const fInd = new THREE.Mesh(SHARED_GEO.ind, IND_MAT_OFF);
    fInd.position.set(side * (width * 0.45), groundClearance + chassisH * 0.62, -length * 0.5 - 0.02);
    const rInd = new THREE.Mesh(SHARED_GEO.ind, IND_MAT_OFF);
    rInd.position.set(side * (width * 0.45), groundClearance + chassisH * 0.62, length * 0.5 + 0.02);
    bodyTiltGroup.add(fInd, rInd);
    if (side < 0) leftIndicators.push(fInd, rInd);
    else rightIndicators.push(fInd, rInd);
  });

  // Side Mirrors
  [-1, 1].forEach((side) => {
    const mir = new THREE.Mesh(SHARED_GEO.mirror, TRIM_MAT);
    mir.position.set(side * (width * 0.54), cabinBaseY + 0.25, cabinOffsetZ - cabinLength * 0.32);
    bodyTiltGroup.add(mir);
  });

  // Police Emergency Lightbar (global PointLight in SimulationEngine avoids shader recompiles)
  let sirenRed: THREE.Mesh | undefined;
  let sirenBlue: THREE.Mesh | undefined;
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.25), HOUSING_DARK_MAT);
    bar.position.set(0, cabinBaseY + cabinH + 0.04, cabinOffsetZ);
    sirenRed = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.11, 0.22), SIREN_RED_OFF);
    sirenRed.position.set(-0.3, cabinBaseY + cabinH + 0.09, cabinOffsetZ);
    sirenBlue = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.11, 0.22), SIREN_BLUE_OFF);
    sirenBlue.position.set(0.3, cabinBaseY + cabinH + 0.09, cabinOffsetZ);
    bodyTiltGroup.add(bar, sirenRed, sirenBlue);
  }

  // Wheels (cached low-poly cylinders)
  const wheels: THREE.Mesh[] = [];
  const frontSteerPivots: THREE.Group[] = [];
  const { tire: wheelGeo, rim: rimGeo } = getWheelGeos(wheelRadius);

  const axlePositions =
    length > 7.2 ? [-length * 0.36, length * 0.22, length * 0.38] : [-length * 0.34, length * 0.34];
  axlePositions.forEach((az, idx) => {
    [-1, 1].forEach((side) => {
      const sp = new THREE.Group();
      sp.position.set(side * (width * 0.46), wheelRadius, az);
      const tire = new THREE.Mesh(wheelGeo, mats.rubber);
      const rim = new THREE.Mesh(rimGeo, mats.chrome);
      tire.add(rim);
      sp.add(tire);
      root.add(sp);
      wheels.push(tire);
      if (idx === 0) frontSteerPivots.push(sp);
    });
  });

  // Lens Inspection 3D Hotspot Markers (shared materials)
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
    for (const w of rig.wheels) {
      w.rotation.x -= angularVel * dt;
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

  const targetPitch = braking ? 0.022 : THREE.MathUtils.clamp(-speed * 0.001, -0.018, 0.018);
  if (Math.abs(rig.bodyTiltGroup.rotation.x - targetPitch) > 0.0005) {
    rig.bodyTiltGroup.rotation.x = THREE.MathUtils.damp(rig.bodyTiltGroup.rotation.x, targetPitch, 8, dt);
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
