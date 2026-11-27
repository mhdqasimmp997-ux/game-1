import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CloudRain,
  FileText,
  HardDrive,
  MessageSquare,
  Monitor,
  Scale,
  Search,
  Siren,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  DailyTarget,
  InspectionCase,
  PlayerCareerStats,
  QueueAlertInfo,
  SaveSlotData,
  WeatherType,
} from '../types/game';
import { RANKS } from '../data/gameData';

// ── 1. WEIGHBRIDGE VERIFICATION MODAL ───────────────────────────────────────
export const WeighbridgeModal: React.FC<{
  caseData: InspectionCase;
  rapidWeighUnlocked: boolean;
  onVerdict: (verdict: 'pass' | 'fail') => void;
  onClose: () => void;
}> = ({ caseData, rapidWeighUnlocked, onVerdict, onClose }) => {
  const diff = caseData.actualWeightKg - caseData.permittedWeightKg;
  const over = diff > 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-lg border border-stone-700 bg-stone-900 text-stone-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-display font-bold">Digital Weighbridge Terminal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Vehicle: <strong className="text-stone-100">{caseData.vehicleLabel}</strong></span>
            <span>Plate: <strong className="font-mono text-amber-300">{caseData.registration}</strong></span>
          </div>

          <div className="rounded border border-stone-700 bg-stone-950 p-4 font-mono space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">CURRENT WEIGHT</span>
              <span className="font-bold text-stone-100 tabular-nums">
                {caseData.actualWeightKg.toLocaleString()} kg
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">PERMITTED LIMIT</span>
              <span className="font-bold text-stone-200 tabular-nums">
                {caseData.permittedWeightKg.toLocaleString()} kg
              </span>
            </div>
            <div className="border-t border-stone-800 pt-2 flex justify-between text-sm">
              <span className="text-stone-400">DIFFERENCE</span>
              <span className={`font-bold tabular-nums ${over ? 'text-rose-400' : 'text-emerald-400'}`}>
                {diff >= 0 ? '+' : ''}{diff.toLocaleString()} kg
              </span>
            </div>
            {rapidWeighUnlocked && (
              <div className="pt-2 border-t border-stone-800 text-xs flex items-center justify-between">
                <span className="text-stone-400">SENSOR CLASSIFICATION</span>
                <span className={`font-bold ${over ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {over ? 'OVERWEIGHT VIOLATION' : 'WITHIN LEGAL LIMIT'}
                </span>
              </div>
            )}
          </div>

          <div className="text-xs text-stone-400">
            Compare the measured weight against the permitted limit and record your manual weighbridge verdict:
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onVerdict('pass')}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> PASS ✓ (Within Limit)
            </button>
            <button
              onClick={() => onVerdict('fail')}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold cursor-pointer"
            >
              <XCircle className="w-4 h-4" /> FAIL ✗ (Overweight)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 2. DRIVER CONTEXTUAL INTERACTION MODAL ───────────────────────────────────
export const DriverMenuModal: React.FC<{
  caseData: InspectionCase;
  onTalk: () => void;
  onRequestDocs: () => void;
  onAskExplanation: () => void;
  onReturnToVehicle: () => void;
  onToggleLens: () => void;
  onOpenReport: () => void;
  onClose: () => void;
}> = ({
  caseData,
  onTalk,
  onRequestDocs,
  onAskExplanation,
  onReturnToVehicle,
  onToggleLens,
  onOpenReport,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md rounded-lg border border-stone-700 bg-stone-900 text-stone-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-display font-bold">{caseData.driverName}</h2>
              <p className="text-[11px] text-stone-400 capitalize">
                {caseData.personality} · {caseData.vehicleLabel} ({caseData.registration})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2.5">
          <button
            onClick={() => {
              onTalk();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-medium cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-sky-400" /> [TALK] Question Driver
          </button>
          <button
            onClick={onRequestDocs}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold cursor-pointer"
          >
            <FileText className="w-4 h-4" /> [REQUEST DOCUMENTS] Open Document Desk
          </button>
          <button
            onClick={() => {
              onAskExplanation();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-medium cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" /> [ASK FOR EXPLANATION] Question Cargo / Trip
          </button>
          <button
            onClick={() => {
              onToggleLens();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-medium cursor-pointer"
          >
            <Search className="w-4 h-4 text-cyan-400" /> [INSPECT VEHICLE] Toggle 3D Lens Mode
          </button>
          <button
            onClick={onOpenReport}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-medium cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-400" /> [INSPECTION REPORT] Prepare Final Verdict
          </button>
          <button
            onClick={() => {
              onReturnToVehicle();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-medium cursor-pointer"
          >
            [RETURN TO VEHICLE] Instruct Driver to Board
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 3. FINAL INSPECTION REPORT MODAL ─────────────────────────────────────────
export const ReportModal: React.FC<{
  caseData: InspectionCase;
  onDecision: (decision: 'approved' | 'rejected' | 'further_inspection', reason: string) => void;
  onCallPolice: () => void;
  onOpenDocuments: () => void;
  onOpenWeighbridge: () => void;
  onClose: () => void;
}> = ({
  caseData,
  onDecision,
  onCallPolice,
  onOpenDocuments,
  onOpenWeighbridge,
  onClose,
}) => {
  const [reason, setReason] = useState(
    caseData.issuesSummary[0] ?? 'All weight, document, and cargo checks completed.'
  );

  const inspectedCount = caseData.hotspots.filter((h) => h.inspected).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-stone-700 bg-stone-900 text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-display font-bold">Official Checkpoint Inspection Report</h2>
              <p className="text-[11px] text-stone-400 font-mono">
                {caseData.caseId} · {caseData.registration}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded border border-stone-800 bg-stone-950 p-3">
              <div className="text-stone-500">Vehicle</div>
              <div className="font-semibold text-stone-100 mt-0.5">{caseData.vehicleLabel}</div>
            </div>
            <div className="rounded border border-stone-800 bg-stone-950 p-3">
              <div className="text-stone-500">Driver</div>
              <div className="font-semibold text-stone-100 mt-0.5">{caseData.driverName}</div>
            </div>
            <div className="rounded border border-stone-800 bg-stone-950 p-3">
              <div className="text-stone-500">Measured Weight</div>
              <div className="font-mono font-semibold text-stone-100 mt-0.5">
                {caseData.actualWeightKg.toLocaleString()} kg
              </div>
            </div>
            <div className="rounded border border-stone-800 bg-stone-950 p-3">
              <div className="text-stone-500">Lens Spots Checked</div>
              <div className="font-mono font-semibold text-stone-100 mt-0.5">
                {inspectedCount} / {caseData.hotspots.length}
              </div>
            </div>
          </div>

          {/* Inspector Manual Verdicts */}
          <div className="rounded border border-stone-800 bg-stone-950 p-4 space-y-2.5">
            <div className="font-semibold text-stone-300">Inspector Verification Checklist</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={onOpenWeighbridge}
                className="flex items-center justify-between px-3 py-2 rounded bg-stone-900 border border-stone-700 hover:border-amber-500/60 cursor-pointer"
              >
                <span>Weighbridge:</span>
                <span
                  className={`font-mono font-bold uppercase ${
                    caseData.weighbridgeVerdict === 'pass'
                      ? 'text-emerald-400'
                      : caseData.weighbridgeVerdict === 'fail'
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                >
                  {caseData.weighbridgeVerdict}
                </span>
              </button>
              <button
                onClick={onOpenDocuments}
                className="flex items-center justify-between px-3 py-2 rounded bg-stone-900 border border-stone-700 hover:border-amber-500/60 cursor-pointer"
              >
                <span>Documents:</span>
                <span
                  className={`font-mono font-bold uppercase ${
                    caseData.documentsVerdict === 'valid'
                      ? 'text-emerald-400'
                      : caseData.documentsVerdict === 'invalid'
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                >
                  {caseData.documentsVerdict}
                </span>
              </button>
              <div className="flex items-center justify-between px-3 py-2 rounded bg-stone-900 border border-stone-800">
                <span>Physical Lens:</span>
                <span
                  className={`font-mono font-bold uppercase ${
                    caseData.physicalVerdict === 'clear'
                      ? 'text-emerald-400'
                      : caseData.physicalVerdict === 'issues_found'
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                >
                  {caseData.physicalVerdict.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Recorded Findings */}
          <div className="rounded border border-stone-800 bg-stone-950 p-4 space-y-2">
            <div className="font-semibold text-stone-300">Recorded Lens Inspection Findings</div>
            {caseData.recordedFindings.length === 0 ? (
              <div className="text-stone-500">
                No physical Lens markers inspected yet. Press [L] outside near the vehicle to inspect parts.
              </div>
            ) : (
              <ul className="space-y-1 text-stone-300 list-disc pl-4">
                {caseData.recordedFindings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Officer Notes */}
          <div className="space-y-1.5">
            <label className="block text-stone-400 font-medium">Officer Remarks / Rejection Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-stone-800">
            <button
              onClick={() => onDecision('approved', reason)}
              className="py-2.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
            >
              APPROVE VEHICLE
            </button>
            <button
              onClick={() => onDecision('rejected', reason)}
              className="py-2.5 px-3 rounded bg-rose-700 hover:bg-rose-600 text-white font-semibold cursor-pointer"
            >
              REJECT VEHICLE
            </button>
            <button
              onClick={() => onDecision('further_inspection', reason)}
              className="py-2.5 px-3 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold cursor-pointer"
            >
              HOLDING BAY
            </button>
            <button
              onClick={() => {
                onCallPolice();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded bg-blue-700 hover:bg-blue-600 text-white font-semibold cursor-pointer"
            >
              <Siren className="w-3.5 h-3.5" /> CALL POLICE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 4. OFFICE COMPUTER TERMINAL MODAL ────────────────────────────────────────
export const ComputerModal: React.FC<{
  stats: PlayerCareerStats;
  currentAlert: QueueAlertInfo | null;
  alarmActive: boolean;
  waitingCount: number;
  entryGateOpen: boolean;
  exitGateOpen: boolean;
  policeStatus: string | null;
  onAcknowledgeAlarm: () => void;
  onToggleEntryGate: () => void;
  onToggleExitGate: () => void;
  onCallPolice: () => void;
  onBuyRapidWeigh: () => void;
  onSetWeather: (w: WeatherType) => void;
  onSetTime: (h: number) => void;
  onClose: () => void;
}> = ({
  stats,
  currentAlert,
  alarmActive,
  waitingCount,
  entryGateOpen,
  exitGateOpen,
  policeStatus,
  onAcknowledgeAlarm,
  onToggleEntryGate,
  onToggleExitGate,
  onCallPolice,
  onBuyRapidWeigh,
  onSetWeather,
  onSetTime,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-stone-700 bg-stone-900 text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2.5">
            <Monitor className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-display font-bold">Sector 7 Checkpoint Command Terminal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Vehicle Arrival Queue Alert */}
          <div
            className={`rounded border p-4 space-y-2 ${
              alarmActive ? 'border-rose-500 bg-rose-950/40' : 'border-stone-800 bg-stone-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-amber-300">
                {alarmActive ? 'VEHICLE ARRIVAL ALERT — ALARM ACTIVE' : 'Incoming Queue Status'}
              </div>
              <span className="font-mono text-stone-300">Waiting Vehicles: {waitingCount}</span>
            </div>
            {currentAlert ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-200 pt-1">
                <div>Vehicle: <strong>{currentAlert.vehicleLabel}</strong></div>
                <div>Reg: <strong className="font-mono">{currentAlert.registration}</strong></div>
                <div>Lane: <strong>Gate {currentAlert.lane}</strong></div>
                <div>Status: <strong className="text-amber-300">{currentAlert.status}</strong></div>
              </div>
            ) : (
              <div className="text-stone-400">No vehicles currently stopped at Entry Gate 1.</div>
            )}
            {alarmActive && (
              <button
                onClick={onAcknowledgeAlarm}
                className="mt-2 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
              >
                Acknowledge Arrival Alarm
              </button>
            )}
          </div>

          {/* Gate & Police Dispatch Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={onToggleEntryGate}
              className={`py-3 px-4 rounded font-semibold cursor-pointer ${
                entryGateOpen ? 'bg-emerald-600 text-white' : 'bg-stone-800 hover:bg-stone-700 text-stone-100'
              }`}
            >
              Entry Gate: {entryGateOpen ? 'OPEN' : 'CLOSED'}
            </button>
            <button
              onClick={onToggleExitGate}
              className={`py-3 px-4 rounded font-semibold cursor-pointer ${
                exitGateOpen ? 'bg-emerald-600 text-white' : 'bg-stone-800 hover:bg-stone-700 text-stone-100'
              }`}
            >
              Exit Gate: {exitGateOpen ? 'OPEN' : 'CLOSED'}
            </button>
            <button
              onClick={onCallPolice}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded bg-blue-700 hover:bg-blue-600 text-white font-semibold cursor-pointer"
            >
              <Siren className="w-4 h-4" /> Dispatch Police Unit
            </button>
          </div>
          {policeStatus && (
            <div className="rounded border border-blue-500/40 bg-blue-950/30 px-4 py-2 text-blue-200 font-medium">
              Police Dispatch: {policeStatus}
            </div>
          )}

          {/* Checkpoint Equipment Upgrade */}
          <div className="rounded border border-stone-800 bg-stone-950 p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-stone-200">Rapid Weighbridge Classifier ($220)</div>
              <div className="text-stone-400 mt-0.5">
                Displays automated overweight alert flags inside the Weighbridge Terminal.
              </div>
            </div>
            {stats.unlockedTools.rapidWeigh ? (
              <span className="px-3 py-1.5 rounded bg-emerald-900/50 text-emerald-300 font-semibold">
                Installed
              </span>
            ) : (
              <button
                disabled={stats.cash < 220}
                onClick={onBuyRapidWeigh}
                className="px-3.5 py-2 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-semibold cursor-pointer"
              >
                Purchase ($220)
              </button>
            )}
          </div>

          {/* Shift Time & Weather Control */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded border border-stone-800 bg-stone-950 p-4 space-y-2.5">
              <div className="flex items-center gap-2 font-semibold text-stone-300">
                <Clock className="w-4 h-4 text-amber-400" /> Shift Time Control
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['Dawn', 6.3],
                  ['Day', 11.5],
                  ['Dusk', 17.8],
                  ['Night', 22.0],
                ].map(([label, h]) => (
                  <button
                    key={label}
                    onClick={() => onSetTime(h as number)}
                    className="py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-stone-800 bg-stone-950 p-4 space-y-2.5">
              <div className="flex items-center gap-2 font-semibold text-stone-300">
                <CloudRain className="w-4 h-4 text-sky-400" /> Weather Control
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['clear', 'cloudy', 'rain', 'fog'] as WeatherType[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => onSetWeather(w)}
                    className={`py-1.5 rounded capitalize cursor-pointer ${
                      stats.weather === w ? 'bg-amber-500 text-stone-950 font-semibold' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 5. OFFICER CAREER & DAILY TARGETS MODAL ──────────────────────────────────
export const CareerModal: React.FC<{
  stats: PlayerCareerStats;
  dailyTargets: DailyTarget[];
  onClaimTarget: (id: string) => void;
  onClose: () => void;
}> = ({ stats, dailyTargets, onClaimTarget, onClose }) => {
  const rank = RANKS[stats.rankIndex] ?? RANKS[0];
  const nextRank = RANKS[stats.rankIndex + 1];
  const accuracy =
    stats.totalInspected > 0 ? Math.round((stats.accurateDecisions / stats.totalInspected) * 100) : 100;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-stone-700 bg-stone-900 text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-display font-bold">Officer Career & Daily Targets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          <div className="rounded border border-stone-800 bg-stone-950 p-4 flex items-center justify-between">
            <div>
              <div className="text-stone-400">Current Rank</div>
              <div className="text-base font-display font-bold text-amber-400">{rank.name}</div>
              {nextRank && (
                <div className="text-stone-400 mt-0.5">
                  Next Rank: {nextRank.name} ({nextRank.xpRequired} XP)
                </div>
              )}
            </div>
            <div className="text-right font-mono">
              <div className="text-lg font-bold text-stone-100">{stats.xp} XP</div>
              <div className="text-emerald-400 font-semibold">${stats.cash} Credits</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded border border-stone-800 bg-stone-950 p-3">
              <div className="text-stone-500">Vehicles Checked</div>
              <div className="text-base font-mono font-bold mt-0.5">{stats.totalInspected}</div>
            </div>
            <div className="rounded border border-stone-800 bg-stone-950 p-3">
              <div className="text-stone-500">Accuracy Rating</div>
              <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">{accuracy}%</div>
            </div>
            <div className="rounded border border-stone-800 bg-stone-950 p-3">
              <div className="text-stone-500">Trucks Inspected</div>
              <div className="text-base font-mono font-bold mt-0.5">{stats.trucksInspected}</div>
            </div>
            <div className="rounded border border-stone-800 bg-stone-950 p-3">
              <div className="text-stone-500">Violations Caught</div>
              <div className="text-base font-mono font-bold text-amber-400 mt-0.5">{stats.violationsCaught}</div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-stone-300">Daily Checkpoint Targets</div>
            {dailyTargets.map((t) => (
              <div
                key={t.id}
                className="rounded border border-stone-800 bg-stone-950 p-3.5 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold text-stone-100">{t.title}</div>
                  <div className="text-stone-400 font-mono mt-0.5">
                    Progress: {Math.min(t.progress, t.target)} / {t.target} · Reward: +{t.rewardXp} XP, +${t.rewardCash}
                  </div>
                </div>
                {t.completed ? (
                  <span className="px-3 py-1.5 rounded bg-emerald-900/50 text-emerald-300 font-semibold">
                    Claimed
                  </span>
                ) : t.progress >= t.target ? (
                  <button
                    onClick={() => onClaimTarget(t.id)}
                    className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold cursor-pointer"
                  >
                    Claim Reward
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded bg-stone-800 text-stone-400">In Progress</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 6. SAVE / LOAD SLOT MODAL ────────────────────────────────────────────────
export const SaveLoadModal: React.FC<{
  slots: Record<string, SaveSlotData | null>;
  canSave: boolean;
  onSave: (slotId: string) => void;
  onLoad: (slotId: string) => void;
  onClose: () => void;
}> = ({ slots, canSave, onSave, onLoad, onClose }) => {
  const ordered = ['autosave', 'slot_1', 'slot_2', 'slot_3'];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-lg border border-stone-700 bg-stone-900 text-stone-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-display font-bold">Save & Load Inspection Career</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-3 text-xs">
          {ordered.map((id) => {
            const data = slots[id];
            return (
              <div
                key={id}
                className="rounded border border-stone-800 bg-stone-950 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-semibold text-stone-100 uppercase tracking-wide">
                    {id === 'autosave' ? 'Auto-Save Slot' : id.replace('_', ' ')}
                  </div>
                  {data ? (
                    <div className="text-stone-400 mt-0.5 font-mono">
                      Day {data.stats.day} · {RANKS[data.stats.rankIndex]?.name} · ${data.stats.cash} ·{' '}
                      {new Date(data.savedAt).toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-stone-500 mt-0.5">Empty Career Slot</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canSave && id !== 'autosave' && (
                    <button
                      onClick={() => onSave(id)}
                      className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold cursor-pointer"
                    >
                      Save
                    </button>
                  )}
                  {data && (
                    <button
                      onClick={() => onLoad(id)}
                      className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 font-medium cursor-pointer"
                    >
                      Load
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── 7. CHECKPOINT BOLO & RULES BULLETIN MODAL ────────────────────────────────
export const BulletinModal: React.FC<{
  day: number;
  onClose: () => void;
}> = ({ day, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-stone-700 bg-stone-900 text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-display font-bold">Sector 7 Daily Orders & BOLO Bulletin</h2>
              <p className="text-[11px] font-mono text-stone-400">
                SHIFT DAY {day} · OFFICIAL DATE: 2026-11-26
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed">
          <div className="rounded border border-amber-500/40 bg-amber-950/25 p-4 space-y-1.5">
            <div className="font-semibold text-amber-300 uppercase tracking-wide">
              Standard Inspection Protocol
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-stone-200">
              <li>Acknowledge incoming vehicle arrival alerts and open the <strong>Entry Gate</strong>.</li>
              <li>Guide the vehicle onto the <strong>Weighbridge</strong> and verify Current vs Permitted Weight.</li>
              <li>Open the vehicle <strong>Driver Door</strong>, speak with the driver, and cross-check all Documents against today’s date (<strong>2026-11-26</strong>), driver photo, and actual registration plate.</li>
              <li>Walk behind the vehicle to open the <strong>Cargo Doors / Trunk</strong>, toggle <strong>[F] Flashlight</strong> at night, and activate <strong>[L] Inspection Lens</strong> to scan all 4 vehicle zones.</li>
              <li>Issue your decision in the <strong>Inspection Report</strong>—call <strong>Police Backup</strong> if contraband, forged identity, or serious violations are detected.</li>
            </ol>
          </div>

          <div className="rounded border border-rose-500/40 bg-rose-950/25 p-4 space-y-1.5">
            <div className="font-semibold text-rose-300 uppercase tracking-wide">
              Active Watchlist / BOLO Alerts
            </div>
            <ul className="list-disc pl-4 space-y-1 text-stone-200">
              <li><strong>Unmarked Black Red-Banded Crates:</strong> Inspect rear cargo bays physically—smugglers hide electronics or fuel drums behind legal pallets.</li>
              <li><strong>Forged Identities & Unstamped Cards:</strong> Watch closely for ID portraits that do not match the driver or blank/unstamped holder fields.</li>
              <li><strong>Overweight Freight Haulers:</strong> Any vehicle exceeding its permitted weighbridge limit must be flagged as <strong>FAIL ✗</strong> and rejected or held.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
