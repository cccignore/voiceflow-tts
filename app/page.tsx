"use client";

import { useState, useCallback } from "react";
import { Header }        from "@/components/layout/Header";
import { SingleMode }    from "@/components/features/SingleMode";
import { BatchMode }     from "@/components/features/BatchMode";
import { HistoryPanel }  from "@/components/features/HistoryPanel";
import { useHistory }    from "@/hooks/useHistory";
import { useMode }       from "@/contexts/mode-context";
import type { SingleModeResult } from "@/components/features/SingleMode";
import type { BatchItemCompletePayload } from "@/components/features/BatchMode";

function PageContent({
  onSingleComplete,
  onBatchItemComplete,
}: {
  onSingleComplete: (r: SingleModeResult) => void;
  onBatchItemComplete: (p: BatchItemCompletePayload) => void;
}) {
  const { mode } = useMode();
  return mode === "single" ? (
    <SingleMode onComplete={onSingleComplete} />
  ) : (
    <BatchMode onItemComplete={onBatchItemComplete} />
  );
}

export default function Home() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { history, add, remove, clearAll } = useHistory();

  const handleComplete = useCallback((result: SingleModeResult) => {
    add({
      chineseText:    result.chineseText,
      standardText:   result.standardText,
      shortVideoText: result.shortVideoText,
      audioBase64:    result.audioBase64,
      voiceId:        result.voiceId,
      duration:       0,
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
          />
        </div>
      </div>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onRemove={remove}
        onClear={clearAll}
      />
    </>
  );
}
