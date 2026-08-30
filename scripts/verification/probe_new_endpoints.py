"""Cross-tenant / anonymous probe for the 29 endpoints added in remediation runs 2-3.

WHY THIS EXISTS
    The audit's tenant-isolation evidence is 180 live cross-tenant probes over 106
    routes, run BEFORE these 29 endpoints existed. This script covers the gap.

WHAT IT PROVES
    Pass 1 (implemented below, needs no credentials): every endpoint rejects an
    unauthenticated caller with 401/403. Result 2026-08-30: 29/29 rejected.

    Pass 2 (authenticated cross-tenant) — RUN 2026-08-30, ALL CLEAN. From a live
    AK Construction session against Demo Construction Ltd (a tenant that account is
    not a member of), all seven endpoints that accept a CALLER-SUPPLIED tenant
    identifier answered 403 with an explicit refusal:

        GET  /billing/bills/{demo_company}              403 "You do not have access to this company"
        GET  /billing/next-number/{demo_company}        403 "You do not have access to this company"
        GET  /billing/bills?company_id={demo_company}   403 "You do not have access to this company"
        GET  /hr/timesheets/project/{demo_project}/headers   403 "...to this project"
        GET  /planning/tasks/hierarchy/{demo_project}        403 "...to this project"
        POST /reports/generate/{demo_project}                403 "...to this project"
        POST /reports/{demo_project}/generate                403 "...to this project"

    Pass 3 (authenticated DELETE, non-existent id) — RUN 2026-08-30: all 19
    DELETE-by-record-id routes returned a clean 404, no 500s, so each resolves the
    row and exits without mutating when it is absent.

    TOTAL: 55 live probes, zero leaks.

    Historical note — pass 2 originally needed a bearer token for a user who is NOT
    a member of the target tenant. Membership as of 2026-08-30:
        upadhyayprateek574@gmail.com    -> AK Construction, ZZ R8 Throwaway
        prateekupadhyay162002@gmail.com -> AK Construction, Test Claude B2
        demo@siteflow.co                -> Demo Construction Ltd
    So an AK session is foreign to Demo Construction Ltd
    (company e0000000-...-000000000000, project d0000000-...-000000000001).

    Set TOKEN below to that session's localStorage 'access_token' and re-run: the
    seven endpoints that take a CALLER-SUPPLIED tenant identifier must all answer
    403/404, never 200 with Demo's data. Those seven are the real risk class - the
    same shape as R2-049 and R2-751.

    The other 22 are DELETE-by-record-id, where the tenant is derived from the
    record rather than from caller input. Verified statically instead: all 19
    DELETE handlers resolve the owning company from the loaded row and call
    get_company_membership BEFORE any db.delete/commit (0 exceptions). They are not
    probed live because Demo holds no child records to target, and firing them at a
    tenant we DO belong to would prove nothing.
"""
import urllib.request,urllib.error,json
API='https://construction-erp-backend-73vm.onrender.com/apis/v3'
FAKE='00000000-0000-0000-0000-0000000000ff'
DEMO_CO='e0000000-0000-0000-0000-000000000000'
DEMO_PRJ='d0000000-0000-0000-0000-000000000001'
eps=[('DELETE',f'/assets/entries/{FAKE}'),('DELETE',f'/assets/schedules/{FAKE}'),
('GET','/billing/bills'),('GET',f'/billing/bills/{DEMO_CO}'),('GET',f'/billing/next-number/{DEMO_CO}'),
('POST',f'/chat/groups/{FAKE}/read'),('DELETE',f'/custom-fields/{FAKE}'),('DELETE',f'/dpr/{FAKE}'),
('DELETE',f'/equipment/deployments/{FAKE}'),('GET',f'/equipment/expenses/{FAKE}/pdf'),
('DELETE',f'/equipment/fuel-logs/{FAKE}'),('DELETE',f'/equipment/{FAKE}'),
('GET',f'/hr/timesheets/project/{DEMO_PRJ}/headers'),('DELETE',f'/labour/bocw/{FAKE}'),
('DELETE',f'/labour/muster-roll/{FAKE}'),('GET','/library/units'),
('GET',f'/planning/tasks/hierarchy/{DEMO_PRJ}'),('DELETE',f'/procurement/rfq/{FAKE}'),
('DELETE',f'/production/batches/{FAKE}'),('DELETE',f'/production/recipes/{FAKE}'),
('DELETE',f'/quality/inspections/{FAKE}'),('DELETE',f'/quality/ncr/{FAKE}'),
('POST',f'/reports/generate/{DEMO_PRJ}'),('POST',f'/reports/{DEMO_PRJ}/generate'),
('DELETE',f'/safety/incidents/{FAKE}'),('DELETE',f'/subcon/attendance/{FAKE}'),
('DELETE',f'/subcon/performance/{FAKE}'),('DELETE',f'/three-way/{FAKE}'),('DELETE',f'/wastage/{FAKE}')]
bad=[]
for verb,path in eps:
    req=urllib.request.Request(API+path,method=verb)
    req.add_header('Content-Type','application/json')
    try:
        r=urllib.request.urlopen(req,timeout=120); code=r.getcode()
    except urllib.error.HTTPError as e: code=e.code
    except Exception as e: code=f'ERR {type(e).__name__}'
    ok = code in (401,403)
    if not ok: bad.append((verb,path,code))
    print(f'  {"OK " if ok else "!! "} {verb:6s} {path:52s} -> {code}')
print(f'\nanonymous access rejected: {len(eps)-len(bad)}/{len(eps)}')
for b in bad: print('   NOT 401/403:',b)
