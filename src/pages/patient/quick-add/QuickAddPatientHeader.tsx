import { ModalHeader } from "@heroui/react";

type QuickAddPatientHeaderProps = {
  listening: boolean;
  onDictation: () => void;
};

const QuickAddPatientHeader = ({
  listening,
  onDictation,
}: QuickAddPatientHeaderProps) => {
  return (
    <ModalHeader className="shrink-0 border-b border-slate-100 bg-white px-4 pb-3 pt-4 sm:px-6 sm:pb-4">
      <div className="w-full pr-10 sm:pr-12">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[18px] font-bold leading-6 text-[#100E1C] sm:text-xl">
              Add New Patient
            </span>
            <span className="mt-1 block text-[11px] font-medium leading-4 text-slate-500 sm:text-[12px]">
              Quick add patient from appointment screen
            </span>
          </div>

          <button
            type="button"
            onClick={onDictation}
            aria-label={listening ? "Stop Voice Fill" : "Start Voice Fill"}
            title={listening ? "Stop Voice Fill" : "Start Voice Fill"}
            className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-[0.98] sm:h-11 sm:w-auto sm:px-4 ${
              listening
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
            }`}
          >
            {listening && (
              <span className="absolute left-1/2 top-1/2 flex h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 sm:left-3 sm:-translate-x-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}

            <svg
              className={`h-4 w-4 shrink-0 ${listening ? "sm:ml-2" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <span className="ml-2 hidden whitespace-nowrap text-sm font-bold sm:inline">
              {listening ? "Stop Voice Fill" : "Start Voice Fill"}
            </span>
          </button>
        </div>
      </div>
    </ModalHeader>
  );
};

export default QuickAddPatientHeader;
