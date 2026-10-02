import api from "./api";

export const tripService = {
  getAll: () => api.get("/trips"),
  getById: (id) => api.get(`/trips/${id}`),
  create: (data) => api.post("/trips", data),
  update: (id, data) => api.put(`/trips/${id}`, data),
  remove: (id) => api.delete(`/trips/${id}`),
};
