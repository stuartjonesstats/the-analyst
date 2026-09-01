# Meridian Living Systems data-estate inventory

Generated tables: **96**  
Generated rows: **16,548,418**  
Schemas: **16**

## `billing`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `invoice` | One row per issued invoice | 719,302 | 12 | verified-with-known-exceptions |
| `payment_attempt` | One row per payment attempt | 764,039 | 12 | verified-with-known-exceptions |
| `subscription` | One row per subscription contract | 40,000 | 10 | verified |
| `subscription_event` | One row per subscription lifecycle event | 200,000 | 8 | verified |

## `catalog`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `plan_price_history` | One row per service plan and annual price period. | 54 | 6 | verified |
| `product` | One row per product/SKU. | 720 | 13 | verified |
| `product_category` | One row per product category. | 55 | 5 | verified |
| `product_price_history` | One row per product, channel, and effective price period. | 4,320 | 8 | verified |
| `product_substitution` | One ranked substitute product for a requested product. | 1,440 | 7 | verified |
| `service_plan` | One row per service plan. | 18 | 9 | verified |

## `commerce`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `order` | One row per canonical order | 220,000 | 15 | verified-with-known-exceptions |
| `order_event` | One row per recorded order event | 660,000 | 8 | verified-with-known-exceptions |
| `order_line` | One row per order line | 394,054 | 11 | verified |
| `shipment_event` | One row per shipment tracking event | 611,004 | 8 | verified |

## `core`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `branch` | One row per operating branch. | 36 | 9 | verified |
| `business_calendar` | One row per calendar date in the generated world. | 1,096 | 11 | verified |
| `legacy_id_xref` | One source-system identifier for one canonical entity and validity period. | 74,825 | 8 | partially-verified |
| `org_unit` | One row per current organizational unit. | 90 | 8 | verified |
| `postal_area` | One row per postal area. | 800 | 8 | verified |
| `region` | One row per corporate region. | 6 | 6 | verified |
| `service_area` | One row per current service territory. | 120 | 8 | verified |
| `world_event` | One row per world-state event. | 180 | 10 | verified |

## `crm`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `account` | One row per customer account. | 65,000 | 10 | verified |
| `account_member` | One customer-account membership period. | 79,300 | 7 | verified |
| `account_status_event` | One status transition for one account. | 76,806 | 6 | verified |
| `consent_event` | One consent action for one customer/contact/purpose. | 110,000 | 9 | verified |
| `contact_point` | One contact point for one customer and effective period. | 82,800 | 8 | verified |
| `customer` | One row per known person or small-business party. | 60,000 | 10 | verified |
| `service_site` | One row per serviceable physical site. | 80,000 | 12 | verified |

## `external`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `energy_price_daily` | One region, date, and utility-type price. | 19,728 | 7 | verified |
| `holiday_calendar` | One dated calendar event in one region. | 540 | 6 | verified |
| `postal_demographic_annual` | One postal area and calendar year estimate. | 2,400 | 10 | caution |
| `traffic_area_hourly` | One provider revision for a sampled service-area hour. | 380,000 | 8 | caution |
| `weather_hourly` | One station-hour observation. | 315,648 | 14 | verified |
| `weather_station` | One weather station. | 12 | 8 | verified |

## `field_ops`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `appointment` | One booked service appointment. | 120,000 | 10 | verified |
| `visit` | One physical or attempted service visit. | 120,000 | 11 | verified |
| `work_order` | One requested unit of field work. | 120,000 | 20 | caution |
| `work_order_analytics` | One work order in the current analytical extract. | 120,000 | 38 | caution |
| `work_order_note` | One note attached to one work order. | 210,000 | 7 | verified |
| `work_order_part` | One product line recorded against one service visit. | 260,000 | 7 | verified |
| `work_order_status_event` | One recorded work-order status transition. | 720,000 | 7 | verified |

## `finance`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `budget_monthly` | One cost center, month, and scenario. | 17,280 | 6 | verified |
| `chart_of_account` | One posting-level GL account. | 96 | 7 | verified |
| `cost_center` | One cost center. | 120 | 7 | verified |
| `journal_entry` | One journal entry header. | 145,000 | 10 | verified |
| `journal_line` | One line within one journal entry. | 460,000 | 11 | caution |

## `fleet`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `fuel_charge` | One card or charging-network transaction. | 58,000 | 8 | verified |
| `gps_ping` | One GPS device ping. | 540,000 | 10 | verified |
| `maintenance_event` | One vehicle maintenance event. | 11,000 | 8 | verified |
| `route` | One vehicle-technician route on one date. | 110,000 | 10 | verified |
| `route_stop` | One work-order stop on one route. | 320,000 | 8 | caution |
| `vehicle` | One row per fleet vehicle. | 220 | 10 | verified |
| `vehicle_assignment_history` | One employee-vehicle assignment period. | 519 | 6 | verified |

## `growth`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `experiment` | One row per experiment | 8 | 7 | verified |
| `experiment_assignment` | One row per experiment-session assignment | 321,706 | 9 | verified |
| `session` | One row per digital session | 450,000 | 12 | verified-with-known-exceptions |
| `web_event` | One row per web or app interaction event | 1,303,974 | 8 | verified |

## `iot`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `asset` | One installed physical asset. | 55,000 | 12 | verified |
| `asset_health_daily` | One sampled asset-day analytical snapshot. | 360,000 | 38 | caution |
| `asset_installation_history` | One asset-at-site installation period. | 72,000 | 7 | caution |
| `device_alert` | One generated device alert. | 180,000 | 9 | caution |
| `sensor` | One sensor or logical measurement channel. | 72,000 | 6 | verified |
| `sensor_reading` | One recorded sensor observation. | 1,200,000 | 10 | caution |

## `platform`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `account_feature_snapshot` | One account at one feature-as-of timestamp; multiple snapshots per account are expected. | 165,000 | 213 | caution |
| `data_quality_result` | One check result for one asset in one run. | 260,000 | 11 | caution |
| `model_prediction` | One scored account request by one model version. | 370,000 | 14 | verified |
| `model_registry` | One logical model product. | 18 | 8 | verified |
| `model_version` | One trained model version. | 76 | 11 | verified |
| `pipeline` | One logical data pipeline. | 72 | 9 | verified |
| `pipeline_run` | One orchestrator attempt for one pipeline. | 92,000 | 11 | verified |
| `source_registry` | One source system or provider integration. | 16 | 7 | verified |

## `supply`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `goods_receipt` | One receipt event for one PO line. | 82,000 | 8 | caution |
| `inventory_movement` | One posted technical inventory event; replay rows link to the original physical movement. | 520,000 | 13 | caution |
| `inventory_position_daily` | One sampled product, warehouse, and snapshot-date position. | 330,000 | 25 | caution |
| `product_vendor` | One product-vendor sourcing relationship. | 1,440 | 10 | verified |
| `purchase_order` | One purchase order. | 24,000 | 10 | verified |
| `purchase_order_line` | One line item on a purchase order. | 96,000 | 9 | verified |
| `vendor` | One row per vendor. | 85 | 9 | verified |
| `warehouse` | One row per distribution center. | 3 | 10 | verified |

## `support`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `conversation` | One conversation thread. | 112,000 | 6 | verified |
| `csat_response` | One returned survey per ticket. | 48,000 | 8 | caution |
| `knowledge_article` | One logical knowledge article. | 520 | 7 | verified |
| `knowledge_article_view` | One article view event. | 190,000 | 6 | verified |
| `message` | One message in one conversation. | 360,000 | 9 | caution |
| `ticket` | One source-system ticket; interaction_fingerprint is the cross-system reconciliation key. | 100,000 | 18 | caution |
| `ticket_status_event` | One observed status transition. | 430,000 | 7 | verified |

## `trust`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `consent_event` | One consent-state change for one account and purpose. | 190,000 | 9 | caution |
| `data_access_log` | One logical access event. | 540,000 | 10 | caution |
| `privacy_request` | One privacy request case. | 9,500 | 9 | verified |

## `workforce`

| Table | Grain | Rows | Columns | Reliability |
|---|---|---:|---:|---|
| `absence` | One absence episode affecting a scheduled shift. | 7,650 | 7 | verified |
| `employee` | One row per employee identity. | 850 | 12 | verified |
| `employee_role_history` | One employee role assignment period. | 1,122 | 9 | verified |
| `shift` | One scheduled employee shift. | 297,500 | 8 | verified |
| `skill_certification` | One employee-product certification period. | 1,600 | 7 | verified |
| `training_completion` | One employee-course completion attempt. | 7,650 | 6 | verified |

