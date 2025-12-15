import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import Image from "next/image";

/**
 * Renders the application's homepage with a centered "Get Started" button.
 *
 * @returns The homepage React element: a full-screen, centered layout containing a `Get Started` Button.
 */
export default async function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <Button>
        Get Started
      </Button>
    </div>
    
  );
}