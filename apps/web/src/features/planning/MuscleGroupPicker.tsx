import { useId } from "react";
import type { MuscleGroup } from "@gym-tracking/contracts";

import { useI18n } from "../../i18n/i18n-context.js";
import { MUSCLE_LABELS, optionEntries } from "./planning-labels.js";

const MAX_MUSCLE_GROUPS = 5;
const MUSCLE_OPTIONS = optionEntries(MUSCLE_LABELS);

interface MuscleGroupPickerProps {
  hasError: boolean;
  onChange: (groups: MuscleGroup[]) => void;
  selected: MuscleGroup[];
}

export function MuscleGroupPicker({ hasError, onChange, selected }: MuscleGroupPickerProps) {
  const { t } = useI18n();
  const hintId = useId();
  const countId = useId();
  const errorId = useId();
  const describedBy = `${hintId} ${countId}${hasError ? ` ${errorId}` : ""}`;

  function toggle(group: MuscleGroup) {
    if (selected.includes(group)) {
      onChange(selected.filter((value) => value !== group));
      return;
    }
    if (selected.length < MAX_MUSCLE_GROUPS) {
      onChange([...selected, group]);
    }
  }

  return (
    <fieldset
      aria-describedby={describedBy}
      aria-invalid={hasError || undefined}
      className="muscle-group-fieldset"
    >
      <legend>{t("planning", "muscleGroups")}</legend>
      <p className="helper-text" id={hintId}>
        {t("planning", "muscleGroupsHint")}
      </p>
      <div className="muscle-group-options">
        {MUSCLE_OPTIONS.map(([value, label]) => {
          const isSelected = selected.includes(value);
          const isDisabled = !isSelected && selected.length >= MAX_MUSCLE_GROUPS;
          return (
            <label
              className={[
                "muscle-group-option",
                isSelected ? "muscle-group-option-selected" : "",
                isDisabled ? "muscle-group-option-disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={value}
            >
              <input
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggle(value)}
                type="checkbox"
              />
              <span>{t("planning", label)}</span>
            </label>
          );
        })}
      </div>
      <small aria-live="polite" id={countId}>
        {selected.length}/{MAX_MUSCLE_GROUPS} {t("planning", "muscleGroupsSelected")}
      </small>
      {hasError ? (
        <p className="form-error" id={errorId} role="alert">
          {t("planning", "muscleGroupsRequired")}
        </p>
      ) : null}
    </fieldset>
  );
}
