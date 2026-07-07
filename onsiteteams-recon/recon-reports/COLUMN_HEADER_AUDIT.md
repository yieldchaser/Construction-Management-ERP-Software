# COLUMN HEADER FIX TASK

## YOUR JOB
Fix the export column headers in this file so they exactly match what the user sees on screen:
  frontend/src/app/c/[company_id]/reports/page.tsx

The column arrays are inside the `exportSchemas` object (around line 237).
Each key is a report name. Each value is an array of column header strings.
You must make these strings match the EXACT text of the purple column headers in the UI screenshots.

---

## RULES - READ THESE FIRST

1. NEVER guess or assume a column name. Only use what you can read in a screenshot.
2. Screenshots are PNG files in this folder:
   C:\Users\Dell\Github\Construction-Management-ERP-Software\onsiteteams-recon\Extra HAR + Image Recon\All Images Documented\
3. File names look like: Screenshot (6188).png, Screenshot (6189).png etc.
4. Before opening any screenshot, run this to find which files exist in a range:
   Get-ChildItem "C:\Users\Dell\Github\Construction-Management-ERP-Software\onsiteteams-recon\Extra HAR + Image Recon\All Images Documented\" | Where-Object { $_.BaseName -match "Screenshot \(6[12]\d\d\)" } | Select-Object Name | Sort-Object Name
5. In each screenshot, the URL bar at the top tells you which report it is (e.g. /onsite-report/company_level_expense_report).
6. The column headers are in the PURPLE/dark header row of the table. Read them LEFT TO RIGHT.
7. Some tables are wide and scroll. The NEXT screenshot (e.g. 6172 after 6171) shows the continuation. Always check if there is a right-pointing arrow on the table edge -- if yes, open the next screenshot too.
8. After fixing the exportSchemas array, also update the mockRows block for that report inside the triggerDownload function. The mockRows must have the same number of values as columns. Use realistic fake data.
9. After ALL fixes are done, run: npx tsc --noEmit --skipLibCheck inside the frontend/ folder. Fix any errors.
10. Commit with: git commit -m "fix(reports): verify columns from screenshots for [list report names]"

---

## REPORTS TO FIX (one by one in this order)

Do each report in this exact sequence. For each:
- Step 1: Find the screenshot using Get-ChildItem
- Step 2: Open the screenshot and read the URL to confirm it is the right report
- Step 3: Read all column headers left to right from the purple row
- Step 4: If there is a scroll arrow on the right, open the next screenshot too
- Step 5: Update the exportSchemas entry
- Step 6: Update the matching mockRows block
- Step 7: Move to the next report

---

### 1. Item Wise Sales Report
URL slug: /onsite-report/item_wise_sales_report
Current (may be wrong): Sales Type, Project Name, Client Name, Invoice Number, Invoice Date, Item Name, Unit, Quantity, Item Rate, Tax %, Tax Amount, Gross Amount, Total Amount, Invoice Created
Look in screenshot range: 6114 to 6130
Fix the array to match exactly what the screenshot shows.

### 2. Sales Deduction / Retention Report
URL slug: /onsite-report/sales_deduction_report
Current (may be wrong): Name, Amount, Project Name, Party Name, Invoice Number, Creator Name, Type, Entry Creation Date, Due Date
Look in screenshot range: 6114 to 6135
Special check: Is the first column "Name" or "Item Name"?

### 3. Project Wise Payment Summary
URL slug: /onsite-report/project_wise_payment_summary
Current (may be wrong): Project Name, Salary, Net Purchase, Other Expense, Site Expense, SubCon Expense, Total Sales Invoice, Total Expense, Total Out, Total IN, Balance, Margin, Net Transfer
Look in screenshot range: 6135 to 6155
Special check: Is it "SubCon Expense" or "Subcon Expense"? Does "Net Transfer" column exist?

### 4. Payment Request Report
URL slug: /onsite-report/payment_request_report
Current (may be wrong): Payment Request No, Project Name, Party Name, Amount, Payment Date, Due Date, Creator Name, Request Type, Order/Bill No, Approval Status, Payment Status, Remark, Account Name
Look in screenshot range: 6135 to 6160

### 5. Cost Code Expense Analysis
URL slug: /onsite-report/cost_code_expense_analysis
Current (may be wrong): Cost Code, Amount, Budget Amount, Actual Expense, Budget Variance
NOTE: Screenshot 6175 only showed the first column. Open 6175 and the next 1-2 screenshots to see all columns scrolled right.

### 6. Project Wise Expense Summary
URL slug: /onsite-report/project_wise_expense_summary
Current (may be wrong): Project Name, Total Expense, Cost Code Expense, Other Expense
NOTE: Screenshot 6177 only showed "Project Name". Open 6177 and next screenshots to see all columns.

### 7. All Expense Deduction / Retention Report
URL slug: /onsite-report/all_expense_deduction_report (or similar)
Current (may be wrong): Item Name, Amount, Bill Number, Expense Type, Project Name, Party Name, Creator Name, Due Date
Look in screenshot range: 6168 to 6175
Special check: Is it "Bill Number" or "Bill No" or "Invoice Number"?

### 8. All Party Balances
URL slug: /onsite-report/all_party_balance_report (or similar)
Current (may be wrong): Party Name, Party Type, Balance Amount, Balance Type, Petty Cash Balance, Salary Balance
Look in screenshot range: 6178 to 6185
Special check: Do "Petty Cash Balance" and "Salary Balance" columns really exist?

### 9. Material Received & Used Report
URL slug: /onsite-report/material_received_used_report (or similar)
Current (may be wrong): Project Name, Material Name, Opening Quantity, Received Quantity, Used Quantity, Closing Quantity
Look in screenshot range: 6188 to 6200

### 10. Material Stock Report
URL slug: /onsite-report/material_stock_report (or similar)
Current (may be wrong): Material Name, Category, Current Stock, Unit, Average Unit Cost, Total Stock Value
Look in screenshot range: 6188 to 6205
Special check: Is it "Average Unit Cost" or "Avg Unit Cost" or "Average Cost"?

### 11. Unbilled Item Report
URL slug: /onsite-report/unbilled_item_report (or similar)
Current (may be wrong): Project Name, Vendor Name, Item Name, Unbilled Quantity, Unit, Avg Cost, Unbilled Amount
Look in screenshot range: 6188 to 6210

### 12. PO Summary Report
URL slug: /onsite-report/po_summary_report (or similar)
Current (may be wrong): PO Number, Material, Amount, Discount, Other Charges, Tax Amount, Total Amount, Approval Status, Approved or Rejected By, PO Quantity, PO Date, Main Task Name, Group Task Name, Task Name, Equipment Name, Equipment No
Look in screenshot range: 6195 to 6215
Special check: Is it "Material" or "Material Name" for the second column?

### 13. Material Received without PO
URL slug: /onsite-report/material_received_without_po (or similar)
Current (may be wrong): Project Name, Material Name, Quantity, Unit, Vendor Name, Challan Number, Received Date
Look in screenshot range: 6200 to 6218
Special check: Is it "Challan Number" or "Challan No" or "GRN Number"?

### 14. Purchase Order Item Report
URL slug: /onsite-report/purchase_order_item_report (or similar)
Current (may be wrong): PO Number, Item Name, Specifications, Quantity, Unit, Rate, Tax Pct, Total Amount
Look in screenshot range: 6200 to 6220
Special check: Is it "Tax Pct" or "Tax %" or "Tax Rate"?

### 15. Production Material Report
URL slug: /onsite-report/production_material_report (or similar)
Current (may be wrong): Project Name, Material Name, Production Qty, Used Qty, Production Date
Look in screenshot range: 6210 to 6225

### 16. Material Purchase Item Report
URL slug: /onsite-report/material_purchase_item_report (or similar)
Current (may be wrong): Invoice Date, Vendor Name, Item Name, Quantity, Unit, Rate, Tax Pct, Total Amount
Look in screenshot range: 6210 to 6225
Special check: "Tax Pct" vs "Tax %" vs "Tax Rate"

### 17. Material Stock Movement Report
URL slug: /onsite-report/material_stock_movement_report (or similar)
Current (may be wrong): Project Name, Material Name, UOM, Date, Opening Qty, Stock In, Stock Out, Closing Qty
Look in screenshot range: 6215 to 6230
Special check: Is it "UOM" or "Unit" in the column header?

### 18. OT & Shift Report
URL slug: /onsite-report/ot_shift_report (or similar)
Current (may be wrong): Project Name, Party Name, Workforce Name, Attendance Date, No of Workers
Look in screenshot range: 6220 to 6240
Special check: Very likely has more columns like OT Hours, Shift Type etc.

### 19. Attendance & Salary Report
URL slug: /onsite-report/attendance_salary_report (or similar)
Current (may be wrong): Employee Name, Project Name, Attendance Date, Attendance Status, Shift Hours, Payable Amount
Look in screenshot range: 6220 to 6240

### 20. Staff Monthly Salary Slip
URL slug: /onsite-report/staff_monthly_salary_slip (or similar)
Current (may be wrong): Employee Name, Designation, Salary Month, Gross Salary, Deductions, Net Salary Paid
Look in screenshot range: 6225 to 6245
Special check: Likely has many more columns (Basic, HRA, Allowances, PF, ESI etc.)

### 21. Staff Salary Report
URL slug: /onsite-report/staff_salary_report (or similar)
Current (may be wrong): Employee Name, Designation, Bank Account No., Bank Name, Net Salary
Look in screenshot range: 6225 to 6245

### 22. Fuel Efficiency Report
URL slug: /onsite-report/fuel_efficiency_report (or similar)
Current (may be wrong): Equipment Name, Vehicle No, Total Fuel Consumed, Total Hours Used, Fuel Efficiency (L/hr)
Look in screenshot range: 6235 to 6255
Special check: "Fuel Efficiency (L/hr)" -- is this the exact text shown?

### 23. Equipment Expense Summary
URL slug: /onsite-report/equipment_expense_summary (or similar)
Current (may be wrong): Equipment Name, Vehicle No, Rental Expense, Fuel Expense, Other Expense, Total Expense
Look in screenshot range: 6235 to 6255

### 24. Equipment Trip Report
URL slug: /onsite-report/equipment_trip_report (or similar)
Current (may be wrong): Equipment Name, Vehicle No, Trip Date, Start Reading, End Reading, Total Distance/Hours
Look in screenshot range: 6235 to 6260
Special check: Is "Total Distance/Hours" one column or two separate columns?

### 25. Asset Allocation Report
URL slug: /onsite-report/asset_allocation_report (or similar)
Current (may be wrong): Asset Name, Allocated To, Project Name, Allocation Date, Return Date, Status
Look in screenshot range: 6245 to 6265

### 26. Asset Status Report
URL slug: /onsite-report/asset_status_report (or similar)
Current (may be wrong): Asset Name, Serial Number, Category, Purchase Date, Cost, Status
Look in screenshot range: 6245 to 6265

### 27. Warehouse Stock Movement Report
URL slug: /onsite-report/warehouse_stock_movement_report (or similar)
Current (may be wrong): Warehouse Name, Material Name, Date, Stock In, Stock Out, Balance Stock
Look in screenshot range: 6255 to 6275

### 28. Warehouse Transaction Report
URL slug: /onsite-report/warehouse_transaction_report (or similar)
Current (may be wrong): Warehouse Name, Transaction Type, Material Name, Quantity, Creator Name, Date
Look in screenshot range: 6255 to 6275

### 29. Warehouse Current Stock Report
URL slug: /onsite-report/warehouse_current_stock_report (or similar)
Current (may be wrong): Warehouse Name, Material Name, Category, Current Stock, Average Cost
Look in screenshot range: 6255 to 6278
Special check: "Average Cost" vs "Average Unit Cost"?

### 30. Subcon Measurement Book
URL slug: /onsite-report/subcon_measurement_book (or similar)
Current (may be wrong): Workorder No, Group, Section, Item Name, Progress Date, Unit, Estimated Quantity, Opening Quantity, Number, Length, Width, Height, Progress Quantity, Closing Quantity
Look in screenshot range: 6260 to 6280
Special check: Are "Group" and "Section" the exact column labels?

### 31. Subcon Deduction / Retention Report
URL slug: /onsite-report/subcon_deduction_report (or similar)
Current (may be wrong): Amount, Project Name, Party Name, Invoice Number, Creator Name, Type, Entry Creation Date
Look in screenshot range: 6260 to 6280
Special check: Is "Amount" really the FIRST column? Verify the order.

### 32. Subcon Material Issue Summary
URL slug: /onsite-report/subcon_material_issue_summary (or similar)
Current (may be wrong): Project Name, Subcon Name, Material Name, Avg Unit Price, Total Quantity Issued, Total Amount
Look in screenshot range: 6260 to 6283
Special check: Is it "Subcon Name" or "Subcontractor Name"?

### 33. Project Financial Summary
URL slug: /onsite-report/project_financial_summary (or similar)
Current (may be wrong): Project Name, Project Status, Project Health, Project Budget, Total Expense, Budget Remaining, Total Sales, Project Margin, Payment In, Payment Out, Cash Balance
Look in screenshot range: 6270 to 6290

### 34. Company Transactions Report
URL slug: /onsite-report/company_transactions_report (or similar)
Current (may be wrong): Project Name, Transaction Type, Transaction Category, Created Date, Creator Name, Party Name, Cost Code, Sub Cost Code, Total Amount, Net Amount, Paid Amount, Unpaid Amount, Reference No., Notes/Remarks, Description, Due Date, Payment Mode, Approval Status
Look in screenshot range: 6270 to 6292
NOTE: This is a wide table. Check multiple screenshots for the full column list.

### 35. Monthly P&L Report
URL slug: /onsite-report/monthly_pl_report (or similar)
Current (may be wrong): Month, Total Sales, Material Expense, Labor Expense, Equipment Expense, Other Expense, Net Profit
Look in screenshot range: 6278 to 6295

### 36. Payroll Library
URL slug: /onsite-report/payroll_library or /library/ section
Current (may be wrong): Employee Name, Designation, Designation Type, Payroll Type, CTC, Gross Salary, Net Salary, Shift Hours, Salary Breakup, Created Date
Look in screenshot range: 6280 to 6300

### 37. Equipment Library
URL slug: /library/equipment or similar
Current (may be wrong): Equipment Name, Vehicle No, Equipment Type, Vendor Name, Rental Rate, UOM
Look in screenshot range: 6280 to 6302
Special check: Is it "UOM" or "Unit"?

### 38. Quotation Report
URL slug: /onsite-report/quotation_report (or similar)
Current (may be wrong): Quotation Number, Project Name, Client Name, Quotation Date, Estimated Amount, Status
Look in screenshot range: 6285 to 6302

### 39. Quotation Item Report
URL slug: /onsite-report/quotation_item_report (or similar)
Current (may be wrong): Quotation Number, Item Name, Description, Cost Code, Unit, Cost Price, Markup, Selling Price
Look in screenshot range: 6285 to 6302
Special check: "Cost Price" vs "Unit Cost"? "Markup" vs "Markup %"?

### 40. BOQ Measurement Book
URL slug: /onsite-report/boq_measurement_book (or similar)
Current (may be wrong): Project Name, BOQ Code, Item Name, Length, Width, Height, Quantity, Unit
Look in screenshot range: 6288 to 6302
Special check: Is it "BOQ Code" or just "Code"?

### 41. BOQ BOM Report
URL slug: /onsite-report/boq_bom_report (or similar)
Current (may be wrong): BOQ Item Name, Material Name, Specifications, Budget Qty, Unit, Budget Rate, Budget Amount
Look in screenshot range: 6288 to 6302

### 42. Budget vs Actual (Material Cost)
URL slug: /onsite-report/budget_vs_actual_material_cost (or similar)
Current (may be wrong): Project Name, Material Name, Budget Cost, Actual Cost, Variance
Look in screenshot range: 6292 to 6302

### 43. Budget vs Actual (Material Qty)
URL slug: /onsite-report/budget_vs_actual_material_qty (or similar)
Current (may be wrong): Project Name, Material Name, Budget Qty, Actual Qty, Variance
Look in screenshot range: 6292 to 6302

### 44. Budget vs Actual (Cost Code)
URL slug: /onsite-report/budget_vs_actual_cost_code (or similar)
Current (may be wrong): Project Name, Cost Code, Budget Amount, Actual Amount, Variance
Look in screenshot range: 6292 to 6302

### 45. Task Measurement Book
URL slug: /onsite-report/task_measurement_book (or similar)
Current (may be wrong): Project Name, Main Task Name, Group Task Name, Task Name, Progress Date, Unit, Estimated Quantity, Opening Quantity, Number, Length, Width, Height, Progress Quantity, Closing Quantity, Progress Notes
Look in screenshot range: 6144 to 6150
Special check: Does "Progress Notes" column exist?

### 46. Task Resource Budget Vs Actual Report
URL slug: /onsite-report/task_resource_budget_vs_actual (or similar)
Current (may be wrong): Main Task Name, Group Task Name, Task Name, Task Unit, Task Qty, Task Progress Qty, Resource Name, Resource Type, Budgeted Rate, Avg Unit Cost, Budgeted Qty, Qty Actual Used, Budgeted Amount, Actual Amount, Exceeded Qty, Exceeded Amount
Look in screenshot range: 6152 to 6160

### 47. Task Revenue & Expense Report
URL slug: /onsite-report/task_revenue_expense_report (or similar)
Current (may be wrong): Project Name, Main Task Name, Group Task Name, Task Name, Task Progress, Unit, Revenue per task, Expense per task
Look in screenshot range: 6158 to 6166

---

## AFTER ALL REPORTS ARE DONE

Run this command in the frontend/ folder:
  npx tsc --noEmit --skipLibCheck

If there are errors, fix them before committing.

Then commit:
  git add -A
  git commit -m "fix(reports): all export column headers verified from screenshots"

---

## WHAT TO DO IF A SCREENSHOT DOES NOT EXIST

If Get-ChildItem shows a screenshot does not exist in the expected range:
1. Try +/- 5 from the expected range
2. If still not found, search by checking screenshots in batches: 6114-6140, 6140-6170, 6170-6200, 6200-6230, 6230-6260, 6260-6302
3. Identify the report by the URL slug shown in the browser address bar in each screenshot
4. If truly not found, leave that report as-is and note it in the commit message as "skipped - no screenshot"

---

## WHAT NOT TO DO

- Do NOT invent column names
- Do NOT use the "current" values as the answer -- they may be wrong
- Do NOT skip a report because it looks like it might be correct
- Do NOT update mockRows to fewer values than there are columns
- Do NOT commit until tsc passes
