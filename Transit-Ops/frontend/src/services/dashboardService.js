import api from "./api";

export const dashboardService = {
  getFinancial: (startDate, endDate) => {
    let url = "/dashboard/financial";
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    return api.get(url);
  },
  getSafety: (licenseStatus) => {
    let url = "/dashboard/safety";
    if (licenseStatus) {
      url += `?licenseStatus=${licenseStatus}`;
    }
    return api.get(url);
  },
  getAdmin: () => {
    return api.get("/dashboard/admin");
  }
};
