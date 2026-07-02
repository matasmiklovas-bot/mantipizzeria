import { redirect } from "next/navigation";

export default function KasaLoginRedirect() {
  redirect("/kitchen/login");
}
