import { useEffect, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react";

export const BackendConfigModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      import("../../utils/config").then(({ getBackendUrlAsync }) => {
        getBackendUrlAsync()
          .then((currentUrl: string) => setUrl(currentUrl || ""))
          .catch(console.error);
      });
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { setBackendUrl } = await import("../../utils/config");
      await setBackendUrl(url);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      onClose();
    }
  };



  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} placement="top-center">
      <ModalContent>
        <ModalHeader>Configure Backend URL</ModalHeader>
        <ModalBody>
          <Input
            autoFocus
            label="Cloud API Base URL"
            placeholder="e.g. http://192.168.1.10:5000/api/v1"
            value={url}
            onValueChange={setUrl}
            variant="bordered"
          />
          <p className="text-xs text-gray-500">
            The application will restart to apply these changes.
          </p>


        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleSave} isLoading={isLoading}>
            Save & Restart
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
