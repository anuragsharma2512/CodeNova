"use server";

import {
  GitHubImportController,
  ImportRequestDto,
  ImportResponseDto,
} from "../controllers/github-import.controller";

/**
 * Server Action endpoint delegating to the GitHubImportController (MVC Architecture)
 */
export const importGithubRepository = async (
  params: ImportRequestDto
): Promise<ImportResponseDto> => {
  return GitHubImportController.handleImport(params);
};
