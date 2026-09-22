const { Client } = require('pg');
const c = new Client({host:'localhost',port:5432,user:'postgres',password:'postgres',database:'4head'});

c.connect(function(err) {
  if(err){console.error(err.message);process.exit(1);}

  var supplyId = 'f17d1b7b-e7cd-469c-97e9-d8de811a78b1';

  // Check if parties exist for these names but with null user_id or different user_id
  var names = ['محرم','ملک غلام عباس','ملک عامر','نثار احمد','نوید مغل','احمد جاوید','حافظ قاسم','رانا وسیم','رانا سہیل'];
  var placeholders = names.map(function(_,i){return '$'+(i+1);}).join(',');

  c.query(
    'SELECT id, name, user_id, primary_department_id FROM parties WHERE name = ANY($1::text[]) LIMIT 20',
    [names],
    function(e,r){
      if(e){console.error(e.message);process.exit(1);}
      console.log('Parties matching those names:', JSON.stringify(r.rows, null, 2));

      // Also check: does partyRepo.findOne({where:{userId}}) find anything for these users?
      c.query(
        'SELECT u.id as uid, u.email, p.id as pid, p.user_id FROM users u LEFT JOIN parties p ON p.user_id=u.id WHERE u.department_id=$1 AND u.email IN ($2,$3,$4)',
        [supplyId, 'supply-13@supply.local', 'supply-27@supply.local', 'supply-38@supply.local'],
        function(e,r){
          if(e){console.error(e.message);process.exit(1);}
          console.log('Sample user-party join:', JSON.stringify(r.rows, null, 2));

          // Check if there are duplicate users with same email
          c.query(
            'SELECT email, COUNT(*) FROM users WHERE email LIKE $1 GROUP BY email HAVING COUNT(*) > 1',
            ['%@supply.local'],
            function(e,r){
              if(e){console.error(e.message);process.exit(1);}
              console.log('Duplicate supply emails:', r.rows.length ? JSON.stringify(r.rows) : 'none');

              // Check parties with user_id pointing to a DIFFERENT user (not in supply dept)
              c.query(
                'SELECT p.id, p.name, p.user_id, u.email, u.department_id FROM parties p JOIN users u ON u.id=p.user_id WHERE p.primary_department_id=$1 LIMIT 5',
                [supplyId],
                function(e,r){
                  if(e){console.error(e.message);process.exit(1);}
                  console.log('Sample parties with user link:', JSON.stringify(r.rows, null, 2));
                  c.end();
                }
              );
            }
          );
        }
      );
    }
  );
});
