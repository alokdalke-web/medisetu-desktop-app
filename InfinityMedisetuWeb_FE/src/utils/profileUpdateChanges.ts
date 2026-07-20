type RecordLike = Record<string, any>;

const ID_KEYS = new Set(["id", "_id", "dbId"]);

const FIELD_ALIASES: Record<string, string[]> = {
  boardOrUniversity: ["boardOrUniversity", "boardUniversity"],
  boardUniversity: ["boardUniversity", "boardOrUniversity"],
  speciality: ["speciality", "specialization"],
  specialization: ["specialization", "speciality"],
};

export const normalizeProfileUpdateValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";

  return String(value).trim();
};

export const areProfileUpdateValuesEqual = (
  left: unknown,
  right: unknown,
) => normalizeProfileUpdateValue(left) === normalizeProfileUpdateValue(right);

export const getProfileUpdateFieldValue = (
  source: unknown,
  field: string,
) => {
  const record = source as RecordLike | null | undefined;
  if (!record) return undefined;

  const aliases = FIELD_ALIASES[field] ?? [field];
  const alias = aliases.find((candidate) => candidate in record);

  return alias ? record[alias] : undefined;
};

export const pickChangedProfileFields = <T extends RecordLike>(
  candidate: T,
  current?: unknown,
): Partial<T> =>
  Object.fromEntries(
    Object.entries(candidate).filter(
      ([field, value]) =>
        !areProfileUpdateValuesEqual(
          value,
          getProfileUpdateFieldValue(current, field),
        ),
    ),
  ) as Partial<T>;

const getQualificationId = (qualification: unknown) => {
  const record = qualification as RecordLike | null | undefined;
  if (!record) return "";

  return normalizeProfileUpdateValue(record.id ?? record._id ?? record.dbId);
};

export const getMatchingQualification = (
  qualification: unknown,
  currentQualifications?: unknown[] | null,
  index = 0,
) => {
  const current = Array.isArray(currentQualifications)
    ? currentQualifications
    : [];
  const qualificationId = getQualificationId(qualification);

  if (qualificationId) {
    const byId = current.find(
      (item) => getQualificationId(item) === qualificationId,
    );
    if (byId) return byId;
  }

  return current[index];
};

export const getChangedQualificationKeys = (
  qualification: unknown,
  currentQualifications?: unknown[] | null,
  index = 0,
) => {
  const record = qualification as RecordLike | null | undefined;
  if (!record) return [];

  const fields = Object.keys(record).filter((field) => !ID_KEYS.has(field));
  const current = getMatchingQualification(record, currentQualifications, index);

  if (!current) return fields;

  return fields.filter(
    (field) =>
      !areProfileUpdateValuesEqual(
        record[field],
        getProfileUpdateFieldValue(current, field),
      ),
  );
};

export const filterChangedQualifications = <T extends RecordLike>(
  qualifications?: T[] | null,
  currentQualifications?: unknown[] | null,
) => {
  if (!Array.isArray(qualifications)) return undefined;

  return qualifications.filter(
    (qualification, index) =>
      getChangedQualificationKeys(
        qualification,
        currentQualifications,
        index,
      ).length > 0,
  );
};
