import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Camera,
  ClipboardCheck,
  DoorOpen,
  FileWarning,
  Flashlight,
  FolderOpen,
  HardDrive,
  Pause,
  Play,
  ScanSearch,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Truck,
} from 'lucide-react';
import {
  ActiveModalType,
  AllSettings,
  DailyTarget,
  DifficultyLevel,
  InspectionCase,
  InspectionHistoryEntry,
  PlayerCareerStats,
  SaveSlotData,
} from './types/game';
import {
  DEFAULT_SETTINGS,
  INITIAL_DAILY_TARGETS,
  INITIAL_STATS,
  RANKS,
} from './data/gameData';
import { SoundEngine } from './engine/SoundEngine';
import { SimHudState, SimulationEngine } from './engine/SimulationEngine';
import { DocumentModal } from './components/DocumentModal';
import { SettingsModal } from './components/SettingsModal';
import {
  BulletinModal,
  CareerModal,
  ComputerModal,
  DriverMenuModal,
  ReportModal,
  SaveLoadModal,
  WeighbridgeModal,
} from './components/OfficePanels';

const SETTINGS_KEY = 'bp_graphics_settings_v2';
const SAVE_PREFIX = 'bp_lowgfx_save_';

function loadStoredSettings(): AllSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AllSettings>;
    return {
      graphics: { ...DEFAULT_SETTINGS.graphics, ...parsed.graphics },
      audio: { ...DEFAULT_SETTINGS.audio, ...parsed.audio },
      controls: { ...DEFAULT_SETTINGS.controls, ...parsed.controls },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readSaveSlots(): Record<string, SaveSlotData | null> {
  const slots: Record<string, SaveSlotData | null> = {
    autosave: null,
    slot_1: null,
    slot_2: null,
    slot_3: null,
  };
  for (const id of Object.keys(slots)) {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + id);
      if (raw) slots[id] = JSON.parse(raw) as SaveSlotData;
    } catch {
      slots[id] = null;
    }
  }
  return slots;
}

function formatClock(hours: number): string {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);

  const [settings, setSettings] = useState<AllSettings>(loadStoredSettings);
  const [stats, setStats] = useState<PlayerCareerStats>(INITIAL_STATS);
  const [dailyTargets, setDailyTargets] = useState<DailyTarget[]>(INITIAL_DAILY_TARGETS);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('standard');
  const [activeModal, setActiveModal] = useState<ActiveModalType>('main_menu');
  const [hasStartedShift, setHasStartedShift] = useState(false);

  const [modalCase, setModalCase] = useState<InspectionCase | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<{ speaker: string; text: string } | null>(null);
  const [saveSlots, setSaveSlots] = useState<Record<string, SaveSlotData | null>>(readSaveSlots);

  const [hud, setHud] = useState<SimHudState>({
    aimPrompt: null,
    lensMode: false,
    flashlightOn: false,
    sitting: false,
    cctvIndex: -1,
    cctvLabel: '',
    alarmActive: false,
    currentAlert: null,
    waitingCount: 0,
    activeCase: null,
    holdingCase: null,
    rejectedCase: null,
    redRejectionAlert: null,
    towAvailable: false,
    towStatus: null,
    entryGateOpen: false,
    exitGateOpen: false,
    policeStatus: null,
    fps: 60,
    driverOutside: false,
    playerX: -11,
    playerZ: -5,
    playerYaw: -1.25,
    queueCountNear: 0,
    policeX: null,
    policeZ: null,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!subtitle) return;
    const t = window.setTimeout(() => setSubtitle(null), 4600);
    return () => window.clearTimeout(t);
  }, [subtitle]);

  const statsRef = useRef(stats);
  statsRef.current = stats;
  const targetsRef = useRef(dailyTargets);
  targetsRef.current = dailyTargets;
  const activeModalRef = useRef(activeModal);
  activeModalRef.current = activeModal;

  const saveToSlot = useCallback(
    (slotId: string) => {
      const payload: SaveSlotData = {
        slotId,
        savedAt: new Date().toISOString(),
        stats: statsRef.current,
        dailyTargets: targetsRef.current,
      };
      try {
        localStorage.setItem(SAVE_PREFIX + slotId, JSON.stringify(payload));
        setSaveSlots(readSaveSlots());
        if (slotId !== 'autosave') showToast(`Saved shift to ${slotId.replace('_', ' ')}`);
      } catch {
        // ignore storage limits
      }
    },
    [showToast]
  );

  const loadFromSlot = useCallback(
    (slotId: string) => {
      try {
        const raw = localStorage.getItem(SAVE_PREFIX + slotId);
        if (!raw) return;
        const data = JSON.parse(raw) as SaveSlotData;
        const t = data.stats.timeOfDay;
        const nightStats: PlayerCareerStats = {
          ...data.stats,
          timeOfDay: t >= 4.0 && t < 21.0 ? 22.5 : t,
          history: data.stats.history ?? [],
        };
        setStats(nightStats);
        setDailyTargets(data.dailyTargets);
        setHasStartedShift(true);
        setActiveModal(null);
        engineRef.current?.resetToShiftStart();
        showToast(`Loaded Night Shift ${nightStats.day}.`);
      } catch {
        showToast('Failed to read saved shift.');
      }
    },
    [showToast]
  );

  const handleInspectionFinished = useCallback(
    (caseData: InspectionCase, outcome: 'approved' | 'rejected' | 'police_handled', reason?: string) => {
      const hasIssues = caseData.issuesSummary.length > 0;
      const isCommercialTruck = caseData.isCommercial;
      const recordedReason =
        reason?.trim() ||
        caseData.rejectionReason ||
        (outcome === 'approved'
          ? 'All weight, document, and cargo checks cleared.'
          : caseData.issuesSummary[0] ?? 'Checkpoint compliance violation');

      let accurate = false;
      let xpGain = 15;
      let cashDelta = 0;

      if (outcome === 'approved') {
        accurate = !hasIssues;
        xpGain = accurate ? 60 : 15;
        cashDelta = accurate ? 65 : -40;
        showToast(
          accurate
            ? `Vehicle Cleared Accurately (+${xpGain} XP, +$${cashDelta})`
            : `Inspection Error: Missed violation (${caseData.issuesSummary[0]}) (-$40)`
        );
      } else if (outcome === 'rejected') {
        accurate = hasIssues;
        xpGain = accurate ? 85 : 15;
        cashDelta = accurate ? 90 : -35;
        showToast(
          accurate
            ? `Vehicle Rejected — Police Dispatched! (+${xpGain} XP, +$${cashDelta})`
            : 'Vehicle Rejected — Police Dispatched (-$35 false flag)'
        );
      } else {
        accurate = hasIssues;
        xpGain = caseData.requiresPolice ? 120 : 65;
        cashDelta = caseData.requiresPolice ? 130 : 50;
        showToast(`Police Unit Resolved Case (+${xpGain} XP, +$${cashDelta})`);
      }

      const historyEntry: InspectionHistoryEntry = {
        caseId: caseData.caseId,
        vehicleLabel: caseData.vehicleLabel,
        registration: caseData.registration,
        driverName: caseData.driverName,
        decision: outcome,
        reason: recordedReason,
        timestamp: `Shift ${statsRef.current.day} · ${formatClock(statsRef.current.timeOfDay)}`,
      };

      setStats((prev) => ({
        ...prev,
        xp: prev.xp + xpGain,
        cash: Math.max(0, prev.cash + cashDelta),
        totalInspected: prev.totalInspected + 1,
        accurateDecisions: prev.accurateDecisions + (accurate ? 1 : 0),
        trucksInspected: prev.trucksInspected + (isCommercialTruck ? 1 : 0),
        violationsCaught: prev.violationsCaught + (outcome !== 'approved' && hasIssues ? 1 : 0),
        policeAssistsCalled: prev.policeAssistsCalled + (outcome === 'police_handled' ? 1 : 0),
        history: [historyEntry, ...(prev.history ?? [])].slice(0, 50),
      }));

      setDailyTargets((prev) =>
        prev.map((t) => {
          if (t.completed) return t;
          let inc = 0;
          if (t.type === 'inspect_any') inc = 1;
          else if (t.type === 'inspect_trucks' && isCommercialTruck) inc = 1;
          else if (t.type === 'catch_violations' && outcome !== 'approved' && hasIssues) inc = 1;
          return inc > 0 ? { ...t, progress: Math.min(t.target, t.progress + inc) } : t;
        })
      );

      saveToSlot('autosave');
    },
    [saveToSlot, showToast]
  );

  // Mount Three.js SimulationEngine ONCE
  useEffect(() => {
    if (!mountRef.current) return;
    const sound = new SoundEngine(settings.audio);
    soundRef.current = sound;

    const engine = new SimulationEngine(mountRef.current, settings, sound, {
      onHudSync: (nextHud) =>
        setHud((prev) => {
          if (
            prev.aimPrompt === nextHud.aimPrompt &&
            prev.lensMode === nextHud.lensMode &&
            prev.flashlightOn === nextHud.flashlightOn &&
            prev.sitting === nextHud.sitting &&
            prev.cctvIndex === nextHud.cctvIndex &&
            prev.alarmActive === nextHud.alarmActive &&
            prev.waitingCount === nextHud.waitingCount &&
            prev.entryGateOpen === nextHud.entryGateOpen &&
            prev.exitGateOpen === nextHud.exitGateOpen &&
            prev.policeStatus === nextHud.policeStatus &&
            prev.towAvailable === nextHud.towAvailable &&
            prev.towStatus === nextHud.towStatus &&
            prev.fps === nextHud.fps &&
            prev.driverOutside === nextHud.driverOutside &&
            prev.playerX === nextHud.playerX &&
            prev.playerZ === nextHud.playerZ &&
            prev.playerYaw === nextHud.playerYaw &&
            prev.queueCountNear === nextHud.queueCountNear &&
            prev.policeX === nextHud.policeX &&
            prev.policeZ === nextHud.policeZ &&
            prev.activeCase === nextHud.activeCase &&
            prev.holdingCase === nextHud.holdingCase &&
            prev.rejectedCase === nextHud.rejectedCase &&
            prev.redRejectionAlert === nextHud.redRejectionAlert &&
            prev.currentAlert === nextHud.currentAlert
          ) {
            return prev;
          }
          return nextHud;
        }),
      onOpenComputer: () => setActiveModal('computer'),
      onOpenWeighbridge: (c) => {
        setModalCase({ ...c });
        setActiveModal('weighbridge');
      },
      onOpenDocuments: (c) => {
        setModalCase({ ...c });
        setActiveModal('documents');
      },
      onOpenReport: (c) => {
        setModalCase({ ...c });
        setActiveModal('report');
      },
      onOpenDriverMenu: (c) => {
        setModalCase({ ...c });
        setActiveModal('driver_menu');
      },
      onOpenBulletin: () => setActiveModal((prev) => (prev === 'bulletin' ? null : 'bulletin')),
      onSubtitle: (speaker, text) => setSubtitle({ speaker, text }),
      onToast: showToast,
      onPauseToggle: () => {
        if (activeModalRef.current === 'main_menu') return;
        setActiveModal((prev) => (prev ? null : 'pause'));
      },
      onTimeAdvance: (hoursDelta) => {
        setStats((s) => {
          const nextTime = (s.timeOfDay + hoursDelta) % 24;
          if (nextTime >= 4.0 && nextTime < 21.0) {
            const nextDay = s.day + 1;
            const weathers = ['clear', 'cloudy', 'rain', 'fog'] as const;
            return {
              ...s,
              day: nextDay,
              timeOfDay: 21.0,
              weather: weathers[nextDay % weathers.length],
            };
          }
          return { ...s, timeOfDay: nextTime };
        });
      },
      onInspectionFinished: handleInspectionFinished,
    });

    engineRef.current = engine;
    return () => {
      engine.dispose();
      sound.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause engine when any modal is open
  useEffect(() => {
    engineRef.current?.setPaused(activeModal !== null);
  }, [activeModal]);

  // Sync settings to engine + storage
  useEffect(() => {
    engineRef.current?.applySettings(settings);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Sync world parameters
  useEffect(() => {
    engineRef.current?.syncWorldParams(stats.day, stats.difficulty, stats.timeOfDay, stats.weather);
  }, [stats.day, stats.difficulty, stats.timeOfDay, stats.weather]);

  // Rank check
  useEffect(() => {
    let nextRank = stats.rankIndex;
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (stats.xp >= RANKS[i].xpRequired) {
        nextRank = i;
        break;
      }
    }
    if (nextRank > stats.rankIndex) {
      setStats((s) => ({ ...s, rankIndex: nextRank }));
      soundRef.current?.playPromotion();
      showToast(`Promoted to ${RANKS[nextRank].name}!`);
    }
  }, [stats.xp, stats.rankIndex, showToast]);

  const startNewShift = () => {
    soundRef.current?.unlock();
    setStats({ ...INITIAL_STATS, difficulty: selectedDifficulty, history: [] });
    setDailyTargets(INITIAL_DAILY_TARGETS.map((t) => ({ ...t })));
    setHasStartedShift(true);
    engineRef.current?.resetToShiftStart();
    setActiveModal(null);
    showToast('Shift begun inside Border Office. Watch for incoming vehicles at Gate 1.');
  };

  const activeInspectionCase = hud.activeCase ?? hud.holdingCase ?? hud.rejectedCase;
  const currentRank = RANKS[stats.rankIndex] ?? RANKS[0];

  const handleWeighbridgeVerdict = (verdict: 'pass' | 'fail') => {
    const target = hud.activeCase ?? hud.holdingCase;
    if (target) {
      target.weighbridgeVerdict = verdict;
      setModalCase({ ...target });
    }
    soundRef.current?.playClick();
    setActiveModal(null);
    showToast(`Weighbridge verdict recorded: ${verdict.toUpperCase()}`);
  };

  const handleDocumentVerdict = (verdict: 'valid' | 'invalid') => {
    const target = hud.activeCase ?? hud.holdingCase;
    if (target) {
      target.documentsVerdict = verdict;
      setModalCase({ ...target });
    }
    soundRef.current?.playStamp(verdict === 'valid');
    setActiveModal(null);
    showToast(`Documents verdict recorded: ${verdict.toUpperCase()}`);
  };

  const handleClaimTarget = (id: string) => {
    const target = dailyTargets.find((t) => t.id === id);
    if (!target || target.completed || target.progress < target.target) return;
    soundRef.current?.playStamp(true);
    setDailyTargets((prev) => prev.map((t) => (t.id === id ? { ...t, completed: true } : t)));
    setStats((s) => ({
      ...s,
      xp: s.xp + target.rewardXp,
      cash: s.cash + target.rewardCash,
    }));
    showToast(`Target Claimed: +${target.rewardXp} XP, +$${target.rewardCash}`);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 text-stone-100 select-none">
      {/* 1. ISOLATED 3D WEBGL CANVAS CONTAINER */}
      <div
        ref={mountRef}
        className="fixed inset-0 z-0"
      />

      {/* 2. IN-GAME HUD */}
      {activeModal !== 'main_menu' && (
        <div
          onClickCapture={(e) => {
            const btn = (e.target as HTMLElement | null)?.closest('button');
            if (btn) btn.blur();
          }}
          className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4"
        >
          {/* Top Row */}
          <div className="flex items-start justify-between gap-4">
            {/* Top-Left: Vehicle Arrival Alert & Active Inspection Status */}
            <div className="flex flex-col gap-2 max-w-sm">
              {(hud.alarmActive || hud.currentAlert) && (
                <div
                  className={`pointer-events-auto rounded border p-3.5 shadow-xl ${
                    hud.alarmActive
                      ? 'border-rose-500 bg-stone-950/95'
                      : 'border-amber-500/60 bg-stone-950/92'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wide text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {hud.alarmActive ? 'NEW VEHICLE ARRIVED!' : 'CHECKPOINT QUEUE'}
                    </div>
                    <span className="text-[11px] font-mono text-stone-300">
                      Queue: {hud.waitingCount}
                    </span>
                  </div>
                  {hud.currentAlert && (
                    <div className="mt-1.5 text-xs text-stone-200 space-y-0.5">
                      <div>
                        <span className="text-stone-400">Vehicle:</span>{' '}
                        <strong>{hud.currentAlert.vehicleLabel}</strong> ({hud.currentAlert.registration})
                      </div>
                      <div className="text-[11px] text-amber-300">
                        Waiting at Inspection Gate {hud.currentAlert.lane} · {hud.currentAlert.status}
                      </div>
                    </div>
                  )}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {hud.alarmActive && (
                      <button
                        onClick={() => engineRef.current?.acknowledgeAlarm()}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Acknowledge Alert
                      </button>
                    )}
                    <button
                      onClick={() => engineRef.current?.toggleEntryGate()}
                      className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      {hud.entryGateOpen ? 'Close Entry Gate' : 'Open Entry Gate'}
                    </button>
                  </div>
                </div>
              )}

              {hud.redRejectionAlert && (
                <div className="pointer-events-auto rounded border-2 border-rose-500 bg-rose-950/95 px-3.5 py-3 text-xs shadow-2xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-display font-bold uppercase tracking-wide text-rose-300">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      VEHICLE REJECTED — STATUS: REJECTED
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-bold">
                      RED ALERT
                    </span>
                  </div>
                  <div className="text-stone-100">
                    <strong>{hud.redRejectionAlert.vehicleLabel}</strong> ({hud.redRejectionAlert.registration})
                  </div>
                  <div className="text-[11px] text-rose-200">
                    Reason: {hud.redRejectionAlert.reason}
                  </div>
                  {hud.towAvailable && (
                    <button
                      onClick={() => engineRef.current?.requestTowTruck()}
                      className="mt-1 w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-[11px] cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" /> Request Police Tow Truck (Unit T-04)
                    </button>
                  )}
                </div>
              )}

              {activeInspectionCase && (
                <div className="pointer-events-auto rounded border border-stone-700/90 bg-stone-950/92 px-3.5 py-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-amber-400">
                      {hud.activeCase
                        ? 'Bay Inspection:'
                        : hud.rejectedCase
                        ? 'Rejected Vehicle:'
                        : 'Holding Area:'}{' '}
                      {activeInspectionCase.vehicleLabel}
                    </span>
                    <span className="font-mono text-stone-300">{activeInspectionCase.registration}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                    <span className="text-stone-300">
                      Scale: <strong className="uppercase">{activeInspectionCase.weighbridgeVerdict}</strong>
                    </span>
                    <span className="text-stone-600">·</span>
                    <span className="text-stone-300">
                      Docs: <strong className="uppercase">{activeInspectionCase.documentsVerdict}</strong>
                    </span>
                    <span className="text-stone-600">·</span>
                    <span className="text-stone-300">
                      Lens:{' '}
                      <strong>
                        {activeInspectionCase.hotspots.filter((h) => h.inspected).length}/
                        {activeInspectionCase.hotspots.length}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {hud.policeStatus && (
                <div className="rounded border border-blue-500/60 bg-stone-950/95 px-3.5 py-2 text-xs text-blue-200 flex items-center gap-2">
                  <Siren className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{hud.policeStatus}</span>
                </div>
              )}

              {hud.towStatus && (
                <div className="rounded border border-amber-500/60 bg-stone-950/95 px-3.5 py-2 text-xs text-amber-200 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{hud.towStatus}</span>
                </div>
              )}
            </div>

            {/* Top-Right: Shift Stats & Controls + Lens Compartment Checklist */}
            <div className="flex flex-col items-end gap-2">
              <div className="pointer-events-auto flex items-center gap-2.5 rounded border border-stone-700/80 bg-stone-950/92 px-3.5 py-2 text-xs">
                <div className="font-mono tabular-nums text-stone-200">
                  Night Shift {stats.day} · {formatClock(stats.timeOfDay)} · <span className="capitalize">{stats.weather}</span>
                </div>
                <span className="text-stone-700">|</span>
                <div className="text-stone-300 hidden md:block">{currentRank.name}</div>
                <span className="text-stone-700 hidden md:inline">|</span>
                <div className="font-mono tabular-nums text-amber-300">{stats.xp} XP</div>
                <div className="font-mono tabular-nums font-semibold text-emerald-400">${stats.cash}</div>
                <span className="text-stone-700 hidden sm:inline">|</span>
                <div className="font-mono tabular-nums text-stone-400 hidden sm:block">{hud.fps} FPS</div>
                <button
                  onClick={() => setActiveModal('career')}
                  className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 cursor-pointer"
                  title="Career & Daily Targets"
                >
                  <Award className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveModal('pause')}
                  className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                  title="Pause Menu (Esc)"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              </div>

              {hud.lensMode && activeInspectionCase && (
                <div className="rounded border border-cyan-500/60 bg-stone-950/92 p-3 w-64 text-[11px] space-y-1.5 shadow-xl">
                  <div className="font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Lens Scanner Active</span>
                    <span>{activeInspectionCase.registration}</span>
                  </div>
                  {activeInspectionCase.hotspots.map((hs) => (
                    <div
                      key={hs.id}
                      className="flex items-center justify-between gap-2 border-t border-stone-800/80 pt-1"
                    >
                      <span className="text-stone-300 truncate">{hs.partLabel}</span>
                      <span
                        className={`font-mono font-bold uppercase ${
                          !hs.inspected
                            ? 'text-cyan-400'
                            : hs.isIssue
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {!hs.inspected ? 'SCAN' : hs.isIssue ? 'ISSUE' : 'CLEAR'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center Granny-Style White Dot Crosshair + Prompt + CCTV Overlay */}
          {activeModal === null && (
            <div className="flex flex-col items-center justify-center gap-3">
              {hud.cctvIndex >= 0 ? (
                <div className="pointer-events-auto rounded border border-sky-500/60 bg-stone-950/90 px-5 py-2.5 flex items-center gap-4 text-xs">
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span className="font-mono font-bold text-sky-300">{hud.cctvLabel}</span>
                  <button
                    onClick={() => engineRef.current?.toggleCctv(false)}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 cursor-pointer"
                  >
                    Next Camera
                  </button>
                  <button
                    onClick={() => engineRef.current?.toggleCctv(true)}
                    className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white cursor-pointer"
                  >
                    Turn Off CCTV (Esc)
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className={`w-2 h-2 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.9)] ${
                      hud.lensMode ? 'bg-cyan-300 ring-4 ring-cyan-400/40' : 'bg-white'
                    }`}
                  />
                  {hud.aimPrompt && (
                    <div className="px-3.5 py-1.5 rounded border border-amber-400/70 bg-stone-950/92 text-xs font-mono font-semibold text-amber-200">
                      {hud.aimPrompt} <span className="text-stone-400 font-normal">· Left Click</span>
                    </div>
                  )}
                  {hud.sitting && (
                    <div className="px-3 py-1 rounded bg-stone-950/90 border border-stone-700 text-[11px] text-stone-300">
                      Seated at Office Desk · Press W, Space, or E to Stand Up
                    </div>
                  )}
                </>
              )}

              {toast && (
                <div className="px-4 py-2 rounded border border-emerald-500/60 bg-stone-950/95 text-xs font-medium text-emerald-200">
                  {toast}
                </div>
              )}
            </div>
          )}

          {/* Bottom Row: Subtitles, Quick Tool Bar + Tactical Checkpoint Mini-Map */}
          <div className="flex items-end justify-between gap-4">
            <div className="hidden lg:block w-32" />

            <div className="flex flex-col items-center gap-2 flex-1">
              {subtitle && (
                <div className="max-w-xl rounded border border-stone-700 bg-stone-950/95 px-5 py-2.5 text-center shadow-xl">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                    {subtitle.speaker}
                  </div>
                  <div className="text-xs text-stone-100 mt-0.5">{subtitle.text}</div>
                </div>
              )}

              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded border border-stone-700/80 bg-stone-950/92 px-3 py-1.5 text-xs">
                <button
                  onClick={() => engineRef.current?.toggleLensMode()}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium cursor-pointer ${
                    hud.lensMode
                      ? 'bg-cyan-600 text-white'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                  }`}
                >
                  <ScanSearch className="w-3.5 h-3.5" /> [L] Lens {hud.lensMode ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => engineRef.current?.toggleFlashlight()}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium cursor-pointer ${
                    hud.flashlightOn
                      ? 'bg-amber-400 text-stone-950 font-semibold'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                  }`}
                >
                  <Flashlight className="w-3.5 h-3.5" /> [F] Light
                </button>
                <button
                  onClick={() => setActiveModal('bulletin')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium cursor-pointer"
                >
                  <FileWarning className="w-3.5 h-3.5 text-amber-400" /> [B] BOLO
                </button>
                <button
                  onClick={() => engineRef.current?.toggleEntryGate()}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium cursor-pointer ${
                    hud.entryGateOpen ? 'bg-emerald-700 text-white' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                  }`}
                >
                  <DoorOpen className="w-3.5 h-3.5" /> Entry: {hud.entryGateOpen ? 'OPEN' : 'CLOSED'}
                </button>
                <button
                  onClick={() => engineRef.current?.toggleExitGate()}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium cursor-pointer ${
                    hud.exitGateOpen ? 'bg-emerald-700 text-white' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                  }`}
                >
                  Exit: {hud.exitGateOpen ? 'OPEN' : 'CLOSED'}
                </button>
                {activeInspectionCase && (
                  <button
                    onClick={() => {
                      setModalCase({ ...activeInspectionCase });
                      setActiveModal('report');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold cursor-pointer"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" /> Report
                  </button>
                )}
                <button
                  onClick={() => engineRef.current?.requestPoliceAssistance()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-blue-800 hover:bg-blue-700 text-white font-medium cursor-pointer"
                >
                  <Siren className="w-3.5 h-3.5" /> Police
                </button>
                {hud.towAvailable && (
                  <button
                    onClick={() => engineRef.current?.requestTowTruck()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold cursor-pointer animate-pulse"
                  >
                    <Truck className="w-3.5 h-3.5" /> Request Tow Truck
                  </button>
                )}
              </div>
            </div>

            {/* Bottom-Right Tactical Checkpoint Mini-Map */}
            <div className="hidden sm:flex flex-col items-center rounded border border-stone-700/80 bg-stone-950/92 p-1.5 shadow-xl">
              <svg width="116" height="116" viewBox="-22 -30 44 60" className="rounded bg-stone-900">
                {/* Highway */}
                <rect x="-5.5" y="-30" width="11" height="60" fill="#27272a" />
                {/* Weighbridge Bay */}
                <rect x="-2.4" y="-5.2" width="4.8" height="10.4" fill="#475569" stroke="#f59e0b" strokeWidth="0.6" />
                {/* Office Building */}
                <rect x="-14.2" y="-8.2" width="7.4" height="8.4" fill="#57534e" stroke="#a8a29e" strokeWidth="0.5" />
                {/* Holding Area */}
                <rect x="9.2" y="-4" width="8.5" height="16" fill="#3f3f46" stroke="#f97316" strokeWidth="0.5" />
                {/* Entry & Exit Gates */}
                <line x1="-5" y1="-18" x2="5" y2="-18" stroke={hud.entryGateOpen ? '#22c55e' : '#ef4444'} strokeWidth="1.4" />
                <line x1="-5" y1="18" x2="5" y2="18" stroke={hud.exitGateOpen ? '#22c55e' : '#ef4444'} strokeWidth="1.4" />
                {/* Active, Rejected, Holding & Queued Vehicles */}
                {hud.waitingCount > 0 && <rect x="-1.6" y="-27" width="3.2" height="6" fill="#fbbf24" rx="0.5" />}
                {hud.activeCase && <rect x="-1.7" y="-3.2" width="3.4" height="6.4" fill="#38bdf8" rx="0.5" />}
                {hud.rejectedCase && <rect x="-1.8" y="-3.4" width="3.6" height="6.8" fill="#ef4444" rx="0.5" />}
                {hud.holdingCase && <rect x="11.8" y="1" width="3.4" height="6.4" fill="#fb7185" rx="0.5" />}
                {hud.policeX !== null && hud.policeZ !== null && (
                  <circle cx={hud.policeX} cy={hud.policeZ} r="2.0" fill="#3b82f6" />
                )}
                {/* Player Marker + Look Direction */}
                <g transform={`translate(${hud.playerX}, ${hud.playerZ}) rotate(${(-hud.playerYaw * 180) / Math.PI})`}>
                  <polygon points="0,-3 2.2,2.2 -2.2,2.2" fill="#22c55e" />
                </g>
              </svg>
              <div className="text-[9px] font-mono text-stone-400 mt-0.5 tracking-wider">SECTOR 7 RADAR</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN MENU */}
      {activeModal === 'main_menu' && (
        <div className="fixed inset-0 z-50 flex items-center justify-start bg-gradient-to-r from-stone-950/95 via-stone-950/85 to-transparent p-8 sm:p-16">
          <div className="max-w-lg space-y-6">
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
                Checkpoint Sector 7 · High-Detail PBR Simulation
              </div>
              <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-stone-50">
                Border Patrol Simulator
              </h1>
              <p className="text-sm text-stone-300 leading-relaxed max-w-md">
                Operate the checkpoint office, acknowledge incoming arrival alarms, verify digital weighbridge limits, examine driver documents, inspect 3D cargo compartments, and coordinate police support.
              </p>
            </div>

            {/* Difficulty Selection */}
            <div className="space-y-1.5 max-w-xs">
              <div className="text-xs font-semibold text-stone-400">Inspection Difficulty</div>
              <div className="grid grid-cols-3 gap-2">
                {(['cadet', 'standard', 'veteran'] as DifficultyLevel[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDifficulty(d)}
                    className={`py-1.5 rounded border text-xs font-semibold capitalize cursor-pointer ${
                      selectedDifficulty === d
                        ? 'bg-amber-500 border-amber-400 text-stone-950'
                        : 'bg-stone-900 border-stone-700 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 max-w-xs">
              <button
                onClick={startNewShift}
                className="flex items-center justify-center gap-2 py-3 px-5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm cursor-pointer"
              >
                <Play className="w-4 h-4" /> Start New Shift
              </button>
              {saveSlots.autosave && (
                <button
                  onClick={() => loadFromSlot('autosave')}
                  className="flex items-center justify-center gap-2 py-2.5 px-5 rounded border border-stone-600 bg-stone-900 hover:bg-stone-800 text-stone-100 font-medium text-sm cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Continue Shift (Day {saveSlots.autosave.stats.day})
                </button>
              )}
              <button
                onClick={() => setActiveModal('save_load')}
                className="flex items-center justify-center gap-2 py-2.5 px-5 rounded border border-stone-700 bg-stone-900/90 hover:bg-stone-800 text-stone-200 font-medium text-sm cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" /> Load Saved Shift
              </button>
              <button
                onClick={() => setActiveModal('settings')}
                className="flex items-center justify-center gap-2 py-2.5 px-5 rounded border border-stone-700 bg-stone-900/90 hover:bg-stone-800 text-stone-200 font-medium text-sm cursor-pointer"
              >
                <Settings className="w-4 h-4" /> Graphics & Audio Settings
              </button>
            </div>

            <div className="text-xs text-stone-400 pt-2 border-t border-stone-800/80">
              Controls: WASD Walk · Arrow Keys (↑↓←→) Camera Look & Turn · Aim Crosshair & Left Mouse Click to Interact · [L] Lens · [F] Light · Esc Pause
            </div>
          </div>
        </div>
      )}

      {/* 4. PAUSE MENU */}
      {activeModal === 'pause' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-lg border border-stone-700 bg-stone-900 p-6 space-y-3 shadow-2xl">
            <h2 className="text-lg font-display font-bold text-amber-400 pb-2 border-b border-stone-800">
              Shift Paused
            </h2>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs cursor-pointer"
            >
              Resume Inspection Duty
            </button>
            <button
              onClick={() => setActiveModal('career')}
              className="w-full py-2.5 px-4 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-medium cursor-pointer"
            >
              Career Stats & Daily Targets
            </button>
            <button
              onClick={() => setActiveModal('save_load')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-medium cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5" /> Save / Load Shift
            </button>
            <button
              onClick={() => setActiveModal('settings')}
              className="w-full py-2.5 px-4 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-medium cursor-pointer"
            >
              Graphics, Audio & Controls
            </button>
            <button
              onClick={() => setActiveModal('main_menu')}
              className="w-full py-2.5 px-4 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-medium cursor-pointer"
            >
              Return to Main Menu
            </button>
          </div>
        </div>
      )}

      {/* 5. GAMEPLAY MODALS */}
      {activeModal === 'computer' && (
        <ComputerModal
          stats={stats}
          currentAlert={hud.currentAlert}
          alarmActive={hud.alarmActive}
          waitingCount={hud.waitingCount}
          entryGateOpen={hud.entryGateOpen}
          exitGateOpen={hud.exitGateOpen}
          policeStatus={hud.policeStatus}
          towAvailable={hud.towAvailable}
          towStatus={hud.towStatus}
          redRejectionAlert={hud.redRejectionAlert}
          inspectionHistory={stats.history}
          onAcknowledgeAlarm={() => engineRef.current?.acknowledgeAlarm()}
          onToggleEntryGate={() => engineRef.current?.toggleEntryGate()}
          onToggleExitGate={() => engineRef.current?.toggleExitGate()}
          onCallPolice={() => engineRef.current?.requestPoliceAssistance()}
          onRequestTowTruck={() => engineRef.current?.requestTowTruck()}
          onBuyRapidWeigh={() => {
            if (stats.cash < 220) return;
            soundRef.current?.playStamp(true);
            setStats((s) => ({
              ...s,
              cash: s.cash - 220,
              unlockedTools: { ...s.unlockedTools, rapidWeigh: true },
            }));
            showToast('Rapid Weighbridge Classifier installed!');
          }}
          onSetWeather={(w) => setStats((s) => ({ ...s, weather: w }))}
          onSetTime={(h) => setStats((s) => ({ ...s, timeOfDay: h }))}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'weighbridge' && modalCase && (
        <WeighbridgeModal
          caseData={modalCase}
          rapidWeighUnlocked={stats.unlockedTools.rapidWeigh}
          onVerdict={handleWeighbridgeVerdict}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'documents' && modalCase && (
        <DocumentModal
          caseData={modalCase}
          uvUnlocked={stats.unlockedTools.uvScanner}
          zoomUnlocked={stats.unlockedTools.zoomLens}
          onVerdict={handleDocumentVerdict}
          onOpenReport={() => setActiveModal('report')}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'driver_menu' && modalCase && (
        <DriverMenuModal
          caseData={modalCase}
          onTalk={() => engineRef.current?.speakWithDriver('greet')}
          onRequestDocs={() => setActiveModal('documents')}
          onAskExplanation={() => engineRef.current?.speakWithDriver('explain')}
          onReturnToVehicle={() => engineRef.current?.commandDriverReturnToVehicle()}
          onToggleLens={() => engineRef.current?.toggleLensMode()}
          onOpenReport={() => setActiveModal('report')}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'report' && modalCase && (
        <ReportModal
          caseData={modalCase}
          onDecision={(decision, reason) => {
            engineRef.current?.applyDriverOutcome(modalCase, decision, reason);
            setActiveModal(null);
          }}
          onCallPolice={() => engineRef.current?.requestPoliceAssistance()}
          onOpenDocuments={() => setActiveModal('documents')}
          onOpenWeighbridge={() => setActiveModal('weighbridge')}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'career' && (
        <CareerModal
          stats={stats}
          dailyTargets={dailyTargets}
          onClaimTarget={handleClaimTarget}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onClose={() => setActiveModal(hasStartedShift ? null : 'main_menu')}
        />
      )}

      {activeModal === 'bulletin' && (
        <BulletinModal day={stats.day} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'save_load' && (
        <SaveLoadModal
          slots={saveSlots}
          canSave={hasStartedShift}
          onSave={saveToSlot}
          onLoad={loadFromSlot}
          onClose={() => setActiveModal(hasStartedShift ? null : 'main_menu')}
        />
      )}
    </div>
  );
}
