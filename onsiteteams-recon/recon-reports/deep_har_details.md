# Checkpoints 3-5 (Deep Dive): HTTP Header, Payload, & Response Details

Deep inspection of exact request payloads, responses, and headers for core business workflows:

## 🔍 Transaction Flow #1: /apis/v3/add/timesheet (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/timesheet`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "party_company_user_id": "c5f7bbf7-7341-4a1b-b98a-412fa546d813",
  "monkey_patch_party_company_user": {
    "id": "c5f7bbf7-7341-4a1b-b98a-412fa546d813",
    "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
    "company_role_id": "",
    "role": "",
    "type": "material_supplier",
    "creator": "aecbdfea-bbf5-4678-b556-de154d23bf67",
    "name": "Party",
    "mobile": 9336184345,
    "mobile_verified": 0,
    "user_id": "93af1af0-3131-4b2d-aa58-6bd54a2725be",
    "assigned_project_ids": [],
    "pinned_project_ids": [],
    "profile_pic": "",
    "city": "",
    "aadhar_card_number": "938299239120",
    "pan_card_number": "AMLZU8902Z",
    "aadhar_photos": [],
    "pan_photos": [],
    "gstin": "",
    "legal_business_name": "",
    "trade_name": "",
    "state_of_supply": "",
    "billing_address": "",
    "esi_number": "",
    "uan_number": "",
    "date_of_birth": "0001-01-01T00:00:00Z",
    "sms_enabled": 1,
    "updated_by": "",
    "hidden": 0,
    "opening_balance": 40000,
    "dashboard_preferences": [],
    "prefix": "PID-",
    "sequence": 1,
    "party_id": "PID-1",
    "tag_ids": [],
    "custom_fields": [],
    "bank_account_ids": [
      "4a6c7ddc-8540-4934-99ce-de1e1b3959ea"
    ],
    "company_user_bank_account_ids": [
      "fe8c3eeb-9b2c-459a-a8ed-4ea7bf1e92f2"
    ],
    "upi_ids": [],
    "address_ids": [
      "55cbb944-d3ae-4772-87b3-219b9f7f44ba"
    ],
    "created": "2026-07-04T19:32:14.33Z",
    "updated": "2026-07-04T19:32:14.635Z",
    "monkey_patch_creator": {
      "id": "",
      "name": "",
      "mobile": 0,
      "country_code": "",
      "profile_pic": "",
      "mobile_verified": 0,
      "invited": 0,
      "invitation_count": 0,
      "profession": ""
    },
    "monkey_patch_user": {
      "id": "",
      "name": "",
      "mobile": 0,
      "country_code": "",
      "profile_pic": "",
      "mobile_verified": 0,
      "invited": 0,
      "invitation_count": 0,
      "profession": ""
    },
    "monkey_patch_staffledgerbooks": null,
    "monkey_patch_policy_ids": null,
    "monkey_patch_wallet": {
      "id": "",
      "company_id": "",
      "owner_id": "",
      "owner_type": "",
      "bank_account_id": "",
      "in_amount": 0,
      "out_amount": 0,
      "balance": 0,
      "delete": 0,
      "created": "0001-01-01T00:00:00Z",
      "updated": "0001-01-01T00:00:00Z",
      "monkey_patch_company_user": null,
      "monkey_patch_company": null,
      "monkey_patch_bank_account": null,
      "salary_payment_amount": 0,
      "cut_off_time": "0001-01-01T00:00:00Z",
      "cold_in_amount": 0,
      "cold_out_amount": 0,
      "hot_in_amount": 0,
      "hot_out_amount": 0,
      "cold_salary_payment_amount": 0,
      "hot_salary_payment_amount": 0,
      "entry_time": "0001-01-01T00:00:00Z",
      "monkey_patch_company_bank_account": null
    },
    "monkey_patch_company_role": {
      "id": "",
      "role": "",
      "name": "",
      "description": "",
      "company_id": "",
      "creator_company_user_id": "",
      "policy_ids": null,
      "hidden": 0,
      "delete": 0,
      "created": "0001-01-01T00:00:00Z",
      "updated": "0001-01-01T00:00:00Z",
      "monkey_patch_policies": null
    },
    "monkey_patch_is_project_member": 0,
    "monkey_patch_project_count": 0,
    "monkey_patch_warehouse_count": 0,
    "is_chat_group_member": 0,
    "is_chat_group_admin": 0,
    "email": "",
    "rating": 0,
    "monkey_patch_primary_address": {
      "id": "",
      "company_id": "",
      "creator_company_user_id": "",
      "owner_id": "",
      "address_type": "",
      "address_title": "",
      "address_gst": "",
      "address_line_1": "",
      "address_line_2": "",
      "city": "",
      "state": "",
      "postal_code": "",
      "country_code": "",
      "location": {
        "type": "",
        "coordinates": null
      },
      "google_address": null,
      "primary": 0,
      "delete": 0,
      "created": "0001-01-01T00:00:00Z",
      "updated": "0001-01-01T00:00:00Z",
      "search": "",
      "monkey_patch_country_config": {
        "country_code": "",
        "country_iso": "",
        "country_name": "",
        "created": "0001-01-01T00:00:00Z",
        "minimum_digits": 0,
        "maximum_digits": 0,
        "login_channels": null,
        "currency": "",
        "flag": "",
        "tax_slabs": null,
        "tax_display_name": "",
        "tax_value_display_name": "",
        "published": 0,
        "decimal_digit": 0,
        "timezone": ""
      }
    },
    "date_of_joining": "2026-07-01T19:32:14.95Z",
    "pf_number": "",
    "passport_number": "",
    "passport_expiry_date": "0001-01-01T00:00:00Z",
    "father_name": "",
    "monkey_patch_tag_sub_categories": null
  },
  "project_id": "2bc42db1-6fb8-4bd0-8e1c-13b909eeedd4",
  "monkey_patch_project": {
    "id": "2bc42db1-6fb8-4bd0-8e1c-13b909eeedd4",
    "type": "p",
    "name": "New Project",
    "contractor": "aecbdfea-bbf5-4678-b556-de154d23bf67",
    "contractor_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
    "creator": "aecbdfea-bbf5-4678-b556-de154d23bf67",
    "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
    "bg_image": "",
    "admins": [
      "aecbdfea-bbf5-4678-b556-de154d23bf67"
    ],
    "admins_company_user_ids": [
      "c6e4849d-c10f-49fe-8095-e193b5a4aaf8"
    ],
    "workers_company_user_ids": [],
    "customer_name": "",
    "customer_contact": 0,
    "customer_email": "",
    "customer_company_name": "",
    "customer_company_address": "",
    "customer_gst": "",
    "customer_profile_image": "",
    "address": "",
    "city": "",
    "state": "",
    "status": "Ongoing",
    "contact_book": [],
    "is_engine": 0,
    "duplicate_from": "",
    "created": "2026-07-05T14:09:46.267Z",
    "updated": "2026-07-05T14:09:46.499Z",
    "contact_data": null,
    "photos": null,
    "location": {
      "type": "Point",
      "coordinates": [
        1.1,
        1.1
      ]
    },
    "google_address": null,
    "allowed_features": null,
    "estimated_cost": 0,
    "progress": 0,
    "start_date": "0001-01-01T00:00:00Z",
    "end_date": "0001-01-01T00:00:00Z",
    "monkey_patch_contractor_name": "",
    "monkey_patch_contractor_company_user_name": "",
    "monkey_patch_contractor_contact": 0,
    "monkey_patch_contractor_profile_pic": "",
    "monkey_patch_in_amount": 0,
    "monkey_patch_out_amount": 0,
    "monkey_patch_transaction_in_amount": 0,
    "monkey_patch_transaction_out_amount": 0,
    "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
    "monkey_patch_my_company_user": {
      "id": "",
      "company_id": "",
      "company_role_id": "",
      "role": "",
      "type": "",
      "creator": "",
      "name": "",
      "mobile": 0,
      "mobile_verified": 0,
      "user_id": "",
      "gstin": "",
      "party_id": "",
      "legal_business_name": "",
      "billing_address": "",
      "hidden": 0,
      "profile_pic": "",
      "monkey_patch_policy_ids": null,
      "monkey_patch_company_role": {
        "id": "",
        "role": "",
        "name": "",
        "description": "",
        "company_id": "",
        "creator_company_user_id": "",
        "policy_ids": null,
        "hidden": 0,
        "delete": 0,
        "created": "0001-01-01T00:00:00Z",
        "updated": "0001-01-01T00:00:00Z",
        "monkey_patch_policies": null
      },
      "monkey_patch_user": {
        "id": "",
        "name": "",
        "mobile": 0,
        "country_code": "",
        "profile_pic": "",
        "mobile_verified": 0,
        "invited": 0,
        "invitation_count": 0,
        "profession": ""
      },
      "email": ""
    },
    "monkey_patch_company_name": "",
    "monkey_patch_team_member": null,
    "monkey_patch_todo_count": 0,
    "attendance_radius": 500,
    "distance": 0,
    "monkey_patch_primary_address": {
      "id": "470aaf26-d4fe-42d4-a318-d862fc9c79da",
      "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
      "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
      "owner_id": "2bc42db1-6fb8-4bd0-8e1c-13b909eeedd4",
      "address_type": "project",
      "address_title": "New Project",
      "address_gst": "",
      "address_line_1": "Nerul",
      "address_line_2": "",
      "city": "Mumbai",
      "state": "",
      "postal_code": "",
      "country_code": "",
      "location": {
        "type": "Point",
        "coordinates": [
          1.1,
          1.1
        ]
      },
      "google_address": null,
      "primary": 1,
      "delete": 0,
      "created": "2026-07-05T14:09:46.484Z",
      "updated": "2026-07-05T14:09:46.484Z",
      "search": "Nerul ",
      "monkey_patch_country_config": {
        "country_code": "",
        "country_iso": "",
        "country_name": "",
        "created": "0001-01-01T00:00:00Z",
        "minimum_digits": 0,
        "maximum_digits": 0,
        "login_channels": null,
        "currency": "",
        "flag": "",
        "tax_slabs": null,
        "tax_display_name": "",
        "tax_value_display_name": "",
        "published": 0,
        "decimal_digit": 0,
        "timezone": ""
      }
    },
    "dimension": "",
    "orientation": "",
    "code": "",
    "key_personnel_cu_ids": [],
    "billed_amount": 0,
    "monkey_patch_key_personnel": null,
    "custom_fields": [],
    "entry_time": "0001-01-01T00:00:00Z",
    "sub_category_id": "",
    "monkey_patch_sub_category": {
      "id": "",
      "parent_id": "",
      "creator": "",
      "creator_company_user_id": "",
      "company_id": "",
      "type": "",
      "text_en": "",
      "text_hi": "",
      "index": 0,
      "hidden": 0,
      "created": "0001-01-01T00:00:00Z",
      "updated": "0001-01-01T00:00:00Z",
      "monkey_patch_children": null,
      "monkey_patch_parent": null,
      "color_hex": "",
      "is_project_phase": 0
    },
    "phase_sub_category_ids": [],
    "phase_sub_category_id": "",
    "monkey_patch_phase_sub_category": {
      "id": "",
      "parent_id": "",
      "creator": "",
      "creator_company_user_id": "",
      "company_id": "",
      "type": "",
      "text_en": "",
      "text_hi": "",
      "index": 0,
      "hidden": 0,
      "created": "0001-01-01T00:00:00Z",
      "updated": "0001-01-01T00:00:00Z",
      "monkey_patch_children": null,
      "monkey_patch_parent": null,
      "color_hex": "",
      "is_project_phase": 0
    },
    "scope_of_work": null,
    "grn_prefix_list": [
      {
        "prefix": "GRN-",
        "sequence": 1
      }
    ],
    "default_grn_prefix": {
      "prefix": "GRN-",
      "sequence": 1
    },
    "material_request_prefix_list": [
      {
        "prefix": "MR-",
        "sequence": 1
      }
    ],
    "default_material_request_prefix": {
      "prefix": "MR-",
      "sequence": 1
    },
    "company_address_id": "",
    "monkey_patch_company_address": {
      "id": "",
      "company_id": "",
      "creator_company_user_id": "",
      "owner_id": "",
      "address_type": "",
      "address_title": "",
      "address_gst": "",
      "address_line_1": "",
      "address_line_2": "",
      "city": "",
      "state": "",
      "postal_code": "",
      "country_code": "",
      "location": {
        "type": "",
        "coordinates": null
      },
      "google_address": null,
      "primary": 0,
      "delete": 0,
      "created": "0001-01-01T00:00:00Z",
      "updated": "0001-01-01T00:00:00Z",
      "search": "",
      "monkey_patch_country_config": {
        "country_code": "",
        "country_iso": "",
        "country_name": "",
        "created": "0001-01-01T00:00:00Z",
        "minimum_digits": 0,
        "maximum_digits": 0,
        "login_channels": null,
        "currency": "",
        "flag": "",
        "tax_slabs": null,
        "tax_display_name": "",
        "tax_value_display_name": "",
        "published": 0,
        "decimal_digit": 0,
        "timezone": ""
      }
    }
  },
  "photos": [],
  "timesheet_date": "2026-07-04T18:30:00.001Z",
  "duration": 184,
  "start_time": "2026-07-05T14:11:05.926Z",
  "end_time": "2026-07-05T17:15:05.926Z"
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "e2c18d10-6de6-472c-a947-024ff2d67ec7",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator": "aecbdfea-bbf5-4678-b556-de154d23bf67",
  "created": "2026-07-05T14:12:09.495067981Z",
  "updated": "2026-07-05T14:12:09.495068111Z",
  "delete": 0,
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "project_id": "2bc42db1-6fb8-4bd0-8e1c-13b909eeedd4",
  "timesheet_date": "2026-07-04T18:30:00.001Z",
  "start_time": "2026-07-05T14:11:05.926Z",
  "end_time": "2026-07-05T17:15:05.926Z",
  "duration": 184,
  "billing_activity_id": "",
  "notes": "",
  "photos": [],
  "monkey_patch_creator_company_user": {
    "id": "",
    "company_id": "",
    "company_role_id": "",
    "role": "",
    "type": "",
    "creator": "",
    "name": "",
    "mobile": 0,
    "mobile_verified": 0,
    "user_id": "",
    "assigned_project_ids": null,
    "pinned_project_ids": null,
    "profile_pic": "",
    "city": "",
    "aadhar_card_number": "",
    "pan_card_number": "",
    "aadhar_photos": null,
    "pan_photos": null,
    "gstin": "",
    "legal_business_name": "",
    "trade_name": "",
    "state_of_supply": "",
    "billing_address": "",
    "esi_number": "",
    "uan_number": "",
    "date_of_birth": "0001-01-01T00:00:00Z",
    "sms_enabled": 0,
    "updated_by": "",
    "hidden": 0,
    "opening_balance": 0,
    "dashboard_preferences": null,
    "prefix": "",
    "sequence": 0,
    "party_id": "",
    "tag_ids": null,
    "custom_fields": null,
    "bank_account_ids": null,
    "company_user_bank_account_ids": null,
    "upi_ids": null,
    "address_ids": null,
    "created": "0001-01-01T00:00:00Z",
    "updated": "0001-01-01T00:00:00Z",
    "monkey_patch_creator": {
      "id": "",
      "name": "",
      "mobile": 0,
      "country_code": "",
      "profile_pic": "",
      "mobile_verified": 0,
      "invited": 0,
      "invitation_count": 0,
      "profession": ""
    },
    "monkey_patch_user": {
      "id": "",
      "name": "",
      "mo
... [Response Truncated for Readability]
```

---

## 🔍 Transaction Flow #2: /apis/v3/add/creditnote (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/creditnote`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "id": "",
  "invoice_date": "2026-07-05T14:14:46.651Z",
  "photos": [],
  "party_company_user_id": "aa9de335-a7b8-4699-a35d-21fd4e7902fb",
  "tagged_invoice_id": "",
  "monkey_patch_tagged_invoice": {},
  "notes": "",
  "reference_number": "",
  "amount": 1212,
  "work_amount": null,
  "gst_amount": null,
  "items": [],
  "prefix": "CN-",
  "sequence": 1,
  "project_id": "2bc42db1-6fb8-4bd0-8e1c-13b909eeedd4"
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "1a31e357-7e0b-4f71-add2-6dde7deebbd1",
  "project_id": "2bc42db1-6fb8-4bd0-8e1c-13b909eeedd4",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator": "aecbdfea-bbf5-4678-b556-de154d23bf67",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "party_company_user_id": "aa9de335-a7b8-4699-a35d-21fd4e7902fb",
  "notes": "",
  "total_amount": 1212,
  "work_amount": 0,
  "gst_amount": 0,
  "photos": [],
  "delete": 0,
  "invoice_id": "22241abe-81a5-436b-b06b-72536fa06448",
  "invoice_date": "2026-07-05T14:14:46.651Z",
  "reference_number": "",
  "prefix": "CN-",
  "sequence": 1,
  "credit_note_number": "CN-1",
  "approval_flag": "auto_approved",
  "approved_by": "",
  "approval_comment": "",
  "created": "2026-07-05T14:14:46.551254481Z",
  "updated": "2026-07-05T14:14:46.573782431Z",
  "monkey_patch_creator_company_user": {
    "id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
    "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
    "company_role_id": "id1",
    "role": "",
    "type": "employee",
    "creator": "aecbdfea-bbf5-4678-b556-de154d23bf67",
    "name": "Yash Desai ",
    "mobile": 9770985945,
    "mobile_verified": 1,
    "user_id": "aecbdfea-bbf5-4678-b556-de154d23bf67",
    "gstin": "",
    "party_id": "",
    "legal_business_name": "",
    "billing_address": "",
    "hidden": 0,
    "profile_pic": "",
    "monkey_patch_policy_ids": null,
    "monkey_patch_company_role": {
      "id": "",
      "role": "",
      "name": "",
      "description": "",
      "company_id": "",
      "creator_company_user_id": "",
      "policy_ids": null,
      "hidden": 0,
      "delete": 0,
      "created": "0001-01-01T00:00:00Z",
      "updated": "0001-01-01T00:00:00Z",
      "monkey_patch_policies": null
    },
    "monkey_patch_user": {
      "id": "",
      "name": "",
      "mobile": 0,
      "country_code": "",
      "profile_pic": "",
      "mobile_verified": 0,
      "invited": 0,
      "invitation_count": 0,
      "profession
... [Response Truncated for Readability]
```

---

## 🔍 Transaction Flow #3: /apis/v3/add/creditnote (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/creditnote`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "id": "",
  "invoice_date": "2026-07-05T14:15:01.569Z",
  "photos": [],
  "party_company_user_id": "aa9de335-a7b8-4699-a35d-21fd4e7902fb",
  "tagged_invoice_id": "",
  "monkey_patch_tagged_invoice": {},
  "notes": "",
  "reference_number": "",
  "amount": 120000,
  "work_amount": null,
  "gst_amount": null,
  "items": [],
  "prefix": "CN-",
  "sequence": 2,
  "project_id": "2bc42db1-6fb8-4bd0-8e1c-13b909eeedd4"
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "d95c0b3b-200b-4b5b-98d2-6caabb9113f8",
  "project_id": "2bc42db1-6fb8-4bd0-8e1c-13b909eeedd4",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator": "aecbdfea-bbf5-4678-b556-de154d23bf67",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "party_company_user_id": "aa9de335-a7b8-4699-a35d-21fd4e7902fb",
  "notes": "",
  "total_amount": 120000,
  "work_amount": 0,
  "gst_amount": 0,
  "photos": [],
  "delete": 0,
  "invoice_id": "181764bf-f122-4430-b173-49219e8b12cb",
  "invoice_date": "2026-07-05T14:15:01.569Z",
  "reference_number": "",
  "prefix": "CN-",
  "sequence": 2,
  "credit_note_number": "CN-2",
  "approval_flag": "auto_approved",
  "approved_by": "",
  "approval_comment": "",
  "created": "2026-07-05T14:15:01.447078863Z",
  "updated": "2026-07-05T14:15:01.468527241Z",
  "monkey_patch_creator_company_user": {
    "id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
    "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
    "company_role_id": "id1",
    "role": "",
    "type": "employee",
    "creator": "aecbdfea-bbf5-4678-b556-de154d23bf67",
    "name": "Yash Desai ",
    "mobile": 9770985945,
    "mobile_verified": 1,
    "user_id": "aecbdfea-bbf5-4678-b556-de154d23bf67",
    "gstin": "",
    "party_id": "",
    "legal_business_name": "",
    "billing_address": "",
    "hidden": 0,
    "profile_pic": "",
    "monkey_patch_policy_ids": null,
    "monkey_patch_company_role": {
      "id": "",
      "role": "",
      "name": "",
      "description": "",
      "company_id": "",
      "creator_company_user_id": "",
      "policy_ids": null,
      "hidden": 0,
      "delete": 0,
      "created": "0001-01-01T00:00:00Z",
      "updated": "0001-01-01T00:00:00Z",
      "monkey_patch_policies": null
    },
    "monkey_patch_user": {
      "id": "",
      "name": "",
      "mobile": 0,
      "country_code": "",
      "profile_pic": "",
      "mobile_verified": 0,
      "invited": 0,
      "invitation_count": 0,
      "professi
... [Response Truncated for Readability]
```

---

## 🔍 Transaction Flow #4: /apis/v3/cashbook/p2p (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/cashbook/p2p`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "sender_company_user_id": "c06f439a-2580-4402-8faf-dab1bf88eb7d",
  "receiver_company_user_id": "c5f7bbf7-7341-4a1b-b98a-412fa546d813",
  "amount": 12121221,
  "payment_date": "2026-07-05T14:15:15.048Z",
  "photos": [],
  "project_id": "2bc42db1-6fb8-4bd0-8e1c-13b909eeedd4",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660"
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "b352f8f4-e0d6-4aca-b14f-7e4cd838ac82",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator": "aecbdfea-bbf5-4678-b556-de154d23bf67",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "approved_by": "",
  "type": "p2p",
  "remark": "",
  "amount": 12121221,
  "unsettled_amount": 12121221,
  "project_id": "2bc42db1-6fb8-4bd0-8e1c-13b909eeedd4",
  "category": "",
  "category_id": "",
  "sub_category_id": "",
  "mode": "",
  "role": "staff",
  "approval_comment": "",
  "photos": [],
  "delete": 0,
  "is_engine": 0,
  "payment_date": "2026-07-05T14:15:15.048Z",
  "created": "2026-07-05T14:15:15.061306145Z",
  "updated": "2026-07-05T14:15:15.061306236Z",
  "monkey_patch_category": {
    "id": "",
    "type": "",
    "text_en": "",
    "text_hi": "",
    "index": 0,
    "dimensions": null,
    "created": "0001-01-01T00:00:00Z",
    "updated": "0001-01-01T00:00:00Z",
    "parent_id": ""
  },
  "monkey_patch_sub_category": {
    "id": "",
    "parent_id": "",
    "creator": "",
    "creator_company_user_id": "",
    "company_id": "",
    "type": "",
    "text_en": "",
    "text_hi": "",
    "index": 0,
    "hidden": 0,
    "created": "0001-01-01T00:00:00Z",
    "updated": "0001-01-01T00:00:00Z",
    "monkey_patch_children": null,
    "monkey_patch_parent": null,
    "color_hex": "",
    "is_project_phase": 0
  },
  "party_company_user_id": "c5f7bbf7-7341-4a1b-b98a-412fa546d813",
  "sender_wallet_id": "0d8ab47b-1704-4ca8-b5cc-cf32f8a8b36e",
  "receiver_wallet_id": "62a078e8-3802-494e-a2ca-8855082b8cff",
  "approval_flag": "auto_approved",
  "bank_account_id": "",
  "monkey_patch_creator_comapny_user_name": "Yash Desai ",
  "monkey_patch_sender_comapny_user": {
    "id": "c06f439a-2580-4402-8faf-dab1bf88eb7d",
    "company_id": "",
    "company_role_id": "",
    "role": "",
    "type": "",
    "creator": "",
    "name": "New party",
    "mobile": 0,
    "mobile_verified": 0,
    "user_id": "",
    "gstin": "",
    "party_id": "",

... [Response Truncated for Readability]
```

---

## 🔍 Transaction Flow #5: /apis/v3/add/company-holiday (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/company-holiday`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "name": "Holi",
  "holiday_date": "2026-07-05T14:21:47.693Z"
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "0bb575dd-67df-4384-8f3f-8e1710d3318d",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator": "aecbdfea-bbf5-4678-b556-de154d23bf67",
  "name": "Holi",
  "holiday_date": "2026-07-05T14:21:47.693Z",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "created": "2026-07-05T14:21:47.621864752Z",
  "updated": "2026-07-05T14:21:47.621864832Z"
}
```

---

## 🔍 Transaction Flow #6: /apis/v3/vendor/add/workorder (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/vendor/add/workorder`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "creator_company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "name": "New Quote ",
  "vendor_company_client_cu_id": "aa9de335-a7b8-4699-a35d-21fd4e7902fb",
  "terms": "Any changes must be requested in writing and agreed upon by both parties. Additional work or design changes may incur additional costs. Some delays may occur due to unforeseen circumstances. Late payments may result in late payment fees. All disputes are subject to India jurisdiction only",
  "is_non_itemized_tax": 0
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "d015b2d5-3b85-4a25-bcb1-f44962799724",
  "name": "New Quote ",
  "creator": "aecbdfea-bbf5-4678-b556-de154d23bf67",
  "creator_company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "client_company_id": "",
  "vendor_company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "client_company_client_cu_id": "",
  "client_company_vendor_cu_id": "",
  "vendor_company_client_cu_id": "aa9de335-a7b8-4699-a35d-21fd4e7902fb",
  "vendor_company_vendor_cu_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "client_project_id": "",
  "vendor_project_id": "",
  "item_count": 0,
  "prefix": "QT-",
  "sequence": 2,
  "notes": "",
  "quotation_number": "QT-2",
  "quotation_count": 0,
  "quotation_date": "2026-07-05T14:24:02.131748184Z",
  "photos": [],
  "delete": 0,
  "created": "2026-07-05T14:24:02.131748264Z",
  "updated": "2026-07-05T14:24:02.131748324Z",
  "type": "client",
  "work_states": [
    "client"
  ],
  "estimated_work_amount": 0,
  "estimated_gst_amount": 0,
  "discount": 0,
  "other_amount": 0,
  "estimated_total_amount": 0,
  "completed_gst_amount": 0,
  "completed_amount": 0,
  "completed_total_amount": 0,
  "invoiced_amount": 0,
  "terms": "Any changes must be requested in writing and agreed upon by both parties. Additional work or design changes may incur additional costs. Some delays may occur due to unforeseen circumstances. Late payments may result in late payment fees. All disputes are subject to India jurisdiction only",
  "bank_account_id": "",
  "monkey_patch_vendor_company_client_cu": {
    "id": "",
    "company_id": "",
    "company_role_id": "",
    "role": "",
    "type": "",
    "creator": "",
    "name": "",
    "mobile": 0,
    "mobile_verified": 0,
    "user_id": "",
    "gstin": "",
    "party_id": "",
    "legal_business_name": "",
    "billing_address": "",
    "hidden": 0,
    "profile_pic": "",
    "monkey_patch_policy_ids": null,
    "monkey_patch_company_role": {
      
... [Response Truncated for Readability]
```

---

## 🔍 Transaction Flow #7: /apis/v3/add/approval-pipeline-template (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/approval-pipeline-template`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "feature_type": "asset_transfer",
  "min": 1,
  "max": 1,
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "type": "vertical",
  "name": "test",
  "normal": 1
}
```

### 📤 Response Body (Output JSON)
```json
{
  "error": "Template already exists"
}
```

---

## 🔍 Transaction Flow #8: /apis/v3/add/approval-pipeline-template (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/approval-pipeline-template`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "feature_type": "asset_transfer",
  "min": 1,
  "max": 1,
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "type": "vertical",
  "name": "test",
  "normal": 1
}
```

### 📤 Response Body (Output JSON)
```json
{
  "error": "Template already exists"
}
```

---

## 🔍 Transaction Flow #9: /apis/v3/add/approval-pipeline-template (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/approval-pipeline-template`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "feature_type": "inspection_form_response",
  "min": 1,
  "max": 1,
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "type": "vertical",
  "name": "test",
  "normal": 1
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "d57dea0f-5040-4224-924f-76e88c3405c6",
  "name": "test",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "feature_type": "inspection_form_response",
  "type": "vertical",
  "min": 1,
  "max": 1,
  "delete": 0,
  "created": "2026-07-05T14:29:09.085261907Z",
  "updated": "2026-07-05T14:29:09.085262007Z",
  "normal": 0,
  "published": 0
}
```

---

## 🔍 Transaction Flow #10: /apis/v3/add/approval-pipeline-template (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/approval-pipeline-template-level`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "approval_pipeline_template_id": "d868aab1-8310-45a2-8046-ef4f44ff75be",
  "level": 1,
  "company_role_ids": [
    "id1"
  ]
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "c279a373-bd9b-40f0-a769-cf87d3d38327",
  "approval_pipeline_template_id": "d868aab1-8310-45a2-8046-ef4f44ff75be",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "level": 1,
  "company_role_ids": [
    "id1"
  ],
  "delete": 0,
  "created": "2026-07-05T14:29:16.969740873Z",
  "updated": "2026-07-05T14:29:16.969740963Z",
  "monkey_patch_company_roles": null
}
```

---

## 🔍 Transaction Flow #11: /apis/v3/add/approval-pipeline-template (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/approval-pipeline-template-level`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "approval_pipeline_template_id": "d868aab1-8310-45a2-8046-ef4f44ff75be",
  "level": 2,
  "company_role_ids": [
    "id1"
  ]
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "a06cc258-3e9d-428c-ae5c-5a6b87b07bf7",
  "approval_pipeline_template_id": "d868aab1-8310-45a2-8046-ef4f44ff75be",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "level": 2,
  "company_role_ids": [
    "id1"
  ],
  "delete": 0,
  "created": "2026-07-05T14:29:19.835678131Z",
  "updated": "2026-07-05T14:29:19.835678231Z",
  "monkey_patch_company_roles": null
}
```

---

## 🔍 Transaction Flow #12: /apis/v3/add/approval-pipeline-template (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/approval-pipeline-template`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "feature_type": "material_transfer",
  "min": 1,
  "max": 1,
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "type": "vertical",
  "name": "test",
  "normal": 1
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "dbd7b3c5-018a-4a42-b783-d8f10c0d9f56",
  "name": "test",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "feature_type": "material_transfer",
  "type": "vertical",
  "min": 1,
  "max": 1,
  "delete": 0,
  "created": "2026-07-05T14:29:25.875223942Z",
  "updated": "2026-07-05T14:29:25.875224023Z",
  "normal": 0,
  "published": 0
}
```

---

## 🔍 Transaction Flow #13: /apis/v3/add/approval-pipeline-template (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/approval-pipeline-template`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "feature_type": "material_used",
  "min": 1,
  "max": 1,
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "type": "vertical",
  "name": "test",
  "normal": 1
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "7f238b4e-6d36-4f59-a171-e1164cd76a13",
  "name": "test",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "feature_type": "material_used",
  "type": "vertical",
  "min": 1,
  "max": 1,
  "delete": 0,
  "created": "2026-07-05T14:29:28.96066314Z",
  "updated": "2026-07-05T14:29:28.960663271Z",
  "normal": 0,
  "published": 0
}
```

---

## 🔍 Transaction Flow #14: /apis/v3/add/approval-pipeline-template (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/approval-pipeline-template`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "feature_type": "rfq",
  "min": 1,
  "max": 1,
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "type": "vertical",
  "name": "test",
  "normal": 1
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "5bc92876-169a-4834-8b6a-53e3750cfa53",
  "name": "test",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "feature_type": "rfq",
  "type": "vertical",
  "min": 1,
  "max": 1,
  "delete": 0,
  "created": "2026-07-05T14:29:55.666338124Z",
  "updated": "2026-07-05T14:29:55.666338214Z",
  "normal": 0,
  "published": 0
}
```

---

## 🔍 Transaction Flow #15: /apis/v3/add/approval-pipeline-template (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/approval-pipeline-template`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "feature_type": "salary_expense",
  "min": 1,
  "max": 1,
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "type": "vertical",
  "name": "test",
  "normal": 1
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "457d052c-cade-4107-897c-a980994df2d2",
  "name": "test",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "feature_type": "salary_expense",
  "type": "vertical",
  "min": 1,
  "max": 1,
  "delete": 0,
  "created": "2026-07-05T14:29:58.26858954Z",
  "updated": "2026-07-05T14:29:58.2685896Z",
  "normal": 0,
  "published": 0
}
```

---

## 🔍 Transaction Flow #16: /apis/v3/add/approval-pipeline-template (POST)
- **Origin HAR**: `fromprojectinternalwebsiteweb.onsiteteams.com.har`
- **Full URL**: `https://api.onsiteteams.in/apis/v3/add/approval-pipeline-template`

### 📌 Request Headers
```json
{
  "accept-language": "en,en-US;q=0.9,te;q=0.8,hi;q=0.7",
  "content-type": "application/json",
  "origin": "https://web.onsiteteams.com",
  "referer": "https://web.onsiteteams.com/"
}
```

### 📥 Request Body (Payload)
```json
{
  "feature_type": "sales_invoice_retention",
  "min": 1,
  "max": 1,
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "type": "vertical",
  "name": "test",
  "normal": 1
}
```

### 📤 Response Body (Output JSON)
```json
{
  "id": "effc0dc5-e500-4ced-a135-322eeaf28134",
  "name": "test",
  "company_id": "4d6fc487-5cf8-4826-8fd3-1c1f5f1d7660",
  "creator_company_user_id": "c6e4849d-c10f-49fe-8095-e193b5a4aaf8",
  "feature_type": "sales_invoice_retention",
  "type": "vertical",
  "min": 1,
  "max": 1,
  "delete": 0,
  "created": "2026-07-05T14:30:04.010355542Z",
  "updated": "2026-07-05T14:30:04.010355632Z",
  "normal": 0,
  "published": 0
}
```

---

