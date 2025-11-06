import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Key One",
  description: "Admin Dashboard",
};

export default function SignIn() {
  return <SignInForm />;
}
