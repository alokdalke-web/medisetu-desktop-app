export const phoneValidation = {
  required: "Mobile number is required",
  pattern: {
    value: /^[6-9]\d{9}$/,
    message: "Invalid number.",
  },
};

export const optionalPhoneValidation = {
  pattern: {
    value: /^[6-9]\d{9}$/,
    message: "Invalid number.",
  },
  validate: (val: string) => {
    if (!val) return true;
    return /^[6-9]\d{9}$/.test(val) || "Invalid number.";
  },
};
