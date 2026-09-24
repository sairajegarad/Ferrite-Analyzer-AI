import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { Analysis, AuditEvent, Field, SampleMetadata } from "../core/types";
import { newId, nowIso } from "../core/id";
import {
  DEFAULT_PREFS,
  loadPrefs,
  savePrefs,
  saveAnalysis,
  loadAllAnalyses,
  deleteAnalysis as dbDeleteAnalysis,
  type Prefs,
  type StoredValidationRun,
  loadAllValidationRuns,
  saveValidationRun as dbSaveValidationRun,
} from "../project/storage";

export type ViewId =
  | "home"
  | "new-analysis"
  | "analyze"
  | "fields"
  | "results"
  | "reports"
  | "validation"
  | "history"
  | "methodology"
  | "jury"
  | "settings";

interface AppState {
  prefs: Prefs;
  currentAnalysis: Analysis | null;
  history: Analysis[];
  validationRuns: StoredValidationRun[];
  view: ViewId;
  wizardStep: number;
  loaded: boolean;
}

type Action =
  | { type: "HYDRATE"; prefs: Prefs; history: Analysis[]; validationRuns: StoredValidationRun[] }
  | { type: "SET_PREFS"; prefs: Partial<Prefs> }
  | { type: "SET_VIEW"; view: ViewId }
  | { type: "SET_WIZARD_STEP"; step: number }
  | { type: "START_ANALYSIS"; analysis: Analysis }
  | { type: "UPDATE_SAMPLE"; sample: Partial<SampleMetadata> }
  | { type: "SET_PLANNING"; planning: Partial<Analysis["planning"]> }
  | { type: "UPSERT_FIELD"; field: Field; audit?: AuditEvent }
  | { type: "DELETE_FIELD"; fieldId: string }
  | { type: "ADD_AUDIT"; event: AuditEvent }
  | { type: "SET_ANALYSIS_FLAGS"; patch: Partial<Analysis> }
  | { type: "LOAD_ANALYSIS"; analysis: Analysis }
  | { type: "SET_HISTORY"; history: Analysis[] }
  | { type: "SET_VALIDATION_RUNS"; runs: StoredValidationRun[] }
  | { type: "NEW_BLANK" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, prefs: action.prefs, history: action.history, validationRuns: action.validationRuns, loaded: true };
    case "SET_PREFS":
      return { ...state, prefs: { ...state.prefs, ...action.prefs } };
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "SET_WIZARD_STEP":
      return { ...state, wizardStep: action.step };
    case "START_ANALYSIS":
      return { ...state, currentAnalysis: action.analysis, wizardStep: 1, view: "analyze" };
    case "UPDATE_SAMPLE": {
      if (!state.currentAnalysis) return state;
      return {
        ...state,
        currentAnalysis: {
          ...state.currentAnalysis,
          sample: { ...state.currentAnalysis.sample, ...action.sample },
          updatedAt: nowIso(),
        },
      };
    }
    case "SET_PLANNING": {
      if (!state.currentAnalysis) return state;
      return {
        ...state,
        currentAnalysis: {
          ...state.currentAnalysis,
          planning: { ...state.currentAnalysis.planning, ...action.planning },
        },
      };
    }
    case "UPSERT_FIELD": {
      if (!state.currentAnalysis) return state;
      const exists = state.currentAnalysis.fields.some((f) => f.id === action.field.id);
      const fields = exists
        ? state.currentAnalysis.fields.map((f) => (f.id === action.field.id ? action.field : f))
        : [...state.currentAnalysis.fields, action.field];
      const auditLog = action.audit ? [...state.currentAnalysis.auditLog, action.audit] : state.currentAnalysis.auditLog;
      return {
        ...state,
        currentAnalysis: {
          ...state.currentAnalysis,
          fields,
          auditLog,
          updatedAt: nowIso(),
          status: state.currentAnalysis.status === "draft" ? "in-progress" : state.currentAnalysis.status,
        },
      };
    }
    case "DELETE_FIELD": {
      if (!state.currentAnalysis) return state;
      return {
        ...state,
        currentAnalysis: {
          ...state.currentAnalysis,
          fields: state.currentAnalysis.fields.filter((f) => f.id !== action.fieldId),
          auditLog: [
            ...state.currentAnalysis.auditLog,
            {
              id: newId("audit"),
              timestamp: nowIso(),
              type: "field_deleted",
              description: `Field ${action.fieldId} deleted.`,
              entityId: action.fieldId,
            },
          ],
          updatedAt: nowIso(),
        },
      };
    }
    case "ADD_AUDIT": {
      if (!state.currentAnalysis) return state;
      return {
        ...state,
        currentAnalysis: { ...state.currentAnalysis, auditLog: [...state.currentAnalysis.auditLog, action.event] },
      };
    }
    case "SET_ANALYSIS_FLAGS": {
      if (!state.currentAnalysis) return state;
      return { ...state, currentAnalysis: { ...state.currentAnalysis, ...action.patch, updatedAt: nowIso() } };
    }
    case "LOAD_ANALYSIS":
      return { ...state, currentAnalysis: action.analysis, view: "results", wizardStep: 9 };
    case "SET_HISTORY":
      return { ...state, history: action.history };
    case "SET_VALIDATION_RUNS":
      return { ...state, validationRuns: action.runs };
    case "NEW_BLANK":
      return { ...state, currentAnalysis: null, view: "new-analysis", wizardStep: 0 };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  persistCurrent: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  deleteFromHistory: (id: string) => Promise<void>;
  addAudit: (type: string, description: string, extra?: Partial<AuditEvent>) => void;
  saveValidationRun: (run: StoredValidationRun) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    prefs: DEFAULT_PREFS,
    currentAnalysis: null,
    history: [],
    validationRuns: [],
    view: "home",
    wizardStep: 0,
    loaded: false,
  });

  useEffect(() => {
    (async () => {
      const prefs = loadPrefs();
      const history = await loadAllAnalyses().catch(() => []);
      const validationRuns = await loadAllValidationRuns().catch(() => []);
      dispatch({ type: "HYDRATE", prefs, history, validationRuns });
    })();
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    savePrefs(state.prefs);
    const root = document.documentElement;
    root.classList.toggle("light", state.prefs.theme === "light");
    root.classList.toggle("reduce-motion", state.prefs.reduceMotion);
  }, [state.prefs, state.loaded]);

  // autosave current analysis
  useEffect(() => {
    if (!state.currentAnalysis) return;
    const t = setTimeout(() => {
      saveAnalysis(state.currentAnalysis!).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [state.currentAnalysis]);

  const persistCurrent = async () => {
    if (state.currentAnalysis) {
      await saveAnalysis(state.currentAnalysis);
      await refreshHistory();
    }
  };

  const refreshHistory = async () => {
    const history = await loadAllAnalyses().catch(() => []);
    dispatch({ type: "SET_HISTORY", history });
  };

  const deleteFromHistory = async (id: string) => {
    await dbDeleteAnalysis(id);
    await refreshHistory();
  };

  const addAudit = (type: string, description: string, extra?: Partial<AuditEvent>) => {
    dispatch({
      type: "ADD_AUDIT",
      event: { id: newId("audit"), timestamp: nowIso(), type, description, ...extra },
    });
  };

  const saveValidationRunFn = async (run: StoredValidationRun) => {
    await dbSaveValidationRun(run);
    const runs = await loadAllValidationRuns().catch(() => []);
    dispatch({ type: "SET_VALIDATION_RUNS", runs });
  };

  const value = useMemo(
    () => ({ state, dispatch, persistCurrent, refreshHistory, deleteFromHistory, addAudit, saveValidationRun: saveValidationRunFn }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
