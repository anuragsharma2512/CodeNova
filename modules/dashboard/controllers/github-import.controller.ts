import { currentUser } from "@/modules/auth/actions";
import { revalidatePath } from "next/cache";
import { PlaygroundModel } from "../models/playground.model";
import { importGitHubRepo, parseGitHubUrl } from "../lib/github-importer";

export interface ImportRequestDto {
  url: string;
  customTitle?: string;
}

export interface ImportResponseDto {
  success: boolean;
  playgroundId?: string;
  title?: string;
  fileCount?: number;
  error?: string;
}

export class GitHubImportController {
  /**
   * Main controller handler for importing a GitHub repository.
   * Orchestrates authentication, data retrieval (Model), GitHub fetching,
   * data persistence (Model), and cache revalidation.
   */
  static async handleImport(dto: ImportRequestDto): Promise<ImportResponseDto> {
    try {
      const { url, customTitle } = dto;

      // 1. Authenticate user
      const user = await currentUser();
      if (!user || !user.id) {
        return {
          success: false,
          error: "You must be logged in to import a repository.",
        };
      }

      // 2. Validate & parse URL
      const { owner, repo, branch } = parseGitHubUrl(url);

      // 3. Delegate to Model to check for user's GitHub OAuth token
      const token = await PlaygroundModel.getUserGitHubToken(user.id);

      // 4. Ingest repository archive (with automatic 401 fallback for public repos)
      const importResult = await importGitHubRepo({
        owner,
        repo,
        branch,
        token: token || undefined,
      });

      // 5. Delegate persistence to Model
      const playground = await PlaygroundModel.createPlaygroundWithFiles({
        title: customTitle?.trim() || importResult.title,
        description: importResult.description,
        template: importResult.template,
        userId: user.id,
        templateFolder: importResult.templateFolder,
      });

      // 6. Revalidate Dashboard view
      revalidatePath("/dashboard");

      return {
        success: true,
        playgroundId: playground.id,
        title: playground.title,
        fileCount: importResult.fileCount,
      };
    } catch (error: any) {
      console.error("[GitHubImportController] Import error:", error);
      return {
        success: false,
        error: error?.message || "Failed to import GitHub repository.",
      };
    }
  }
}
