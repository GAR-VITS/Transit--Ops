export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired'
export type VehicleType = 'Truck' | 'Van' | 'Bike' | 'Trailer' | 'Car'

export type Vehicle = {
  id: string
  reg: string
  model: string
  type: VehicleType
  capacityKg: number
  odometerKm: number
  costInr: number // acquisition cost, rupees
  status: VehicleStatus
}

export const STATUS_STYLES: Record<VehicleStatus, string> = {
  Available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'On Trip': 'bg-navy-100 text-navy-800 ring-navy-700/20',
  'In Shop': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Retired: 'bg-slate-100 text-slate-500 ring-slate-500/20',
}

export const VEHICLE_TYPES: VehicleType[] = ['Truck', 'Van', 'Bike', 'Trailer', 'Car']
export const VEHICLE_STATUSES: VehicleStatus[] = ['Available', 'On Trip', 'In Shop', 'Retired']

export const VEHICLES: Vehicle[] = [
  { id: 'v1', reg: 'RJ-14-AB-1234', model: 'Tata Ace Gold', type: 'Van', capacityKg: 750, odometerKm: 48210, costInr: 585000, status: 'Available' },
  { id: 'v2', reg: 'MH-12-CX-9087', model: 'Ashok Leyland Dost', type: 'Van', capacityKg: 1250, odometerKm: 132540, costInr: 812000, status: 'On Trip' },
  { id: 'v3', reg: 'KA-05-MN-4412', model: 'Tata LPT 1109', type: 'Truck', capacityKg: 9000, odometerKm: 204880, costInr: 1845000, status: 'In Shop' },
  { id: 'v4', reg: 'DL-01-PA-7765', model: 'Mahindra Furio 7', type: 'Truck', capacityKg: 7500, odometerKm: 89760, costInr: 1620000, status: 'Available' },
  { id: 'v5', reg: 'TN-22-BK-3391', model: 'Hero Lectro C5', type: 'Bike', capacityKg: 120, odometerKm: 12430, costInr: 68000, status: 'On Trip' },
  { id: 'v6', reg: 'GJ-18-TR-5540', model: 'Bharat Benz 3528', type: 'Trailer', capacityKg: 28000, odometerKm: 312090, costInr: 4250000, status: 'Available' },
  { id: 'v7', reg: 'UP-32-VN-2218', model: 'Maruti Super Carry', type: 'Van', capacityKg: 740, odometerKm: 56720, costInr: 545000, status: 'Retired' },
  { id: 'v8', reg: 'RJ-14-AB-8890', model: 'Tata Intra V30', type: 'Van', capacityKg: 1300, odometerKm: 41200, costInr: 895000, status: 'Available' },
  { id: 'v9', reg: 'MH-04-CT-1102', model: 'Eicher Pro 2049', type: 'Truck', capacityKg: 5000, odometerKm: 167340, costInr: 1390000, status: 'On Trip' },
  { id: 'v10', reg: 'KA-51-BZ-6674', model: 'Ola S1 Pro', type: 'Bike', capacityKg: 90, odometerKm: 8940, costInr: 132000, status: 'In Shop' },
  { id: 'v11', reg: 'DL-08-CA-3320', model: 'Tata Nexon EV Fleet', type: 'Car', capacityKg: 400, odometerKm: 33110, costInr: 1490000, status: 'Available' },
  { id: 'v12', reg: 'HR-26-TX-9981', model: 'Ashok Leyland 1920', type: 'Truck', capacityKg: 11000, odometerKm: 258630, costInr: 2180000, status: 'On Trip' },
]

export const tripHistory = [
  { id: 'T-1042', route: 'Depot North → Region B', date: 'Jul 09', km: 342, status: 'Completed' },
  { id: 'T-1021', route: 'Region A → Depot East', date: 'Jul 06', km: 128, status: 'Completed' },
  { id: 'T-0994', route: 'Depot North → Region D', date: 'Jul 02', km: 511, status: 'Completed' },
]

export const maintHistory = [
  { id: 'M-318', work: 'Brake pad replacement', date: 'Jun 28', cost: 8400 },
  { id: 'M-291', work: 'Scheduled service (40k km)', date: 'May 12', cost: 14200 },
  { id: 'M-255', work: 'Tyre rotation + alignment', date: 'Apr 03', cost: 3600 },
]

export const inr = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
