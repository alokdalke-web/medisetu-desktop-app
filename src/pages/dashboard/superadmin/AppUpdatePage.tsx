import {
  addToast,
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Switch,
  useDisclosure,
} from "@heroui/react";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  FiAlertTriangle,
  FiEdit2,
  FiPlus,
  FiSmartphone,
} from "react-icons/fi";
import { SiAndroid, SiApple } from "react-icons/si";
import { useSelector } from "react-redux";
import { Navigate } from "react-router";

import InputField from "../../../components/shared/InputField";
import SectionCard from "../../../components/shared/SectionCard";
import SelectField from "../../../components/shared/SelectField";
import {
  useCreateAppUpdateConfigMutation,
  useGetAllAppUpdateConfigsQuery,
  useUpdateAppUpdateConfigMutation,
  type AppUpdateConfig,
  type AppUpdatePayload,
} from "../../../redux/api/appUpdateApi";
import type { RootState } from "../../../redux/store";

// ── Validation ─────────────────────────────────────────────────────────────────

const VERSION_REGEX = /^\d+\.\d+(\.\d+)?$/;
const HTTPS_URL_REGEX = /^https:\/\/.+\..+/;

const versionRules = (label: string) => ({
  required: `${label} is required`,
  pattern: {
    value: VERSION_REGEX,
    message: "Use format like 1.0.0 or 2.1",
  },
});

const urlRules = {
  validate: (value: string | boolean) => {
    if (typeof value !== "string" || !value.trim()) return true;
    if (!HTTPS_URL_REGEX.test(value.trim())) {
      return "Enter a valid HTTPS URL";
    }
    return true;
  },
};

// ── Form Types ─────────────────────────────────────────────────────────────────

interface ConfigFormValues {
  app_name: string;
  platform: string;
  latest_version: string;
  minimum_version: string;
  store_url: string;
  force_update: boolean;
}

const defaultFormValues: ConfigFormValues = {
  app_name: "",
  platform: "",
  latest_version: "",
  minimum_version: "",
  store_url: "",
  force_update: false,
};

// ── Options ────────────────────────────────────────────────────────────────────

const appNameOptions = [
  { label: "Doctor", value: "doctor" },
  { label: "Patient", value: "patient" },
];

const platformOptions = [
  { label: "iOS", value: "ios" },
  { label: "Android", value: "android" },
];

// ── Main Component ─────────────────────────────────────────────────────────────

const AppUpdatePage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: configs, isLoading } = useGetAllAppUpdateConfigsQuery();
  const [createConfig, { isLoading: isCreating }] = useCreateAppUpdateConfigMutation();
  const [updateConfig, { isLoading: isUpdating }] = useUpdateAppUpdateConfigMutation();

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editingConfig, setEditingConfig] = useState<AppUpdateConfig | null>(null);

  const isSaving = isCreating || isUpdating;

  const { control, handleSubmit, reset, formState: { isDirty } } = useForm<ConfigFormValues>({
    defaultValues: defaultFormValues,
    mode: "onChange",
  });

  // Guard: only Super Admin
  if (user?.userType !== "Super_Admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const openCreateModal = () => {
    setEditingConfig(null);
    reset(defaultFormValues);
    onOpen();
  };

  const openEditModal = (config: AppUpdateConfig) => {
    setEditingConfig(config);
    reset({
      app_name: config.app_name,
      platform: config.platform,
      latest_version: config.latest_version || "",
      minimum_version: config.minimum_version || "",
      store_url: config.store_url || "",
      force_update: config.force_update ?? false,
    });
    onOpen();
  };

  const onSubmit = async (values: ConfigFormValues) => {
    const payload: AppUpdatePayload = {
      app_name: values.app_name,
      platform: values.platform as "ios" | "android",
      latest_version: values.latest_version.trim(),
      minimum_version: values.minimum_version.trim() || undefined,
      force_update: values.force_update,
      store_url: values.store_url.trim() || undefined,
    };

    try {
      if (editingConfig) {
        await updateConfig(payload).unwrap();
        addToast({
          title: "Updated",
          description: `Config for ${values.app_name} (${values.platform}) updated.`,
          color: "success",
        });
      } else {
        await createConfig(payload).unwrap();
        addToast({
          title: "Created",
          description: `Config for ${values.app_name} (${values.platform}) created.`,
          color: "success",
        });
      }
      onOpenChange();
    } catch (err: any) {
      const status = err?.status;
      let description = "Something went wrong. Please try again.";

      if (status === 409) description = "Config for this app + platform already exists. Edit it instead.";
      else if (status === 404) description = "No config found for this combination. Create it first.";
      else if (status === 400) description = "Validation failed. Check the fields.";

      addToast({ title: "Error", description, color: "danger" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Spinner label="Loading app update configs..." />
      </div>
    );
  }

  const configList = configs ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/30">
            <FiSmartphone className="text-teal-700 dark:text-teal-300" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#100E1C] dark:text-white">
              App Updates
            </h2>
            <p className="text-sm text-[#677294] dark:text-slate-400">
              Manage version configs for all apps and platforms.
            </p>
          </div>
        </div>
        <Button
          color="primary"
          size="sm"
          radius="full"
          startContent={<FiPlus size={16} />}
          onPress={openCreateModal}
        >
          Add Config
        </Button>
      </div>

      {/* Configs Table */}
      {configList.length === 0 ? (
        <SectionCard className="!border-slate-200 dark:!border-[#273244] dark:!bg-[#0f1728]">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FiSmartphone className="text-slate-300 dark:text-slate-600 mb-3" size={40} />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No app update configurations yet.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Click "Add Config" to create your first one.
            </p>
          </div>
        </SectionCard>
      ) : (
        <SectionCard padding="none" className="!border-slate-200 dark:!border-[#273244] dark:!bg-[#0f1728] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#273244] bg-slate-50 dark:bg-[#172033]">
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">App</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Platform</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Latest</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Minimum</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">Force</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {configList.map((cfg) => (
                  <tr
                    key={cfg.id}
                    className="border-b last:border-b-0 border-slate-100 dark:border-[#273244] hover:bg-slate-50 dark:hover:bg-[#172033] transition-colors"
                  >
                    <td className="px-4 py-3 capitalize font-medium text-slate-800 dark:text-slate-200">
                      {cfg.app_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {cfg.platform === "ios" ? (
                          <SiApple size={14} className="text-slate-600 dark:text-slate-300" />
                        ) : (
                          <SiAndroid size={14} className="text-green-600 dark:text-green-400" />
                        )}
                        <span className="text-slate-700 dark:text-slate-300 capitalize">
                          {cfg.platform}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Chip size="sm" variant="flat" color="primary" className="font-mono text-xs">
                        {cfg.latest_version}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <Chip size="sm" variant="flat" color="warning" className="font-mono text-xs">
                        {cfg.minimum_version || "—"}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cfg.force_update ? (
                        <Chip size="sm" color="danger" variant="flat">Yes</Chip>
                      ) : (
                        <Chip size="sm" color="default" variant="flat">No</Chip>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        onPress={() => openEditModal(cfg)}
                        aria-label={`Edit ${cfg.app_name} ${cfg.platform}`}
                      >
                        <FiEdit2 size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Two-tier Info Note */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4">
        <div className="flex items-start gap-2">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" size={16} />
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
              Two-tier version check
            </p>
            <ul className="text-xs text-amber-600 dark:text-amber-400 list-disc pl-4 space-y-0.5">
              <li><strong>Below Minimum Version</strong> → always force update (blocking, regardless of toggle).</li>
              <li><strong>Between Minimum and Latest</strong> → respects the "Force Update" toggle.</li>
              <li><strong>At or above Latest</strong> → no prompt shown.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg" placement="center">
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleSubmit(onSubmit)}>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-lg font-semibold">
                  {editingConfig ? "Edit Config" : "New App Update Config"}
                </span>
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  {editingConfig
                    ? `Editing ${editingConfig.app_name} — ${editingConfig.platform}`
                    : "Create a new version config for an app + platform."}
                </span>
              </ModalHeader>

              <ModalBody className="gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SelectField
                    name="app_name"
                    label="App Name"
                    control={control}
                    options={appNameOptions}
                    placeholder="Select app"
                    rules={{ required: "App name is required" }}
                    isRequired
                    isDisabled={!!editingConfig}
                  />
                  <SelectField
                    name="platform"
                    label="Platform"
                    control={control}
                    options={platformOptions}
                    placeholder="Select platform"
                    rules={{ required: "Platform is required" }}
                    isRequired
                    isDisabled={!!editingConfig}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InputField
                    name="latest_version"
                    label="Latest Version"
                    control={control}
                    placeholder="e.g. 2.1.0"
                    description="Newest version in the store."
                    rules={versionRules("Latest version")}
                    isRequired
                  />
                  <InputField
                    name="minimum_version"
                    label="Minimum Version"
                    control={control}
                    placeholder="e.g. 1.5.0"
                    description="Users below this are always forced to update."
                    rules={{
                      pattern: {
                        value: VERSION_REGEX,
                        message: "Use format like 1.0.0 or 2.1",
                      },
                    }}
                  />
                </div>

                <InputField
                  name="store_url"
                  label="Store URL"
                  control={control}
                  placeholder="https://apps.apple.com/... or https://play.google.com/..."
                  rules={urlRules}
                />

                <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-[#38445a] bg-slate-50 dark:bg-[#172033] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Force Update to Latest
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Users between minimum and latest must also update (blocking dialog).
                    </p>
                  </div>
                  <Controller
                    name="force_update"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        size="sm"
                        color="danger"
                        isSelected={field.value}
                        onValueChange={field.onChange}
                        aria-label="Force update toggle"
                      />
                    )}
                  />
                </div>

                {/* Helper text */}
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                  ℹ️ Users below minimum version are always forced to update, regardless of the toggle above.
                </p>
              </ModalBody>

              <ModalFooter>
                <Button variant="light" onPress={onClose} radius="full">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  radius="full"
                  isLoading={isSaving}
                  isDisabled={!isDirty && !!editingConfig}
                >
                  {editingConfig ? "Save Changes" : "Create"}
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AppUpdatePage;
