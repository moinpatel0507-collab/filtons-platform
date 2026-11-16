import { describe, expect, it } from "vitest";
import {
  checkNewPassword,
  friendlyDbError,
  generateTempPassword,
  isRole,
  roleLabel,
  roleNeedsMfa,
  validateNewStaff,
} from "../src/lib/roles";

describe("roles", () => {
  it("recognises the four roles and nothing else", () => {
    expect(isRole("director")).toBe(true);
    expect(isRole("negotiator")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it("labels roles in plain English", () => {
    expect(roleLabel("property_manager")).toBe("Property Manager");
    expect(roleLabel("something_else")).toBe("something_else");
  });

  it("requires 2FA for Director and Accounts only (same rule as the database)", () => {
    expect(roleNeedsMfa(["director"])).toBe(true);
    expect(roleNeedsMfa(["accounts"])).toBe(true);
    expect(roleNeedsMfa(["negotiator", "accounts"])).toBe(true);
    expect(roleNeedsMfa(["property_manager"])).toBe(false);
    expect(roleNeedsMfa([])).toBe(false);
  });
});

describe("validateNewStaff", () => {
  const good = { fullName: "  Jane   Smith ", email: " Jane@Filtons.com ", phone: "020 8555 0101", roles: ["property_manager"] };

  it("accepts a valid person and tidies the input", () => {
    const r = validateNewStaff(good);
    expect(r).toEqual({ ok: true, value: { fullName: "Jane Smith", email: "jane@filtons.com", phone: "020 8555 0101", roles: ["property_manager"] } });
  });

  it("removes duplicate roles", () => {
    const r = validateNewStaff({ ...good, roles: ["accounts", "accounts"] });
    expect(r.ok && r.value.roles).toEqual(["accounts"]);
  });

  it("refuses a missing name, bad email, bad phone, no roles or an unknown role", () => {
    expect(validateNewStaff({ ...good, fullName: "" }).ok).toBe(false);
    expect(validateNewStaff({ ...good, email: "not-an-email" }).ok).toBe(false);
    expect(validateNewStaff({ ...good, phone: "call me" }).ok).toBe(false);
    expect(validateNewStaff({ ...good, roles: [] }).ok).toBe(false);
    expect(validateNewStaff({ ...good, roles: ["superuser"] }).ok).toBe(false);
  });

  it("allows a blank phone", () => {
    expect(validateNewStaff({ ...good, phone: "" }).ok).toBe(true);
  });
});

describe("generateTempPassword", () => {
  it("is 16 characters with every character type and no look-alikes", () => {
    for (let i = 0; i < 50; i++) {
      const p = generateTempPassword();
      expect(p).toHaveLength(16);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[2-9]/);
      expect(p).toMatch(/[!@#$%*?]/);
      expect(p).not.toMatch(/[01OIl]/);
    }
  });

  it("doesn't repeat", () => {
    const set = new Set(Array.from({ length: 200 }, () => generateTempPassword()));
    expect(set.size).toBe(200);
  });
});

describe("checkNewPassword", () => {
  it("enforces length, mix and matching", () => {
    expect(checkNewPassword("Short1", "Short1")).toMatch(/12/);
    expect(checkNewPassword("alllowercase123", "alllowercase123")).toMatch(/mix/);
    expect(checkNewPassword("GoodPassword123", "GoodPassword124")).toMatch(/match/);
    expect(checkNewPassword("GoodPassword123", "GoodPassword123")).toBeNull();
  });
});

describe("friendlyDbError", () => {
  it("translates the database's safety rules into plain sentences", () => {
    expect(friendlyDbError("There must always be at least one active Director")).toMatch(/at least one active Director/);
    expect(friendlyDbError("You cannot deactivate your own account")).toMatch(/your own account/);
    expect(friendlyDbError('new row violates row-level security policy for table "staff_profiles"')).toMatch(/permission/);
    expect(friendlyDbError("A user with this email address has already been registered")).toMatch(/already exists/);
    expect(friendlyDbError("something unexpected")).toBe("something unexpected");
  });
});
