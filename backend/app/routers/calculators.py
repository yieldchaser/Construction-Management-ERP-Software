from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict
import math

from app.auth import get_current_user
from app.calc_shared import (
    calc_steel_column_or_slab_or_stirrup,
    calc_concrete_backend,
    calc_rmc as shared_calc_rmc,
    calc_house_cost as shared_calc_house_cost,
    calc_brick_backend,
    brick_mortar_share_ok,
    calc_paint as shared_calc_paint,
    calc_tile as shared_calc_tile,
    calc_plaster as shared_calc_plaster,
    calc_waterproofing as shared_calc_waterproofing,
    calc_billing as shared_calc_billing,
    calc_split_rate as shared_calc_split_rate,
)

router = APIRouter(prefix="/calculators", tags=["Calculators"], dependencies=[Depends(get_current_user)])

# 1. Steel Calculator
class SteelCalcRequest(BaseModel):
    # Primary field names (code-canonical)
    diameter: float = Field(0.0, description="Diameter of bar in mm", example=12.0)
    count: int = Field(0, description="Count of bars or stirrups", example=10)
    length_or_height: float = Field(0.0, description="Length of bar or height of column in meters", example=3.0)
    # Spec-alias field names accepted as alternatives
    diameter_mm: Optional[float] = Field(None, description="Alias for diameter (spec compat)", example=12.0)
    num_bars: Optional[int] = Field(None, description="Alias for count (spec compat)", example=10)
    length_m: Optional[float] = Field(None, description="Alias for length_or_height (spec compat)", example=3.0)
    slab_thickness: float = Field(0.0, description="Slab thickness in meters (for columns)", example=0.15)
    is_column: bool = Field(False, description="True if column calculation (adds lap length)", example=True)
    spacing: float = Field(0.0, description="Spacing in meters (for slabs)", example=0.0)
    span: float = Field(0.0, description="Span length in meters (for slabs)", example=0.0)
    hook_length_factor: int = Field(9, description="Multiplier for hooks (e.g. 9 or 12)", example=9)
    bend_deduction_factor: int = Field(2, description="Multiplier for bend deduction (e.g. 2 or 3)", example=2)
    cover: float = Field(0.04, description="Concrete cover in meters", example=0.04)
    main_width: float = Field(0.3, description="Stirrup box width in meters", example=0.3)
    main_height: float = Field(0.4, description="Stirrup box height in meters", example=0.4)
    wastage_pct: float = Field(5.0, description="Wastage percentage", example=5.0)

    @model_validator(mode="after")
    def resolve_aliases(self):
        """Accept spec-named aliases (diameter_mm, num_bars, length_m) as alternatives."""
        conflicts = []
        if self.diameter_mm is not None and self.diameter != 0.0:
            conflicts.append("diameter and diameter_mm")
        if self.num_bars is not None and self.count != 0:
            conflicts.append("count and num_bars")
        if self.length_m is not None and self.length_or_height != 0.0:
            conflicts.append("length_or_height and length_m")
        if conflicts:
            raise ValueError(
                "Provide either the legacy fields or their aliases, not both: " + ", ".join(conflicts)
            )
        if self.diameter_mm is not None and self.diameter == 0.0:
            self.diameter = self.diameter_mm
        if self.num_bars is not None and self.count == 0:
            self.count = self.num_bars
        if self.length_m is not None and self.length_or_height == 0.0:
            self.length_or_height = self.length_m
        if self.diameter <= 0:
            raise ValueError("diameter must be greater than 0")
        if self.count <= 0:
            raise ValueError("count must be greater than 0")
        if self.length_or_height <= 0:
            raise ValueError("length_or_height must be greater than 0")
        return self

@router.post("/steel")
def calc_steel(req: SteelCalcRequest):
    return calc_steel_column_or_slab_or_stirrup(
        diameter=req.diameter,
        count=req.count,
        length_or_height=req.length_or_height,
        slab_thickness=req.slab_thickness,
        is_column=req.is_column,
        spacing=req.spacing,
        span=req.span,
        hook_length_factor=req.hook_length_factor,
        bend_deduction_factor=req.bend_deduction_factor,
        cover=req.cover,
        main_width=req.main_width,
        main_height=req.main_height,
        wastage_pct=req.wastage_pct,
    )

# 2. Concrete Volume & Mix
class ConcreteCalcRequest(BaseModel):
    wet_volume: float = Field(0.0, description="Wet volume in m3 (must be > 0 unless using staircase inputs)", example=2.0)
    wastage_pct: float = Field(5.0, description="Wastage percentage", example=5.0)
    grade: str = Field("M20", pattern="^(M5|M7\\.5|M10|M15|M20|M25|M30|M35|M40|M45)$", description="Concrete nominal grade (M5, M7.5, M10, M15, M20, M25, M30, M35, M40, M45)", example="M20")
    stairs_steps: int = Field(0, description="Staircase steps count", example=0)
    stairs_width: float = Field(0.0, description="Staircase width in meters", example=0.0)
    stairs_riser: float = Field(0.0, description="Staircase riser in meters", example=0.0)
    stairs_tread: float = Field(0.0, description="Staircase tread in meters", example=0.0)
    stairs_waist: float = Field(0.0, description="Staircase waist slab thickness in meters", example=0.0)

    @model_validator(mode="after")
    def validate_volume(self):
        """Reject negative volumes. Zero is allowed only when staircase dimensions are provided."""
        if self.wet_volume < 0:
            raise ValueError("wet_volume must be >= 0 (use staircase fields for stair volumes)")
        if self.wet_volume == 0.0 and self.stairs_steps == 0:
            raise ValueError("wet_volume must be > 0 when no staircase dimensions are provided")
        return self

@router.post("/concrete")
def calc_concrete(req: ConcreteCalcRequest):
    return calc_concrete_backend(
        wet_volume=req.wet_volume,
        wastage_pct=req.wastage_pct,
        grade=req.grade,
        stairs_steps=req.stairs_steps,
        stairs_width=req.stairs_width,
        stairs_riser=req.stairs_riser,
        stairs_tread=req.stairs_tread,
        stairs_waist=req.stairs_waist,
    )

# 3. RMC Mixer Load
class RMCCalcRequest(BaseModel):
    pour_volume: float = Field(..., description="Pour volume in m3", example=15.0)
    mixer_size: float = Field(6.0, description="Transit mixer capacity in m3", example=6.0)
    wastage_pct: float = Field(5.0, example=5.0)

@router.post("/rmc")
def calc_rmc(req: RMCCalcRequest):
    return shared_calc_rmc(pour_volume=req.pour_volume, mixer_size=req.mixer_size, wastage_pct=req.wastage_pct)

# 4. House Construction Cost
class HouseCalcRequest(BaseModel):
    area_sqft: float = Field(..., gt=0, example=1000.0)
    base_rate: float = Field(2000.0, example=2000.0)
    floors: int = Field(1, ge=1, example=2)
    is_commercial: bool = Field(False, example=False)
    compound_wall_length_ft: float = Field(0.0, example=100.0)
    contingency_pct: float = Field(12.0, example=12.0)

@router.post("/house-cost")
def calc_house_cost(req: HouseCalcRequest):
    return shared_calc_house_cost(
        area_sqft=req.area_sqft,
        base_rate=req.base_rate,
        floors=req.floors,
        is_commercial=req.is_commercial,
        compound_wall_length_ft=req.compound_wall_length_ft,
        contingency_pct=req.contingency_pct,
    )

# 5. Brick & Mortar
class BrickCalcRequest(BaseModel):
    length_m: float = Field(..., example=5.0)
    height_m: float = Field(..., example=3.0)
    thickness_mm: float = Field(230.0, example=230.0)
    brick_length_mm: float = Field(190.0, example=190.0)
    brick_width_mm: float = Field(90.0, example=90.0)
    brick_height_mm: float = Field(90.0, example=90.0)
    joint_mm: float = Field(10.0, example=10.0)
    leaves: int = Field(2, example=2, description="Accepted for request compatibility only; leaves are derived from thickness_mm")
    wastage_pct: float = Field(10.0, example=10.0)

    @model_validator(mode="after")
    def validate_geometry(self):
        """R2-279: reject non-physical wall or brick dimensions before deriving leaves."""
        if self.length_m <= 0 or self.height_m <= 0:
            raise ValueError("length_m and height_m must be greater than 0")
        if self.thickness_mm <= 0:
            raise ValueError("thickness_mm must be greater than 0")
        if min(self.brick_length_mm, self.brick_width_mm, self.brick_height_mm) <= 0:
            raise ValueError("brick dimensions must be greater than 0")
        if self.joint_mm < 0:
            raise ValueError("joint_mm cannot be negative")
        return self

@router.post("/brick")
@router.post("/brickwork")  # DEFECT-01 fix: spec-compatible alias
def calc_brick(req: BrickCalcRequest):
    result = calc_brick_backend(
        length_m=req.length_m,
        height_m=req.height_m,
        thickness_mm=req.thickness_mm,
        brick_length_mm=req.brick_length_mm,
        brick_width_mm=req.brick_width_mm,
        brick_height_mm=req.brick_height_mm,
        joint_mm=req.joint_mm,
        wastage_pct=req.wastage_pct,
    )
    # R2-279 sanity guard preserved at router layer for HTTP 422 semantics
    if not brick_mortar_share_ok(result["mortar_volume_m3"], result["wall_volume_m3"]):
        mortar_share = result["mortar_volume_m3"] / result["wall_volume_m3"] if result["wall_volume_m3"] else 0
        raise HTTPException(
            status_code=422,
            detail=(
                f"Inconsistent brickwork geometry: mortar works out to {round(mortar_share * 100)}% of wall "
                f"volume but should be between 20% and 35%. Check that thickness_mm matches the brick size "
                f"(derived leaves: {result['leaves']})."
            ),
        )
    return result

# 6. Paint Quantity
class PaintCalcRequest(BaseModel):
    room_length_ft: float = Field(..., example=12.0)
    room_width_ft: float = Field(..., example=10.0)
    ceiling_height_ft: float = Field(..., example=10.0)
    paint_ceiling: bool = Field(True, example=True)
    doors_count: int = Field(1, example=1)
    windows_count: int = Field(2, example=2)
    coats: int = Field(2, example=2)
    quality: str = Field("premium", example="premium")

@router.post("/paint")
def calc_paint(req: PaintCalcRequest):
    try:
        return shared_calc_paint(
            room_length_ft=req.room_length_ft,
            room_width_ft=req.room_width_ft,
            ceiling_height_ft=req.ceiling_height_ft,
            paint_ceiling=req.paint_ceiling,
            doors_count=req.doors_count,
            windows_count=req.windows_count,
            coats=req.coats,
            quality=req.quality,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

# 7. Tile Flooring
class TileCalcRequest(BaseModel):
    length_ft: float = Field(..., example=10.0)
    width_ft: float = Field(..., example=10.0)
    tile_length_inch: float = Field(..., example=24.0)
    tile_width_inch: float = Field(..., example=24.0)
    grout_mm: float = Field(2.0, example=2.0)
    wastage_pct: float = Field(10.0, example=10.0)

@router.post("/tile")
@router.post("/flooring")  # DEFECT-01 fix: spec-compatible alias
def calc_tile(req: TileCalcRequest):
    return shared_calc_tile(
        length_ft=req.length_ft,
        width_ft=req.width_ft,
        tile_length_inch=req.tile_length_inch,
        tile_width_inch=req.tile_width_inch,
        grout_mm=req.grout_mm,
        wastage_pct=req.wastage_pct,
    )

# 8. Plastering
class PlasterCalcRequest(BaseModel):
    wall_area_m2: float = Field(..., example=50.0)
    thickness_mm: float = Field(12.0, example=12.0)
    mix_ratio: str = Field("1:4", example="1:4")
    wastage_pct: float = Field(10.0, example=10.0)

@router.post("/plaster")
@router.post("/plastering")  # DEFECT-01 fix: spec-compatible alias
def calc_plaster(req: PlasterCalcRequest):
    try:
        return shared_calc_plaster(
            wall_area_m2=req.wall_area_m2,
            thickness_mm=req.thickness_mm,
            mix_ratio=req.mix_ratio,
            wastage_pct=req.wastage_pct,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

# 9. Waterproofing
class WaterproofingCalcRequest(BaseModel):
    area_sqft: float = Field(..., example=200.0)
    coverage_sqft_per_litre: float = Field(60.0, example=60.0)
    coats: int = Field(2, example=2)
    wastage_pct: float = Field(5.0, example=5.0)

@router.post("/waterproofing")
def calc_waterproofing(req: WaterproofingCalcRequest):
    return shared_calc_waterproofing(
        area_sqft=req.area_sqft,
        coverage_sqft_per_litre=req.coverage_sqft_per_litre,
        coats=req.coats,
        wastage_pct=req.wastage_pct,
    )

# 10. Billing Calculations
class DeductionItem(BaseModel):
    type: str = Field(..., pattern="^(pct_item_subtotal|pct_total|lumpsum|pct)$", description="pct_item_subtotal, pct_total, lumpsum, or pct")
    val: float = Field(..., description="Deduction value (percentage or lumpsum amount)")

class BillingCalcRequest(BaseModel):
    subtotal: float = Field(..., example=100000.0)
    gst_pct: float = Field(18.0, example=18.0)
    deductions: List[DeductionItem] = Field(default=[])
    retentions: List[DeductionItem] = Field(default=[])
    pre_tax_deductions: bool = Field(False, example=False)

@router.post("/billing")
def calc_billing(req: BillingCalcRequest):
    return shared_calc_billing(
        subtotal=req.subtotal,
        gst_pct=req.gst_pct,
        deductions=[{"type": d.type, "val": d.val} for d in req.deductions],
        retentions=[{"type": r.type, "val": r.val} for r in req.retentions],
        pre_tax_deductions=req.pre_tax_deductions,
    )

# 11. Split Rate
class SplitRateRequest(BaseModel):
    quantity: float = Field(..., example=10.0)
    supply_rate: float = Field(..., example=150.0)
    installation_rate: float = Field(..., example=50.0)
    supply_tax_pct: float = Field(18.0, example=18.0)
    installation_tax_pct: float = Field(12.0, example=12.0)
    is_item_tax: bool = Field(True, example=True)

@router.post("/split-rate")
def calc_split_rate(req: SplitRateRequest):
    return shared_calc_split_rate(
        quantity=req.quantity,
        supply_rate=req.supply_rate,
        installation_rate=req.installation_rate,
        supply_tax_pct=req.supply_tax_pct,
        installation_tax_pct=req.installation_tax_pct,
        is_item_tax=req.is_item_tax,
    )
