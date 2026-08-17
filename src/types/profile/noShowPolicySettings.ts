export type NoShowAction = "warning" | "penalty" | "advance_required" | "blocked";
export type ActionKey = NoShowAction;

export type ActionMeta = {
  color: string;
  bg: string;
  message: string;
};

export type BaseRule = { count: number; label: string; display: string };
export type Rule = BaseRule & { action: ActionKey; penaltyAmount: number | string };

export type ActionDropdownProps = {
  value: ActionKey;
  options: Array<{
    value: ActionKey;
    label: string;
    disabled?: boolean;
  }>;
  onChange: (value: ActionKey) => void;
};
