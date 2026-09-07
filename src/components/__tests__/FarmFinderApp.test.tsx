import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FarmFinderApp } from "../FarmFinderApp";

describe("FarmFinderApp", () => {
  it("renders search results and an accessible map fallback", () => {
    render(<FarmFinderApp />);

    expect(screen.getByRole("heading", { name: /find farms selling/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /1 matching farms/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /accessible maplibre abstraction/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /green valley pastures/i })).toHaveAttribute(
      "href",
      "/farms/green-valley-pastures",
    );
  });

  it("shows a clear geolocation-denied state without blocking ZIP search", async () => {
    const geolocation = {
      getCurrentPosition: vi.fn().mockImplementation((_success, error) => {
        error({ code: 1, PERMISSION_DENIED: 1 });
      }),
    };

    vi.stubGlobal("navigator", { geolocation });
    render(<FarmFinderApp />);

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      expect(screen.getByText(/location permission was denied/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/zip code or city/i)).toBeEnabled();

    vi.unstubAllGlobals();
  });
});
