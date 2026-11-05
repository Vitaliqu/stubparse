"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Stage } from "./Stage";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { setPendingFiles } from "@/lib/pending-files";
import { isAcceptedFile } from "@/lib/file-utils";
import { FREE_DOCUMENTS } from "@/lib/plan";

export function Hero() {
  const router = useRouter();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const start = (files: File[]) => {
    const valid = files.filter(isAcceptedFile);
    if (valid.length) setPendingFiles(valid);
    router.push(user ? "/app" : "/sign-up?next=/app");
  };

  // The whole page is the drop target; the stage shows the drop state.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setDragging(true); } };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      start(Array.from(e.dataTransfer!.files));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-14 pb-24 sm:px-6 sm:pt-20 lg:pt-20">
      <div className="mx-auto max-w-[880px] text-center">
        <h1 className="text-[clamp(2.75rem,8vw,5.75rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-ink">
          Paystubs in.<br />Spreadsheets out.
        </h1>
        <p className="mx-auto mt-6 max-w-[34rem] text-[clamp(1.0625rem,2vw,1.3125rem)] leading-[1.45] tracking-[-0.01em] text-muted">
          Drop any paystub PDF or photo. StubParse reads every line, checks the math, and hands you clean Excel, CSV, or JSON.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => inputRef.current?.click()} className="min-w-[200px]">
            Choose paystubs
          </Button>
          <Button size="lg" variant="ghost" onClick={() => router.push(user ? "/app" : "/sign-up")} className="group">
            {user ? "Open workspace" : "Create free account"}
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </Button>
        </div>
        <p className="mt-4 text-[13px] text-muted">
          {FREE_DOCUMENTS} documents free · No card required · Or drop files anywhere on this page
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => e.target.files && start(Array.from(e.target.files))}
        />
      </div>

      <div className="mt-14 sm:mt-16">
        <Stage dragging={dragging} />
      </div>
    </section>
  );
}
