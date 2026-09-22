const { Client } = require('pg');
const c = new Client({host:'localhost',port:5432,user:'postgres',password:'postgres',database:'4head'});

c.connect(function(err) {
  if(err){console.error('connect:',err.message);process.exit(1);}

  c.query("SELECT id,name FROM departments WHERE name IN ('Supply','Wastage')", function(e,r){
    if(e){console.error(e.message);process.exit(1);}
    console.log('Depts:', JSON.stringify(r.rows));
    var supplyId = r.rows.find(function(x){return x.name==='Supply';}).id;

    c.query('SELECT COUNT(*) FROM users WHERE department_id=$1',[supplyId], function(e,r){
      console.log('Users in Supply:', r.rows[0].count);

      c.query('SELECT COUNT(*) FROM parties WHERE primary_department_id=$1 AND deleted_at IS NULL',[supplyId], function(e,r){
        console.log('Parties primary=Supply not-deleted:', r.rows[0].count);

        c.query('SELECT COUNT(*) FROM parties WHERE primary_department_id=$1',[supplyId], function(e,r){
          console.log('Parties primary=Supply incl-deleted:', r.rows[0].count);

          c.query('SELECT COUNT(DISTINCT party_id) FROM party_departments WHERE department_id=$1',[supplyId], function(e,r){
            console.log('party_departments rows for Supply:', r.rows[0].count);

            c.query('SELECT COUNT(*) FROM parties WHERE deleted_at IS NOT NULL', function(e,r){
              console.log('Total soft-deleted parties:', r.rows[0].count);

              c.query('SELECT p.id, p.deleted_at, p.primary_department_id FROM parties p WHERE p.primary_department_id=$1 AND p.deleted_at IS NOT NULL LIMIT 5',[supplyId], function(e,r){
                console.log('Sample deleted supply parties:', JSON.stringify(r.rows));

                c.query('SELECT COUNT(*) FROM users u JOIN parties p ON p.user_id=u.id WHERE u.department_id=$1 AND p.deleted_at IS NULL',[supplyId], function(e,r){
                  console.log('Users with non-deleted party in Supply:', r.rows[0].count);

                  c.query('SELECT COUNT(*) FROM users u LEFT JOIN parties p ON p.user_id=u.id WHERE u.department_id=$1 AND p.id IS NULL',[supplyId], function(e,r){
                    console.log('Users with NO party at all:', r.rows[0].count);
                    c.end();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
