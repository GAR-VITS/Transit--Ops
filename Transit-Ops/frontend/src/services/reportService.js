import api from "./api";

export const reportService = {
  getSummary: () => api.get("/reports/summary"),
  getFleetUtilization: () => api.get("/reports/fleet-utilization"),
  getFuelEfficiency: () => api.get("/reports/fuel-efficiency"),
  getVehicleROI: () => api.get("/reports/vehicle-roi"),
  exportCSV: (type) =>
    api.get(`/reports/export/${type}`, { responseType: "blob" }),
};
