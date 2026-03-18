"use client";

import { useRef } from "react";
import { UploadIcon, FileIcon, XIcon } from "./icons";
import { LoadingSpinner } from "./ui";
import { isImageFile } from "@/lib/file-utils";

interface Props {
  files: File[];
  dragging: boolean;
  loading: boolean;
  progress: string;
  aiMode: boolean;
  onToggleAI: () => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onClearAll: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onParse: () => void;
  getPreview: (file: File) => string;
}

export function UploadSection({
  files, dragging, loading, progress, aiMode,
  onToggleAI, onAddFiles, onRemoveFile, onClearAll,
  onDrop, onDragOver, onDragLeave, onParse, getPreview,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasImages = files.some(isImageFile);

  return (
    <section className="bg-black pb-16 pt-12">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <HeroBadges />

        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Parse Any Paystub
        </h1>
        <p className="mt-3 text-base text-zinc-400 sm:text-lg">
          Extract earnings, taxes &amp; pay info from any paystub PDF or image.{" "}
          <br className="hidden sm:block" />
          Export to <strong className="text-white font-medium">Excel</strong>,{" "}
          <strong className="text-white font-medium">CSV</strong>, or{" "}
          <strong className="text-white font-medium">JSON</strong> — no account required.
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Supports Square Payroll · ADP · Paychex · Gusto · Intuit · PNG · JPG · WEBP and more
        </p>

        {/* Drop Zone */}
        <div className="mt-8">
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative cursor-pointer rounded-md border border-dashed p-10 transition-all duration-150 ${
              dragging
                ? "border-indigo-400/60 bg-indigo-500/[0.07]"
                : "border-[#333] bg-white/[0.02] hover:border-indigo-500/30 hover:bg-indigo-500/[0.04]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && onAddFiles(Array.from(e.target.files))}
            />
            <div className={`flex flex-col items-center gap-3 transition-colors ${
              dragging ? "text-indigo-400" : "text-zinc-500 group-hover:text-indigo-400"
            }`}>
              <UploadIcon />
              <div>
                <p className="text-base font-medium text-white">
                  {dragging ? "Drop files here" : "Drop paystub PDFs or images here"}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  or click to browse — PDF, PNG, JPG, WEBP and more
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* File Queue */}
        {files.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-md border border-[#333] bg-white/[0.02] text-left">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#333]">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                {files.length} file{files.length > 1 ? "s" : ""} queued
              </span>
              <button
                onClick={onClearAll}
                className="cursor-pointer text-xs text-zinc-600 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
            {files.map((file, i) => (
              <FileQueueRow
                key={`${file.name}::${file.size}`}
                file={file}
                getPreview={getPreview}
                onRemove={() => onRemoveFile(i)}
              />
            ))}
          </div>
        )}

        {/* AI mode toggle + Parse button */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {/* AI toggle */}
            <button
              onClick={onToggleAI}
              disabled={loading}
              className={`flex w-full cursor-pointer items-center justify-between rounded-md border px-4 py-3 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                aiMode
                  ? "border-amber-500/40 bg-amber-500/[0.08] text-white"
                  : "border-[#333] bg-white/[0.02] text-zinc-500 hover:border-[#444] hover:bg-white/[0.04] hover:text-zinc-300"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm transition-colors ${
                  aiMode ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-zinc-600"
                }`}>
                  ✦
                </span>
                <span className="text-left">
                  <span className="block font-medium leading-tight">
                    {aiMode ? "Claude AI extraction" : "Enable Claude AI"}
                  </span>
                  <span className="block text-xs opacity-50 leading-tight mt-0.5">
                    {aiMode
                      ? "claude-haiku-4-5 · deep field recognition"
                      : "Basic regex parsing — enable AI for deeper extraction"}
                  </span>
                </span>
              </span>
              <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                aiMode ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-zinc-600"
              }`}>
                {aiMode ? "ON" : "OFF"}
              </span>
            </button>

            {/* Parse button */}
            <button
              onClick={onParse}
              disabled={loading}
              className="w-full cursor-pointer rounded-md bg-indigo-600 py-3 text-base font-medium text-white transition-all hover:bg-indigo-500 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  {progress?.startsWith("AI") || progress?.includes("model") || progress?.includes("Downloading") ? (
                    <span className="relative flex h-4 w-4 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75" />
                      <span className="relative inline-flex h-4 w-4 rounded-full bg-indigo-400" />
                    </span>
                  ) : (
                    <LoadingSpinner />
                  )}
                  <span className="truncate max-w-xs">{progress || "Processing…"}</span>
                </span>
              ) : (
                `Parse ${files.length} File${files.length > 1 ? "s" : ""}${hasImages ? " (OCR)" : ""}`
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function HeroBadges() {
  const badges = [
    { label: "PDF & Image Support",  dot: "bg-indigo-500"  },
    { label: "Claude AI Extraction", dot: "bg-amber-400"   },
    { label: "Excel / CSV / JSON",   dot: "bg-emerald-500" },
    { label: "No Data Stored",        dot: "bg-sky-500"     },
  ];
  return (
    <div className="mb-6 flex flex-wrap justify-center gap-2">
      {badges.map((b) => (
        <span
          key={b.label}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#333] px-3 py-1 text-xs font-medium text-zinc-400"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
          {b.label}
        </span>
      ))}
    </div>
  );
}

function FileQueueRow({
  file,
  getPreview,
  onRemove,
}: {
  file: File;
  getPreview: (f: File) => string;
  onRemove: () => void;
}) {
  const isImg = isImageFile(file);
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-[#222] last:border-b-0">
      {isImg ? (
        <img
          src={getPreview(file)}
          alt=""
          className="h-9 w-9 shrink-0 rounded object-cover ring-1 ring-white/10"
        />
      ) : (
        <span className="text-red-400/70">
          <FileIcon />
        </span>
      )}
      <span className="flex-1 truncate text-sm text-zinc-200">{file.name}</span>
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
        isImg
          ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
          : "bg-red-500/10 text-red-400 border-red-500/20"
      }`}>
        {isImg ? "IMG" : "PDF"}
      </span>
      <span className="text-xs text-zinc-600 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
      <button
        onClick={onRemove}
        className="cursor-pointer text-zinc-600 hover:text-red-400 transition-colors shrink-0"
      >
        <XIcon size={4} />
      </button>
    </div>
  );
}
