from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import math

router = APIRouter(prefix="/calculators", tags=["Calculators"])

# 1. Steel Calculator
class SteelCalcRequest(BaseModel):
    diameter: float = Field(..., description="Diameter of bar in mm", example=12.0)
    count: int = Field(..., description="Count of bars or stirrups", example=10)
    length_or_height: float = Field(..., description="Length of bar or height of column in meters", example=3.0)
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

@router.post("/steel")
def calc_steel(req: SteelCalcRequest):
    unit_weight = (req.diameter ** 2) / 162.89
    
    if req.is_column:
        lap_length = 50 * (req.diameter / 1000.0)
        total_length = req.length_or_height + req.slab_thickness + lap_length
        total_weight = req.count * total_length * unit_weight * (1 + req.wastage_pct / 100.0)
        return {
            "unit_weight_kg_m": round(unit_weight, 4),
            "total_weight_kg": round(total_weight, 2),
            "total_length_m": round(total_length, 2)
        }
    elif req.spacing > 0 and req.span > 0:
        bar_count = int(math.floor(req.span / req.spacing)) + 1
        total_length = req.length_or_height
        total_weight = bar_count * total_length * unit_weight * (1 + req.wastage_pct / 100.0)
        return {
            "unit_weight_kg_m": round(unit_weight, 4),
            "bar_count": bar_count,
            "total_weight_kg": round(total_weight, 2)
        }
    else:
        # Stirrup
        a = req.main_width - 2 * req.cover
        b = req.main_height - 2 * req.cover
        hook_len = req.hook_length_factor * (req.diameter / 1000.0)
        bend_ded = req.bend_deduction_factor * (req.diameter / 1000.0)
        cutting_length = 2 * (a + b) + 2 * hook_len - 2 * bend_ded
        total_weight = req.count * cutting_length * unit_weight * (1 + req.wastage_pct / 100.0)
        return {
            "unit_weight_kg_m": round(unit_weight, 4),
            "cutting_length_m": round(cutting_length, 4),
            "total_weight_kg": round(total_weight, 2)
        }

# 2. Concrete Volume & Mix
class ConcreteCalcRequest(BaseModel):
    wet_volume: float = Field(0.0, description="Wet volume in m3", example=2.0)
    wastage_pct: float = Field(5.0, description="Wastage percentage", example=5.0)
    grade: str = Field("M20", description="Concrete nominal grade (M7.5, M10, M15, M20, M25)", example="M20")
    stairs_steps: int = Field(0, description="Staircase steps count", example=0)
    stairs_width: float = Field(0.0, description="Staircase width in meters", example=0.0)
    stairs_riser: float = Field(0.0, description="Staircase riser in meters", example=0.0)
    stairs_tread: float = Field(0.0, description="Staircase tread in meters", example=0.0)
    stairs_waist: float = Field(0.0, description="Staircase waist slab thickness in meters", example=0.0)

@router.post("/concrete")
def calc_concrete(req: ConcreteCalcRequest):
    wet_volume = req.wet_volume
    if req.stairs_steps > 0:
        steps_vol = req.stairs_steps * req.stairs_width * ((req.stairs_riser * req.stairs_tread) / 2.0)
        waist_len = math.sqrt(req.stairs_riser**2 + req.stairs_tread**2)
        waist_vol = req.stairs_waist * req.stairs_width * waist_len * req.stairs_steps
        wet_volume = steps_vol + waist_vol
        
    dry_volume = wet_volume * 1.54 * (1 + req.wastage_pct / 100.0)
    
    mix_library = {
        "M7.5": (3.4, 0.48, 0.96),
        "M10": (4.4, 0.46, 0.92),
        "M15": (6.3, 0.44, 0.88),
        "M20": (8.2, 0.42, 0.84),
        "M25": (11.1, 0.38, 0.76)
    }
    
    if req.grade not in mix_library:
        return {
            "wet_volume_m3": round(wet_volume, 3),
            "dry_volume_m3": round(dry_volume, 3),
            "engineered_design_mix_required": True
        }
        
    cement_bags = wet_volume * mix_library[req.grade][0]
    sand_m3 = wet_volume * mix_library[req.grade][1]
    aggregate_m3 = wet_volume * mix_library[req.grade][2]
    
    return {
        "wet_volume_m3": round(wet_volume, 3),
        "dry_volume_m3": round(dry_volume, 3),
        "cement_bags": round(cement_bags, 2),
        "sand_m3": round(sand_m3, 3),
        "aggregate_m3": round(aggregate_m3, 3),
        "engineered_design_mix_required": False
    }

# 3. RMC Mixer Load
class RMCCalcRequest(BaseModel):
    pour_volume: float = Field(..., description="Pour volume in m3", example=15.0)
    mixer_size: float = Field(6.0, description="Transit mixer capacity in m3", example=6.0)
    wastage_pct: float = Field(5.0, example=5.0)

@router.post("/rmc")
def calc_rmc(req: RMCCalcRequest):
    total_volume = req.pour_volume * (1 + req.wastage_pct / 100.0)
    mixer_loads = math.ceil(total_volume / req.mixer_size)
    return {
        "total_volume_m3": round(total_volume, 3),
        "mixer_loads": mixer_loads
    }

# 4. House Construction Cost
class HouseCalcRequest(BaseModel):
    area_sqft: float = Field(..., example=1000.0)
    base_rate: float = Field(2000.0, example=2000.0)
    floors: int = Field(1, example=2)
    is_commercial: bool = Field(False, example=False)
    compound_wall_length_ft: float = Field(0.0, example=100.0)
    contingency_pct: float = Field(12.0, example=12.0)

@router.post("/house-cost")
def calc_house_cost(req: HouseCalcRequest):
    total_construction_cost = 0.0
    for f in range(req.floors):
        multiplier = 1.0 + (0.12 * f)
        floor_rate = req.base_rate * multiplier
        total_construction_cost += req.area_sqft * floor_rate
        
    if req.is_commercial:
        total_construction_cost *= 1.10
        
    compound_wall_cost = req.compound_wall_length_ft * (req.base_rate * 0.35)
    total_project_cost = total_construction_cost + compound_wall_cost
    
    structure = total_project_cost * 0.40
    finishing = total_project_cost * 0.25
    mep = total_project_cost * 0.15
    interior = total_project_cost * 0.12
    misc = total_project_cost * 0.08
    contingency_buffer = total_project_cost * (req.contingency_pct / 100.0)
    
    return {
        "base_construction_cost": round(total_construction_cost, 2),
        "compound_wall_cost": round(compound_wall_cost, 2),
        "total_project_cost": round(total_project_cost, 2),
        "splits": {
            "structure": round(structure, 2),
            "finishing": round(finishing, 2),
            "mep": round(mep, 2),
            "interior": round(interior, 2),
            "misc": round(misc, 2)
        },
        "contingency_buffer": round(contingency_buffer, 2)
    }

# 5. Brick & Mortar
class BrickCalcRequest(BaseModel):
    length_m: float = Field(..., example=5.0)
    height_m: float = Field(..., example=3.0)
    thickness_mm: float = Field(230.0, example=230.0)
    brick_length_mm: float = Field(190.0, example=190.0)
    brick_width_mm: float = Field(90.0, example=90.0)
    brick_height_mm: float = Field(90.0, example=90.0)
    joint_mm: float = Field(10.0, example=10.0)
    leaves: int = Field(2, example=2)
    wastage_pct: float = Field(10.0, example=10.0)

@router.post("/brick")
def calc_brick(req: BrickCalcRequest):
    b_len = (req.brick_length_mm + req.joint_mm) / 1000.0
    b_hgt = (req.brick_height_mm + req.joint_mm) / 1000.0
    
    wall_area = req.length_m * req.height_m
    single_brick_face_area = b_len * b_hgt
    bricks_needed = (wall_area / single_brick_face_area) * req.leaves * (1 + req.wastage_pct / 100.0)
    
    wall_volume = req.length_m * req.height_m * (req.thickness_mm / 1000.0)
    brick_vol_actual = (req.brick_length_mm / 1000.0) * (req.brick_width_mm / 1000.0) * (req.brick_height_mm / 1000.0)
    net_bricks_no_wastage = (wall_area / single_brick_face_area) * req.leaves
    mortar_volume = wall_volume - (net_bricks_no_wastage * brick_vol_actual)
    
    dry_mortar_vol = mortar_volume * 1.33
    cement_m3 = dry_mortar_vol * (1.0 / 7.0)
    cement_bags = (cement_m3 * 1440.0) / 50.0
    sand_m3 = dry_mortar_vol * (6.0 / 7.0)
    
    return {
        "wall_area_m2": round(wall_area, 2),
        "wall_volume_m3": round(wall_volume, 3),
        "bricks_needed": int(math.ceil(bricks_needed)),
        "mortar_volume_m3": round(mortar_volume, 3),
        "cement_bags": round(cement_bags, 2),
        "sand_m3": round(sand_m3, 3)
    }

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
    total_wall_area = 2 * (req.room_length_ft + req.room_width_ft) * req.ceiling_height_ft
    if req.paint_ceiling:
        total_wall_area += req.room_length_ft * req.room_width_ft
        
    single_door_area = 21.0
    standard_window_area = 12.0
    
    paintable_area = total_wall_area - (req.doors_count * single_door_area) - (req.windows_count * standard_window_area)
    
    coverage_rates = {
        "economy": 115.0,
        "premium": 135.0,
        "luxury": 155.0
    }
    
    coverage = coverage_rates.get(req.quality.lower(), 135.0)
    paint_litres = (paintable_area / coverage) * req.coats * 1.10
    putty_kg = (paintable_area / 100.0) * 2.25 * 1.10
    primer_litres = (paintable_area / 175.0) * 1.05
    
    return {
        "paintable_area_sqft": round(paintable_area, 2),
        "paint_litres": round(paint_litres, 2),
        "putty_kg": round(putty_kg, 2),
        "primer_litres": round(primer_litres, 2)
    }

# 7. Tile Flooring
class TileCalcRequest(BaseModel):
    length_ft: float = Field(..., example=10.0)
    width_ft: float = Field(..., example=10.0)
    tile_length_inch: float = Field(..., example=24.0)
    tile_width_inch: float = Field(..., example=24.0)
    grout_mm: float = Field(2.0, example=2.0)
    wastage_pct: float = Field(10.0, example=10.0)

@router.post("/tile")
def calc_tile(req: TileCalcRequest):
    room_area_sqft = req.length_ft * req.width_ft
    grout_inch = req.grout_mm / 25.4
    tile_len_ft = (req.tile_length_inch + grout_inch) / 12.0
    tile_width_ft = (req.tile_width_inch + grout_inch) / 12.0
    single_tile_area = tile_len_ft * tile_width_ft
    
    tiles_needed = (room_area_sqft / single_tile_area) * (1 + req.wastage_pct / 100.0)
    return {
        "room_area_sqft": round(room_area_sqft, 2),
        "tiles_needed": int(math.ceil(tiles_needed))
    }

# 8. Plastering
class PlasterCalcRequest(BaseModel):
    wall_area_m2: float = Field(..., example=50.0)
    thickness_mm: float = Field(12.0, example=12.0)
    mix_ratio: str = Field("1:4", example="1:4")
    wastage_pct: float = Field(10.0, example=10.0)

@router.post("/plaster")
def calc_plaster(req: PlasterCalcRequest):
    thick_m = req.thickness_mm / 1000.0
    wet_volume = req.wall_area_m2 * thick_m
    dry_volume = wet_volume * 1.33 * (1 + req.wastage_pct / 100.0)
    
    parts = req.mix_ratio.split(":")
    cement_parts = float(parts[0])
    sand_parts = float(parts[1])
    total_parts = cement_parts + sand_parts
    
    cement_m3 = dry_volume * (cement_parts / total_parts)
    cement_bags = (cement_m3 * 1440.0) / 50.0
    sand_m3 = dry_volume * (sand_parts / total_parts)
    
    return {
        "wet_volume_m3": round(wet_volume, 4),
        "dry_volume_m3": round(dry_volume, 4),
        "cement_bags": round(cement_bags, 2),
        "sand_m3": round(sand_m3, 3)
    }

# 9. Waterproofing
class WaterproofingCalcRequest(BaseModel):
    area_sqft: float = Field(..., example=200.0)
    coverage_sqft_per_litre: float = Field(60.0, example=60.0)
    coats: int = Field(2, example=2)
    wastage_pct: float = Field(5.0, example=5.0)

@router.post("/waterproofing")
def calc_waterproofing(req: WaterproofingCalcRequest):
    litres_needed = (req.area_sqft / req.coverage_sqft_per_litre) * req.coats * (1 + req.wastage_pct / 100.0)
    return {
        "litres_needed": round(litres_needed, 2)
    }

# 10. Billing Calculations
class DeductionItem(BaseModel):
    type: str = Field(..., description="pct_item_subtotal, pct_total, or lumpsum")
    val: float = Field(..., description="Deduction value (percentage or lumpsum amount)")

class BillingCalcRequest(BaseModel):
    subtotal: float = Field(..., example=100000.0)
    gst_pct: float = Field(18.0, example=18.0)
    deductions: List[DeductionItem] = Field(default=[])
    retentions: List[DeductionItem] = Field(default=[])
    pre_tax_deductions: bool = Field(False, example=False)

@router.post("/billing")
def calc_billing(req: BillingCalcRequest):
    ded_amt = 0.0
    ret_amt = 0.0
    
    if req.pre_tax_deductions:
        for d in req.deductions:
            if d.type in ["pct_item_subtotal", "pct_total"]:
                ded_amt += req.subtotal * (d.val / 100.0)
            else:
                ded_amt += d.val
        for r in req.retentions:
            if r.type == "pct":
                ret_amt += req.subtotal * (r.val / 100.0)
            else:
                ret_amt += r.val
                
        taxable_amount = req.subtotal - ded_amt - ret_amt
        gst_amount = taxable_amount * (req.gst_pct / 100.0)
        net_payable = taxable_amount + gst_amount
    else:
        gst_amount = req.subtotal * (req.gst_pct / 100.0)
        total_amount = req.subtotal + gst_amount
        
        for d in req.deductions:
            if d.type == "pct_item_subtotal":
                ded_amt += req.subtotal * (d.val / 100.0)
            elif d.type == "pct_total":
                ded_amt += total_amount * (d.val / 100.0)
            else:
                ded_amt += d.val
        for r in req.retentions:
            if r.type == "pct":
                ret_amt += total_amount * (r.val / 100.0)
            else:
                ret_amt += r.val
                
        net_payable = total_amount - ded_amt - ret_amt
        
    return {
        "subtotal": round(req.subtotal, 2),
        "gst_amount": round(gst_amount, 2),
        "total_deductions": round(ded_amt, 2),
        "total_retention": round(ret_amt, 2),
        "net_payable": round(net_payable, 2)
    }

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
    gross_supply = req.quantity * req.supply_rate
    gross_installation = req.quantity * req.installation_rate
    gross_combined = gross_supply + gross_installation
    
    if req.is_item_tax:
        supply_tax = gross_supply * (req.supply_tax_pct / 100.0)
        installation_tax = gross_installation * (req.installation_tax_pct / 100.0)
        total_tax = supply_tax + installation_tax
        total_amount = gross_combined + total_tax
    else:
        total_tax = gross_combined * 0.18
        total_amount = gross_combined + total_tax
        supply_tax = 0.0
        installation_tax = 0.0
        
    return {
        "gross_supply": round(gross_supply, 2),
        "gross_installation": round(gross_installation, 2),
        "gross_combined": round(gross_combined, 2),
        "supply_tax": round(supply_tax, 2),
        "installation_tax": round(installation_tax, 2),
        "total_tax": round(total_tax, 2),
        "total_amount": round(total_amount, 2)
    }
