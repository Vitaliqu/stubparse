// Business team seats: one owner (who pays) plus invited members who inherit the Business plan
// and share the team's saved history at teams/{teamId}/documents.

import { createHash, randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getOrCreateAccount, HttpError, usersCol, type AuthedUser } from "@/lib/server/account";
import { ownTierOf, TEAM_SEATS, type AccountDoc, type TeamMembership, type Tier } from "@/lib/plan";

const INVITE_DAYS = 14;
const teams = () => adminDb().collection("teams");
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const normEmail = (e: string) => e.trim().toLowerCase();

interface TeamView {
  id: string;
  name: string;
  role: "owner" | "member";
  tier: Tier;
  seats: number;
  members: { uid: string; email: string | null; role: "owner" | "member"; joinedAt: number }[];
  invites: { id: string; email: string; createdAt: number; expiresAt: number }[]; // owner only
}

async function requireOwner(uid: string, teamId: string) {
  const snap = await teams().doc(teamId).get();
  if (!snap.exists) throw new HttpError(404, "Team not found.", "not_found");
  if (snap.data()!.ownerUid !== uid) throw new HttpError(403, "Only the team owner can do that.", "forbidden");
  return snap;
}

export async function createTeam(user: AuthedUser, rawName: string): Promise<TeamMembership> {
  const account = await getOrCreateAccount(user);
  if (account.team) throw new HttpError(409, "You're already in a team.", "already_in_team");
  if (ownTierOf(account) !== "business") throw new HttpError(403, "Teams are part of your own Business subscription.", "upgrade_required");

  const name = rawName.trim().slice(0, 80) || "My team";
  const ref = teams().doc();
  const membership: TeamMembership = { id: ref.id, name, role: "owner", tier: "business" };
  const batch = adminDb().batch();
  batch.set(ref, { name, ownerUid: user.uid, tier: "business", createdAt: Date.now() });
  batch.set(ref.collection("members").doc(user.uid), { email: user.email, role: "owner", joinedAt: Date.now() });
  batch.set(usersCol().doc(user.uid), { team: membership }, { merge: true });
  await batch.commit();
  return membership;
}

export async function getTeam(user: AuthedUser): Promise<TeamView | null> {
  const account = await getOrCreateAccount(user);
  if (!account.team) return null;
  const ref = teams().doc(account.team.id);
  const [team, members, invites] = await Promise.all([
    ref.get(),
    ref.collection("members").get(),
    account.team.role === "owner" ? ref.collection("invites").get() : Promise.resolve(null),
  ]);
  if (!team.exists) return null;
  const now = Date.now();
  return {
    id: ref.id,
    name: team.data()!.name,
    role: account.team.role,
    tier: team.data()!.tier,
    seats: TEAM_SEATS,
    members: members.docs
      .map((d) => ({ uid: d.id, email: d.data().email ?? null, role: d.data().role, joinedAt: d.data().joinedAt }))
      .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.joinedAt - b.joinedAt)),
    invites: (invites?.docs ?? [])
      .map((d) => ({ id: d.id, email: d.data().email, createdAt: d.data().createdAt, expiresAt: d.data().expiresAt }))
      .filter((i) => i.expiresAt > now),
  };
}

/** Creates an invite and returns the join link token (shown to the owner, and emailed when email is set up). */
export async function inviteMember(user: AuthedUser, rawEmail: string): Promise<{ token: string; inviteId: string; teamId: string; teamName: string; email: string }> {
  const account = await getOrCreateAccount(user);
  if (!account.team || account.team.role !== "owner") throw new HttpError(403, "Only the team owner can invite people.", "forbidden");
  const email = normEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email address.", "invalid_email");
  if (email === normEmail(user.email ?? "")) throw new HttpError(400, "You're already on the team.", "self_invite");

  const ref = teams().doc(account.team.id);
  const [members, invites] = await Promise.all([ref.collection("members").get(), ref.collection("invites").get()]);
  const now = Date.now();
  const live = invites.docs.filter((d) => d.data().expiresAt > now);
  if (members.docs.some((d) => normEmail(d.data().email ?? "") === email)) throw new HttpError(409, "That person is already on the team.", "already_member");
  if (members.size + live.filter((d) => d.data().email !== email).length >= TEAM_SEATS) {
    throw new HttpError(409, `Business includes ${TEAM_SEATS} seats. Remove a member or revoke an invite first.`, "no_seats");
  }

  // Re-inviting the same address replaces the previous invite.
  await Promise.all(live.filter((d) => d.data().email === email).map((d) => d.ref.delete()));
  const token = randomBytes(24).toString("base64url");
  const invite = await ref.collection("invites").add({ email, tokenHash: hash(token), invitedBy: user.uid, createdAt: now, expiresAt: now + INVITE_DAYS * 86_400_000 });
  return { token, inviteId: invite.id, teamId: ref.id, teamName: account.team.name, email };
}

export async function revokeInvite(user: AuthedUser, inviteId: string) {
  const account = await getOrCreateAccount(user);
  if (!account.team) throw new HttpError(404, "No team.", "not_found");
  await requireOwner(user.uid, account.team.id);
  await teams().doc(account.team.id).collection("invites").doc(inviteId).delete();
}

/** Accepts an invite. The signed-in email must match the invited address. */
export async function joinTeam(user: AuthedUser, teamId: string, token: string): Promise<TeamMembership> {
  if (!user.email) throw new HttpError(400, "Your account needs an email address to join a team.", "no_email");
  if (!user.emailVerified) throw new HttpError(403, `Verify ${user.email} first, then accept the invite.`, "email_unverified");
  const ref = teams().doc(teamId);
  return adminDb().runTransaction(async (tx) => {
    const [team, account, invites, members] = await Promise.all([
      tx.get(ref),
      tx.get(usersCol().doc(user.uid)),
      tx.get(ref.collection("invites").where("tokenHash", "==", hash(token)).limit(1)),
      tx.get(ref.collection("members")),
    ]);
    if (!team.exists) throw new HttpError(404, "This team no longer exists.", "not_found");
    const invite = invites.docs[0];
    if (!invite || invite.data().expiresAt < Date.now()) throw new HttpError(410, "This invite has expired or was revoked. Ask the owner for a new one.", "invite_invalid");
    if (normEmail(invite.data().email) !== normEmail(user.email!)) {
      throw new HttpError(403, `This invite was sent to ${invite.data().email}. Sign in with that address to accept it.`, "wrong_email");
    }
    const current = (account.data() as AccountDoc | undefined)?.team;
    if (current && current.id !== teamId) throw new HttpError(409, "You're already in another team. Leave it first.", "already_in_team");
    if (members.size >= TEAM_SEATS && !members.docs.some((d) => d.id === user.uid)) throw new HttpError(409, "The team is full. Ask the owner to free a seat.", "no_seats");

    const membership: TeamMembership = { id: teamId, name: team.data()!.name, role: "member", tier: team.data()!.tier };
    tx.set(ref.collection("members").doc(user.uid), { email: user.email, role: "member", joinedAt: Date.now() });
    tx.set(usersCol().doc(user.uid), { team: membership, ...(account.exists ? {} : { email: user.email, createdAt: Date.now(), docsUsed: 0, periodKey: "", periodUsed: 0 }) }, { merge: true });
    tx.delete(invite.ref);
    return membership;
  });
}

export async function removeMember(user: AuthedUser, memberUid: string) {
  const account = await getOrCreateAccount(user);
  if (!account.team) throw new HttpError(404, "No team.", "not_found");
  await requireOwner(user.uid, account.team.id);
  if (memberUid === user.uid) throw new HttpError(400, "The owner can't be removed. Delete the team instead.", "owner");
  const batch = adminDb().batch();
  batch.delete(teams().doc(account.team.id).collection("members").doc(memberUid));
  batch.set(usersCol().doc(memberUid), { team: null }, { merge: true });
  await batch.commit();
}

export async function leaveTeam(user: AuthedUser) {
  const account = await getOrCreateAccount(user);
  if (!account.team) return;
  if (account.team.role === "owner") throw new HttpError(400, "Owners can't leave their own team. Delete it instead.", "owner");
  const batch = adminDb().batch();
  batch.delete(teams().doc(account.team.id).collection("members").doc(user.uid));
  batch.set(usersCol().doc(user.uid), { team: null }, { merge: true });
  await batch.commit();
}

/** Deletes the team, its shared history and invites, and detaches every member. */
export async function deleteTeam(ownerUid: string, teamId: string) {
  const ref = teams().doc(teamId);
  const members = await ref.collection("members").get();
  const batch = adminDb().batch();
  members.docs.forEach((m) => batch.set(usersCol().doc(m.id), { team: null }, { merge: true }));
  await batch.commit();
  await adminDb().recursiveDelete(ref);
  await usersCol().doc(ownerUid).set({ team: null }, { merge: true });
}

/** Copies the owner's current tier onto the team and every member (call after the owner's subscription changes). */
export async function refreshTeamTier(ownerUid: string) {
  const owner = (await usersCol().doc(ownerUid).get()).data() as AccountDoc | undefined;
  if (!owner?.team || owner.team.role !== "owner") return;
  const tier = ownTierOf(owner) === "business" ? "business" : "free";
  const ref = teams().doc(owner.team.id);
  const members = await ref.collection("members").get();
  const batch = adminDb().batch();
  batch.update(ref, { tier, tierUpdatedAt: FieldValue.serverTimestamp() });
  members.docs.forEach((m) => batch.set(usersCol().doc(m.id), { team: { tier } }, { merge: true }));
  await batch.commit();
}
