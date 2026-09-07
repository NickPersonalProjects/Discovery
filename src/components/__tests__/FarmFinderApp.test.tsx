import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { FarmFinderApp } from "../FarmFinderApp";

const mockResponse = {
  results: [
    {
      farm: {
        id: "farm-green-valley",
        slug: "green-valley-pastures",
        name: "Green Valley Pastures",
        description: "Demo",
        address: { street: "", city: "Lancaster", state: "PA", postalCode: "17602", country: "US" },
        coordinates: { latitude: 40.0379, longitude: -76.3055 },
        socialLinks: [],
        visitInfo: "",
        hours: "",
        seasonalAvailability: "",
        products: [],
        salesMethods: ["pickup"],
        practiceClaims: [],
        claimStatus: "unclaimed",
        publicationStatus: "published",
        verificationStatus: "admin-verified",
        lastVerifiedAt: "2026-01-01T00:00:00.000Z",
        sourceRecords: [],
        isFictionalSeed: false,
      },
      distanceMiles: 1,
    },
  ],
  total: 1,
  page: 1,
  limit: 25,
};

describe("FarmFinderApp", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => mockResponse,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders async search results and map fallback", async () => {
    render(<FarmFinderApp />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /1 matching farms/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: /accessible maplibre abstraction/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /green valley pastures/i })).toHaveAttribute(
      "href",
      "/farms/green-valley-pastures",
    );
  });

  it("shows a clear geolocation-denied state", async () => {
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
  });
});
