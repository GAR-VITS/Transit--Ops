import api from "./api";

export const authService = {
  login: (data) => api.post("/auth/login", data),
  signup: (data) => api.post("/auth/signup", data),
  me: () => api.get("/auth/me"),
};
