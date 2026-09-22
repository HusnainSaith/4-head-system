// Add these three methods INSIDE the PartiesService class, before the closing brace

  /**
   * Create a party-to-party settlement transaction
   * Settles a payable party and a receivable party against each other
   * without involving Cash or Bank accounts.
   */
  async createPartySettlement(
    dto: CreatePartySettlementDto,
    actorId: string,
  ) {
    if (dto.payablePartyId === dto.receivablePartyId) {
      throw new BadRequestException(
        'Payable party and receivable party must be different',
      );
    }

    const [payablePartyResponse, receivablePartyResponse] = await Promise.all([
      this.findById(dto.payablePartyId),
      this.findById(dto.receivablePartyId),
    ]);

    const payableParty = payablePartyResponse.data;
    const receivableParty = receivablePartyResponse.data;

    const payableBalance = await this.ledgerService.getPartyDepartmentBalance(
      dto.payablePartyId,
      dto.departmentId,
    );
    const receivableBalance = await this.ledgerService.getPartyDepartmentBalance(
      dto.receivablePartyId,
      dto.departmentId,
    );

    const payableBalanceNum = Number(payableBalance ?? '0');
    const receivableBalanceNum = Number(receivableBalance ?? '0');

    if (payableBalanceNum <= 0) {
      throw new BadRequestException(
        `Payable party "${payableParty.name}" has no outstanding payable balance (current: ${payableBalanceNum})`,
      );
    }

    if (receivableBalanceNum >= 0) {
      throw new BadRequestException(
        `Receivable party "${receivableParty.name}" has no outstanding receivable balance (current: ${receivableBalanceNum})`,
      );
    }

    const maxSettlementAmount = Math.min(
      payableBalanceNum,
      Math.abs(receivableBalanceNum),
    );

    if (dto.settlementAmount > maxSettlementAmount) {
      throw new BadRequestException(
        `Settlement amount (${dto.settlementAmount}) exceeds maximum available (${maxSettlementAmount})`,
      );
    }

    const settlement = await this.dataSource.transaction(async (manager) => {
      const settlementRepo = manager.getRepository(PartySettlement);
      const settlementDate = dto.settlementDate
        ? new Date(dto.settlementDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const saved = await settlementRepo.save(
        settlementRepo.create({
          payablePartyId: dto.payablePartyId,
          receivablePartyId: dto.receivablePartyId,
          departmentId: dto.departmentId,
          settlementAmount: dto.settlementAmount.toFixed(2),
          settlementDate,
          reference: dto.reference,
          notes: dto.notes,
          status: 'active',
        }),
      );

      await this.ledgerService.post(
        [
          {
            departmentId: dto.departmentId,
            accountCode: 'accounts_payable',
            partyId: dto.payablePartyId,
            entryType: 'debit',
            amount: dto.settlementAmount.toFixed(2),
            entryDate: new Date(settlementDate),
            sourceType: 'party_adjustment',
            sourceId: saved.id,
            description: `Settlement with ${receivableParty.name}`,
            createdBy: actorId,
          },
          {
            departmentId: dto.departmentId,
            accountCode: 'accounts_receivable',
            partyId: dto.receivablePartyId,
            entryType: 'debit',
            amount: dto.settlementAmount.toFixed(2),
            entryDate: new Date(settlementDate),
            sourceType: 'party_adjustment',
            sourceId: saved.id,
            description: `Settlement with ${payableParty.name}`,
            createdBy: actorId,
          },
        ],
        manager,
      );

      return settlementRepo.findOneOrFail({
        where: { id: saved.id },
        relations: ['payableParty', 'receivableParty', 'department'],
      });
    });

    return {
      success: true,
      message: 'Party settlement created successfully',
      data: settlement,
    };
  }

  /**
   * Reverse a party settlement transaction
   */
  async reversePartySettlement(
    settlementId: string,
    reversalReason: string,
    actorId: string,
  ) {
    const settlement = await this.dataSource.getRepository(PartySettlement).findOne({
      where: { id: settlementId },
      relations: ['payableParty', 'receivableParty'],
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status === 'reversed') {
      throw new BadRequestException('Settlement is already reversed');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.ledgerService.reverseSource(
        'party_adjustment',
        settlementId,
        actorId,
        manager,
      );

      settlement.status = 'reversed';
      settlement.reversedAt = new Date();
      settlement.reversedBy = actorId;
      settlement.reversalReason = reversalReason;
      await manager.save(PartySettlement, settlement);
    });

    return {
      success: true,
      message: 'Party settlement reversed successfully',
      data: settlement,
    };
  }

  /**
   * Get settlement history for a party
   */
  async getPartySettlementHistory(partyId: string, departmentId?: string) {
    const query = this.dataSource
      .getRepository(PartySettlement)
      .createQueryBuilder('settlement')
      .where(
        '(settlement.payable_party_id = :partyId OR settlement.receivable_party_id = :partyId)',
        { partyId },
      )
      .leftJoinAndSelect('settlement.payableParty', 'payableParty')
      .leftJoinAndSelect('settlement.receivableParty', 'receivableParty')
      .leftJoinAndSelect('settlement.department', 'department')
      .orderBy('settlement.settlement_date', 'DESC')
      .addOrderBy('settlement.created_at', 'DESC');

    if (departmentId) {
      query.andWhere('settlement.department_id = :departmentId', {
        departmentId,
      });
    }

    const settlements = await query.getMany();

    return {
      success: true,
      message: 'Settlement history retrieved successfully',
      data: settlements,
    };
  }
