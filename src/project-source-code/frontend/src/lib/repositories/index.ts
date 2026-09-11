/**
 * Repositories Entry Point (Stage 9)
 * Exposes all storage-abstracted repositories for unified usage in UI components.
 */

import { studentRepository } from "./StudentRepository";
import { skillRepository } from "./SkillRepository";
import { projectRepository } from "./ProjectRepository";
import { matchRepository } from "./MatchRepository";
import { teamRepository } from "./TeamRepository";
import { creditRepository } from "./CreditRepository";

export {
  studentRepository,
  skillRepository,
  projectRepository,
  matchRepository,
  teamRepository,
  creditRepository,
};

export const repositories = {
  students: studentRepository,
  skills: skillRepository,
  projects: projectRepository,
  matches: matchRepository,
  teams: teamRepository,
  credits: creditRepository,
};
