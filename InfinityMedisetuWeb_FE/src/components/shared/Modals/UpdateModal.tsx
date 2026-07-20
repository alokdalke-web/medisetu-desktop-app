import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
} from "@heroui/react";
import Icons from "../../../constants/icons";
import AppButton from "../AppButton";

interface UpdateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  body: React.ReactNode;
  onSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
  isLoading: boolean;
  isDisabled?: boolean;
}

const UpdateModal = ({
  isOpen,
  onOpenChange,
  title,
  body,
  onSubmit,
  isLoading,
  isDisabled,
}: UpdateModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      hideCloseButton={true}
      size="2xl"
      className="rounded-3xl p-9"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between p-0">
              <h4 className="font-medium text-2xl capitalize">{title}</h4>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                disableRipple
                onPress={onClose}
              >
                <img src={Icons.closeIcon} alt="close" className="w-6 h-6" />
              </Button>
            </ModalHeader>
            <ModalBody className="p-0 mt-8">
              <form onSubmit={onSubmit}>
                {body}
                <div className="flex justify-center gap-4 mt-8">
                  <AppButton
                    text="Cancel"
                    onPress={onClose}
                    buttonVariant="outlined"
                    className="w-[130px] h-12"
                  />
                  <AppButton
                    type="submit"
                    text={isLoading ? "Updating..." : "Save Changes"}
                    className="w-full h-12"
                    isDisabled={isDisabled || isLoading}
                  />
                </div>
              </form>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default UpdateModal;
