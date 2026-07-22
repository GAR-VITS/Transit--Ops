// RBAC Configuration Matrix
// Maps Entity -> Action -> Array of Allowed Roles
// Roles: ADMIN, MANAGER, DRIVER, SAFETY_OFFICER, FINANCIAL_ANALYST

module.exports = {
  VEHICLES: {
    READ: ['ADMIN', 'MANAGER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'],
    READ_COST: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST'],
    WRITE: ['ADMIN', 'MANAGER']
  },
  DRIVERS: {
    READ: ['ADMIN', 'MANAGER', 'SAFETY_OFFICER', 'DRIVER', 'FINANCIAL_ANALYST'], // Driver sees own profile only (handled in controller)
    WRITE: ['ADMIN', 'MANAGER', 'DRIVER'] // Driver edits own profile only (handled in controller)
  },
  TRIPS: {
    READ: ['ADMIN', 'MANAGER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST', 'DRIVER'], // Driver sees own trips
    WRITE: ['ADMIN', 'MANAGER', 'DRIVER'] // Driver creates/edits own trips
  },
  MAINTENANCE: {
    READ: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST', 'DRIVER', 'SAFETY_OFFICER'], // Driver sees own assigned vehicle logs without cost
    READ_COST: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST'],
    WRITE: ['ADMIN', 'MANAGER']
  },
  FUEL: {
    READ: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST', 'DRIVER', 'SAFETY_OFFICER'], // Driver sees own entries
    WRITE: ['ADMIN', 'MANAGER', 'DRIVER'] // Driver adds for own vehicle
  },
  REPORTS: {
    FINANCIAL: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST'],
    COMPLIANCE: ['ADMIN', 'MANAGER', 'SAFETY_OFFICER'],
    EXPORT: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST']
  },
  USERS: {
    READ: ['ADMIN'],
    WRITE: ['ADMIN']
  }
};
