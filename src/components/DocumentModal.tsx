import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  RotateCw,
  Sun,
  UserCheck,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { InspectionCase } from '../types/game';

interface DocumentModalProps {
  caseData: InspectionCase;
  uvUnlocked?: boolean;
  zoomUnlocked?: boolean;
  onVerdict: (verdict: 'valid' | 'invalid') => void;
  onOpenReport: () => void;
  onClose: () => void;
}

function getPortraitStyle(seed: number, mismatch: boolean) {
  const effectiveSeed = mismatch ? seed + 371 : seed;
  const skins = ['#f1c27d', '#d9a066', '#8d5524', '#c68642', '#e0ac69'];
  const hairs = ['#1c1917', '#451a03', '#78350f', '#71717a', '#ca8a04'];
  const shirts = ['#1e3a8a', '#3f6212', '#7c2d12', '#334155', '#581c87'];
  return {
    skin: skins[effectiveSeed % skins.length],
    hair: hairs[(effectiveSeed >> 2) % hairs.length],
    shirt: shirts[(effectiveSeed >> 3) % shirts.length],
    hasBeard: effectiveSeed % 2 === 0,
    hasGlasses: effectiveSeed % 3 === 0,
  };
}

const PortraitAvatar: React.FC<{ seed: number; mismatch?: boolean; label: string }> = ({
  seed,
  mismatch = false,
  label,
}) => {
  const p = getPortraitStyle(seed, mismatch);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-24 rounded border border-stone-500 bg-stone-200 overflow-hidden flex flex-col items-center justify-end">
        {/* Hair */}
        <div
          style={{ backgroundColor: p.hair }}
          className="absolute top-3 w-11 h-6 rounded-t-full"
        />
        {/* Face */}
        <div
          style={{ backgroundColor: p.skin }}
          className="relative w-10 h-11 rounded-full border border-stone-700/40 mb-1 flex flex-col items-center justify-center"
        >
          {/* Eyes */}
          <div className="flex gap-2.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-stone-900" />
            <div className="w-1.5 h-1.5 rounded-full bg-stone-900" />
          </div>
          {p.hasGlasses && (
            <div className="absolute top-3.5 w-8 h-2.5 border border-stone-900/80 rounded-sm" />
          )}
          {p.hasBeard && (
            <div
              style={{ backgroundColor: p.hair }}
              className="absolute bottom-0 w-7 h-3 rounded-b-full opacity-80"
            />
          )}
        </div>
        {/* Shoulders */}
        <div style={{ backgroundColor: p.shirt }} className="w-16 h-7 rounded-t-xl" />
      </div>
      <span className="text-[10px] font-mono text-stone-400">{label}</span>
    </div>
  );
};

export const DocumentModal: React.FC<DocumentModalProps> = ({
  caseData,
  uvUnlocked = true,
  zoomUnlocked = true,
  onVerdict,
  onOpenReport,
  onClose,
}) => {
  const [activeDocIdx, setActiveDocIdx] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [uvActive, setUvActive] = useState(false);

  const doc = caseData.documents[activeDocIdx] || caseData.documents[0];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-5xl rounded-lg border border-stone-700 bg-stone-900 text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 px-6 py-4 bg-stone-950">
          <div>
            <h2 className="text-lg font-display font-bold tracking-wide text-amber-400">
              Document Inspection Desk — {caseData.registration}
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              {caseData.driverName} · Age {caseData.driverAge} · {caseData.driverNationality} · {caseData.vehicleLabel}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5" /> Final Report
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded border border-stone-700 text-stone-300 hover:bg-stone-800 cursor-pointer"
              aria-label="Close document desk"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left: Document Tabs + Interactive Paper */}
          <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-stone-800 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {caseData.documents.map((d, idx) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setActiveDocIdx(idx);
                    setRotation(0);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                    idx === activeDocIdx
                      ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-950 border border-stone-800 rounded px-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Rotate
                </button>
                {zoomUnlocked && (
                  <>
                    <button
                      onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.2).toFixed(1)))}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> Zoom +
                    </button>
                    <button
                      onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.2).toFixed(1)))}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" /> Zoom -
                    </button>
                  </>
                )}
              </div>
              {uvUnlocked && (
                <button
                  onClick={() => setUvActive((u) => !u)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                    uvActive
                      ? 'bg-violet-600 text-white border-violet-400'
                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> UV Stamp Check
                </button>
              )}
            </div>

            {/* Paper Viewer */}
            <div className="flex-1 min-h-[300px] flex items-center justify-center bg-stone-950 rounded border border-stone-800 p-6 overflow-hidden">
              <div
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className={`relative w-full max-w-md rounded border-2 p-5 shadow-xl ${
                  uvActive
                    ? 'bg-slate-950 border-violet-500 text-violet-200'
                    : 'bg-stone-100 border-stone-400 text-stone-900'
                }`}
              >
                <div className="flex items-start justify-between border-b pb-3 mb-3 border-current/20">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider opacity-75">
                      {doc.issuingAuthority}
                    </div>
                    <h3 className="text-base font-bold mt-0.5">{doc.title}</h3>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums">
                    <div>{doc.documentNumber}</div>
                    <div className="opacity-70">{doc.nationality}</div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4 flex flex-col items-center">
                    <PortraitAvatar
                      seed={doc.photoSeed}
                      mismatch={!doc.photoMatchesDriver}
                      label={`PHOTO #${doc.photoSeed}`}
                    />
                  </div>

                  <div className="col-span-8 space-y-1.5 text-xs">
                    <div>
                      <span className="opacity-65">Holder: </span>
                      <span className="font-semibold">{doc.holderName}</span>
                    </div>
                    <div>
                      <span className="opacity-65">DOB: </span>
                      <span className="font-mono tabular-nums">{doc.dob}</span>
                    </div>
                    <div>
                      <span className="opacity-65">Issued: </span>
                      <span className="font-mono tabular-nums">{doc.issueDate}</span>
                    </div>
                    <div>
                      <span className="opacity-65">Expires: </span>
                      <span className="font-mono font-semibold tabular-nums">{doc.expiryDate}</span>
                    </div>
                    {doc.vehiclePlate && (
                      <>
                        <div>
                          <span className="opacity-65">Plate No: </span>
                          <span className="font-mono font-bold tabular-nums">{doc.vehiclePlate}</span>
                        </div>
                        <div>
                          <span className="opacity-65">Model: </span>
                          <span>{doc.vehicleModel}</span>
                        </div>
                      </>
                    )}
                    {doc.declaredCargo && (
                      <>
                        <div>
                          <span className="opacity-65">Declared Cargo: </span>
                          <span className="font-semibold">{doc.declaredCargo}</span>
                        </div>
                        <div>
                          <span className="opacity-65">Cargo Weight: </span>
                          <span className="font-mono tabular-nums">
                            {doc.declaredWeightKg?.toLocaleString()} kg
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-current/20 flex items-center justify-between text-[11px] font-mono">
                  <div
                    className={`px-2 py-0.5 border rounded ${
                      doc.missingDetails
                        ? 'border-rose-600 text-rose-600 border-dashed'
                        : 'border-emerald-700 text-emerald-700'
                    }`}
                  >
                    {doc.missingDetails ? 'UNSTAMPED / INCOMPLETE' : 'OFFICIAL BORDER SEAL'}
                  </div>
                  {uvActive && (
                    <div className={doc.isAuthentic ? 'text-cyan-300 font-bold' : 'text-rose-400 font-bold'}>
                      {doc.isAuthentic ? 'UV WATERMARK PRESENT' : 'UV SEAL ANOMALY'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Driver Photo Comparison & Verification Verdict */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="rounded border border-stone-800 bg-stone-950 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-300">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  Live Driver Appearance Comparison
                </div>
                <div className="flex items-center gap-4">
                  <PortraitAvatar seed={caseData.driverSeed} label="DRIVER AT GATE" />
                  <div className="text-xs space-y-1 text-stone-300">
                    <div>
                      <span className="text-stone-500">Name:</span> {caseData.driverName}
                    </div>
                    <div>
                      <span className="text-stone-500">Nationality:</span> {caseData.driverNationality}
                    </div>
                    <div>
                      <span className="text-stone-500">Personality:</span>{' '}
                      <span className="capitalize">{caseData.personality}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 pt-1">
                      Compare the driver’s face above against the ID/Licence portrait on the left.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded border border-stone-800 bg-stone-950 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-300">
                  <Eye className="w-4 h-4 text-amber-400" />
                  Checkpoint Reference Data
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="text-stone-400">Actual Vehicle Plate:</div>
                  <div className="font-mono font-semibold text-stone-100 tabular-nums">
                    {caseData.registration}
                  </div>
                  <div className="text-stone-400">Vehicle Type:</div>
                  <div className="text-stone-200">{caseData.vehicleLabel}</div>
                  <div className="text-stone-400">Paint Color:</div>
                  <div className="text-stone-200">{caseData.colorName}</div>
                  <div className="text-stone-400">Weighbridge Reading:</div>
                  <div className="font-mono text-stone-200 tabular-nums">
                    {caseData.actualWeightKg.toLocaleString()} kg
                  </div>
                  <div className="text-stone-400">Today’s Date:</div>
                  <div className="font-mono text-amber-300 tabular-nums">2026-11-26</div>
                </div>
              </div>
            </div>

            {/* Manual Verdict Buttons */}
            <div className="pt-4 border-t border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Document Verification Verdict:</span>
                <span
                  className={`font-mono font-semibold uppercase ${
                    caseData.documentsVerdict === 'valid'
                      ? 'text-emerald-400'
                      : caseData.documentsVerdict === 'invalid'
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                >
                  {caseData.documentsVerdict}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onVerdict('valid')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> VALID ✓
                </button>
                <button
                  onClick={() => onVerdict('invalid')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded text-xs font-semibold bg-rose-700 hover:bg-rose-600 text-white cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> INVALID ✗
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
