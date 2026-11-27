import * as THREE from 'three';
import { CharacterRole, DriverEmotion } from '../types/game';

export type CharacterAnimState = 'idle' | 'walk' | 'run' | 'sit' | 'talk';

export interface CharacterRig {
  root: THREE.Group;
  torsoGroup: THREE.Group;
  headPivot: THREE.Group;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  mouthMesh: THREE.Mesh;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  hitbox: THREE.Mesh;
  role: CharacterRole;
  name: string;
  animState: CharacterAnimState;
  emotion: DriverEmotion;
  gestureTimer: number;
  gestureType: 'none' | 'nod' | 'shake';
  phase: number;
}

const SKIN_TONES = [0xf2c9ac, 0xe0ac8b, 0xc68b67, 0x9c6848, 0xf6d5be];
const HAIR_TONES = [0x1c1917, 0x452b18, 0x8a6437, 0x6b7280];
const JACKET_COLORS: Record<CharacterRole, number[]> = {
  border_officer: [0x1f3628, 0x264231],
  police_officer: [0x1a2842, 0x1e3050],
  driver: [0x57534e, 0x3b4d63, 0x6b3a3a, 0x3f4f3c],
  tourist: [0xb45309, 0x0e7490, 0xbe123c, 0x4338ca],
  local: [0x6c584c, 0x4a5759, 0x7f5539],
  trucker: [0x7c2d12, 0x374151, 0x78350f],
  official: [0x18181b, 0x1e293b],
  medic: [0xdc2626, 0xf8fafc],
  smuggler: [0x292524, 0x3f3f46],
  story_npc: [0x1f3628, 0x1e3a5f],
};

// Shared cached geometries & materials across all characters
const SHARED_CHAR_GEO = {
  leg: new THREE.CylinderGeometry(0.08, 0.068, 0.78, 7),
  shoe: new THREE.BoxGeometry(0.13, 0.09, 0.22),
  torso: new THREE.BoxGeometry(0.42, 0.58, 0.24),
  badge: new THREE.BoxGeometry(0.07, 0.08, 0.02),
  arm: new THREE.CylinderGeometry(0.06, 0.052, 0.52, 7),
  hand: new THREE.SphereGeometry(0.055, 6, 6),
  head: new THREE.SphereGeometry(0.145, 9, 8),
  eye: new THREE.SphereGeometry(0.017, 5, 5),
  brow: new THREE.BoxGeometry(0.044, 0.013, 0.015),
  mouth: new THREE.BoxGeometry(0.056, 0.016, 0.016),
  cap: new THREE.CylinderGeometry(0.15, 0.14, 0.09, 9),
  visor: new THREE.BoxGeometry(0.22, 0.02, 0.12),
  hair: new THREE.SphereGeometry(0.148, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.58),
  hitbox: new THREE.BoxGeometry(0.65, 1.85, 0.55),
};

const SHARED_SHOE_MAT = new THREE.MeshLambertMaterial({ color: 0x171717 });
const SHARED_EYE_MAT = new THREE.MeshLambertMaterial({ color: 0x111827 });
const SHARED_BADGE_MAT = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.7, roughness: 0.3 });
const SHARED_HITBOX_MAT = new THREE.MeshBasicMaterial({ visible: false });
const MOUTH_NEUTRAL_MAT = new THREE.MeshLambertMaterial({ color: 0x7c3a32 });
const MOUTH_HAPPY_MAT = new THREE.MeshLambertMaterial({ color: 0xc2410c });
const MOUTH_SAD_MAT = new THREE.MeshLambertMaterial({ color: 0x57302a });
const MOUTH_ANGRY_MAT = new THREE.MeshLambertMaterial({ color: 0x451a1a });

const lambertCache = new Map<number, THREE.MeshLambertMaterial>();
function getSharedLambert(hex: number): THREE.MeshLambertMaterial {
  let m = lambertCache.get(hex);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: hex });
    lambertCache.set(hex, m);
  }
  return m;
}

export function createCharacterMesh(
  role: CharacterRole,
  name: string,
  seed: number,
  interactId?: string,
  interactLabel?: string
): CharacterRig {
  const root = new THREE.Group();
  const s = Math.abs(seed);

  const skinMat = getSharedLambert(SKIN_TONES[s % SKIN_TONES.length]);
  const jacketList = JACKET_COLORS[role] ?? JACKET_COLORS.driver;
  const jacketMat = getSharedLambert(jacketList[s % jacketList.length]);
  const pantsMat = getSharedLambert(role === 'police_officer' ? 0x172033 : 0x293241);
  const hairMat = getSharedLambert(HAIR_TONES[s % HAIR_TONES.length]);

  // Legs
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.11, 0.86, 0);
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.11, 0.86, 0);

  [leftLegPivot, rightLegPivot].forEach((pivot) => {
    const leg = new THREE.Mesh(SHARED_CHAR_GEO.leg, pantsMat);
    leg.position.y = -0.39;
    const shoe = new THREE.Mesh(SHARED_CHAR_GEO.shoe, SHARED_SHOE_MAT);
    shoe.position.set(0, -0.815, 0.035);
    pivot.add(leg, shoe);
    root.add(pivot);
  });

  // Torso
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.86, 0);
  const torsoMesh = new THREE.Mesh(SHARED_CHAR_GEO.torso, jacketMat);
  torsoMesh.position.y = 0.29;
  torsoGroup.add(torsoMesh);

  if (role === 'police_officer' || role === 'border_officer') {
    const badge = new THREE.Mesh(SHARED_CHAR_GEO.badge, SHARED_BADGE_MAT);
    badge.position.set(0.12, 0.42, 0.125);
    torsoGroup.add(badge);
  }

  // Arms
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.27, 0.52, 0);
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.27, 0.52, 0);
  [leftArmPivot, rightArmPivot].forEach((armPiv) => {
    const arm = new THREE.Mesh(SHARED_CHAR_GEO.arm, jacketMat);
    arm.position.y = -0.24;
    const hand = new THREE.Mesh(SHARED_CHAR_GEO.hand, skinMat);
    hand.position.y = -0.52;
    armPiv.add(arm, hand);
    torsoGroup.add(armPiv);
  });

  // Head & Expressive Face
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.62, 0);
  const headMesh = new THREE.Mesh(SHARED_CHAR_GEO.head, skinMat);
  headMesh.position.y = 0.17;
  headMesh.scale.set(0.92, 1.08, 0.96);
  headPivot.add(headMesh);

  const leftEye = new THREE.Mesh(SHARED_CHAR_GEO.eye, SHARED_EYE_MAT);
  leftEye.position.set(-0.048, 0.185, 0.128);
  const rightEye = new THREE.Mesh(SHARED_CHAR_GEO.eye, SHARED_EYE_MAT);
  rightEye.position.set(0.048, 0.185, 0.128);

  const leftBrow = new THREE.Mesh(SHARED_CHAR_GEO.brow, hairMat);
  leftBrow.position.set(-0.048, 0.215, 0.132);
  const rightBrow = new THREE.Mesh(SHARED_CHAR_GEO.brow, hairMat);
  rightBrow.position.set(0.048, 0.215, 0.132);

  const mouthMesh = new THREE.Mesh(SHARED_CHAR_GEO.mouth, MOUTH_NEUTRAL_MAT);
  mouthMesh.position.set(0, 0.11, 0.132);
  headPivot.add(leftEye, rightEye, leftBrow, rightBrow, mouthMesh);

  if (role === 'police_officer' || role === 'border_officer') {
    const cap = new THREE.Mesh(SHARED_CHAR_GEO.cap, jacketMat);
    cap.position.y = 0.29;
    const visor = new THREE.Mesh(SHARED_CHAR_GEO.visor, SHARED_SHOE_MAT);
    visor.position.set(0, 0.255, 0.13);
    headPivot.add(cap, visor);
  } else {
    const hair = new THREE.Mesh(SHARED_CHAR_GEO.hair, hairMat);
    hair.position.set(0, 0.19, -0.01);
    headPivot.add(hair);
  }

  torsoGroup.add(headPivot);
  root.add(torsoGroup);

  // Raycast interaction hitbox
  const hitbox = new THREE.Mesh(SHARED_CHAR_GEO.hitbox, SHARED_HITBOX_MAT);
  hitbox.position.y = 0.95;
  if (interactId) {
    hitbox.userData.interactId = interactId;
    hitbox.userData.interactLabel = interactLabel ?? `[TALK] ${name}`;
  }
  root.add(hitbox);

  return {
    root,
    torsoGroup,
    headPivot,
    leftBrow,
    rightBrow,
    mouthMesh,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    hitbox,
    role,
    name,
    animState: 'idle',
    emotion: 'neutral',
    gestureTimer: 0,
    gestureType: 'none',
    phase: (s % 100) * 0.1,
  };
}

export function setCharacterEmotion(rig: CharacterRig, emotion: DriverEmotion) {
  rig.emotion = emotion;
  if (emotion === 'happy' || emotion === 'relieved') {
    rig.leftBrow.rotation.z = 0.08;
    rig.rightBrow.rotation.z = -0.08;
    rig.mouthMesh.scale.set(1.25, 1.3, 1);
    rig.mouthMesh.material = MOUTH_HAPPY_MAT;
    rig.gestureType = 'nod';
    rig.gestureTimer = 2.2;
  } else if (emotion === 'sad' || emotion === 'disappointed' || emotion === 'nervous') {
    rig.leftBrow.rotation.z = 0.22;
    rig.rightBrow.rotation.z = -0.22;
    rig.mouthMesh.scale.set(0.85, 0.8, 1);
    rig.mouthMesh.material = MOUTH_SAD_MAT;
    rig.gestureType = 'shake';
    rig.gestureTimer = 2.4;
  } else if (emotion === 'frustrated' || emotion === 'angry') {
    rig.leftBrow.rotation.z = -0.28;
    rig.rightBrow.rotation.z = 0.28;
    rig.mouthMesh.scale.set(1.1, 1.5, 1);
    rig.mouthMesh.material = MOUTH_ANGRY_MAT;
    rig.gestureType = 'shake';
    rig.gestureTimer = 2.6;
  } else {
    rig.leftBrow.rotation.z = 0;
    rig.rightBrow.rotation.z = 0;
    rig.mouthMesh.scale.set(1, 1, 1);
    rig.mouthMesh.material = MOUTH_NEUTRAL_MAT;
    rig.gestureType = 'none';
  }
}

export function updateCharacterAnimation(rig: CharacterRig, dt: number, lookTarget?: THREE.Vector3) {
  const speed = rig.animState === 'run' ? 10.5 : rig.animState === 'walk' ? 6.2 : rig.animState === 'talk' ? 3.8 : 1.5;
  rig.phase += dt * speed;

  if (rig.animState === 'walk' || rig.animState === 'run') {
    const swing = rig.animState === 'run' ? 0.68 : 0.44;
    rig.leftLegPivot.rotation.x = Math.sin(rig.phase) * swing;
    rig.rightLegPivot.rotation.x = -Math.sin(rig.phase) * swing;
    rig.leftArmPivot.rotation.x = -Math.sin(rig.phase) * swing * 0.85;
    rig.rightArmPivot.rotation.x = Math.sin(rig.phase) * swing * 0.85;
    rig.torsoGroup.position.y = 0.86 + Math.abs(Math.sin(rig.phase)) * 0.03;
  } else if (rig.animState === 'talk') {
    rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(rig.leftLegPivot.rotation.x, 0, 8, dt);
    rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(rig.rightLegPivot.rotation.x, 0, 8, dt);
    rig.leftArmPivot.rotation.x = -0.35 + Math.sin(rig.phase * 1.4) * 0.25;
    rig.rightArmPivot.rotation.x = -0.4 + Math.cos(rig.phase * 1.2) * 0.3;
  } else {
    rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(rig.leftLegPivot.rotation.x, 0, 8, dt);
    rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(rig.rightLegPivot.rotation.x, 0, 8, dt);
    rig.torsoGroup.position.y = 0.86 + Math.sin(rig.phase) * 0.01;
    rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(rig.leftArmPivot.rotation.x, 0, 6, dt);
    rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(rig.rightArmPivot.rotation.x, 0, 6, dt);
  }

  // Emotion head nod / shake gesture
  if (rig.gestureTimer > 0) {
    rig.gestureTimer -= dt;
    if (rig.gestureType === 'nod') {
      rig.headPivot.rotation.x = Math.sin(rig.phase * 3.5) * 0.22;
    } else if (rig.gestureType === 'shake') {
      rig.headPivot.rotation.y = Math.sin(rig.phase * 4.2) * 0.32;
    }
  } else if (lookTarget && rig.root.position.distanceTo(lookTarget) < 8) {
    rig.headPivot.rotation.x = THREE.MathUtils.damp(rig.headPivot.rotation.x, 0, 5, dt);
    const dx = lookTarget.x - rig.root.position.x;
    const dz = lookTarget.z - rig.root.position.z;
    const targetYaw = Math.atan2(dx, dz) - rig.root.rotation.y;
    const clampedYaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(targetYaw), Math.cos(targetYaw)), -0.75, 0.75);
    rig.headPivot.rotation.y = THREE.MathUtils.damp(rig.headPivot.rotation.y, clampedYaw, 5, dt);
  }
}
