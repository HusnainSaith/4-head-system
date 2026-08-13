import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from '../services/vehicles.service';

describe('VehiclesController', () => {
  let controller: VehiclesController;
  let service: Partial<VehiclesService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    controller = new VehiclesController(service as VehiclesService);
  });

  it('forwards create to the vehicles service', async () => {
    const dto = {
      registrationNumber: 'ABC123',
      type: 'TRUCK',
      model: 'X',
      year: 2020,
      department: 'BROKERAGE',
    } as any;
    const response = {
      success: true,
      message: 'Vehicle created',
      data: { id: '1' },
    };
    (service.create as jest.Mock).mockResolvedValue(response);

    await expect(controller.create(dto)).resolves.toEqual(response);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('parses page and limit as numbers for findAll', async () => {
    const response = {
      success: true,
      message: 'Vehicles retrieved',
      data: [],
      meta: { total: 0, page: 2, limit: 5 },
    };
    (service.findAll as jest.Mock).mockResolvedValue(response);

    await expect(controller.findAll('2', '5')).resolves.toEqual(response);
    expect(service.findAll).toHaveBeenCalledWith(2, 5, undefined);
  });

  it('forwards the department filter for selector scoping', async () => {
    (service.findAll as jest.Mock).mockResolvedValue({ data: { items: [] } });

    await controller.findAll('1', '100', 'department-1');

    expect(service.findAll).toHaveBeenCalledWith(1, 100, 'department-1');
  });

  it('forwards findOne to the vehicles service', async () => {
    const response = {
      success: true,
      message: 'Vehicle retrieved',
      data: { id: '1' },
    };
    (service.findOne as jest.Mock).mockResolvedValue(response);

    await expect(controller.findOne('1')).resolves.toEqual(response);
    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('propagates service errors from create', async () => {
    const error = new Error('service failure');
    (service.create as jest.Mock).mockRejectedValue(error);

    await expect(controller.create({} as any)).rejects.toThrow(error);
  });
});
