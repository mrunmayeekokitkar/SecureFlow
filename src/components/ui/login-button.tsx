import Link from "next/link";
import { auth } from "@/auth"; // Adjust import path based on your auth.ts location
import { Button } from "@/components/ui/button";

export async function LoginButton() {
  // Retrieve the session from NextAuth on the server
  const session = await auth();

  // If a session exists, the user is logged in
  const isLoggedIn = !!session;

  return (
    <Link href={isLoggedIn ? "/dashboard" : "/api/auth/signin"}>
      <Button variant="outline">
        {isLoggedIn ? "Dashboard" : "Login"}
      </Button>
    </Link>
  );
}