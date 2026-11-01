"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import Image from "next/image";
import ImportRepoModal from "./import-repo-modal";

const AddRepo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="group relative flex cursor-pointer flex-row items-center justify-between overflow-hidden rounded-lg border border-zinc-200/80 bg-white/80 px-6 py-6 shadow-lg shadow-zinc-950/5 backdrop-blur-xl transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-teal-500/60 hover:shadow-2xl hover:shadow-teal-500/10 dark:border-white/10 dark:bg-zinc-950/60"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-teal-400 via-amber-400 to-[#E93F3F]" />
        <div className="flex flex-row justify-center items-start gap-4">
          <Button
            variant={"outline"}
            className="flex justify-center items-center border-teal-500/25 bg-teal-500/10 text-teal-700 transition-colors duration-300 group-hover:border-teal-500 group-hover:bg-teal-500 group-hover:text-white dark:text-teal-200"
            size={"icon"}
          >
            <ArrowDown size={30} className="transition-transform duration-300 group-hover:translate-y-1" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Open GitHub Repository</h1>
            <p className="text-sm text-muted-foreground max-w-[220px]">Work with your repositories in our editor</p>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <Image
            src={"/github.svg"}
            alt="Open GitHub repository"
            width={150}
            height={150}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>

      <ImportRepoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default AddRepo;
