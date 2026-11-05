import { describe, expect, it, vi } from "vitest";

// joinTeam must refuse unverified emails before it touches the database.
vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => { throw new Error("database should not be reached"); },
  adminAuth: () => ({}),
}));

import { joinTeam } from "@/lib/server/team";

describe("team invites", () => {
  it("require a verified email address", async () => {
    await expect(joinTeam({ uid: "u1", email: "sam@example.com", emailVerified: false }, "t1", "token"))
      .rejects.toMatchObject({ status: 403, code: "email_unverified" });
  });

  it("require an email address at all", async () => {
    await expect(joinTeam({ uid: "u1", email: null, emailVerified: true }, "t1", "token"))
      .rejects.toMatchObject({ code: "no_email" });
  });
});
