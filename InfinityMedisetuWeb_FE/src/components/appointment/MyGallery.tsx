import {
  addToast,
  Button,
  Card,
  CardBody,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Spinner
} from "@heroui/react";
import React, { useEffect, useMemo, useState } from "react";
import { FiEye, FiPlus, FiTrash2, FiUpload, FiX } from "react-icons/fi";
import {
  useDeleteDoctorGalleryImageMutation,
  useGetDoctorGalleryBySpecialtyQuery,
  useGetDoctorGalleryQuery,
  useUploadDoctorGalleryImageMutation,
} from "../../redux/api/myGalleryApi";

interface GalleryImage {
  id: string;
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  description?: string;
  imageUrl: string;
  url?: string; // Add this to handle both field names
  createdAt: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

interface MyGalleryProps {
  appointmentId: string;
  appointmentStatus: string;
  patientId: string;
  currentDoctorId: string;
  isDoctor: boolean;
  isAdmin: boolean;
  isReceptionist: boolean;
}

const MyGallery: React.FC<MyGalleryProps> = ({
  appointmentStatus,
  currentDoctorId,
  isDoctor,
  isAdmin,
  isReceptionist,
}) => {
  const isRestrictedStatus = ["Pending", "Cancelled"].includes(
    appointmentStatus,
  );

  const canUpload =
    (isDoctor || (isAdmin && !!currentDoctorId)) && !isRestrictedStatus;
  const canView = isDoctor || (isAdmin && !!currentDoctorId) || isReceptionist;

  const [uploadsPage, setUploadsPage] = useState(1);
  const [suggestedPage, setSuggestedPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    imageId: string | null;
    imageUrl: string | null;
  }>({
    isOpen: false,
    imageId: null,
    imageUrl: null,
  });

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    images: GalleryImage[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

  const {
    data: uploadsData,
    isLoading: isUploadsLoading,
    refetch: refetchUploads,
  } = useGetDoctorGalleryQuery(
    { page: uploadsPage, limit: 12 },
    { skip: !canView },
  );

  const {
    data: suggestedData,
    isLoading: isSuggestedLoading,
    refetch: refetchSuggested,
  } = useGetDoctorGalleryBySpecialtyQuery(
    { page: suggestedPage, limit: 12 },
    { skip: !canView },
  );

  const [uploadDoctorGalleryImage, { isLoading: isUploading }] =
    useUploadDoctorGalleryImageMutation();

  const [deleteDoctorGalleryImage, { isLoading: isDeleting }] =
    useDeleteDoctorGalleryImageMutation();

  // Transform API response to ensure imageUrl field exists
  const transformImageData = (item: any): GalleryImage => {
    return {
      id: item.id,
      imageUrl: item.imageUrl || item.url, // Use url if imageUrl doesn't exist
      url: item.url,
      description: item.description,
      createdAt: item.createdAt,
      doctorId: item.doctorId,
      filename: item.filename,
      size: item.size,
      mimeType: item.mimeType,
    };
  };

  const myUploads = useMemo<GalleryImage[]>(() => {
    const data = uploadsData?.data || uploadsData?.result || [];
    return Array.isArray(data) ? data.map(transformImageData) : [];
  }, [uploadsData]);

  const suggestedImages = useMemo<GalleryImage[]>(() => {
    const data = suggestedData?.data || suggestedData?.result || [];
    return Array.isArray(data) ? data.map(transformImageData) : [];
  }, [suggestedData]);

  const uploadsTotalPages = useMemo(() => {
    const p = uploadsData?.pagination;
    if (!p) return 1;
    return p.totalPages || Math.ceil((p.total || 0) / (p.limit || 10)) || 1;
  }, [uploadsData]);

  const suggestedTotalPages = useMemo(() => {
    const p = suggestedData?.pagination;
    if (!p) return 1;
    return p.totalPages || Math.ceil((p.total || 0) / (p.limit || 10)) || 1;
  }, [suggestedData]);

  useEffect(() => {
    if (!previewModal.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewModal.images.length) return;

      if (e.key === "ArrowRight") {
        setPreviewModal((prev) => ({
          ...prev,
          currentIndex: (prev.currentIndex + 1) % prev.images.length,
        }));
      }

      if (e.key === "ArrowLeft") {
        setPreviewModal((prev) => ({
          ...prev,
          currentIndex:
            (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
        }));
      }

      if (e.key === "Escape") {
        setPreviewModal((prev) => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewModal.isOpen, previewModal.images.length]);

  // Debug logging to see what data is actually coming through
  useEffect(() => {
    console.log("Uploads Data:", uploadsData);
    console.log("Suggested Data:", suggestedData);
    console.log("My Uploads after transform:", myUploads);
    console.log("Suggested Images after transform:", suggestedImages);
  }, [uploadsData, suggestedData, myUploads, suggestedImages]);

  const openPreview = (images: GalleryImage[], index: number) => {
    setPreviewModal({
      isOpen: true,
      images,
      currentIndex: index,
    });
  };

  const handleImageError = (imageId: string) => {
    setImageErrors((prev) => new Set(prev).add(imageId));
  };

  const handleDeleteClick = (imageId: string, imageUrl: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      imageId,
      imageUrl,
    });
  };

  const handleCancelDelete = () => {
    setDeleteConfirmModal({
      isOpen: false,
      imageId: null,
      imageUrl: null,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal.imageId) return;

    try {
      await deleteDoctorGalleryImage(deleteConfirmModal.imageId).unwrap();

      addToast({
        title: "Image deleted",
        description: "The image has been successfully deleted.",
        color: "success",
        variant: "flat",
      });

      refetchUploads();
      refetchSuggested();
    } catch (error: any) {
      addToast({
        title: "Failed to delete image",
        description: error?.data?.message || "Unknown error occurred",
        color: "danger",
        variant: "flat",
      });
    } finally {
      handleCancelDelete();
    }
  };

  const resetUploadModal = () => {
    setUploadModalOpen(false);
    setUploadDescription("");
    setSelectedFile(null);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      addToast({
        title: "Select image",
        description: "Please choose an image first.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    try {
      await uploadDoctorGalleryImage({
        description: uploadDescription.trim(),
        imageFile: selectedFile,
      }).unwrap();

      addToast({
        title: "Image uploaded successfully",
        color: "success",
        variant: "flat",
      });

      resetUploadModal();
      refetchUploads();
      refetchSuggested();
    } catch (error: any) {
      addToast({
        title: "Upload failed",
        description: error?.data?.message || "Failed to upload image",
        color: "danger",
        variant: "flat",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
  };

  const getImageUrl = (image: GalleryImage): string => {
    return image.imageUrl || image.url || "";
  };

  if (!canView) return null;

  return (
    <div className="space-y-5">
      <Card shadow="none" radius="lg" className="bg-white">
        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3 sm:px-5">
            <h3 className="text-lg font-semibold text-gray-900">
              My Uploads ({myUploads.length})
            </h3>

            {canUpload && (
              <Button
                className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-4 py-2 flex items-center gap-2"
                onPress={() => setUploadModalOpen(true)}
              >
                <FiPlus className="h-4 w-4" />
                <span>Add Image</span>
              </Button>
            )}
          </div>
        </div>

        <CardBody className="p-3 sm:p-5">
          {isUploadsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : myUploads.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {myUploads.map((img, index) => (
                  <div
                    key={img.id}
                    className="relative group overflow-hidden rounded-lg bg-gray-100"
                  >
                    <div className="w-full h-40">
                      {imageErrors.has(img.id) ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                          <FiX className="h-8 w-8" />
                          <span className="text-xs ml-1">Failed to load</span>
                        </div>
                      ) : (
                        <img
                          src={getImageUrl(img)}
                          alt={img.description || "Gallery image"}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(img.id)}
                        />
                      )}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Button
                        isIconOnly
                        size="sm"
                        className="bg-gray-800/90"
                        onPress={() => openPreview(myUploads, index)}
                      >
                        <FiEye className="text-white" />
                      </Button>
                    </div>

                    {img.doctorId === currentDoctorId && !isRestrictedStatus && (
                      <div className="absolute top-2 right-2">
                        <Button
                          isIconOnly
                          size="sm"
                          className="bg-red-500 text-white"
                          isLoading={isDeleting}
                          onPress={() =>
                            handleDeleteClick(img.id, getImageUrl(img))
                          }
                        >
                          <FiTrash2 />
                        </Button>
                      </div>
                    )}

                    {img.createdAt && (
                      <div className="absolute top-0 left-0 text-xs text-white bg-gray-500 bg-opacity-50 p-1 rounded-br-md">
                        {formatDate(img.createdAt)}
                      </div>
                    )}

                    {img.description && (
                      <div className="absolute bottom-0 left-0 right-0 text-xs text-white bg-gray-800 bg-opacity-75 p-1 w-full truncate">
                        {img.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {uploadsTotalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    total={uploadsTotalPages}
                    initialPage={1}
                    page={uploadsPage}
                    onChange={setUploadsPage}
                    size="sm"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No images in my uploads
            </div>
          )}
        </CardBody>
      </Card>

      <Card shadow="none" radius="lg" className="bg-white">
        <div className="border-b border-gray-200 bg-white">
          <h3 className="px-4 py-3 sm:px-5 text-lg font-semibold text-gray-900">
            Suggested Images ({suggestedImages.length})
          </h3>
        </div>

        <CardBody className="p-3 sm:p-5">
          {isSuggestedLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : suggestedImages.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {suggestedImages.map((img, index) => (
                  <div
                    key={img.id}
                    className="relative group overflow-hidden rounded-lg bg-gray-100"
                  >
                    <div className="w-full h-40">
                      {imageErrors.has(img.id) ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                          <FiX className="h-8 w-8" />
                          <span className="text-xs ml-1">Failed to load</span>
                        </div>
                      ) : (
                        <img
                          src={getImageUrl(img)}
                          alt={img.description || "Suggested image"}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(img.id)}
                        />
                      )}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Button
                        isIconOnly
                        size="sm"
                        className="bg-gray-800/90"
                        onPress={() => openPreview(suggestedImages, index)}
                      >
                        <FiEye className="text-white" />
                      </Button>
                    </div>

                    {img.createdAt && (
                      <div className="absolute top-0 left-0 text-xs text-white bg-gray-500 bg-opacity-50 p-1 rounded-br-md">
                        {formatDate(img.createdAt)}
                      </div>
                    )}

                    {img.description && (
                      <div className="absolute bottom-0 left-0 right-0 text-xs text-white bg-gray-800 bg-opacity-75 p-1 w-full truncate">
                        {img.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {suggestedTotalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    total={suggestedTotalPages}
                    initialPage={1}
                    page={suggestedPage}
                    onChange={setSuggestedPage}
                    size="sm"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No images in suggested images
            </div>
          )}
        </CardBody>
      </Card>

  <Modal
  isOpen={uploadModalOpen}
  onOpenChange={(open) => {
    if (!open) resetUploadModal();
    else setUploadModalOpen(open);
  }}
  size="md"
  backdrop="blur"
  placement="center"
>
  <ModalContent className="rounded-2xl">
    {() => (
      <>
        <ModalHeader className="pb-2 text-xl font-semibold text-gray-900">
          Add Image
        </ModalHeader>

        <ModalBody className="space-y-4 pt-2 pb-1">
          <input
            id="doctor-gallery-upload-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />

          <label
            htmlFor="doctor-gallery-upload-input"
            className="block cursor-pointer"
          >
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 transition hover:border-teal-400 hover:bg-teal-50/40">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <FiUpload className="h-5 w-5 text-teal-600" />
                </div>

                <p className="text-sm font-medium text-gray-700">
                  Click to choose an image
                </p>
                {/* <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, JPEG supported
                </p> */}
              </div>
            </div>
          </label>

          {selectedFile && (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="ml-3 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          )}
        </ModalBody>

        <ModalFooter className="pt-2">
          <Button variant="light" onPress={resetUploadModal}>
            Cancel
          </Button>

          <Button
            className="bg-teal-600 text-white hover:bg-teal-700"
            onPress={handleUploadSubmit}
            isLoading={isUploading}
            isDisabled={!selectedFile || isUploading}
            startContent={!isUploading && <FiUpload className="h-4 w-4" />}
          >
            Upload
          </Button>
        </ModalFooter>
      </>
    )}
  </ModalContent>
</Modal>

      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={handleCancelDelete}
        size="sm"
        backdrop="blur"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <FiTrash2 className="h-5 w-5 text-danger" />
                <span>Confirm Delete</span>
              </ModalHeader>

              <ModalBody>
                {deleteConfirmModal.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={deleteConfirmModal.imageUrl}
                      alt="Image to delete"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                <p className="text-center">
                  Are you sure you want to delete this image?
                </p>
                <p className="text-sm text-gray-500 text-center">
                  This action cannot be undone.
                </p>
              </ModalBody>

              <ModalFooter>
                <Button variant="light" onPress={handleCancelDelete}>
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={handleConfirmDelete}
                  isLoading={isDeleting}
                  startContent={!isDeleting && <FiTrash2 className="h-4 w-4" />}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

  <Modal
  isOpen={previewModal.isOpen}
  onClose={() => setPreviewModal((p) => ({ ...p, isOpen: false }))}
  size="full"
  backdrop="blur"
  hideCloseButton
>
  <ModalContent>
    {() => {
      const img = previewModal.images[previewModal.currentIndex];

      return (
        <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
          {img ? (
            <>
              <img
                src={img.imageUrl}
                alt={img.description || "Preview image"}
                className="max-h-[90vh] max-w-[96vw] object-contain"
              />

              {(img.description || img.createdAt) && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 text-center">
                  {img.description && (
                    <div className="text-white text-sm sm:text-base bg-black/50 px-4 py-2 rounded-lg">
                      {img.description}
                    </div>
                  )}

                  {img.createdAt && (
                    <div className="text-gray-300 text-xs sm:text-sm mt-2">
                      {formatDate(img.createdAt)}
                    </div>
                  )}
                </div>
              )}

              {previewModal.images.length > 1 && (
                <>
                  <button
                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 text-white text-3xl sm:text-4xl hover:bg-white/20 rounded-full p-2 sm:p-3 transition"
                    onClick={() =>
                      setPreviewModal((p) => ({
                        ...p,
                        currentIndex:
                          (p.currentIndex - 1 + p.images.length) %
                          p.images.length,
                      }))
                    }
                  >
                    ‹
                  </button>

                  <button
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 text-white text-3xl sm:text-4xl hover:bg-white/20 rounded-full p-2 sm:p-3 transition"
                    onClick={() =>
                      setPreviewModal((p) => ({
                        ...p,
                        currentIndex: (p.currentIndex + 1) % p.images.length,
                      }))
                    }
                  >
                    ›
                  </button>

                  <div className="absolute bottom-4 right-4 text-white text-xs sm:text-sm bg-black/50 px-3 py-1 rounded-full">
                    {previewModal.currentIndex + 1} / {previewModal.images.length}
                  </div>
                </>
              )}

              <button
                className="absolute top-4 right-4 text-white text-2xl sm:text-3xl hover:bg-white/20 rounded-full p-2 transition"
                onClick={() =>
                  setPreviewModal((p) => ({ ...p, isOpen: false }))
                }
              >
                ✕
              </button>
            </>
          ) : null}
        </div>
      );
    }}
  </ModalContent>
</Modal>
    </div>
  );
};

export default MyGallery;