import { Card, CardBody } from "@heroui/react";
import React from "react";
import PrescriptionDetails, {
  type PrescriptionDetailsValue,
} from "../../PrescriptionDetails";

const PrescriptionRightPanel: React.FC<{
  details: PrescriptionDetailsValue;
  onChange: (next: PrescriptionDetailsValue) => void;
  canEditPrescription: boolean;
  lockMessage: string;
  onAddTest?: () => void;
  addedTests?: string[];
  resolvedDoctorId: string;
}> = ({
  details,
  onChange,
  canEditPrescription,
  lockMessage,
  onAddTest,
  addedTests,
  resolvedDoctorId,
}) => (
    <Card
      shadow="none"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] lg:h-full"
    >
      <CardBody className="flex flex-col p-4 lg:h-full lg:min-h-0">
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
            hidePreferenceShortcut
            allowParentScroll
          />
        </div>
      </CardBody>
    </Card>
  );

export default PrescriptionRightPanel;
