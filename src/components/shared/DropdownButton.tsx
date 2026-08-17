import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import Icons from "../../constants/icons";

interface DropdownButtonProps {
  text: string;
  items: { key: string; label: string; icon?: string; onClick?: () => void }[];
}

const DropdownButton = ({ text, items }: DropdownButtonProps) => {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          radius="full"
          disableRipple
          endContent={
            <img
              src={Icons.dropdownIcon}
              alt="dropdown"
              width={20}
              height={20}
            />
          }
          className="text-sm bg-black text-white"
        >
          {text}
        </Button>
      </DropdownTrigger>
      <DropdownMenu>
        {items.map((item) => (
          <DropdownItem
            key={item.key}
            onClick={item.onClick}
            startContent={item.icon && <img src={item.icon} alt={item.label} />}
          >
            {item.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default DropdownButton;
