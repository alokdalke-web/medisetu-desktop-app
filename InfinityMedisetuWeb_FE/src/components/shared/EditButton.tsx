import { Button, type ButtonProps } from "@heroui/react";
import Icons from "../../constants/icons";

interface EditButtonProps extends ButtonProps {
  text: string;
}

const EditButton = ({ text, ...props }: EditButtonProps) => {
  return (
    <Button
      {...props}
      disableRipple={true}
      startContent={<img src={Icons.editIcon} />}
      className="min-w-auto h-auto px-2 py-1 rounded-full text-sm font-medium  bg-background border-1 border-border-color"
    >
      {text}
    </Button>
  );
};

export default EditButton;
