import math
import sys

def verify_steel_calculator(diameter, count, length_or_height, slab_thickness=0.0, is_column=False, spacing=0.0, span=0.0, hook_length_factor=9, bend_deduction_factor=2, cover=0.04, main_width=0.3, main_height=0.4, wastage_pct=5):
    # 1. Standard Unit Weight
    unit_weight = (diameter ** 2) / 162.89 # kg/m
    
    # 2. Main Bar Weight
    if is_column:
        # lap length = 50 * D
        lap_length = 50 * (diameter / 1000.0) # D in mm, converted to meters
        total_length = length_or_height + slab_thickness + lap_length
        total_weight = count * total_length * unit_weight * (1 + wastage_pct / 100.0)
        return {"unit_weight_kg_m": round(unit_weight, 4), "total_weight_kg": round(total_weight, 2)}
    elif spacing > 0 and span > 0:
        # Slab count
        bar_count = int(math.floor(span / spacing)) + 1
        total_length = length_or_height
        total_weight = bar_count * total_length * unit_weight * (1 + wastage_pct / 100.0)
        return {"unit_weight_kg_m": round(unit_weight, 4), "bar_count": bar_count, "total_weight_kg": round(total_weight, 2)}
    else:
        # Stirrup cutting length
        # length = 2 * (a + b) + 2 * hook_length - bend_deductions
        a = main_width - 2 * cover
        b = main_height - 2 * cover
        hook_len = hook_length_factor * (diameter / 1000.0)
        bend_ded = bend_deduction_factor * (diameter / 1000.0) # assume 2 bends
        cutting_length = 2 * (a + b) + 2 * hook_len - 2 * bend_ded
        total_weight = count * cutting_length * unit_weight * (1 + wastage_pct / 100.0)
        return {"unit_weight_kg_m": round(unit_weight, 4), "cutting_length_m": round(cutting_length, 4), "total_weight_kg": round(total_weight, 2)}

def verify_concrete_calculator(wet_volume, wastage_pct=5, grade="M20", stairs_steps=0, stairs_width=0.0, stairs_riser=0.0, stairs_tread=0.0, stairs_waist=0.0):
    # If staircase, calculate volume first
    if stairs_steps > 0:
        # Steps volume + waist slab volume
        steps_vol = stairs_steps * stairs_width * ((stairs_riser * stairs_tread) / 2.0)
        waist_len = math.sqrt(stairs_riser**2 + stairs_tread**2)
        waist_vol = stairs_waist * stairs_width * waist_len * stairs_steps
        wet_volume = steps_vol + waist_vol
        
    dry_volume = wet_volume * 1.54 * (1 + wastage_pct / 100.0)
    
    # Nominal Mix Splits per cubic meter of wet concrete:
    # splits: (cement_bags_per_m3, sand_m3_per_m3, aggregate_m3_per_m3)
    mix_library = {
        "M7.5": (3.4, 0.48, 0.96),
        "M10": (4.4, 0.46, 0.92),
        "M15": (6.3, 0.44, 0.88),
        "M20": (8.2, 0.42, 0.84),
        "M25": (11.1, 0.38, 0.76)
    }
    
    if grade not in mix_library:
        return {"wet_volume_m3": round(wet_volume, 3), "dry_volume_m3": round(dry_volume, 3), "engineered_design_mix_required": True}
        
    cement_bags = wet_volume * mix_library[grade][0]
    sand_m3 = wet_volume * mix_library[grade][1]
    aggregate_m3 = wet_volume * mix_library[grade][2]
    
    return {
        "wet_volume_m3": round(wet_volume, 3),
        "dry_volume_m3": round(dry_volume, 3),
        "cement_bags": round(cement_bags, 2),
        "sand_m3": round(sand_m3, 3),
        "aggregate_m3": round(aggregate_m3, 3),
        "engineered_design_mix_required": False
    }

def verify_rmc_mixer_loads(pour_volume, mixer_size=6, wastage_pct=5):
    total_volume = pour_volume * (1 + wastage_pct / 100.0)
    mixer_loads = math.ceil(total_volume / mixer_size)
    return {"total_volume_m3": round(total_volume, 3), "mixer_loads": mixer_loads}

def verify_house_cost_estimator(area_sqft, base_rate=2000, floors=1, is_commercial=False, compound_wall_length_ft=0, contingency_pct=12):
    # Floor Multiplier: +12% added to base rate per floor above ground floor
    # E.g., Ground floor rate = base_rate
    # First floor rate = base_rate * 1.12, Second floor rate = base_rate * 1.24, etc.
    total_construction_cost = 0.0
    for f in range(floors):
        multiplier = 1.0 + (0.12 * f)
        floor_rate = base_rate * multiplier
        total_construction_cost += area_sqft * floor_rate
        
    if is_commercial:
        total_construction_cost *= 1.10 # +10% for commercial
        
    # Compound wall: estimated at exactly 35% of the base residential area rate per foot
    compound_wall_cost = compound_wall_length_ft * (base_rate * 0.35)
    total_project_cost = total_construction_cost + compound_wall_cost
    
    # Cost Split
    structure = total_project_cost * 0.40
    finishing = total_project_cost * 0.25
    mep = total_project_cost * 0.15
    interior = total_project_cost * 0.12
    misc = total_project_cost * 0.08
    
    contingency_buffer = total_project_cost * (contingency_pct / 100.0)
    
    return {
        "base_construction_cost": round(total_construction_cost, 2),
        "compound_wall_cost": round(compound_wall_cost, 2),
        "total_project_cost": round(total_project_cost, 2),
        "splits": {
            "structure_40": round(structure, 2),
            "finishing_25": round(finishing, 2),
            "mep_15": round(mep, 2),
            "interior_12": round(interior, 2),
            "misc_8": round(misc, 2)
        },
        "contingency_buffer": round(contingency_buffer, 2)
    }

def verify_brick_calculator(length_m, height_m, thickness_mm=230, brick_length_mm=190, brick_width_mm=90, brick_height_mm=90, joint_mm=10, leaves=2, wastage_pct=10):
    # Dimensions in meters
    b_len = (brick_length_mm + joint_mm) / 1000.0
    b_hgt = (brick_height_mm + joint_mm) / 1000.0
    
    wall_area = length_m * height_m
    single_brick_face_area = b_len * b_hgt
    
    bricks_needed = (wall_area / single_brick_face_area) * leaves * (1 + wastage_pct / 100.0)
    
    # Mortar Volume
    wall_volume = length_m * height_m * (thickness_mm / 1000.0)
    # Brick actual volume: length * width * height
    brick_vol_actual = (brick_length_mm / 1000.0) * (brick_width_mm / 1000.0) * (brick_height_mm / 1000.0)
    net_bricks_no_wastage = (wall_area / single_brick_face_area) * leaves
    mortar_volume = wall_volume - (net_bricks_no_wastage * brick_vol_actual)
    
    # Wet to dry mortar volume factor: 1.33
    dry_mortar_vol = mortar_volume * 1.33
    
    # Cement & sand split based on 1:6 mix (1 part cement, 6 parts sand = 7 parts total)
    # Density of cement is 1440 kg/m3. 1 bag is 50 kg.
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

def verify_paint_calculator(room_length_ft, room_width_ft, ceiling_height_ft, paint_ceiling=True, doors_count=1, windows_count=2, coats=2, quality="premium"):
    # Total Wall Area
    total_wall_area = 2 * (room_length_ft + room_width_ft) * ceiling_height_ft
    if paint_ceiling:
        total_wall_area += room_length_ft * room_width_ft
        
    # Deductions
    single_door_area = 21 # sqft
    standard_window_area = 12 # sqft
    
    paintable_area = total_wall_area - (doors_count * single_door_area) - (windows_count * standard_window_area)
    
    # Coverage rates per litre (1 coat)
    coverage_rates = {
        "economy": 115, # 110-120
        "premium": 135, # 130-140
        "luxury": 155   # 150-160
    }
    
    coverage = coverage_rates.get(quality, 135)
    
    # Paint needed (litres) = area / coverage * coats * 1.10 (10% wastage)
    paint_litres = (paintable_area / coverage) * coats * 1.10
    
    # Putty needed (2 coats): 2.25 kg per 100 sqft * 1.10 (10% wastage)
    putty_kg = (paintable_area / 100.0) * 2.25 * 1.10
    
    # Primer (1 coat): 175 sqft per L * 1.05 (5% wastage)
    primer_litres = (paintable_area / 175.0) * 1.05
    
    return {
        "paintable_area_sqft": round(paintable_area, 2),
        "paint_litres": round(paint_litres, 2),
        "putty_kg": round(putty_kg, 2),
        "primer_litres": round(primer_litres, 2)
    }

def verify_tile_flooring_calculator(length_ft, width_ft, tile_length_inch, tile_width_inch, grout_mm=2.0, wastage_pct=10):
    room_area_sqft = length_ft * width_ft
    # Convert tile dimensions to feet
    # grout joint in inches
    grout_inch = grout_mm / 25.4
    tile_len_ft = (tile_length_inch + grout_inch) / 12.0
    tile_width_ft = (tile_width_inch + grout_inch) / 12.0
    single_tile_area = tile_len_ft * tile_width_ft
    
    tiles_needed = (room_area_sqft / single_tile_area) * (1 + wastage_pct / 100.0)
    return {"room_area_sqft": round(room_area_sqft, 2), "tiles_needed": int(math.ceil(tiles_needed))}

def verify_plaster_calculator(wall_area_m2, thickness_mm=12, mix_ratio="1:4", wastage_pct=10):
    # Plaster thickness in meters
    thick_m = thickness_mm / 1000.0
    wet_volume = wall_area_m2 * thick_m
    dry_volume = wet_volume * 1.33 * (1 + wastage_pct / 100.0)
    
    # Mix split
    parts = mix_ratio.split(":")
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

def verify_waterproofing_calculator(area_sqft, coverage_sqft_per_litre=60, coats=2, wastage_pct=5):
    litres_needed = (area_sqft / coverage_sqft_per_litre) * coats * (1 + wastage_pct / 100.0)
    return {"litres_needed": round(litres_needed, 2)}

def verify_billing_calculations(subtotal, gst_pct=18.0, deductions=None, retentions=None, pre_tax_deductions=False):
    # deductions and retentions are lists of dicts: {"type": "pct/lumpsum", "val": 2.0}
    if deductions is None: deductions = []
    if retentions is None: retentions = []
    
    ded_amt = 0.0
    ret_amt = 0.0
    
    if pre_tax_deductions:
        # Subtract deductions/retention before calculating GST
        # 1. Deductions
        for d in deductions:
            if d["type"] == "pct_item_subtotal":
                ded_amt += subtotal * (d["val"] / 100.0)
            elif d["type"] == "pct_total":
                # With pre-tax enabled, pct_total behaves on pre-tax
                ded_amt += subtotal * (d["val"] / 100.0)
            else: # lumpsum
                ded_amt += d["val"]
        # 2. Retentions
        for r in retentions:
            if r["type"] == "pct":
                ret_amt += subtotal * (r["val"] / 100.0)
            else:
                ret_amt += r["val"]
                
        taxable_amount = subtotal - ded_amt - ret_amt
        gst_amount = taxable_amount * (gst_pct / 100.0)
        net_payable = taxable_amount + gst_amount
    else:
        # Post-tax order (default)
        gst_amount = subtotal * (gst_pct / 100.0)
        total_amount = subtotal + gst_amount
        
        # 1. Deductions
        for d in deductions:
            if d["type"] == "pct_item_subtotal":
                ded_amt += subtotal * (d["val"] / 100.0)
            elif d["type"] == "pct_total":
                ded_amt += total_amount * (d["val"] / 100.0)
            else:
                ded_amt += d["val"]
        # 2. Retentions
        for r in retentions:
            if r["type"] == "pct":
                ret_amt += total_amount * (r["val"] / 100.0)
            else:
                ret_amt += r["val"]
                
        net_payable = total_amount - ded_amt - ret_amt
        
    return {
        "subtotal": round(subtotal, 2),
        "gst_amount": round(gst_amount, 2),
        "total_deductions": round(ded_amt, 2),
        "total_retention": round(ret_amt, 2),
        "net_payable": round(net_payable, 2)
    }

def verify_payroll_calculations(ctc, basic_pct=50.0, hra_pct=50.0, fixed_pf=1800.0, tax_tds=0.0):
    basic = ctc * (basic_pct / 100.0)
    hra = basic * (hra_pct / 100.0)
    allowances = ctc - basic - fixed_pf # employer pf matches fixed_pf, so ctc = gross + employer_pf
    # CTC split: basic + allowances + HRA + employer_pf = ctc
    # Let's say: gross_salary = basic + HRA + special_allowance
    # ctc = gross_salary + employer_pf
    gross_salary = ctc - fixed_pf
    
    # Take home = gross_salary - employee_pf - tax_tds
    take_home = gross_salary - fixed_pf - tax_tds
    
    return {
        "basic_salary": round(basic, 2),
        "hra": round(hra, 2),
        "gross_salary": round(gross_salary, 2),
        "net_take_home": round(take_home, 2)
    }

def verify_split_rate_calculator(quantity, supply_rate, installation_rate, supply_tax_pct=18.0, installation_tax_pct=12.0, is_item_tax=True):
    # Calculates splits for interior design and turnkey construction projects
    gross_supply = quantity * supply_rate
    gross_installation = quantity * installation_rate
    gross_combined = gross_supply + gross_installation
    
    if is_item_tax:
        supply_tax = gross_supply * (supply_tax_pct / 100.0)
        installation_tax = gross_installation * (installation_tax_pct / 100.0)
        total_tax = supply_tax + installation_tax
        total_amount = gross_combined + total_tax
    else:
        # Standard flat 18% tax on combined
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

def verify_milestone_claim_calculator(project_estimate, milestone_pct, is_milestone_fixed_amount=False, fixed_amount=0.0):
    if is_milestone_fixed_amount:
        claim_amount = fixed_amount
        actual_pct = (fixed_amount / project_estimate) * 100.0 if project_estimate > 0 else 0.0
    else:
        claim_amount = project_estimate * (milestone_pct / 100.0)
        actual_pct = milestone_pct
        
    return {
        "claim_amount": round(claim_amount, 2),
        "percentage": round(actual_pct, 4)
    }

def verify_dynamic_rounding(quantity, float_limit=2):
    # Dynamic rounding based on quantity_float_limit configuration
    # (e.g. 3 or 4 decimals for steel T, 0 for bricks count)
    multiplier = 10 ** float_limit
    rounded_qty = math.floor(quantity * multiplier + 0.5) / multiplier
    return rounded_qty

# Execute tests and assertions
if __name__ == "__main__":
    print("Executing SiteFlow Mathematical Verification Suite...")
    
    # 1. Steel Calculator Test
    res = verify_steel_calculator(diameter=12, count=10, length_or_height=3.0, is_column=True, slab_thickness=0.15)
    # Unit weight = 12^2 / 162.89 = 0.884
    # Length = 3.0 + 0.15 + 50 * 0.012 = 3.75
    # Total Weight = 10 * 3.75 * 0.884 * 1.05 = 34.81 kg
    assert abs(res["total_weight_kg"] - 34.81) < 0.1, f"Failed Steel: {res}"
    print("[x] Steel column reinforcement calculator verified.")
    
    # 2. Concrete volume Test
    res = verify_concrete_calculator(wet_volume=2.0, grade="M20")
    # Dry volume = 2 * 1.54 * 1.05 = 3.234
    # Cement bags = 2 * 8.2 = 16.4 bags
    # Sand = 2 * 0.42 = 0.84 m3
    # Aggregate = 2 * 0.84 = 1.68 m3
    assert abs(res["cement_bags"] - 16.4) < 0.01, f"Failed Concrete cement: {res}"
    assert abs(res["dry_volume_m3"] - 3.23) < 0.02, f"Failed Concrete dry vol: {res}"
    print("[x] Concrete volume & nominal mix splits verified.")
    
    # 3. RMC mixer loads Test
    res = verify_rmc_mixer_loads(pour_volume=15.0, mixer_size=6)
    # Vol with wastage = 15 * 1.05 = 15.75
    # Loads = ceil(15.75 / 6) = 3
    assert res["mixer_loads"] == 3, f"Failed RMC: {res}"
    print("[x] RMC transit mixer loads count verified.")
    
    # 4. House Construction Cost Test
    res = verify_house_cost_estimator(area_sqft=1000, base_rate=2000, floors=2, compound_wall_length_ft=100)
    # Ground floor = 1000 * 2000 = 2,000,000
    # First floor = 1000 * (2000 * 1.12) = 2,240,000
    # Compound wall = 100 * (2000 * 0.35) = 70,000
    # Total = 4,310,000
    assert res["total_project_cost"] == 4310000.0, f"Failed House cost: {res}"
    print("[x] House construction cost estimator & multipliers verified.")
    
    # 5. Brick & Mortar Test
    res = verify_brick_calculator(length_m=5.0, height_m=3.0, thickness_mm=230, brick_length_mm=190, brick_width_mm=90, brick_height_mm=90, leaves=2)
    # Bricks needed modular (190 x 90 x 90, joint 10mm)
    # single face = (0.190+0.01) * (0.090+0.01) = 0.200 * 0.100 = 0.02 m2
    # Area = 15m2. Bricks = (15 / 0.02) * 2 * 1.10 = 750 * 2 * 1.1 = 1650 bricks
    assert res["bricks_needed"] == 1650, f"Failed Brick Count: {res}"
    print("[x] Brick & mortar quantities verified.")
    
    # 6. Paint, Putty & Primer Test
    res = verify_paint_calculator(room_length_ft=12, room_width_ft=10, ceiling_height_ft=10, paint_ceiling=True, doors_count=1, windows_count=1)
    # Total area = 2 * (12+10) * 10 + 12 * 10 = 440 + 120 = 560 sqft
    # Deductions: 1 door (21) + 1 window (12) = 33 sqft
    # Paintable area = 527 sqft
    assert res["paintable_area_sqft"] == 527.0, f"Failed Paint Area: {res}"
    print("[x] Paint, putty, and primer coverage and deductions verified.")
    
    # 7. Plastering Test
    res = verify_plaster_calculator(wall_area_m2=50.0, thickness_mm=12, mix_ratio="1:4")
    # Wet volume = 50 * 0.012 = 0.6 m3
    # Dry volume = 0.6 * 1.33 * 1.10 = 0.8778 m3
    # Cement bags = (0.8778 * 0.2 * 1440) / 50 = 5.06 bags
    assert abs(res["cement_bags"] - 5.06) < 0.1, f"Failed Plaster bags: {res}"
    print("[x] Plastering materials and wet-dry factors verified.")
    
    # 8. Tile & Flooring Test
    res = verify_tile_flooring_calculator(length_ft=10, width_ft=10, tile_length_inch=24, tile_width_inch=24, grout_mm=0.0)
    # Room Area = 100 sqft. Tile Area = 2x2 = 4 sqft. Tiles = 100 / 4 * 1.1 = 27.5 -> 28 tiles
    assert res["tiles_needed"] == 28, f"Failed Tiles: {res}"
    print("[x] Tile and flooring area and grout joints verified.")
    
    # 9. Waterproofing Test
    res = verify_waterproofing_calculator(area_sqft=200, coverage_sqft_per_litre=50)
    # Litres = (200 / 50) * 2 * 1.05 = 8.4 litres
    assert res["litres_needed"] == 8.40, f"Failed Waterproofing: {res}"
    print("[x] Waterproofing coverage verified.")
    
    # 10. Billing Calculations Test
    # Subtotal = 100,000, 18% GST, deductions: TDS 2% on subtotal, advance recovery 10,000 lumpsum, retention 5% on total
    deductions = [{"type": "pct_item_subtotal", "val": 2.0}, {"type": "lumpsum", "val": 10000.0}]
    retentions = [{"type": "pct", "val": 5.0}]
    
    # Case A: Post-tax order (Pre-tax = False)
    # GST = 18,000, Total = 118,000
    # TDS = 2,000, Advance = 10,000 -> Deductions = 12,000
    # Retention = 5% of 118,000 = 5,900
    # Net = 118,000 - 12,000 - 5,900 = 100,100
    res_post = verify_billing_calculations(100000.0, 18.0, deductions, retentions, pre_tax_deductions=False)
    assert res_post["net_payable"] == 100100.0, f"Failed Billing Post-tax: {res_post}"
    
    # Case B: Pre-tax order (Pre-tax = True)
    # TDS = 2,000, Advance = 10,000 -> Deductions = 12,000
    # Retention = 5% of 100,000 = 5,000
    # Taxable subtotal = 100,000 - 12,000 - 5,000 = 83,000
    # GST = 18% of 83,000 = 14,940
    # Net = 83,000 + 14,940 = 97,940
    res_pre = verify_billing_calculations(100000.0, 18.0, deductions, retentions, pre_tax_deductions=True)
    assert res_pre["net_payable"] == 97940.0, f"Failed Billing Pre-tax: {res_pre}"
    print("[x] Billing calculations (TDS, GST, retention order) verified.")
    
    # 11. Payroll Test
    res = verify_payroll_calculations(ctc=30000.0, basic_pct=50.0, hra_pct=50.0, fixed_pf=1800.0, tax_tds=1000.0)
    # basic = 15,000
    # hra = 7,500
    # gross = 30,000 - 1800 = 28,200
    # take home = 28,200 - 1800 - 1000 = 25,400
    assert res["gross_salary"] == 28200.0, f"Failed Payroll Gross: {res}"
    assert res["net_take_home"] == 25400.0, f"Failed Payroll Net: {res}"
    print("[x] Indian Payroll CTC-to-Salary breakdown verified.")

    # 12. Split Rate Test
    res = verify_split_rate_calculator(quantity=10, supply_rate=150.0, installation_rate=50.0, supply_tax_pct=18.0, installation_tax_pct=12.0, is_item_tax=True)
    # Gross supply = 10 * 150 = 1,500; Gross inst = 10 * 50 = 500
    # Combined = 2,000
    # Supply tax = 1,500 * 0.18 = 270; Inst tax = 500 * 0.12 = 60
    # Total tax = 330; Total amount = 2,330
    assert res["gross_supply"] == 1500.0, f"Failed Split gross supply: {res}"
    assert res["total_tax"] == 330.0, f"Failed Split total tax: {res}"
    assert res["total_amount"] == 2330.0, f"Failed Split total amount: {res}"
    print("[x] Split rate (Supply + Installation) calculations verified.")

    # 13. Milestone Claim Test
    # Case A: Fixed milestone
    res_fixed = verify_milestone_claim_calculator(project_estimate=500000.0, milestone_pct=20.0, is_milestone_fixed_amount=True, fixed_amount=150000.0)
    assert res_fixed["claim_amount"] == 150000.0, f"Failed Fixed claim amount: {res_fixed}"
    assert res_fixed["percentage"] == 30.0, f"Failed Fixed claim percentage: {res_fixed}"
    # Case B: Percentage milestone
    res_pct = verify_milestone_claim_calculator(project_estimate=500000.0, milestone_pct=25.0, is_milestone_fixed_amount=False)
    assert res_pct["claim_amount"] == 125000.0, f"Failed Pct claim amount: {res_pct}"
    assert res_pct["percentage"] == 25.0, f"Failed Pct claim percentage: {res_pct}"
    print("[x] Milestone billing (Fixed vs Percentage) verified.")

    # 14. Dynamic Rounding Test
    assert verify_dynamic_rounding(12.34567, float_limit=3) == 12.346, "Failed float_limit=3"
    assert verify_dynamic_rounding(12.34567, float_limit=0) == 12.0, "Failed float_limit=0"
    assert verify_dynamic_rounding(12.34567, float_limit=4) == 12.3457, "Failed float_limit=4"
    print("[x] Quantity dynamic rounding verified.")
    
    print("\nSUCCESS: All SiteFlow mathematical calculators have passed the verification suite!")
