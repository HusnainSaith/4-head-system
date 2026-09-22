const { Client } = require('pg');
const c = new Client({host:'localhost',port:5432,user:'postgres',password:'postgres',database:'4head'});

c.connect(function(err) {
  if(err){console.error(err.message);process.exit(1);}

  var supplyId = 'f17d1b7b-e7cd-469c-97e9-d8de811a78b1';

  // Find the 19 users that have no party
  c.query(
    'SELECT u.id, u.email, u.full_name FROM users u LEFT JOIN parties p ON p.user_id=u.id WHERE u.department_id=$1 AND p.id IS NULL ORDER BY u.email',
    [supplyId],
    function(e,r){
      if(e){console.error(e.message);process.exit(1);}
      console.log('Users with NO party (' + r.rows.length + '):');
      r.rows.forEach(function(row){ console.log(' ', row.email, '|', row.full_name); });
      c.end();
    }
  );
});
