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
  roadMesh: THREE.Mesh;
  sunDisc: THREE.Mesh;
  sentries: CharacterRig[];
}

export function updateWeighbridgeSign(
  refs: CheckpointWorldRefs,
  currentKg: number | null,
  permittedKg: number | null,
  reg?: string
) {
  const ctx = refs.weighDisplayCanvas.getContext('2d')!;
  ctx.fillStyle = '#090d16';
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
  ctx.fillStyle = alarmActive ? '#2a0c0c' : '#0b1622';
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

export function buildCheckpointFacility(
  mats: ProceduralMaterialSet,
  vegetationQuality: 'low' | 'medium' | 'high'
): CheckpointWorldRefs {
  const group = new THREE.Group();
  const colliders: ColliderBox[] = [];
  const interactiveMeshes: THREE.Object3D[] = [];
  const nightLights: THREE.PointLight[] = [];

  // ── 1. GROUND TERRAIN, DISTANT HILLS & HIGHWAY ─────────────────────────────
  const groundGeo = new THREE.PlaneGeometry(360, 360, 24, 24);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(posAttr.count * 3);
  const cGrass = new THREE.Color(0x4b5c37);
  const cHill = new THREE.Color(0x635d4f);
  const tmpC = new THREE.Color();
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const dist = Math.hypot(vx, vz);
    let vy = 0;
    if (dist > 55 && Math.abs(vx) > 16) {
      vy = Math.sin(vx * 0.04) * Math.cos(vz * 0.04) * 3.5 + Math.max(0, (dist - 85) * 0.12);
    }
    posAttr.setY(i, vy);
    tmpC.copy(cGrass).lerp(cHill, Math.min(1, vy / 8));
    cols[i * 3] = tmpC.r;
    cols[i * 3 + 1] = tmpC.g;
    cols[i * 3 + 2] = tmpC.b;
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  groundGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(groundGeo, mats.terrainGrass);
  terrain.receiveShadow = true;
  group.add(terrain);

  // Main North-South Highway & Checkpoint Yard
  const roadMat = mats.asphalt.clone();
  if (roadMat.map) {
    roadMat.map = roadMat.map.clone();
    roadMat.map.repeat.set(1, 20);
    roadMat.map.needsUpdate = true;
  }
  const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(11, 320), roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.y = 0.03;
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // Checkpoint Concrete Apron + Holding Bay Pad
  const apron = new THREE.Mesh(new THREE.BoxGeometry(36, 0.06, 52), mats.concrete);
  apron.position.set(2, 0.01, 0);
  apron.receiveShadow = true;
  group.add(apron);

  // Holding Area Painted Bay (East side: x = 13.5, z = 4)
  const darkHousingMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
  const holdPad = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 16),
    new THREE.MeshLambertMaterial({ color: 0x3f3f46 })
  );
  holdPad.rotation.x = -Math.PI / 2;
  holdPad.position.set(13.5, 0.05, 4);
  group.add(holdPad);

  // ── 2. WEIGHBRIDGE PLATFORM & DIGITAL DISPLAY ──────────────────────────────
  const weighDeck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, 10.5), mats.hazardStripe);
  weighDeck.position.set(0, 0.04, 0);
  weighDeck.receiveShadow = true;
  const weighInner = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.15, 9.8),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.55, metalness: 0.45 })
  );
  weighInner.position.set(0, 0.045, 0);
  group.add(weighDeck, weighInner);

  // Digital Weighbridge Signboard
  const weighDisplayCanvas = document.createElement('canvas');
  weighDisplayCanvas.width = 512;
  weighDisplayCanvas.height = 256;
  const weighDisplayTex = new THREE.CanvasTexture(weighDisplayCanvas);
  weighDisplayTex.colorSpace = THREE.SRGBColorSpace;

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.5, 7), mats.corrugatedMetal);
  post.position.set(4.8, 1.25, 1.5);
  const boardBox = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.7, 0.25), darkHousingMat);
  boardBox.position.set(4.8, 2.6, 1.5);
  boardBox.rotation.y = -0.35;
  const boardScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.05, 1.48),
    new THREE.MeshBasicMaterial({ map: weighDisplayTex })
  );
  boardScreen.position.set(0, 0, 0.14);
  boardBox.add(boardScreen);
  tagInteractive(boardBox, 'weighbridge_terminal', '[CHECK WEIGHBRIDGE]', interactiveMeshes);
  group.add(post, boardBox);

  // Overhead Inspection Canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(15, 0.55, 13), mats.corrugatedMetal);
  canopy.position.set(0, 5.4, 0);
  canopy.castShadow = true;
  group.add(canopy);
  [-5.8, 5.8].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 5.4, 7), mats.concrete);
    col.position.set(cx, 2.7, 0);
    group.add(col);
    colliders.push({ minX: cx - 0.35, maxX: cx + 0.35, minZ: -0.35, maxZ: 0.35 });
  });
  const bayLight = new THREE.PointLight(0xfffbeb, 0.5, 22, 1.4);
  bayLight.position.set(0, 4.9, 0);
  group.add(bayLight);
  nightLights.push(bayLight);

  // International Border Crossing Gantry Arch at z = -16.2
  const gantryMat = mats.corrugatedMetal;
  [-5.2, 5.2].forEach((gx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.8, 0.45), gantryMat);
    leg.position.set(gx, 2.9, -16.2);
    leg.castShadow = true;
    group.add(leg);
    colliders.push({ minX: gx - 0.35, maxX: gx + 0.35, minZ: -16.55, maxZ: -15.85 });
  });
  const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(11.2, 1.25, 0.48), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
  gantryBeam.position.set(0, 5.5, -16.2);
  group.add(gantryBeam);
  const gantryCanvas = document.createElement('canvas');
  gantryCanvas.width = 512;
  gantryCanvas.height = 64;
  const gCtx = gantryCanvas.getContext('2d')!;
  gCtx.fillStyle = '#0f172a';
  gCtx.fillRect(0, 0, 512, 64);
  gCtx.strokeStyle = '#f59e0b';
  gCtx.lineWidth = 3;
  gCtx.strokeRect(2, 2, 508, 60);
  gCtx.fillStyle = '#fbbf24';
  gCtx.font = 'bold 19px sans-serif';
  gCtx.textAlign = 'center';
  gCtx.fillText('SECTOR 7 INTERNATIONAL BORDER CHECKPOINT', 256, 28);
  gCtx.fillStyle = '#f8fafc';
  gCtx.font = 'bold 13px monospace';
  gCtx.fillText('STOP AT GATE · WEIGHBRIDGE & CUSTOMS INSPECTION', 256, 49);
  const gantryTex = new THREE.CanvasTexture(gantryCanvas);
  gantryTex.colorSpace = THREE.SRGBColorSpace;
  const gantrySign = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 1.12), new THREE.MeshBasicMaterial({ map: gantryTex }));
  gantrySign.position.set(0, 5.5, -16.46);
  gantrySign.rotation.y = Math.PI;
  const gantrySignBack = gantrySign.clone();
  gantrySignBack.position.set(0, 5.5, -15.94);
  gantrySignBack.rotation.y = 0;
  group.add(gantrySign, gantrySignBack);

  // Instanced Orange Safety Cones (1 draw call)
  const conePositions = [
    [-3.4, -7], [-3.4, 7], [3.4, -7], [3.4, 7],
    [9.2, -2], [9.2, 10], [17.8, -2], [17.8, 10],
  ];
  const coneInst = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.18, 0.55, 7),
    new THREE.MeshLambertMaterial({ color: 0xf97316 }),
    conePositions.length
  );
  const tmpDummy = new THREE.Object3D();
  conePositions.forEach(([cx, cz], i) => {
    tmpDummy.position.set(cx, 0.3, cz);
    tmpDummy.updateMatrix();
    coneInst.setMatrixAt(i, tmpDummy.matrix);
  });
  coneInst.instanceMatrix.needsUpdate = true;
  coneInst.computeBoundingSphere();
  group.add(coneInst);

  // ── 3. ENTRY GATE (z = -18) & EXIT GATE (z = +18) ──────────────────────────
  const buildGate = (gz: number, idPrefix: 'entry' | 'exit', label: string) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.15, 0.7), mats.hazardStripe);
    base.position.set(-4.6, 0.58, gz);
    group.add(base);
    colliders.push({ minX: -5.0, maxX: -4.2, minZ: gz - 0.4, maxZ: gz + 0.4 });

    const pivot = new THREE.Group();
    pivot.position.set(-4.4, 0.98, gz);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.16, 0.16), mats.hazardStripe);
    arm.position.set(4.4, 0, 0);
    pivot.add(arm);
    group.add(pivot);

    // Warning Traffic Lights
    const tPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), mats.corrugatedMetal);
    tPost.position.set(4.5, 1.6, gz);
    const tBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.32), new THREE.MeshStandardMaterial({ color: 0x18181b }));
    tBox.position.set(4.5, 2.9, gz);
    const red = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.2 })
    );
    red.position.set(4.5, 3.12, gz + (gz < 0 ? -0.17 : 0.17));
    const green = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.1 })
    );
    green.position.set(4.5, 2.7, gz + (gz < 0 ? -0.17 : 0.17));
    group.add(tPost, tBox, red, green);

    // Outdoor Gate Control Pedestal
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.25, 0.5), mats.corrugatedMetal);
    ped.position.set(-5.6, 0.62, gz + (gz < 0 ? 1.8 : -1.8));
    const btn = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.8 })
    );
    btn.position.set(0, 0.35, gz < 0 ? 0.26 : -0.26);
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

  const floor = new THREE.Mesh(new THREE.BoxGeometry(ow, 0.14, od), mats.concrete);
  floor.position.y = 0.07;
  floor.receiveShadow = true;
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(ow + 0.4, 0.26, od + 0.4), mats.corrugatedMetal);
  ceiling.position.y = oh + 0.13;
  ceiling.castShadow = true;
  offGroup.add(floor, ceiling);

  const addOfficeWall = (lx: number, ly: number, lz: number, sw: number, sh: number, sd: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), mat);
    m.position.set(lx, ly, lz);
    m.receiveShadow = true;
    m.castShadow = mat !== mats.glass && sh > 1.2;
    offGroup.add(m);
    // Only add ground-level 2D colliders for walls below head height (so overhead door/window lintels stay passable)
    if (mat !== mats.glass && ly - sh * 0.5 < 1.8) {
      colliders.push({
        minX: ox + lx - sw * 0.5,
        maxX: ox + lx + sw * 0.5,
        minZ: oz + lz - sd * 0.5,
        maxZ: oz + lz + sd * 0.5,
      });
    }
  };

  // West, North, South solid walls
  addOfficeWall(-ow * 0.5 + wt * 0.5, oh * 0.5, 0, wt, oh, od, mats.stucco);
  addOfficeWall(0, oh * 0.5, -od * 0.5 + wt * 0.5, ow, oh, wt, mats.stucco);
  addOfficeWall(0, oh * 0.5, od * 0.5 - wt * 0.5, ow, oh, wt, mats.stucco);

  // East wall overlooking checkpoint: Low sill + Large Glass Window + Doorway at z = +2.2
  // Doorway from z=1.4 to z=2.9 (width 1.5m)
  addOfficeWall(ow * 0.5 - wt * 0.5, 0.55, -1.5, wt, 1.1, 5.4, mats.brick);
  addOfficeWall(ow * 0.5 - wt * 0.5, 2.0, -1.5, 0.06, 1.8, 5.2, mats.glass);
  addOfficeWall(ow * 0.5 - wt * 0.5, 3.1, -1.5, wt, 0.6, 5.4, mats.brick);
  addOfficeWall(ow * 0.5 - wt * 0.5, oh * 0.5, 3.55, wt, oh, 1.3, mats.brick);
  addOfficeWall(ow * 0.5 - wt * 0.5, 2.85, 2.15, wt, 1.1, 1.5, mats.brick);

  // Openable Main Office Door
  const officeDoorPivot = new THREE.Group();
  officeDoorPivot.position.set(ow * 0.5 - wt * 0.5, 0.14, 1.4);
  const oDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.16, 1.45), mats.woodPlank);
  oDoorMesh.position.set(0, 1.08, 0.72);
  const oDoorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), mats.chrome);
  oDoorKnob.position.set(-0.07, 1.0, 1.25);
  officeDoorPivot.add(oDoorMesh, oDoorKnob);
  tagInteractive(oDoorMesh, 'office_door', '[OPEN/CLOSE OFFICE DOOR]', interactiveMeshes);
  offGroup.add(officeDoorPivot);

  // Officer Desk (facing window toward checkpoint)
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 3.2), mats.woodPlank);
  deskTop.position.set(1.3, 0.78, -1.5);
  const deskLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.76, 0.55), mats.woodPlank);
  deskLeftLeg.position.set(1.3, 0.38, -2.8);
  const deskRightLeg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.76, 0.55), mats.woodPlank);
  deskRightLeg.position.set(1.3, 0.38, -0.2);
  offGroup.add(deskTop, deskLeftLeg, deskRightLeg);
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

  // Computer & Arrival Notification Monitor on Desk
  const monitorCanvas = document.createElement('canvas');
  monitorCanvas.width = 512;
  monitorCanvas.height = 256;
  const monitorTex = new THREE.CanvasTexture(monitorCanvas);
  monitorTex.colorSpace = THREE.SRGBColorSpace;

  const pcCase = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.1), new THREE.MeshStandardMaterial({ color: 0x18181b }));
  pcCase.position.set(1.45, 1.08, -1.9);
  pcCase.rotation.y = -Math.PI * 0.5;
  const pcScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshBasicMaterial({ map: monitorTex }));
  pcScreen.position.set(0, 0, 0.06);
  pcCase.add(pcScreen);
  tagInteractive(pcCase, 'office_computer', '[USE COMPUTER]', interactiveMeshes);
  offGroup.add(pcCase);

  // Arrival Alert Screen on North Wall
  const wallAlert = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.08), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  wallAlert.position.set(0.2, 2.15, -od * 0.5 + 0.3);
  const wallScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.66), new THREE.MeshBasicMaterial({ map: monitorTex }));
  wallScreen.position.set(0, 0, 0.05);
  wallAlert.add(wallScreen);
  tagInteractive(wallAlert, 'ack_alarm', '[ACKNOWLEDGE ALERT]', interactiveMeshes);
  offGroup.add(wallAlert);

  // CCTV Monitor Bank on Desk
  const cctvBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.1), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  cctvBox.position.set(1.45, 1.05, -0.95);
  cctvBox.rotation.y = -Math.PI * 0.42;
  const cctvGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0ea5e9, emissiveIntensity: 0.45 })
  );
  cctvGlass.position.set(0, 0, 0.06);
  cctvBox.add(cctvGlass);
  tagInteractive(cctvBox, 'office_cctv', '[VIEW CCTV CAMERAS]', interactiveMeshes);
  offGroup.add(cctvBox);

  // Radio Communication Unit
  const radioUnit = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.36), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  radioUnit.position.set(1.25, 0.91, -2.55);
  const radioLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.5 })
  );
  radioLed.position.set(-0.16, 0.04, 0);
  radioUnit.add(radioLed);
  tagInteractive(radioUnit, 'office_radio', '[ANSWER RADIO / POLICE BACKUP]', interactiveMeshes);
  offGroup.add(radioUnit);

  // Telephone
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.28), new THREE.MeshStandardMaterial({ color: 0x27272a }));
  phone.position.set(1.15, 0.87, -0.35);
  tagInteractive(phone, 'office_phone', '[ANSWER TELEPHONE]', interactiveMeshes);
  offGroup.add(phone);

  // Inspection Reports Folder on Desk
  const reportBinder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.24), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
  reportBinder.position.set(1.0, 0.84, -1.45);
  tagInteractive(reportBinder, 'office_report', '[OPEN INSPECTION REPORT]', interactiveMeshes);
  offGroup.add(reportBinder);

  // Office Gate Control Panel (by the window/door)
  const gatePanel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.7), mats.corrugatedMetal);
  gatePanel.position.set(ow * 0.5 - 0.32, 1.35, 0.5);
  const entryBtn = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.16, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.9 })
  );
  entryBtn.position.set(-0.08, 0.1, -0.15);
  tagInteractive(entryBtn, 'entry_gate_panel', '[OPERATE ENTRY GATE]', interactiveMeshes);
  const exitBtn = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.16, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.9 })
  );
  exitBtn.position.set(-0.08, 0.1, 0.15);
  tagInteractive(exitBtn, 'exit_gate_panel', '[OPERATE EXIT GATE]', interactiveMeshes);
  gatePanel.add(entryBtn, exitBtn);
  offGroup.add(gatePanel);

  // Office Chair
  const chairGroup = new THREE.Group();
  chairGroup.position.set(0.25, 0, -1.5);
  const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.55), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  cSeat.position.y = 0.34;
  const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.58, 0.55), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  cBack.position.set(-0.23, 0.78, 0);
  chairGroup.add(cSeat, cBack);
  tagInteractive(cSeat, 'office_chair', '[SIT ON CHAIR]', interactiveMeshes);
  offGroup.add(chairGroup);

  // Storage Cabinets along West Wall
  [-2.6, -1.0].forEach((cz) => {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 1.3), mats.corrugatedMetal);
    cab.position.set(-ow * 0.5 + 0.65, 1.0, cz);
    offGroup.add(cab);
    colliders.push({ minX: ox - ow * 0.5 + 0.2, maxX: ox - ow * 0.5 + 1.05, minZ: oz + cz - 0.65, maxZ: oz + cz + 0.65 });
  });

  // Animated Wall Clock
  const clockGroup = new THREE.Group();
  clockGroup.position.set(-1.5, 2.25, -od * 0.5 + 0.28);
  const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x18181b }));
  clockRim.rotation.x = Math.PI / 2;
  const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.07, 16), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
  clockFace.rotation.x = Math.PI / 2;
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.02), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  hourHand.position.set(0, 0.05, 0.05);
  const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.2, 0.02), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  minuteHand.position.set(0, 0.08, 0.055);
  const secondHand = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.22, 0.02), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
  secondHand.position.set(0, 0.09, 0.06);
  clockGroup.add(clockRim, clockFace, hourHand, minuteHand, secondHand);
  offGroup.add(clockGroup);

  const officeLamp = new THREE.PointLight(0xffedd5, 1.4, 14, 1.4);
  officeLamp.position.set(0, 3.0, -0.5);
  offGroup.add(officeLamp);
  nightLights.push(officeLamp);

  // Desk Keyboard + Officer Coffee Mug
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.46), new THREE.MeshStandardMaterial({ color: 0x18181b }));
  kb.position.set(1.08, 0.835, -1.9);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.11, 10), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 }));
  mug.position.set(0.95, 0.88, -2.32);
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8), new THREE.MeshStandardMaterial({ color: 0x3b1e08 }));
  coffee.position.set(0, 0.048, 0);
  mug.add(coffee);
  tagInteractive(mug, 'office_coffee', '[DRINK COFFEE]', interactiveMeshes);
  offGroup.add(kb, mug);

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
  const bulletin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.78, 0.05), new THREE.MeshStandardMaterial({ map: boardTex }));
  bulletin.position.set(-1.7, 1.85, od * 0.5 - 0.28);
  bulletin.rotation.y = Math.PI;
  tagInteractive(bulletin, 'office_bulletin', '[VIEW BOLO & RULES BOARD]', interactiveMeshes);
  offGroup.add(bulletin);

  group.add(offGroup);

  // Stationed Guard Sentries
  const sentry1 = createCharacterMesh('border_officer', 'Guard Viktor', 201);
  sentry1.root.position.set(-6.4, 0, -15.5);
  sentry1.root.rotation.y = 1.1;
  const sentry2 = createCharacterMesh('border_officer', 'Guard Elena', 202);
  sentry2.root.position.set(6.4, 0, 16.5);
  sentry2.root.rotation.y = -1.2;
  group.add(sentry1.root, sentry2.root);
  const sentries: CharacterRig[] = [sentry1, sentry2];

  // ── 5. WATCHTOWERS, SECURITY FENCING & DISTANT TREES ───────────────────────
  [[-15, -24], [14, 24]].forEach(([tx, tz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 7.5, 6), mats.corrugatedMetal);
    leg.position.set(tx, 3.75, tz);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 2.6), mats.woodPlank);
    cabin.position.set(tx, 8.2, tz);
    group.add(leg, cabin);
  });

  // Perimeter Boundary Fence Posts (Instanced)
  const fenceGeo = new THREE.BoxGeometry(0.18, 2.2, 0.18);
  const fenceInst = new THREE.InstancedMesh(fenceGeo, mats.corrugatedMetal, 80);
  const dummy = new THREE.Object3D();
  let fIdx = 0;
  for (let z = -34; z <= 34; z += 4.5) {
    if (fIdx < 80) {
      dummy.position.set(-20, 1.1, z);
      dummy.updateMatrix();
      fenceInst.setMatrixAt(fIdx++, dummy.matrix);
    }
    if (fIdx < 80) {
      dummy.position.set(22, 1.1, z);
      dummy.updateMatrix();
      fenceInst.setMatrixAt(fIdx++, dummy.matrix);
    }
  }
  fenceInst.count = fIdx;
  fenceInst.instanceMatrix.needsUpdate = true;
  fenceInst.computeBoundingSphere();
  group.add(fenceInst);

  // Instanced Low-Poly Pine Trees (optimized for Intel UHD 610)
  const treeCount = vegetationQuality === 'low' ? 70 : vegetationQuality === 'medium' ? 140 : 220;
  const trunkInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.18, 0.25, 2.2, 5),
    new THREE.MeshLambertMaterial({ color: 0x4a3525 }),
    treeCount
  );
  const crownInst = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.7, 5.0, 5),
    new THREE.MeshLambertMaterial({ color: 0x264027 }),
    treeCount
  );
  let placed = 0;
  for (let i = 0; i < treeCount * 3 && placed < treeCount; i++) {
    const tx = (Math.random() - 0.5) * 260;
    const tz = (Math.random() - 0.5) * 260;
    if (Math.abs(tx) < 26 && Math.abs(tz) < 42) continue;
    if (Math.abs(tx) < 10) continue;
    const sc = 0.85 + Math.random() * 0.4;
    dummy.position.set(tx, 1.1 * sc, tz);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(placed, dummy.matrix);
    dummy.position.set(tx, 4.0 * sc, tz);
    dummy.updateMatrix();
    crownInst.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  trunkInst.count = placed;
  crownInst.count = placed;
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  group.add(trunkInst, crownInst);

  // Instanced Distant Low-Poly Mountain Silhouette Ring (1 draw call) + Celestial Sun/Moon Disc
  const mountainInst = new THREE.InstancedMesh(
    new THREE.ConeGeometry(30, 28, 5),
    new THREE.MeshLambertMaterial({ color: 0x3b444f, flatShading: true }),
    18
  );
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2;
    const rad = 148 + (i % 3) * 14;
    const hScale = 0.78 + (i % 4) * 0.32;
    const rScale = 0.9 + (i % 3) * 0.22;
    dummy.position.set(Math.cos(ang) * rad, 11.5 * hScale, Math.sin(ang) * rad);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(rScale, hScale, rScale);
    dummy.updateMatrix();
    mountainInst.setMatrixAt(i, dummy.matrix);
  }
  mountainInst.instanceMatrix.needsUpdate = true;
  mountainInst.computeBoundingSphere();
  group.add(mountainInst);

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 14),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false, side: THREE.DoubleSide })
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
    roadMesh,
    sunDisc,
    sentries,
  };

  updateWeighbridgeSign(refs, null, null);
  updateOfficeMonitorScreen(refs, null, false);
  return refs;
}
