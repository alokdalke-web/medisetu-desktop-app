export type PreferenceState = {
  headerOrder: string[];
  habitList: string[];
  surgerySuggestedList: string[];
  allergyList: string[];
  diagnosisList: string[];
  dietarySuggestionsList: string[];
};

export type ListSectionKey =
  | "habitList"
  | "surgerySuggestedList"
  | "allergyList"
  | "diagnosisList"
  | "dietarySuggestionsList";
