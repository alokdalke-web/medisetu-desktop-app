import {
  addToast,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { FiPlus, FiTrash2, FiAlertCircle, FiSave } from "react-icons/fi";
import InputField from "../../../components/shared/InputField";
import UpdateModal from "../../../components/shared/Modals/UpdateModal";
import AppButton from "../../../components/shared/AppButton";
import {
  useCreateSubscriptionPlanMutation,
  useManageFeaturesMutation,
  useUpdateSubscriptionPlanMutation,
  type Plan,
} from "../../../redux/api/subscriptionApi";
import {
  createPlanSchema,
  FEATURE_NAME_MAX_WORDS,
  FEATURE_NAME_MAX_WORD_LENGTH,
  MAX_PLAN_PRICE,
  MAX_PLAN_FEATURES,
  MIN_PLAN_FEATURES,
  PLAN_DESCRIPTION_MAX_WORDS,
  PLAN_DESCRIPTION_MAX_WORD_LENGTH,
  PLAN_NAME_MAX_WORD_LENGTH,
  PLAN_NAME_MAX_WORDS,
  type CreatePlanDto,
  type CreatePlanFormValues,
} from "../../../schemas/subscription";

interface CreatePlanModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: Plan | null;
}

const limitPlanText = (value: string, maxWords: number, maxWordLength: number) => {
  let wordCount = 0;
  let reachedLimit = false;

  return value
    .split(/(\s+)/)
    .reduce((result, part) => {
      if (reachedLimit) return result;
      if (!part.trim()) return wordCount < maxWords ? result + part : result;

      if (wordCount >= maxWords) {
        reachedLimit = true;
        return result;
      }

      wordCount += 1;
      return result + part.slice(0, maxWordLength);
    }, "");
};

const parsePlanPrice = (value: string) => {
  const [wholeNumber] = value.split(".");
  const digits = wholeNumber.replace(/\D/g, "").slice(0, 4);
  return digits ? Number(digits) : 0;
};

const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  isOpen,
  onOpenChange,
  editData,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState<CreatePlanDto | null>(null);
  const [featureDeleteIndex, setFeatureDeleteIndex] = useState<number | null>(null);

  const [createPlan, { isLoading: isCreating }] =
    useCreateSubscriptionPlanMutation();
  const [updatePlan, { isLoading: isUpdating }] =
    useUpdateSubscriptionPlanMutation();
  const [manageFeatures, { isLoading: isManaging }] =
    useManageFeaturesMutation();

  const isLoading = isCreating || isUpdating || isManaging;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<CreatePlanFormValues, any, CreatePlanDto>({
    resolver: zodResolver(createPlanSchema),
    mode: "onChange",
    defaultValues: {
      slug: "",
      name: "",
      description: "",
      price: 0,
      currency: "INR",
      features: [{ name: "", description: "" }],
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        const mappedFeatures = (editData.features || []).map((f) => ({
          id: f.id,
          name: f.name,
          description: f.description,
          isDeleted: false,
        }));

        reset({
          name: editData.name || "",
          slug: editData.slug || "",
          description: editData.description || "",
          price: editData.price ?? (editData as any).priceCents ?? 0,
          currency: editData.currency || "INR",
          features: mappedFeatures.length > 0
            ? mappedFeatures
            : [{ name: "", description: "" }],
        });
      } else {
        reset({
          slug: "",
          name: "",
          description: "",
          price: 0,
          currency: "INR",
          features: [{ name: "", description: "" }],
        });
      }
    } else {
      setFormData(null);
      setShowConfirm(false);
      setFeatureDeleteIndex(null);
    }
  }, [editData, reset, isOpen]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "features",
  });
  const watchedFeatures = watch("features") || [];
  const activeFeaturesCount = watchedFeatures.filter((feature) => !feature.isDeleted).length;
  const canAddFeature = activeFeaturesCount < MAX_PLAN_FEATURES;
  const canRemoveFeature = activeFeaturesCount > MIN_PLAN_FEATURES;
  const featuresErrorMessage = errors.features?.root?.message || errors.features?.message;
  const watchedPlanName = watch("name") || editData?.name || "P";
  const planInitial = watchedPlanName.charAt(0).toUpperCase();

  const handleActualSubmit = async (data: CreatePlanDto) => {
    try {
      if (editData) {
        await updatePlan({
          id: editData.id,
          body: {
            name: data.name,
            description: data.description,
            price: data.price,
          },
        }).unwrap();

        // Calculate add, update, and delete sets
        const currentFeatures = data.features || [];

        // Features to add: new (no id) and NOT marked as deleted
        const add = currentFeatures
          .filter((f) => !f.id && !f.isDeleted)
          .map((f) => ({ name: f.name, description: f.description }));

        // Features to update: existing (has id) and NOT marked as deleted
        const update = currentFeatures
          .filter((f) => f.id && !f.isDeleted)
          .map((f) => ({
            id: f.id!,
            name: f.name,
            description: f.description,
          }));

        // Features to delete: existing (has id) and marked as deleted
        const deleted = currentFeatures
          .filter((f) => f.id && f.isDeleted)
          .map((f) => f.id!);

        // Call the manageFeatures mutation
        await manageFeatures({
          planId: editData.id,
          body: {
            add,
            update,
            delete: deleted,
          },
        }).unwrap();

        addToast({
          title: "Success",
          description: "Subscription plan updated successfully",
          color: "success",
        });
      } else {
        await createPlan(data).unwrap();
        addToast({
          title: "Success",
          description: "Subscription plan created successfully",
          color: "success",
        });
      }
      reset();
      setFormData(null);
      setShowConfirm(false);
      onOpenChange(false);
    } catch (error: any) {
      addToast({
        title: "Error",
        description:
          error?.data?.message ||
          `Failed to ${editData ? "update" : "create"} subscription plan`,
        color: "danger",
      });
    }
  };

  const onSubmit = (data: CreatePlanDto) => {
    if (editData) {
      setFormData(data);
      setShowConfirm(true);
    } else {
      handleActualSubmit(data);
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    // If there are errors, we show a toast for the first one
    const errorMessages = Object.values(errors)
      .map((error: any) => error?.message)
      .filter(Boolean);

    if (errorMessages.length > 0) {
      addToast({
        title: "Validation Error",
        description: errorMessages[0] as string,
        color: "danger",
      });
    }
  };

  const requestFeatureDelete = (index: number) => {
    if (!canRemoveFeature) return;
    setFeatureDeleteIndex(index);
  };

  const confirmFeatureDelete = () => {
    if (featureDeleteIndex === null) return;

    const feature = watchedFeatures[featureDeleteIndex];
    if (feature?.id) {
      setValue(`features.${featureDeleteIndex}.isDeleted`, true, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else {
      remove(featureDeleteIndex);
    }

    setFeatureDeleteIndex(null);
  };

  return (
    <>
      <UpdateModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title={editData ? "Update Subscription Plan" : "Create Subscription Plan"}
        isLoading={isLoading}
        isDisabled={!isDirty}
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        modalClassName="!p-6 sm:!p-8"
        titleClassName="!text-xl !font-bold !normal-case text-slate-900"
        bodyClassName="!mt-6"
        footerClassName="!mt-6 justify-between"
        cancelClassName="!h-12 !w-32 !rounded-xl !text-sm"
        submitClassName="!h-12 !flex-1 !rounded-xl !text-sm !font-semibold"
        submitStartContent={<FiSave size={16} />}
        body={
          <div className="space-y-5">
            {editData ? (
              <div className="rounded-xl bg-gradient-to-br from-white to-slate-50/80 p-4 border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex shrink-0 items-center justify-center text-primary font-bold">
                    {planInitial}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Plan Details</h3>
                    <p className="text-[11px] text-slate-500">Essential information about this plan.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InputField
                    name="name"
                    label="Plan Name"
                    isRequired
                    placeholder="e.g. Pro Plan"
                    control={control}
                    error={errors.name?.message}
                    parse={(val) =>
                      limitPlanText(val, PLAN_NAME_MAX_WORDS, PLAN_NAME_MAX_WORD_LENGTH)
                    }
                    radius="lg"
                    classNames={{
                      inputWrapper: "min-h-[40px] h-[40px] border-slate-200 bg-white shadow-none",
                      input: "text-sm font-medium",
                    }}
                  />
                  <InputField
                    name="price"
                    label="Price"
                    isRequired
                    type="number"
                    placeholder="e.g. 100"
                    control={control}
                    error={errors.price?.message}
                    min={0}
                    max={MAX_PLAN_PRICE}
                    step={1}
                    inputMode="numeric"
                    parse={parsePlanPrice}
                    startContent={
                      <span className="flex h-full min-h-[40px] items-center self-stretch border-r border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-500">
                        {editData.currency || "INR"}
                      </span>
                    }
                    radius="lg"
                    classNames={{
                      inputWrapper: "min-h-[40px] h-[40px] overflow-hidden border-slate-200 bg-white p-0 shadow-none",
                      innerWrapper: "h-full gap-0",
                      input: "h-full px-3 text-sm font-medium",
                    }}
                  />
                </div>

                <InputField
                  name="description"
                  label="Description"
                  placeholder="Plan description..."
                  control={control}
                  error={errors.description?.message}
                  parse={(val) =>
                    limitPlanText(
                      val,
                      PLAN_DESCRIPTION_MAX_WORDS,
                      PLAN_DESCRIPTION_MAX_WORD_LENGTH,
                    )
                  }
                  radius="lg"
                  classNames={{
                    inputWrapper: "min-h-[40px] h-[40px] border-slate-200 bg-white shadow-none",
                    input: "text-sm font-medium",
                  }}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    name="name"
                    label="Plan Name"
                    placeholder="e.g. Pro Plan"
                    control={control}
                    error={errors.name?.message}
                    parse={(val) =>
                      limitPlanText(val, PLAN_NAME_MAX_WORDS, PLAN_NAME_MAX_WORD_LENGTH)
                    }
                  />
                  <InputField
                    name="slug"
                    label="Slug"
                    placeholder="e.g. pro-plan"
                    control={control}
                    error={errors.slug?.message}
                  />
                </div>

                <InputField
                  name="description"
                  label="Description"
                  placeholder="Plan description..."
                  control={control}
                  error={errors.description?.message}
                  parse={(val) =>
                    limitPlanText(
                      val,
                      PLAN_DESCRIPTION_MAX_WORDS,
                      PLAN_DESCRIPTION_MAX_WORD_LENGTH,
                    )
                  }
                />

                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    name="price"
                    label="Price"
                    type="number"
                    placeholder="e.g. 100"
                    control={control}
                    error={errors.price?.message}
                    min={0}
                    max={MAX_PLAN_PRICE}
                    step={1}
                    inputMode="numeric"
                    parse={parsePlanPrice}
                  />
                  <InputField
                    name="currency"
                    label="Currency"
                    placeholder="e.g. INR"
                    control={control}
                    error={errors.currency?.message}
                  />
                </div>
              </>
            )}

            <div className="flex max-h-[430px] min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Plan Features</h4>
                  <p className="text-[11px] text-slate-500">Add or manage features included in this plan.</p>
                </div>
                <Button
                  size="sm"
                  variant="bordered"
                  color="primary"
                  className="h-8 rounded-lg border-primary/30 px-3 text-[12px] font-semibold"
                  startContent={<FiPlus size={14} />}
                  isDisabled={!canAddFeature}
                  title={
                    canAddFeature
                      ? "Add Feature"
                      : `Maximum ${MAX_PLAN_FEATURES} features allowed`
                  }
                  onClick={() => {
                    if (!canAddFeature) return;
                    append({
                      name: "",
                      description: "",
                      isDeleted: false,
                    });
                  }}
                >
                  Add Feature
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100">
                {activeFeaturesCount > 0 && (
                  <div className="sticky top-0 z-10 grid grid-cols-[20px_minmax(0,1fr)_minmax(0,1.2fr)_30px] items-center gap-2 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:grid-cols-[24px_minmax(0,1fr)_minmax(0,1.45fr)_32px] sm:gap-3">
                    <div />
                    <div>Feature Name</div>
                    <div>Description</div>
                    <div />
                  </div>
                )}

                <div className="divide-y divide-slate-100">
                  {fields.map((field, index) => {
                    const feature = watch(`features.${index}`);
                    const isDeleted = feature?.isDeleted;

                    if (isDeleted) return null;

                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-[20px_minmax(0,1fr)_minmax(0,1.2fr)_30px] items-center gap-2 px-4 py-3 sm:grid-cols-[24px_minmax(0,1fr)_minmax(0,1.45fr)_32px] sm:gap-3"
                      >
                        <div className="flex justify-center">
                          <span
                            aria-hidden="true"
                            className="grid h-5 w-4 grid-cols-2 place-content-center gap-0.5"
                          >
                            {[0, 1, 2, 3, 4, 5].map((dot) => (
                              <span key={dot} className="h-1 w-1 rounded-full bg-slate-400" />
                            ))}
                          </span>
                        </div>
                        <InputField
                          name={`features.${index}.name`}
                          label={<span className="sr-only">Feature name</span>}
                          placeholder="e.g. 24/7 Support"
                          control={control}
                          error={errors.features?.[index]?.name?.message}
                          parse={(val) =>
                            limitPlanText(val, FEATURE_NAME_MAX_WORDS, FEATURE_NAME_MAX_WORD_LENGTH)
                          }
                          size="sm"
                          radius="lg"
                          classNames={{
                            inputWrapper: "min-h-[36px] h-[36px] border-slate-200 bg-white shadow-none",
                            input: "text-[12px] font-medium text-slate-700",
                          }}
                        />
                        <InputField
                          name={`features.${index}.description`}
                          label={<span className="sr-only">Description</span>}
                          placeholder="Describe what's included..."
                          control={control}
                          error={errors.features?.[index]?.description?.message}
                          size="sm"
                          radius="lg"
                          classNames={{
                            inputWrapper: "min-h-[36px] h-[36px] border-slate-200 bg-white shadow-none",
                            input: "text-[12px] font-medium text-slate-700",
                          }}
                        />
                        <div className="flex justify-center">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            className="h-8 w-8 min-w-0 rounded-lg text-danger"
                            title="Remove Feature"
                            isDisabled={!canRemoveFeature}
                            onClick={() => requestFeatureDelete(index)}
                          >
                            <FiTrash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {featuresErrorMessage && (
                  <p className="px-4 pb-3 pt-1 text-xs text-danger">
                    {featuresErrorMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        }
      />

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        hideCloseButton
        size="md"
        className="rounded-3xl p-6"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col items-center gap-2 text-center pb-2">
                <div className="p-3 bg-warning-50 rounded-full">
                  <FiAlertCircle className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-xl font-bold">Confirm Changes</h3>
              </ModalHeader>
              <ModalBody className="text-center text-slate-600 pb-6">
                Are you sure you want to save the changes to the subscription
                plan features?
              </ModalBody>
              <ModalFooter className="flex justify-center gap-3 pt-0">
                <AppButton
                  text="Cancel"
                  buttonVariant="outlined"
                  className="w-32 h-11"
                  onPress={onClose}
                />
                <AppButton
                  text="Yes, Save"
                  className="w-32 h-11"
                  isLoading={isLoading}
                  onPress={() => formData && handleActualSubmit(formData)}
                />
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={featureDeleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) setFeatureDeleteIndex(null);
        }}
        hideCloseButton
        size="sm"
        className="rounded-3xl p-6"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col items-center gap-2 text-center pb-2">
                <div className="p-3 bg-danger-50 rounded-full">
                  <FiTrash2 className="w-7 h-7 text-danger" />
                </div>
                <h3 className="text-xl font-bold">Delete Feature?</h3>
              </ModalHeader>
              <ModalBody className="text-center text-slate-600 pb-6">
                Are you sure you want to delete this feature?
              </ModalBody>
              <ModalFooter className="flex justify-center gap-3 pt-0">
                <AppButton
                  text="Cancel"
                  buttonVariant="outlined"
                  className="w-32 h-11"
                  onPress={onClose}
                />
                <AppButton
                  text="Delete"
                  buttonVariant="danger"
                  className="w-32 h-11"
                  onPress={confirmFeatureDelete}
                />
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default CreatePlanModal;
