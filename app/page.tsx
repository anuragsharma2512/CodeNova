import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import UserButton from "@/modules/auth/components/user-button";

export default async function Home() {
  const session = await auth();
  
  // Ensure user is authenticated
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      
      <Button>
        Get Started
      </Button>
      <UserButton/>
    </div>
    
  );
}
