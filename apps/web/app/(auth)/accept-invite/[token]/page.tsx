import type { Metadata } from "next";
import { AcceptInvite } from "@/components/flowcare/accept-invite";
import { getCurrentUser, getInviteDetails } from "@/server/invites";

export const metadata: Metadata = {
  title: "Convite para clínica | Flowcare",
};

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, currentUser] = await Promise.all([
    getInviteDetails(token),
    getCurrentUser(),
  ]);

  return (
    <section aria-labelledby="invite-title" className="w-full">
      <h1 id="invite-title" className="sr-only">
        Aceitar convite para clínica
      </h1>
      <AcceptInvite token={token} invite={invite} currentUser={currentUser} />
    </section>
  );
}
