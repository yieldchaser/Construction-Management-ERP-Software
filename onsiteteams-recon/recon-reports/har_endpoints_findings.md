# Checkpoints 3-5: HAR API Schema & Endpoints findings

A complete map of the APIs, methods, payload keys, response keys, and query parameters extracted from competitor HAR archives.

## 🌐 Endpoint: `/apis/v3/add/approval-pipeline-template`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `feature_type`
  - `max`
  - `min`
  - `name`
  - `normal`
  - `type`
- **JSON Response Schema Keys**:
  - `company_id`
  - `created`
  - `creator_company_user_id`
  - `delete`
  - `error`
  - `feature_type`
  - `id`
  - `max`
  - `min`
  - `name`
  - `normal`
  - `published`
  - `type`
  - `updated`

## 🌐 Endpoint: `/apis/v3/add/approval-pipeline-template-level`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `approval_pipeline_template_id`
  - `company_role_ids`
  - `level`
- **JSON Response Schema Keys**:
  - `approval_pipeline_template_id`
  - `company_id`
  - `company_role_ids`
  - `created`
  - `creator_company_user_id`
  - `delete`
  - `id`
  - `level`
  - `monkey_patch_company_roles`
  - `updated`

## 🌐 Endpoint: `/apis/v3/add/company-holiday`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `holiday_date`
  - `name`
- **JSON Response Schema Keys**:
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `holiday_date`
  - `id`
  - `name`
  - `updated`

## 🌐 Endpoint: `/apis/v3/add/companyaddress`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `address_gst`
  - `address_line_1`
  - `address_title`
  - `city`
  - `company_id`
  - `owner_id`
- **JSON Response Schema Keys**:
  - `address_gst`
  - `address_line_1`
  - `address_line_2`
  - `address_title`
  - `address_type`
  - `city`
  - `company_id`
  - `country_code`
  - `created`
  - `creator_company_user_id`
  - `delete`
  - `google_address`
  - `id`
  - `location`
  - `monkey_patch_country_config`
  - `owner_id`
  - `postal_code`
  - `primary`
  - `search`
  - `state`
  - `updated`

## 🌐 Endpoint: `/apis/v3/add/companyuser`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `aadhar_card_number`
  - `company_id`
  - `email`
  - `esi_number`
  - `father_name`
  - `monkey_patch_tag_sub_categories`
  - `name`
  - `pan_card_number`
  - `passport_number`
  - `pf_number`
  - `prefix`
  - `sequence`
  - `tag_ids`
  - `type`
  - `uan_number`
- **JSON Response Schema Keys**:
  - `aadhar_card_number`
  - `aadhar_photos`
  - `address_ids`
  - `assigned_project_ids`
  - `bank_account_ids`
  - `billing_address`
  - `city`
  - `company_id`
  - `company_role_id`
  - `company_user_bank_account_ids`
  - `created`
  - `creator`
  - `custom_fields`
  - `dashboard_preferences`
  - `date_of_birth`
  - `date_of_joining`
  - `email`
  - `esi_number`
  - `father_name`
  - `gstin`
  - `hidden`
  - `id`
  - `is_chat_group_admin`
  - `is_chat_group_member`
  - `legal_business_name`
  - `mobile`
  - `mobile_verified`
  - `monkey_patch_company_role`
  - `monkey_patch_creator`
  - `monkey_patch_is_project_member`
  - ... and 32 more keys

## 🌐 Endpoint: `/apis/v3/add/creditnote`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `amount`
  - `gst_amount`
  - `id`
  - `invoice_date`
  - `items`
  - `monkey_patch_tagged_invoice`
  - `notes`
  - `party_company_user_id`
  - `photos`
  - `prefix`
  - `project_id`
  - `reference_number`
  - `sequence`
  - `tagged_invoice_id`
  - `work_amount`
- **JSON Response Schema Keys**:
  - `approval_comment`
  - `approval_flag`
  - `approved_by`
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `credit_note_number`
  - `delete`
  - `gst_amount`
  - `id`
  - `invoice_date`
  - `invoice_id`
  - `meta_data`
  - `monkey_patch_approved_by`
  - `monkey_patch_creator_company_user`
  - `monkey_patch_credit_note_items`
  - `monkey_patch_invoice`
  - `monkey_patch_party_company_user`
  - `monkey_patch_project`
  - `monkey_patch_tagged_invoice`
  - `notes`
  - `party_company_user_id`
  - `photos`
  - `prefix`
  - `project_id`
  - `reference_number`
  - `sequence`
  - `tagged_invoice_id`
  - `total_amount`
  - ... and 2 more keys

## 🌐 Endpoint: `/apis/v3/add/crm/lead`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `contact_name`
  - `contact_number`
  - `country_code`
  - `custom_fields`
  - `lead_assignee_cu_ids`
  - `lead_creation_date`
  - `lead_source_id`
  - `mobile`
  - `priority`
  - `project_type`
- **JSON Response Schema Keys**:
  - `address`
  - `budget`
  - `company_id`
  - `company_name`
  - `contact_name`
  - `contact_number`
  - `country_code`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `custom_fields`
  - `delete`
  - `email`
  - `expected_closure_date`
  - `id`
  - `last_contacted_date`
  - `lead_assignee_cu_ids`
  - `lead_creation_date`
  - `lead_source_id`
  - `lead_status`
  - `mobile`
  - `monkey_patch_assignee`
  - `monkey_patch_lead_source`
  - `monkey_patch_lead_status`
  - `monkey_patch_sub_category`
  - `next_followup_date`
  - `photos`
  - `priority`
  - `project_type`
  - `remark`
  - ... and 6 more keys

## 🌐 Endpoint: `/apis/v3/add/location`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `name`
  - `project_id`
- **JSON Response Schema Keys**:
  - `children_ids`
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `id`
  - `index`
  - `monkey_patch_path`
  - `name`
  - `parent_id`
  - `project_id`
  - `updated`

## 🌐 Endpoint: `/apis/v3/add/materialitem`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `gst_percent`
  - `hsn_code`
  - `id`
  - `item_code`
  - `lead_days`
  - `name`
  - `notes`
  - `sub_category_id`
  - `unit`
  - `unit_breakup`
  - `unit_cost_price`
  - `unit_id`
- **JSON Response Schema Keys**:
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `gst_percent`
  - `hidden`
  - `hsn_code`
  - `id`
  - `is_engine`
  - `item_code`
  - `last_unit_price`
  - `lead_days`
  - `material_breakup`
  - `material_sub_category_id`
  - `monkey_patch_material_sub_category`
  - `monkey_patch_materialstock`
  - `monkey_patch_sub_category`
  - `monkey_patch_used_by_project`
  - `name`
  - `notes`
  - `sub_category_id`
  - `type`
  - `unit`
  - `unit_breakup`
  - `unit_cost_price`
  - `unit_id`
  - `updated`

## 🌐 Endpoint: `/apis/v3/add/mom`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `attendee_cu_ids`
  - `company_id`
  - `id`
  - `mom_date`
  - `name`
  - `notes`
  - `photos`
  - `project_id`
- **JSON Response Schema Keys**:
  - `attendee_cu_ids`
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `id`
  - `mom_date`
  - `monkey_patch_attendees`
  - `monkey_patch_project`
  - `name`
  - `notes`
  - `photos`
  - `project_id`
  - `search`
  - `updated`

## 🌐 Endpoint: `/apis/v3/add/payment-request`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `amount`
  - `due_date`
  - `feature_id`
  - `feature_type`
  - `is_amount_percentage`
  - `notes`
  - `party_company_user_id`
  - `payment_date`
  - `percentage_value`
  - `photos`
  - `prefix`
  - `project_id`
  - `sequence`
- **JSON Response Schema Keys**:
  - `amount`
  - `approval_flag`
  - `cashbook_transaction_id`
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `due_date`
  - `feature_id`
  - `feature_type`
  - `id`
  - `is_amount_percentage`
  - `monkey_patch_creator_company_user`
  - `monkey_patch_feature`
  - `monkey_patch_party_company_user`
  - `monkey_patch_project`
  - `notes`
  - `party_company_user_id`
  - `payment_date`
  - `percentage_value`
  - `photos`
  - `prefix`
  - `project_id`
  - `sequence`
  - `status`
  - `updated`

## 🌐 Endpoint: `/apis/v3/add/project`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `name`
- **JSON Response Schema Keys**:
  - `address`
  - `admins`
  - `admins_company_user_ids`
  - `allowed_features`
  - `attendance_radius`
  - `bg_image`
  - `billed_amount`
  - `city`
  - `code`
  - `company_address_id`
  - `company_id`
  - `contact_book`
  - `contact_data`
  - `contractor`
  - `contractor_company_user_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `custom_fields`
  - `customer_company_address`
  - `customer_company_name`
  - `customer_contact`
  - `customer_email`
  - `customer_gst`
  - `customer_name`
  - `customer_profile_image`
  - `default_grn_prefix`
  - `default_material_request_prefix`
  - `dimension`
  - `distance`
  - ... and 42 more keys

## 🌐 Endpoint: `/apis/v3/add/projectaddress`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `address_line_1`
  - `address_title`
  - `city`
  - `company_id`
  - `owner_id`
- **JSON Response Schema Keys**:
  - `address_gst`
  - `address_line_1`
  - `address_line_2`
  - `address_title`
  - `address_type`
  - `city`
  - `company_id`
  - `country_code`
  - `created`
  - `creator_company_user_id`
  - `delete`
  - `google_address`
  - `id`
  - `location`
  - `monkey_patch_country_config`
  - `owner_id`
  - `postal_code`
  - `primary`
  - `search`
  - `state`
  - `updated`

## 🌐 Endpoint: `/apis/v3/add/salesorder`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `creator_company_id`
  - `terms`
  - `vendor_company_client_cu_id`
  - `vendor_project_id`
- **JSON Response Schema Keys**:
  - `approval_flag`
  - `bank_account_id`
  - `client_company_client_cu_id`
  - `client_company_id`
  - `client_company_vendor_cu_id`
  - `client_project_id`
  - `completed_amount`
  - `completed_gst_amount`
  - `completed_total_amount`
  - `created`
  - `creator`
  - `creator_company_id`
  - `creator_company_user_id`
  - `crm_lead_id`
  - `custom_fields`
  - `delete`
  - `discount`
  - `estimated_gst_amount`
  - `estimated_total_amount`
  - `estimated_work_amount`
  - `gst_percent`
  - `id`
  - `invoiced_amount`
  - `is_non_itemized_tax`
  - `is_roundoff`
  - `item_count`
  - `monkey_patch_bank_account`
  - `monkey_patch_billing_activities`
  - `monkey_patch_client_company_vendor_cu`
  - `monkey_patch_crm_lead`
  - ... and 29 more keys

## 🌐 Endpoint: `/apis/v3/add/timesheet`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `duration`
  - `end_time`
  - `monkey_patch_party_company_user`
  - `monkey_patch_project`
  - `party_company_user_id`
  - `photos`
  - `project_id`
  - `start_time`
  - `timesheet_date`
- **JSON Response Schema Keys**:
  - `billing_activity_id`
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `duration`
  - `end_time`
  - `id`
  - `monkey_patch_billing_activity`
  - `monkey_patch_creator_company_user`
  - `monkey_patch_party_company_user`
  - `monkey_patch_project`
  - `notes`
  - `party_company_user_id`
  - `photos`
  - `project_id`
  - `search`
  - `start_time`
  - `timesheet_date`
  - `updated`

## 🌐 Endpoint: `/apis/v3/add/todo`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `due_date`
  - `name`
  - `photos`
  - `recurrence_meta`
  - `sub_category_id`
- **JSON Response Schema Keys**:
  - `assigned_to`
  - `assignee_cu_ids`
  - `billing_activity_id`
  - `company_id`
  - `created`
  - `creator_company_user_id`
  - `delete`
  - `due_date`
  - `id`
  - `is_closed`
  - `is_primary`
  - `is_recurring`
  - `link`
  - `monkey_patch_assigned_to`
  - `monkey_patch_assignee_list`
  - `monkey_patch_billing_activity`
  - `monkey_patch_parent_todo`
  - `monkey_patch_project`
  - `monkey_patch_sub_category`
  - `name`
  - `parent_id`
  - `photos`
  - `project_id`
  - `recurrence_meta`
  - `sub_category_id`
  - `updated`

## 🌐 Endpoint: `/apis/v3/approval/count/feature-wise/companylevel`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `status`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**: None

## 🌐 Endpoint: `/apis/v3/cashbook/p2p`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `amount`
  - `company_id`
  - `payment_date`
  - `photos`
  - `project_id`
  - `receiver_company_user_id`
  - `sender_company_user_id`
- **JSON Response Schema Keys**:
  - `amount`
  - `approval_comment`
  - `approval_flag`
  - `approved_by`
  - `bank_account_id`
  - `category`
  - `category_id`
  - `cheque_due_date`
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `id`
  - `is_engine`
  - `meta_data`
  - `mode`
  - `monkey_patch_approved_by`
  - `monkey_patch_bank_account`
  - `monkey_patch_category`
  - `monkey_patch_creator_comapny_user_name`
  - `monkey_patch_party_company_user`
  - `monkey_patch_project`
  - `monkey_patch_receiver_bank_account`
  - `monkey_patch_receiver_comapny_user`
  - `monkey_patch_receiver_wallet`
  - `monkey_patch_sender_bank_account`
  - `monkey_patch_sender_comapny_user`
  - `monkey_patch_sender_wallet`
  - `monkey_patch_settlement`
  - ... and 14 more keys

## 🌐 Endpoint: `/apis/v3/chart/expense/feature-wise`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `boq_amount`
  - `data`
  - `data[].label`
  - `data[].value_x`
  - `data[].value_y`
  - `financialData`
  - `invoice_amount`
  - `margin_amount`
  - `project_value`
  - `salary_amount`
  - `total`

## 🌐 Endpoint: `/apis/v3/company/actionable/stats`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `material_request_pending_count`
  - `multilevel_approval_pending_count`
  - `open_material_request_count`
  - `open_material_request_item_ordered_count`
  - `pending_approval_count`
  - `todo_count`
  - `unbilled_material_count`

## 🌐 Endpoint: `/apis/v3/company/balance/stats`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `customer_advance`
  - `customer_pending`
  - `total_advance`
  - `total_pending`

## 🌐 Endpoint: `/apis/v3/company/companyuser/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/creditnote/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/debitnote/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/equipmentexpense/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/finance/stats`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `opening_balance`
  - `total_expense`
  - `total_in`
  - `total_invoice`
  - `total_out`
  - `unpaid_expense`
  - `unpaid_invoice`

## 🌐 Endpoint: `/apis/v3/company/materialpurchase/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/materialreturn/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/materialsale/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/materialtransfer/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/partyearning/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/payment-request/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/salesinvoice/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/subcon/prefix/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `prefix`
  - `sequence`

## 🌐 Endpoint: `/apis/v3/company/team-actionable/stats`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `material_request_pending_count`
  - `multilevel_approval_pending_count`
  - `open_material_request_count`
  - `open_material_request_item_ordered_count`
  - `pending_approval_count`
  - `todo_count`
  - `unbilled_material_count`

## 🌐 Endpoint: `/apis/v3/detail/cashbookentry/{id}`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `code`
  - `message`

## 🌐 Endpoint: `/apis/v3/detail/chatgroup/id_onsite_announcement_group`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `description`
  - `group_admins`
  - `group_members`
  - `group_type`
  - `id`
  - `monkey_patch_creator`
  - `monkey_patch_group_members`
  - `monkey_patch_is_closed`
  - `name`
  - `profile_photo`
  - `tagged_user_ids`
  - `updated`

## 🌐 Endpoint: `/apis/v3/detail/company/companyconfiguration/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `add_locked_hours`
  - `allowed_company_role_ids`
  - `allowed_employee_count`
  - `asset_prefix_list`
  - `attendance_restriction_level`
  - `boq_terms`
  - `business_amount`
  - `company_id`
  - `company_size`
  - `construction_category_ids`
  - `country_iso`
  - `created`
  - `credit_note_prefix_list`
  - `currency`
  - `custom_pdf_tamplate_enabled`
  - `debit_note_prefix_list`
  - `default_asset_prefix`
  - `default_credit_note_prefix`
  - `default_debit_note_prefix`
  - `default_equipment_expense_prefix`
  - `default_grn_prefix`
  - `default_invoice_prefix`
  - `default_material_purchase_prefix`
  - `default_material_request_prefix`
  - `default_material_return_prefix`
  - `default_material_transfer_prefix`
  - `default_party_earning_prefix`
  - `default_payment_request_prefix`
  - `default_production_prefix`
  - `default_purchase_order_prefix`
  - ... and 80 more keys

## 🌐 Endpoint: `/apis/v3/detail/company/{id}`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `add_locked_hours`
  - `address`
  - `address_ids`
  - `allowed_activity_count`
  - `allowed_employee_count`
  - `app_version_code`
  - `app_version_name`
  - `asset_prefix_list`
  - `attendance_restriction_level`
  - `bank_account_ids`
  - `city`
  - `company_bank_account_ids`
  - `companyuser_prefix_list`
  - `country_iso`
  - `created`
  - `creator`
  - `credit_note_prefix_list`
  - `currency`
  - `currency_float_limit`
  - `debit_note_prefix_list`
  - `default_asset_prefix`
  - `default_companyuser_prefix`
  - `default_credit_note_prefix`
  - `default_debit_note_prefix`
  - `default_equipment_expense_prefix`
  - `default_grn_prefix`
  - `default_inspection_form_response_prefix`
  - `default_invoice_prefix`
  - `default_material_purchase_prefix`
  - `default_material_request_prefix`
  - ... and 103 more keys

## 🌐 Endpoint: `/apis/v3/detail/companyattendanceinfo/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `adjust_shift_on_punch`
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `grace_period`
  - `id`
  - `is_ai_facerecognition_enabled`
  - `is_bulk_geo_fencing_enabled`
  - `is_geo_fencing_enabled`
  - `is_location_required`
  - `is_punch_setting_enabled`
  - `is_selfie_required`
  - `self_punch_enabled`
  - `updated`

## 🌐 Endpoint: `/apis/v3/detail/companyuser/{id}`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `aadhar_card_number`
  - `aadhar_photos`
  - `address_ids`
  - `assigned_project_ids`
  - `bank_account_ids`
  - `billing_address`
  - `city`
  - `company_id`
  - `company_role_id`
  - `company_user_bank_account_ids`
  - `created`
  - `creator`
  - `custom_fields`
  - `dashboard_preferences`
  - `date_of_birth`
  - `date_of_joining`
  - `email`
  - `esi_number`
  - `father_name`
  - `gstin`
  - `hidden`
  - `id`
  - `is_chat_group_admin`
  - `is_chat_group_member`
  - `legal_business_name`
  - `mobile`
  - `mobile_verified`
  - `monkey_patch_company_role`
  - `monkey_patch_creator`
  - `monkey_patch_is_project_member`
  - ... and 32 more keys

## 🌐 Endpoint: `/apis/v3/detail/material-setting/{id}`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `grn_sequence_level`
  - `id`
  - `lib_bom_restriction`
  - `material_request_restriction`
  - `material_request_sequence_level`
  - `material_transfer`
  - `material_use`
  - `po_material_restriction`
  - `production_material_restriction`
  - `sub_con_material_issue`
  - `updated`

## 🌐 Endpoint: `/apis/v3/detail/payroll/bycompanyuser`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_user_id`
  - `year`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `code`
  - `message`

## 🌐 Endpoint: `/apis/v3/detail/primay/address/{id}`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `address_gst`
  - `address_line_1`
  - `address_line_2`
  - `address_title`
  - `address_type`
  - `city`
  - `code`
  - `company_id`
  - `country_code`
  - `created`
  - `creator_company_user_id`
  - `delete`
  - `google_address`
  - `id`
  - `location`
  - `message`
  - `monkey_patch_country_config`
  - `owner_id`
  - `postal_code`
  - `primary`
  - `search`
  - `state`
  - `updated`

## 🌐 Endpoint: `/apis/v3/detail/progress-setting/{id}`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `code`
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `id`
  - `message`
  - `restrict_progress_to_estimate`
  - `updated`

## 🌐 Endpoint: `/apis/v3/detail/project/progressorder/{id}`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `approval_flag`
  - `bank_account_id`
  - `client_company_client_cu_id`
  - `client_company_id`
  - `client_company_vendor_cu_id`
  - `client_project_id`
  - `completed_amount`
  - `completed_gst_amount`
  - `completed_total_amount`
  - `created`
  - `creator`
  - `creator_company_id`
  - `creator_company_user_id`
  - `crm_lead_id`
  - `custom_fields`
  - `delete`
  - `discount`
  - `estimated_gst_amount`
  - `estimated_total_amount`
  - `estimated_work_amount`
  - `gst_percent`
  - `id`
  - `invoiced_amount`
  - `is_non_itemized_tax`
  - `is_roundoff`
  - `item_count`
  - `monkey_patch_bank_account`
  - `monkey_patch_billing_activities`
  - `monkey_patch_client_company_vendor_cu`
  - `monkey_patch_crm_lead`
  - ... and 29 more keys

## 🌐 Endpoint: `/apis/v3/detail/project/salesorder-with-count/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `vendor_company_client_cu_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `recent_workorder`
  - `workorder_count`

## 🌐 Endpoint: `/apis/v3/detail/project/{id}`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `address`
  - `admins`
  - `admins_company_user_ids`
  - `allowed_features`
  - `attendance_radius`
  - `bg_image`
  - `billed_amount`
  - `city`
  - `code`
  - `company_address_id`
  - `company_id`
  - `contact_book`
  - `contact_data`
  - `contractor`
  - `contractor_company_user_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `custom_fields`
  - `customer_company_address`
  - `customer_company_name`
  - `customer_contact`
  - `customer_email`
  - `customer_gst`
  - `customer_name`
  - `customer_profile_image`
  - `default_grn_prefix`
  - `default_material_request_prefix`
  - `dimension`
  - `distance`
  - ... and 42 more keys

## 🌐 Endpoint: `/apis/v3/detail/salesorder/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `approval_flag`
  - `bank_account_id`
  - `client_company_client_cu_id`
  - `client_company_id`
  - `client_company_vendor_cu_id`
  - `client_project_id`
  - `completed_amount`
  - `completed_gst_amount`
  - `completed_total_amount`
  - `created`
  - `creator`
  - `creator_company_id`
  - `creator_company_user_id`
  - `crm_lead_id`
  - `custom_fields`
  - `delete`
  - `discount`
  - `estimated_gst_amount`
  - `estimated_total_amount`
  - `estimated_work_amount`
  - `gst_percent`
  - `id`
  - `invoiced_amount`
  - `is_non_itemized_tax`
  - `is_roundoff`
  - `item_count`
  - `monkey_patch_bank_account`
  - `monkey_patch_billing_activities`
  - `monkey_patch_client_company_vendor_cu`
  - `monkey_patch_crm_lead`
  - ... and 29 more keys

## 🌐 Endpoint: `/apis/v3/detail/subconexpense/{id}`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `code`
  - `message`

## 🌐 Endpoint: `/apis/v3/edit/approval-pipeline-template`
### Method: **PATCH**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `created`
  - `creator_company_user_id`
  - `delete`
  - `feature_type`
  - `id`
  - `max`
  - `min`
  - `name`
  - `normal`
  - `published`
  - `type`
  - `updated`
- **JSON Response Schema Keys**:
  - `company_id`
  - `created`
  - `creator_company_user_id`
  - `delete`
  - `feature_type`
  - `id`
  - `max`
  - `min`
  - `name`
  - `normal`
  - `published`
  - `type`
  - `updated`

## 🌐 Endpoint: `/apis/v3/edit/companyuserbankaccount`
### Method: **PATCH**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `account_name`
  - `account_number`
  - `bank_code`
  - `bank_name`
  - `id`
  - `upi_ids`
- **JSON Response Schema Keys**:
  - `bank_account_id`
  - `company_user_id`
  - `created`
  - `creator_company_user_id`
  - `delete`
  - `id`
  - `monkey_patch_bank_account`
  - `updated`
  - `user_id`

## 🌐 Endpoint: `/apis/v3/edit/material-setting`
### Method: **PATCH**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `grn_sequence_level`
  - `id`
  - `lib_bom_restriction`
  - `material_request_restriction`
  - `material_request_sequence_level`
  - `material_transfer`
  - `material_use`
  - `po_material_restriction`
  - `production_material_restriction`
  - `sub_con_material_issue`
  - `updated`
- **JSON Response Schema Keys**:
  - `company_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `grn_sequence_level`
  - `id`
  - `lib_bom_restriction`
  - `material_request_restriction`
  - `material_request_sequence_level`
  - `material_transfer`
  - `material_use`
  - `po_material_restriction`
  - `production_material_restriction`
  - `sub_con_material_issue`
  - `updated`

## 🌐 Endpoint: `/apis/v3/edit/quotation/status`
### Method: **PATCH**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `id`
  - `quotation_status`
- **JSON Response Schema Keys**:
  - `approval_flag`
  - `bank_account_id`
  - `client_company_client_cu_id`
  - `client_company_id`
  - `client_company_vendor_cu_id`
  - `client_project_id`
  - `completed_amount`
  - `completed_gst_amount`
  - `completed_total_amount`
  - `created`
  - `creator`
  - `creator_company_id`
  - `creator_company_user_id`
  - `crm_lead_id`
  - `custom_fields`
  - `delete`
  - `discount`
  - `estimated_gst_amount`
  - `estimated_total_amount`
  - `estimated_work_amount`
  - `gst_percent`
  - `id`
  - `invoiced_amount`
  - `is_non_itemized_tax`
  - `is_roundoff`
  - `item_count`
  - `monkey_patch_bank_account`
  - `monkey_patch_billing_activities`
  - `monkey_patch_client_company_vendor_cu`
  - `monkey_patch_crm_lead`
  - ... and 29 more keys

## 🌐 Endpoint: `/apis/v3/generate-report/company-projects/excel/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `url`

## 🌐 Endpoint: `/apis/v3/gsheet/authorized-phones`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `company_id`
  - `country_code`
  - `label`
  - `phone`
- **JSON Response Schema Keys**:
  - `added_by`
  - `company_id`
  - `country_code`
  - `created`
  - `delete`
  - `id`
  - `label`
  - `phone`

## 🌐 Endpoint: `/apis/v3/gsheet/event-log`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `count`
  - `page`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `count`
  - `data`
  - `page`
  - `total`

## 🌐 Endpoint: `/apis/v3/gsheet/settings`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `authorized_phones`
  - `setting`

## 🌐 Endpoint: `/apis/v3/is-payroll-exist/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `is_exist`
  - `payroll`

## 🌐 Endpoint: `/apis/v3/list/address`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `address_type`
  - `company_id`
  - `count`
  - `owner_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `address_list`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/all/progress/billingactivity`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `workorder_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `actual_end_date`
  - `actual_start_date`
  - `assigned_to`
  - `children_ids`
  - `company_id`
  - `completed_amount`
  - `completed_gst_amount`
  - `completed_quantity`
  - `completed_total_amount`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `delete`
  - `design_ids`
  - `due_date`
  - `duration`
  - `end_date`
  - `estimated_quantity`
  - `estimated_total_amount`
  - `estimated_work_amount`
  - `forecasted_end_date`
  - `gst_amount`
  - `gst_percent`
  - `has_cost_component`
  - `hsn_code`
  - `id`
  - `index`
  - `installation_rate`
  - `invoice_number`
  - `invoiced_amount`
  - ... and 56 more keys

## 🌐 Endpoint: `/apis/v3/list/all/project`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `projects`

## 🌐 Endpoint: `/apis/v3/list/all/todo`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `is_closed`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].assigned_to`
  - `data[].assignee_cu_ids`
  - `data[].billing_activity_id`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].due_date`
  - `data[].id`
  - `data[].is_closed`
  - `data[].is_primary`
  - `data[].is_recurring`
  - `data[].link`
  - `data[].monkey_patch_assigned_to`
  - `data[].monkey_patch_assignee_list`
  - `data[].monkey_patch_billing_activity`
  - `data[].monkey_patch_parent_todo`
  - `data[].monkey_patch_project`
  - `data[].monkey_patch_sub_category`
  - `data[].name`
  - `data[].parent_id`
  - `data[].photos`
  - `data[].project_id`
  - `data[].recurrence_meta`
  - `data[].sub_category_id`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/all/transaction`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].approval_flag`
  - `data[].category_id`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].feature_id`
  - `data[].feature_type`
  - `data[].id`
  - `data[].invoice_feature_id`
  - `data[].invoice_feature_type`
  - `data[].monkey_patch_cashbooktransaction`
  - `data[].monkey_patch_creator_company_user`
  - `data[].monkey_patch_invoice`
  - `data[].monkey_patch_invoice_feature`
  - `data[].monkey_patch_materialtransfer`
  - `data[].monkey_patch_party_company_user`
  - `data[].monkey_patch_project`
  - `data[].monkey_patch_sub_category`
  - `data[].party_company_user_id`
  - `data[].project_id`
  - `data[].project_ids`
  - `data[].sequence`
  - `data[].sub_category_id`
  - `data[].transaction_date`
  - `data[].transaction_type`
  - `data[].updated`
  - `debit_credit`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/all/transaction/companylevel`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].approval_flag`
  - `data[].category_id`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].feature_id`
  - `data[].feature_type`
  - `data[].id`
  - `data[].invoice_feature_id`
  - `data[].invoice_feature_type`
  - `data[].monkey_patch_cashbooktransaction`
  - `data[].monkey_patch_creator_company_user`
  - `data[].monkey_patch_invoice`
  - `data[].monkey_patch_invoice_feature`
  - `data[].monkey_patch_materialtransfer`
  - `data[].monkey_patch_party_company_user`
  - `data[].monkey_patch_project`
  - `data[].monkey_patch_sub_category`
  - `data[].party_company_user_id`
  - `data[].project_id`
  - `data[].project_ids`
  - `data[].sequence`
  - `data[].sub_category_id`
  - `data[].transaction_date`
  - `data[].transaction_type`
  - `data[].updated`
  - `debit_credit`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/approval-pipeline-template`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `feature_type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].feature_type`
  - `data[].id`
  - `data[].max`
  - `data[].min`
  - `data[].name`
  - `data[].normal`
  - `data[].published`
  - `data[].type`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/approval-pipeline-template-level`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `template_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].approval_pipeline_template_id`
  - `data[].company_id`
  - `data[].company_role_ids`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].id`
  - `data[].level`
  - `data[].monkey_patch_company_roles`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/assetitem`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].id`
  - `data[].name`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/baseline`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `workorder_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `baselines`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/billingactivity/all`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `workorder_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**: None

## 🌐 Endpoint: `/apis/v3/list/billingactivity/section-and-group`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `workorder_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/category`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `categories`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/chatgroup`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].description`
  - `data[].group_admins`
  - `data[].group_members`
  - `data[].group_type`
  - `data[].id`
  - `data[].monkey_patch_creator`
  - `data[].monkey_patch_group_members`
  - `data[].monkey_patch_is_closed`
  - `data[].name`
  - `data[].profile_photo`
  - `data[].tagged_user_ids`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/chatgroupitem`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `chat_group_id`
  - `count`
  - `page`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].chat_group_id`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].id`
  - `data[].monkey_patch_creator_company_user`
  - `data[].monkey_patch_source`
  - `data[].source_id`
  - `data[].source_type`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/company-holiday`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_user_id`
  - `data[].holiday_date`
  - `data[].id`
  - `data[].name`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/company-log`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/companyaddress`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `address_list`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/companybankaccount`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].bank_account_id`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].id`
  - `data[].monkey_patch_bank_account`
  - `data[].primary`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/companyrole`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].description`
  - `data[].hidden`
  - `data[].id`
  - `data[].monkey_patch_policies`
  - `data[].name`
  - `data[].policy_ids`
  - `data[].role`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/companyuser`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `count`
  - `hidden`
  - `limit`
  - `priority_type`
  - `type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `available_slot_count`
  - `data`
  - `data[].aadhar_card_number`
  - `data[].aadhar_photos`
  - `data[].address_ids`
  - `data[].assigned_project_ids`
  - `data[].bank_account_ids`
  - `data[].billing_address`
  - `data[].city`
  - `data[].company_id`
  - `data[].company_role_id`
  - `data[].company_user_bank_account_ids`
  - `data[].created`
  - `data[].creator`
  - `data[].custom_fields`
  - `data[].dashboard_preferences`
  - `data[].date_of_birth`
  - `data[].date_of_joining`
  - `data[].email`
  - `data[].esi_number`
  - `data[].father_name`
  - `data[].gstin`
  - `data[].hidden`
  - `data[].id`
  - `data[].is_chat_group_admin`
  - `data[].is_chat_group_member`
  - `data[].legal_business_name`
  - `data[].mobile`
  - `data[].mobile_verified`
  - `data[].monkey_patch_company_role`
  - ... and 35 more keys

## 🌐 Endpoint: `/apis/v3/list/companyuser/for-payroll`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `available_slot_count`
  - `data`
  - `data[].aadhar_card_number`
  - `data[].aadhar_photos`
  - `data[].address_ids`
  - `data[].assigned_project_ids`
  - `data[].bank_account_ids`
  - `data[].billing_address`
  - `data[].city`
  - `data[].company_id`
  - `data[].company_role_id`
  - `data[].company_user_bank_account_ids`
  - `data[].created`
  - `data[].creator`
  - `data[].custom_fields`
  - `data[].dashboard_preferences`
  - `data[].date_of_birth`
  - `data[].date_of_joining`
  - `data[].email`
  - `data[].esi_number`
  - `data[].father_name`
  - `data[].gstin`
  - `data[].hidden`
  - `data[].id`
  - `data[].is_chat_group_admin`
  - `data[].is_chat_group_member`
  - `data[].legal_business_name`
  - `data[].mobile`
  - `data[].mobile_verified`
  - `data[].monkey_patch_company_role`
  - ... and 35 more keys

## 🌐 Endpoint: `/apis/v3/list/companyuser/inspected-by`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `code`
  - `message`

## 🌐 Endpoint: `/apis/v3/list/companyuser/ledger`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].company_id`
  - `data[].created`
  - `data[].credit_note_amount`
  - `data[].debit_note_amount`
  - `data[].deduction_amount`
  - `data[].delete`
  - `data[].equipment_expense_amount`
  - `data[].expense_deduction_amount`
  - `data[].expense_retention_amount`
  - `data[].expense_retention_paid_amount`
  - `data[].hidden`
  - `data[].id`
  - `data[].in_amount`
  - `data[].income_deduction_amount`
  - `data[].income_retention_amount`
  - `data[].income_retention_paid_amount`
  - `data[].material_amount`
  - `data[].material_return_amount`
  - `data[].material_sale_amount`
  - `data[].monkey_patch_party_company_user`
  - `data[].out_amount`
  - `data[].party_company_user_id`
  - `data[].partyearning_amount`
  - `data[].payment_sources`
  - `data[].reimbursement_amount`
  - `data[].retention_paid_amount`
  - `data[].retention_total_payable_amount`
  - `data[].sal_amount`
  - `data[].salary_payment_amount`
  - ... and 6 more keys

## 🌐 Endpoint: `/apis/v3/list/countries`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `country_code`
  - `country_iso`
  - `country_name`
  - `created`
  - `currency`
  - `decimal_digit`
  - `flag`
  - `login_channels`
  - `maximum_digits`
  - `minimum_digits`
  - `published`
  - `tax_display_name`
  - `tax_slabs`
  - `tax_value_display_name`
  - `timezone`

## 🌐 Endpoint: `/apis/v3/list/crm/lead`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `crm_leads`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/crm/lead/assignee`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `aadhar_card_number`
  - `aadhar_photos`
  - `address_ids`
  - `assigned_project_ids`
  - `bank_account_ids`
  - `billing_address`
  - `city`
  - `company_id`
  - `company_role_id`
  - `company_user_bank_account_ids`
  - `created`
  - `creator`
  - `custom_fields`
  - `dashboard_preferences`
  - `date_of_birth`
  - `date_of_joining`
  - `email`
  - `esi_number`
  - `father_name`
  - `gstin`
  - `hidden`
  - `id`
  - `is_chat_group_admin`
  - `is_chat_group_member`
  - `legal_business_name`
  - `mobile`
  - `mobile_verified`
  - `monkey_patch_company_role`
  - `monkey_patch_creator`
  - `monkey_patch_is_project_member`
  - ... and 32 more keys

## 🌐 Endpoint: `/apis/v3/list/crm/lead/next-followup-date`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**: None

## 🌐 Endpoint: `/apis/v3/list/customfield`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `custom_field_type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/dashboard/project`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `projects`

## 🌐 Endpoint: `/apis/v3/list/deductionitem`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `pre_tax`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `deductionItems`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/equipmentstock`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `end_date`
  - `project_id`
  - `start_date`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `equipment_stocks`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/helpvideo`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `count`
  - `platform`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `help_videos`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/inspection-form-response`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].approval_flag`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].feature_id`
  - `data[].feature_type`
  - `data[].id`
  - `data[].inspected_by_cu_id`
  - `data[].inspection_date`
  - `data[].inspection_form_id`
  - `data[].inspection_form_template_id`
  - `data[].location_id`
  - `data[].monkey_patch_feature`
  - `data[].monkey_patch_inspected_by`
  - `data[].monkey_patch_location`
  - `data[].name`
  - `data[].notes`
  - `data[].photos`
  - `data[].prefix`
  - `data[].project_id`
  - `data[].search`
  - `data[].sequence`
  - `data[].status`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/invoice/credit-debit-note`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `feature_type`
  - `invoice_type`
  - `party_company_user_id`
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/leave-item`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/leave-template`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `count`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/location`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].children_ids`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].id`
  - `data[].index`
  - `data[].monkey_patch_path`
  - `data[].name`
  - `data[].parent_id`
  - `data[].project_id`
  - `data[].updated`
  - `pagination`

## 🌐 Endpoint: `/apis/v3/list/material`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `materialstock_id`
  - `type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `debit_credit`
  - `materials`
  - `materialstock_count`
  - `page`
  - `total_payable`

## 🌐 Endpoint: `/apis/v3/list/materialitem`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `MaterialItems`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/materialrequestitem/material-item`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**: None

## 🌐 Endpoint: `/apis/v3/list/materialrequestitem/material-request`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**: None

## 🌐 Endpoint: `/apis/v3/list/materialrequestitem/project`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**: None

## 🌐 Endpoint: `/apis/v3/list/materialrequestitem/teamlevel`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `status`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/materialstock`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `materialstocks`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/mom`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/mom/attendee`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `aadhar_card_number`
  - `aadhar_photos`
  - `address_ids`
  - `assigned_project_ids`
  - `bank_account_ids`
  - `billing_address`
  - `city`
  - `code`
  - `company_id`
  - `company_role_id`
  - `company_user_bank_account_ids`
  - `created`
  - `creator`
  - `custom_fields`
  - `dashboard_preferences`
  - `date_of_birth`
  - `date_of_joining`
  - `email`
  - `esi_number`
  - `father_name`
  - `gstin`
  - `hidden`
  - `id`
  - `is_chat_group_admin`
  - `is_chat_group_member`
  - `legal_business_name`
  - `message`
  - `mobile`
  - `mobile_verified`
  - `monkey_patch_company_role`
  - ... and 34 more keys

## 🌐 Endpoint: `/apis/v3/list/mom/project`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `address`
  - `admins`
  - `admins_company_user_ids`
  - `allowed_features`
  - `attendance_radius`
  - `bg_image`
  - `billed_amount`
  - `city`
  - `code`
  - `company_address_id`
  - `company_id`
  - `contact_book`
  - `contact_data`
  - `contractor`
  - `contractor_company_user_id`
  - `created`
  - `creator`
  - `creator_company_user_id`
  - `custom_fields`
  - `customer_company_address`
  - `customer_company_name`
  - `customer_contact`
  - `customer_email`
  - `customer_gst`
  - `customer_name`
  - `customer_profile_image`
  - `default_grn_prefix`
  - `default_material_request_prefix`
  - `dimension`
  - `distance`
  - ... and 42 more keys

## 🌐 Endpoint: `/apis/v3/list/my/project/companylevel`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `projects`

## 🌐 Endpoint: `/apis/v3/list/my/todo`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `is_closed`
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/payment-request/companylevel`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].amount`
  - `data[].approval_flag`
  - `data[].cashbook_transaction_id`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].due_date`
  - `data[].feature_id`
  - `data[].feature_type`
  - `data[].id`
  - `data[].is_amount_percentage`
  - `data[].monkey_patch_creator_company_user`
  - `data[].monkey_patch_feature`
  - `data[].monkey_patch_party_company_user`
  - `data[].monkey_patch_project`
  - `data[].notes`
  - `data[].party_company_user_id`
  - `data[].payment_date`
  - `data[].percentage_value`
  - `data[].photos`
  - `data[].prefix`
  - `data[].project_id`
  - `data[].sequence`
  - `data[].status`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/payroll`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `hidden`
  - `type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/payroll/labour-attendance`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `end_date`
  - `start_date`
  - `type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/platforminfo`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `ts`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `platform_infos`

## 🌐 Endpoint: `/apis/v3/list/progress-assignee`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `count`
  - `workorder_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/progress-assignee/companylevel`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `count`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `code`
  - `data`
  - `message`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/progress-subcategory`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `workorder_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `subcategories`

## 🌐 Endpoint: `/apis/v3/list/progress/billingactivity/companylevel`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].actual_end_date`
  - `data[].actual_start_date`
  - `data[].assigned_to`
  - `data[].children_ids`
  - `data[].company_id`
  - `data[].completed_amount`
  - `data[].completed_gst_amount`
  - `data[].completed_quantity`
  - `data[].completed_total_amount`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].design_ids`
  - `data[].due_date`
  - `data[].duration`
  - `data[].end_date`
  - `data[].estimated_quantity`
  - `data[].estimated_total_amount`
  - `data[].estimated_work_amount`
  - `data[].forecasted_end_date`
  - `data[].gst_amount`
  - `data[].gst_percent`
  - `data[].has_cost_component`
  - `data[].hsn_code`
  - `data[].id`
  - `data[].index`
  - `data[].installation_rate`
  - `data[].invoice_number`
  - ... and 58 more keys

## 🌐 Endpoint: `/apis/v3/list/project`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `count`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `projects`

## 🌐 Endpoint: `/apis/v3/list/project-phase-subcategory`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**: None

## 🌐 Endpoint: `/apis/v3/list/project/root/folder`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].id`
  - `data[].meta`
  - `data[].monkey_patch_children_count`
  - `data[].monkey_patch_public_links`
  - `data[].name`
  - `data[].parent_dir`
  - `data[].project_id`
  - `data[].publiclink_ids`
  - `data[].shared`
  - `data[].type`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/public/announcement`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `platform`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].created`
  - `data[].delete`
  - `data[].description`
  - `data[].id`
  - `data[].link_url`
  - `data[].photo_url`
  - `data[].platforms`
  - `data[].published`
  - `data[].title`
  - `data[].updated`
  - `data[].video_url`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/retentionitem`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].company_id`
  - `data[].country_iso`
  - `data[].created`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].id`
  - `data[].monkey_patch_retention_entry`
  - `data[].name`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/salary-template`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `is_active`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/salesorder/leaf/billingactivity`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `workorder_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/servicerate`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `count`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/shifttiming`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`

## 🌐 Endpoint: `/apis/v3/list/subcategory`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `count`
  - `type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `subcategories`

## 🌐 Endpoint: `/apis/v3/list/subconexpenseitem`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `sub_con_expense_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].billing_activity_id`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].gst_amount`
  - `data[].gst_percent`
  - `data[].id`
  - `data[].is_engine`
  - `data[].measurement`
  - `data[].monkey_patch_billing_activity`
  - `data[].name`
  - `data[].notes`
  - `data[].project_id`
  - `data[].quantity`
  - `data[].sub_con_expense_id`
  - `data[].total_amount`
  - `data[].unit`
  - `data[].unit_id`
  - `data[].unit_price`
  - `data[].updated`
  - `data[].work_amount`
  - `data[].workorder_id`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/taskdependency`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `taskdependencies`

## 🌐 Endpoint: `/apis/v3/list/team-member`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].allowed_features`
  - `data[].company_id`
  - `data[].company_user_id`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_user_id`
  - `data[].hidden`
  - `data[].id`
  - `data[].is_key_personnel`
  - `data[].monkey_patch_company_user`
  - `data[].monkey_patch_creator`
  - `data[].monkey_patch_staffledgerbook`
  - `data[].monkey_patch_staffledgerbooks`
  - `data[].monkey_patch_user`
  - `data[].project_id`
  - `data[].role`
  - `data[].updated`
  - `data[].updated_by`
  - `data[].updated_by_company_user_id`
  - `data[].user_id`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/team-member/companylevel`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `count`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `available_slot_count`
  - `data`
  - `data[].aadhar_card_number`
  - `data[].aadhar_photos`
  - `data[].address_ids`
  - `data[].assigned_project_ids`
  - `data[].bank_account_ids`
  - `data[].billing_address`
  - `data[].city`
  - `data[].company_id`
  - `data[].company_role_id`
  - `data[].company_user_bank_account_ids`
  - `data[].created`
  - `data[].creator`
  - `data[].custom_fields`
  - `data[].dashboard_preferences`
  - `data[].date_of_birth`
  - `data[].date_of_joining`
  - `data[].email`
  - `data[].esi_number`
  - `data[].father_name`
  - `data[].gstin`
  - `data[].hidden`
  - `data[].id`
  - `data[].is_chat_group_admin`
  - `data[].is_chat_group_member`
  - `data[].legal_business_name`
  - `data[].mobile`
  - `data[].mobile_verified`
  - `data[].monkey_patch_company_role`
  - ... and 35 more keys

## 🌐 Endpoint: `/apis/v3/list/team/leave-application`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `year`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/third-party-app`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `code`
  - `message`

## 🌐 Endpoint: `/apis/v3/list/timesheet`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].billing_activity_id`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].duration`
  - `data[].end_time`
  - `data[].id`
  - `data[].monkey_patch_billing_activity`
  - `data[].monkey_patch_creator_company_user`
  - `data[].monkey_patch_party_company_user`
  - `data[].monkey_patch_project`
  - `data[].notes`
  - `data[].party_company_user_id`
  - `data[].photos`
  - `data[].project_id`
  - `data[].search`
  - `data[].start_time`
  - `data[].timesheet_date`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/timesheet/party`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `aadhar_card_number`
  - `aadhar_photos`
  - `address_ids`
  - `assigned_project_ids`
  - `bank_account_ids`
  - `billing_address`
  - `city`
  - `company_id`
  - `company_role_id`
  - `company_user_bank_account_ids`
  - `created`
  - `creator`
  - `custom_fields`
  - `dashboard_preferences`
  - `date_of_birth`
  - `date_of_joining`
  - `email`
  - `esi_number`
  - `father_name`
  - `gstin`
  - `hidden`
  - `id`
  - `is_chat_group_admin`
  - `is_chat_group_member`
  - `legal_business_name`
  - `mobile`
  - `mobile_verified`
  - `monkey_patch_company_role`
  - `monkey_patch_creator`
  - `monkey_patch_is_project_member`
  - ... and 32 more keys

## 🌐 Endpoint: `/apis/v3/list/todo/assignee`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `available_slot_count`
  - `data`
  - `data[].aadhar_card_number`
  - `data[].aadhar_photos`
  - `data[].address_ids`
  - `data[].assigned_project_ids`
  - `data[].bank_account_ids`
  - `data[].billing_address`
  - `data[].city`
  - `data[].company_id`
  - `data[].company_role_id`
  - `data[].company_user_bank_account_ids`
  - `data[].created`
  - `data[].creator`
  - `data[].custom_fields`
  - `data[].dashboard_preferences`
  - `data[].date_of_birth`
  - `data[].date_of_joining`
  - `data[].email`
  - `data[].esi_number`
  - `data[].father_name`
  - `data[].gstin`
  - `data[].hidden`
  - `data[].id`
  - `data[].is_chat_group_admin`
  - `data[].is_chat_group_member`
  - `data[].legal_business_name`
  - `data[].mobile`
  - `data[].mobile_verified`
  - `data[].monkey_patch_company_role`
  - ... and 35 more keys

## 🌐 Endpoint: `/apis/v3/list/todo/project`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `projects`

## 🌐 Endpoint: `/apis/v3/list/wallet`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `owner_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].balance`
  - `data[].bank_account_id`
  - `data[].cold_in_amount`
  - `data[].cold_out_amount`
  - `data[].cold_salary_payment_amount`
  - `data[].company_id`
  - `data[].created`
  - `data[].cut_off_time`
  - `data[].delete`
  - `data[].entry_time`
  - `data[].hot_in_amount`
  - `data[].hot_out_amount`
  - `data[].hot_salary_payment_amount`
  - `data[].id`
  - `data[].in_amount`
  - `data[].monkey_patch_bank_account`
  - `data[].monkey_patch_company`
  - `data[].monkey_patch_company_bank_account`
  - `data[].monkey_patch_company_user`
  - `data[].out_amount`
  - `data[].owner_id`
  - `data[].owner_type`
  - `data[].salary_payment_amount`
  - `data[].updated`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/warehouse`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `projects`

## 🌐 Endpoint: `/apis/v3/list/weekoff`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/workable/company`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `Companies`
  - `page`

## 🌐 Endpoint: `/apis/v3/list/workforce-type-wise`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].company_id`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_user_id`
  - `data[].delete`
  - `data[].id`
  - `data[].is_engine`
  - `data[].monkey_patch_present_count`
  - `data[].monkey_patch_sub_category`
  - `data[].monkey_patch_used_by_project`
  - `data[].name`
  - `data[].party_company_user_id`
  - `data[].shift_hours`
  - `data[].sub_category_id`
  - `data[].type`
  - `data[].updated`
  - `data[].wage`
  - `page`

## 🌐 Endpoint: `/apis/v3/materialtransfer/list/materialstock`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `materialstocks`
  - `page`

## 🌐 Endpoint: `/apis/v3/payment-in-out/stats/projectlevel`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `ledgerbook`
  - `total_payment_in`
  - `total_payment_out`

## 🌐 Endpoint: `/apis/v3/payroll/attendance/stats/companylevel`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `end_date`
  - `start_date`
  - `type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `absent`
  - `paid_leave`
  - `present`

## 🌐 Endpoint: `/apis/v3/payroll/count`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `hidden`
  - `type`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `count`

## 🌐 Endpoint: `/apis/v3/profile`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `user`

## 🌐 Endpoint: `/apis/v3/sales-expense/stats/projectlevel`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `total_expense`
  - `total_expense_gst`
  - `total_expense_without_gst`
  - `total_invoice_gst`
  - `total_invoice_without_gst`
  - `total_sales`

## 🌐 Endpoint: `/apis/v3/salesorder/leaf/billingactivity/count`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `workorder_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `count`

## 🌐 Endpoint: `/apis/v3/stats/company/project`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har, fromprojectinternalwebsiteweb.onsiteteams.com.har, tillreportinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `complete_project_count`
  - `ongoing_project_count`

## 🌐 Endpoint: `/apis/v3/stats/progress/billingactivity`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `workorder_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `Completed`
  - `NotStarted`
  - `NotStarted_delay`
  - `Ongoing`
  - `Ongoing_delay`
  - `total`

## 🌐 Endpoint: `/apis/v3/stats/progresschat/billingactivity`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `end_date`
  - `start_date`
  - `workorder_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**: None

## 🌐 Endpoint: `/apis/v3/subcon/list/workorder/party-wise`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `page`
  - `workorderpartywise`

## 🌐 Endpoint: `/apis/v3/subcon/list/workorder/projectlevel`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].approval_flag`
  - `data[].bank_account_id`
  - `data[].client_company_client_cu_id`
  - `data[].client_company_id`
  - `data[].client_company_vendor_cu_id`
  - `data[].client_project_id`
  - `data[].completed_amount`
  - `data[].completed_gst_amount`
  - `data[].completed_total_amount`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_id`
  - `data[].creator_company_user_id`
  - `data[].crm_lead_id`
  - `data[].custom_fields`
  - `data[].delete`
  - `data[].discount`
  - `data[].estimated_gst_amount`
  - `data[].estimated_total_amount`
  - `data[].estimated_work_amount`
  - `data[].gst_percent`
  - `data[].id`
  - `data[].invoiced_amount`
  - `data[].is_non_itemized_tax`
  - `data[].is_roundoff`
  - `data[].item_count`
  - `data[].monkey_patch_bank_account`
  - `data[].monkey_patch_billing_activities`
  - `data[].monkey_patch_client_company_vendor_cu`
  - ... and 31 more keys

## 🌐 Endpoint: `/apis/v3/transaction/stats/approval/count`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `approved_count`
  - `auto_approved_count`
  - `pending_count`
  - `rejected_count`

## 🌐 Endpoint: `/apis/v3/unbilled-material/count`
### Method: **GET**
- **Captured In**: demoprojectwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `project_id`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `unbilled_material_count`

## 🌐 Endpoint: `/apis/v3/vendor/add/workorder`
### Method: **POST**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `creator_company_id`
  - `is_non_itemized_tax`
  - `name`
  - `terms`
  - `vendor_company_client_cu_id`
- **JSON Response Schema Keys**:
  - `approval_flag`
  - `bank_account_id`
  - `client_company_client_cu_id`
  - `client_company_id`
  - `client_company_vendor_cu_id`
  - `client_project_id`
  - `completed_amount`
  - `completed_gst_amount`
  - `completed_total_amount`
  - `created`
  - `creator`
  - `creator_company_id`
  - `creator_company_user_id`
  - `crm_lead_id`
  - `custom_fields`
  - `delete`
  - `discount`
  - `estimated_gst_amount`
  - `estimated_total_amount`
  - `estimated_work_amount`
  - `gst_percent`
  - `id`
  - `invoiced_amount`
  - `is_non_itemized_tax`
  - `is_roundoff`
  - `item_count`
  - `monkey_patch_bank_account`
  - `monkey_patch_billing_activities`
  - `monkey_patch_client_company_vendor_cu`
  - `monkey_patch_crm_lead`
  - ... and 29 more keys

## 🌐 Endpoint: `/apis/v3/vendor/detail/workorder/{id}`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `approval_flag`
  - `bank_account_id`
  - `client_company_client_cu_id`
  - `client_company_id`
  - `client_company_vendor_cu_id`
  - `client_project_id`
  - `completed_amount`
  - `completed_gst_amount`
  - `completed_total_amount`
  - `created`
  - `creator`
  - `creator_company_id`
  - `creator_company_user_id`
  - `crm_lead_id`
  - `custom_fields`
  - `delete`
  - `discount`
  - `estimated_gst_amount`
  - `estimated_total_amount`
  - `estimated_work_amount`
  - `gst_percent`
  - `id`
  - `invoiced_amount`
  - `is_non_itemized_tax`
  - `is_roundoff`
  - `item_count`
  - `monkey_patch_bank_account`
  - `monkey_patch_billing_activities`
  - `monkey_patch_client_company_vendor_cu`
  - `monkey_patch_crm_lead`
  - ... and 29 more keys

## 🌐 Endpoint: `/apis/v3/vendor/edit/workorder`
### Method: **PATCH**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**: None
- **JSON Payload Keys**:
  - `approval_flag`
  - `bank_account_id`
  - `client_company_client_cu_id`
  - `client_company_id`
  - `client_company_vendor_cu_id`
  - `client_project_id`
  - `completed_amount`
  - `completed_gst_amount`
  - `completed_total_amount`
  - `created`
  - `creator`
  - `creator_company_id`
  - `creator_company_user_id`
  - `crm_lead_id`
  - `custom_fields`
  - `delete`
  - `discount`
  - `estimated_gst_amount`
  - `estimated_total_amount`
  - `estimated_work_amount`
  - `gst_percent`
  - `id`
  - `invoiced_amount`
  - `is_non_itemized_tax`
  - `is_roundoff`
  - `item_count`
  - `monkey_patch_bank_account`
  - `monkey_patch_billing_activities`
  - `monkey_patch_client_company_vendor_cu`
  - `monkey_patch_crm_lead`
  - `monkey_patch_milestone_count`
  - `monkey_patch_project`
  - `monkey_patch_subcon_expense_count`
  - `monkey_patch_vendor_company_client_cu`
  - `monkey_patch_vendor_company_client_cu_address`
  - `name`
  - `net_work_amount`
  - `notes`
  - `other_amount`
  - `photos`
  - `pre_tax_deduction_amount`
  - `prefix`
  - `primary_base_line_id`
  - `progress`
  - `quotation_count`
  - `quotation_date`
  - `quotation_number`
  - `quotation_status`
  - `sequence`
  - `terms`
  - `total_cost_price`
  - `total_markup_amount`
  - `type`
  - `updated`
  - `vendor_company_client_cu_id`
  - `vendor_company_id`
  - `vendor_company_vendor_cu_id`
  - `vendor_project_id`
  - `work_states`
- **JSON Response Schema Keys**:
  - `approval_flag`
  - `bank_account_id`
  - `client_company_client_cu_id`
  - `client_company_id`
  - `client_company_vendor_cu_id`
  - `client_project_id`
  - `completed_amount`
  - `completed_gst_amount`
  - `completed_total_amount`
  - `created`
  - `creator`
  - `creator_company_id`
  - `creator_company_user_id`
  - `crm_lead_id`
  - `custom_fields`
  - `delete`
  - `discount`
  - `estimated_gst_amount`
  - `estimated_total_amount`
  - `estimated_work_amount`
  - `gst_percent`
  - `id`
  - `invoiced_amount`
  - `is_non_itemized_tax`
  - `is_roundoff`
  - `item_count`
  - `monkey_patch_bank_account`
  - `monkey_patch_billing_activities`
  - `monkey_patch_client_company_vendor_cu`
  - `monkey_patch_crm_lead`
  - ... and 29 more keys

## 🌐 Endpoint: `/apis/v3/vendor/list/workorder`
### Method: **GET**
- **Captured In**: fromprojectinternalwebsiteweb.onsiteteams.com.har
- **Query Parameters**:
  - `company_id`
  - `quotation_status`
- **JSON Payload Keys**: None
- **JSON Response Schema Keys**:
  - `data`
  - `data[].approval_flag`
  - `data[].bank_account_id`
  - `data[].client_company_client_cu_id`
  - `data[].client_company_id`
  - `data[].client_company_vendor_cu_id`
  - `data[].client_project_id`
  - `data[].completed_amount`
  - `data[].completed_gst_amount`
  - `data[].completed_total_amount`
  - `data[].created`
  - `data[].creator`
  - `data[].creator_company_id`
  - `data[].creator_company_user_id`
  - `data[].crm_lead_id`
  - `data[].custom_fields`
  - `data[].delete`
  - `data[].discount`
  - `data[].estimated_gst_amount`
  - `data[].estimated_total_amount`
  - `data[].estimated_work_amount`
  - `data[].gst_percent`
  - `data[].id`
  - `data[].invoiced_amount`
  - `data[].is_non_itemized_tax`
  - `data[].is_roundoff`
  - `data[].item_count`
  - `data[].monkey_patch_bank_account`
  - `data[].monkey_patch_billing_activities`
  - `data[].monkey_patch_client_company_vendor_cu`
  - ... and 31 more keys

