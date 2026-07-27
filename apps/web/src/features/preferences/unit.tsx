/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UnitPreference = "KG" | "LB";
const STORAGE_KEY = "gym-tracking.unit";

function readUnit(): UnitPreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "LB" ? "LB" : "KG";
  } catch {
    return "KG";
  }
}

interface UnitContextValue {
  unit: UnitPreference;
  setUnit: (unit: UnitPreference) => void;
}

const UnitContext = createContext<UnitContextValue | null>(null);

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<UnitPreference>(readUnit);
  const setUnit = useCallback((nextUnit: UnitPreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, nextUnit);
    } catch {
      /* session fallback */
    }
    setUnitState(nextUnit);
  }, []);
  const value = useMemo(() => ({ unit, setUnit }), [unit, setUnit]);
  return <UnitContext value={value}>{children}</UnitContext>;
}

export function useUnit(): UnitContextValue {
  const value = useContext(UnitContext);
  if (!value) throw new Error("useUnit must be used within UnitProvider");
  return value;
}

export function UnitSwitcher({ label }: { label: string }) {
  const { unit, setUnit } = useUnit();
  return (
    <label className="unit-switcher">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={unit}
        onChange={(event) => setUnit(event.target.value as UnitPreference)}
      >
        <option value="KG">kg</option>
        <option value="LB">lb</option>
      </select>
    </label>
  );
}
