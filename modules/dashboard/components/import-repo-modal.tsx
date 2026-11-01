"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github, Loader2, GitFork, AlertCircle, Sparkles } from "lucide-react";
import { importGithubRepository } from "../actions/import-repo";

interface ImportRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportRepoModal({ isOpen, onClose }: ImportRepoModalProps) {
  const [url, setUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleClose = () => {
    if (isLoading) return;
    setUrl("");
    setCustomTitle("");
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setErrorMessage("Please enter a valid GitHub repository URL.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const toastId = toast.loading("Fetching repository from GitHub...");

    try {
      const res = await importGithubRepository({
        url: trimmedUrl,
        customTitle: customTitle.trim() || undefined,
      });

      if (!res.success || !res.playgroundId) {
        const errorText = res.error || "Failed to import repository.";
        setErrorMessage(errorText);
        toast.error(errorText, { id: toastId });
        setIsLoading(false);
        return;
      }

      toast.success(
        `Successfully imported "${res.title}" with ${res.fileCount} files! Opening workspace...`,
        { id: toastId }
      );

      handleClose();
      router.push(`/playground/${res.playgroundId}`);
    } catch (err: any) {
      const fallbackError = err?.message || "An unexpected error occurred while importing.";
      setErrorMessage(fallbackError);
      toast.error(fallbackError, { id: toastId });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px] border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-zinc-950 dark:text-white">
                Import from GitHub
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                Load any public repository (or your private repos if signed in with GitHub).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="repo-url" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Repository URL <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="repo-url"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isLoading}
                placeholder="https://github.com/owner/repository or owner/repository"
                className="pl-9 text-sm border-zinc-300 dark:border-zinc-700 focus-visible:ring-teal-500"
                autoFocus
              />
              <GitFork className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repo-title" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Project Title <span className="text-xs text-zinc-400 font-normal lowercase">(optional)</span>
            </Label>
            <Input
              id="repo-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              disabled={isLoading}
              placeholder="Defaults to GitHub repository name"
              className="text-sm border-zinc-300 dark:border-zinc-700 focus-visible:ring-teal-500"
            />
          </div>


          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="border-zinc-300 dark:border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing Sandbox...
                </>
              ) : (
                <>
                  <Github className="mr-2 h-4 w-4" />
                  Import Repository
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
