import * as THREE from 'three';
import { ProceduralMaterialSet } from '../engine/Textures';
import { QueueAlertInfo } from '../types/game';
import { CharacterRig, createCharacterMesh } from './Characters';

export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CheckpointWorldRefs {
  group: THREE.Group;
  colliders: ColliderBox[];
  interactiveMeshes: THREE.Object3D[];
  officeDoorPivot: THREE.Group;
  drawerPivots: [THREE.Group, THREE.Group];
  entryBarrierPivot: THREE.Group;
  exitBarrierPivot: THREE.Group;
  entryLights: { red: THREE.Mesh; green: THREE.Mesh };
  exitLights: { red: THREE.Mesh; green: THREE.Mesh };
  clockHands: { hour: THREE.Mesh; minute: THREE.Mesh; second: THREE.Mesh };
  weighDisplayCanvas: HTMLCanvasElement;
  weighDisplayTex: THREE.CanvasTexture;
  monitorCanvas: HTMLCanvasElement;
  monitorTex: THREE.CanvasTexture;
  nightLights: THREE.PointLight[];
  officeLamp: THREE.PointLight;
  cctvScreenMat: THREE.MeshStandardMaterial;
  roadMesh: THREE.Mesh;
  sunDisc: THREE.Mesh;
  sentries: CharacterRig[];
  emissiveNightFixtures: THREE.MeshStandardMaterial[];
}

export function updateWeighbridgeSign(
  refs: CheckpointWorldRefs,
  currentKg: number | null,
  permittedKg: number | null,
  reg?: string
) {
  const ctx = refs.weighDisplayCanvas.getContext('2d')!;
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 248);

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('DIGITAL WEIGHBRIDGE SCALE', 24, 38);

  if (currentKg === null || permittedKg === null) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('PLATFORM READY — 0 KG', 24, 128);
    ctx.font = '20px monospace';
    ctx.fillText('Guide vehicle onto marked deck', 24, 175);
  } else {
    const diff = currentKg - permittedKg;
    const over = diff > 0;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '22px monospace';
    ctx.fillText(`REG: ${reg ?? '---'}`, 24, 78);
    ctx.fillText(`CURRENT:   ${currentKg.toLocaleString()} KG`, 24, 118);
    ctx.fillText(`PERMITTED: ${permittedKg.toLocaleString()} KG`, 24, 154);
    ctx.fillText(`DIFF:      ${diff >= 0 ? '+' : ''}${diff.toLocaleString()} KG`, 24, 190);
    ctx.fillStyle = over ? '#ef4444' : '#22c55e';
    ctx.font = 'bold 30px monospace';
    ctx.fillText(over ? 'STATUS: OVERWEIGHT' : 'STATUS: WITHIN LIMIT', 24, 232);
  }
  refs.weighDisplayTex.needsUpdate = true;
}

export function updateOfficeMonitorScreen(
  refs: CheckpointWorldRefs,
  alert: QueueAlertInfo | null,
  alarmActive: boolean
) {
  const ctx = refs.monitorCanvas.getContext('2d')!;
  ctx.fillStyle = alarmActive ? '#2a0c0c' : '#091522';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = alarmActive ? '#ef4444' : '#0284c7';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 248);

  ctx.fillStyle = alarmActive ? '#fca5a5' : '#38bdf8';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(alarmActive ? 'ALERT: NEW VEHICLE ARRIVED!' : 'CHECKPOINT QUEUE MONITOR', 20, 38);

  if (!alert) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px monospace';
    ctx.fillText('No vehicles waiting at gate.', 20, 118);
    ctx.fillText('Monitoring highway approach...', 20, 158);
  } else {
    ctx.fillStyle = '#f8fafc';
    ctx.font = '22px monospace';
    ctx.fillText(`Vehicle:  ${alert.vehicleLabel}`, 20, 82);
    ctx.fillText(`Reg No:   ${alert.registration}`, 20, 116);
    ctx.fillText(`Lane:     Inspection Lane ${alert.lane}`, 20, 150);
    ctx.fillText(`Queue:    #${alert.queuePosition} (Total Waiting: ${alert.totalWaiting})`, 20, 184);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Status:   ${alert.status}`, 20, 222);
  }
  refs.monitorTex.needsUpdate = true;
}

function tagInteractive(obj: THREE.Object3D, id: string, label: string, list: THREE.Object3D[]) {
  obj.userData.interactId = id;
  obj.userData.interactLabel = label;
  list.push(obj);
}

function makeRoadSignTexture(title: string, subtitle: string, bgHex: string, borderHex: string, titleHex: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, 504, 88);
  ctx.fillStyle = titleHex;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 42);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(subtitle, 256, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCheckpointFacility(
  mats: ProceduralMaterialSet,
  vegetationQuality: 'low' | 'medium' | 'high'
): CheckpointWorldRefs {
  const group = new THREE.Group();
  const colliders: ColliderBox[] = [];
  const interactiveMeshes: THREE.Object3D[] = [];
  const nightLights: THREE.PointLight[] = [];
  const emissiveNightFixtures: THREE.MeshStandardMaterial[] = [];

  const darkHousingMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.48, metalness: 0.35 });
  const darkSlateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55, metalness: 0.28 });

  // ── 1. MULTI-LAYERED ALPINE TERRAIN, HIGHWAY & CRISP LANE MARKINGS ─────────
  const groundGeo = new THREE.PlaneGeometry(420, 420, 64, 64);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(posAttr.count * 3);
  const cGrass = new THREE.Color(0x4c6138);
  const cMeadow = new THREE.Color(0x5d6e42);
  const cHill = new THREE.Color(0x6b6457);
  const cRock = new THREE.Color(0x78716c);
  const tmpC = new THREE.Color();
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const dist = Math.hypot(vx, vz);
    let vy = 0;
    if (dist > 48 && Math.abs(vx) > 17) {
      const hillWave =
        Math.sin(vx * 0.045) * Math.cos(vz * 0.042) * 4.2 +
        Math.sin(vx * 0.11 + vz * 0.09) * 1.1;
      vy = Math.max(0, hillWave + Math.max(0, (dist - 78) * 0.14));
    }
    posAttr.setY(i, vy);
    if (vy < 2.2) {
      const mMix = 0.5 + 0.5 * Math.sin(vx * 0.08 + vz * 0.07);
      tmpC.copy(cGrass).lerp(cMeadow, mMix);
    } else if (vy < 7.5) {
      tmpC.copy(cMeadow).lerp(cHill, Math.min(1, (vy - 2.2) / 5.3));
    } else {
      tmpC.copy(cHill).lerp(cRock, Math.min(1, (vy - 7.5) / 8));
    }
    cols[i * 3] = tmpC.r;
    cols[i * 3 + 1] = tmpC.g;
    cols[i * 3 + 2] = tmpC.b;
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  groundGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(groundGeo, mats.terrainGrass);
  terrain.receiveShadow = true;
  group.add(terrain);

  // Gravel Highway Shoulder Strip
  const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.96, metalness: 0.02 });
  const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(14.8, 360), shoulderMat);
  shoulder.rotation.x = -Math.PI / 2;
  shoulder.position.y = 0.014;
  shoulder.receiveShadow = true;
  group.add(shoulder);

  // Main North-South Highway & Checkpoint Yard
  const roadMat = mats.asphalt.clone();
  if (roadMat.map) {
    roadMat.map = roadMat.map.clone();
    roadMat.map.repeat.set(1, 24);
    roadMat.map.needsUpdate = true;
  }
  if (roadMat.bumpMap) {
    roadMat.bumpMap = roadMat.bumpMap.clone();
    roadMat.bumpMap.repeat.set(1, 24);
    roadMat.bumpMap.needsUpdate = true;
  }
  const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 360), roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.y = 0.032;
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // Checkpoint Concrete Apron + Curbing
  const apron = new THREE.Mesh(new THREE.BoxGeometry(38, 0.06, 54), mats.concrete);
  apron.position.set(2.5, 0.008, 0);
  apron.receiveShadow = true;
  group.add(apron);

  // Painted Stop Lines & Pedestrian Crosswalk (using polygonOffset to eliminate Z-fighting)
  const paintLineMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const yellowPaintMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  // Entry & Exit Stop Bars
  [-19.2, 16.8].forEach((sz) => {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 0.42), paintLineMat);
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(0, 0.042, sz);
    group.add(bar);
  });
  // Pedestrian walkway stripes between office door and weighbridge
  for (let i = 0; i < 6; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.28), yellowPaintMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(-5.7, 0.045, -2.5 + i * 0.52);
    group.add(stripe);
  }

  // Holding Area Painted Bay (East side: x = 13.5, z = 4)
  const holdPad = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.85, metalness: 0.05 })
  );
  holdPad.rotation.x = -Math.PI / 2;
  holdPad.position.set(13.5, 0.046, 4);
  holdPad.receiveShadow = true;
  group.add(holdPad);
  // Yellow holding bay border lines
  const hbL = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 16), yellowPaintMat);
  hbL.rotation.x = -Math.PI / 2;
  hbL.position.set(9.35, 0.05, 4);
  const hbR = hbL.clone();
  hbR.position.x = 17.65;
  group.add(hbL, hbR);

  // Instanced Concrete Jersey Barriers along approach & perimeter
  const jerseyGeo = new THREE.BoxGeometry(0.65, 0.88, 3.2);
  const jerseyInst = new THREE.InstancedMesh(jerseyGeo, mats.concreteBarrier, 20);
  const tmpDummy = new THREE.Object3D();
  let jIdx = 0;
  for (const jz of [-36, -32, -28, -24, 24, 28, 32, 36]) {
    tmpDummy.position.set(-6.1, 0.44, jz);
    tmpDummy.updateMatrix();
    jerseyInst.setMatrixAt(jIdx++, tmpDummy.matrix);
    tmpDummy.position.set(6.1, 0.44, jz);
    tmpDummy.updateMatrix();
    jerseyInst.setMatrixAt(jIdx++, tmpDummy.matrix);
  }
  jerseyInst.count = jIdx;
  jerseyInst.castShadow = true;
  jerseyInst.receiveShadow = true;
  jerseyInst.instanceMatrix.needsUpdate = true;
  jerseyInst.computeBoundingSphere();
  group.add(jerseyInst);

  // ── 2. WEIGHBRIDGE PLATFORM, CANOPY TRUSS & DIGITAL DISPLAY ────────────────
  const weighDeck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.14, 10.8), mats.hazardStripe);
  weighDeck.position.set(0, 0.04, 0);
  weighDeck.receiveShadow = true;
  const weighInner = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.155, 10.1), mats.diamondPlate);
  weighInner.position.set(0, 0.045, 0);
  weighInner.receiveShadow = true;
  group.add(weighDeck, weighInner);

  // 4 Load-cell Corner Sensor Pods
  [[-2.2, -5.0], [2.2, -5.0], [-2.2, 5.0], [2.2, 5.0]].forEach(([px, pz]) => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.22, 10), mats.structuralSteel);
    pod.position.set(px, 0.14, pz);
    group.add(pod);
  });

  // Digital Weighbridge Signboard + Guard Bollards
  const weighDisplayCanvas = document.createElement('canvas');
  weighDisplayCanvas.width = 512;
  weighDisplayCanvas.height = 256;
  const weighDisplayTex = new THREE.CanvasTexture(weighDisplayCanvas);
  weighDisplayTex.colorSpace = THREE.SRGBColorSpace;

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.55, 10), mats.structuralSteel);
  post.position.set(4.8, 1.28, 1.5);
  const boardBox = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.78, 0.28), darkHousingMat);
  boardBox.position.set(4.8, 2.65, 1.5);
  boardBox.rotation.y = -0.35;
  const boardScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.12, 1.52),
    new THREE.MeshBasicMaterial({ map: weighDisplayTex })
  );
  boardScreen.position.set(0, 0, 0.145);
  boardBox.add(boardScreen);
  tagInteractive(boardBox, 'weighbridge_terminal', '[CHECK WEIGHBRIDGE]', interactiveMeshes);
  group.add(post, boardBox);

  // Overhead Inspection Canopy with Fascia Trim & LED Floodlight Fixtures
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.42, 13.4), mats.corrugatedMetal);
  canopy.position.set(0, 5.45, 0);
  canopy.castShadow = true;
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(15.8, 0.65, 13.6), mats.structuralSteel);
  fascia.position.set(0, 5.2, 0);
  const bayBannerTex = makeRoadSignTexture(
    'INSPECTION BAY 01 · WEIGHBRIDGE',
    'KEEP CLEAR OF MOVING AXLES · MAX 40T',
    '#0f172a',
    '#eab308',
    '#facc15'
  );
  const bayBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 0.58),
    new THREE.MeshBasicMaterial({ map: bayBannerTex })
  );
  bayBanner.position.set(0, 5.2, -6.82);
  bayBanner.rotation.y = Math.PI;
  const bayBannerRear = bayBanner.clone();
  bayBannerRear.position.z = 6.82;
  bayBannerRear.rotation.y = 0;
  group.add(canopy, fascia, bayBanner, bayBannerRear);

  // Canopy Steel Support Columns with Yellow Concrete Crash Plinths
  [
    [-5.9, -4.6],
    [-5.9, 4.6],
    [5.9, -4.6],
    [5.9, 4.6],
  ].forEach(([cx, cz]) => {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.9, 10), mats.hazardStripe);
    plinth.position.set(cx, 0.45, cz);
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.42, 5.1, 0.42), mats.structuralSteel);
    col.position.set(cx, 2.6, cz);
    col.castShadow = true;
    group.add(plinth, col);
    colliders.push({ minX: cx - 0.45, maxX: cx + 0.45, minZ: cz - 0.45, maxZ: cz + 0.45 });
  });

  // 4 Overhead LED High-Bay Fixtures under Canopy
  const bayLampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  emissiveNightFixtures.push(bayLampMat);
  [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]].forEach(([lx, lz]) => {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.55), darkHousingMat);
    housing.position.set(lx, 4.92, lz);
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.04, 0.44), bayLampMat);
    diffuser.position.set(lx, 4.85, lz);
    group.add(housing, diffuser);
  });
  const bayLight = new THREE.PointLight(0xfffbeb, 2.8, 30, 1.3);
  bayLight.position.set(0, 4.75, 0);
  const holdBayLight = new THREE.PointLight(0xfef3c7, 2.2, 22, 1.35);
  holdBayLight.position.set(13.5, 4.6, 4.0);
  group.add(bayLight, holdBayLight);
  nightLights.push(bayLight, holdBayLight);

  // International Border Crossing Gantry Arch at z = -16.2
  [-5.25, 5.25].forEach((gx) => {
    const legPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.75), mats.hazardStripe);
    legPlinth.position.set(gx, 0.42, -16.2);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.46, 5.8, 0.46), mats.structuralSteel);
    leg.position.set(gx, 2.9, -16.2);
    leg.castShadow = true;
    group.add(legPlinth, leg);
    colliders.push({ minX: gx - 0.45, maxX: gx + 0.45, minZ: -16.65, maxZ: -15.75 });
  });
  const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(11.4, 1.32, 0.54), darkSlateMat);
  gantryBeam.position.set(0, 5.5, -16.2);
  gantryBeam.castShadow = true;
  group.add(gantryBeam);

  const gantryTex = makeRoadSignTexture(
    'SECTOR 7 INTERNATIONAL BORDER CHECKPOINT',
    'STOP AT GATE · WEIGHBRIDGE & CUSTOMS INSPECTION',
    '#0f172a',
    '#f59e0b',
    '#fbbf24'
  );
  const gantrySign = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 1.15), new THREE.MeshBasicMaterial({ map: gantryTex }));
  gantrySign.position.set(0, 5.5, -16.48);
  gantrySign.rotation.y = Math.PI;
  const gantrySignBack = gantrySign.clone();
  gantrySignBack.position.set(0, 5.5, -15.92);
  gantrySignBack.rotation.y = 0;
  group.add(gantrySign, gantrySignBack);

  // Pole-Mounted CCTV Cameras around checkpoint
  [
    [-5.2, 4.6, -15.9, 0.5],
    [5.2, 4.6, 16.5, -2.5],
    [5.8, 4.7, 3.8, -1.3],
  ].forEach(([cx, cy, cz, rotY]) => {
    const camGroup = new THREE.Group();
    camGroup.position.set(cx, cy, cz);
    camGroup.rotation.y = rotY;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.45), mats.structuralSteel);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.34), mats.corrugatedMetal);
    body.position.set(0, -0.06, 0.25);
    body.rotation.x = 0.4;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), darkHousingMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, -0.12, 0.42);
    camGroup.add(arm, body, lens);
    group.add(camGroup);
  });

  // Highway Streetlamps lining North/South approaches
  const lampHeadMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.7,
    roughness: 0.2,
  });
  emissiveNightFixtures.push(lampHeadMat);
  for (const [sx, sz, dir] of [
    [-6.6, -28, 1],
    [6.6, -28, -1],
    [-6.6, 26, 1],
    [6.6, 26, -1],
  ]) {
    const sPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6.2, 8), mats.structuralSteel);
    sPole.position.set(sx, 3.1, sz);
    const sArm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), mats.structuralSteel);
    sArm.position.set(sx + dir * 0.65, 6.15, sz);
    const sHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.28), darkHousingMat);
    sHead.position.set(sx + dir * 1.2, 6.1, sz);
    const sBulb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.2), lampHeadMat);
    sBulb.position.set(sx + dir * 1.2, 6.03, sz);
    group.add(sPole, sArm, sHead, sBulb);
  }

  // Instanced Orange Safety Cones with reflective white collar
  const conePositions = [
    [-3.4, -7], [-3.4, 7], [3.4, -7], [3.4, 7],
    [9.2, -2], [9.2, 10], [17.8, -2], [17.8, 10],
  ];
  const coneInst = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.2, 0.6, 10),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 }),
    conePositions.length
  );
  conePositions.forEach(([cx, cz], i) => {
    tmpDummy.position.set(cx, 0.32, cz);
    tmpDummy.rotation.set(0, 0, 0);
    tmpDummy.scale.set(1, 1, 1);
    tmpDummy.updateMatrix();
    coneInst.setMatrixAt(i, tmpDummy.matrix);
  });
  coneInst.instanceMatrix.needsUpdate = true;
  coneInst.computeBoundingSphere();
  group.add(coneInst);

  // ── 3. ENTRY GATE (z = -18) & EXIT GATE (z = +18) ──────────────────────────
  const buildGate = (gz: number, idPrefix: 'entry' | 'exit', label: string) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.18, 0.74), mats.hazardStripe);
    base.position.set(-4.6, 0.59, gz);
    base.castShadow = true;
    const baseCap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.78), mats.structuralSteel);
    baseCap.position.set(-4.6, 1.2, gz);
    group.add(base, baseCap);
    colliders.push({ minX: -5.0, maxX: -4.2, minZ: gz - 0.4, maxZ: gz + 0.4 });

    const pivot = new THREE.Group();
    pivot.position.set(-4.4, 0.98, gz);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.16, 0.16), mats.hazardStripe);
    arm.position.set(4.4, 0, 0);
    const counterWeight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.28, 0.26), darkHousingMat);
    counterWeight.position.set(-0.45, 0, 0);
    pivot.add(arm, counterWeight);
    group.add(pivot);

    // Traffic Signals
    const tPost = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 3.25, 10), mats.structuralSteel);
    tPost.position.set(4.5, 1.62, gz);
    const tBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.94, 0.34), darkHousingMat);
    tBox.position.set(4.5, 2.9, gz);
    const red = new THREE.Mesh(
      new THREE.SphereGeometry(0.125, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.5 })
    );
    red.position.set(4.5, 3.12, gz + (gz < 0 ? -0.18 : 0.18));
    const green = new THREE.Mesh(
      new THREE.SphereGeometry(0.125, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.1 })
    );
    green.position.set(4.5, 2.68, gz + (gz < 0 ? -0.18 : 0.18));
    group.add(tPost, tBox, red, green);

    // Outdoor Gate Control Pedestal
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.26, 0.52), mats.structuralSteel);
    ped.position.set(-5.6, 0.63, gz + (gz < 0 ? 1.8 : -1.8));
    const btn = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 1.0 })
    );
    btn.position.set(0, 0.35, gz < 0 ? 0.27 : -0.27);
    ped.add(btn);
    tagInteractive(ped, `${idPrefix}_gate_panel`, `[OPERATE ${label}]`, interactiveMeshes);
    group.add(ped);

    return { pivot, red, green };
  };

  const entryGate = buildGate(-18, 'entry', 'ENTRY GATE');
  const exitGate = buildGate(18, 'exit', 'EXIT GATE');

  // ── 4. MAIN BORDER POLICE CHECKPOINT OFFICE (x = -10.5, z = -4.0) ──────────
  const ox = -10.5;
  const oz = -4.0;
  const ow = 7.4;
  const oh = 3.4;
  const od = 8.4;
  const wt = 0.24;

  const offGroup = new THREE.Group();
  offGroup.position.set(ox, 0, oz);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(ow, 0.14, od), mats.officeFloor);
  floor.position.y = 0.07;
  floor.receiveShadow = true;
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(ow + 0.5, 0.28, od + 0.5), mats.corrugatedMetal);
  ceiling.position.y = oh + 0.14;
  ceiling.castShadow = true;
  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(ow + 0.58, 0.14, od + 0.58), mats.structuralSteel);
  roofTrim.position.y = oh + 0.22;
  offGroup.add(floor, ceiling, roofTrim);

  // Exterior Concrete Porch Step & Awning outside East Doorway (z = 2.15)
  const porchStep = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 2.2), mats.concrete);
  porchStep.position.set(ow * 0.5 + 0.7, 0.05, 2.15);
  porchStep.receiveShadow = true;
  const doorAwning = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 2.1), mats.structuralSteel);
  doorAwning.position.set(ow * 0.5 + 0.62, 2.62, 2.15);
  doorAwning.rotation.z = -0.12;
  // Exterior AC Condenser Unit on North Wall
  const acBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.68, 0.38), mats.corrugatedMetal);
  acBox.position.set(-1.2, 1.4, -od * 0.5 - 0.22);
  const acFan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.4, 12), darkHousingMat);
  acFan.rotation.x = Math.PI / 2;
  acFan.position.copy(acBox.position);
  offGroup.add(porchStep, doorAwning, acBox, acFan);

  const addOfficeWall = (lx: number, ly: number, lz: number, sw: number, sh: number, sd: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), mat);
    m.position.set(lx, ly, lz);
    m.receiveShadow = true;
    m.castShadow = mat !== mats.windowGlass && sh > 1.2;
    offGroup.add(m);
    if (mat !== mats.windowGlass && ly - sh * 0.5 < 1.8) {
      colliders.push({
        minX: ox + lx - sw * 0.5,
        maxX: ox + lx + sw * 0.5,
        minZ: oz + lz - sd * 0.5,
        maxZ: oz + lz + sd * 0.5,
      });
    }
  };

  // West, North, South solid walls + Interior Baseboards
  addOfficeWall(-ow * 0.5 + wt * 0.5, oh * 0.5, 0, wt, oh, od, mats.stucco);
  addOfficeWall(0, oh * 0.5, -od * 0.5 + wt * 0.5, ow, oh, wt, mats.stucco);
  addOfficeWall(0, oh * 0.5, od * 0.5 - wt * 0.5, ow, oh, wt, mats.stucco);

  // East wall overlooking checkpoint: Low brick sill + Aluminum-Framed Observation Glass + Doorway at z = +2.15
  addOfficeWall(ow * 0.5 - wt * 0.5, 0.55, -1.5, wt, 1.1, 5.4, mats.brick);
  addOfficeWall(ow * 0.5 - wt * 0.5, 2.0, -1.5, 0.06, 1.8, 5.2, mats.windowGlass);
  addOfficeWall(ow * 0.5 - wt * 0.5, 3.1, -1.5, wt, 0.6, 5.4, mats.brick);
  addOfficeWall(ow * 0.5 - wt * 0.5, oh * 0.5, 3.55, wt, oh, 1.3, mats.brick);
  addOfficeWall(ow * 0.5 - wt * 0.5, 2.85, 2.15, wt, 1.1, 1.5, mats.brick);

  // Window Sill & Vertical Aluminum Mullions (cosmetic only)
  const winSill = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 5.4), mats.structuralSteel);
  winSill.position.set(ow * 0.5 - wt * 0.5, 1.12, -1.5);
  offGroup.add(winSill);
  [-3.2, -1.5, 0.2].forEach((mz) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.08), mats.structuralSteel);
    mullion.position.set(ow * 0.5 - wt * 0.5, 2.0, mz);
    offGroup.add(mullion);
  });

  // Openable Main Office Door
  const officeDoorPivot = new THREE.Group();
  officeDoorPivot.position.set(ow * 0.5 - wt * 0.5, 0.14, 1.4);
  const oDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.16, 1.45), mats.woodPlank);
  oDoorMesh.position.set(0, 1.08, 0.72);
  const oDoorWin = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.65, 0.55), mats.windowGlass);
  oDoorWin.position.set(0, 1.55, 0.72);
  const oDoorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), mats.chrome);
  oDoorKnob.position.set(-0.07, 1.0, 1.25);
  const oDoorKnobOut = oDoorKnob.clone();
  oDoorKnobOut.position.x = 0.07;
  officeDoorPivot.add(oDoorMesh, oDoorWin, oDoorKnob, oDoorKnobOut);
  tagInteractive(oDoorMesh, 'office_door', '[OPEN/CLOSE OFFICE DOOR]', interactiveMeshes);
  offGroup.add(officeDoorPivot);

  // Officer Desk (facing window toward checkpoint)
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 3.25), mats.woodPlank);
  deskTop.position.set(1.3, 0.78, -1.5);
  const deskLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.76, 0.55), mats.woodPlank);
  deskLeftLeg.position.set(1.3, 0.38, -2.8);
  const deskRightLeg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.76, 0.55), mats.woodPlank);
  deskRightLeg.position.set(1.3, 0.38, -0.2);
  const deskBlotter = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.012, 0.92), darkHousingMat);
  deskBlotter.position.set(1.05, 0.826, -1.9);
  offGroup.add(deskTop, deskLeftLeg, deskRightLeg, deskBlotter);
  colliders.push({ minX: ox + 0.7, maxX: ox + 1.9, minZ: oz - 3.1, maxZ: oz + 0.1 });

  // 2 Openable Drawers under desk
  const drawerPivots: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  [-2.8, -0.2].forEach((dz, i) => {
    const dp = drawerPivots[i];
    dp.position.set(0.85, 0.55, dz);
    const dBox = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.24, 0.48), mats.woodPlank);
    const dHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.18), mats.chrome);
    dHandle.position.set(-0.4, 0, 0);
    dp.add(dBox, dHandle);
    tagInteractive(dBox, `drawer_${i}`, `[OPEN/CLOSE DRAWER ${i + 1}]`, interactiveMeshes);
    offGroup.add(dp);
  });

  // Computer & Arrival Notification Monitor + PC Tower on Desk
  const monitorCanvas = document.createElement('canvas');
  monitorCanvas.width = 512;
  monitorCanvas.height = 256;
  const monitorTex = new THREE.CanvasTexture(monitorCanvas);
  monitorTex.colorSpace = THREE.SRGBColorSpace;

  const pcCase = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.46, 0.09), darkHousingMat);
  pcCase.position.set(1.45, 1.1, -1.9);
  pcCase.rotation.y = -Math.PI * 0.5;
  const pcStand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), mats.structuralSteel);
  pcStand.position.set(1.45, 0.89, -1.9);
  const pcScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.41), new THREE.MeshBasicMaterial({ map: monitorTex }));
  pcScreen.position.set(0, 0, 0.052);
  pcCase.add(pcScreen);
  tagInteractive(pcCase, 'office_computer', '[USE COMPUTER]', interactiveMeshes);

  const pcTower = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.2), darkHousingMat);
  pcTower.position.set(1.42, 1.04, -2.92);
  const towerLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.18, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.8 })
  );
  towerLed.position.set(-0.215, 0.08, 0.05);
  pcTower.add(towerLed);
  offGroup.add(pcCase, pcStand, pcTower);

  // Arrival Alert Screen on North Wall
  const wallAlert = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.78, 0.08), darkSlateMat);
  wallAlert.position.set(0.2, 2.15, -od * 0.5 + 0.3);
  const wallScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.68), new THREE.MeshBasicMaterial({ map: monitorTex }));
  wallScreen.position.set(0, 0, 0.05);
  wallAlert.add(wallScreen);
  tagInteractive(wallAlert, 'ack_alarm', '[ACKNOWLEDGE ALERT]', interactiveMeshes);
  offGroup.add(wallAlert);

  // CCTV Monitor Bank on Desk
  const cctvBox = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.4, 0.09), darkHousingMat);
  cctvBox.position.set(1.45, 1.06, -0.95);
  cctvBox.rotation.y = -Math.PI * 0.42;
  const cctvScreenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0ea5e9, emissiveIntensity: 0.55 });
  const cctvGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.33), cctvScreenMat);
  cctvGlass.position.set(0, 0, 0.052);
  cctvBox.add(cctvGlass);
  tagInteractive(cctvBox, 'office_cctv', '[TURN ON CCTV]', interactiveMeshes);
  offGroup.add(cctvBox);

  // Radio Communication Unit with Whip Antenna
  const radioUnit = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.36), darkSlateMat);
  radioUnit.position.set(1.25, 0.91, -2.55);
  const radioLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.8 })
  );
  radioLed.position.set(-0.16, 0.04, 0);
  const radioAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.42, 6), mats.chrome);
  radioAnt.position.set(0.1, 0.28, -0.1);
  radioUnit.add(radioLed, radioAnt);
  tagInteractive(radioUnit, 'office_radio', '[USE RADIO]', interactiveMeshes);
  offGroup.add(radioUnit);

  // Telephone
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.28), darkHousingMat);
  phone.position.set(1.15, 0.87, -0.35);
  const handset = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.24), darkSlateMat);
  handset.position.set(-0.06, 0.06, 0);
  phone.add(handset);
  tagInteractive(phone, 'office_phone', '[USE TELEPHONE]', interactiveMeshes);
  offGroup.add(phone);

  // Inspection Reports Folder on Desk
  const reportBinder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.24), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 }));
  reportBinder.position.set(1.0, 0.84, -1.45);
  tagInteractive(reportBinder, 'office_report', '[PICK UP REPORT]', interactiveMeshes);
  offGroup.add(reportBinder);

  // Active Driver Documents Stack on Desk
  const docFolder = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.22), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.55 }));
  docFolder.position.set(0.95, 0.84, -1.05);
  docFolder.rotation.y = 0.2;
  tagInteractive(docFolder, 'office_docs', '[CHECK DOCUMENT]', interactiveMeshes);
  offGroup.add(docFolder);

  // Portable Vehicle Inspection Lens Kit on Desk
  const lensKit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.18, 12),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.75, metalness: 0.5, roughness: 0.25 })
  );
  lensKit.rotation.z = Math.PI / 2;
  lensKit.position.set(1.02, 0.89, -0.68);
  tagInteractive(lensKit, 'office_lens_kit', '[USE LENS]', interactiveMeshes);
  offGroup.add(lensKit);

  // Office Gate Control Panel (by the window/door)
  const gatePanel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.72), mats.structuralSteel);
  gatePanel.position.set(ow * 0.5 - 0.32, 1.35, 0.5);
  const entryBtn = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.16, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 1.1 })
  );
  entryBtn.position.set(-0.08, 0.1, -0.15);
  tagInteractive(entryBtn, 'entry_gate_panel', '[OPEN ENTRY GATE]', interactiveMeshes);
  const exitBtn = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.16, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 1.1 })
  );
  exitBtn.position.set(-0.08, 0.1, 0.15);
  tagInteractive(exitBtn, 'exit_gate_panel', '[OPEN EXIT GATE]', interactiveMeshes);
  const lightSwitch = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.14, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0xfef08a, emissiveIntensity: 0.5 })
  );
  lightSwitch.position.set(-0.08, -0.15, 0);
  tagInteractive(lightSwitch, 'office_light_switch', '[TURN OFF LIGHT]', interactiveMeshes);
  gatePanel.add(entryBtn, exitBtn, lightSwitch);
  offGroup.add(gatePanel);

  // Executive Swivel Office Chair with Armrests & Chrome Base
  const chairGroup = new THREE.Group();
  chairGroup.position.set(0.25, 0, -1.5);
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.52, metalness: 0.1 });
  const cStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.36, 8), mats.chrome);
  cStem.position.y = 0.22;
  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.05, 5), mats.chrome);
  cBase.position.y = 0.12;
  const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.56), leatherMat);
  cSeat.position.y = 0.44;
  const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.64, 0.52), leatherMat);
  cBack.position.set(-0.23, 0.8, 0);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.06), darkHousingMat);
  armL.position.set(-0.04, 0.62, -0.26);
  const armR = armL.clone();
  armR.position.z = 0.26;
  chairGroup.add(cStem, cBase, cSeat, cBack, armL, armR);
  tagInteractive(cSeat, 'office_chair', '[SIT ON CHAIR]', interactiveMeshes);
  offGroup.add(chairGroup);

  // Storage Cabinets along West Wall + Wall Fire Extinguisher
  [-2.6, -1.0].forEach((cz) => {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.72, 2.05, 1.32), mats.corrugatedMetal);
    cab.position.set(-ow * 0.5 + 0.65, 1.02, cz);
    offGroup.add(cab);
    colliders.push({ minX: ox - ow * 0.5 + 0.2, maxX: ox - ow * 0.5 + 1.05, minZ: oz + cz - 0.65, maxZ: oz + cz + 0.65 });
  });
  const extBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.52, 10),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.4 })
  );
  extBody.position.set(-ow * 0.5 + 0.38, 1.25, 2.4);
  offGroup.add(extBody);

  // Crisp Dial Wall Clock
  const clockCanvas = document.createElement('canvas');
  clockCanvas.width = 256;
  clockCanvas.height = 256;
  const cCtx = clockCanvas.getContext('2d')!;
  cCtx.fillStyle = '#f8fafc';
  cCtx.beginPath();
  cCtx.arc(128, 128, 122, 0, Math.PI * 2);
  cCtx.fill();
  cCtx.strokeStyle = '#0f172a';
  cCtx.lineWidth = 8;
  cCtx.stroke();
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    cCtx.beginPath();
    cCtx.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92);
    cCtx.lineTo(128 + Math.sin(a) * 110, 128 - Math.cos(a) * 110);
    cCtx.lineWidth = h % 3 === 0 ? 6 : 3;
    cCtx.stroke();
  }
  const clockTex = new THREE.CanvasTexture(clockCanvas);
  clockTex.colorSpace = THREE.SRGBColorSpace;

  const clockGroup = new THREE.Group();
  clockGroup.position.set(-1.5, 2.25, -od * 0.5 + 0.28);
  const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 20), darkHousingMat);
  clockRim.rotation.x = Math.PI / 2;
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.29, 20), new THREE.MeshStandardMaterial({ map: clockTex }));
  clockFace.position.z = 0.036;
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.02), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  hourHand.position.set(0, 0.05, 0.05);
  const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.2, 0.02), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  minuteHand.position.set(0, 0.08, 0.055);
  const secondHand = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.22, 0.02), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
  secondHand.position.set(0, 0.09, 0.06);
  clockGroup.add(clockRim, clockFace, hourHand, minuteHand, secondHand);
  offGroup.add(clockGroup);

  // Office Ceiling Fluorescent Light Fixture + PointLight
  const officeTubeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff7ed,
    emissiveIntensity: 1.1,
  });
  const tubeFixture = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.35), officeTubeMat);
  tubeFixture.position.set(0, oh - 0.04, -0.5);
  offGroup.add(tubeFixture);
  const officeLamp = new THREE.PointLight(0xffedd5, 1.5, 15, 1.35);
  officeLamp.position.set(0, 3.0, -0.5);
  offGroup.add(officeLamp);
  nightLights.push(officeLamp);

  // Desk Keyboard, Mouse & Officer Coffee Mug
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.46), darkHousingMat);
  kb.position.set(1.08, 0.835, -1.9);
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.06), darkHousingMat);
  mouse.position.set(1.08, 0.835, -1.56);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.11, 12), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25 }));
  mug.position.set(0.95, 0.88, -2.32);
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), new THREE.MeshStandardMaterial({ color: 0x3b1e08, roughness: 0.15 }));
  coffee.position.set(0, 0.048, 0);
  mug.add(coffee);
  tagInteractive(mug, 'office_coffee', '[DRINK COFFEE]', interactiveMeshes);
  offGroup.add(kb, mouse, mug);

  // Wall Corkboard: BOLO / Checkpoint Rules & Active Alerts
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 512;
  boardCanvas.height = 256;
  const bCtx = boardCanvas.getContext('2d')!;
  bCtx.fillStyle = '#78553a';
  bCtx.fillRect(0, 0, 512, 256);
  bCtx.strokeStyle = '#3f2a1d';
  bCtx.lineWidth = 10;
  bCtx.strokeRect(5, 5, 502, 246);
  bCtx.fillStyle = '#fef3c7';
  bCtx.fillRect(24, 24, 210, 200);
  bCtx.fillStyle = '#fee2e2';
  bCtx.fillRect(264, 24, 224, 200);
  bCtx.fillStyle = '#0f172a';
  bCtx.font = 'bold 20px monospace';
  bCtx.fillText('CHECKPOINT ORDERS', 36, 54);
  bCtx.font = '16px monospace';
  bCtx.fillText('DATE: 2026-11-26', 36, 84);
  bCtx.fillText('1. CHECK WEIGHBRIDGE', 36, 114);
  bCtx.fillText('2. VERIFY DRIVER ID', 36, 142);
  bCtx.fillText('3. [L] LENS & CARGO', 36, 170);
  bCtx.fillStyle = '#991b1b';
  bCtx.font = 'bold 20px monospace';
  bCtx.fillText('BOLO / WATCHLIST', 278, 54);
  bCtx.font = '15px monospace';
  bCtx.fillText('UNDECLARED CRATES', 278, 86);
  bCtx.fillText('TAMPERED SEALS', 278, 114);
  bCtx.fillText('OVERWEIGHT AXLES', 278, 142);
  bCtx.fillText('CALL POLICE [RADIO]', 278, 172);
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  const bulletin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.78, 0.05), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.78 }));
  bulletin.position.set(-1.7, 1.85, od * 0.5 - 0.28);
  bulletin.rotation.y = Math.PI;
  tagInteractive(bulletin, 'office_bulletin', '[VIEW BOLO & RULES BOARD]', interactiveMeshes);
  offGroup.add(bulletin);

  group.add(offGroup);

  // East-Side Customs Inspection Warehouse Shed (behind holding bay)
  const shedGroup = new THREE.Group();
  shedGroup.position.set(22.5, 0, 4);
  const shedBody = new THREE.Mesh(new THREE.BoxGeometry(5.6, 4.2, 11), mats.corrugatedMetal);
  shedBody.position.y = 2.1;
  shedBody.castShadow = true;
  shedBody.receiveShadow = true;
  const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.35, 11.6), mats.structuralSteel);
  shedRoof.position.y = 4.35;
  const shedDoor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.3, 4.2), mats.hazardStripe);
  shedDoor.position.set(-2.8, 1.65, 0);
  shedGroup.add(shedBody, shedRoof, shedDoor);
  group.add(shedGroup);
  colliders.push({ minX: 19.6, maxX: 25.4, minZ: -1.6, maxZ: 9.6 });

  // Stationed Guard Sentries
  const sentry1 = createCharacterMesh('border_officer', 'Guard Viktor', 201);
  sentry1.root.position.set(-6.4, 0, -15.5);
  sentry1.root.rotation.y = 1.1;
  const sentry2 = createCharacterMesh('border_officer', 'Guard Elena', 202);
  sentry2.root.position.set(6.4, 0, 16.5);
  sentry2.root.rotation.y = -1.2;
  group.add(sentry1.root, sentry2.root);
  const sentries: CharacterRig[] = [sentry1, sentry2];

  // ── 5. 4-LEGGED LATTICE WATCHTOWERS, SECURITY FENCING & ALPINE NATURE ─────
  [[-15.5, -24], [14.5, 24]].forEach(([tx, tz]) => {
    const tower = new THREE.Group();
    tower.position.set(tx, 0, tz);
    for (const [lx, lz] of [[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 7.2, 0.2), mats.structuralSteel);
      leg.position.set(lx, 3.6, lz);
      leg.castShadow = true;
      tower.add(leg);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.22, 3.1), mats.structuralSteel);
    deck.position.y = 7.2;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.35, 2.5), mats.woodPlank);
    cabin.position.y = 7.98;
    const glassBand = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.85, 2.42), mats.windowGlass);
    glassBand.position.y = 9.05;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.9, 4), mats.corrugatedMetal);
    roof.position.y = 9.95;
    roof.rotation.y = Math.PI / 4;
    tower.add(deck, cabin, glassBand, roof);
    group.add(tower);
  });

  // Perimeter Boundary Fence Posts & Top Rail (Instanced)
  const fenceGeo = new THREE.BoxGeometry(0.18, 2.4, 0.18);
  const fenceInst = new THREE.InstancedMesh(fenceGeo, mats.structuralSteel, 80);
  let fIdx = 0;
  for (let z = -34; z <= 34; z += 4.5) {
    if (fIdx < 80) {
      tmpDummy.position.set(-20, 1.2, z);
      tmpDummy.rotation.set(0, 0, 0);
      tmpDummy.scale.set(1, 1, 1);
      tmpDummy.updateMatrix();
      fenceInst.setMatrixAt(fIdx++, tmpDummy.matrix);
    }
    if (fIdx < 80) {
      tmpDummy.position.set(27, 1.2, z);
      tmpDummy.updateMatrix();
      fenceInst.setMatrixAt(fIdx++, tmpDummy.matrix);
    }
  }
  fenceInst.count = fIdx;
  fenceInst.instanceMatrix.needsUpdate = true;
  fenceInst.computeBoundingSphere();
  group.add(fenceInst);

  // Multi-Tier Alpine Pine Forest with Natural Tint & Scale Variation
  const treeCount = vegetationQuality === 'low' ? 95 : vegetationQuality === 'medium' ? 165 : 260;
  const trunkInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.16, 0.28, 2.5, 7),
    mats.bark,
    treeCount
  );
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0.02 });
  const tier1Inst = new THREE.InstancedMesh(new THREE.ConeGeometry(1.95, 3.2, 7), foliageMat, treeCount);
  const tier2Inst = new THREE.InstancedMesh(new THREE.ConeGeometry(1.48, 2.9, 7), foliageMat, treeCount);
  const tier3Inst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.95, 2.4, 7), foliageMat, treeCount);

  const treePalette = [
    new THREE.Color(0x1f3a24),
    new THREE.Color(0x27472a),
    new THREE.Color(0x2f5230),
    new THREE.Color(0x1b3220),
  ];
  let placed = 0;
  for (let i = 0; i < treeCount * 3 && placed < treeCount; i++) {
    const tx = (Math.random() - 0.5) * 320;
    const tz = (Math.random() - 0.5) * 320;
    if (Math.abs(tx) < 30 && Math.abs(tz) < 46) continue;
    if (Math.abs(tx) < 11) continue;
    const sc = 0.82 + Math.random() * 0.55;
    const yaw = Math.random() * Math.PI * 2;
    const tint = treePalette[placed % treePalette.length];

    tmpDummy.rotation.set(0, yaw, 0);
    tmpDummy.scale.set(sc, sc, sc);

    tmpDummy.position.set(tx, 1.25 * sc, tz);
    tmpDummy.updateMatrix();
    trunkInst.setMatrixAt(placed, tmpDummy.matrix);

    tmpDummy.position.set(tx, 3.2 * sc, tz);
    tmpDummy.updateMatrix();
    tier1Inst.setMatrixAt(placed, tmpDummy.matrix);
    tier1Inst.setColorAt(placed, tint);

    tmpDummy.position.set(tx, 4.95 * sc, tz);
    tmpDummy.updateMatrix();
    tier2Inst.setMatrixAt(placed, tmpDummy.matrix);
    tier2Inst.setColorAt(placed, tint);

    tmpDummy.position.set(tx, 6.45 * sc, tz);
    tmpDummy.updateMatrix();
    tier3Inst.setMatrixAt(placed, tmpDummy.matrix);
    tier3Inst.setColorAt(placed, tint);

    placed++;
  }
  [trunkInst, tier1Inst, tier2Inst, tier3Inst].forEach((inst) => {
    inst.count = placed;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });

  // Alpine Boulder Outcrops (InstancedMesh)
  const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const rockInst = new THREE.InstancedMesh(
    rockGeo,
    new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.92, flatShading: true }),
    40
  );
  let rPlaced = 0;
  for (let i = 0; i < 90 && rPlaced < 40; i++) {
    const rx = (Math.random() - 0.5) * 240;
    const rz = (Math.random() - 0.5) * 240;
    if (Math.abs(rx) < 28 && Math.abs(rz) < 42) continue;
    if (Math.abs(rx) < 12) continue;
    const s = 0.6 + Math.random() * 1.6;
    tmpDummy.position.set(rx, s * 0.45, rz);
    tmpDummy.rotation.set(Math.random(), Math.random(), Math.random());
    tmpDummy.scale.set(s * 1.3, s * 0.75, s);
    tmpDummy.updateMatrix();
    rockInst.setMatrixAt(rPlaced++, tmpDummy.matrix);
  }
  rockInst.count = rPlaced;
  rockInst.instanceMatrix.needsUpdate = true;
  rockInst.computeBoundingSphere();
  group.add(rockInst);

  // Snow-Capped Distant Mountain Ring (Vertex-colored rock-to-snow altitude gradient)
  const mtnGeo = new THREE.ConeGeometry(34, 34, 7, 3);
  const mPos = mtnGeo.attributes.position as THREE.BufferAttribute;
  const mCols = new Float32Array(mPos.count * 3);
  const mBaseCol = new THREE.Color(0x3a434e);
  const mMidCol = new THREE.Color(0x525d6b);
  const mSnowCol = new THREE.Color(0xeef2f6);
  for (let i = 0; i < mPos.count; i++) {
    const py = mPos.getY(i);
    // Subtle ridge jitter on non-pole vertices
    const px = mPos.getX(i);
    const pz = mPos.getZ(i);
    if (py < 16 && py > -16) {
      const jitter = 1 + 0.14 * Math.sin(px * 0.35 + pz * 0.25);
      mPos.setX(i, px * jitter);
      mPos.setZ(i, pz * jitter);
    }
    const hNorm = THREE.MathUtils.clamp((py + 17) / 34, 0, 1);
    if (hNorm < 0.62) tmpC.copy(mBaseCol).lerp(mMidCol, hNorm / 0.62);
    else tmpC.copy(mMidCol).lerp(mSnowCol, Math.min(1, (hNorm - 0.62) / 0.22));
    mCols[i * 3] = tmpC.r;
    mCols[i * 3 + 1] = tmpC.g;
    mCols[i * 3 + 2] = tmpC.b;
  }
  mtnGeo.setAttribute('color', new THREE.BufferAttribute(mCols, 3));
  mtnGeo.computeVertexNormals();

  const mountainInst = new THREE.InstancedMesh(
    mtnGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
    24
  );
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const rad = 165 + (i % 3) * 18;
    const hScale = 0.85 + (i % 4) * 0.35;
    const rScale = 0.95 + (i % 3) * 0.26;
    tmpDummy.position.set(Math.cos(ang) * rad, 14.5 * hScale, Math.sin(ang) * rad);
    tmpDummy.rotation.set(0, i * 0.85, 0);
    tmpDummy.scale.set(rScale, hScale, rScale);
    tmpDummy.updateMatrix();
    mountainInst.setMatrixAt(i, tmpDummy.matrix);
  }
  mountainInst.instanceMatrix.needsUpdate = true;
  mountainInst.computeBoundingSphere();
  group.add(mountainInst);

  // Glowing Solar / Lunar Disc (sky dome shader draws atmospheric halo around it!)
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 20),
    new THREE.MeshBasicMaterial({ color: 0xfef9c3, fog: false, side: THREE.DoubleSide })
  );
  sunDisc.position.set(45, 70, 35);
  group.add(sunDisc);

  const refs: CheckpointWorldRefs = {
    group,
    colliders,
    interactiveMeshes,
    officeDoorPivot,
    drawerPivots,
    entryBarrierPivot: entryGate.pivot,
    exitBarrierPivot: exitGate.pivot,
    entryLights: { red: entryGate.red, green: entryGate.green },
    exitLights: { red: exitGate.red, green: exitGate.green },
    clockHands: { hour: hourHand, minute: minuteHand, second: secondHand },
    weighDisplayCanvas,
    weighDisplayTex,
    monitorCanvas,
    monitorTex,
    nightLights,
    officeLamp,
    cctvScreenMat,
    roadMesh,
    sunDisc,
    sentries,
    emissiveNightFixtures,
  };

  updateWeighbridgeSign(refs, null, null);
  updateOfficeMonitorScreen(refs, null, false);
  return refs;
}
