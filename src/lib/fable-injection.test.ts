import { describe, it, expect } from "vitest";
import { buildSystem } from "./ai-provider";
import { FABLE_BEHAVIOR } from "./fable-behavior";

describe("Fable 5 System Prompt Injection", () => {
  it("injects FABLE_BEHAVIOR into the system prompt regardless of the request parameters", () => {
    const testRequests = [
      {
        description: "Standard request",
        agent: undefined,
        mode: undefined,
        effort: "medium" as const,
      },
      {
        description: "Request with effort 'max'",
        agent: undefined,
        mode: undefined,
        effort: "max" as const,
      },
      {
        description: "Request with forge-1 agent",
        agent: "forge-1",
        mode: undefined,
        effort: "medium" as const,
      },
      {
        description: "Cipher mode request",
        agent: "cipher-1",
        mode: undefined,
        effort: "high" as const,
        cipherMode: "operator" as const,
      },
    ];

    for (const req of testRequests) {
      const systemPrompt = buildSystem(
        req.agent,
        req.mode,
        req.effort,
        (req as any).cipherMode
      );
      
      expect(
        systemPrompt,
        `FABLE_BEHAVIOR should be present in: ${req.description}`
      ).toContain(FABLE_BEHAVIOR);
      
      // Also verify it contains the Metrixcom identity
      expect(systemPrompt).toContain("You are Metrixcom");
      expect(systemPrompt).toContain("Metrixcom Engine");
    }
  });

  it("maintains the Crux/Metrixcom branding within the injected prompt", () => {
    const systemPrompt = buildSystem(undefined, undefined, "medium");

    // The FABLE_BEHAVIOR itself is rebranded to Crux
    expect(systemPrompt).toContain("Crux can discuss virtually any topic");
    expect(systemPrompt).toContain("Crux cares deeply about child safety");
    
    // Ensure no legacy "Claude" mentions leaked in (except where explicitly allowed if any)
    const lowerPrompt = systemPrompt.toLowerCase();
    expect(lowerPrompt).not.toContain("anthropic");
    // "Claude" might be mentioned in model lists, but should not be the AI's identity
    expect(systemPrompt).not.toMatch(/I am Claude/i);
    expect(systemPrompt).not.toMatch(/My name is Claude/i);
  });

  it("does not turn a normal greeting into a visual or code-edit request", () => {
    const systemPrompt = buildSystem(undefined, undefined, "medium");

    expect(systemPrompt).not.toMatch(/visual[- ]edit/i);
    expect(systemPrompt).not.toMatch(/visual modifications/i);
    expect(systemPrompt).not.toMatch(/implementation requests always route to code changes/i);
  });
});
