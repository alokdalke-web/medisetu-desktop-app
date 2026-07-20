import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalBody,
  Input,
  Select,
  SelectItem,
  Checkbox,
  CheckboxGroup,
  addToast,
  Spinner,
} from "@heroui/react";
import { FiX, FiPlus, FiInbox } from "react-icons/fi";
import { useNavigate } from "react-router";
import AppButton from "../../components/shared/AppButton";
import {
  useLazyGetRemainingServicesQuery,
  useAddMultipleServicesMutation,
} from "../../redux/api/appointmentApi";

interface AddMultipleServicesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  appointmentId: string;
  onSuccess?: () => void;
}

const PAYMENT_MODES = ["Cash", "UPI", "Card"];

const AddMultipleServicesModal: React.FC<AddMultipleServicesModalProps> = ({
  isOpen,
  onOpenChange,
  appointmentId,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [
    triggerGetRemainingServices,
    {
      data: remainingServicesData,
      isLoading: isLoadingServices,
      isFetching: isRefetching,
      error: fetchError,
    },
  ] = useLazyGetRemainingServicesQuery();

  const refetchRemainingServices = React.useCallback(() => {
    if (appointmentId) {
      triggerGetRemainingServices(appointmentId);
    }
  }, [appointmentId, triggerGetRemainingServices]);

  const [hasFetched, setHasFetched] = useState(false);

  const isNoRemainingServicesError = React.useMemo(() => {
    if (!fetchError) return false;
    const err = fetchError as any;
    return (
      err.status === 404 ||
      err.data?.message === "No remaining services found" ||
      (typeof err.data?.message === "string" && err.data.message.includes("No remaining services"))
    );
  }, [fetchError]);

  const isGenericError = fetchError && !isNoRemainingServicesError;

  const [addMultipleServices, { isLoading: isSubmitting }] =
    useAddMultipleServicesMutation();

  const isServiceListLoading = isLoadingServices || isRefetching;

  // Extract services from response with multiple possible structures
  const services = React.useMemo(() => {
    if (!remainingServicesData) return [];

    // Try different possible response structures
    let servicesArray = null;

    // Structure 1: { result: [...] }
    if (remainingServicesData.result && Array.isArray(remainingServicesData.result)) {
      servicesArray = remainingServicesData.result;
    }
    // Structure 2: { data: [...] }
    else if (remainingServicesData.data && Array.isArray(remainingServicesData.data)) {
      servicesArray = remainingServicesData.data;
    }
    // Structure 3: { services: [...] }
    else if (remainingServicesData.services && Array.isArray(remainingServicesData.services)) {
      servicesArray = remainingServicesData.services;
    }
    // Structure 4: Direct array
    else if (Array.isArray(remainingServicesData)) {
      servicesArray = remainingServicesData;
    }
    // Structure 5: Nested inside a property like response or result
    else if (remainingServicesData.response && Array.isArray(remainingServicesData.response)) {
      servicesArray = remainingServicesData.response;
    }
    return servicesArray || [];
  }, [remainingServicesData]);

  const hasServices = !isServiceListLoading && !fetchError && services.length > 0;
  const hasNoServices =
    !isServiceListLoading && (Boolean(fetchError) || services.length === 0);

  // Fetch services exactly once when modal opens
  useEffect(() => {
    if (isOpen && appointmentId && !hasFetched) {
      triggerGetRemainingServices(appointmentId);
      setHasFetched(true);
    }
  }, [isOpen, appointmentId, hasFetched, triggerGetRemainingServices]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedServiceIds([]);
      setPaymentMode("Cash");
      setPaymentNotes("");
      setHasFetched(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (selectedServiceIds.length === 0) {
      addToast({
        title: "Selection required",
        description: "Please select at least one service.",
        color: "warning",
      });
      return;
    }

    try {
      await addMultipleServices({
        appointmentId,
        serviceIds: selectedServiceIds,
        paymentMode,
        payment_notes: paymentNotes,
      }).unwrap();

      addToast({
        title: "Success",
        description: "Services added successfully",
        color: "success",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || error?.message || "No service available to add",
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      hideCloseButton
      size="lg"
      classNames={{
        base: "rounded-2xl border border-transparent bg-white text-slate-900 dark:border-[#273244] dark:bg-[#111726] dark:text-white",
      }}
    >
      <ModalContent className="!bg-white !text-slate-900 dark:!bg-[#111726] dark:!text-white">
        {(onClose) => (
          <ModalBody className="relative bg-white p-6 dark:bg-[#111726]">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:text-white dark:hover:text-white"
            >
              <FiX size={18} className="text-current" />
            </button>

            <div className="mt-2 flex justify-center">
              {hasNoServices && !isGenericError ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full animate-pulse" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-md shadow-teal-500/20">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${hasNoServices
                    ? "bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                    : "bg-teal-100 dark:bg-[#1a3a35]"
                    }`}
                >
                  {hasNoServices ? (
                    <FiInbox size={22} />
                  ) : (
                    <FiPlus className="text-teal-600 dark:text-[#9be7dc]" size={22} />
                  )}
                </div>
              )}
            </div>

            <h2 className="mt-4 text-center text-xl font-semibold text-slate-900 dark:text-white">
              {hasNoServices
                ? isGenericError
                  ? "Failed to load services"
                  : "No services available to add"
                : "Add Additional Services"}
            </h2>

            {!hasNoServices && (
              <p className="mt-1 text-center text-sm text-slate-500 dark:text-white">
                Select one or more services to add to this appointment.
              </p>
            )}

            {hasNoServices && (
              <>
                {isGenericError ? (
                  <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
                    Couldn't load services. Please try again.
                  </p>
                ) : (
                  <div className="mt-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 p-4 rounded-xl text-center max-w-md mx-auto">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Please add or enable services to add them here.
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      All clinic services are either disabled or already assigned to this appointment. Manage them under settings to continue.
                    </p>
                  </div>
                )}
                <div className="mt-6 flex justify-center gap-3">
                  {isGenericError ? (
                    <AppButton
                      text="Retry"
                      onPress={() => refetchRemainingServices()}
                      isLoading={isServiceListLoading}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm transition-all rounded-xl"
                    />
                  ) : (
                    <AppButton
                      text="Go to Services & Pricing"
                      onPress={() => {
                        onOpenChange(false);
                        navigate("/profile/services");
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm transition-all rounded-xl"
                    />
                  )}
                  <AppButton
                    text="Close"
                    onPress={() => onOpenChange(false)}
                    className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#38445a] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151c2d] font-medium rounded-xl"
                  />
                </div>
              </>
            )}

            {!hasNoServices && (
              <>
                {/* Services Section */}
                <div className="mt-6">
                  <label className="text-sm font-medium text-slate-700 dark:text-white">
                    Select Services
                  </label>

                  {isServiceListLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner color="primary" />
                    </div>
                  ) : hasServices ? (
                    <div className="mt-3 max-h-[300px] overflow-y-auto pr-2 [scrollbar-color:#2f7d6e_#eaf2f0] [scrollbar-width:thin] dark:[scrollbar-color:#46beae_#111726]">
                      <CheckboxGroup
                        value={selectedServiceIds}
                        onValueChange={setSelectedServiceIds}
                        classNames={{
                          wrapper: "gap-3",
                        }}
                      >
                        {services.map((service: any) => (
                          <div
                            key={service.id || service._id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50 dark:border-[#273244] dark:bg-[#0f1728] dark:hover:bg-[#151c2d]"
                          >
                            <Checkbox value={service.id || service._id}>
                              <div className="ml-1">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {service.serviceName}
                                </p>
                              </div>
                            </Checkbox>
                            <div className="text-right">
                              <p className="text-sm font-bold text-teal-700 dark:text-[#9be7dc]">
                                {service.currency || "INR"} {service.price}
                              </p>
                            </div>
                          </div>
                        ))}
                      </CheckboxGroup>
                    </div>
                  ) : null}
                </div>

                {hasServices && (
                  <>
                    {/* Payment Mode */}
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-white">
                          Payment Mode
                        </label>
                        <Select
                          selectedKeys={[paymentMode]}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0] as string;
                            setPaymentMode(value);
                          }}
                          radius="lg"
                          variant="bordered"
                          className="mt-2"
                          classNames={{
                            trigger:
                              "border-slate-200 bg-white text-slate-900 dark:border-[#273244] dark:bg-[#0f1728] dark:text-white",
                            value: "text-slate-900 dark:text-white",
                            popoverContent:
                              "bg-white dark:bg-[#111726] dark:text-white dark:border dark:border-[#273244]",
                          }}
                        >
                          {PAYMENT_MODES.map((mode) => (
                            <SelectItem key={mode}>
                              {mode}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-white">
                          Payment Notes <span className="text-xs text-slate-500 dark:text-white">(Optional)</span>
                        </label>

                        <Input
                          placeholder="e.g. Transaction ID"
                          value={paymentNotes}
                          onValueChange={(value) => setPaymentNotes(value.slice(0, 15))}
                          maxLength={15}
                          radius="lg"
                          variant="bordered"
                          className="mt-2"
                          classNames={{
                            inputWrapper:
                              "border-slate-200 bg-white dark:border-[#273244] dark:bg-[#0f1728] dark:text-white",
                            input:
                              "text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-white",
                          }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex gap-3">
                      <AppButton
                        text="Cancel"
                        onPress={onClose}
                        className="w-1/2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#38445a] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151c2d]"
                      />
                      <AppButton
                        text="Add Services"
                        onPress={handleConfirm}
                        isLoading={isSubmitting}
                        isDisabled={selectedServiceIds.length === 0}
                        className="w-1/2 bg-teal-600 hover:bg-teal-700 text-white"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AddMultipleServicesModal;
