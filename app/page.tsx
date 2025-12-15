import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import Image from "next/image";

/**
 * Renders the homepage containing a full-height, centered container with a "Get Started" button.
 *
 * @returns The JSX element for the homepage: a vertically and horizontally centered layout that displays a "Get Started" Button.
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