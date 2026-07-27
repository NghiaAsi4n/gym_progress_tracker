import type {
  Equipment,
  ExerciseSuggestion,
  MovementPattern,
  TrainingPlan,
} from "@gym-tracking/contracts";

export interface SuggestionCandidate {
  id: string;
  name: string;
  movementPattern?: MovementPattern | undefined;
  equipment?: Equipment | undefined;
  difficulty?: TrainingPlan["experienceLevel"] | undefined;
}

interface CompleteSuggestionCandidate extends SuggestionCandidate {
  movementPattern: MovementPattern;
  equipment: Equipment;
  difficulty: TrainingPlan["experienceLevel"];
}

export function buildExerciseSuggestions({
  availableEquipment,
  candidates,
  existingExerciseIds,
  existingPatterns,
  goal,
  suggestedDay,
  suggestedTemplateId,
}: {
  availableEquipment: Equipment[];
  candidates: SuggestionCandidate[];
  existingExerciseIds: string[];
  existingPatterns: MovementPattern[];
  goal: TrainingPlan["goal"];
  suggestedDay: string | null;
  suggestedTemplateId: string | null;
}): ExerciseSuggestion[] {
  const allowedEquipment = new Set(availableEquipment);
  const existingIds = new Set(existingExerciseIds);
  const coveredPatterns = new Set(existingPatterns);
  const goalEquipment = {
    STRENGTH: new Set<Equipment>(["BARBELL", "DUMBBELL"]),
    HYPERTROPHY: new Set<Equipment>(["DUMBBELL", "CABLE", "MACHINE"]),
    FAT_LOSS: new Set<Equipment>(["BODYWEIGHT", "KETTLEBELL"]),
    GENERAL: new Set<Equipment>(["BODYWEIGHT", "DUMBBELL"]),
  }[goal];

  return candidates
    .filter(
      (candidate): candidate is CompleteSuggestionCandidate =>
        Boolean(candidate.movementPattern && candidate.equipment && candidate.difficulty) &&
        !existingIds.has(candidate.id) &&
        allowedEquipment.has(candidate.equipment as Equipment) &&
        !coveredPatterns.has(candidate.movementPattern as MovementPattern),
    )
    .sort((left, right) => {
      const goalDifference =
        Number(goalEquipment.has(right.equipment)) - Number(goalEquipment.has(left.equipment));
      return (
        goalDifference ||
        left.movementPattern.localeCompare(right.movementPattern) ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id)
      );
    })
    .slice(0, 8)
    .map((candidate) => ({
      exerciseId: candidate.id,
      exerciseName: candidate.name,
      reasonCode: "MISSING_MOVEMENT_PATTERN",
      reasonParams: { movementPattern: candidate.movementPattern, goal },
      suggestedTemplateId,
      suggestedDay,
    }));
}
