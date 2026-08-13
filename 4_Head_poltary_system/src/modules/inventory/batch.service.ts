export class BatchService {
  // minimal stub for compilation
  async findOne(_id: string) {
    return null;
  }

  async quarantine(_batchId: string, _reason?: string) {
    // stub: mark batch as quarantined (no-op for compilation)
    return null;
  }
}
