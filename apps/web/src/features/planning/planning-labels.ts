import type {
  Difficulty,
  Equipment,
  MovementPattern,
  MuscleGroup,
  TrainingPlan,
} from "@gym-tracking/contracts";

import type { TranslationFunction } from "../../i18n/i18n-context.js";
import type { TranslationKey } from "../../i18n/resources.js";

type PlanningKey = TranslationKey<"planning">;
type TrainingGoal = TrainingPlan["goal"];

export function optionEntries<Option extends string>(
  labels: Record<Option, PlanningKey>,
): Array<[Option, PlanningKey]> {
  return Object.entries(labels) as Array<[Option, PlanningKey]>;
}

export function translatePlanningValue<Option extends string>(
  value: string | number | undefined,
  labels: Record<Option, PlanningKey>,
  t: TranslationFunction,
): string {
  if (typeof value !== "string" || !Object.hasOwn(labels, value)) return "—";
  return t("planning", labels[value as Option]);
}

export const MUSCLE_LABELS = {
  CHEST: "muscleChest",
  BACK: "muscleBack",
  LEGS: "muscleLegs",
  CORE: "muscleCore",
  SHOULDERS: "muscleShoulders",
  BICEPS: "muscleBiceps",
  TRICEPS: "muscleTriceps",
  GLUTES: "muscleGlutes",
  CALVES: "muscleCalves",
  FOREARMS: "muscleForearms",
  FULL_BODY: "muscleFullBody",
} satisfies Record<MuscleGroup, PlanningKey>;

export const MOVEMENT_LABELS = {
  PUSH: "movementPush",
  PULL: "movementPull",
  HINGE: "movementHinge",
  SQUAT: "movementSquat",
  CARRY: "movementCarry",
  ROTATION: "movementRotation",
  ISOLATION: "movementIsolation",
} satisfies Record<MovementPattern, PlanningKey>;

export const EQUIPMENT_LABELS = {
  BODYWEIGHT: "equipmentBodyweight",
  BARBELL: "equipmentBarbell",
  DUMBBELL: "equipmentDumbbell",
  CABLE: "equipmentCable",
  MACHINE: "equipmentMachine",
  RESISTANCE_BAND: "equipmentResistanceBand",
  KETTLEBELL: "equipmentKettlebell",
  SMITH_MACHINE: "equipmentSmithMachine",
  OTHER: "equipmentOther",
} satisfies Record<Equipment, PlanningKey>;

export const DIFFICULTY_LABELS = {
  BEGINNER: "difficultyBeginner",
  INTERMEDIATE: "difficultyIntermediate",
  ADVANCED: "difficultyAdvanced",
} satisfies Record<Difficulty, PlanningKey>;

export const TRAINING_GOAL_LABELS = {
  STRENGTH: "goalStrength",
  HYPERTROPHY: "goalHypertrophy",
  FAT_LOSS: "goalFatLoss",
  GENERAL: "goalGeneral",
} satisfies Record<TrainingGoal, PlanningKey>;
