import InfoModal from "../../components/shared/Modals/InfoModal";
import Icons from "../../constants/icons";

interface DeleteReportModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const DeleteReportModal = ({
  isOpen,
  onOpenChange,
}: DeleteReportModalProps) => {
  return (
    <InfoModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Are you sure you want to delete report of Rajeev Kumar ?"
      icon={Icons.warningIcon}
      primaryBtnText="Delete Report"
      onPress={() => console.log("Delete Report")}
      variant="danger"
    />
  );
};

export default DeleteReportModal;
