import { Autocomplete, AutocompleteItem } from "@heroui/react";

type BatchOption = {
  id: string;
  batch: string | null;
  expiry: string;
  quantity: number;
};

type SearchableBatchSelectProps = {
  batches: BatchOption[];
  selectedBatchId: string;
  selectedBatchIdsForMedicine: string[];
  isFullstrip: boolean;
  packOf: number | null;
  onChange: (batchId: string) => void;
  formatExpiryDate: (dateString?: string | null) => string;
  parseNumber: (value: unknown) => number;
};

const SearchableBatchSelect = ({
  batches,
  selectedBatchId,
  selectedBatchIdsForMedicine,
  isFullstrip,
  packOf,
  onChange,
  formatExpiryDate,
  parseNumber,
}: SearchableBatchSelectProps) => {
  const availableBatches = batches
    .filter((batch) => {
      if (isFullstrip && packOf) {
        return parseNumber(batch.quantity) >= packOf;
      }
      return true;
    })
    .filter(
      (batch) =>
        !selectedBatchIdsForMedicine.includes(batch.id) ||
        batch.id === selectedBatchId,
    );

  return (
    <Autocomplete
      aria-label="Search and select batch"
      size="sm"
      selectedKey={selectedBatchId}
      isClearable={false}
      allowsCustomValue={false}
      menuTrigger="focus"
      onSelectionChange={(key) => {
        if (!key) return;
        onChange(String(key));
      }}
      classNames={{
        base: "w-full",
        selectorButton: "text-slate-500 dark:text-white",
        listboxWrapper: "max-h-72",
      }}
      inputProps={{
        classNames: {
          inputWrapper:
            "h-9 rounded-lg border border-slate-200 dark:border-[#273244]",
          input: "text-[13px] text-slate-700 dark:text-white",
        },
      }}
      listboxProps={{
        emptyContent: "No batches found",
      }}
    >
      {availableBatches.map((batch) => {
        const batchName = batch.batch || "No Batch";
        const expiryDate = formatExpiryDate(batch.expiry) || "-";

        return (
          <AutocompleteItem
            key={batch.id}
            textValue={`${batchName}`}
          >
            <div className="flex flex-col py-1">
              <span className="font-medium text-[13px] text-slate-900 dark:text-white">
                {batchName}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-white">
                Qty: {batch.quantity}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-white">
                Exp: {expiryDate}
              </span>
            </div>
          </AutocompleteItem>
        );
      })}
    </Autocomplete>
  );
};

export default SearchableBatchSelect;
