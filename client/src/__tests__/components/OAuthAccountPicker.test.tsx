import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OAuthAccountPicker } from "../../components/platforms/OAuthAccountPicker";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock("../../features/core/hooks/usePlatforms", () => ({
  usePendingOAuthAccounts: () => ({
    data: {
      provider: "instagram",
      providerName: "Instagram",
      scopes: ["instagram_basic"],
      accounts: [
        {
          providerAccountId: "real-provider-id",
          providerUserId: "real-user-id",
          displayName: "Provider Returned Name",
          username: "provider_returned_username",
          accountType: "professional",
          connected: false,
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
  useSelectOAuthAccounts: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
    error: null,
  }),
}));

describe("OAuthAccountPicker", () => {
  beforeEach(() => {
    mocks.mutateAsync.mockReset();
    mocks.mutateAsync.mockResolvedValue([]);
  });

  it("does not auto-select an account or assume a primary account", async () => {
    const user = userEvent.setup();
    const onConnected = vi.fn();
    render(
      <OAuthAccountPicker
        sessionId="oauth-session"
        onClose={vi.fn()}
        onConnected={onConnected}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /select provider returned name/i });
    const continueButton = screen.getByRole("button", { name: /continue with 0 accounts/i });

    expect(checkbox).toHaveAttribute("aria-checked", "false");
    expect(continueButton).toBeDisabled();

    await user.click(checkbox);
    expect(screen.getByRole("button", { name: /continue with 1 account/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /make primary/i }));
    await user.click(screen.getByRole("button", { name: /continue with 1 account/i }));

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      sessionId: "oauth-session",
      accountIds: ["real-provider-id"],
      primaryAccountId: "real-provider-id",
    });
    expect(onConnected).toHaveBeenCalledOnce();
  });
});
