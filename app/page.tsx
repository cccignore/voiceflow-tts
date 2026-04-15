"use client";

import { useState, useCallback } from "react";
import { Header }        from "@/components/layout/Header";
import { SingleMode }    from "@/components/features/SingleMode";
import { BatchMode }     from "@/components/features/BatchMode";
import { HistoryPanel }  from "@/components/features/HistoryPanel";
import { useHistory }    from "@/hooks/useHistory";
import { useMode }       from "@/contexts/mode-context";
import type { SingleModeResult }          from "@/components/features/SingleMode";
import type { BatchItemCompletePayload }   from "@/components/features/BatchMode";
import type { HistoryItem }               from "@/types";

function PageContent({
  onSingleComplete,
  onBatchItemComplete,
  cloneFrom,
  onCloneConsumed,
}: {
  onSingleComplete:   (r: SingleModeResult) => void;
  onBatchItemComplete:(p: BatchItemCompletePayload) => void;
  cloneFrom?:         HistoryItem | null;
  onCloneConsumed?:   () => void;
}) {
  const { mode } = useMode();
  return mode === "single" ? (
    <SingleMode
      onComplete={onSingleComplete}
      cloneFrom={cloneFrom}
      onCloneConsumed={onCloneConsumed}
    />
  ) : (
    <BatchMode onItemComplete={onBatchItemComplete} />
  );
}

export default function Home() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cloneFrom,   setCloneFrom]   = useState<HistoryItem | null>(null);
  const { history, add, remove, clearAll, togglePin } = useHistory();
  const { setMode } = useMode();

  const handleComplete = useCallback((result: SingleModeResult) => {
    add({
      chineseText:    result.chineseText,
      standardText:   result.standardText,
      shortVideoText: result.shortVideoText,
      audioBase64:    result.audioBase64,
      voiceId:        result.voiceId,
      duration:       0,
      style:          result.style,
    });
  }, [add]);

  const handleBatchItemComplete = useCallback((p: BatchItemCompletePayload) => {
    add({
      chineseText:    p.chineseText,
      standardText:   p.standardText,
      shortVideoText: p.shortVideoText,
      audioBase64:    p.audioBase64,
      voiceId:        p.voiceId,
      duration:       0,
    });
  }, [add]);

  const handleClone = useCallback((item: HistoryItem) => {
    setHistoryOpen(false);
    setMode("single");
    // Brief delay so panel closes before SingleMode state update
    setTimeout(() => setCloneFrom(item), 50);
  }, [setMode]);

  return (
    <>
      <Header
        onHistoryClick={() => setHistoryOpen(true)}
        historyCount={history.length}
      />

      {/* Full-viewport content */}
      <div className="flex flex-col" style={{ height: "100svh", paddingTop: "3.5rem" }}>
        <div className="flex-1 min-h-0">
          <PageContent
            onSingleComplete={handleComplete}
            onBatchItemComplete={handleBatchItemComplete}
            cloneFrom={cloneFrom}
            onCloneConsumed={() => setCloneFrom(null)}
          />
        </div>
      </div>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onRemove={remove}
        onClear={clearAll}
        onTogglePin={togglePin}
        onClone={handleClone}
      />
    </>
  );
}
