const fs = require("node:fs");
const path = require("node:path");
const backendModules = path.join(__dirname, "..", "4_Head_poltary_system", "node_modules");
const { Client } = require(path.join(backendModules, "pg"));
require(path.join(backendModules, "dotenv")).config({
  path: path.join(__dirname, "..", "4_Head_poltary_system", ".env"),
});

async function exportCurrentDirectory(destination) {
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || process.env.DB_NAME || "postgres",
  });
  await client.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    const users = await client.query(`
      select u.full_name as "fullName", u.email, u.password_hash as "passwordHash",
             u.phone, r.name as "roleName", d.type as "departmentType",
             u.is_active as "isActive", u.created_at as "createdAt",
             u.updated_at as "updatedAt", u.deleted_at as "deletedAt"
        from users u
        left join roles r on r.id = u.role_id
        left join departments d on d.id = u.department_id
       order by u.email
    `);
    const parties = await client.query(`
      select p.name, p.party_type as "partyType", p.phone, p.address,
             p.opening_balance as "openingBalance", p.notes,
             u.email as "userEmail", primary_d.type as "primaryDepartmentType",
             linked_d.type as "linkedDepartmentType", p.created_at as "createdAt",
             p.updated_at as "updatedAt", p.deleted_at as "deletedAt",
             coalesce(array_agg(member_d.type order by member_d.type)
               filter (where member_d.type is not null), '{}') as "departmentTypes"
        from parties p
        left join users u on u.id = p.user_id
        left join departments primary_d on primary_d.id = p.primary_department_id
        left join departments linked_d on linked_d.id = p.linked_department_id
        left join party_departments pd on pd.party_id = p.id
        left join departments member_d on member_d.id = pd.department_id
       group by p.id, u.email, primary_d.type, linked_d.type
       order by p.name
    `);
    const supplyLinks = await client.query(`
      select
        (select count(*)::int from users u join departments d on d.id = u.department_id where d.type = 'SUPPLY') as users,
        (select count(*)::int from parties p where exists (
          select 1 from departments d where d.type = 'SUPPLY' and
            (p.primary_department_id = d.id or p.linked_department_id = d.id or exists (
              select 1 from party_departments pd where pd.party_id = p.id and pd.department_id = d.id
            ))
        )) as parties
    `);
    if (supplyLinks.rows[0].users !== 0 || supplyLinks.rows[0].parties !== 0) {
      throw new Error("Current database still contains Supply-linked users or parties");
    }
    fs.writeFileSync(destination, `${JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      users: users.rows,
      parties: parties.rows,
    }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await client.query("commit");
    return { users: users.rowCount, parties: parties.rowCount };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

module.exports = { exportCurrentDirectory };
