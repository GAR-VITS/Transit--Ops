/**
 * TransitOps Smart Match Utility
 * 
 * This is a pure, non-mutating layer that re-sorts available vehicles and drivers
 * to suggest the best fit. It does not filter out any items or block trip creation.
 */

export function sortVehiclesForSmartMatch(availableVehicles: any[], cargoWeight: string) {
  try {
    const weight = Number(cargoWeight);
    if (!cargoWeight || isNaN(weight) || weight <= 0) {
      return availableVehicles;
    }

    // Clone array to avoid mutating the original
    return [...availableVehicles].sort((a, b) => {
      const capA = a.capacity || 5000;
      const capB = b.capacity || 5000;
      
      // Calculate capacity difference (how much extra room is left)
      const diffA = capA - weight;
      const diffB = capB - weight;

      // If one vehicle can't carry the weight, rank it lower
      if (diffA < 0 && diffB >= 0) return 1;
      if (diffB < 0 && diffA >= 0) return -1;

      // Both can carry it: prefer the one with the smallest extra room
      if (diffA >= 0 && diffB >= 0) return diffA - diffB;

      // Both cannot carry it: prefer the one with the largest capacity (closest to carrying it)
      return diffB - diffA;
    });
  } catch (error) {
    console.warn("Smart Match vehicle sort failed, falling back to default.", error);
    return availableVehicles;
  }
}

export function sortDriversForSmartMatch(availableDrivers: any[]) {
  try {
    if (!availableDrivers || availableDrivers.length === 0) {
      return availableDrivers;
    }

    // Clone array to avoid mutating the original
    return [...availableDrivers].sort((a, b) => {
      // Sort by safety score descending, assuming safetyScore is a number
      // If it doesn't exist, treat as 0
      const scoreA = a.safetyScore || 0;
      const scoreB = b.safetyScore || 0;
      
      return scoreB - scoreA;
    });
  } catch (error) {
    console.warn("Smart Match driver sort failed, falling back to default.", error);
    return availableDrivers;
  }
}
