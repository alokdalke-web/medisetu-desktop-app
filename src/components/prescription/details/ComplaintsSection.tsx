import { Input, Textarea } from "@heroui/react";
import { FIELD_CN } from "./constants";
import type {
  PrescriptionDetailsValue,
  UpdatePrescriptionDetails,
} from "./types";

type ComplaintsSectionProps = {
  draft: PrescriptionDetailsValue;
  isLocked: boolean;
  upd: UpdatePrescriptionDetails;
};

const ComplaintsSection = ({
  draft,
  isLocked,
  upd,
}: ComplaintsSectionProps) => (
  <div className="mb-5">
    <div className="grid gap-4 md:grid-cols-3">
      <Input
        label="Chief complaint"
        placeholder="Fever / Cough / Pain abdomen..."
        value={draft.chiefComplaint}
        onValueChange={(v) => upd("chiefComplaint", v)}
        variant="bordered"
        classNames={FIELD_CN}
        isDisabled={isLocked}
      />
      <Input
        label="Duration"
        placeholder="e.g., 3 days"
        value={draft.chiefComplaintDuration ?? ""}
        onValueChange={(v) => upd("chiefComplaintDuration", v)}
        variant="bordered"
        classNames={FIELD_CN}
        isDisabled={isLocked}
      />
      <Input
        label="Other complaints"
        placeholder="Headache, nausea..."
        value={draft.otherComplaints}
        onValueChange={(v) => upd("otherComplaints", v)}
        variant="bordered"
        classNames={FIELD_CN}
        isDisabled={isLocked}
      />
    </div>

    <Textarea
      label="Brief history (HOPI)"
      placeholder="Onset, progression, associated symptoms…"
      value={draft.history ?? ""}
      onValueChange={(v) => upd("history", v)}
      minRows={2}
      variant="bordered"
      classNames={FIELD_CN}
      className="mt-4"
      isDisabled={isLocked}
    />
  </div>
);

export default ComplaintsSection;
