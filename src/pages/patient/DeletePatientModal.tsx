import InfoModal from "../../components/shared/Modals/InfoModal";
import Icons from "../../constants/icons";

interface DeletePatientModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const DeletePatientModal = ({
  isOpen,
  onOpenChange,
}: DeletePatientModalProps) => {
  return (
    <InfoModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Are you sure you want to delete this patient record Rajeev Kumar ?"
      icon={Icons.warningIcon}
      primaryBtnText="Delete Patient"
      onPress={() => console.log("Delete Patient")}
      variant="danger"
    />
  );
};

export default DeletePatientModal;
