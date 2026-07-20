import React, { useState } from "react";
import {
  Card,
  CardBody,
  Switch,
  Select,
  SelectItem,
  Input,
  Button,
} from "@heroui/react";
import { FiEye, FiEyeOff } from "react-icons/fi";

type RemUnit = "minute" | "hour" | "day";

const PatientSetting: React.FC = () => {
  // Notifications
  const [emailNt, setEmailNt] = useState(false);
  const [smsNt, setSmsNt] = useState(true);
  const [waNt, setWaNt] = useState(false);

  // Reminders
  const [remAmt, setRemAmt] = useState("1");
  const [remUnit, setRemUnit] = useState<RemUnit>("hour");

  // Security
  const [pwd, setPwd] = useState("password");
  const [showPwd, setShowPwd] = useState(false);

  return (
    <Card radius="lg" className="mx-auto w-full border border-gray-200">
      <CardBody className="p-6">
        {/* Notification Settings */}
        <h3 className="mb-4 text-lg font-semibold">Notification Settings</h3>

        <div className="mb-8 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base">Email Notifications</span>
            <Switch isSelected={emailNt} onValueChange={setEmailNt} color="success" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base">SMS Notifications</span>
            <Switch isSelected={smsNt} onValueChange={setSmsNt} color="success" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base">WhatsApp Notifications</span>
            <Switch isSelected={waNt} onValueChange={setWaNt} color="success" />
          </div>

          <div>
            <span className="mb-2 block text-sm sm:text-base">Appointment Reminders</span>
            <div className="grid grid-cols-1 gap-3 sm:max-w-xs sm:grid-cols-2">
              {/* Amount */}
              <Select
                aria-label="Reminder amount"
                selectedKeys={new Set([remAmt])}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<React.Key>)[0];
                  setRemAmt(String(key));
                }}
                radius="full"
                variant="bordered"
                classNames={{ trigger: "h-9" }}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const v = String(i + 1);
                  return (
                    <SelectItem key={v}>{v}</SelectItem>
                  );
                })}
              </Select>

              {/* Unit */}
              <Select
                aria-label="Reminder unit"
                selectedKeys={new Set([remUnit])}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<React.Key>)[0];
                  setRemUnit(String(key) as RemUnit);
                }}
                radius="full"
                variant="bordered"
                classNames={{ trigger: "h-9" }}
              >
                <SelectItem key="minute">minute</SelectItem>
                <SelectItem key="hour">hour</SelectItem>
                <SelectItem key="day">day</SelectItem>
              </Select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <h3 className="mb-4 text-lg font-semibold">Security Settings</h3>

        <div className="mb-8 max-w-md">
          <label className="mb-2 block text-sm font-medium">Password</label>
          <Input
            type={showPwd ? "text" : "password"}
            value={pwd}
            onValueChange={setPwd}
            radius="full"
            variant="bordered"
            classNames={{ inputWrapper: "h-11" }}
            endContent={
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                className="text-gray-500"
              >
                {showPwd ? <FiEyeOff /> : <FiEye />}
              </button>
            }
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="bordered" radius="full" className="border-gray-300">
            Cancel
          </Button>
          <Button radius="full" className="bg-teal-600 text-white hover:bg-teal-700">
            Save Changes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default PatientSetting;
