import type { ExerciseRecord } from "./exercise.model.js";

type SeedExercise = Omit<ExerciseRecord, "_id" | "createdAt" | "updatedAt">;

export const systemExercises: SeedExercise[] = [
  // CHEST
  {
    name: "Barbell Bench Press",
    muscleGroups: ["CHEST", "TRICEPS", "SHOULDERS"],
    movementPattern: "PUSH",
    equipment: "BARBELL",
    difficulty: "INTERMEDIATE",
    isSystem: true,
  },
  {
    name: "Dumbbell Bench Press",
    muscleGroups: ["CHEST", "TRICEPS", "SHOULDERS"],
    movementPattern: "PUSH",
    equipment: "DUMBBELL",
    difficulty: "BEGINNER",
    isSystem: true,
  },
  {
    name: "Incline Barbell Bench Press",
    muscleGroups: ["CHEST", "SHOULDERS", "TRICEPS"],
    movementPattern: "PUSH",
    equipment: "BARBELL",
    difficulty: "INTERMEDIATE",
    isSystem: true,
  },
  {
    name: "Cable Chest Fly",
    muscleGroups: ["CHEST"],
    movementPattern: "ISOLATION",
    equipment: "CABLE",
    difficulty: "BEGINNER",
    isSystem: true,
  },
  {
    name: "Push-Up",
    muscleGroups: ["CHEST", "TRICEPS", "SHOULDERS"],
    movementPattern: "PUSH",
    equipment: "BODYWEIGHT",
    difficulty: "BEGINNER",
    isSystem: true,
  },

  // BACK
  {
    name: "Barbell Deadlift",
    muscleGroups: ["BACK", "LEGS", "GLUTES"],
    movementPattern: "HINGE",
    equipment: "BARBELL",
    difficulty: "ADVANCED",
    isSystem: true,
  },
  {
    name: "Pull-Up",
    muscleGroups: ["BACK", "BICEPS"],
    movementPattern: "PULL",
    equipment: "BODYWEIGHT",
    difficulty: "INTERMEDIATE",
    isSystem: true,
  },
  {
    name: "Barbell Bent-Over Row",
    muscleGroups: ["BACK", "BICEPS"],
    movementPattern: "PULL",
    equipment: "BARBELL",
    difficulty: "INTERMEDIATE",
    isSystem: true,
  },
  {
    name: "Lat Pulldown",
    muscleGroups: ["BACK", "BICEPS"],
    movementPattern: "PULL",
    equipment: "CABLE",
    difficulty: "BEGINNER",
    isSystem: true,
  },
  {
    name: "Seated Cable Row",
    muscleGroups: ["BACK", "BICEPS"],
    movementPattern: "PULL",
    equipment: "CABLE",
    difficulty: "BEGINNER",
    isSystem: true,
  },

  // SHOULDERS
  {
    name: "Overhead Press",
    muscleGroups: ["SHOULDERS", "TRICEPS"],
    movementPattern: "PUSH",
    equipment: "BARBELL",
    difficulty: "INTERMEDIATE",
    isSystem: true,
  },
  {
    name: "Dumbbell Lateral Raise",
    muscleGroups: ["SHOULDERS"],
    movementPattern: "ISOLATION",
    equipment: "DUMBBELL",
    difficulty: "BEGINNER",
    isSystem: true,
  },

  // LEGS
  {
    name: "Barbell Back Squat",
    muscleGroups: ["LEGS", "GLUTES", "CORE"],
    movementPattern: "SQUAT",
    equipment: "BARBELL",
    difficulty: "INTERMEDIATE",
    isSystem: true,
  },
  {
    name: "Leg Press",
    muscleGroups: ["LEGS", "GLUTES"],
    movementPattern: "SQUAT",
    equipment: "MACHINE",
    difficulty: "BEGINNER",
    isSystem: true,
  },
  {
    name: "Romanian Deadlift",
    muscleGroups: ["LEGS", "GLUTES", "BACK"],
    movementPattern: "HINGE",
    equipment: "BARBELL",
    difficulty: "INTERMEDIATE",
    isSystem: true,
  },
  {
    name: "Leg Curl",
    muscleGroups: ["LEGS"],
    movementPattern: "ISOLATION",
    equipment: "MACHINE",
    difficulty: "BEGINNER",
    isSystem: true,
  },
  {
    name: "Leg Extension",
    muscleGroups: ["LEGS"],
    movementPattern: "ISOLATION",
    equipment: "MACHINE",
    difficulty: "BEGINNER",
    isSystem: true,
  },

  // ARMS
  {
    name: "Barbell Curl",
    muscleGroups: ["BICEPS"],
    movementPattern: "ISOLATION",
    equipment: "BARBELL",
    difficulty: "BEGINNER",
    isSystem: true,
  },
  {
    name: "Tricep Pushdown",
    muscleGroups: ["TRICEPS"],
    movementPattern: "ISOLATION",
    equipment: "CABLE",
    difficulty: "BEGINNER",
    isSystem: true,
  },

  // CORE
  {
    name: "Plank",
    muscleGroups: ["CORE"],
    movementPattern: "ISOLATION",
    equipment: "BODYWEIGHT",
    difficulty: "BEGINNER",
    isSystem: true,
  },

  // GLUTES
  {
    name: "Hip Thrust",
    muscleGroups: ["GLUTES", "LEGS"],
    movementPattern: "HINGE",
    equipment: "BARBELL",
    difficulty: "INTERMEDIATE",
    isSystem: true,
  },

  // CALVES
  {
    name: "Standing Calf Raise",
    muscleGroups: ["CALVES"],
    movementPattern: "ISOLATION",
    equipment: "MACHINE",
    difficulty: "BEGINNER",
    isSystem: true,
  },

  // FUNCTIONAL
  {
    name: "Farmer's Walk",
    muscleGroups: ["FOREARMS", "CORE", "SHOULDERS"],
    movementPattern: "CARRY",
    equipment: "DUMBBELL",
    difficulty: "INTERMEDIATE",
    isSystem: true,
  },
  {
    name: "Cable Woodchop",
    muscleGroups: ["CORE"],
    movementPattern: "ROTATION",
    equipment: "CABLE",
    difficulty: "INTERMEDIATE",
    isSystem: true,
  },
];
