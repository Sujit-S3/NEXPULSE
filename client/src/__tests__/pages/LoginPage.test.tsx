import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "@pages/Login";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  verifyMfa: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    login: mocks.login,
    verifyMfa: mocks.verifyMfa,
    isAuthenticated: false,
  }),
}));
vi.mock("../../services/identity", () => ({
  identityApi: { respondToInvitation: vi.fn() },
}));
vi.mock("../../theme/useTheme", () => ({
  useTheme: () => ({ theme: "dark", resolved: "dark", setTheme: vi.fn(), toggle: vi.fn() }),
}));

describe("LoginPage identity flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not advertise unimplemented social identity providers", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.queryByText("Continue with Google")).not.toBeInTheDocument();
    expect(screen.queryByText("Continue with GitHub")).not.toBeInTheDocument();
  });

  it("requires the backend MFA challenge before navigation", async () => {
    mocks.login.mockResolvedValue({
      mfaRequired: true,
      challengeToken: "challenge-token-with-sufficient-length",
      methods: ["totp", "recovery"],
    });
    const user = userEvent.setup();
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password-value");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Verify it’s you")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Authenticator" })).toBeInTheDocument();
    expect(mocks.login).toHaveBeenCalledWith("user@example.com", "correct-password-value", false);
  });
});
