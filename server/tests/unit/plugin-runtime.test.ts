import { afterEach, describe, expect, it } from "vitest";
import {
  loadTrustedPlugin,
  registerTrustedPlugin,
  unregisterTrustedPlugin,
} from "../../src/modules/developer/pluginRuntime.js";

describe("trusted plugin runtime", () => {
  afterEach(() => unregisterTrustedPlugin("test-analytics", "1.0.0"));

  it("loads only declared capabilities with a workspace permission context", async () => {
    registerTrustedPlugin({
      slug: "test-analytics",
      version: "1.0.0",
      runtimeApiVersion: "v1",
      capabilities: ["analytics"],
      async activate(context) {
        return [{ capability: "analytics", id: "summary", label: context.workspaceId }];
      },
    });
    const contributions = await loadTrustedPlugin({
      slug: "test-analytics",
      version: "1.0.0",
      context: {
        workspaceId: "workspace-a",
        installationId: "installation-a",
        grantedPermissions: ["analytics.read"],
      },
      allowedCapabilities: ["analytics"],
    });
    expect(contributions).toEqual([
      { capability: "analytics", id: "summary", label: "workspace-a" },
    ]);
  });

  it("rejects a runtime whose capability was not approved", async () => {
    registerTrustedPlugin({
      slug: "test-analytics",
      version: "1.0.0",
      runtimeApiVersion: "v1",
      capabilities: ["analytics"],
      async activate() { return []; },
    });
    await expect(loadTrustedPlugin({
      slug: "test-analytics",
      version: "1.0.0",
      context: { workspaceId: "workspace-a", installationId: "installation-a", grantedPermissions: [] },
      allowedCapabilities: ["reports"],
    })).rejects.toThrow("undeclared capability");
  });
});
