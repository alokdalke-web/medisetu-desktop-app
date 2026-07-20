import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardBody,
  Button,
  Pagination,
  Spinner,
  addToast,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { FiTrash2, FiPlus, FiX, FiEye } from "react-icons/fi";
import {
  useGetAppointmentGalleryQuery,
  useGetPatientGalleryQuery,
  useDeletePatientGalleryImageMutation,
} from "../../redux/api/appointmentApi";
import UploadGalleryImageModal from "./UploadGalleryImageModal";

interface GalleryImage {
  id: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

interface PatientGalleryProps {
  appointmentId: string;
  appointmentStatus: string;
  patientId: string;
  currentDoctorId: string;
  isDoctor: boolean;
  isAdmin: boolean;
  isReceptionist: boolean;
}

const PatientGallery: React.FC<PatientGalleryProps> = ({
  appointmentId,
  appointmentStatus,
  patientId,
  currentDoctorId,
  isDoctor,
  isAdmin,
  isReceptionist,
}) => {
  const isRestrictedStatus = ["Pending", "Cancelled"].includes(
    appointmentStatus,
  );
  const canUpload =
    (isDoctor || (isAdmin && currentDoctorId)) && !isRestrictedStatus;
  const canView = isDoctor || (isAdmin && currentDoctorId) || isReceptionist;

  if (!canView) return null;

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [patientGalleryPage, setPatientGalleryPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    imageId: string | null;
    imageUrl: string | null;
  }>({
    isOpen: false,
    imageId: null,
    imageUrl: null,
  });

  // ✅ PREVIEW STATE
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    images: GalleryImage[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

  // ✅ KEYBOARD SUPPORT (safe)
  useEffect(() => {
    if (!previewModal.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [previewModal.isOpen]);

  const openPreview = (images: GalleryImage[], index: number) => {
    setPreviewModal({
      isOpen: true,
      images,
      currentIndex: index,
    });
  };

  // APIs
  const {
    data: appointmentGalleryData,
    isLoading: isAppointmentGalleryLoading,
    refetch: refetchAppointmentGallery,
  } = useGetAppointmentGalleryQuery(
    { appointmentId },
    { skip: !appointmentId },
  );

  const {
    data: patientGalleryData,
    isLoading: isPatientGalleryLoading,
    refetch: refetchPatientGallery,
  } = useGetPatientGalleryQuery(
    { patientId, page: patientGalleryPage, limit: 30 },
    { skip: !patientId },
  );

  const [deleteImage, { isLoading: isDeleting }] =
    useDeletePatientGalleryImageMutation();

  const appointmentImages = useMemo(
    () => appointmentGalleryData?.data || [],
    [appointmentGalleryData],
  );

  const patientImages = useMemo(
    () => patientGalleryData?.data || [],
    [patientGalleryData],
  );

  const totalPages = useMemo(() => {
    const p = patientGalleryData?.pagination;
    return p?.totalPages || Math.ceil(p?.total / p?.limit) || 1;
  }, [patientGalleryData]);

  const handleDeleteClick = (imageId: string, imageUrl: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      imageId,
      imageUrl,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal.imageId) return;

    try {
      await deleteImage(deleteConfirmModal.imageId).unwrap();
      addToast({
        title: "Image deleted",
        description: "The image has been successfully deleted.",
        color: "success",
        variant: "flat",
      });
      refetchAppointmentGallery();
      refetchPatientGallery();
    } catch (error: any) {
      addToast({
        title: "Failed to delete image",
        description: error?.data?.message || "Unknown error occurred",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setDeleteConfirmModal({
        isOpen: false,
        imageId: null,
        imageUrl: null,
      });
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmModal({
      isOpen: false,
      imageId: null,
      imageUrl: null,
    });
  };

  const handleImageError = (imageId: string) => {
    setImageErrors((prev) => new Set(prev).add(imageId));
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    refetchAppointmentGallery();
    refetchPatientGallery();
    addToast({
      title: "Image uploaded successfully",
      color: "success",
      variant: "flat",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  return (
    <div className="space-y-5">
      {/* Appointment Gallery */}
      <Card shadow="none" radius="lg" className="bg-white">
        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3 sm:px-5">
            <h3 className=" text-[13px] md:text-lg font-semibold text-gray-900">
              Current Appointment Gallery ({appointmentImages.length})
            </h3>
            {canUpload && !isRestrictedStatus && (
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
          {isAppointmentGalleryLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : appointmentImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {appointmentImages.map((img: GalleryImage, index: number) => (
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
                        src={img.imageUrl}
                        alt={img.description || "Gallery image"}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(img.id)}
                      />
                    )}
                  </div>

                  {/* 👁 PREVIEW */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Button
                      isIconOnly
                      size="sm"
                      className="bg-gray-800/90"
                      onPress={() => openPreview(appointmentImages, index)}
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
                        onPress={() => handleDeleteClick(img.id, img.imageUrl)}
                      >
                        <FiTrash2 />
                      </Button>
                    </div>
                  )}

                  <div className="absolute top-0 left-0 text-xs text-white bg-gray-500 bg-opacity-50 p-1 rounded-br-md">
                    {formatDate(img.createdAt)}
                  </div>

                  {img.description && (
                    <div className="absolute bottom-0 left-0 right-0 text-xs text-white bg-gray-800 bg-opacity-75 p-1 w-full truncate">
                      {img.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-[13px] md:text-lg">
              No images in current appointment gallery
            </div>
          )}
        </CardBody>
      </Card>

      {/* Patient Gallery */}
      <Card shadow="none" radius="lg" className="bg-white">
        <div className="border-b border-gray-200 bg-white">
          <h3 className="px-4 py-3 sm:px-5 text-[13px] md:text-lg font-semibold text-gray-900">
            Patient Gallery ({patientImages.length})
          </h3>
        </div>

        <CardBody className="p-3 sm:p-5">
          {isPatientGalleryLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : patientImages.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {patientImages.map((img: GalleryImage, index: number) => (
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
                          src={img.imageUrl}
                          alt={img.description || "Patient gallery image"}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(img.id)}
                        />
                      )}
                    </div>

                    {/* 👁 PREVIEW */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Button
                        isIconOnly
                        size="sm"
                        className="bg-gray-800/90"
                        onPress={() => openPreview(patientImages, index)}
                      >
                        <FiEye className="text-white" />
                      </Button>
                    </div>

                    <div className="absolute top-0 left-0 text-xs text-white bg-gray-500 bg-opacity-50 p-1 rounded-br-md">
                      {formatDate(img.createdAt)}
                    </div>

                    {img.description && (
                      <div className="absolute bottom-0 left-0 right-0 text-xs text-white bg-gray-800 bg-opacity-75 p-1 w-full truncate">
                        {img.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    total={totalPages}
                    initialPage={1}
                    page={patientGalleryPage}
                    onChange={setPatientGalleryPage}
                    size="sm"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 text-[13px] md:text-lg">
              No images in patient gallery
            </div>
          )}
        </CardBody>
      </Card>

      {/* Upload Modal */}
      {canUpload && (
        <UploadGalleryImageModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          appointmentId={appointmentId}
          patientId={patientId}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={handleCancelDelete}
        size="sm"
        backdrop="blur"
        hideCloseButton={false}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: "easeIn",
              },
            },
          },
        }}
        classNames={{
          base: "border border-gray-200 shadow-xl",
          header: "border-b border-gray-100",
          footer: "border-t border-gray-100",
          closeButton: "hover:bg-gray-100 active:bg-gray-200",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <FiTrash2 className="h-5 w-5 text-danger" />
                  <span>Confirm Delete</span>
                </div>
              </ModalHeader>

              <ModalBody>
                {deleteConfirmModal.imageUrl && (
                  <div className="mb-4 relative group">
                    <img
                      src={deleteConfirmModal.imageUrl}
                      alt="Image to delete"
                      className="w-full h-32 object-cover rounded-lg"
                      onError={() => console.log("Failed to load image")}
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs">Preview</span>
                    </div>
                  </div>
                )}

                <p className="text-center">
                  Are you sure you want to delete this image?
                </p>
                <p className="text-sm text-gray-500 text-center">
                  This action cannot be undone.
                </p>
              </ModalBody>

              <ModalFooter className="flex justify-end gap-2">
                <Button
                  color="default"
                  variant="light"
                  onPress={handleCancelDelete}
                  startContent={<FiX className="h-4 w-4" />}
                >
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

      {/* 🔥 PREVIEW MODAL */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal((p) => ({ ...p, isOpen: false }))}
        size="5xl"
        backdrop="blur"
      >
        <ModalContent>
          {() => {
            const img: GalleryImage =
              previewModal.images[previewModal.currentIndex];

            return (
              <div className="relative bg-black h-[80vh] flex flex-col items-center justify-center">
                <img
                  src={img?.imageUrl}
                  alt={img?.description || "Preview image"}
                  className="max-h-[60vh] max-w-full object-contain"
                />

                {/* ✅ FULL DESCRIPTION */}
                {img?.description && (
                  <div className="text-white mt-4 px-6 text-center max-w-2xl">
                    {img.description}
                  </div>
                )}

                {/* Date display in preview */}
                {img?.createdAt && (
                  <div className="text-gray-400 text-sm mt-2">
                    {formatDate(img.createdAt)}
                  </div>
                )}

                <button
                  className="absolute left-4 text-white text-3xl hover:bg-white/20 rounded-full p-2 transition"
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
                  className="absolute right-4 text-white text-3xl hover:bg-white/20 rounded-full p-2 transition"
                  onClick={() =>
                    setPreviewModal((p) => ({
                      ...p,
                      currentIndex: (p.currentIndex + 1) % p.images.length,
                    }))
                  }
                >
                  ›
                </button>

                <button
                  className="absolute top-4 right-4 text-white text-2xl hover:bg-white/20 rounded-full p-2 transition"
                  onClick={() =>
                    setPreviewModal((p) => ({ ...p, isOpen: false }))
                  }
                >
                  ✕
                </button>

                {/* Image counter */}
                {previewModal.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                    {previewModal.currentIndex + 1} /{" "}
                    {previewModal.images.length}
                  </div>
                )}
              </div>
            );
          }}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default PatientGallery;
