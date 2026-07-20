import { Input } from "@heroui/react";
import React from "react";
import { Controller, type Control, type FieldValues } from "react-hook-form";
import { FaRupeeSign } from "react-icons/fa";
import { FiClock, FiCreditCard, FiSend } from "react-icons/fi";

type PaymentOption = {
  label: string;
  value: string;
};

type PaymentSectionProps = {
  rhfControl: Control<FieldValues, FieldValues>;
  paymentFieldRef: React.RefObject<HTMLDivElement | null>;
  paymentModeOptions: PaymentOption[];
  isServiceSelected: boolean;
  isServiceCoveredForSelectedDate: boolean;
  isFreeConsultationService: boolean;
  formErrors: any;
  getInitialPaymentTabIndex: (
    value: string,
    idx: number,
    disablePayment: boolean,
    selectedValue: string,
  ) => number;
  onPaymentSelect: (onChange: (value: string) => void, value: string) => void;
  onPaymentKeyDown: (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
    value: string,
    disablePayment: boolean,
    onChange: (value: string) => void,
  ) => void;
  onPaymentNotesKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  jiggleKey: string;
  amountText?: string;
};

const MAX_PAYMENT_NOTE_WORDS = 15;
const MAX_PAYMENT_NOTE_CHARACTERS = 40;
const getLimitedPaymentNote = (value: string) => {
  const limitedByCharacters = value.slice(0, MAX_PAYMENT_NOTE_CHARACTERS);

  const words = limitedByCharacters.trim().split(/\s+/).filter(Boolean);

  if (words.length <= MAX_PAYMENT_NOTE_WORDS) {
    return limitedByCharacters;
  }

  return words.slice(0, MAX_PAYMENT_NOTE_WORDS).join(" ");
};

const PaymentSection: React.FC<PaymentSectionProps> = ({
  rhfControl,
  paymentFieldRef,
  paymentModeOptions,
  isServiceSelected,
  isServiceCoveredForSelectedDate,
  isFreeConsultationService,
  formErrors,
  getInitialPaymentTabIndex,
  onPaymentSelect,
  onPaymentKeyDown,
  onPaymentNotesKeyDown,
  jiggleKey,
}) => {
  const getPaymentIcon = (value: string) => {
    if (value === "Cash") return <FaRupeeSign className="h-3 w-3" />;
    if (value === "UPI") return <FiSend className="h-4 w-4" />;
    if (value === "Card") return <FiCreditCard className="h-4 w-4" />;
    return <FiClock className="h-4 w-4" />;
  };

  return (
    <div
      ref={paymentFieldRef}
      className={[
        "min-w-0",
        jiggleKey === "paymentMode" ? "jiggle-anim" : "",
      ].join(" ")}
    >
      <label className="mb-1 block text-sm font-semibold text-slate-900 dark:text-white">
        Select Payment Mode
      </label>

      <Controller
        control={rhfControl}
        name="paymentMode"
        render={({ field }) => {
          const disablePayment =
            !isServiceSelected ||
            isServiceCoveredForSelectedDate ||
            isFreeConsultationService;

          const selectedValue = String(field.value ?? "");
          const showPaymentNote =
            selectedValue === "UPI" || selectedValue === "Card";

          return (
            <>
              <div
                role="radiogroup"
                aria-label="Select Payment Mode"
                aria-disabled={disablePayment}
                className={disablePayment ? "opacity-70" : ""}
              >
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {paymentModeOptions.map(
                    (opt: PaymentOption, idx: number) => {
                      const value = String(opt.value);
                      const checked = selectedValue === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          aria-label={String(opt.label)}
                          data-payment-option="true"
                          disabled={disablePayment}
                          tabIndex={getInitialPaymentTabIndex(
                            value,
                            idx,
                            disablePayment,
                            selectedValue,
                          )}
                          onClick={() =>
                            onPaymentSelect(field.onChange, value)
                          }
                          onKeyDown={(e) =>
                            onPaymentKeyDown(
                              e,
                              idx,
                              value,
                              disablePayment,
                              field.onChange,
                            )
                          }
                          className={[
                            "m-0 inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg border px-3 py-1 text-center",
                            "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#38445a] dark:bg-[#0f1728] dark:text-slate-200 dark:hover:bg-[#1a2535]",
                            checked
                              ? "border-teal-600 bg-teal-50 text-primary shadow-sm dark:border-[#46beae] dark:bg-[#1a3a35] dark:text-[#9be7dc]"
                              : "",
                            disablePayment
                              ? "cursor-not-allowed"
                              : "cursor-pointer",
                          ].join(" ")}
                        >
                          <span className="shrink-0">
                            {getPaymentIcon(value)}
                          </span>
                          <span className="text-[13px] font-semibold">
                            {opt.label}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Payment notes — animates in/out without layout shift */}
              <div
                className="overflow-hidden transition-all duration-200 ease-in-out"
                style={{ maxHeight: showPaymentNote ? '120px' : '0px' }}
              >
                <Controller
                  control={rhfControl}
                  name="paymentNotes"
                  render={({ field: noteField }) => {
                    const noteValue = String(noteField.value ?? "");
                    const noteWords = noteValue.trim().split(/\s+/).filter(Boolean);
                    return (
                      <div className="mt-3 w-full sm:max-w-[300px]">
                        <Input
                          {...noteField}
                          name="paymentNotes"
                          label="Payment Notes (Optional)"
                          onKeyDown={showPaymentNote ? onPaymentNotesKeyDown : undefined}
                          placeholder="Ex. Transaction ID"
                          variant="bordered"
                          radius="lg"
                          maxLength={MAX_PAYMENT_NOTE_CHARACTERS}
                          description={`${noteWords.length}/${MAX_PAYMENT_NOTE_WORDS} words, max ${MAX_PAYMENT_NOTE_CHARACTERS} characters`}
                          classNames={{
                            inputWrapper: "min-h-10 rounded-xl border-slate-200 dark:border-[#38445a]",
                            description: "text-[11px] text-slate-500 dark:text-slate-400",
                          }}
                          value={noteValue}
                          onChange={(e) => noteField.onChange(getLimitedPaymentNote(e.target.value))}
                        />
                      </div>
                    );
                  }}
                />
              </div>

              {!!formErrors?.paymentMode?.message && (
                <p className="mt-1 text-[12px] text-rose-600 dark:text-rose-400">
                  {String(formErrors.paymentMode.message)}
                </p>
              )}

              {isServiceSelected && isFreeConsultationService && (
                <p className="mt-1 text-[12px] text-emerald-700 dark:text-emerald-300">
                  This service is free, so payment mode is not required.
                </p>
              )}

              {isServiceSelected &&
                !isFreeConsultationService &&
                isServiceCoveredForSelectedDate && (
                  <p className="mt-1 text-[12px] text-emerald-700 dark:text-emerald-300">
                    Service is already covered for the selected date, so payment
                    mode is not required.
                  </p>
                )}
            </>
          );
        }}
      />
    </div>
  );
};

export default PaymentSection;
