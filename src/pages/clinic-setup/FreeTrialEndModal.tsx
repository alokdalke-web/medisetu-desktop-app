import InfoModal from "../../components/shared/Modals/InfoModal";
import Icons from "../../constants/icons";

interface FreeTrialModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const FreeTrialEndModal = ({ isOpen, onOpenChange }: FreeTrialModalProps) => {
  return (
    <InfoModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Your 15-Day Free Trial Has Ended. Access is now limited."
      subTitle="Your 15-day free trial is over. Upgrade now to continue using all features."
      icon={Icons.warningIcon}
      primaryBtnText="Choose Plan"
      onPress={() => console.log("Choose Plan")}
    />
  );
};

export default FreeTrialEndModal;
