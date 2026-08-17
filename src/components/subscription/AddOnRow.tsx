import { Checkbox } from "@heroui/react";
import { FiMinus, FiPlus } from "react-icons/fi";
import type { AddOn } from "../../redux/api/subscriptionApi";

interface AddOnRowProps {
  addOn: AddOn;
  quantity: number;
  /** Cycle-adjusted unit price to display. */
  unitPrice: number;
  priceSuffix: string;
  onChange: (quantity: number) => void;
  isDisabled?: boolean;
}

const AddOnRow = ({
  addOn,
  quantity,
  unitPrice,
  priceSuffix,
  onChange,
  isDisabled: externalIsDisabled,
}: AddOnRowProps) => {
  const max = addOn.maxQuantity ?? 100;
  const isDisabled = max === 0 || externalIsDisabled;
  const selected = quantity > 0;

  const setQty = (next: number) => {
    if (isDisabled) return;
    onChange(Math.min(max, Math.max(0, next)));
  };

  return (
    <div className={`flex items-center justify-between gap-3 py-3 ${isDisabled ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          isSelected={selected}
          onValueChange={(checked) => setQty(checked ? 1 : 0)}
          size="sm"
          isDisabled={isDisabled}
        />
        <div>
          <p className="text-sm font-medium text-default-900">
            {addOn.name}
            {isDisabled && <span className="ml-1.5 text-[11px] font-normal text-default-400">(Coming Soon)</span>}
          </p>
          <p className="text-xs text-default-400">
            ₹{(unitPrice ?? 0).toLocaleString("en-IN")} {priceSuffix}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${addOn.name}`}
          onClick={() => setQty(quantity - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-default-200 text-default-600 hover:bg-default-100 disabled:opacity-40"
          disabled={quantity <= 0 || isDisabled}
        >
          <FiMinus className="text-xs" />
        </button>
        <span className="w-5 text-center text-sm font-medium text-default-900">
          {quantity}
        </span>
        <button
          type="button"
          aria-label={`Increase ${addOn.name}`}
          onClick={() => setQty(quantity + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-default-200 text-default-600 hover:bg-default-100 disabled:opacity-40"
          disabled={quantity >= max || isDisabled}
        >
          <FiPlus className="text-xs" />
        </button>
      </div>
    </div>
  );
};

export default AddOnRow;
