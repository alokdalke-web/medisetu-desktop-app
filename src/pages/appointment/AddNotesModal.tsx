import { useForm } from "react-hook-form";
import InfoModal from "../../components/shared/Modals/InfoModal";
import TextareaField from "../../components/shared/TextareaField";
import Icons from "../../constants/icons";

interface AddNotesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const AddNotesModal = ({ isOpen, onOpenChange }: AddNotesModalProps) => {
  const { control } = useForm();

  return (
    <InfoModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Please Add Notes"
      icon={Icons.notesIcon}
      primaryBtnText="Save Notes"
      onPress={() => console.log("Save Notes")}
      addBodyNode={
        <TextareaField
          control={control}
          name=""
          label="Notes"
          placeholder="Enter notes"
        />
      }
    />
  );
};

export default AddNotesModal;
