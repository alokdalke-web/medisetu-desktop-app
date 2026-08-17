type VoiceTranscriptPanelProps = {
  listening: boolean;
  transcript: string;
};

const VoiceTranscriptPanel = ({
  listening,
  transcript,
}: VoiceTranscriptPanelProps) => {
  if (!listening && !transcript) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
      <div className="flex items-start gap-3">
        {listening && (
          <span className="mt-1 flex h-2.5 w-2.5 shrink-0">
            <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-red-400 opacity-70" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Voice Transcript
          </p>
          <p className="mt-1 break-words text-sm font-medium text-slate-700">
            {transcript || "Listening..."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceTranscriptPanel;
