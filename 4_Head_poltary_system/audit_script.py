import os,re
from pathlib import Path
root=Path('src')
required=[
'main.ts','app.module.ts','config/database.config.ts','config/jwt.config.ts','config/app.config.ts',
'common/decorators/current-user.decorator.ts','common/decorators/roles.decorator.ts','common/guards/jwt-auth.guard.ts','common/guards/roles.guard.ts','common/guards/department-scope.guard.ts',
'common/interceptors/audit.interceptor.ts','common/filters/http-exception.filter.ts','common/pipes/validation.pipe.ts','common/dto/pagination.dto.ts','common/types/department-code.enum.ts','common/types/party-type.enum.ts',
'common/types/payment-method.enum.ts','common/types/movement-type.enum.ts','common/types/account-code.enum.ts','common/entities/audit-base.entity.ts','modules/auth/auth.module.ts','modules/auth/auth.controller.ts',
'modules/auth/auth.service.ts','modules/auth/strategies/jwt.strategy.ts','modules/auth/strategies/jwt-refresh.strategy.ts','modules/auth/dto/login.dto.ts','modules/auth/dto/refresh-token.dto.ts','modules/users/users.module.ts','modules/users/users.controller.ts',
'modules/users/users.service.ts','modules/users/users.repository.ts','modules/users/interfaces/users-repository.interface.ts','modules/users/entities/user.entity.ts','modules/users/dto/create-user.dto.ts','modules/users/dto/update-user.dto.ts',
'modules/departments/departments.module.ts','modules/departments/departments.service.ts','modules/departments/departments.repository.ts','modules/departments/interfaces/departments-repository.interface.ts','modules/departments/entities/department.entity.ts',
'modules/parties/parties.module.ts','modules/parties/parties.controller.ts','modules/parties/parties.service.ts','modules/parties/parties.repository.ts','modules/parties/interfaces/parties-repository.interface.ts','modules/parties/entities/party.entity.ts',
'modules/parties/dto/create-party.dto.ts','modules/parties/dto/update-party.dto.ts','modules/parties/dto/party-statement-query.dto.ts','modules/ledger/ledger.module.ts','modules/ledger/ledger.service.ts','modules/ledger/ledger.repository.ts',
'modules/ledger/interfaces/ledger-repository.interface.ts','modules/ledger/entities/ledger-entry.entity.ts','modules/ledger/entities/chart-of-account.entity.ts','modules/ledger/dto/create-ledger-entry.dto.ts','modules/inventory/inventory.module.ts','modules/inventory/inventory.service.ts',
'modules/inventory/inventory.repository.ts','modules/inventory/interfaces/inventory-repository.interface.ts','modules/inventory/entities/stock-balance.entity.ts','modules/inventory/entities/stock-movement.entity.ts','modules/inventory/dto/stock-writeoff.dto.ts','modules/vehicles/vehicles.module.ts',
'modules/vehicles/vehicles.controller.ts','modules/vehicles/vehicles.service.ts','modules/vehicles/vehicles.repository.ts','modules/vehicles/interfaces/vehicles-repository.interface.ts','modules/vehicles/entities/vehicle.entity.ts','modules/vehicles/entities/vehicle-fuel-log.entity.ts',
'modules/vehicles/entities/vehicle-maintenance-log.entity.ts','modules/vehicles/dto/create-vehicle.dto.ts','modules/vehicles/dto/create-fuel-log.dto.ts','modules/vehicles/dto/create-maintenance-log.dto.ts','modules/employees/employees.module.ts','modules/employees/employees.controller.ts',
'modules/employees/employees.service.ts','modules/employees/employees.repository.ts','modules/employees/interfaces/employees-repository.interface.ts','modules/employees/entities/employee.entity.ts','modules/employees/entities/employee-advance.entity.ts','modules/employees/entities/employee-bonus.entity.ts',
'modules/employees/entities/salary-run.entity.ts','modules/employees/dto/create-employee.dto.ts','modules/employees/dto/create-advance.dto.ts','modules/employees/dto/create-bonus.dto.ts','modules/employees/dto/run-payroll.dto.ts','modules/expenses/expenses.module.ts',
'modules/expenses/expenses.controller.ts','modules/expenses/expenses.service.ts','modules/expenses/expenses.repository.ts','modules/expenses/interfaces/expenses-repository.interface.ts','modules/expenses/entities/expense.entity.ts','modules/expenses/entities/expense-category.entity.ts',
'modules/expenses/dto/create-expense.dto.ts','modules/expenses/dto/create-expense-category.dto.ts','modules/brokerage/brokerage.module.ts','modules/brokerage/brokerage.controller.ts','modules/brokerage/brokerage.service.ts','modules/brokerage/brokerage.repository.ts',
'modules/brokerage/interfaces/brokerage-repository.interface.ts','modules/brokerage/entities/brokerage-purchase.entity.ts','modules/brokerage/entities/brokerage-sale.entity.ts','modules/brokerage/dto/create-brokerage-purchase.dto.ts','modules/brokerage/dto/create-brokerage-sale.dto.ts','modules/supply/supply.module.ts',
'modules/supply/supply.controller.ts','modules/supply/supply.service.ts','modules/supply/supply.repository.ts','modules/supply/interfaces/supply-repository.interface.ts','modules/supply/entities/supply-purchase.entity.ts','modules/supply/entities/supply-sale.entity.ts',
'modules/supply/entities/internal-transfer.entity.ts','modules/supply/dto/create-supply-purchase.dto.ts','modules/supply/dto/create-supply-sale.dto.ts','modules/supply/dto/create-internal-transfer.dto.ts','modules/supply/dto/settle-internal-transfer.dto.ts','modules/wastage/wastage.module.ts',
'modules/wastage/wastage.controller.ts','modules/wastage/wastage.service.ts','modules/wastage/wastage.repository.ts','modules/wastage/interfaces/wastage-repository.interface.ts','modules/wastage/entities/wastage-purchase.entity.ts','modules/wastage/entities/wastage-sale.entity.ts',
'modules/wastage/dto/create-wastage-purchase.dto.ts','modules/wastage/dto/create-wastage-sale.dto.ts','modules/fresh-chicken-shop/fresh-chicken-shop.module.ts','modules/fresh-chicken-shop/fresh-chicken-shop.controller.ts','modules/fresh-chicken-shop/fresh-chicken-shop.service.ts','modules/fresh-chicken-shop/fresh-chicken-shop.repository.ts',
'modules/fresh-chicken-shop/interfaces/fresh-chicken-shop-repository.interface.ts','modules/fresh-chicken-shop/entities/shop-sale.entity.ts','modules/fresh-chicken-shop/dto/create-shop-sale.dto.ts','modules/reports/reports.module.ts','modules/reports/reports.controller.ts','modules/reports/reports.service.ts',
'modules/reports/dto/report-query.dto.ts','database/database.module.ts','database/seeds/seed.ts','database/seeds/departments.seed.ts','database/seeds/chart-of-accounts.seed.ts','database/seeds/expense-categories.seed.ts'
]
missing=[p for p in required if not (root/p).exists()]
service_files=[p for p in Path('src/modules').rglob('*.service.ts') if '.spec.' not in p.name]
inj=[]
for f in service_files:
    if 'repository' in f.name: continue
    txt=f.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if re.search(r'InjectRepository|getRepository|EntityManager', line):
            inj.append((str(f),i,line.strip()))

money=[]
for p in list(Path('src/modules').rglob('*.entity.ts'))+list(Path('src/common/entities').rglob('*.entity.ts')):
    txt=p.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if re.search(r"type:\s*'float'|type:\s*'double'|type:\s*'real'|: number", line) and re.search(r'amount|rate|salary|cost|balance|margin|commission|profit', line, re.I):
            money.append((str(p),i,line.strip()))
quantity=[]
for p in Path('src/modules').rglob('*.entity.ts'):
    txt=p.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if 'quantity' in line and not re.search(r'decimal|DECIMAL|numeric', line):
            quantity.append((str(p),i,line.strip()))
audit_targets=['modules/users/entities/user.entity.ts','modules/parties/entities/party.entity.ts','modules/brokerage/entities/brokerage-purchase.entity.ts','modules/brokerage/entities/brokerage-sale.entity.ts','modules/supply/entities/supply-purchase.entity.ts','modules/supply/entities/supply-sale.entity.ts','modules/supply/entities/internal-transfer.entity.ts','modules/wastage/entities/wastage-purchase.entity.ts','modules/wastage/entities/wastage-sale.entity.ts','modules/fresh-chicken-shop/entities/shop-sale.entity.ts','modules/vehicles/entities/vehicle.entity.ts','modules/vehicles/entities/fuel-record.entity.ts','modules/vehicles/entities/maintenance-record.entity.ts','modules/employees/entities/employee.entity.ts','modules/employees/entities/employee-advance.entity.ts','modules/employees/entities/employee-bonus.entity.ts','modules/employees/entities/salary-run.entity.ts','modules/expenses/entities/expense.entity.ts','modules/expenses/entities/expense-category.entity.ts']
audit_missing=[]
for p in audit_targets:
    f=Path('src')/p
    if not f.exists() or 'AuditBaseEntity' not in f.read_text('utf-8', errors='ignore'):
        audit_missing.append(str(f))
immut=[]
for p in [Path('src/modules/ledger/entities/ledger-entry.entity.ts'),Path('src/modules/inventory/entities/stock-movement.entity.ts')]:
    if p.exists():
        txt=p.read_text('utf-8', errors='ignore')
        for i,line in enumerate(txt.splitlines(),1):
            if re.search(r'DeleteDateColumn|UpdateDateColumn|updatedAt|deletedAt', line):
                immut.append((str(p),i,line.strip()))
uuid_missing=[]
for p in Path('src/modules').rglob('*.entity.ts'):
    txt=p.read_text('utf-8', errors='ignore')
    if "PrimaryGeneratedColumn('uuid')" not in txt and 'PrimaryGeneratedColumn("uuid")' not in txt:
        uuid_missing.append(str(p))
salary_unique=[]
pr=Path('src/modules/employees/entities/salary-run.entity.ts')
if pr.exists():
    txt=pr.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if re.search(r'@Unique\(|unique', line):
            salary_unique.append((i,line.strip()))
transfer_fields=[]
pt=Path('src/modules/supply/entities/internal-transfer.entity.ts')
if pt.exists():
    txt=pt.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if re.search(r'fromDepartmentId|toDepartmentId|from_department_id|to_department_id', line):
            transfer_fields.append((i,line.strip()))
stock_unique=[]
p=Path('src/modules/inventory/entities/stock-balance.entity.ts')
if p.exists():
    txt=p.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if re.search(r'@Unique\(|unique', line):
            stock_unique.append((i,line.strip()))

inv_file=Path('src/modules/inventory/inventory.service.ts')
inv_txt=inv_file.read_text('utf-8', errors='ignore') if inv_file.exists() else ''
wac_formulas=[]
for i,line in enumerate(inv_txt.splitlines(),1):
    if re.search(r'existing_qty|existingQuantity', line):
        if re.search(r'\*.*existing.*\+.*new.*\)', line) or re.search(r'\(existing.*\*.*existing.*\+.*new.*\*.*new.*\)\/\(existing.*\+.*new', line):
            wac_formulas.append((i,line.strip()))
sale_files=['src/modules/brokerage/brokerage.service.ts','src/modules/supply/supply.service.ts','src/modules/wastage/wastage.service.ts','src/modules/fresh-chicken-shop/fresh-chicken-shop.service.ts']
sale_stock=[]
commission=[]
inner_transaction=[]
transaction_calls=[]
for fn in sale_files+['src/modules/employees/employees.service.ts','src/modules/supply/supply.service.ts']:
    p=Path(fn)
    if not p.exists():
        continue
    txt=p.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if re.search(r'BadRequestException|InsufficientStock|insufficient', line):
            sale_stock.append((fn,i,line.strip()))
        if re.search(r'commission_per_kg|profit_margin_per_kg', line):
            commission.append((fn,i,line.strip()))
        if re.search(r'dataSource\.transaction|queryRunner\.startTransaction|manager\.transaction', line):
            transaction_calls.append((fn,i,line.strip()))
        if re.search(r'transaction|queryRunner|EntityManager', line, re.I) and re.search(r'transfer|internal', line, re.I):
            inner_transaction.append((fn,i,line.strip()))
ledger_update=[]
for fn in ['src/modules/ledger/ledger.repository.ts','src/modules/ledger/ledger.service.ts']:
    p=Path(fn)
    if p.exists():
        txt=p.read_text('utf-8', errors='ignore')
        for i,line in enumerate(txt.splitlines(),1):
            if re.search(r'\.update|\.delete|\.remove|\.softDelete', line):
                ledger_update.append((fn,i,line.strip()))
vehicle_expense=[]
veh=Path('src/modules/vehicles/vehicles.service.ts')
if veh.exists():
    txt=veh.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if re.search(r'ExpensesService|expensesService|expense|Expense', line):
            vehicle_expense.append((i,line.strip()))
stock_writeoff=[]
for i,line in enumerate(inv_txt.splitlines(),1):
    if re.search(r'expense|Expense|source_type|stock_writeoff', line):
        stock_writeoff.append((i,line.strip()))
auth_hash=[]
auth=Path('src/modules/auth/auth.service.ts')
if auth.exists():
    txt=auth.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if re.search(r'bcrypt|argon2|hash', line):
            auth_hash.append((i,line.strip()))
users_raw=[]
user_file=Path('src/modules/users/users.service.ts')
if user_file.exists():
    txt=user_file.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if re.search(r'password\s*[:=]|passwordHash', line) and not re.search(r'hash|bcrypt|Hash', line):
            users_raw.append((i,line.strip()))
hard_delete=[]
for p in Path('src/modules').rglob('*.service.ts'):
    if '.spec.' in p.name: continue
    txt=p.read_text('utf-8', errors='ignore')
    for i,line in enumerate(txt.splitlines(),1):
        if re.search(r'\.delete\(|\.remove\(|\.hardDelete', line):
            hard_delete.append((str(p),i,line.strip()))
import glob
controllers=[Path(p) for p in glob.glob('src/modules/*/*.controller.ts', recursive=False)]
controllers=[c for c in controllers if c.name != 'auth.controller.ts']
missing_guard=[]
for c in controllers:
    txt=c.read_text('utf-8', errors='ignore')
    if 'JwtAuthGuard' not in txt and 'UseGuards' not in txt:
        missing_guard.append(str(c))
department_scope=[]
for p in Path('src/modules').rglob('*.ts'):
    txt=p.read_text('utf-8', errors='ignore')
    if 'DepartmentScopeGuard' in txt:
        department_scope.append(str(p))
seed_files={'departments':'database/seeds/departments.seed.ts','chart':'database/seeds/chart-of-accounts.seed.ts','expenses':'database/seeds/expense-categories.seed.ts','seed':'database/seeds/seed.ts'}
seed_counts={}
for k,v in seed_files.items():
    p=Path(v)
    seed_counts[k]=p.read_text('utf-8', errors='ignore') if p.exists() else ''
unit_exists=[Path('src/modules/inventory/inventory.service.spec.ts').exists(),Path('src/modules/employees/employees.service.spec.ts').exists(),Path('src/modules/ledger/ledger.service.spec.ts').exists()]
print('MISSING_FILES',len(missing))
for m in missing: print(m)
print('INJ_MATCHES',len(inj))
for f,i,l in inj: print(f,i,l)
print('MONEY_MATCHES',len(money))
for f,i,l in money: print(f,i,l)
print('QUANTITY_MATCHES',len(quantity))
for f,i,l in quantity: print(f,i,l)
print('AUDIT_MISSING',len(audit_missing))
for x in audit_missing: print(x)
print('IMMUTABLE_ISSUES',len(immut))
for f,i,l in immut: print(f,i,l)
print('UUID_MISSING',len(uuid_missing))
for x in uuid_missing: print(x)
print('SALARY_UNIQUE',salary_unique)
print('TRANSFER_FIELDS',transfer_fields)
print('STOCK_UNIQUE',stock_unique)
print('WAC_FORMULAS',wac_formulas)
print('SALE_STOCK_MATCHES',len(sale_stock))
print('COMMISSION_MATCHES',len(commission))
print('INNER_TRANSACTION',len(inner_transaction))
print('TRANSACTION_CALLS',len(transaction_calls))
print('LEDGER_UPDATES',len(ledger_update))
for f,i,l in ledger_update: print(f,i,l)
print('VEHICLE_EXPENSE',len(vehicle_expense))
for i,l in vehicle_expense: print(i,l)
print('STOCK_WRITEOFF',len(stock_writeoff))
for i,l in stock_writeoff: print(i,l)
print('AUTH_HASH',len(auth_hash))
for i,l in auth_hash: print(i,l)
print('USERS_RAW',len(users_raw))
for i,l in users_raw: print(i,l)
print('HARD_DELETE',len(hard_delete))
for f,i,l in hard_delete: print(f,i,l)
print('MISSING_GUARD',len(missing_guard))
for x in missing_guard: print(x)
print('DEPT_SCOPE',len(department_scope))
for x in department_scope: print(x)
print('UNIT_FILES',unit_exists)
print('SEED_DEPARTMENTS', len(re.findall(r'brokerage|supply|wastage|fresh_chicken_shop', seed_counts['departments'], re.I)))
print('SEED_INTERNAL_PARTIES', len(re.findall(r'internal_department', seed_counts['departments'], re.I)))
print('SEED_CHART', len(re.findall(r'cash|bank|accounts_receivable|accounts_payable|revenue|cogs|operating_expense|payroll_expense|employee_advance', seed_counts['chart'], re.I)))
print('SEED_EXPENSE_CATEGORIES', len(re.findall(r'Vehicle Fuel|Vehicle Maintenance|Wastage Loss', seed_counts['expenses'], re.I)))
print('SEED_SYS_GEN', len(re.findall(r'is_system_generated|isSystemGenerated', seed_counts['expenses'], re.I)))
print('SEED_ADMIN', 'admin@poultry.local' in seed_counts['seed'] or 'admin' in seed_counts['seed'])
print('SEED_HASH', bool(re.search(r'bcrypt|hash|argon', seed_counts['seed'], re.I)))
print('SEED_IDEMP', len(re.findall(r'upsert|findOrCreate|ON CONFLICT|orIgnore|orUpdate', seed_counts['departments'], re.I))+len(re.findall(r'upsert|findOrCreate|ON CONFLICT|orIgnore|orUpdate', seed_counts['chart'], re.I))+len(re.findall(r'upsert|findOrCreate|ON CONFLICT|orIgnore|orUpdate', seed_counts['expenses'], re.I))+len(re.findall(r'upsert|findOrCreate|ON CONFLICT|orIgnore|orUpdate', seed_counts['seed'], re.I)))
