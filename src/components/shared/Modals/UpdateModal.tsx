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
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  modalClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  cancelClassName?: string;
  submitClassName?: string;
  submitStartContent?: React.ReactNode;
}

const UpdateModal = ({
  isOpen,
  onOpenChange,
  title,
  body,
  onSubmit,
  isLoading,
  isDisabled,
  size = "2xl",
  modalClassName,
  titleClassName,
  bodyClassName,
  footerClassName,
  cancelClassName,
  submitClassName,
  submitStartContent,
}: UpdateModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      hideCloseButton={true}
      size={size}
      className={`rounded-3xl p-9 ${modalClassName ?? ""}`}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between p-0">
              <h4 className={`font-medium text-2xl capitalize ${titleClassName ?? ""}`}>{title}</h4>
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
            <ModalBody className={`p-0 mt-8 ${bodyClassName ?? ""}`}>
              <form onSubmit={onSubmit}>
                {body}
                <div className={`flex justify-center gap-4 mt-8 ${footerClassName ?? ""}`}>
                  <AppButton
                    text="Cancel"
                    onPress={onClose}
                    buttonVariant="outlined"
                    className={`w-[130px] h-12 ${cancelClassName ?? ""}`}
                  />
                  <AppButton
                    type="submit"
                    text={isLoading ? "Updating..." : "Save Changes"}
                    className={`w-full h-12 ${submitClassName ?? ""}`}
                    startContent={submitStartContent}
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
