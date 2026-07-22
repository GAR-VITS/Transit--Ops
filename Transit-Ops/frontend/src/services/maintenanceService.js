import api from "./api";

export const maintenanceService = {
  getAll: () => api.get("/maintenance"),
  getById: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post("/maintenance", data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  remove: (id) => api.delete(`/maintenance/${id}`),
  getRiskScores: () => api.get("/maintenance/risk-scores"),
};
