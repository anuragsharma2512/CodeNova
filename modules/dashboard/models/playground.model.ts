import { db } from "@/lib/db";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

export interface CreatePlaygroundData {
  title: string;
  description?: string;
  template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
  userId: string;
  templateFolder: TemplateFolder;
}

export class PlaygroundModel {
  /**
   * Retrieves the GitHub access token for a user if connected
   */
  static async getUserGitHubToken(userId: string): Promise<string | null> {
    try {
      const account = await db.account.findFirst({
        where: {
          userId,
          provider: "github",
        },
        select: {
          access_token: true,
        },
      });
      return account?.access_token || null;
    } catch (error) {
      console.error("PlaygroundModel: Failed to fetch user GitHub token:", error);
      return null;
    }
  }

  /**
   * Creates a new Playground record along with its initial TemplateFile JSON structure
   */
  static async createPlaygroundWithFiles(data: CreatePlaygroundData) {
    const { title, description, template, userId, templateFolder } = data;

    // Create Playground
    const playground = await db.playground.create({
      data: {
        title,
        description,
        template,
        userId,
      },
    });

    // Create associated TemplateFile
    await db.templateFile.create({
      data: {
        playgroundId: playground.id,
        content: JSON.stringify(templateFolder),
      },
    });

    return playground;
  }
}
