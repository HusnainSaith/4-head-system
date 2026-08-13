// Movement type - describes the direction of stock flow
export enum StockMovementTypeEnum {
  PURCHASE_IN = 'purchase_in',
  SALE_OUT = 'sale_out',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  WRITEOFF_OUT = 'writeoff_out',
  OPENING_STOCK = 'opening_stock',
  PROCESSING_LOSS_OUT = 'processing_loss_out',
  DRESSING_OUT = 'dressing_out',
  DRESSING_IN = 'dressing_in',
}

// Source type - describes what business transaction caused the movement
export enum StockMovementSourceEnum {
  PURCHASE = 'purchase',
  SALE = 'sale',
  INTERNAL_TRANSFER = 'internal_transfer',
  STOCK_WRITEOFF = 'stock_writeoff',
  OPENING_BALANCE = 'opening_balance',
  BONUS = 'bonus',
  ADVANCE = 'advance',
  SALARY = 'salary',
  EXPENSE = 'expense',
  VEHICLE_FUEL = 'vehicle_fuel',
  VEHICLE_MAINTENANCE = 'vehicle_maintenance',
  DRESSING_BATCH = 'dressing_batch',
}
