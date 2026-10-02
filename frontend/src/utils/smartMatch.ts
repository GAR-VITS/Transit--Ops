export function sortVehiclesForSmartMatch(availableVehicles: any[], cargoWeight: string) {
  try {
    const weight = Number(cargoWeight);
    if (!cargoWeight || isNaN(weight) || weight <= 0) {
      return availableVehicles;
    }

    return [...availableVehicles].sort((a, b) => {
      const capA = a.capacity || 5000;
      const capB = b.capacity || 5000;
      
      const diffA = capA - weight;
      const diffB = capB - weight;

      if (diffA < 0 && diffB >= 0) return 1;
      if (diffB < 0 && diffA >= 0) return -1;

      if (diffA >= 0 && diffB >= 0) return diffA - diffB;

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

    return [...availableDrivers].sort((a, b) => {
      const scoreA = a.safetyScore || 0;
      const scoreB = b.safetyScore || 0;
      
      return scoreB - scoreA;
    });
  } catch (error) {
    console.warn("Smart Match driver sort failed, falling back to default.", error);
    return availableDrivers;
  }
}
