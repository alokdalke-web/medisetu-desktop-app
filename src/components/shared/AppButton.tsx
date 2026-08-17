import { Button, type ButtonProps } from "@heroui/react";

interface AppButtonProps extends ButtonProps {
  text: string;
  buttonVariant?: "primary" | "outlined" | "dark" | "danger" | "dangerOutlined";
  pill?: boolean;
}

const AppButton = ({
  text,
  buttonVariant = "primary",
  pill = false,
  className,
  ...props
}: AppButtonProps) => {
  const variantClasses = {
    primary:
      "bg-primary text-white hover:bg-primary-hover active:bg-primary-active",
    outlined:
      "bg-background-secondary border border-primary text-primary hover:border-primary-hover hover:text-primary-hover active:border-primary-active active:text-primary-active",
    dark: "bg-black text-white hover:bg-primary-active active:bg-[#1F1F1F]",
    danger: "bg-danger text-white",
    dangerOutlined: "bg-danger/10 border border-danger text-danger",
  };

  const radiusClass = pill ? "rounded-full" : "rounded-xl";

  return (
    <Button
      {...props}
      disableRipple
      className={`text-base font-medium ${radiusClass} ${variantClasses[buttonVariant]} ${className ?? ""}`}
    >
      {text}
    </Button>
  );
};

export default AppButton;