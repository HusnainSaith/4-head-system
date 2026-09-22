const { Client } = require('pg');
const c = new Client({host:'localhost',port:5432,user:'postgres',password:'postgres',database:'4head'});

c.connect(function(err) {
  if(err){console.error(err.message);process.exit(1);}

  var supplyId = 'f17d1b7b-e7cd-469c-97e9-d8de811a78b1';
  var wastageId = 'fd8bdb26-606a-4e22-bf7c-8cbf51962675';

  // Check if the 19 orphaned parties still exist with Wastage as primary
  c.query(
    'SELECT COUNT(*) FROM parties WHERE primary_department_id=$1',
    [wastageId],
    function(e,r){
      console.log('Parties with primary=Wastage:', r.rows[0].count);

      // Check if supply.local users still exist
      c.query('SELECT COUNT(*) FROM users WHERE email LIKE $1', ['%@supply.local'], function(e,r){
        console.log('supply.local users:', r.rows[0].count);

        // Check if the cleanup query actually ran - look for parties linked to supply.local users
        c.query(
          'SELECT p.id, p.primary_department_id, u.email FROM parties p JOIN users u ON u.id=p.user_id WHERE u.email LIKE $1 LIMIT 5',
          ['%@supply.local'],
          function(e,r){
            console.log('Parties linked to supply.local users:', JSON.stringify(r.rows));
            c.end();
          }
        );
      });
    }
  );
});
