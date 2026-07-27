import { describe, expect, it } from "vitest";

import { buildExerciseSuggestions, type SuggestionCandidate } from "./suggestion.service.js";

const candidates: SuggestionCandidate[] = [
  {
    id: "2",
    name: "Cable Row",
    movementPattern: "PULL",
    equipment: "CABLE",
    difficulty: "BEGINNER",
  },
  {
    id: "1",
    name: "Push-Up",
    movementPattern: "PUSH",
    equipment: "BODYWEIGHT",
    difficulty: "BEGINNER",
  },
  {
    id: "3",
    name: "Incomplete custom",
    movementPattern: "HINGE",
  },
];

function suggest(overrides: Partial<Parameters<typeof buildExerciseSuggestions>[0]> = {}) {
  return buildExerciseSuggestions({
    availableEquipment: ["BODYWEIGHT"],
    candidates,
    existingExerciseIds: [],
    existingPatterns: [],
    goal: "GENERAL",
    suggestedDay: "MONDAY",
    suggestedTemplateId: "template-1",
    ...overrides,
  });
}

describe("buildExerciseSuggestions", () => {
  it("returns stable ordering and localized reason parameters for identical input", () => {
    expect(suggest()).toEqual(suggest());
    expect(suggest()).toEqual([
      expect.objectContaining({
        exerciseId: "1",
        reasonCode: "MISSING_MOVEMENT_PATTERN",
        reasonParams: { goal: "GENERAL", movementPattern: "PUSH" },
      }),
    ]);
  });

  it("excludes unavailable equipment and custom candidates with incomplete metadata", () => {
    expect(suggest().map(({ exerciseId }) => exerciseId)).toEqual(["1"]);
  });

  it("does not suggest an already-covered movement pattern or existing exercise", () => {
    expect(suggest({ existingPatterns: ["PUSH"] })).toEqual([]);
    expect(suggest({ existingExerciseIds: ["1"] })).toEqual([]);
  });
});
