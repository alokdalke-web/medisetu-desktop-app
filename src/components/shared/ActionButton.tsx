import {
  Button,
  Listbox,
  ListboxItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@heroui/react";
import Icons from "../../constants/icons";

const Actions = {
  view: "view",
  edit: "edit",
  delete: "delete",
} as const;

interface ActionButtonProps {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  triggerIcon?: string;
}

const ActionButton = ({
  onView,
  onEdit,
  onDelete,
  triggerIcon = Icons.moreIcon,
}: ActionButtonProps) => {
  const defaultActions = [
    {
      key: Actions.view,
      label: "View",
      icon: Icons.viewIcon,
    },
    {
      key: Actions.edit,
      label: "Edit",
      icon: Icons.editIcon,
    },
    {
      key: Actions.delete,
      label: "Delete",
      icon: Icons.deleteIcon,
    },
  ];

  return (
    <Popover placement="right">
      <PopoverTrigger>
        <Button isIconOnly variant="light" disableRipple>
          <img src={triggerIcon} alt="more" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Listbox
          aria-label="Actions"
          items={defaultActions}
          onAction={(key) => {
            switch (key) {
              case Actions.view:
                onView();
                break;

              case Actions.edit:
                onEdit();
                break;

              case Actions.delete:
                onDelete();
                break;

              default:
                break;
            }
          }}
        >
          {(item) => (
            <ListboxItem
              key={item.key}
              startContent={<img src={item.icon} alt={item.key} />}
            >
              {item.label}
            </ListboxItem>
          )}
        </Listbox>
      </PopoverContent>
    </Popover>
  );
};

export default ActionButton;
