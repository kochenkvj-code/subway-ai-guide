const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const sql=q=>execFileSync('docker',['exec','-i','-e','PGOPTIONS=-c role=service_role','metro-interpreter-db-20261117','psql','-U','postgres','-tA','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8'}).trim();
const make=(id,digest)=>JSON.parse(sql(`select public.create_route_result_share('${id}','test-creator','${digest}','{"version":1}');`));
sql("delete from public.route_result_shares where creator='test-creator';");
const first=make('a'.repeat(43),'digest');assert.equal(make('b'.repeat(43),'digest').id,first.id);
for(let i=0;i<29;i++)assert.ok(make('x'.repeat(40)+String(i).padStart(3,'0'),'d'+i).id);
assert.equal(make('z'.repeat(43),'extra').error,'rate-limited');
assert.equal(sql("select has_table_privilege('anon','public.route_result_shares','select');"),'f');assert.equal(sql("select has_function_privilege('anon','public.create_route_result_share(text,text,text,jsonb)','execute');"),'f');
execFileSync('docker',['exec','-i','metro-interpreter-db-20261117','psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:"update public.route_result_shares set expires_at=now()-interval '1 second' where creator='test-creator';",encoding:'utf8'});assert.equal(sql("select count(*) from public.route_result_shares where expires_at>now();"),'0');sql("delete from public.route_result_shares where creator='test-creator';");console.log('PASS DB reuse, 30/hour cap, expiry and denied direct access');
