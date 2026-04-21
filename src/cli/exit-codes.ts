export const EXIT = {
  OK: 0,
  LINT_BLOCKING: 1,
  USAGE: 2,
  DATA_ERR: 65,
  NO_INPUT: 66,
  UNAVAILABLE: 69,
  SOFTWARE: 70,
  NO_PERM: 77,
  CONFIG: 78,
  SIGINT: 130,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];
