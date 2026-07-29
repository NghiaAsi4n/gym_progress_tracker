import { describe, expect, it, vi } from "vitest";

import { createAdminBootstrapService } from "./admin-bootstrap.service.js";

describe("admin bootstrap service", () => {
  it("promotes an existing account without replacing its password", async () => {
    const repository = {
      create: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue({ role: "USER" }),
      updateRoleByEmail: vi.fn().mockResolvedValue({ role: "ADMIN" }),
    };
    const passwordService = {
      hash: vi.fn(),
    };
    const bootstrap = createAdminBootstrapService(repository, passwordService);

    await bootstrap.ensureAdmin({
      email: "admin@example.com",
      password: "AdminPassword1!",
    });

    expect(passwordService.hash).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.updateRoleByEmail).toHaveBeenCalledWith("admin@example.com", "ADMIN");
  });

  it("hashes the password when creating a new admin account", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({ role: "ADMIN" }),
      findByEmail: vi.fn().mockResolvedValue(null),
      updateRoleByEmail: vi.fn(),
    };
    const passwordService = {
      hash: vi.fn().mockResolvedValue("encoded-password-hash"),
    };
    const bootstrap = createAdminBootstrapService(repository, passwordService);

    await bootstrap.ensureAdmin({
      email: "admin@example.com",
      password: "AdminPassword1!",
    });

    expect(repository.create).toHaveBeenCalledWith({
      normalizedEmail: "admin@example.com",
      passwordHash: "encoded-password-hash",
      role: "ADMIN",
    });
    expect(repository.updateRoleByEmail).not.toHaveBeenCalled();
  });
});
