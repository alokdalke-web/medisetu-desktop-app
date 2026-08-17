import { Card, CardBody } from "@heroui/react";
import React from "react";
import PrescriptionDetails, {
  type PrescriptionDetailsValue,
} from "../../PrescriptionDetails";
import type { DoctorPreferencesResult } from "../../details/types";

const PrescriptionRightPanel: React.FC<{
  details: PrescriptionDetailsValue;
  onChange: (next: PrescriptionDetailsValue) => void;
  canEditPrescription: boolean;
  lockMessage: string;
  onAddTest?: () => void;
  addedTests?: string[];
  resolvedDoctorId: string;
  /** Drawer supplies its own frame — skip the card border there. */
  bordered?: boolean;
  /**
   * Render from unsaved preferences instead of the doctor's stored ones. Used
   * by the preference screen so its preview is this exact panel, rather than a
   * look-alike that can drift from what the appointment flow renders.
   */
  previewPreferences?: Partial<DoctorPreferencesResult>;
}> = ({
  details,
  onChange,
  canEditPrescription,
  lockMessage,
  onAddTest,
  addedTests,
  resolvedDoctorId,
  bordered = true,
  previewPreferences,
}) => (
    /* `bordered={false}` inside the drawer: the drawer already supplies the
       surface, border and shadow, so the card's own chrome drew a second frame
       just inside the panel edge. */
    <Card
      shadow="none"
      className={[
        "overflow-hidden bg-surface lg:h-full",
        bordered ? "rounded-2xl border border-line shadow-sm" : "",
      ].join(" ")}
    >
      <CardBody
        className={[
          "flex flex-col lg:h-full lg:min-h-0",
          bordered ? "p-4" : "px-2 py-1",
        ].join(" ")}
      >
        <div className="pr-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-auto [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/70 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[scrollbar-color:#334155_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-[#334155]">
          <PrescriptionDetails
            value={details}
            onChange={onChange}
            variant="withoutComplaints"
            disabled={!canEditPrescription}
            disabledTooltip={lockMessage}
            onAddTest={onAddTest}
            addedTests={addedTests}
            doctorId={resolvedDoctorId}
            previewPreferences={previewPreferences}
            hidePreferenceShortcut
            allowParentScroll
          />
        </div>
      </CardBody>
    </Card>
  );

export default PrescriptionRightPanel;
