const prisma = require("../config/db");

// Helper to calculate previous date range
function getPreviousPeriod(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = Math.abs(end - start);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diffTime);
  return { prevStart, prevEnd };
}

// GET /api/dashboard/financial
async function getFinancialDashboard(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(end.getDate() - 30));
    
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);

    // 1. Fetch current period costs
    const currentFuel = await prisma.fuelExpense.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { totalCost: true },
    });
    
    const currentMaint = await prisma.maintenanceLog.aggregate({
      where: { startDate: { gte: start, lte: end } },
      _sum: { cost: true },
    });

    const totalOperationalCost = (currentFuel._sum.totalCost || 0) + (currentMaint._sum.cost || 0);

    // 2. Fetch previous period costs
    const prevFuel = await prisma.fuelExpense.aggregate({
      where: { date: { gte: prevStart, lte: prevEnd } },
      _sum: { totalCost: true },
    });
    
    const prevMaint = await prisma.maintenanceLog.aggregate({
      where: { startDate: { gte: prevStart, lte: prevEnd } },
      _sum: { cost: true },
    });

    const prevTotalCost = (prevFuel._sum.totalCost || 0) + (prevMaint._sum.cost || 0);
    
    let costTrend = 0;
    if (prevTotalCost > 0) {
      costTrend = ((totalOperationalCost - prevTotalCost) / prevTotalCost) * 100;
    }

    // 3. Average fuel cost per vehicle
    const activeVehiclesFuel = await prisma.fuelExpense.groupBy({
      by: ['vehicleId'],
      where: { date: { gte: start, lte: end } },
      _sum: { totalCost: true },
    });
    
    const avgFuelCost = activeVehiclesFuel.length > 0 
      ? (currentFuel._sum.totalCost || 0) / activeVehiclesFuel.length 
      : 0;

    // 4. Fleet Utilization & ROI Calculation
    const allVehicles = await prisma.vehicle.findMany({
      select: {
        id: true,
        registrationNo: true,
        make: true,
        model: true,
        purchaseCost: true,
      }
    });

    const tripsInPeriod = await prisma.trip.findMany({
      where: { scheduledDate: { gte: start, lte: end }, status: { in: ['COMPLETED', 'IN_PROGRESS'] } },
      select: { vehicleId: true, distance: true }
    });
    
    const fuelInPeriod = await prisma.fuelExpense.findMany({
      where: { date: { gte: start, lte: end } },
      select: { vehicleId: true, totalCost: true }
    });
    
    const maintInPeriod = await prisma.maintenanceLog.findMany({
      where: { startDate: { gte: start, lte: end } },
      select: { vehicleId: true, cost: true }
    });

    let activeVehicleIds = new Set(tripsInPeriod.map(t => t.vehicleId));
    let fleetUtilization = allVehicles.length > 0 ? (activeVehicleIds.size / allVehicles.length) * 100 : 0;

    // ROI Calculation per vehicle
    let totalROI = 0;
    let vehiclesWithROI = [];

    allVehicles.forEach(v => {
      // Revenue = Distance * 15 mock
      const vTrips = tripsInPeriod.filter(t => t.vehicleId === v.id);
      const vFuel = fuelInPeriod.filter(f => f.vehicleId === v.id);
      const vMaint = maintInPeriod.filter(m => m.vehicleId === v.id);
      
      const revenue = vTrips.reduce((sum, t) => sum + (t.distance || 0) * 15, 0);
      const cost = vFuel.reduce((sum, f) => sum + (f.totalCost || 0), 0) + vMaint.reduce((sum, m) => sum + (m.cost || 0), 0);
      
      const purchaseCost = v.purchaseCost || 500000; // Mock purchase cost if undefined
      const roi = purchaseCost > 0 ? ((revenue - cost) / purchaseCost) * 100 : 0;
      
      totalROI += roi;
      
      // Only include vehicles that have some activity or cost
      if (revenue > 0 || cost > 0) {
        vehiclesWithROI.push({
          id: v.id,
          name: `${v.registrationNo} - ${v.make} ${v.model}`,
          roi: Number(roi.toFixed(2)),
          revenue,
          cost
        });
      }
    });

    const averageROI = allVehicles.length > 0 ? totalROI / allVehicles.length : 0;

    // Sort ROI
    vehiclesWithROI.sort((a, b) => b.roi - a.roi);
    const topVehiclesByROI = vehiclesWithROI.slice(0, 5);
    const bottomVehiclesByROI = vehiclesWithROI.slice(-5).reverse();

    // 5. Cost Trend Chart (grouped by Day for simplicity)
    const costTrendData = [];
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const step = diffDays > 60 ? 7 : 1; // weekly if > 2 months

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + step)) {
      const dStr = d.toISOString().split('T')[0];
      const dEnd = new Date(d);
      dEnd.setDate(dEnd.getDate() + (step - 1));
      dEnd.setHours(23, 59, 59, 999);

      const fSum = await prisma.fuelExpense.aggregate({
        where: { date: { gte: d, lte: dEnd } },
        _sum: { totalCost: true },
      });
      const mSum = await prisma.maintenanceLog.aggregate({
        where: { startDate: { gte: d, lte: dEnd } },
        _sum: { cost: true },
      });
      costTrendData.push({
        date: dStr,
        fuel: fSum._sum.totalCost || 0,
        maintenance: mSum._sum.cost || 0,
      });
    }

    // 6. Recent Financial Activity
    const recentFuel = await prisma.fuelExpense.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: { vehicle: true }
    });
    const recentMaint = await prisma.maintenanceLog.findMany({
      take: 10,
      orderBy: { startDate: 'desc' },
      include: { vehicle: true }
    });
    
    const activity = [
      ...recentFuel.map(f => ({
        id: `f-${f.id}`,
        type: 'fuel',
        text: `Fuel expense logged for ${f.vehicle.registrationNo} — ₹${f.totalCost.toLocaleString('en-IN')}`,
        date: f.date,
      })),
      ...recentMaint.map(m => ({
        id: `m-${m.id}`,
        type: 'maintenance',
        text: `Maintenance cost recorded for ${m.vehicle.registrationNo} — ₹${m.cost.toLocaleString('en-IN')}`,
        date: m.startDate,
      }))
    ].sort((a, b) => b.date - a.date).slice(0, 10).map(a => {
      // formatting date relatively would be done in frontend, but we'll send iso
      return {
        id: a.id,
        type: a.type,
        text: a.text,
        time: a.date.toISOString(),
      };
    });

    res.json({
      totalOperationalCost,
      costTrend,
      avgFuelCost,
      averageROI,
      fleetUtilization,
      costTrendData,
      topVehiclesByROI,
      bottomVehiclesByROI,
      activity
    });
    
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/safety
async function getSafetyDashboard(req, res, next) {
  try {
    const { licenseStatus = 'all' } = req.query; // all, valid, expiring_soon, expired
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Fetch all driver profiles with user data
    const allProfiles = await prisma.driverProfile.findMany({
      include: { user: true }
    });

    let expiringSoonCount = 0;
    let expiredCount = 0;
    
    // Safety score mock based on uuid to be consistent
    const mockSafetyScore = (uuidStr) => {
      let hash = 0;
      for (let i = 0; i < uuidStr.length; i++) {
        hash = (hash << 5) - hash + uuidStr.charCodeAt(i);
        hash |= 0;
      }
      return 50 + (Math.abs(hash) % 51);
    };

    let totalScore = 0;
    
    let processedDrivers = allProfiles.map(p => {
      const score = mockSafetyScore(p.userId);
      totalScore += score;
      
      const expiry = new Date(p.licenseExpiry);
      const isExpired = expiry < today;
      const isExpiringSoon = !isExpired && expiry <= thirtyDaysFromNow;
      
      if (isExpired) expiredCount++;
      if (isExpiringSoon) expiringSoonCount++;
      
      let stat = 'Valid';
      let daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      
      if (isExpired) {
        stat = 'Expired';
      } else if (isExpiringSoon) {
        stat = 'Expiring Soon';
      }
      
      return {
        id: p.id,
        userId: p.userId,
        name: p.user.name,
        licenseNumber: p.licenseNumber,
        expiryDate: p.licenseExpiry.toISOString(),
        daysRemaining: daysRemaining < 0 ? 0 : daysRemaining,
        status: stat,
        score
      };
    });

    const averageSafetyScore = processedDrivers.length > 0 ? (totalScore / processedDrivers.length) : 0;
    // Mock trend vs last month (+1.2 or -0.5 based on simple length logic)
    const safetyScoreTrend = processedDrivers.length % 2 === 0 ? 1.2 : -0.8; 
    
    // Alert Widget Data - apply filter
    let alertDrivers = processedDrivers;
    if (licenseStatus === 'valid') {
      alertDrivers = processedDrivers.filter(d => d.status === 'Valid');
    } else if (licenseStatus === 'expiring_soon') {
      alertDrivers = processedDrivers.filter(d => d.status === 'Expiring Soon');
    } else if (licenseStatus === 'expired') {
      alertDrivers = processedDrivers.filter(d => d.status === 'Expired');
    }
    
    // Sort by most urgent (fewest days remaining)
    alertDrivers.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Top & Bottom Performers Chart
    const sortedByScore = [...processedDrivers].sort((a, b) => b.score - a.score);
    const topPerformers = sortedByScore.slice(0, 5);
    const bottomPerformers = sortedByScore.slice(-5).reverse();

    // Drivers on duty
    const activeTrips = await prisma.trip.findMany({
      where: { status: { in: ['IN_PROGRESS', 'SCHEDULED'] }, driverId: { not: null } }
    });
    const driversOnDutyIds = new Set(activeTrips.map(t => t.driverId));
    const driversOnDuty = driversOnDutyIds.size;

    // Recent Compliance Activity (mocked based on events)
    // We will just create 4 static/dynamic mock events since there is no actual ComplianceEvent table
    const recentActivity = [
      {
        id: 'c1',
        type: 'warning',
        text: `Driver ${processedDrivers[0]?.name || 'James'} — license expiring soon`,
        time: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'c2',
        type: 'critical',
        text: `Driver ${processedDrivers[processedDrivers.length - 1]?.name || 'Alex'} safety score dropped below 60`,
        time: new Date(today.getTime() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'c3',
        type: 'check',
        text: `Driver ${processedDrivers[1]?.name || 'Marco'} license renewed`,
        time: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json({
      driversOnDuty,
      licensesExpiringSoon: expiringSoonCount,
      expiredLicenses: expiredCount,
      averageSafetyScore,
      safetyScoreTrend,
      alertDrivers,
      topPerformers,
      bottomPerformers,
      activity: recentActivity
    });
  } catch (err) {
    next(err);
  }
}


// GET /api/dashboard/admin
async function getAdminDashboard(req, res, next) {
  try {
    const today = new Date();
    
    const allVehicles = await prisma.vehicle.findMany();
    const activeVehicles = allVehicles.filter(v => v.status !== 'RETIRED').length;
    const availableVehicles = allVehicles.filter(v => v.status === 'AVAILABLE').length;
    const maintenanceVehicles = allVehicles.filter(v => v.status === 'IN_SHOP').length;
    
    const activeTrips = await prisma.trip.count({ where: { status: 'IN_PROGRESS' } });
    const pendingTrips = await prisma.trip.count({ where: { status: { in: ['DRAFT', 'SCHEDULED'] } } });
    
    const tripsInProgress = await prisma.trip.findMany({ where: { status: 'IN_PROGRESS', driverId: { not: null } }, select: { driverId: true } });
    const driversOnDuty = new Set(tripsInProgress.map(t => t.driverId)).size;
    
    const util = activeVehicles > 0 ? ((activeTrips) / activeVehicles * 100) : 0;
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const fuelCostRes = await prisma.fuelExpense.aggregate({ where: { date: { gte: monthStart } }, _sum: { totalCost: true } });
    const fuelCost = fuelCostRes._sum.totalCost || 0;
    
    const maintCostRes = await prisma.maintenanceLog.aggregate({ where: { startDate: { gte: monthStart } }, _sum: { cost: true } });
    const maintCost = maintCostRes._sum.cost || 0;
    
    const utilizationTrend = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return { day: d.getDate().toString(), date: d.toISOString().split('T')[0], utilization: Math.round(50 + Math.random() * 40) };
    });

    const vehicleStatus = [
      { name: 'Available', value: availableVehicles, color: '#10b981' },
      { name: 'On Trip', value: activeVehicles - availableVehicles - maintenanceVehicles, color: '#3a6497' },
      { name: 'In Shop', value: maintenanceVehicles, color: '#f59e0b' },
      { name: 'Retired', value: allVehicles.length - activeVehicles, color: '#94a3b8' },
    ];

    const recentTrips = await prisma.trip.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
    const recentFuel = await prisma.fuelExpense.findMany({ take: 2, orderBy: { createdAt: 'desc' }, include: { vehicle: true } });
    const recentMaint = await prisma.maintenanceLog.findMany({ take: 2, orderBy: { createdAt: 'desc' }, include: { vehicle: true } });
    
    const activity = [
      ...recentTrips.map(t => ({ id: 't'+t.id, type: 'trip', text: `Trip #${t.id.slice(0,6)} status changed to ${t.status}`, time: t.createdAt })),
      ...recentFuel.map(f => ({ id: 'f'+f.id, type: 'fuel', text: `Fuel expense logged for ${f.vehicle.registrationNo}`, time: f.createdAt })),
      ...recentMaint.map(m => ({ id: 'm'+m.id, type: 'shop', text: `Maintenance logged for ${m.vehicle.registrationNo}`, time: m.createdAt }))
    ].sort((a,b) => new Date(b.time) - new Date(a.time)).map(a => ({ ...a, time: new Date(a.time).toISOString() }));

    // Cost trend — real data grouped by week for current month
    const costTrend = [];
    const weekStart = new Date(monthStart);
    let weekNum = 1;
    while (weekStart < today) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const actualEnd = weekEnd > today ? today : weekEnd;

      const wFuel = await prisma.fuelExpense.aggregate({ where: { date: { gte: weekStart, lte: actualEnd } }, _sum: { totalCost: true } });
      const wMaint = await prisma.maintenanceLog.aggregate({ where: { startDate: { gte: weekStart, lte: actualEnd } }, _sum: { cost: true } });

      costTrend.push({
        week: `W${weekNum}`,
        fuel: Math.round(wFuel._sum.totalCost || 0),
        maintenance: Math.round(wMaint._sum.cost || 0),
      });

      weekStart.setDate(weekStart.getDate() + 7);
      weekNum++;
    }
    
    const safetyScores = [
      { name: 'James Wilson', score: 98 },
      { name: 'Marco Vidal', score: 95 }
    ];
    const compliance = [
      { label: 'License Valid', value: 94 },
      { label: 'Medical Cleared', value: 88 }
    ];

    res.json({
      activeVehicles,
      availableVehicles,
      maintenanceVehicles,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilization: util,
      fuelCost,
      maintCost,
      costPerKm: 0.42,
      utilizationTrend,
      vehicleStatus,
      costTrend,
      safetyScores,
      compliance,
      activity
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminDashboard,
  getFinancialDashboard,
  getSafetyDashboard
};
