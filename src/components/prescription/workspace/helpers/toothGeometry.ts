import type { ToothGeometry, ToothType } from "../../../../types/prescription";

/**
 * Every path is authored in a 100x120 viewBox.
 *
 * Upper arch = crown only (cervical/gum edge at the top, incisal or occlusal
 * surface at the bottom). Lower arch = crown on top with the root tapering
 * down, which is how a labial-view odontogram shows the mandibular teeth.
 */

export const UPPER_GEOMETRY: Record<ToothType, ToothGeometry> = {
  // Four rounded cusps around a star-shaped central fissure.
  molar: {
    path: "M 16 42 C 14 26 26 16 40 20 C 45 12 55 12 60 20 C 74 16 86 26 84 42 C 90 56 86 72 74 82 C 68 89 58 90 50 85 C 42 90 32 89 26 82 C 14 72 10 56 16 42 Z",
    innerPaths: [
      "M 50 24 C 52 40 48 44 50 52 C 52 68 48 78 50 88",
      "M 20 46 C 34 52 44 50 50 52 C 56 50 66 52 80 46",
    ],
  },
  // Two cusps, narrower than a molar and tapering toward the occlusal edge.
  premolar: {
    path: "M 28 40 C 26 24 36 14 50 16 C 64 14 74 24 72 40 C 74 56 68 74 58 88 C 54 94 46 94 42 88 C 32 74 26 56 28 40 Z",
    innerPaths: ["M 50 26 L 50 84", "M 32 44 C 40 52 60 52 68 44"],
  },
  // Single pointed cusp tip.
  canine: {
    path: "M 30 40 C 28 22 38 12 50 12 C 62 12 72 22 70 40 C 70 58 62 80 50 100 C 38 80 30 58 30 40 Z",
    innerPaths: [
      "M 50 24 L 50 94",
      "M 34 56 C 40 70 44 80 48 92",
      "M 66 56 C 60 70 56 80 52 92",
    ],
  },
  // Widest tooth in the arch, flat incisal edge.
  "central-incisor": {
    path: "M 24 42 C 22 22 34 12 50 12 C 66 12 78 22 76 42 C 78 62 76 80 74 90 C 74 95 70 98 62 98 L 38 98 C 30 98 26 95 26 90 C 24 80 22 62 24 42 Z",
    innerPaths: ["M 38 66 L 38 94", "M 62 66 L 62 94"],
  },
  "lateral-incisor": {
    path: "M 30 42 C 28 24 38 14 50 14 C 62 14 72 24 70 42 C 72 60 70 78 68 88 C 68 93 64 96 57 96 L 43 96 C 36 96 32 93 32 88 C 30 78 28 60 30 42 Z",
    innerPaths: ["M 40 68 L 40 92", "M 60 68 L 60 92"],
  },
};

export const LOWER_GEOMETRY: Record<ToothType, ToothGeometry> = {
  // Cusped crown with the two roots forking below it.
  molar: {
    path: "M 18 34 C 16 20 28 10 40 14 C 45 8 55 8 60 14 C 72 10 84 20 82 34 C 84 46 80 56 74 60 C 77 76 80 94 79 108 C 74 106 67 88 63 62 C 58 60 42 60 37 62 C 33 88 26 106 21 108 C 20 94 23 76 26 60 C 20 56 16 46 18 34 Z",
    innerPaths: [
      "M 50 18 C 52 30 48 36 50 46",
      "M 24 36 C 36 42 44 42 50 46 C 56 42 64 42 76 36",
    ],
  },
  premolar: {
    path: "M 30 32 C 28 18 38 10 50 12 C 62 10 72 18 70 32 C 72 44 66 52 60 56 C 62 74 60 94 56 108 C 53 113 47 113 44 108 C 40 94 38 74 40 56 C 34 52 28 44 30 32 Z",
    innerPaths: ["M 50 18 L 50 52", "M 34 34 C 42 42 58 42 66 34"],
  },
  canine: {
    path: "M 50 8 C 57 20 65 32 66 44 C 67 53 63 58 58 62 C 60 80 58 98 54 110 C 52 114 48 114 46 110 C 42 98 40 80 42 62 C 37 58 33 53 34 44 C 35 32 43 20 50 8 Z",
    innerPaths: ["M 50 16 L 50 58"],
  },
  "central-incisor": {
    path: "M 37 16 L 63 16 C 67 16 69 19 69 24 C 69 36 66 48 61 55 C 63 73 61 92 57 108 C 54 113 46 113 43 108 C 39 92 37 73 39 55 C 34 48 31 36 31 24 C 31 19 33 16 37 16 Z",
    innerPaths: ["M 42 22 L 42 44", "M 58 22 L 58 44"],
  },
  "lateral-incisor": {
    path: "M 35 15 L 65 15 C 69 15 71 18 71 24 C 71 36 68 48 62 55 C 64 73 62 93 57 108 C 54 113 46 113 43 108 C 38 93 36 73 38 55 C 32 48 29 36 29 24 C 29 18 31 15 35 15 Z",
    innerPaths: ["M 41 21 L 41 45", "M 59 21 L 59 45"],
  },
};

const MOLARS = new Set([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32]);
const PREMOLARS = new Set([4, 5, 12, 13, 20, 21, 28, 29]);
const CANINES = new Set([6, 11, 22, 27]);
const CENTRAL_INCISORS = new Set([8, 9, 24, 25]);

export const getToothType = (n: number): ToothType => {
  if (MOLARS.has(n)) return "molar";
  if (PREMOLARS.has(n)) return "premolar";
  if (CANINES.has(n)) return "canine";
  if (CENTRAL_INCISORS.has(n)) return "central-incisor";
  return "lateral-incisor";
};

// Relative sizes so the row reads anatomically: first molars are the bulkiest,
// wisdom teeth the smallest, and lower incisors much smaller than upper ones.
const SCALE_BY_TOOTH: Record<number, number> = {
  1: 0.82, 16: 0.82, 17: 0.82, 32: 0.82, // third molars (wisdom)
  2: 0.9, 15: 0.9, 18: 0.9, 31: 0.9, // second molars
  3: 0.98, 14: 0.98, 19: 0.98, 30: 0.98, // first molars
  6: 0.92, 11: 0.92, 22: 0.92, 27: 0.92, // canines
  7: 0.85, 10: 0.85, // upper lateral incisors
  8: 1.04, 9: 1.04, // upper central incisors
  23: 0.82, 26: 0.82, // lower lateral incisors
  24: 0.78, 25: 0.78, // lower central incisors
};

export const getToothScale = (n: number): number =>
  SCALE_BY_TOOTH[n] ?? (PREMOLARS.has(n) ? 0.86 : 1);
