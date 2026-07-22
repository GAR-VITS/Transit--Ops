import api from "./api";

export const vehicleService = {
  getAll: () => api.get("/vehicles"),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post("/vehicles", data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  remove: (id) => api.delete(`/vehicles/${id}`),
};
