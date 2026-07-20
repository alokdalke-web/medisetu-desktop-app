import React from "react";

import {
  useCreateClinicSymptomMutation,
  useLazyGetClinicSymptomsQuery,
} from "../../../../redux/api/doctorApi";
import {
  isDuplicateSymptomName,
  mkSymptom,
  normalizeClinicSymptoms,
  normalizeSymptomText,
} from "../helpers/symptomHelpers";
import type {
  AppointmentDraft,
  ClinicSymptomItem,
  SymptomDraft,
} from "../types";

type UseAppointmentSymptomsParams = {
  restoredDraft: AppointmentDraft | null;
  toastInfo: (title: string, desc: string) => void;
};

const useAppointmentSymptoms = ({
  restoredDraft,
  toastInfo,
}: UseAppointmentSymptomsParams) => {
  const [activeSymptomIndex, setActiveSymptomIndex] = React.useState(-1);

  const [symptoms, setSymptoms] = React.useState<SymptomDraft[]>(() => {
    if (Array.isArray(restoredDraft?.symptoms) && restoredDraft!.symptoms.length) {
      return restoredDraft!.symptoms;
    }
    return [mkSymptom("")];
  });

  const updateSymptomName = (id: string, value: string) => {
    setSymptoms((prev) => prev.map((s) => (s.id === id ? { ...s, name: value } : s)));
  };

  const [openSymptomId, setOpenSymptomId] = React.useState<string | null>(null);
  const [suggestionsById, setSuggestionsById] = React.useState<Record<string, ClinicSymptomItem[]>>({});
  const [loadingById, setLoadingById] = React.useState<Record<string, boolean>>({});

  const removeSymptom = (id: string) => {
    setSymptoms((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.id !== id);
    });
    setSuggestionsById((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setLoadingById((prev) => { const next = { ...prev }; delete next[id]; return next; });
    if (openSymptomId === id) setOpenSymptomId(null);
  };

  const [createClinicSymptom] = useCreateClinicSymptomMutation();

  const syncClinicSymptoms = async (drafts: SymptomDraft[]) => {
    const results: string[] = [];
    const toCreate: SymptomDraft[] = [];

    for (const s of drafts) {
      const name = s.name.trim();
      if (!name) continue;
      if (s.clinicSymptomId) results.push(s.clinicSymptomId);
      else toCreate.push(s);
    }

    if (toCreate.length === 0) return { ids: results, ok: 0, failed: 0, total: 0 };

    const isAlreadyExists = (err: any) => {
      const msg = String(err?.data?.message ?? err?.message ?? "").toLowerCase();
      const st = String(err?.status ?? err?.data?.status ?? "");
      return st === "409" || msg.includes("already");
    };

    const creationResults = await Promise.allSettled(
      toCreate.map(async (s) => {
        try {
          const resp: any = await createClinicSymptom({
            name: s.name,
            description: `Symptom: ${s.name}`,
            status: "Active",
          }).unwrap();
          if (resp?.success === false) throw resp;
          const newId = String(resp?.result?.id ?? resp?.result?._id ?? "");
          return { ok: true, id: newId };
        } catch (err: any) {
          if (isAlreadyExists(err)) return { ok: true, skipped: true };
          return { ok: false, err };
        }
      }),
    );

    let ok = 0;
    let failed = 0;
    creationResults.forEach((r) => {
      if (r.status === "fulfilled") {
        if ((r.value as any)?.ok) { ok += 1; if ((r.value as any).id) results.push((r.value as any).id); }
        else failed += 1;
      } else failed += 1;
    });

    return { ids: results, ok, failed, total: toCreate.length };
  };

  const symptomsBoxRef = React.useRef<HTMLDivElement | null>(null);
  const seqRef = React.useRef<Record<string, number>>({});
  const lastQueryRef = React.useRef<Record<string, string>>({});
  const defaultLoadedRef = React.useRef<Record<string, boolean>>({});
  const defaultSuggestionsCache = React.useRef<ClinicSymptomItem[] | null>(null);
  const [triggerGetClinicSymptoms] = useLazyGetClinicSymptomsQuery();

  const loadDefaultSymptoms = React.useCallback(
    async (symptomId: string) => {
      if (defaultSuggestionsCache.current !== null) {
        setSuggestionsById((prev) => ({
          ...prev,
          [symptomId]: defaultSuggestionsCache.current!,
        }));
        setOpenSymptomId(symptomId);
        return;
      }

      if (defaultLoadedRef.current[symptomId]) return;
      defaultLoadedRef.current[symptomId] = true;

      seqRef.current[symptomId] = (seqRef.current[symptomId] ?? 0) + 1;
      const seq = seqRef.current[symptomId];

      setLoadingById((prev) => ({ ...prev, [symptomId]: true }));
      setOpenSymptomId(symptomId);

      try {
        const resp = await triggerGetClinicSymptoms("", true).unwrap();
        if (seqRef.current[symptomId] !== seq) return;
        const list = normalizeClinicSymptoms(resp);
        defaultSuggestionsCache.current = list;
        setSuggestionsById((prev) => ({ ...prev, [symptomId]: list }));
      } catch {
        if (seqRef.current[symptomId] !== seq) return;
        defaultLoadedRef.current[symptomId] = false; // allow retry on error
        setSuggestionsById((prev) => ({ ...prev, [symptomId]: [] }));
      } finally {
        if (seqRef.current[symptomId] !== seq) return;
        setLoadingById((prev) => ({ ...prev, [symptomId]: false }));
      }
    },
    [triggerGetClinicSymptoms],
  );

  const handleSymptomSearch = React.useCallback(
    async (symptomId: string, q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;

      if (lastQueryRef.current[symptomId] === trimmed) return;
      lastQueryRef.current[symptomId] = trimmed;

      seqRef.current[symptomId] = (seqRef.current[symptomId] ?? 0) + 1;
      const seq = seqRef.current[symptomId];

      setLoadingById((prev) => ({ ...prev, [symptomId]: true }));
      setOpenSymptomId(symptomId);

      try {
        const resp = await triggerGetClinicSymptoms(trimmed).unwrap();
        if (seqRef.current[symptomId] !== seq) return;

        const list = normalizeClinicSymptoms(resp);

        const filteredList = list.filter((item) => {
          const itemName = String(item?.name ?? "").trim();
          return !symptoms.some(
            (s) => s.id !== symptomId && normalizeSymptomText(s.name) === normalizeSymptomText(itemName),
          );
        });

        setSuggestionsById((prev) => ({ ...prev, [symptomId]: filteredList }));
      } catch {
        if (seqRef.current[symptomId] !== seq) return;
        setSuggestionsById((prev) => ({ ...prev, [symptomId]: [] }));
      } finally {
        if (seqRef.current[symptomId] !== seq) return;
        setLoadingById((prev) => ({ ...prev, [symptomId]: false }));
      }
    },
    [triggerGetClinicSymptoms, symptoms],
  );

  const selectSuggestion = (symptomId: string, item: ClinicSymptomItem) => {
    const name = String(item?.name ?? "").trim();
    const cid = String(item?.id ?? item?._id ?? "").trim();
    if (!name) return;

    let duplicateFound = false;

    setSymptoms((prev) => {
      if (isDuplicateSymptomName(prev, name, symptomId)) {
        duplicateFound = true;
        return prev;
      }
      return prev.map((s) => s.id === symptomId ? { ...s, name, clinicSymptomId: cid } : s);
    });

    if (duplicateFound) {
      toastInfo("Duplicate symptom", `"${name}" is already added.`);
    }

    setOpenSymptomId(null);
    setActiveSymptomIndex(-1);
    setSuggestionsById((prev) => ({ ...prev, [symptomId]: [] }));
    setLoadingById((prev) => ({ ...prev, [symptomId]: false }));
    lastQueryRef.current[symptomId] = name;
  };


  const MAX_SYMPTOMS = 10;
  const symptomRow = symptoms[0] ?? null;
  const symptomChips = symptoms.slice(1).filter((s) => String(s?.name ?? "").trim());
  const symptomChipCount = symptomChips.length;
  const symptomLimitReached = symptomChipCount >= MAX_SYMPTOMS;

  const showSymptomLimitToast = () =>
    toastInfo("Limit reached", `You can add maximum ${MAX_SYMPTOMS} symptoms.`);

  const moveFirstSymptomToChip = () => {
    setSymptoms((prev) => {
      const first = prev[0];
      const firstName = String(first?.name ?? "").trim();
      if (!firstName) return prev;
      const currentCount = prev.slice(1).filter((s) => String(s?.name ?? "").trim()).length;
      if (currentCount >= MAX_SYMPTOMS) return prev;
      return [mkSymptom(""), first, ...prev.slice(1)];
    });
  };

  const commitSymptomInputToChip = () => {
    if (!symptomRow) return;

    if (symptomLimitReached) { showSymptomLimitToast(); return; }

    const nameNow = String(symptomRow?.name ?? "").trim();

    if (!nameNow) {
      setOpenSymptomId(null);
      setActiveSymptomIndex(-1);
      setSuggestionsById((prev) => ({ ...prev, [symptomRow.id]: [] }));
      setLoadingById((prev) => ({ ...prev, [symptomRow.id]: false }));
      lastQueryRef.current[symptomRow.id] = "";
      return;
    }
    if (isDuplicateSymptomName(symptoms, nameNow, symptomRow.id)) {
      toastInfo("Duplicate symptom", `"${nameNow}" is already added.`);
      setOpenSymptomId(null);
      setActiveSymptomIndex(-1);
      setSuggestionsById((prev) => ({ ...prev, [symptomRow.id]: [] }));
      setLoadingById((prev) => ({ ...prev, [symptomRow.id]: false }));
      lastQueryRef.current[symptomRow.id] = "";
      return;
    }

    setSymptoms((prev) => {
      const first = prev[0];
      const name = String(first?.name ?? "").trim();
      if (!name) return prev;
      const currentCount = prev.slice(1).filter((s) => String(s?.name ?? "").trim()).length;
      if (currentCount >= MAX_SYMPTOMS) return prev;
      return [mkSymptom(""), { ...first, name }, ...prev.slice(1)];
    });

    setOpenSymptomId(null);
    setActiveSymptomIndex(-1);
    setSuggestionsById((prev) => ({ ...prev, [symptomRow.id]: [] }));
    setLoadingById((prev) => ({ ...prev, [symptomRow.id]: false }));
    lastQueryRef.current[symptomRow.id] = "";
  };

  return {
    symptoms,
    setSymptoms,
    activeSymptomIndex,
    setActiveSymptomIndex,
    updateSymptomName,
    openSymptomId,
    setOpenSymptomId,
    suggestionsById,
    setSuggestionsById,
    loadingById,
    setLoadingById,
    removeSymptom,
    syncClinicSymptoms,
    symptomsBoxRef,
    loadDefaultSymptoms,
    handleSymptomSearch,
    selectSuggestion,
    MAX_SYMPTOMS,
    symptomRow,
    symptomChips,
    symptomChipCount,
    symptomLimitReached,
    showSymptomLimitToast,
    moveFirstSymptomToChip,
    commitSymptomInputToChip,
  };
};

export default useAppointmentSymptoms;
