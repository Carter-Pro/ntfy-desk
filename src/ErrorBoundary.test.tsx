import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { type ReactNode } from "react";
import ErrorBoundary from "./ErrorBoundary";

function BrokenComponent(): ReactNode {
  throw new Error("test crash");
}

afterEach(() => cleanup());

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(<ErrorBoundary><div>Hello</div></ErrorBoundary>);
    expect(screen.getByText("Hello")).toBeDefined();
  });

  it("renders fallback UI when child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><BrokenComponent /></ErrorBoundary>);
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("test crash")).toBeDefined();
    vi.restoreAllMocks();
  });
});
