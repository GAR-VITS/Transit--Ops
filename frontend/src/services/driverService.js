import api from "./api";

export const driverService = {
  getAll: () => api.get("/drivers"),
  getById: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post("/drivers", data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  remove: (id) => api.delete(`/drivers/${id}`),
  onboard: (data) => api.post("/drivers/onboard", data),
};
