import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  addToast,
} from "@heroui/react";
import { FiUpload } from "react-icons/fi";
import { useUploadPatientGalleryImageMutation } from "../../redux/api/appointmentApi";

interface UploadGalleryImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  patientId: string;
  onSuccess: () => void;
}

const UploadGalleryImageModal: React.FC<UploadGalleryImageModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  patientId,
  onSuccess,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [uploadImage, { isLoading: isUploading }] =
    useUploadPatientGalleryImageMutation();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors({ file: "Please select an image file" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ file: "Image size must be less than 5MB" });
      return;
    }

    setImageFile(file);
    setErrors({});

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!imageFile) {
      newErrors.file = "Please select an image";
    }

 if (!description.trim()) {
  newErrors.description = "Please write description";
}

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle upload
  const handleUpload = async () => {
    if (!validateForm()) return;

    try {
      await uploadImage({
        appointmentId,
        patientId,
        description: description.trim(),
        imageFile: imageFile!,
      }).unwrap();

      // Reset form
      setImageFile(null);
      setImagePreview(null);
      setDescription("");
      setErrors({});

      onSuccess();
      onClose();
    } catch (error: any) {
      addToast({
        title: "Upload failed",
        description: error?.data?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (isUploading) return;

    setImageFile(null);
    setImagePreview(null);
    setDescription("");
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      backdrop="blur"
      isDismissable={!isUploading}
      isKeyboardDismissDisabled={isUploading}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Upload Image to Gallery
        </ModalHeader>

        <ModalBody className="gap-4">
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Image<span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
                id="gallery-image-input"
              />
              <label
                htmlFor="gallery-image-input"
                className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <FiUpload className="h-5 w-5 text-gray-400 mb-1" />
                  <span className="text-sm text-gray-600">
                    {imageFile ? imageFile.name : "Click to select image"}
                  </span>
                </div>
              </label>
            </div>
            {errors.file && (
              <p className="mt-1 text-sm text-red-500">{errors.file}</p>
            )}
          </div>

          {/* Description Input */}
         <Textarea
  label="Description"
  placeholder="Add a description for this image"
  isRequired
  value={description}
  onValueChange={(value) => {
    setDescription(value);

    if (errors.description && value.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.description;
        return next;
      });
    }
  }}
  isDisabled={isUploading}
  minRows={3}
  maxRows={5}
  isInvalid={!!errors.description}
  errorMessage={errors.description}
  className="w-full"
/>
        </ModalBody>

        <ModalFooter>
          <Button
            color="default"
            variant="light"
            onPress={handleClose}
            isDisabled={isUploading}
          >
            Cancel
          </Button>
   <Button
  color="primary"
  onPress={handleUpload}
  isLoading={isUploading}
  isDisabled={isUploading}
>
  Upload
</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UploadGalleryImageModal;
