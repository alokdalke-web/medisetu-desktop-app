import { HandlebarFieldGroup } from "../types";

type GetVisibleFieldGroupsOptions = {
  groups: HandlebarFieldGroup[];
  hiddenGroupLabels: string[];
  hiddenFieldKeys: string[];
  placedFieldIds: Set<string>;
};

export const getVisibleFieldGroups = ({
  groups,
  hiddenGroupLabels,
  hiddenFieldKeys,
  placedFieldIds,
}: GetVisibleFieldGroupsOptions): HandlebarFieldGroup[] => {
  return groups
    .filter((group) => !hiddenGroupLabels.includes(group.label))
    .map((group) => ({
      ...group,
      fields: group.fields.filter(
        (field) =>
          !hiddenFieldKeys.includes(field.id) && !placedFieldIds.has(field.id),
      ),
    }))
    .filter((group) => group.fields.length > 0);
};
