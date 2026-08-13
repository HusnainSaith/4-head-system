import type { ApiResponse } from "@/types/api";
export type VehicleType = "truck" | "van" | "car" | "motorcycle" | "other";
export type VehiclePaymentMethod = "cash" | "bank";
export interface DepartmentSummary {
  id: string;
  name: string;
  type: string;
}
export interface Vehicle {
  id: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  driverName?: string | null;
  driverUserId?: string | null;
  departmentId: string;
  department?: DepartmentSummary;
  notes?: string | null;
  model?: string | null;
  year?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
export interface CreateVehicleRequest {
  registrationNumber: string;
  vehicleType: VehicleType;
  driverUserId?: string;
  departmentId: string;
  notes?: string;
  model?: string;
  year?: number;
}
export interface VehicleFuelLog {
  id: string;
  vehicleId: string;
  fuelDate: string;
  liters: string;
  ratePerLiter: string;
  totalAmount: string;
  odometerReading?: string | null;
  paymentMethod: VehiclePaymentMethod;
  notes?: string | null;
}
export interface CreateFuelLogRequest {
  fuelDate: string;
  liters: number;
  ratePerLiter: number;
  odometerReading?: number;
  paymentMethod: VehiclePaymentMethod;
  notes?: string;
}
export interface VehicleMaintenanceLog {
  id: string;
  vehicleId: string;
  maintenanceDate: string;
  maintenanceType: string;
  description?: string | null;
  cost: string;
  vendorName?: string | null;
  paymentMethod: VehiclePaymentMethod;
}
export interface CreateMaintenanceLogRequest {
  maintenanceDate: string;
  maintenanceType: string;
  description?: string;
  cost: number;
  vendorName?: string;
  paymentMethod: VehiclePaymentMethod;
}
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
export type VehiclesResponse = ApiResponse<{
  items: Vehicle[];
  pagination: Pagination;
}>;
