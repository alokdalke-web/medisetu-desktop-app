import InfoModal from "../../components/shared/Modals/InfoModal";
import Icons from "../../constants/icons";

interface FreeTrialModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPress: () => void;
}

const FreeTrialModal = ({ isOpen, onOpenChange, onPress }: FreeTrialModalProps) => {
  return (
    <InfoModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="You’re All Set to Start Your 15-Day Free Trial!"
      subTitle="You now have full access to the clinic dashboard, appointment management, and more for 15 days. No payment required."
      icon={Icons.checkCircleIcon}
      primaryBtnText="Go to Dashboard"
      onPress={onPress}
    />
  );
};

export default FreeTrialModal;
