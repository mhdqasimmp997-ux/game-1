import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

import {
  AllSettings,
  DifficultyLevel,
  DriverEmotion,
  InspectionCase,
  InspectionHotspot,
  QueueAlertInfo,
  WeatherType,
} from '../types/game';
import { createMaterialLibrary, ProceduralMaterialSet } from './Textures';
import { SoundEngine } from './SoundEngine';
import {
  buildCheckpointFacility,
  CheckpointWorldRefs,
  updateOfficeMonitorScreen,
  updateWeighbridgeSign,
} from '../game/CheckpointBuilder';
import {
  animateVehicleRig,
  createVehicleMesh,
  disposeVehicleRig,
  HS_MAT_CLEAR,
  HS_MAT_ISSUE,
  HS_MAT_UNSCANNED,
  setVehicleShadowCasting,
  VehicleRig,
} from '../game/Vehicles';
import {
  CharacterRig,
  createCharacterMesh,
  setCharacterEmotion,
  updateCharacterAnimation,
} from '../game/Characters';
import { generateBorderCase } from '../game/InspectionSystem';

export interface SimHudState {
  aimPrompt: string | null;
  lensMode: boolean;
  flashlightOn: boolean;
  sitting: boolean;
  cctvIndex: number; // -1 = normal FPS, 0..3 = CCTV feeds
  cctvLabel: string;
  alarmActive: boolean;
  currentAlert: QueueAlertInfo | null;
  waitingCount: number;
  activeCase: InspectionCase | null;
  holdingCase: InspectionCase | null;
  rejectedCase: InspectionCase | null;
  redRejectionAlert: { vehicleLabel: string; registration: string; reason: string } | null;
  towAvailable: boolean;
  towStatus: string | null;
  entryGateOpen: boolean;
  exitGateOpen: boolean;
  policeStatus: string | null;
  fps: number;
  driverOutside: boolean;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  queueCountNear: number;
  policeX: number | null;
  policeZ: number | null;
}

export interface SimulationCallbacks {
  onHudSync: (hud: SimHudState) => void;
  onOpenComputer: () => void;
  onOpenWeighbridge: (c: InspectionCase) => void;
  onOpenDocuments: (c: InspectionCase) => void;
  onOpenReport: (c: InspectionCase) => void;
  onOpenDriverMenu: (c: InspectionCase) => void;
  onOpenBulletin: () => void;
  onSubtitle: (speaker: string, text: string) => void;
  onToast: (msg: string) => void;
  onPauseToggle: () => void;
  onTimeAdvance: (hoursDelta: number) => void;
  onInspectionFinished: (
    c: InspectionCase,
    outcome: 'approved' | 'rejected' | 'police_handled',
    reason?: string
  ) => void;
}

interface TrafficActor {
  caseData: InspectionCase;
  rig: VehicleRig;
  driver: CharacterRig;
  state:
    | 'queuing'
    | 'entering_weighbridge'
    | 'on_weighbridge'
    | 'exiting_approved'
    | 'moving_to_holding'
    | 'in_holding'
    | 'rejected_locked';
  driverState: 'inside' | 'exiting' | 'outside' | 'entering';
  zPos: number;
  xPos: number;
  yaw: number;
  announced: boolean;
  honkTimer: number;
  exitActionDelay: number;
}

interface PoliceDispatch {
  active: boolean;
  phase: 'arriving' | 'officers_walking' | 'communicating' | 'escorting' | 'boarding' | 'departing';
  carRig: VehicleRig;
  officers: [CharacterRig, CharacterRig];
  targetActor: TrafficActor;
  timer: number;
  xPos: number;
  zPos: number;
  yaw: number;
  stopX: number;
  stopZ: number;
  departStep: number;
}

interface TowDispatch {
  active: boolean;
  phase: 'arriving' | 'turning' | 'positioning' | 'attaching' | 'lifting' | 'towing';
  towRig: VehicleRig;
  targetActor: TrafficActor;
  timer: number;
  xPos: number;
  zPos: number;
  yaw: number;
  waypointIdx: number;
}

const CCTV_FEEDS = [
  { label: 'CAM 01 — ENTRY GATE', pos: new THREE.Vector3(-8, 6.2, -24), look: new THREE.Vector3(0, 1, -18) },
  { label: 'CAM 02 — WEIGHBRIDGE BAY', pos: new THREE.Vector3(7, 5.8, -8), look: new THREE.Vector3(0, 1, 0) },
  { label: 'CAM 03 — HOLDING AREA', pos: new THREE.Vector3(6, 6.0, -4), look: new THREE.Vector3(13.5, 1, 4) },
  { label: 'CAM 04 — EXIT GATE', pos: new THREE.Vector3(-8, 6.2, 24), look: new THREE.Vector3(0, 1, 18) },
];

const _centerNDC = new THREE.Vector2(0, 0);
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _sunBaseCol = new THREE.Color(0xfff4dc);
const _sunGoldenCol = new THREE.Color(0xfb923c);
const _skyNightCol = new THREE.Color(0x0b1324);
const _skyClearCol = new THREE.Color(0x90bcdb);
const _skyStormCol = new THREE.Color(0x73818e);
const _skyGoldenCol = new THREE.Color(0xe07a47);
const _skyZenithNightCol = new THREE.Color(0x030712);
const _skyZenithClearCol = new THREE.Color(0x1d4e89);
const _skyZenithStormCol = new THREE.Color(0x3f4c59);
const _skyWorkCol = new THREE.Color();
const _skyZenithWorkCol = new THREE.Color();

export class SimulationEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private outputPass: OutputPass | null = null;
  private fxaaPass: ShaderPass | null = null;

  private sunLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyMesh: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private flashlight: THREE.SpotLight;
  private flashlightTarget: THREE.Object3D;
  private policeSirenLight: THREE.PointLight;
  private rainPoints: THREE.Points;

  private isSoftwareGl: boolean;
  private mats: ProceduralMaterialSet;
  private world: CheckpointWorldRefs;
  private sound: SoundEngine;
  private callbacks: SimulationCallbacks;
  private settings: AllSettings;

  // Game state (Permanent Night-Shift Operations: 21:00 - 04:00)
  private day = 1;
  private difficulty: DifficultyLevel = 'standard';
  private timeOfDay = 22.5;
  private weather: WeatherType = 'clear';
  private paused = true;
  private disposed = false;

  // Player FPS state (spawns INSIDE office!)
  private playerPos = new THREE.Vector3(-11.0, 0, -5.0);
  private playerVelY = 0;
  private playerYaw = -1.25;
  private playerPitch = -0.05;
  private onGround = true;
  private crouching = false;
  private sitting = false;
  private currentEyeHeight = 1.68;
  private headBobPhase = 0;
  private stepAccum = 0;
  private cctvIndex = -1;

  // Interaction & Raycast
  private raycaster = new THREE.Raycaster();
  private raycastCandidates: THREE.Object3D[] = [];
  private raycastTimer = 0;
  private currentAimId: string | null = null;
  private currentAimPrompt: string | null = null;
  private lensMode = false;
  private flashlightOn = false;

  // Office Animations & Cached Light States
  private officeDoorOpen = false;
  private officeLightOn = true;
  private drawersOpen: [boolean, boolean] = [false, false];
  private entryGateOpen = false;
  private exitGateOpen = false;
  private entryGateAngle = 0;
  private exitGateAngle = 0;
  private lastEntryLightState: boolean | null = null;
  private lastExitLightState: boolean | null = null;

  // Traffic Queue & Inspection
  private queue: TrafficActor[] = [];
  private activeActor: TrafficActor | null = null;
  private holdingActor: TrafficActor | null = null;
  private rejectedActor: TrafficActor | null = null;
  private spawnTimer = 1.5;
  private alarmActive = false;
  private currentAlert: QueueAlertInfo | null = null;
  private policeDispatch: PoliceDispatch | null = null;
  private policeStatus: string | null = null;
  private towRequestAvailable = false;
  private towDispatch: TowDispatch | null = null;
  private towStatus: string | null = null;
  private redRejectionAlert: { vehicleLabel: string; registration: string; reason: string } | null = null;

  // Input & Loop (WASD movement + Arrow-Key smooth camera + Mouse interaction only)
  private keys: Record<string, boolean> = {};
  private camYawVel = 0;
  private camPitchVel = 0;
  private frameId = 0;
  private lastTime = performance.now();
  private elapsed = 0;
  private hudTimer = 0;
  private timeSyncAccum = 0;
  private shadowFrameCounter = 0;
  private oddFrameSkip = false;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private currentFps = 60;

  constructor(
    container: HTMLElement,
    settings: AllSettings,
    sound: SoundEngine,
    callbacks: SimulationCallbacks
  ) {
    this.container = container;
    this.settings = settings;
    this.sound = sound;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && settings.graphics.shadowQuality !== 'off';
    this.renderer.shadowMap.type = this.isSoftwareGl ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2) * settings.graphics.resolutionScale
    );
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8bb6d6);
    this.scene.fog = new THREE.Fog(0x8bb6d6, 48, settings.graphics.renderDistance);

    // Procedural Studio / Sky Environment Reflections (PMREM + RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.72;
    pmremGenerator.dispose();

    // Procedural Atmospheric Sky Dome Shader (Rayleigh gradient, sun halo, drifting clouds & stars)
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenithColor: { value: new THREE.Color(0x1d4e89) },
        uHorizonColor: { value: new THREE.Color(0x90bcdb) },
        uSunDir: { value: new THREE.Vector3(0.4, 0.7, -0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xfff4d6) },
        uNightAmount: { value: 0 },
        uCloudAmount: { value: 0.35 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldDir;
        uniform vec3 uZenithColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uNightAmount;
        uniform float uCloudAmount;
        uniform float uTime;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.03;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 sky = mix(uHorizonColor, uZenithColor, pow(h, 0.55));

          // Solar / Lunar Mie atmospheric halo
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          float halo = pow(sunDot, 12.0) * 0.42 + pow(sunDot, 128.0) * 0.65;
          sky += uSunColor * halo * (1.0 - uNightAmount * 0.65);

          // Procedural drifting high-altitude clouds
          if (dir.y > 0.03) {
            vec2 cloudUv = dir.xz / (dir.y + 0.22) * 1.4 + vec2(uTime * 0.008, uTime * 0.004);
            float c = fbm(cloudUv);
            float cover = smoothstep(0.55 - uCloudAmount * 0.35, 0.88, c);
            vec3 cloudCol = mix(vec3(0.96, 0.97, 0.99), uHorizonColor * 0.72, uNightAmount * 0.85);
            cloudCol += uSunColor * pow(sunDot, 6.0) * 0.35 * (1.0 - uNightAmount);
            sky = mix(sky, cloudCol, cover * smoothstep(0.03, 0.22, dir.y) * 0.75);
          }

          // Twinkling night stars
          if (uNightAmount > 0.05 && dir.y > 0.08) {
            vec2 starUv = floor(dir.xz / (dir.y + 0.15) * 140.0);
            float s = hash(starUv);
            if (s > 0.992) {
              float twinkle = 0.65 + 0.35 * sin(uTime * 3.0 + s * 100.0);
              sky += vec3(0.92, 0.95, 1.0) * uNightAmount * twinkle * smoothstep(0.08, 0.35, dir.y);
            }
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(310, 28, 18), this.skyMat);
    this.skyMesh.frustumCulled = false;
    this.scene.add(this.skyMesh);

    this.camera = new THREE.PerspectiveCamera(settings.graphics.fov, w / h, 0.12, 360);
    this.scene.add(this.camera);

    // Officer Handheld Flashlight mounted to camera
    this.flashlight = new THREE.SpotLight(0xfff7e6, 0, 32, 0.44, 0.58, 1.25);
    this.flashlight.position.set(0.18, -0.14, 0);
    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0, -0.1, -8);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

    // Pre-attached Police Siren Light (intensity=0 when idle -> prevents mid-game shader recompile!)
    this.policeSirenLight = new THREE.PointLight(0xef4444, 0, 20, 1.45);
    this.policeSirenLight.position.set(0, 3, 0);
    this.scene.add(this.policeSirenLight);

    // Three-Point Atmospheric Lighting Rig (Warm Sun Key + Cool Sky/Earth Hemi + Subtle Rim Backlight)
    this.hemiLight = new THREE.HemisphereLight(0xcbe5ff, 0x453f35, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4dc, 1.9);
    this.sunLight.position.set(45, 70, 35);
    this.sunLight.castShadow = !this.isSoftwareGl && settings.graphics.shadowQuality !== 'off';
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.025;
    this.sunLight.shadow.radius = 2.5;
    this.sunLight.shadow.camera.left = -45;
    this.sunLight.shadow.camera.right = 45;
    this.sunLight.shadow.camera.top = 45;
    this.sunLight.shadow.camera.bottom = -45;
    this.sunLight.shadow.camera.far = 175;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.42);
    this.rimLight.position.set(-40, 28, -45);
    this.scene.add(this.rimLight);

    // Rain Precipitation Particles
    const rPos = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      rPos[i * 3] = (Math.random() - 0.5) * 46;
      rPos[i * 3 + 1] = Math.random() * 19;
      rPos[i * 3 + 2] = (Math.random() - 0.5) * 46;
    }
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    this.rainPoints = new THREE.Points(
      rGeo,
      new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.16, transparent: true, opacity: 0.62 })
    );
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);

    this.mats = createMaterialLibrary(this.renderer, this.isSoftwareGl, settings.graphics.textureQuality);
    this.world = buildCheckpointFacility(this.mats, settings.graphics.vegetationQuality);
    this.scene.add(this.world.group);

    this.applySettings(settings);
    this.bindEvents();
    // Spawn initial 2 queued vehicles approaching Gate 1
    this.spawnIncomingVehicle();
    this.spawnIncomingVehicle();
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.tick();
  }

  private ensureComposer() {
    if (this.composer || this.isSoftwareGl) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Subtle high-threshold bloom makes headlights, sirens, traffic lights, and bay lamps glow cleanly
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.24, 0.35, 0.92);
    this.composer.addPass(this.bloomPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.fxaaPass = new ShaderPass(FXAAShader);
    const pr = this.renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
    this.composer.addPass(this.fxaaPass);
  }

  public applySettings(s: AllSettings) {
    this.settings = s;
    this.sound.applySettings(s.audio);
    this.camera.fov = s.graphics.fov;
    this.camera.updateProjectionMatrix();

    if (!this.isSoftwareGl) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * s.graphics.resolutionScale);
    }
    const shadowsOn = !this.isSoftwareGl && s.graphics.shadowQuality !== 'off';
    this.renderer.shadowMap.enabled = shadowsOn;
    this.sunLight.castShadow = shadowsOn;
    const sz = s.graphics.shadowQuality === 'high' ? 2048 : s.graphics.shadowQuality === 'medium' ? 1024 : 512;
    if (this.sunLight.shadow.mapSize.width !== sz) {
      this.sunLight.shadow.mapSize.set(sz, sz);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
    this.renderer.shadowMap.needsUpdate = true;

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.far = s.graphics.renderDistance;
    }
    if (s.graphics.postProcessing && !this.isSoftwareGl) {
      this.ensureComposer();
    }
    if (this.bloomPass) {
      this.bloomPass.enabled = s.graphics.postProcessing;
    }
    if (this.fxaaPass) {
      this.fxaaPass.enabled = s.graphics.postProcessing && s.graphics.antiAliasing === 'fxaa';
    }
  }

  public syncWorldParams(day: number, difficulty: DifficultyLevel, timeOfDay: number, weather: WeatherType) {
    this.day = day;
    this.difficulty = difficulty;
    const nightClamped = timeOfDay >= 4.0 && timeOfDay < 21.0 ? 22.5 : timeOfDay;
    if (Math.abs(nightClamped - this.timeOfDay) > 0.05) {
      this.timeOfDay = nightClamped;
    }
    const weatherChanged = this.weather !== weather;
    this.weather = weather;
    this.rainPoints.visible = weather === 'rain' && this.settings.graphics.particleQuality !== 'off';
    if (weatherChanged) {
      if (this.world.roadMesh.material instanceof THREE.MeshStandardMaterial) {
        this.world.roadMesh.material.roughness = weather === 'rain' ? 0.16 : 0.82;
        this.world.roadMesh.material.metalness = weather === 'rain' ? 0.24 : 0.06;
        this.world.roadMesh.material.envMapIntensity = weather === 'rain' ? 1.45 : 0.75;
      }
      this.sound.updateWeatherAmbient(weather);
    }
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) {
      this.keys = {};
      this.camYawVel = 0;
      this.camPitchVel = 0;
    }
  }

  public acknowledgeAlarm() {
    if (this.alarmActive) {
      this.alarmActive = false;
      this.sound.stopArrivalAlarm();
      this.sound.playClick();
      updateOfficeMonitorScreen(this.world, this.currentAlert, false);
    }
  }

  public toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? 3.2 : 0;
    this.sound.playFlashlightClick();
  }

  public toggleLensMode() {
    this.lensMode = !this.lensMode;
    this.sound.playClick();
    [this.activeActor, this.holdingActor].forEach((actor) => {
      if (!actor) return;
      actor.rig.hotspotMarkers.forEach((m, idx) => {
        m.visible = this.lensMode;
        const hs = actor.caseData.hotspots[idx];
        if (hs) {
          m.material = hs.inspected ? (hs.isIssue ? HS_MAT_ISSUE : HS_MAT_CLEAR) : HS_MAT_UNSCANNED;
        }
      });
    });
    this.callbacks.onToast(
      this.lensMode
        ? 'Inspection Lens Active: Aim at glowing vehicle markers and Left-Click to scan.'
        : 'Inspection Lens Deactivated.'
    );
  }

  public toggleCctv(forceExit = false) {
    if (forceExit || this.cctvIndex >= CCTV_FEEDS.length - 1) {
      this.cctvIndex = -1;
    } else {
      this.cctvIndex++;
    }
    const cctvActive = this.cctvIndex >= 0;
    this.world.cctvScreenMat.emissiveIntensity = cctvActive ? 1.2 : 0.45;
    this.sound.playClick();
  }

  public toggleEntryGate() {
    if (
      !this.entryGateOpen &&
      (this.rejectedActor !== null || this.policeDispatch?.active || this.towDispatch?.active)
    ) {
      this.callbacks.onToast(
        'Lane Locked: Clear rejected driver with Police & Tow Truck before admitting the next vehicle!'
      );
      return;
    }
    const blocking = [...this.queue, this.activeActor].some(
      (a) => a && Math.abs(a.zPos - (-18)) < 4.5
    );
    if (this.entryGateOpen && blocking) {
      this.callbacks.onToast('Gate Safety Sensor: Cannot close Entry Gate while a vehicle is passing!');
      return;
    }
    this.entryGateOpen = !this.entryGateOpen;
    this.sound.playGate();
    if (this.entryGateOpen) {
      this.acknowledgeAlarm();
      // Move lead queued vehicle onto weighbridge if weighbridge is clear
      if (!this.activeActor && !this.rejectedActor && this.queue.length > 0) {
        const lead = this.queue.shift()!;
        lead.state = 'entering_weighbridge';
        setVehicleShadowCasting(lead.rig, true);
        this.activeActor = lead;
      }
    }
  }

  public toggleExitGate() {
    const blocking =
      (this.activeActor && Math.abs(this.activeActor.zPos - 18) < 4.5) ||
      (this.rejectedActor && Math.abs(this.rejectedActor.zPos - 18) < 4.5) ||
      (this.towDispatch?.active && Math.abs(this.towDispatch.zPos - 18) < 5.5);
    if (this.exitGateOpen && blocking) {
      this.callbacks.onToast('Gate Safety Sensor: Vehicle currently crossing Exit Gate!');
      return;
    }
    this.exitGateOpen = !this.exitGateOpen;
    this.sound.playGate();
  }

  public commandDriverReturnToVehicle() {
    const target = this.activeActor ?? this.holdingActor;
    if (!target) return;
    if (target.driverState === 'outside') {
      target.driverState = 'entering';
      target.driver.animState = 'walk';
      this.sound.playClick();
    }
  }

  public speakWithDriver(mode: 'greet' | 'explain') {
    const actor = this.activeActor ?? this.holdingActor;
    if (!actor) return;
    const { driverName, personality, isCommercial, vehicleLabel } = actor.caseData;
    actor.driver.animState = 'talk';
    if (mode === 'greet') {
      const emo: DriverEmotion =
        personality === 'friendly' || personality === 'polite'
          ? 'happy'
          : personality === 'nervous'
          ? 'nervous'
          : personality === 'impatient' || personality === 'frustrated'
          ? 'frustrated'
          : 'neutral';
      setCharacterEmotion(actor.driver, emo);
      this.sound.playDialogueCue(emo === 'happy' || emo === 'neutral');
      const greeting =
        personality === 'friendly'
          ? `"Good day, Officer! Smooth drive up to the gate in this ${vehicleLabel}."`
          : personality === 'polite'
          ? `"Hello Officer. Please let me know which papers you need to inspect."`
          : personality === 'nervous'
          ? `"H-hello Officer... everything should be in order, I hope this won't take long."`
          : personality === 'impatient'
          ? `"Look, I've been waiting in line outside. Can we finish this check quickly?"`
          : personality === 'frustrated'
          ? `"Another delay at the border... tell me what you want to check."`
          : personality === 'confused'
          ? `"Sorry Officer, is there a separate form for this lane? I am a bit lost."`
          : `"Officer. Ready for inspection."`;
      this.callbacks.onSubtitle(driverName, greeting);
    } else {
      const hasIssues = actor.caseData.issuesSummary.length > 0;
      const emo: DriverEmotion = hasIssues
        ? personality === 'frustrated'
          ? 'angry'
          : 'nervous'
        : 'confused';
      setCharacterEmotion(actor.driver, emo);
      this.sound.playDialogueCue(!hasIssues);
      const reply = !hasIssues
        ? isCommercial
          ? `"My dispatch office loaded the cargo this morning and gave me all standard permits."`
          : `"I am just crossing for personal travel, Officer. All my papers are valid."`
        : personality === 'nervous'
        ? `"I swear I didn't check the seal or the weight slip carefully before leaving the depot!"`
        : personality === 'frustrated'
        ? `"Talk to the freight company if there's an error on the paperwork, not me!"`
        : `"Wait—something doesn't match? I thought the office renewed that before my trip."`;
      this.callbacks.onSubtitle(driverName, reply);
    }
  }

  public resetToShiftStart() {
    this.playerPos.set(-11.0, 0, -5.0);
    this.playerYaw = -1.25;
    this.playerPitch = -0.05;
    this.sitting = false;
    this.crouching = false;
    this.cctvIndex = -1;
    this.lensMode = false;
    this.flashlightOn = false;
    this.flashlight.intensity = 0;
    this.officeDoorOpen = false;
    this.entryGateOpen = false;
    this.exitGateOpen = false;
    this.acknowledgeAlarm();
  }

  public applyDriverOutcome(
    caseData: InspectionCase,
    decision: 'approved' | 'rejected' | 'further_inspection',
    reasonText?: string
  ) {
    const actor =
      this.activeActor?.caseData.caseId === caseData.caseId
        ? this.activeActor
        : this.holdingActor?.caseData.caseId === caseData.caseId
        ? this.holdingActor
        : null;
    if (!actor) return;

    actor.caseData.finalDecision = decision;

    if (decision === 'approved') {
      actor.caseData.status = 'APPROVED';
      this.sound.playStamp(true);
      setCharacterEmotion(actor.driver, 'happy');
      actor.driver.animState = 'talk';
      this.sound.playDialogueCue(true);
      this.callbacks.onSubtitle(actor.caseData.driverName, '"Thank you, officer! Safe duty ahead."');

      // Driver walks back into vehicle, then exits through exit gate
      actor.exitActionDelay = 1.6;
      if (actor.driverState === 'outside') {
        actor.driverState = 'entering';
      }
      actor.state = 'exiting_approved';
      this.exitGateOpen = true;
      this.sound.playGate();
      updateWeighbridgeSign(this.world, null, null);
      this.callbacks.onInspectionFinished(actor.caseData, 'approved', reasonText || 'All checks passed.');
    } else if (decision === 'rejected') {
      const recordedReason =
        (reasonText && reasonText.trim()) ||
        actor.caseData.issuesSummary[0] ||
        'Checkpoint inspection violation detected.';
      actor.caseData.status = 'REJECTED';
      actor.caseData.rejectionReason = recordedReason;

      this.sound.playStamp(false);
      this.sound.playRejectionWarning();
      this.redRejectionAlert = {
        vehicleLabel: actor.caseData.vehicleLabel,
        registration: actor.caseData.registration,
        reason: recordedReason,
      };

      const emo: DriverEmotion =
        actor.caseData.personality === 'frustrated' || actor.caseData.personality === 'impatient'
          ? 'frustrated'
          : actor.caseData.personality === 'nervous'
          ? 'nervous'
          : 'disappointed';
      setCharacterEmotion(actor.driver, emo);
      actor.driver.animState = 'talk';
      this.sound.playDialogueCue(false);

      const line =
        actor.caseData.personality === 'frustrated'
          ? '"Why has my vehicle been rejected? This delay is costing me my delivery!"'
          : actor.caseData.personality === 'nervous'
          ? '"Wait... rejected? Look, maybe there is a misunderstanding with the papers?"'
          : '"Why has my vehicle been rejected, officer? Which rule did I break?"';
      this.callbacks.onSubtitle(actor.caseData.driverName, `${line} (Reason: ${recordedReason})`);

      // Keep rejected vehicle on-site & lock bay until Police remove driver and Tow Truck removes vehicle
      actor.state = 'rejected_locked';
      actor.rig.indicatorState = 0;
      this.rejectedActor = actor;
      if (actor === this.activeActor) {
        this.activeActor = null;
        updateWeighbridgeSign(this.world, null, null);
      } else if (actor === this.holdingActor) {
        this.holdingActor = null;
      }

      this.callbacks.onInspectionFinished(actor.caseData, 'rejected', recordedReason);
      this.initiatePoliceResponse(actor);
    } else {
      actor.caseData.status = 'HOLDING';
      this.sound.playRadioBeep();
      setCharacterEmotion(actor.driver, 'confused');
      this.callbacks.onSubtitle(
        actor.caseData.driverName,
        '"Further inspection? Alright, I will wait by the vehicle."'
      );
      if (actor === this.activeActor && !this.holdingActor) {
        if (actor.driverState === 'outside') actor.driverState = 'entering';
        actor.exitActionDelay = 1.4;
        actor.state = 'moving_to_holding';
        this.holdingActor = actor;
        this.activeActor = null;
        updateWeighbridgeSign(this.world, null, null);
      }
    }
  }

  private initiatePoliceResponse(targetActor: TrafficActor) {
    if (this.policeDispatch?.active) return;
    this.towRequestAvailable = false;
    this.sound.playRadioBeep();
    this.policeStatus = 'Armored Security Unit SEC-407 responding to checkpoint...';

    const carRig = createVehicleMesh('armored_security', 0x464b52, this.mats, 'SEC-407');
    const startX = 3.8;
    const startZ = 54;
    carRig.root.position.set(startX, 0, startZ);
    carRig.root.rotation.y = 0; // Facing -Z into checkpoint
    carRig.sirenOn = true;
    carRig.headlightsOn = true;
    setVehicleShadowCasting(carRig, true);
    this.scene.add(carRig.root);
    this.sound.setSiren(true);
    this.exitGateOpen = true;

    const off1 = createCharacterMesh('police_officer', 'Sgt. Arjun', 401);
    const off2 = createCharacterMesh('police_officer', 'Officer Maya', 402);
    off1.root.visible = false;
    off2.root.visible = false;
    this.scene.add(off1.root, off2.root);

    const stopX = targetActor.xPos > 5 ? 7.6 : 3.8;
    const stopZ = targetActor.zPos + 8.6;

    this.policeDispatch = {
      active: true,
      phase: 'arriving',
      carRig,
      officers: [off1, off2],
      targetActor,
      timer: 0,
      xPos: startX,
      zPos: startZ,
      yaw: 0,
      stopX,
      stopZ,
      departStep: 0,
    };
    this.callbacks.onToast('REJECTED — Armored Security Unit dispatched to remove driver.');
  }

  public requestPoliceAssistance() {
    if (this.policeDispatch?.active) {
      this.callbacks.onToast('Armored Security Police unit is already responding / on scene.');
      return;
    }
    const targetActor = this.rejectedActor ?? this.holdingActor ?? this.activeActor;
    if (!targetActor) {
      this.callbacks.onToast('No active, holding, or rejected vehicle requires police assistance.');
      return;
    }
    this.initiatePoliceResponse(targetActor);
  }

  public requestTowTruck() {
    if (this.towDispatch?.active) {
      this.callbacks.onToast('Police Tow Unit T-04 is already en route / towing!');
      return;
    }
    if (!this.rejectedActor) {
      this.callbacks.onToast('No rejected vehicle awaiting towing.');
      return;
    }
    if (this.policeDispatch?.active || !this.towRequestAvailable) {
      this.callbacks.onToast('Wait until Police take the rejected driver away before calling the Tow Truck!');
      return;
    }

    this.sound.playRadioBeep();
    this.towRequestAvailable = false;
    this.towStatus = 'Tow Truck Request Accepted · Unit T-04 En Route';
    this.policeStatus = null;

    const towRig = createVehicleMesh('police_tow_truck', 0x16243b, this.mats, 'TOW-04');
    const startX = 3.6;
    const startZ = 54;
    towRig.root.position.set(startX, 0, startZ);
    towRig.root.rotation.y = 0; // Facing -Z into checkpoint
    towRig.sirenOn = true;
    towRig.headlightsOn = true;
    setVehicleShadowCasting(towRig, true);
    this.scene.add(towRig.root);
    this.exitGateOpen = true;

    this.towDispatch = {
      active: true,
      phase: 'arriving',
      towRig,
      targetActor: this.rejectedActor,
      timer: 0,
      xPos: startX,
      zPos: startZ,
      yaw: 0,
      waypointIdx: 0,
    };
    this.callbacks.onToast('Tow Truck Request Accepted: Police Tow Unit T-04 approaching checkpoint!');
  }

  private spawnIncomingVehicle() {
    if (this.queue.length >= 5) return;
    const caseData = generateBorderCase(this.day, this.difficulty);
    const rig = createVehicleMesh(
      caseData.vehicleType,
      caseData.colorHex,
      this.mats,
      caseData.registration,
      caseData.hotspots,
      caseData.caseId
    );
    const startZ = -34 - this.queue.length * 11.5 - 18;
    rig.root.position.set(0, 0, startZ);
    rig.root.rotation.y = Math.PI; // Facing +Z toward weighbridge
    this.scene.add(rig.root);

    const driver = createCharacterMesh(
      caseData.isCommercial ? 'trucker' : 'driver',
      caseData.driverName,
      caseData.driverSeed,
      `driver:${caseData.caseId}`,
      `[TALK] ${caseData.driverName}`
    );
    driver.root.visible = false;
    this.scene.add(driver.root);

    this.queue.push({
      caseData,
      rig,
      driver,
      state: 'queuing',
      driverState: 'inside',
      zPos: startZ,
      xPos: 0,
      yaw: Math.PI,
      announced: false,
      honkTimer: 8 + Math.random() * 6,
      exitActionDelay: 0,
    });
  }

  private performCenterRaycast() {
    this.raycaster.setFromCamera(_centerNDC, this.camera);
    this.raycaster.far = 4.8;

    const candidates = this.raycastCandidates;
    candidates.length = 0;
    for (let i = 0; i < this.world.interactiveMeshes.length; i++) {
      candidates.push(this.world.interactiveMeshes[i]);
    }
    if (this.activeActor) {
      candidates.push(this.activeActor.rig.driverDoorHitbox, this.activeActor.rig.trunkHitbox);
      if (this.activeActor.driverState === 'outside') candidates.push(this.activeActor.driver.hitbox);
      if (this.lensMode) {
        for (const m of this.activeActor.rig.hotspotMarkers) candidates.push(m);
      }
    }
    if (this.holdingActor) {
      candidates.push(this.holdingActor.rig.driverDoorHitbox, this.holdingActor.rig.trunkHitbox);
      if (this.holdingActor.driverState === 'outside') candidates.push(this.holdingActor.driver.hitbox);
      if (this.lensMode) {
        for (const m of this.holdingActor.rig.hotspotMarkers) candidates.push(m);
      }
    }

    const hits = this.raycaster.intersectObjects(candidates, true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData.interactId) {
        obj = obj.parent;
      }
      if (obj && obj.userData.interactId) {
        const id = obj.userData.interactId as string;
        this.currentAimId = id;
        this.currentAimPrompt = this.resolveAimPrompt(id, obj.userData.interactLabel as string);
        return;
      }
    }
    this.currentAimId = null;
    this.currentAimPrompt = null;
  }

  private resolveAimPrompt(id: string, fallback: string): string {
    if (id === 'entry_gate_panel') return this.entryGateOpen ? '[CLOSE GATE]' : '[OPEN GATE]';
    if (id === 'exit_gate_panel') return this.exitGateOpen ? '[CLOSE EXIT GATE]' : '[OPEN EXIT GATE]';
    if (id === 'office_door') return this.officeDoorOpen ? '[CLOSE DOOR]' : '[OPEN DOOR]';
    if (id === 'office_light_switch') return this.officeLightOn ? '[TURN OFF LIGHT]' : '[TURN ON LIGHT]';
    if (id === 'office_cctv') return this.cctvIndex >= 0 ? '[TURN OFF CCTV]' : '[TURN ON CCTV]';
    if (id === 'office_lens_kit') return this.lensMode ? '[TURN OFF LENS]' : '[USE LENS]';
    if (id === 'office_radio') {
      if (this.alarmActive) return '[USE RADIO · ACKNOWLEDGE ALERT]';
      if (this.towRequestAvailable) return '[USE RADIO · REQUEST TOW TRUCK]';
      return '[USE RADIO]';
    }
    if (id === 'office_chair') return this.sitting ? '[STAND UP]' : '[SIT ON CHAIR]';
    if (id === 'drawer_0') return this.drawersOpen[0] ? '[CLOSE DRAWER 1]' : '[OPEN DRAWER 1]';
    if (id === 'drawer_1') return this.drawersOpen[1] ? '[CLOSE DRAWER 2]' : '[OPEN DRAWER 2]';
    if (id.startsWith('veh_door:')) {
      const cid = id.split(':')[1];
      const actor =
        this.activeActor?.caseData.caseId === cid
          ? this.activeActor
          : this.holdingActor?.caseData.caseId === cid
          ? this.holdingActor
          : null;
      return actor?.driverState === 'outside' ? '[CLOSE VEHICLE DOOR]' : '[OPEN VEHICLE DOOR]';
    }
    if (id.startsWith('veh_trunk:')) {
      const cid = id.split(':')[1];
      const actor =
        this.activeActor?.caseData.caseId === cid
          ? this.activeActor
          : this.holdingActor?.caseData.caseId === cid
          ? this.holdingActor
          : null;
      return actor?.rig.trunkOpen ? '[CLOSE CARGO BAY]' : '[OPEN CARGO BAY]';
    }
    return fallback;
  }

  private executeAimedInteraction() {
    if (!this.currentAimId) return;
    const id = this.currentAimId;
    this.sound.playClick();

    if (id === 'office_door') {
      this.officeDoorOpen = !this.officeDoorOpen;
    } else if (id === 'office_light_switch') {
      this.officeLightOn = !this.officeLightOn;
      this.callbacks.onToast(this.officeLightOn ? 'Office Lights Turned ON.' : 'Office Lights Turned OFF.');
    } else if (id === 'office_coffee') {
      this.sound.playCoffeeSip();
      this.callbacks.onToast('Fresh hot coffee! Officer alertness restored.');
    } else if (id === 'office_bulletin') {
      this.callbacks.onOpenBulletin();
    } else if (id === 'drawer_0') {
      this.drawersOpen[0] = !this.drawersOpen[0];
      this.callbacks.onToast(this.drawersOpen[0] ? 'Opened Desk Drawer 1 (Spare Seal Forms).' : 'Closed Drawer 1.');
    } else if (id === 'drawer_1') {
      this.drawersOpen[1] = !this.drawersOpen[1];
      this.callbacks.onToast(this.drawersOpen[1] ? 'Opened Desk Drawer 2 (Inspection Logbook).' : 'Closed Drawer 2.');
    } else if (id === 'office_chair') {
      this.sitting = !this.sitting;
      if (this.sitting) {
        this.playerPos.set(-10.25, 0, -5.5);
        this.playerYaw = -1.55;
      }
    } else if (id === 'office_computer') {
      this.callbacks.onOpenComputer();
    } else if (id === 'ack_alarm') {
      this.acknowledgeAlarm();
    } else if (id === 'office_cctv') {
      this.toggleCctv();
    } else if (id === 'office_phone') {
      this.sound.playTelephoneRing();
      this.callbacks.onToast('Dispatch Call: "Keep cargo queues moving at Sector 7, Inspector."');
    } else if (id === 'office_radio') {
      if (this.alarmActive) {
        this.acknowledgeAlarm();
        this.callbacks.onToast('Alert acknowledged via Checkpoint Radio.');
      } else if (this.towRequestAvailable) {
        this.requestTowTruck();
      } else {
        this.requestPoliceAssistance();
      }
    } else if (id === 'office_report') {
      const c = this.activeActor?.caseData ?? this.holdingActor?.caseData;
      if (c) this.callbacks.onOpenReport(c);
      else this.callbacks.onToast('No vehicle currently under inspection.');
    } else if (id === 'office_docs') {
      const c = this.activeActor?.caseData ?? this.holdingActor?.caseData;
      if (c) this.callbacks.onOpenDocuments(c);
      else this.callbacks.onToast('No vehicle documents on desk yet — guide a vehicle onto the bay.');
    } else if (id === 'office_lens_kit') {
      this.toggleLensMode();
    } else if (id === 'entry_gate_panel') {
      this.toggleEntryGate();
    } else if (id === 'exit_gate_panel') {
      this.toggleExitGate();
    } else if (id === 'weighbridge_terminal') {
      if (this.activeActor && this.activeActor.state === 'on_weighbridge') {
        this.callbacks.onOpenWeighbridge(this.activeActor.caseData);
      } else {
        this.callbacks.onToast('Guide a vehicle onto the weighbridge deck first.');
      }
    } else if (id.startsWith('veh_trunk:')) {
      const cid = id.split(':')[1];
      const actor =
        this.activeActor?.caseData.caseId === cid
          ? this.activeActor
          : this.holdingActor?.caseData.caseId === cid
          ? this.holdingActor
          : null;
      if (actor) {
        actor.rig.trunkOpen = !actor.rig.trunkOpen;
        this.sound.playCargoLatch();
        if (actor.rig.trunkOpen) {
          const cargoSpot = actor.caseData.hotspots.find((h) => h.area === 'cargo');
          this.callbacks.onToast(
            cargoSpot?.isIssue
              ? 'Cargo doors open — notice the suspicious black red-banded crate inside! Use [L] Lens to record.'
              : 'Cargo bay opened — standard crates/luggage visible inside.'
          );
        }
      }
    } else if (id.startsWith('veh_door:')) {
      const cid = id.split(':')[1];
      const actor =
        this.activeActor?.caseData.caseId === cid
          ? this.activeActor
          : this.holdingActor?.caseData.caseId === cid
          ? this.holdingActor
          : null;
      if (actor) {
        if (actor.driverState === 'inside') {
          actor.rig.doorOpen = true;
          actor.driverState = 'exiting';
          actor.driver.root.position.set(actor.xPos - actor.rig.halfWidth - 0.3, 0, actor.zPos - 0.3);
          actor.driver.root.visible = true;
          this.callbacks.onSubtitle(actor.caseData.driverName, '"Stepping out now, officer."');
        } else if (actor.driverState === 'outside') {
          this.commandDriverReturnToVehicle();
        }
      }
    } else if (id.startsWith('driver:')) {
      const cid = id.split(':')[1];
      const actor =
        this.activeActor?.caseData.caseId === cid
          ? this.activeActor
          : this.holdingActor?.caseData.caseId === cid
          ? this.holdingActor
          : null;
      if (actor) this.callbacks.onOpenDriverMenu(actor.caseData);
    } else if (id.startsWith('lens_spot:')) {
      const [, cid, hsId] = id.split(':');
      const actor =
        this.activeActor?.caseData.caseId === cid
          ? this.activeActor
          : this.holdingActor?.caseData.caseId === cid
          ? this.holdingActor
          : null;
      if (actor) {
        const hsIdx = actor.caseData.hotspots.findIndex((h) => h.id === hsId);
        const hs: InspectionHotspot | undefined = actor.caseData.hotspots[hsIdx];
        if (hs) {
          hs.inspected = true;
          if (!actor.caseData.recordedFindings.includes(hs.findingText)) {
            actor.caseData.recordedFindings.push(hs.findingText);
          }
          const marker = actor.rig.hotspotMarkers[hsIdx];
          if (marker) {
            marker.material = hs.isIssue ? HS_MAT_ISSUE : HS_MAT_CLEAR;
          }
          if (hs.isIssue) {
            actor.caseData.physicalVerdict = 'issues_found';
            this.sound.playWeighbridgeBeep(true);
            this.callbacks.onToast(`ISSUE RECORDED (${hs.partLabel}): ${hs.findingText}`);
          } else {
            if (actor.caseData.hotspots.every((h) => h.inspected && !h.isIssue)) {
              actor.caseData.physicalVerdict = 'clear';
            }
            this.sound.playWeighbridgeBeep(false);
            this.callbacks.onToast(`CLEAR (${hs.partLabel}): ${hs.findingText}`);
          }
        }
      }
    }
  }

  private bindEvents() {
    const canvas = this.renderer.domElement;
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    canvas.addEventListener('mousedown', this.onMouseDown);
  }

  private onWindowBlur = () => {
    this.keys = {};
    this.camYawVel = 0;
    this.camPitchVel = 0;
  };

  private onResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
      const pr = this.renderer.getPixelRatio();
      this.fxaaPass?.material.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.paused) return;
    this.sound.unlock();
    // Mouse Left Click = Object Interaction ONLY (never moves player or rotates camera)
    if (e.button === 0) {
      if (this.cctvIndex !== -1) {
        this.toggleCctv();
        return;
      }
      this.performCenterRaycast();
      if (this.currentAimId) {
        this.executeAimedInteraction();
      }
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      if (this.cctvIndex !== -1) {
        this.toggleCctv(true);
        return;
      }
      this.callbacks.onPauseToggle();
      return;
    }
    if (this.paused) return;
    if (
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight' ||
      e.code === 'Space'
    ) {
      e.preventDefault();
    }
    this.sound.unlock();
    this.keys[e.code] = true;

    if (e.code === 'KeyC') {
      this.crouching = !this.crouching;
      this.sitting = false;
    } else if (e.code === 'KeyE') {
      if (this.sitting) this.sitting = false;
      else {
        this.performCenterRaycast();
        this.executeAimedInteraction();
      }
    } else if (e.code === 'KeyL') {
      this.toggleLensMode();
    } else if (e.code === 'KeyF') {
      this.toggleFlashlight();
    } else if (e.code === 'KeyB') {
      this.callbacks.onOpenBulletin();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private updateCameraFromArrows(dt: number) {
    // ARROW KEYS EXCLUSIVELY control smooth camera rotation & looking direction
    const turnInput = (this.keys['ArrowLeft'] ? 1 : 0) - (this.keys['ArrowRight'] ? 1 : 0);
    const lookInput = (this.keys['ArrowUp'] ? 1 : 0) - (this.keys['ArrowDown'] ? 1 : 0);
    const inv = this.settings.controls.invertY ? -1 : 1;
    const sens = this.settings.controls.mouseSensitivity;

    const targetYawVel = turnInput * 1.85 * sens;
    const targetPitchVel = lookInput * 1.35 * sens * inv;

    this.camYawVel = THREE.MathUtils.damp(this.camYawVel, targetYawVel, 16, dt);
    this.camPitchVel = THREE.MathUtils.damp(this.camPitchVel, targetPitchVel, 16, dt);

    if (Math.abs(this.camYawVel) > 0.0005) {
      this.playerYaw += this.camYawVel * dt;
    }
    if (Math.abs(this.camPitchVel) > 0.0005) {
      this.playerPitch = THREE.MathUtils.clamp(this.playerPitch + this.camPitchVel * dt, -1.35, 1.35);
    }
  }

  private updatePlayer(dt: number) {
    if (this.cctvIndex !== -1) {
      const feed = CCTV_FEEDS[this.cctvIndex];
      this.camera.position.copy(feed.pos);
      this.camera.lookAt(feed.look);
      return;
    }

    this.updateCameraFromArrows(dt);

    if (this.sitting) {
      this.currentEyeHeight = THREE.MathUtils.damp(this.currentEyeHeight, 1.18, 10, dt);
      this.camera.position.set(this.playerPos.x, this.playerPos.y + this.currentEyeHeight, this.playerPos.z);
      this.camera.rotation.set(this.playerPitch, this.playerYaw, 0, 'YXZ');
      if (this.keys['Space'] || this.keys['KeyW'] || this.keys['KeyS']) {
        this.sitting = false;
      }
      return;
    }

    // WASD EXCLUSIVELY controls player movement (forward/back/strafe + diagonal)
    const fwd = (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0);
    const str = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);
    const sprint = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) && !this.crouching && fwd > 0;
    const speed = this.crouching ? 2.4 : sprint ? 6.8 : 4.3;

    _forward.set(-Math.sin(this.playerYaw), 0, -Math.cos(this.playerYaw));
    _right.set(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw));
    _moveDir.set(0, 0, 0).addScaledVector(_forward, fwd).addScaledVector(_right, str);
    if (_moveDir.lengthSq() > 0.001) {
      _moveDir.normalize();
      this.playerPos.x += _moveDir.x * speed * dt;
      this.playerPos.z += _moveDir.z * speed * dt;
    }

    if (this.keys['Space'] && this.onGround) {
      this.playerVelY = 5.2;
      this.onGround = false;
      this.crouching = false;
    }
    this.playerVelY -= 15 * dt;
    this.playerPos.y += this.playerVelY * dt;
    if (this.playerPos.y <= 0) {
      this.playerPos.y = 0;
      this.playerVelY = 0;
      this.onGround = true;
    }

    // World bounds & wall collisions
    this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -28, 28);
    this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -42, 42);
    for (const box of this.world.colliders) {
      const cx = THREE.MathUtils.clamp(this.playerPos.x, box.minX, box.maxX);
      const cz = THREE.MathUtils.clamp(this.playerPos.z, box.minZ, box.maxZ);
      const dx = this.playerPos.x - cx;
      const dz = this.playerPos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < 0.18) {
        const d = Math.sqrt(d2) || 0.001;
        this.playerPos.x += (dx / d) * (0.42 - d);
        this.playerPos.z += (dz / d) * (0.42 - d);
      }
    }
    if (!this.officeDoorOpen) {
      const cx = THREE.MathUtils.clamp(this.playerPos.x, -7.0, -6.84);
      const cz = THREE.MathUtils.clamp(this.playerPos.z, -2.6, -1.12);
      const dx = this.playerPos.x - cx;
      const dz = this.playerPos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < 0.16) {
        const d = Math.sqrt(d2) || 0.001;
        this.playerPos.x += (dx / d) * (0.4 - d);
        this.playerPos.z += (dz / d) * (0.4 - d);
      }
    }

    const moving = _moveDir.lengthSq() > 0.01 && this.onGround;
    if (moving) {
      this.headBobPhase += dt * (sprint ? 12 : 8);
      this.stepAccum += dt * (sprint ? 2.6 : 1.8);
      if (this.stepAccum >= 1) {
        this.stepAccum = 0;
        this.sound.playFootstep(true);
      }
    }
    this.currentEyeHeight = THREE.MathUtils.damp(this.currentEyeHeight, this.crouching ? 1.02 : 1.68, 10, dt);
    const bob = moving && this.settings.controls.headBob ? Math.sin(this.headBobPhase) * 0.04 : 0;

    this.camera.position.set(this.playerPos.x, this.playerPos.y + this.currentEyeHeight + bob, this.playerPos.z);
    this.camera.rotation.set(this.playerPitch, this.playerYaw, 0, 'YXZ');
  }

  private updateTrafficAndActors(dt: number, isNight: boolean) {
    // Spawn queue vehicles steadily up to 5
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.queue.length < 5) {
      this.spawnIncomingVehicle();
      this.spawnTimer = 6.5 + Math.random() * 4.5;
    }

    // Update queue spacing & lead arrival alert
    let nextTargetZ = -23.5;
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      q.rig.headlightsOn = isNight;
      const stopZ = i === 0 ? -23.5 : nextTargetZ;
      if (q.zPos < stopZ - 0.1) {
        const spd = Math.min(7.5, (stopZ - q.zPos) * 1.4);
        q.zPos += spd * dt;
        q.rig.root.position.set(0, 0, q.zPos);
        animateVehicleRig(q.rig, dt, spd, 0, false, this.elapsed);
      } else {
        animateVehicleRig(q.rig, dt, 0, 0, true, this.elapsed);
        if (i === 0 && !q.announced) {
          q.announced = true;
          this.alarmActive = true;
          this.currentAlert = {
            vehicleLabel: q.caseData.vehicleLabel,
            registration: q.caseData.registration,
            lane: 1,
            queuePosition: 1,
            status: 'Waiting for Gate Access',
            totalWaiting: this.queue.length,
          };
          this.sound.startArrivalAlarm();
          if (this.queue.length > 2) this.sound.playMultiQueueAlert();
          updateOfficeMonitorScreen(this.world, this.currentAlert, true);
        } else if (i === 0) {
          q.honkTimer -= dt;
          if (q.honkTimer <= 0) {
            q.honkTimer = 9 + Math.random() * 7;
            this.sound.playHorn(q.caseData.isCommercial);
          }
        }
      }
      nextTargetZ = q.zPos - (q.rig.halfLength * 2 + 3.8);
    }

    // Update Active Inspection Vehicle
    const updateDriverWalk = (actor: TrafficActor) => {
      if (actor.driverState === 'exiting') {
        const targetX = actor.xPos - actor.rig.halfWidth - 1.1;
        const dx = targetX - actor.driver.root.position.x;
        if (Math.abs(dx) > 0.15) {
          actor.driver.root.position.x += Math.sign(dx) * 1.8 * dt;
          actor.driver.animState = 'walk';
        } else {
          actor.driverState = 'outside';
          actor.driver.animState = 'idle';
          actor.rig.doorOpen = false;
        }
      } else if (actor.driverState === 'entering') {
        actor.rig.doorOpen = true;
        const targetX = actor.xPos - actor.rig.halfWidth - 0.1;
        const dx = targetX - actor.driver.root.position.x;
        if (Math.abs(dx) > 0.2) {
          actor.driver.root.position.x += Math.sign(dx) * 1.9 * dt;
          actor.driver.animState = 'walk';
        } else {
          actor.driverState = 'inside';
          actor.driver.root.visible = false;
          actor.rig.doorOpen = false;
        }
      } else if (actor.driverState === 'outside') {
        updateCharacterAnimation(actor.driver, dt, this.playerPos);
      }
    };

    if (this.activeActor) {
      const a = this.activeActor;
      a.rig.headlightsOn = isNight;
      updateDriverWalk(a);

      if (a.state === 'entering_weighbridge') {
        a.zPos += 6.2 * dt;
        a.rig.root.position.set(0, 0, a.zPos);
        animateVehicleRig(a.rig, dt, 6.2, 0, false, this.elapsed);
        if (a.zPos >= 0) {
          a.zPos = 0;
          a.state = 'on_weighbridge';
          this.entryGateOpen = false;
          updateWeighbridgeSign(
            this.world,
            a.caseData.actualWeightKg,
            a.caseData.permittedWeightKg,
            a.caseData.registration
          );
          this.sound.playWeighbridgeBeep(a.caseData.isOverweight);
        }
      } else if (a.state === 'on_weighbridge') {
        animateVehicleRig(a.rig, dt, 0, 0, true, this.elapsed);
      } else if (a.state === 'exiting_approved') {
        if (a.exitActionDelay > 0 || a.driverState !== 'inside') {
          a.exitActionDelay -= dt;
          animateVehicleRig(a.rig, dt, 0, 0, true, this.elapsed);
        } else {
          a.zPos += 9.5 * dt;
          a.rig.root.position.set(0, 0, a.zPos);
          animateVehicleRig(a.rig, dt, 9.5, 0, false, this.elapsed);
          if (a.zPos > 34) {
            this.scene.remove(a.rig.root, a.driver.root);
            disposeVehicleRig(a.rig);
            this.activeActor = null;
            this.exitGateOpen = false;
            this.sound.playGate();
            if (this.queue.length > 0) {
              this.currentAlert = {
                vehicleLabel: this.queue[0].caseData.vehicleLabel,
                registration: this.queue[0].caseData.registration,
                lane: 1,
                queuePosition: 1,
                status: 'Waiting for Gate Access',
                totalWaiting: this.queue.length,
              };
              this.alarmActive = true;
              this.sound.startArrivalAlarm();
              updateOfficeMonitorScreen(this.world, this.currentAlert, true);
            } else {
              this.currentAlert = null;
              updateOfficeMonitorScreen(this.world, null, false);
            }
          }
        }
      }
    }

    // Holding Area Vehicle
    if (this.holdingActor) {
      const h = this.holdingActor;
      h.rig.headlightsOn = isNight;
      updateDriverWalk(h);
      if (h.state === 'moving_to_holding') {
        if (h.exitActionDelay > 0 || h.driverState !== 'inside') {
          h.exitActionDelay -= dt;
          animateVehicleRig(h.rig, dt, 0, 0, true, this.elapsed);
        } else {
          h.xPos = THREE.MathUtils.damp(h.xPos, 13.5, 2.2, dt);
          h.zPos = THREE.MathUtils.damp(h.zPos, 4.0, 2.2, dt);
          h.rig.root.position.set(h.xPos, 0, h.zPos);
          animateVehicleRig(h.rig, dt, 4.5, -0.25, false, this.elapsed);
          if (Math.hypot(h.xPos - 13.5, h.zPos - 4.0) < 0.4) {
            h.state = 'in_holding';
          }
        }
      } else {
        animateVehicleRig(h.rig, dt, 0, 0, true, this.elapsed);
      }
    }

    // Rejected Vehicle (stationary on-site awaiting police driver removal & tow truck)
    if (this.rejectedActor) {
      const r = this.rejectedActor;
      r.rig.headlightsOn = isNight;
      updateDriverWalk(r);
      if (!this.towDispatch || this.towDispatch.phase !== 'towing') {
        animateVehicleRig(r.rig, dt, 0, 0, true, this.elapsed);
      }
    }

    // Helper for smooth realistic vehicle steering along waypoints
    const driveTowardWaypoint = (
      curX: number,
      curZ: number,
      curYaw: number,
      targetX: number,
      targetZ: number,
      speed: number,
      turnRate: number
    ): { x: number; z: number; yaw: number; steer: number; dist: number } => {
      const dx = targetX - curX;
      const dz = targetZ - curZ;
      const dist = Math.hypot(dx, dz);
      const desiredYaw = Math.atan2(-dx, -dz);
      const diff = Math.atan2(Math.sin(desiredYaw - curYaw), Math.cos(desiredYaw - curYaw));
      const stepYaw = THREE.MathUtils.clamp(diff, -turnRate * dt, turnRate * dt);
      const nextYaw = curYaw + stepYaw;
      const fwdX = -Math.sin(nextYaw);
      const fwdZ = -Math.cos(nextYaw);
      return {
        x: curX + fwdX * speed * dt,
        z: curZ + fwdZ * speed * dt,
        yaw: nextYaw,
        steer: THREE.MathUtils.clamp(diff * 0.65, -0.45, 0.45),
        dist,
      };
    };

    // Armored Security Truck Police Response & Driver Custody Sequence
    if (this.policeDispatch?.active) {
      const pd = this.policeDispatch;
      const tgt = pd.targetActor;
      this.sound.updateSiren(this.elapsed);
      if (pd.carRig.sirenOn) {
        const sirenPhase = Math.sin(this.elapsed * 14) > 0;
        this.policeSirenLight.position.set(pd.xPos, 2.7, pd.zPos);
        this.policeSirenLight.intensity = 4.2;
        this.policeSirenLight.color.setHex(sirenPhase ? 0xef4444 : 0x3b82f6);
      } else {
        this.policeSirenLight.intensity = 0;
      }

      if (pd.phase === 'arriving') {
        const res = driveTowardWaypoint(pd.xPos, pd.zPos, pd.yaw, pd.stopX, pd.stopZ, 9.5, 2.4);
        pd.xPos = res.x;
        pd.zPos = res.z;
        pd.yaw = res.yaw;
        pd.carRig.root.position.set(pd.xPos, 0, pd.zPos);
        pd.carRig.root.rotation.y = pd.yaw;
        animateVehicleRig(pd.carRig, dt, 9.5, res.steer, false, this.elapsed);

        if (res.dist < 0.8) {
          pd.carRig.sirenOn = false;
          pd.carRig.doorOpen = true;
          this.policeSirenLight.intensity = 0;
          this.sound.setSiren(false);
          pd.phase = 'officers_walking';
          this.policeStatus = 'Officers exiting Armored Security Truck to detain driver...';

          const doorWorldX = pd.xPos - Math.cos(pd.yaw) * 1.45;
          const doorWorldZ = pd.zPos + Math.sin(pd.yaw) * 1.45;
          pd.officers[0].root.position.set(doorWorldX, 0, doorWorldZ - 0.5);
          pd.officers[1].root.position.set(doorWorldX + 0.3, 0, doorWorldZ + 0.5);
          pd.officers[0].root.visible = true;
          pd.officers[1].root.visible = true;

          // If driver is still inside rejected vehicle, open door and step out naturally
          if (tgt.driverState === 'inside') {
            tgt.rig.doorOpen = true;
            tgt.driverState = 'exiting';
            tgt.driver.root.position.set(tgt.xPos - tgt.rig.halfWidth - 0.35, 0, tgt.zPos - 0.3);
            tgt.driver.root.visible = true;
          }
        }
      } else if (pd.phase === 'officers_walking') {
        animateVehicleRig(pd.carRig, dt, 0, 0, true, this.elapsed);
        const meetX = tgt.xPos - tgt.rig.halfWidth - 1.3;
        const meetZ = tgt.zPos - 0.4;
        let arrived = true;
        pd.officers.forEach((off, idx) => {
          const ox = meetX - 0.45 + idx * 0.9;
          const oz = meetZ - 0.9;
          const dx = ox - off.root.position.x;
          const dz = oz - off.root.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.35) {
            arrived = false;
            off.root.position.x += (dx / dist) * 2.5 * dt;
            off.root.position.z += (dz / dist) * 2.5 * dt;
            off.root.rotation.y = Math.atan2(dx, dz);
            off.animState = 'walk';
          } else {
            off.root.rotation.y = Math.atan2(
              tgt.driver.root.position.x - off.root.position.x,
              tgt.driver.root.position.z - off.root.position.z
            );
            off.animState = 'talk';
          }
          updateCharacterAnimation(off, dt);
        });
        if (arrived && tgt.driverState === 'outside') {
          pd.phase = 'communicating';
          pd.timer = 3.0;
          this.policeStatus = 'Police Officers speaking with rejected driver...';
          setCharacterEmotion(tgt.driver, tgt.caseData.personality === 'frustrated' ? 'frustrated' : 'nervous');
          tgt.driver.animState = 'talk';
          this.sound.playDialogueCue(false);
          this.callbacks.onSubtitle(
            'Sgt. Arjun (Armored Security)',
            '"Vehicle rejected for border violation. Step with us to the security transport."'
          );
        }
      } else if (pd.phase === 'communicating') {
        animateVehicleRig(pd.carRig, dt, 0, 0, true, this.elapsed);
        pd.timer -= dt;
        pd.officers.forEach((off) => updateCharacterAnimation(off, dt, tgt.driver.root.position));
        if (pd.timer <= 0) {
          pd.phase = 'escorting';
          this.policeStatus = 'Officers escorting driver to Armored Security Truck...';
          this.callbacks.onSubtitle(
            tgt.caseData.driverName,
            '"Alright, alright... please watch my truck while I come with you."'
          );
        }
      } else if (pd.phase === 'escorting') {
        animateVehicleRig(pd.carRig, dt, 0, 0, true, this.elapsed);
        const boardX = pd.xPos - 1.55;
        const boardZ = pd.zPos - 0.3;

        // Driver walks alongside officers to the Armored Security Truck door
        const ddx = boardX - tgt.driver.root.position.x;
        const ddz = boardZ - tgt.driver.root.position.z;
        const dDist = Math.hypot(ddx, ddz);
        if (dDist > 0.35) {
          tgt.driver.root.position.x += (ddx / dDist) * 2.1 * dt;
          tgt.driver.root.position.z += (ddz / dDist) * 2.1 * dt;
          tgt.driver.root.rotation.y = Math.atan2(ddx, ddz);
          tgt.driver.animState = 'walk';
          updateCharacterAnimation(tgt.driver, dt);
        } else {
          tgt.driver.animState = 'idle';
        }

        let officersAtTruck = true;
        pd.officers.forEach((off, idx) => {
          const ox = boardX - 0.55 + idx * 1.1;
          const oz = boardZ + (idx === 0 ? -0.9 : 0.9);
          const dx = ox - off.root.position.x;
          const dz = oz - off.root.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.35) {
            officersAtTruck = false;
            off.root.position.x += (dx / dist) * 2.25 * dt;
            off.root.position.z += (dz / dist) * 2.25 * dt;
            off.root.rotation.y = Math.atan2(dx, dz);
            off.animState = 'walk';
          } else {
            off.animState = 'idle';
          }
          updateCharacterAnimation(off, dt);
        });

        if (dDist <= 0.35 && officersAtTruck) {
          pd.phase = 'boarding';
          pd.timer = 1.25;
          this.policeStatus = 'Driver & officers boarding Armored Security Truck...';
          tgt.driver.root.visible = false;
          tgt.driverState = 'inside';
          pd.officers[0].root.visible = false;
          pd.officers[1].root.visible = false;
          pd.carRig.doorOpen = false;
          this.sound.playCargoLatch();
        }
      } else if (pd.phase === 'boarding') {
        animateVehicleRig(pd.carRig, dt, 0, 0, true, this.elapsed);
        pd.timer -= dt;
        if (pd.timer <= 0) {
          pd.phase = 'departing';
          pd.departStep = 0;
          pd.carRig.indicatorState = 1;
          this.exitGateOpen = true;
          this.policeStatus = 'Armored Security Truck departing with driver in custody...';
        }
      } else if (pd.phase === 'departing') {
        const wps: [number, number][] = [
          [7.2, Math.max(-2, pd.stopZ - 6.5)],
          [7.2, Math.max(8, pd.stopZ + 3.5)],
          [2.8, 19.5],
          [2.8, 65.0],
        ];
        const wp = wps[Math.min(pd.departStep, wps.length - 1)];
        const spd = pd.departStep < 2 ? 7.5 : 11.5;
        const res = driveTowardWaypoint(pd.xPos, pd.zPos, pd.yaw, wp[0], wp[1], spd, 2.3);
        pd.xPos = res.x;
        pd.zPos = res.z;
        pd.yaw = res.yaw;
        pd.carRig.root.position.set(pd.xPos, 0, pd.zPos);
        pd.carRig.root.rotation.y = pd.yaw;
        animateVehicleRig(pd.carRig, dt, spd, res.steer, false, this.elapsed);

        if (res.dist < 1.2 && pd.departStep < wps.length - 1) {
          pd.departStep++;
          if (pd.departStep >= 2) pd.carRig.indicatorState = 0;
        }
        if (pd.zPos > 62) {
          this.scene.remove(pd.carRig.root, pd.officers[0].root, pd.officers[1].root);
          disposeVehicleRig(pd.carRig);
          this.policeDispatch = null;
          this.exitGateOpen = false;

          if (this.rejectedActor) {
            this.towRequestAvailable = true;
            this.policeStatus = 'Driver Removed · Request Police Tow Truck (Computer / Radio)';
            this.callbacks.onToast(
              'Police departed with driver! Open Computer or Radio to request the Police Tow Truck.'
            );
          } else {
            if (this.holdingActor === tgt) {
              this.callbacks.onInspectionFinished(tgt.caseData, 'police_handled', 'Handled by Armored Security Unit.');
              this.scene.remove(tgt.rig.root, tgt.driver.root);
              disposeVehicleRig(tgt.rig);
              this.holdingActor = null;
            }
            this.policeStatus = null;
          }
        }
      }
    } else if (!this.towDispatch?.active && this.policeSirenLight.intensity !== 0) {
      this.policeSirenLight.intensity = 0;
    }

    // Police Tow Truck Arrival, Positioning, Winch Hitch, Lift & Physical Towing Sequence
    if (this.towDispatch?.active) {
      const td = this.towDispatch;
      const rej = td.targetActor;
      if (td.towRig.sirenOn) {
        const sirenPhase = Math.sin(this.elapsed * 12) > 0;
        this.policeSirenLight.position.set(td.xPos, 2.7, td.zPos);
        this.policeSirenLight.intensity = 3.6;
        this.policeSirenLight.color.setHex(sirenPhase ? 0xf59e0b : 0x3b82f6);
      }

      const hitchDist = rej.rig.halfLength + td.towRig.halfLength + 0.55;
      const hitchZ = rej.zPos + hitchDist;

      if (td.phase === 'arriving') {
        const wps: [number, number][] = [
          [4.2, Math.max(12, rej.zPos + 13)],
          [6.2, rej.zPos + 4.5],
          [rej.xPos + 0.2, hitchZ + 6.0],
        ];
        const wp = wps[Math.min(td.waypointIdx, wps.length - 1)];
        const spd = td.waypointIdx === 0 ? 9.0 : 6.8;
        const res = driveTowardWaypoint(td.xPos, td.zPos, td.yaw, wp[0], wp[1], spd, 2.4);
        td.xPos = res.x;
        td.zPos = res.z;
        td.yaw = res.yaw;
        td.towRig.root.position.set(td.xPos, 0, td.zPos);
        td.towRig.root.rotation.y = td.yaw;
        animateVehicleRig(td.towRig, dt, spd, res.steer, false, this.elapsed);

        if (res.dist < 1.1) {
          if (td.waypointIdx < wps.length - 1) {
            td.waypointIdx++;
          } else {
            td.phase = 'turning';
            this.towStatus = 'Police Tow Truck aligning ahead of rejected vehicle...';
          }
        }
      } else if (td.phase === 'turning') {
        // Rotate smoothly in place/arc to face +Z (yaw = Math.PI) before reversing onto hitch
        const targetYaw = Math.PI;
        const diff = Math.atan2(Math.sin(targetYaw - td.yaw), Math.cos(targetYaw - td.yaw));
        td.yaw += THREE.MathUtils.clamp(diff, -2.0 * dt, 2.0 * dt);
        td.xPos = THREE.MathUtils.damp(td.xPos, rej.xPos, 3.0, dt);
        td.towRig.root.position.set(td.xPos, 0, td.zPos);
        td.towRig.root.rotation.y = td.yaw;
        animateVehicleRig(td.towRig, dt, 2.2, Math.sign(diff) * 0.4, false, this.elapsed);

        if (Math.abs(diff) < 0.06 && Math.abs(td.xPos - rej.xPos) < 0.15) {
          td.yaw = Math.PI;
          td.xPos = rej.xPos;
          td.phase = 'positioning';
          td.towRig.indicatorState = -1;
          this.towStatus = 'Tow Truck backing up to rejected vehicle front bumper...';
        }
      } else if (td.phase === 'positioning') {
        if (td.zPos > hitchZ + 0.08) {
          const revSpd = Math.min(2.6, Math.max(0.8, (td.zPos - hitchZ) * 1.4));
          td.zPos -= revSpd * dt;
          td.towRig.root.position.set(td.xPos, 0, td.zPos);
          td.towRig.root.rotation.y = td.yaw;
          animateVehicleRig(td.towRig, dt, -revSpd, 0, false, this.elapsed);
        } else {
          td.zPos = hitchZ;
          td.towRig.root.position.set(td.xPos, 0, td.zPos);
          td.phase = 'attaching';
          td.timer = 1.6;
          td.towRig.towDeployed = true;
          this.sound.playTowHitch();
          this.towStatus = 'Lowering hydraulic boom & connecting winch to rejected vehicle...';
        }
      } else if (td.phase === 'attaching') {
        animateVehicleRig(td.towRig, dt, 0, 0, true, this.elapsed);
        td.timer -= dt;
        if (td.timer <= 0) {
          td.phase = 'lifting';
          td.timer = 1.25;
          rej.rig.isTowed = true;
          this.exitGateOpen = true;
          this.sound.playGate();
          this.towStatus = 'Lifting front axle onto wheel-lift cradle...';
        }
      } else if (td.phase === 'lifting') {
        animateVehicleRig(td.towRig, dt, 0, 0, true, this.elapsed);
        animateVehicleRig(rej.rig, dt, 0, 0, false, this.elapsed);
        td.timer -= dt;
        if (td.timer <= 0) {
          td.phase = 'towing';
          td.towRig.indicatorState = 0;
          this.towStatus = 'Towing attached rejected vehicle out of checkpoint...';
        }
      } else if (td.phase === 'towing') {
        const res = driveTowardWaypoint(td.xPos, td.zPos, td.yaw, 0, 68, 7.6, 1.4);
        td.xPos = res.x;
        td.zPos = res.z;
        td.yaw = res.yaw;
        td.towRig.root.position.set(td.xPos, 0, td.zPos);
        td.towRig.root.rotation.y = td.yaw;
        animateVehicleRig(td.towRig, dt, 7.6, res.steer, false, this.elapsed);

        // Physically transport the attached rejected vehicle directly behind the wheel-lift cradle
        const fwdX = -Math.sin(td.yaw);
        const fwdZ = -Math.cos(td.yaw);
        rej.xPos = td.xPos - fwdX * hitchDist;
        rej.zPos = td.zPos - fwdZ * hitchDist;
        rej.yaw = td.yaw;
        rej.rig.root.position.set(rej.xPos, 0, rej.zPos);
        rej.rig.root.rotation.y = rej.yaw;
        animateVehicleRig(rej.rig, dt, 7.6, 0, false, this.elapsed);

        if (rej.zPos > 60) {
          this.scene.remove(td.towRig.root, rej.rig.root, rej.driver.root);
          disposeVehicleRig(td.towRig);
          disposeVehicleRig(rej.rig);
          this.towDispatch = null;
          this.rejectedActor = null;
          this.towStatus = null;
          this.towRequestAvailable = false;
          this.policeStatus = null;
          this.redRejectionAlert = null;
          this.policeSirenLight.intensity = 0;
          this.exitGateOpen = false;
          this.sound.playGate();

          if (this.queue.length > 0) {
            this.currentAlert = {
              vehicleLabel: this.queue[0].caseData.vehicleLabel,
              registration: this.queue[0].caseData.registration,
              lane: 1,
              queuePosition: 1,
              status: 'Waiting for Gate Access',
              totalWaiting: this.queue.length,
            };
            this.alarmActive = true;
            this.sound.startArrivalAlarm();
            updateOfficeMonitorScreen(this.world, this.currentAlert, true);
          } else {
            this.currentAlert = null;
            updateOfficeMonitorScreen(this.world, null, false);
          }
          this.callbacks.onToast('Rejected vehicle towed away! Checkpoint lane is now clear.');
        }
      }
    }
  }

  private tick = () => {
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsed += dt;

    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    if (!this.paused) {
      const hoursDelta = (dt / 60) * 0.8;
      let nextTime = (this.timeOfDay + hoursDelta) % 24;
      if (nextTime >= 4.0 && nextTime < 21.0) {
        nextTime = 21.0;
      }
      this.timeOfDay = nextTime;
      this.timeSyncAccum += hoursDelta;
      if (this.timeSyncAccum >= 0.014) {
        this.callbacks.onTimeAdvance(this.timeSyncAccum);
        this.timeSyncAccum = 0;
      }

      this.updatePlayer(dt);
      this.raycastTimer += dt;
      if (this.raycastTimer >= 0.045) {
        this.raycastTimer = 0;
        this.performCenterRaycast();
      }
    }

    // Animate office door, drawers, gates, and wall clock
    const doorTarget = this.officeDoorOpen ? -Math.PI * 0.48 : 0;
    if (Math.abs(this.world.officeDoorPivot.rotation.y - doorTarget) > 0.002) {
      this.world.officeDoorPivot.rotation.y = THREE.MathUtils.damp(
        this.world.officeDoorPivot.rotation.y,
        doorTarget,
        8,
        dt
      );
    }
    this.world.drawerPivots.forEach((dp, i) => {
      const targetX = this.drawersOpen[i] ? 0.35 : 0.85;
      if (Math.abs(dp.position.x - targetX) > 0.002) {
        dp.position.x = THREE.MathUtils.damp(dp.position.x, targetX, 9, dt);
      }
    });
    const entryTarget = this.entryGateOpen ? Math.PI * 0.42 : 0;
    if (Math.abs(this.entryGateAngle - entryTarget) > 0.002) {
      this.entryGateAngle = THREE.MathUtils.damp(this.entryGateAngle, entryTarget, 7, dt);
      this.world.entryBarrierPivot.rotation.z = this.entryGateAngle;
    }
    const exitTarget = this.exitGateOpen ? Math.PI * 0.42 : 0;
    if (Math.abs(this.exitGateAngle - exitTarget) > 0.002) {
      this.exitGateAngle = THREE.MathUtils.damp(this.exitGateAngle, exitTarget, 7, dt);
      this.world.exitBarrierPivot.rotation.z = this.exitGateAngle;
    }

    if (this.lastEntryLightState !== this.entryGateOpen) {
      this.lastEntryLightState = this.entryGateOpen;
      (this.world.entryLights.red.material as THREE.MeshStandardMaterial).emissiveIntensity = this.entryGateOpen ? 0.1 : 2.2;
      (this.world.entryLights.green.material as THREE.MeshStandardMaterial).emissiveIntensity = this.entryGateOpen ? 2.4 : 0.1;
    }
    if (this.lastExitLightState !== this.exitGateOpen) {
      this.lastExitLightState = this.exitGateOpen;
      (this.world.exitLights.red.material as THREE.MeshStandardMaterial).emissiveIntensity = this.exitGateOpen ? 0.1 : 2.2;
      (this.world.exitLights.green.material as THREE.MeshStandardMaterial).emissiveIntensity = this.exitGateOpen ? 2.4 : 0.1;
    }

    // Wall Clock Hands
    const mins = (this.timeOfDay % 1) * 60;
    this.world.clockHands.hour.rotation.z = -(this.timeOfDay / 12) * Math.PI * 2;
    this.world.clockHands.minute.rotation.z = -(mins / 60) * Math.PI * 2;
    this.world.clockHands.second.rotation.z = -this.elapsed * 0.5;

    // Permanent Night-Shift Moonlit Atmosphere & Checkpoint Floodlighting
    const isNight = true;
    const weatherDim = this.weather === 'rain' ? 0.72 : this.weather === 'cloudy' || this.weather === 'fog' ? 0.82 : 1.0;

    // Subtle cool silver-blue moonlight keeps mountains, trees & shadows crisp at night
    this.sunLight.intensity = 0.42 * weatherDim;
    this.sunLight.color.setHex(0xb8d4f4);
    this.hemiLight.intensity = 0.56 * weatherDim;
    this.rimLight.intensity = 0.28 * weatherDim;
    this.scene.environmentIntensity = 0.36 * weatherDim;

    // Position Moon high in the starry night sky
    const nightProgress = this.timeOfDay >= 21 ? this.timeOfDay - 21 : this.timeOfDay + 3; // 0..7h
    const moonAngle = 0.65 + (nightProgress / 7) * 1.4;
    const moonX = Math.cos(moonAngle) * 115;
    const moonY = Math.max(42, Math.sin(moonAngle) * 95);
    const moonZ = -70;
    this.world.sunDisc.position.set(moonX, moonY, moonZ);
    this.world.sunDisc.lookAt(this.camera.position);
    (this.world.sunDisc.material as THREE.MeshBasicMaterial).color.setHex(0xe2e8f0);
    this.sunLight.position.set(moonX * 0.55, moonY * 0.75, moonZ * 0.55);

    const isStormy = this.weather === 'rain' || this.weather === 'fog';
    if (isStormy) _skyWorkCol.setHex(0x0f172a);
    else _skyWorkCol.copy(_skyNightCol);
    _skyZenithWorkCol.copy(_skyZenithNightCol);

    this.skyMesh.position.copy(this.camera.position);
    this.skyMat.uniforms.uZenithColor.value.copy(_skyZenithWorkCol);
    this.skyMat.uniforms.uHorizonColor.value.copy(_skyWorkCol);
    this.skyMat.uniforms.uSunDir.value.set(moonX, moonY, moonZ).normalize();
    this.skyMat.uniforms.uSunColor.value.setHex(0xcbd5e1);
    this.skyMat.uniforms.uNightAmount.value = 1.0;
    this.skyMat.uniforms.uCloudAmount.value =
      this.weather === 'cloudy' ? 0.78 : isStormy ? 0.92 : 0.34;
    this.skyMat.uniforms.uTime.value = this.elapsed;

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(_skyWorkCol);
    }
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(_skyWorkCol);
      this.scene.fog.far = this.weather === 'fog' ? 75 : this.settings.graphics.renderDistance;
    }
    const nlTarget = 3.2;
    for (const nl of this.world.nightLights) {
      const target = nl === this.world.officeLamp ? (this.officeLightOn ? 2.4 : 0) : nlTarget;
      if (nl.intensity !== target) nl.intensity = target;
    }
    const fixEmissive = 1.65;
    for (const fm of this.world.emissiveNightFixtures) {
      if (fm.emissiveIntensity !== fixEmissive) fm.emissiveIntensity = fixEmissive;
    }

    // Animate stationed border sentries only when nearby
    for (const sentry of this.world.sentries) {
      if (sentry.root.position.distanceToSquared(this.playerPos) < 625) {
        updateCharacterAnimation(sentry, dt, this.playerPos);
      }
    }

    if (this.rainPoints.visible) {
      this.rainPoints.position.set(this.playerPos.x, 0, this.playerPos.z);
      const posAttr = this.rainPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= dt * 18;
        if (arr[i + 1] < 0) arr[i + 1] = 18;
      }
      posAttr.needsUpdate = true;
    }

    this.updateTrafficAndActors(dt, isNight);

    // Optional 30 FPS limit skips alternating render draws while keeping input responsive
    this.oddFrameSkip = !this.oddFrameSkip;
    const shouldRender = this.settings.graphics.fpsLimit !== 30 || this.oddFrameSkip;
    if (shouldRender) {
      if (this.renderer.shadowMap.enabled) {
        this.shadowFrameCounter++;
        if (this.shadowFrameCounter % 3 === 0) {
          this.renderer.shadowMap.needsUpdate = true;
        }
      }
      if (this.composer && this.settings.graphics.postProcessing) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }

    this.hudTimer += dt;
    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      let queueNear = 0;
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].zPos > -55) queueNear++;
      }
      this.callbacks.onHudSync({
        aimPrompt: this.paused ? null : this.currentAimPrompt,
        lensMode: this.lensMode,
        flashlightOn: this.flashlightOn,
        sitting: this.sitting,
        cctvIndex: this.cctvIndex,
        cctvLabel: this.cctvIndex >= 0 ? CCTV_FEEDS[this.cctvIndex].label : '',
        alarmActive: this.alarmActive,
        currentAlert: this.currentAlert,
        waitingCount: this.queue.length,
        activeCase: this.activeActor?.caseData ?? null,
        holdingCase: this.holdingActor?.caseData ?? null,
        rejectedCase: this.rejectedActor?.caseData ?? null,
        redRejectionAlert: this.redRejectionAlert,
        towAvailable: this.towRequestAvailable,
        towStatus: this.towStatus,
        entryGateOpen: this.entryGateOpen,
        exitGateOpen: this.exitGateOpen,
        policeStatus: this.policeStatus,
        fps: this.currentFps,
        driverOutside:
          this.activeActor?.driverState === 'outside' ||
          this.holdingActor?.driverState === 'outside' ||
          this.rejectedActor?.driverState === 'outside',
        playerX: Math.round(this.playerPos.x * 10) / 10,
        playerZ: Math.round(this.playerPos.z * 10) / 10,
        playerYaw: Math.round(this.playerYaw * 20) / 20,
        queueCountNear: queueNear,
        policeX: this.policeDispatch?.active
          ? Math.round(this.policeDispatch.xPos * 10) / 10
          : this.towDispatch?.active
          ? Math.round(this.towDispatch.xPos * 10) / 10
          : null,
        policeZ: this.policeDispatch?.active
          ? Math.round(this.policeDispatch.zPos * 10) / 10
          : this.towDispatch?.active
          ? Math.round(this.towDispatch.zPos * 10) / 10
          : null,
      });
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 4);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 12);
        }
      };
      this.frameId = window.setTimeout(poll, 4);
    } catch {
      this.frameId = window.setTimeout(cb, 16);
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.sound.stopArrivalAlarm();
    this.sound.setSiren(false);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
