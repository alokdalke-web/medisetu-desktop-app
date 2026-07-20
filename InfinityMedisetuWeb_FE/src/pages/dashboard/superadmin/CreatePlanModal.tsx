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
import { FiPlus, FiTrash2, FiAlertCircle, FiRotateCcw } from "react-icons/fi";
import InputField from "../../../components/shared/InputField";
import UpdateModal from "../../../components/shared/Modals/UpdateModal";
import AppButton from "../../../components/shared/AppButton";
import {
  useCreateSubscriptionPlanMutation,
  useManageFeaturesMutation,
  type Plan,
} from "../../../redux/api/subscriptionApi";
import {
  createPlanSchema,
  type CreatePlanDto,
  type CreatePlanFormValues,
} from "../../../schemas/subscription";

interface CreatePlanModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: Plan | null;
}

const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  isOpen,
  onOpenChange,
  editData,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState<CreatePlanDto | null>(null);

  const [createPlan, { isLoading: isCreating }] =
    useCreateSubscriptionPlanMutation();
  const [manageFeatures, { isLoading: isManaging }] =
    useManageFeaturesMutation();

  const isLoading = isCreating || isManaging;

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
        reset({
          name: editData.name || "",
          slug: editData.slug || "",
          description: editData.description || "",
          price: editData.price ?? (editData as any).priceCents ?? 0,
          currency: editData.currency || "INR",
          features: (editData.features || []).map((f) => ({
            id: f.id,
            name: f.name,
            description: f.description,
            isDeleted: false,
          })),
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
    }
  }, [editData, reset, isOpen]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "features",
  });

  const handleActualSubmit = async (data: CreatePlanDto) => {
    try {
      if (editData) {
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
          description: "Subscription plan features updated successfully",
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

  return (
    <>
      <UpdateModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title={editData ? "Update Plan Features" : "Create Subscription Plan"}
        isLoading={isLoading}
        isDisabled={!isDirty}
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        body={
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
            {editData ? (
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {editData.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{editData.name}</h3>
                    <p className="text-xs text-slate-500">{editData.slug}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Price</p>
                  <p className="font-bold text-primary">
                    {editData.currency} {editData.price?.toLocaleString()}
                  </p>
                </div>
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
                />

                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    name="price"
                    label="Price"
                    type="number"
                    placeholder="e.g. 100"
                    control={control}
                    error={errors.price?.message}
                    parse={(val) => {
                      const num = parseFloat(val);
                      return Number.isNaN(num) ? 0 : num;
                    }}
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

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Plan Features</h4>
                  <p className="text-[11px] text-slate-400">Add or manage features included in this plan</p>
                </div>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="rounded-full font-semibold"
                  startContent={<FiPlus size={14} />}
                  onClick={() =>
                    append({
                      name: "",
                      description: "",
                      isDeleted: false,
                    })
                  }
                >
                  Add New
                </Button>
              </div>

              <div className="space-y-2">
                {/* Header for list */}
                {fields.filter(f => !f.isDeleted || editData).length > 0 && (
                  <div className="grid grid-cols-12 gap-4 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-4">Feature Name</div>
                    <div className="col-span-7">Description</div>
                    <div className="col-span-1 text-center"></div>
                  </div>
                )}

                {fields.map((field, index) => {
                  const feature = watch(`features.${index}`);
                  const isDeleted = feature?.isDeleted;
                  const activeFeaturesCount = watch("features")?.filter(f => !f.isDeleted).length || 0;

                  return (
                    <div
                      key={field.id}
                      className={`group relative grid grid-cols-12 gap-3 items-start rounded-2xl border p-2 transition-all ${
                        isDeleted
                          ? "bg-slate-50/50 border-slate-200 opacity-60"
                          : "bg-white border-slate-100 hover:border-primary/20 hover:shadow-sm"
                      }`}
                    >
                      <div className={`col-span-4 ${isDeleted ? "pointer-events-none" : ""}`}>
                        <div className={isDeleted ? "line-through decoration-slate-400" : ""}>
                          <InputField
                            name={`features.${index}.name`}
                            label=""
                            placeholder="e.g. 24/7 Support"
                            control={control}
                            error={errors.features?.[index]?.name?.message}
                            isReadOnly={isDeleted}
                            size="sm"
                            radius="lg"
                            classNames={{
                              inputWrapper: "bg-transparent border-slate-200 min-h-[40px] h-[40px]",
                              input: "text-sm"
                            }}
                          />
                        </div>
                      </div>
                      <div className={`col-span-7 ${isDeleted ? "pointer-events-none" : ""}`}>
                        <div className={isDeleted ? "line-through decoration-slate-400" : ""}>
                          <InputField
                            name={`features.${index}.description`}
                            label=""
                            placeholder="Describe what's included..."
                            control={control}
                            error={errors.features?.[index]?.description?.message}
                            isReadOnly={isDeleted}
                            size="sm"
                            radius="lg"
                            classNames={{
                              inputWrapper: "bg-transparent border-slate-200 min-h-[40px] h-[40px]",
                              input: "text-sm"
                            }}
                          />
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-center pt-1">
                        {isDeleted ? (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="success"
                            className="rounded-full h-8 w-8 min-w-0 hover:bg-success-50"
                            title="Restore Feature"
                            onClick={() => setValue(`features.${index}.isDeleted`, false, { shouldDirty: true })}
                          >
                            <FiRotateCcw size={14} />
                          </Button>
                        ) : (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            className="rounded-full h-8 w-8 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-50"
                            title="Remove Feature"
                            disabled={activeFeaturesCount <= 1}
                            onClick={() => {
                              if (feature?.id) {
                                setValue(`features.${index}.isDeleted`, true, { shouldDirty: true });
                              } else {
                                remove(index);
                              }
                            }}
                          >
                            <FiTrash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {errors.features?.root && (
                <p className="text-xs text-danger mt-1 px-2">
                  {errors.features.root.message}
                </p>
              )}
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
                plan features? This action cannot be undone.
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
    </>
  );
};

export default CreatePlanModal;
