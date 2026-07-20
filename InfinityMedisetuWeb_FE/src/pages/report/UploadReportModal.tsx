import { useForm } from "react-hook-form";
import InfoModal from "../../components/shared/Modals/InfoModal";
import SelectField from "../../components/shared/SelectField";
import TextareaField from "../../components/shared/TextareaField";
import Icons from "../../constants/icons";

interface UploadConsentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type FormValues = {
  patient: string;
  consentType: string;
  file: FileList;
  note: string;
};

const UploadConsentModal = ({
  isOpen,
  onOpenChange,
}: UploadConsentModalProps) => {
  const { control, handleSubmit } = useForm<FormValues>();

  const onSubmit = (data: FormValues) => {
    console.log("Consent Upload Data:", data);
    // 👉 yahan API call lagana
  };

  return (
    <InfoModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Upload Consent"
      icon={Icons.notesIcon}
      primaryBtnText="Upload Consent"
      onPress={handleSubmit(onSubmit)}
      addBodyNode={
        <div className="space-y-4">
          {/* Patient Select */}
          <SelectField
            control={control}
            name="patient"
            label="Select Patient"
            options={[
              { label: "Patient 1", value: "1" },
              { label: "Patient 2", value: "2" },
            ]}
          />

          {/* Consent Type */}
          <SelectField
            control={control}
            name="consentType"
            label="Consent Type"
            options={[
              { label: "Surgery Consent", value: "surgery" },
              { label: "General Consent", value: "general" },
            ]}
          />

          {/* File Upload */}
          <div>
            <label className="text-sm font-medium text-slate-700">
              Upload File
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              {...control.register("file")}
              className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
            />
          </div>

          {/* Notes */}
          <TextareaField
            control={control}
            name="note"
            label="Notes"
            placeholder="Add consent note..."
          />
        </div>
      }
    />
  );
};

export default UploadConsentModal;