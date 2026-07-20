import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
} from "@heroui/react";
import AppButton from "../AppButton";

interface InfoModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  subTitle?: string;
  primaryBtnText: string;
  onPress: () => void;
  variant?: "primary" | "danger";
  icon: string;
  addBodyNode?: React.ReactNode;
  disableBackdropClick?: boolean;
}

const InfoModal = ({
  isOpen,
  onOpenChange,
  title,
  subTitle,
  primaryBtnText,
  onPress,
  variant = "primary",
  icon,
  addBodyNode,
  disableBackdropClick = false,
}: InfoModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      placement="center"
      className="mx-3 rounded-2xl px-4 py-6 sm:mx-0 sm:rounded-3xl sm:px-10 sm:py-8"
      {...(disableBackdropClick && {
        hideCloseButton: true,
      })}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="justify-center p-0">
              <Chip
                radius="full"
                className={`min-w-auto min-h-auto max-w-none h-[52px] w-[52px] justify-center sm:h-[60px] sm:w-[60px] ${
                  variant === "primary" ? "bg-primary/20" : "bg-danger/20"
                }`}
                classNames={{ content: "flex-none" }}
              >
                <img src={icon} alt="icon" />
              </Chip>
            </ModalHeader>

            <ModalBody className="mt-4 mb-6 p-0 text-center sm:mt-5 sm:mb-8">
              <p className="text-xl font-semibold leading-7 sm:text-2xl sm:leading-9">
                {title}
              </p>
              {subTitle && (
                <p className="mt-1 text-sm font-normal text-secondary sm:text-base">
                  {subTitle}
                </p>
              )}
              {addBodyNode && addBodyNode}
            </ModalBody>

            <ModalFooter className="flex-col-reverse gap-3 p-0 sm:flex-row sm:justify-center sm:gap-4">
              <AppButton
                text="Cancel"
                onPress={onClose}
                buttonVariant={
                  variant === "primary" ? "outlined" : "dangerOutlined"
                }
                className="h-11 w-full sm:h-12 sm:w-[130px]"
              />
              <AppButton
                text={primaryBtnText}
                buttonVariant={variant === "primary" ? "primary" : "danger"}
                onPress={onPress}
                className="h-11 w-full sm:h-12"
              />
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default InfoModal;
