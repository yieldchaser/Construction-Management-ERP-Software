from uuid import UUID
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import PurchaseOrder, VendorPerformance, CompanyTeam
from pydantic import BaseModel

router = APIRouter(
    prefix="/procurement",
    tags=["Vendor Performance & Duplicate Checks"]
)


class VendorPerformanceResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    vendor_id: Optional[UUID] = None
    vendor_name: str
    total_pos: int
    total_grns: int
    on_time_deliveries: int
    quality_issues: int
    avg_delay_days: float
    last_updated: datetime

    class Config:
        from_attributes = True


class DuplicatePOCheckResponse(BaseModel):
    is_duplicate: bool
    po_number: str
    existing_po_ids: List[str] = []
    message: str


@router.get("/vendors/performance/{project_id}", response_model=List[VendorPerformanceResponse])
def get_vendor_performance(project_id: UUID, db: Session = Depends(get_db)):
    records = db.query(VendorPerformance).filter(
        VendorPerformance.project_id == project_id
    ).all()

    mapped = []
    for v in records:
        mapped.append(VendorPerformanceResponse(
            id=v.id,
            company_id=v.company_id,
            project_id=v.project_id,
            vendor_id=v.vendor_id,
            vendor_name=v.vendor_name,
            total_pos=v.total_pos,
            total_grns=v.total_grns,
            on_time_deliveries=v.on_time_deliveries,
            quality_issues=v.quality_issues,
            avg_delay_days=float(v.avg_delay_days),
            last_updated=v.last_updated,
        ))
    return mapped


def refresh_vendor_performance(db: Session, project_id: UUID, company_id: UUID):
    from app.models import PurchaseOrder, GoodsReceiptNote, PurchaseOrderItem
    pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.project_id == project_id,
        PurchaseOrder.company_id == company_id
    ).all()

    vendor_map = {}
    for po in pos:
        vendor_id = po.vendor_id
        team_member = db.query(CompanyTeam).filter(CompanyTeam.id == vendor_id).first()
        vendor_name = team_member.user.name if team_member and team_member.user else f"Vendor-{str(vendor_id)[:8]}"
        if vendor_id not in vendor_map:
            vendor_map[vendor_id] = {
                "company_id": company_id,
                "project_id": project_id,
                "vendor_id": vendor_id,
                "vendor_name": vendor_name,
                "total_pos": 0,
                "total_grns": 0,
                "on_time_deliveries": 0,
                "quality_issues": 0,
                "total_delay_days": 0.0,
                "grn_count_for_delay": 0,
            }
        vm = vendor_map[vendor_id]
        vm["total_pos"] += 1

        grns = db.query(GoodsReceiptNote).filter(GoodsReceiptNote.po_id == po.id).all()
        for grn in grns:
            vm["total_grns"] += 1
            delay_days = 0
            if po.po_date and grn.received_date:
                delay_days = max(0, (grn.received_date - po.po_date).days)
            if delay_days <= 2:
                vm["on_time_deliveries"] += 1
            else:
                vm["total_delay_days"] += delay_days
                vm["grn_count_for_delay"] += 1

    for vendor_id, vm in vendor_map.items():
        existing = db.query(VendorPerformance).filter(
            VendorPerformance.project_id == project_id,
            VendorPerformance.vendor_id == vendor_id
        ).first()
        if existing:
            existing.total_pos = vm["total_pos"]
            existing.total_grns = vm["total_grns"]
            existing.on_time_deliveries = vm["on_time_deliveries"]
            existing.quality_issues = vm["quality_issues"]
            existing.avg_delay_days = round(vm["total_delay_days"] / vm["grn_count_for_delay"], 2) if vm["grn_count_for_delay"] > 0 else 0.0
            existing.last_updated = datetime.utcnow()
        else:
            vp = VendorPerformance(
                company_id=vm["company_id"],
                project_id=vm["project_id"],
                vendor_id=vm["vendor_id"],
                vendor_name=vm["vendor_name"],
                total_pos=vm["total_pos"],
                total_grns=vm["total_grns"],
                on_time_deliveries=vm["on_time_deliveries"],
                quality_issues=vm["quality_issues"],
                avg_delay_days=round(vm["total_delay_days"] / vm["grn_count_for_delay"], 2) if vm["grn_count_for_delay"] > 0 else 0.0,
            )
            db.add(vp)
    db.commit()


@router.get("/duplicate-po-check", response_model=DuplicatePOCheckResponse)
def check_duplicate_po(
    company_id: UUID,
    po_number: str = Query(..., description="PO number to check"),
    db: Session = Depends(get_db)
):
    existing = db.query(PurchaseOrder).filter(
        PurchaseOrder.company_id == company_id,
        PurchaseOrder.po_number == po_number
    ).all()
    if existing:
        return DuplicatePOCheckResponse(
            is_duplicate=True,
            po_number=po_number,
            existing_po_ids=[str(p.id) for p in existing],
            message=f"Duplicate PO number found. {len(existing)} existing record(s)."
        )
    return DuplicatePOCheckResponse(
        is_duplicate=False,
        po_number=po_number,
        existing_po_ids=[],
        message="No duplicate PO found. Number is available."
    )
