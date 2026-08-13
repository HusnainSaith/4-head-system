export interface IVehiclesRepository {
  findAll(departmentId?: string): Promise<any[]>;
  findById(id: string): Promise<any>;
  save(data: any): Promise<any>;
  softDelete(id: string): Promise<void>;
  saveFuelLog(data: any, manager?: any): Promise<any>;
  saveMaintenanceLog(data: any, manager?: any): Promise<any>;
}
