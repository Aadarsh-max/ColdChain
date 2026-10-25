import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../src/middleware/auth.js", () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: "1",
      email: "admin@test.local",
      name: "Test Admin",
      role: "admin",
    };
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

vi.mock("../src/services/deviceQueryService.js", () => ({
  listDevices: vi.fn(),
  getDeviceOverview: vi.fn(),
  getLatestReading: vi.fn(),
  listReadings: vi.fn(),
}));
vi.mock("../src/services/alertQueryService.js", () => ({
  listAlerts: vi.fn(),
  acknowledgeAlert: vi.fn(),
}));
vi.mock("../src/services/analyticsService.js", () => ({ getSeries: vi.fn() }));
vi.mock("../src/services/shipmentService.js", () => ({
  listShipments: vi.fn(),
  getShipmentDetail: vi.fn(),
  createShipment: vi.fn(),
  updateShipment: vi.fn(),
  getShipmentHistory: vi.fn(),
  listShipmentReadings: vi.fn(),
}));
vi.mock("../src/services/dashboardService.js", () => ({
  getDashboardSummary: vi.fn(),
}));
vi.mock("../src/services/settingsAdminService.js", () => ({
  getSettingsDoc: vi.fn(),
  updateSettings: vi.fn(),
}));
vi.mock("../src/services/reportService.js", () => ({
  getShipmentSummary: vi.fn(),
  streamReadingsCsv: vi.fn(),
  streamAlertsCsv: vi.fn(),
}));

import app from "../src/app.js";
import {
  listDevices,
  getLatestReading,
  listReadings,
} from "../src/services/deviceQueryService.js";
import {
  listAlerts,
  acknowledgeAlert,
} from "../src/services/alertQueryService.js";
import {
  createShipment,
  updateShipment,
  getShipmentDetail,
} from "../src/services/shipmentService.js";
import { getDashboardSummary } from "../src/services/dashboardService.js";
import { updateSettings } from "../src/services/settingsAdminService.js";
import { streamReadingsCsv } from "../src/services/reportService.js";

const validShipment = {
  shipmentId: "CC1024",
  productName: "Medicine",
  minTempC: 10,
  maxTempC: 15,
  origin: { name: "Palghar" },
  destination: { name: "Mumbai" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("general", () => {
  it("reports degraded health when the database is not connected", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.services.database).toBe("disconnected");
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nothing");
    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain("Route not found");
  });

  it("rejects malformed JSON bodies", async () => {
    const res = await request(app)
      .post("/api/shipments")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Malformed JSON body");
  });
});

describe("devices", () => {
  it("lists devices", async () => {
    listDevices.mockResolvedValue([{ deviceId: "CC-001" }]);
    const res = await request(app).get("/api/devices");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("rejects an invalid device id", async () => {
    const res = await request(app).get("/api/devices/a%20b");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  it("returns 404 when a device has no latest reading", async () => {
    getLatestReading.mockResolvedValue(null);
    const res = await request(app).get("/api/devices/CC-001/latest");
    expect(res.status).toBe(404);
  });

  it("passes parsed query parameters to the readings service", async () => {
    listReadings.mockResolvedValue({
      data: [],
      meta: { page: 2, limit: 10, total: 0, pages: 1 },
    });
    const res = await request(app).get(
      "/api/devices/CC-001/readings?page=2&limit=10&isSimulated=true&sort=asc&from=2026-10-01",
    );
    expect(res.status).toBe(200);
    const [base, query] = listReadings.mock.calls[0];
    expect(base).toEqual({ deviceId: "CC-001" });
    expect(query.page).toBe(2);
    expect(query.limit).toBe(10);
    expect(query.isSimulated).toBe(true);
    expect(query.sort).toBe("asc");
    expect(query.from).toBeInstanceOf(Date);
  });

  it("rejects limits above 500", async () => {
    const res = await request(app).get(
      "/api/devices/CC-001/readings?limit=1000",
    );
    expect(res.status).toBe(400);
  });

  it("rejects a reversed date range", async () => {
    const res = await request(app).get(
      "/api/devices/CC-001/readings?from=2026-10-18&to=2026-10-01",
    );
    expect(res.status).toBe(400);
  });

  it("rejects series ranges over 90 days", async () => {
    const res = await request(app).get(
      "/api/devices/CC-001/series?from=2026-01-01&to=2026-10-01",
    );
    expect(res.status).toBe(400);
  });
});

describe("shipments", () => {
  it("creates a shipment and returns 201", async () => {
    createShipment.mockResolvedValue({ shipmentId: "CC1024" });
    const res = await request(app).post("/api/shipments").send(validShipment);
    expect(res.status).toBe(201);
    expect(createShipment).toHaveBeenCalledTimes(1);
    expect(createShipment.mock.calls[0][0].productName).toBe("Medicine");
  });

  it("rejects a shipment whose min temperature is not below max", async () => {
    const res = await request(app)
      .post("/api/shipments")
      .send({ ...validShipment, minTempC: 16 });
    expect(res.status).toBe(400);
    expect(createShipment).not.toHaveBeenCalled();
  });

  it("rejects empty patch bodies", async () => {
    const res = await request(app).patch("/api/shipments/CC1024").send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 when patching a missing shipment", async () => {
    updateShipment.mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/shipments/NOPE123")
      .send({ status: "delivered" });
    expect(res.status).toBe(404);
  });

  it("returns 404 for a missing shipment detail", async () => {
    getShipmentDetail.mockResolvedValue(null);
    const res = await request(app).get("/api/shipments/NOPE123");
    expect(res.status).toBe(404);
  });
});

describe("alerts", () => {
  it("rejects an unknown severity filter", async () => {
    const res = await request(app).get("/api/alerts?severity=bad");
    expect(res.status).toBe(400);
  });

  it("lists alerts with filters", async () => {
    listAlerts.mockResolvedValue({ data: [], meta: {}, summary: {} });
    const res = await request(app).get(
      "/api/alerts?type=lid_opened&deviceId=CC-001&acknowledged=false",
    );
    expect(res.status).toBe(200);
    expect(listAlerts.mock.calls[0][0].acknowledged).toBe(false);
  });

  it("rejects a malformed alert id", async () => {
    const res = await request(app)
      .patch("/api/alerts/123/acknowledge")
      .send({});
    expect(res.status).toBe(400);
  });

  it("acknowledges an alert", async () => {
    acknowledgeAlert.mockResolvedValue({ acknowledged: true });
    const res = await request(app)
      .patch("/api/alerts/507f1f77bcf86cd799439011/acknowledge")
      .send({ acknowledgedBy: "Aadarsh" });
    expect(res.status).toBe(200);
    expect(acknowledgeAlert).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "Test Admin",
    );
  });

  it("returns 404 when the alert does not exist", async () => {
    acknowledgeAlert.mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/alerts/507f1f77bcf86cd799439011/acknowledge")
      .send({});
    expect(res.status).toBe(404);
  });
});

describe("dashboard and settings", () => {
  it("returns the dashboard summary", async () => {
    getDashboardSummary.mockResolvedValue({ devices: { total: 1 } });
    const res = await request(app).get("/api/dashboard/summary");
    expect(res.status).toBe(200);
    expect(res.body.data.devices.total).toBe(1);
  });

  it("rejects out of range settings", async () => {
    const res = await request(app)
      .patch("/api/settings")
      .send({ lowBatteryPct: 500 });
    expect(res.status).toBe(400);
  });

  it("rejects unknown settings keys", async () => {
    const res = await request(app)
      .patch("/api/settings")
      .send({ hacked: true });
    expect(res.status).toBe(400);
  });

  it("updates valid settings", async () => {
    updateSettings.mockResolvedValue({ hysteresisC: 0.5 });
    const res = await request(app)
      .patch("/api/settings")
      .send({ hysteresisC: 0.5 });
    expect(res.status).toBe(200);
    expect(updateSettings).toHaveBeenCalledWith({ hysteresisC: 0.5 });
  });
});

describe("reports", () => {
  it("requires a device or shipment for the readings CSV", async () => {
    const res = await request(app).get("/api/reports/readings.csv");
    expect(res.status).toBe(400);
  });

  it("streams a CSV for a valid request", async () => {
    streamReadingsCsv.mockImplementation(async (res) => {
      res.type("text/csv").send("a,b\r\n");
    });
    const res = await request(app).get(
      "/api/reports/readings.csv?deviceId=CC-001",
    );
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
  });
});
