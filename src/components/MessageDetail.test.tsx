import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import MessageDetail from "./MessageDetail";
import type { Message } from "../types";

const msg: Message = {
  id: 1,
  subscription_id: 1,
  title: "Test Title",
  body: "Test body content",
  timestamp: "2025-01-01T00:00:00Z",
  received_at: "2025-01-01T00:00:00Z",
  is_read: false,
};

afterEach(cleanup);

describe("MessageDetail", () => {
  it("renders message title and body", () => {
    render(<MessageDetail message={msg} onDelete={vi.fn()} onMarkRead={vi.fn()} />);
    expect(screen.getByText("Test Title")).toBeDefined();
    expect(screen.getByText("Test body content")).toBeDefined();
  });

  it("renders (no title) when title is null", () => {
    render(<MessageDetail message={{ ...msg, title: null }} onDelete={vi.fn()} onMarkRead={vi.fn()} />);
    expect(screen.getByText("(no title)")).toBeDefined();
  });

  it("calls onDelete when Delete button clicked", () => {
    const onDelete = vi.fn();
    render(<MessageDetail message={msg} onDelete={onDelete} onMarkRead={vi.fn()} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("calls onMarkRead when Mark Read button clicked", () => {
    const onMarkRead = vi.fn();
    render(<MessageDetail message={msg} onDelete={vi.fn()} onMarkRead={onMarkRead} />);
    fireEvent.click(screen.getByText("Mark Read"));
    expect(onMarkRead).toHaveBeenCalledOnce();
  });

  it("hides Mark Read button when message is already read", () => {
    render(<MessageDetail message={{ ...msg, is_read: true }} onDelete={vi.fn()} onMarkRead={vi.fn()} />);
    expect(screen.queryByText("Mark Read")).toBeNull();
  });
});
