import api from "./api";

export const fuelExpenseService = {
  getAll: () => api.get("/fuel-expenses"),
  getById: (id) => api.get(`/fuel-expenses/${id}`),
  create: (data) => api.post("/fuel-expenses", data),
  update: (id, data) => api.put(`/fuel-expenses/${id}`, data),
  remove: (id) => api.delete(`/fuel-expenses/${id}`),
};
