"""
Phase 14 - Advanced Analytics Dashboard Router

Aggregates executive KPIs across budgeting, planning, billing, procurement,
labour, and quality modules for a company-wide dashboard.
"""

import calendar
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    AttendanceLog,
    Bill,
    BOQItem,
    Company,
    CompanyTeam,
    NCR,
    Project,
    ProjectBudget,
    PurchaseOrder,
    PurchaseOrderItem,
    MaterialTransaction,
    Task,
    User,
    WorkOrder,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Executive Dashboard"])

AREA_UNITS = {
    "m2",
    "m²",
    "sqm",
    "sq.m",
    "sq m",
    "square meter",
    "square metres",
    "square meters",
}

COMPLETED_TASK_STATUSES = {
    "completed",
    "done",
    "closed",
    "finished",
}


def _to_float(value) -> float:
    if value is None:
        return 0.0
    return float(value)


def _month_start(dt: datetime) -> datetime:
    return datetime(dt.year, dt.month, 1, tzinfo=dt.tzinfo)


def _next_month(dt: datetime) -> datetime:
    if dt.month == 12:
        return datetime(dt.year + 1, 1, 1, tzinfo=dt.tzinfo)
    return datetime(dt.year, dt.month + 1, 1, tzinfo=dt.tzinfo)


def _month_label(dt: datetime) -> str:
    return dt.strftime("%b %Y")


def _month_range(start: datetime, end: datetime) -> List[datetime]:
    if end < start:
        return [start]

    cursor = _month_start(start)
    months: List[datetime] = []
    while cursor <= end:
        months.append(cursor)
        cursor = _next_month(cursor)
    return months


def _resolve_team_name(team: CompanyTeam, users_by_id: Dict[uuid.UUID, User]) -> str:
    if team.user_id and team.user_id in users_by_id and users_by_id[team.user_id].name:
        return users_by_id[team.user_id].name
    return f"Team {str(team.id)[:8]}"


@router.get("/company/{company_id}")
def get_company_analytics(company_id: uuid.UUID, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    projects = (
        db.query(Project)
        .filter(Project.company_id == company_id)
        .order_by(Project.created_at.asc())
        .all()
    )
    project_ids = [p.id for p in projects]

    budgets = (
        db.query(ProjectBudget)
        .filter(ProjectBudget.project_id.in_(project_ids))
        .all()
        if project_ids
        else []
    )
    tasks = (
        db.query(Task)
        .filter(Task.project_id.in_(project_ids))
        .all()
        if project_ids
        else []
    )
    boq_items = (
        db.query(BOQItem)
        .filter(BOQItem.project_id.in_(project_ids))
        .all()
        if project_ids
        else []
    )
    bills = (
        db.query(Bill)
        .filter(Bill.project_id.in_(project_ids))
        .all()
        if project_ids
        else []
    )
    purchase_orders = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.project_id.in_(project_ids))
        .all()
        if project_ids
        else []
    )
    purchase_order_items = []
    if purchase_orders:
        po_ids = [po.id for po in purchase_orders]
        purchase_order_items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id.in_(po_ids)).all()
    material_transactions = (
        db.query(MaterialTransaction)
        .filter(MaterialTransaction.project_id.in_(project_ids), MaterialTransaction.type == "used")
        .all()
        if project_ids
        else []
    )
    attendance_logs = (
        db.query(AttendanceLog)
        .filter(AttendanceLog.project_id.in_(project_ids))
        .all()
        if project_ids
        else []
    )
    ncrs = (
        db.query(NCR)
        .filter(NCR.project_id.in_(project_ids))
        .all()
        if project_ids
        else []
    )
    work_orders = (
        db.query(WorkOrder)
        .filter(WorkOrder.project_id.in_(project_ids))
        .all()
        if project_ids
        else []
    )
    teams = db.query(CompanyTeam).filter(CompanyTeam.company_id == company_id).all()
    user_ids = [team.user_id for team in teams if team.user_id]
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    users_by_id = {user.id: user for user in users}

    budget_by_project = {budget.project_id: budget for budget in budgets}
    tasks_by_project = defaultdict(list)
    boq_by_id = {boq.id: boq for boq in boq_items}
    for task in tasks:
        tasks_by_project[task.project_id].append(task)

    bills_by_project = defaultdict(list)
    for bill in bills:
        bills_by_project[bill.project_id].append(bill)

    work_orders_by_subcontractor = defaultdict(list)
    projects_by_subcontractor = defaultdict(set)
    for work_order in work_orders:
        work_orders_by_subcontractor[work_order.subcontractor_id].append(work_order)
        projects_by_subcontractor[work_order.subcontractor_id].add(work_order.project_id)

    total_budget = 0.0
    total_spend = 0.0
    project_summary = []
    for project in projects:
        budget = budget_by_project.get(project.id)
        project_budget_total = 0.0
        if budget:
            project_budget_total = (
                _to_float(budget.material_budget)
                + _to_float(budget.labour_budget)
                + _to_float(budget.subcon_budget)
                + _to_float(budget.equipment_budget)
            )

        project_spend = sum(_to_float(bill.total_payable) for bill in bills_by_project.get(project.id, []))
        project_variance = project_budget_total - project_spend
        total_tasks = len(tasks_by_project.get(project.id, []))
        completed_tasks = sum(
            1
            for task in tasks_by_project.get(project.id, [])
            if (task.status or "").lower() in COMPLETED_TASK_STATUSES
        )
        completion_pct = round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0.0

        total_budget += project_budget_total
        total_spend += project_spend

        project_summary.append(
            {
                "project_id": str(project.id),
                "project_name": project.name,
                "code": project.code,
                "budget": round(project_budget_total, 2),
                "spend": round(project_spend, 2),
                "variance": round(project_variance, 2),
                "completion_pct": completion_pct,
                "task_count": total_tasks,
                "completed_tasks": completed_tasks,
            }
        )

    total_tasks = len(tasks)
    completed_tasks = sum(
        1 for task in tasks if (task.status or "").lower() in COMPLETED_TASK_STATUSES
    )
    burn_rate_pct = round((total_spend / total_budget) * 100, 2) if total_budget else 0.0
    budget_variance = round(total_budget - total_spend, 2)

    date_candidates = []
    for collection in (tasks, bills, attendance_logs, purchase_orders):
        for item in collection:
            for attr in ("start_date", "end_date", "invoice_date", "due_date", "attendance_date", "po_date", "created_at"):
                value = getattr(item, attr, None)
                if isinstance(value, datetime):
                    date_candidates.append(value)

    if date_candidates:
        start_date = min(date_candidates)
        end_date = max(date_candidates)
    else:
        start_date = datetime.utcnow()
        end_date = start_date

    s_curve = []
    monthly_burn = []
    month_starts = _month_range(start_date, end_date)
    cumulative_spend = 0.0
    for month in month_starts:
        month_end = _next_month(month) - timedelta(seconds=1)
        planned = sum(1 for task in tasks if task.end_date and task.end_date <= month_end)
        actual = sum(
            1
            for task in tasks
            if task.end_date
            and task.end_date <= month_end
            and (task.status or "").lower() in COMPLETED_TASK_STATUSES
        )
        month_spend = sum(
            _to_float(bill.total_payable)
            for bill in bills
            if bill.invoice_date and bill.invoice_date <= month_end
        )
        cumulative_spend = month_spend
        s_curve.append(
            {
                "label": _month_label(month),
                "planned_pct": round((planned / total_tasks) * 100, 1) if total_tasks else 0.0,
                "actual_pct": round((actual / total_tasks) * 100, 1) if total_tasks else 0.0,
            }
        )
        monthly_burn.append(
            {
                "label": _month_label(month),
                "burn_pct": round((cumulative_spend / total_budget) * 100, 1) if total_budget else 0.0,
                "spend": round(cumulative_spend, 2),
            }
        )

    total_hours = 0.0
    for log in attendance_logs:
        if log.hours_worked is not None:
            total_hours += _to_float(log.hours_worked)
        elif (log.status or "").lower() == "present":
            total_hours += 8.0

    labour_days = round(total_hours / 8.0, 2) if total_hours else 0.0
    completed_area = 0.0
    for task in tasks:
        if (task.status or "").lower() in COMPLETED_TASK_STATUSES and task.boq_item_id:
            boq = boq_by_id.get(task.boq_item_id)
            if boq and (boq.unit or "").strip().lower() in AREA_UNITS:
                completed_area += _to_float(boq.quantity)
    if completed_area == 0.0:
        completed_area = sum(
            _to_float(boq.quantity)
            for boq in boq_items
            if (boq.unit or "").strip().lower() in AREA_UNITS
        )
    labour_productivity = round(completed_area / labour_days, 2) if labour_days else 0.0

    ordered_qty = sum(_to_float(item.quantity) for item in purchase_order_items)
    consumed_qty = sum(_to_float(tx.qty) for tx in material_transactions)
    wastage_qty = max(ordered_qty - consumed_qty, 0.0)
    wastage_pct = round((wastage_qty / ordered_qty) * 100, 2) if ordered_qty else 0.0

    subcontractor_scorecard = []
    for subcontractor_id, orders in work_orders_by_subcontractor.items():
        company_team = next((team for team in teams if team.id == subcontractor_id), None)
        bills_for_subcontractor = [
            bill
            for bill in bills
            if bill.invoice_type == "subcon" and bill.party_company_user_id == subcontractor_id
        ]
        on_time_bills = sum(
            1
            for bill in bills_for_subcontractor
            if bill.due_date is None
            or (bill.updated_at is not None and bill.updated_at <= bill.due_date)
        )
        linked_projects = projects_by_subcontractor.get(subcontractor_id, set())
        ncr_count = sum(1 for ncr in ncrs if ncr.project_id in linked_projects)
        subcontractor_scorecard.append(
            {
                "subcontractor_id": str(subcontractor_id),
                "subcontractor_name": _resolve_team_name(company_team, users_by_id) if company_team else str(subcontractor_id),
                "project_names": [
                    project.name
                    for project in projects
                    if project.id in linked_projects
                ],
                "bill_count": len(bills_for_subcontractor),
                "on_time_rate": round((on_time_bills / len(bills_for_subcontractor)) * 100, 1) if bills_for_subcontractor else 0.0,
                "ncr_count": ncr_count,
                "late_bills": max(len(bills_for_subcontractor) - on_time_bills, 0),
            }
        )

    subcontractor_scorecard.sort(key=lambda row: (-row["on_time_rate"], row["ncr_count"], row["subcontractor_name"]))

    return {
        "company_id": str(company.id),
        "company_name": company.name,
        "project_count": len(projects),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "task_completion_pct": round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0.0,
        "total_budget": round(total_budget, 2),
        "total_spend": round(total_spend, 2),
        "budget_variance": budget_variance,
        "burn_rate_pct": burn_rate_pct,
        "s_curve": s_curve,
        "budget_burn_series": monthly_burn,
        "labour_productivity": {
            "total_hours": round(total_hours, 2),
            "labour_days": labour_days,
            "completed_area_m2": round(completed_area, 2),
            "productivity_m2_per_labour_day": labour_productivity,
        },
        "material_wastage": {
            "ordered_qty": round(ordered_qty, 2),
            "consumed_qty": round(consumed_qty, 2),
            "wastage_qty": round(wastage_qty, 2),
            "wastage_pct": wastage_pct,
        },
        "projects": project_summary,
        "subcontractor_scorecard": subcontractor_scorecard,
    }


@router.get("/company/{company_id}/operational")
def get_company_operational_analytics(company_id: uuid.UUID, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    projects = db.query(Project).filter(Project.company_id == company_id).all()
    project_ids = [p.id for p in projects]

    # Calculate Project Health and Progress
    project_summary = []
    health_counts = {"Healthy": 0, "Warning": 0, "Critical": 0, "Onhold": 0, "Completed": 0}
    status_counts = {"Not Started": 0, "Ongoing": 0, "Onhold": 0, "Completed": 0}

    for p in projects:
        # Determine status
        p_status = p.status or "Ongoing"
        if p_status in status_counts:
            status_counts[p_status] += 1
        else:
            status_counts["Ongoing"] += 1

        # Budget vs Spend
        budget = db.query(ProjectBudget).filter(ProjectBudget.project_id == p.id).first()
        budget_total = 0.0
        if budget:
            budget_total = (
                _to_float(budget.material_budget)
                + _to_float(budget.labour_budget)
                + _to_float(budget.subcon_budget)
                + _to_float(budget.equipment_budget)
            )
        spend = sum(_to_float(b.total_payable) for b in db.query(Bill).filter(Bill.project_id == p.id).all())

        # Determine Health
        if p_status == "Completed":
            health = "Completed"
        elif p_status == "Onhold":
            health = "Onhold"
        elif spend > budget_total and budget_total > 0:
            health = "Critical"
        elif spend > 0.9 * budget_total and budget_total > 0:
            health = "Warning"
        else:
            health = "Healthy"
        
        if health in health_counts:
            health_counts[health] += 1

        # Task Progress
        tasks = db.query(Task).filter(Task.project_id == p.id).all()
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if (t.status or "").lower() in COMPLETED_TASK_STATUSES)
        progress_pct = round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0.0

        project_summary.append({
            "project_id": str(p.id),
            "project_name": p.name,
            "code": p.code or "—",
            "status": p_status,
            "health": health,
            "start_date": p.start_date.split("T")[0] if isinstance(p.start_date, str) else p.start_date.strftime("%Y-%m-%d") if p.start_date else "—",
            "end_date": p.end_date.split("T")[0] if isinstance(p.end_date, str) else p.end_date.strftime("%Y-%m-%d") if p.end_date else "—",
            "progress": progress_pct,
            "customer_name": p.customer_name or "—",
            "key_personnel": "Supervisor"
        })

    # Last 7 Days Attendance Sparkline
    attendance_series = []
    # Last 7 Days Material Received Sparkline
    material_series = []
    
    today = datetime.utcnow().date()
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        date_str = target_date.strftime("%Y-%m-%d")
        
        # Attendance counts
        att_logs = db.query(AttendanceLog).filter(
            AttendanceLog.project_id.in_(project_ids),
            func.date(AttendanceLog.attendance_date) == target_date
        ).all() if project_ids else []
        
        present = sum(1 for log in att_logs if log.status in ("Present", "Present (Off-Site)"))
        absent = sum(1 for log in att_logs if log.status == "Absent")
        
        attendance_series.append({
            "date": date_str,
            "present": present,
            "absent": absent
        })

        # Material receipt logs count
        mat_txs = db.query(MaterialTransaction).filter(
            MaterialTransaction.project_id.in_(project_ids),
            func.date(MaterialTransaction.created_at) == target_date,
            MaterialTransaction.type == "received"
        ).count() if project_ids else 0
        
        material_series.append({
            "date": date_str,
            "count": mat_txs
        })

    return {
        "company_id": str(company_id),
        "health_counts": health_counts,
        "status_counts": status_counts,
        "attendance_series": attendance_series,
        "material_series": material_series,
        "projects": project_summary
    }
