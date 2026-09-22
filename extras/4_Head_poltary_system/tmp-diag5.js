const { Client } = require('pg');
const c = new Client({host:'localhost',port:5432,user:'postgres',password:'postgres',database:'4head'});

c.connect(function(err) {
  if(err){console.error(err.message);process.exit(1);}

  var supplyId = 'f17d1b7b-e7cd-469c-97e9-d8de811a78b1';

  c.query(
    'SELECT u.id, u.email, u.full_name FROM users u LEFT JOIN parties p ON p.user_id=u.id WHERE u.department_id=$1 AND p.id IS NULL ORDER BY u.email',
    [supplyId],
    function(e,r){
      console.log('Users still with NO party (' + r.rows.length + '):');
      r.rows.forEach(function(row){ console.log(' ', row.email, '|', row.full_name); });

      // Check if there are parties with these names but null user_id
      var names = r.rows.map(function(row){ return row.full_name; });
      if(names.length === 0){ c.end(); return; }
      c.query(
        'SELECT id, name, user_id, primary_department_id FROM parties WHERE name = ANY($1::text[])',
        [names],
        function(e2,r2){
          console.log('\nParties with matching names (any user_id):', JSON.stringify(r2.rows, null, 2));
          c.end();
        }
      );
    }
  );
});
