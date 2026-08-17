import { InputOtp, type InputOtpProps } from "@heroui/react";
import { Controller, type Control, type FieldValues } from "react-hook-form";

interface OtpFieldProps extends InputOtpProps {
  name: string;
  control: Control<FieldValues, FieldValues>;
}

const OtpField = ({ name, control, ...props }: OtpFieldProps) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <InputOtp
          {...field}
          {...props}
          variant="bordered"
          classNames={{
            segmentWrapper: "gap-x-6",
            segment:
              "bg-white w-[60px] h-[60px] text-xl rounded-xl border-1 border-border-color data-[focus=true]:border-primary",
          }}
        />
      )}
    />
  );
};

export default OtpField;
