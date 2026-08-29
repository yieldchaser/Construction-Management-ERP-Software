with want(kind, mig, obj) as (values
 ('col','20260815_000001','face_recognition_logs.created_at'),
 ('col','20260816_000001','material_indents.approved_by'),
 ('col','20260816_000001','material_indents.approved_at'),
 ('col','20260816_000002','safety_incidents.closed_by'),
 ('col','20260816_000003','bills.cancelled_at'),
 ('col','20260816_000003','bills.cancelled_by'),
 ('con','20260816_000005','material_wastage_reported_by_fkey'),
 ('col','20260816_000006','drawing_pins.resolved'),
 ('col','20260821_000001','ncrs.reviewed_by'),
 ('col','20260821_000001','ncrs.reviewed_at'),
 ('col','20260821_000001','ncrs.closed_by'),
 ('col','20260821_000002','users.tokens_revoked_at'),
 ('col','20260821_000004','transaction_deductions.release_due_date'),
 ('col','20260821_000004','transaction_deductions.released_at'),
 ('col','20260821_000004','transaction_deductions.released_amount'),
 ('col','20260825_000004b','purchase_orders.cancelled_at'),
 ('col','20260825_000004b','purchase_orders.cancelled_by'),
 ('con','20260821_000003','uq_three_way_matches_po_grn'),
 ('con','20260823_000001','uq_payroll_runs_company_project_month'),
 ('con','20260825_000003','uq_material_indents_company_id_indent_number'),
 ('con','20260825_000003','uq_bills_company_id_invoice_number'),
 ('con','20260825_000003','uq_goods_receipt_notes_company_id_grn_number'),
 ('con','20260825_000003','uq_ncrs_project_id_ncr_number'),
 ('con','20260825_000003','uq_payments_company_id_reference_number'),
 ('con','20260825_000003','uq_purchase_orders_company_id_po_number'),
 ('con','20260825_000003','uq_work_orders_company_id_wo_number'),
 ('con','20260825_000004','uq_company_team_company_id_user_id'),
 ('con','20260825_000004','uq_library_cost_codes_company_id_code'),
 ('con','20260825_000002','fk_payment_requests_party_company_user_id'),
 ('tab','20260821_000002','revoked_tokens'),
 ('typ','20260821_000005','boq_items.cost_code=100'),
 ('def','20260816_000004','tally_connections.voucher_number_template')
)
select w.mig, w.kind, w.obj,
  case w.kind
   when 'col' then (select count(*) from information_schema.columns c
        where c.table_schema='public'
          and c.table_name=split_part(w.obj,'.',1)
          and c.column_name=split_part(w.obj,'.',2))
   when 'con' then (select count(*) from pg_constraint where conname=w.obj)
   when 'tab' then (select count(*) from information_schema.tables t
        where t.table_schema='public' and t.table_name=w.obj)
   when 'typ' then (select count(*) from information_schema.columns c
        where c.table_schema='public' and c.table_name='boq_items'
          and c.column_name='cost_code' and c.character_maximum_length=100)
   when 'def' then (select count(*) from information_schema.columns c
        where c.table_schema='public' and c.table_name='tally_connections'
          and c.column_name='voucher_number_template' and c.column_default is not null)
  end as present
from want w
union all
select 'RLS','pol','policies named %_tenant_scoped',
  (select count(*) from pg_policies where schemaname='public' and policyname like '%\_tenant\_scoped')
union all
select 'RLS','force','tables with relforcerowsecurity',
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r' and c.relforcerowsecurity)
union all
select 'SANITY','col','companies.id (must be 1)',
  (select count(*) from information_schema.columns where table_schema='public'
    and table_name='companies' and column_name='id')
union all
select 'SANITY','col','companies.no_such_col (must be 0)',
  (select count(*) from information_schema.columns where table_schema='public'
    and table_name='companies' and column_name='no_such_col')
order by 1,3;
