import {
  addToast,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  Textarea,
} from "@heroui/react";
import React, { useEffect, useState } from "react";
import { FiSave } from "react-icons/fi";
import { useUpdateSingleLimitMutation } from "../../../redux/api/planLimitsApi";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EditableLimit {
  id: string;
  featureKey: string;
  limitValue: number | null;
  isUnlimited: boolean;
  enabled: boolean;
  description: string;
}

interface EditLimitModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  limit: EditableLimit | null;
  planId: string;
  onSave: (updated: EditableLimit) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NUMERIC_FEATURES = new Set([
  "doctor_accounts",
  "receptionist_accounts",
  "whatsapp_messages_per_month",
  "storage_months",
  "payment_history_months",
]);

function isNumericFeature(featureKey: string) {
  return NUMERIC_FEATURES.has(featureKey);
}

function formatFeatureLabel(featureKey: string) {
  return featureKey
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Component ───────────────────────────────────────────────────────────────

const EditLimitModal: React.FC<EditLimitModalProps> = ({
  isOpen,
  onOpenChange,
  limit,
  planId,
  onSave,
}) => {
  const [updateSingle, { isLoading }] = useUpdateSingleLimitMutation();

  const [localLimit, setLocalLimit] = useState<EditableLimit | null>(null);

  useEffect(() => {
    if (limit && isOpen) {
      setLocalLimit({ ...limit });
    }
  }, [limit, isOpen]);

  if (!localLimit) return null;

  const isNumeric = isNumericFeature(localLimit.featureKey);

  const handleSave = async () => {
    if (!localLimit || !planId) return;

    try {
      await updateSingle({
        planId,
        featureKey: localLimit.featureKey,
        body: {
          limitValue: localLimit.limitValue,
          isUnlimited: localLimit.isUnlimited,
          enabled: localLimit.enabled,
          description: localLimit.description,
        },
      }).unwrap();

      addToast({
        title: "Success",
        description: `Updated "${formatFeatureLabel(localLimit.featureKey)}" successfully`,
        color: "success",
      });

      onSave(localLimit);
      onOpenChange(false);
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update limit",
        color: "danger",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg" className="rounded-3xl">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              <h3 className="text-lg font-bold text-slate-900">
                Edit Feature Limit
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {localLimit.featureKey}
              </p>
            </ModalHeader>

            <ModalBody className="space-y-5">
              {/* Description */}
              <Textarea
                label="Description"
                variant="bordered"
                placeholder="Human-readable description of this feature limit"
                value={localLimit.description}
                onValueChange={(val) =>
                  setLocalLimit((prev) => prev && { ...prev, description: val })
                }
                classNames={{
                  inputWrapper: "border-slate-200",
                  label: "text-sm font-medium text-slate-700",
                }}
              />

              {/* Enabled */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">Enabled</p>
                  <p className="text-xs text-slate-400">
                    When disabled, this feature is completely blocked for the plan
                  </p>
                </div>
                <Switch
                  color="success"
                  isSelected={localLimit.enabled}
                  onValueChange={(val) =>
                    setLocalLimit((prev) => prev && { ...prev, enabled: val })
                  }
                />
              </div>

              {/* Numeric-specific fields */}
              {isNumeric && (
                <>
                  {/* Unlimited */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Unlimited</p>
                      <p className="text-xs text-slate-400">
                        If enabled, no cap is applied (overrides limit value)
                      </p>
                    </div>
                    <Switch
                      color="primary"
                      isSelected={localLimit.isUnlimited}
                      isDisabled={!localLimit.enabled}
                      onValueChange={(val) =>
                        setLocalLimit((prev) => prev && { ...prev, isUnlimited: val })
                      }
                    />
                  </div>

                  {/* Limit Value */}
                  <Input
                    type="number"
                    label="Limit Value"
                    variant="bordered"
                    placeholder="Enter numeric limit"
                    value={localLimit.limitValue?.toString() ?? ""}
                    isDisabled={!localLimit.enabled || localLimit.isUnlimited}
                    onValueChange={(val) => {
                      const num = val === "" ? null : parseInt(val, 10);
                      setLocalLimit((prev) =>
                        prev && {
                          ...prev,
                          limitValue: num !== null && isNaN(num) ? prev.limitValue : num,
                        }
                      );
                    }}
                    classNames={{
                      inputWrapper: "border-slate-200",
                      label: "text-sm font-medium text-slate-700",
                    }}
                  />
                </>
              )}
            </ModalBody>

            <ModalFooter className="pt-4">
              <Button variant="flat" color="default" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                startContent={<FiSave size={14} />}
                isLoading={isLoading}
                onPress={handleSave}
              >
                Save Changes
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default EditLimitModal;
