from __future__ import annotations

import numpy as np

from builder import nullable, random_dates, random_timestamps, rng_for


def _fk(column, references, referenced_column=None, *, nullable_fk=False, warning=None):
    return {
        "columns": [column],
        "references": references,
        "referenced_columns": [referenced_column or column],
        "nullable": nullable_fk,
        "warning": warning,
    }


def _enum(rng, values, n, probabilities=None):
    return rng.choice(np.asarray(values), size=n, p=probabilities)


def generate_enterprise(builder):
    """Generate finance, governance, platform, and ML lifecycle data."""
    _generate_finance(builder)
    _generate_trust(builder)
    _generate_platform(builder)


def _generate_finance(builder):
    c = builder.context
    rng = rng_for("finance")
    n_accounts = 96
    gl_account_id = np.arange(1, n_accounts + 1, dtype=np.int16)
    account_types = np.repeat(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "CONTRA"], 16)
    builder.write(
        "finance", "chart_of_account",
        {
            "gl_account_id": gl_account_id,
            "gl_account_code": np.array([f"{1000 + x * 10}" for x in gl_account_id]),
            "gl_account_name": np.array([f"Synthetic {t.lower()} account {x:02d}" for x, t in zip(gl_account_id, account_types)]),
            "account_type_code": account_types,
            "normal_balance_code": np.where(np.isin(account_types, ["ASSET", "EXPENSE"]), "DEBIT", "CREDIT"),
            "active_flag": rng.random(n_accounts) > 0.04,
            "financial_statement_code": np.where(np.isin(account_types, ["REVENUE", "EXPENSE"]), "INCOME", "BALANCE_SHEET"),
        },
        description="General-ledger account hierarchy for the synthetic company.", grain="One posting-level GL account.",
        primary_key=["gl_account_id"], owner="Controllership", sensitivity="confidential",
    )
    n_cost = 120
    cost_center_id = np.arange(1, n_cost + 1, dtype=np.int16)
    builder.write(
        "finance", "cost_center",
        {
            "cost_center_id": cost_center_id,
            "cost_center_code": np.array([f"CC-{x:04d}" for x in cost_center_id]),
            "cost_center_name": np.array([f"Operating cost center {x}" for x in cost_center_id]),
            "branch_id": rng.choice(c["branch_id"], n_cost),
            "department_code": _enum(rng, ["SERVICE", "CARE", "SALES", "SUPPLY", "ENGINEERING", "G_AND_A"], n_cost),
            "manager_employee_id": rng.choice(c["employee_id"], n_cost),
            "active_flag": rng.random(n_cost) > 0.05,
        },
        description="Management-reporting cost centers aligned imperfectly to branches.", grain="One cost center.",
        primary_key=["cost_center_id"],
        foreign_keys=[_fk("branch_id", "core.branch"), _fk("manager_employee_id", "workforce.employee", "employee_id")],
        owner="FP&A", sensitivity="confidential",
    )
    n_entry = 145_000
    journal_entry_id = np.arange(1, n_entry + 1, dtype=np.int64)
    posted_at = random_timestamps(rng, n_entry)
    builder.write(
        "finance", "journal_entry",
        {
            "journal_entry_id": journal_entry_id,
            "journal_number": np.array([f"JE-{x:010d}" for x in journal_entry_id]),
            "posted_at": posted_at,
            "accounting_date": posted_at.astype("datetime64[D]"),
            "source_system_code": _enum(rng, ["ERP", "BILLING", "PAYROLL", "PROCUREMENT", "MANUAL"], n_entry),
            "journal_type_code": _enum(rng, ["STANDARD", "ACCRUAL", "REVERSAL", "ADJUSTMENT", "CLOSE"], n_entry),
            "status_code": _enum(rng, ["POSTED", "REVERSED", "DRAFT"], n_entry, [0.96, 0.025, 0.015]),
            "created_by_employee_id": rng.choice(c["employee_id"], n_entry),
            "batch_reference": np.array([f"BATCH-{x % 12000:06d}" for x in journal_entry_id]),
            "description": _enum(rng, ["Revenue posting", "Vendor accrual", "Payroll allocation", "Inventory adjustment", "Month-end reclass"], n_entry),
        },
        description="Posted and draft general-ledger journal headers.", grain="One journal entry header.",
        primary_key=["journal_entry_id"], foreign_keys=[_fk("created_by_employee_id", "workforce.employee", "employee_id")],
        owner="Controllership", sensitivity="restricted",
    )
    n_line = 460_000
    line_entry = rng.choice(journal_entry_id, n_line).astype(np.int64)
    amount = rng.integers(100, 2_500_000, n_line, dtype=np.int64)
    direction = _enum(rng, ["DEBIT", "CREDIT"], n_line)
    builder.write(
        "finance", "journal_line",
        {
            "journal_line_id": np.arange(1, n_line + 1, dtype=np.int64),
            "journal_entry_id": line_entry,
            "line_number": rng.integers(1, 20, n_line, dtype=np.int16),
            "gl_account_id": rng.choice(gl_account_id, n_line),
            "cost_center_id": rng.choice(cost_center_id, n_line),
            "debit_cents": np.where(direction == "DEBIT", amount, 0),
            "credit_cents": np.where(direction == "CREDIT", amount, 0),
            "currency_code": _enum(rng, ["USD", "CAD", "EUR"], n_line, [0.95, 0.03, 0.02]),
            "account_id": nullable(rng.choice(c["account_id"], n_line), rng.random(n_line) < 0.82),
            "vendor_id": nullable(rng.choice(c["vendor_id"], n_line), rng.random(n_line) < 0.9),
            "memo": _enum(rng, ["Automated source posting", "Allocation", "Correction", "Accrual", "Settlement"], n_line),
        },
        description="Debit and credit posting lines with optional operational dimensions.", grain="One line within one journal entry.",
        primary_key=["journal_line_id"],
        foreign_keys=[
            _fk("journal_entry_id", "finance.journal_entry"), _fk("gl_account_id", "finance.chart_of_account"),
            _fk("cost_center_id", "finance.cost_center"), _fk("account_id", "crm.account", nullable_fk=True),
            _fk("vendor_id", "supply.vendor", nullable_fk=True),
        ], owner="Controllership", sensitivity="restricted", reliability="caution",
        quality_notes=["The generated ledger resembles operational accounting data but is not guaranteed to balance by journal in v0."],
    )
    months = np.arange(np.datetime64("2023-01"), np.datetime64("2026-01"), np.timedelta64(1, "M"))
    n_budget = len(months) * n_cost * 4
    builder.write(
        "finance", "budget_monthly",
        {
            "budget_monthly_id": np.arange(1, n_budget + 1, dtype=np.int64),
            "budget_month": np.tile(np.repeat(months.astype("datetime64[D]"), 4), n_cost),
            "cost_center_id": np.repeat(cost_center_id, len(months) * 4),
            "scenario_code": np.tile(["ORIGINAL", "FORECAST_1", "FORECAST_2", "ACTUAL_BRIDGE"], len(months) * n_cost),
            "budget_cents": rng.integers(50_000, 28_000_000, n_budget, dtype=np.int64),
            "version_created_at": random_timestamps(rng, n_budget),
        },
        description="Monthly cost-center planning scenarios and revisions.", grain="One cost center, month, and scenario.",
        primary_key=["budget_monthly_id"], foreign_keys=[_fk("cost_center_id", "finance.cost_center")],
        owner="FP&A", sensitivity="restricted",
    )


def _generate_trust(builder):
    c = builder.context
    rng = rng_for("trust")
    n_consent = 190_000
    consent_account = rng.choice(c["account_id"], n_consent)
    consent_at = random_timestamps(rng, n_consent)
    builder.write(
        "trust", "consent_event",
        {
            "consent_event_id": np.arange(1, n_consent + 1, dtype=np.int64),
            "account_id": consent_account,
            "recorded_at": consent_at,
            "purpose_code": _enum(rng, ["MARKETING_EMAIL", "SMS", "ANALYTICS", "PERSONALIZATION", "RESEARCH"], n_consent),
            "action_code": _enum(rng, ["GRANTED", "WITHDRAWN", "EXPIRED", "MIGRATED"], n_consent, [0.68, 0.16, 0.06, 0.1]),
            "collection_channel_code": _enum(rng, ["WEB", "APP", "PHONE", "IMPORT", "PAPER"], n_consent),
            "policy_version": _enum(rng, ["2023.1", "2024.1", "2024.2", "2025.1"], n_consent),
            "evidence_token": np.array([f"CNS-{x:012d}" for x in range(1, n_consent + 1)]),
            "source_system_code": _enum(rng, ["CONSENT_HUB", "CRM", "LEGACY_CRM"], n_consent),
        },
        description="Append-only account consent and withdrawal events by purpose.", grain="One consent-state change for one account and purpose.",
        primary_key=["consent_event_id"], foreign_keys=[_fk("account_id", "crm.account")],
        owner="Privacy Office", sensitivity="restricted", reliability="caution",
        quality_notes=["Current consent must be derived in event time by purpose; action rows are not a current-state snapshot."],
    )
    n_delete = 9_500
    request_at = random_timestamps(rng, n_delete)
    due_at = request_at + rng.integers(20, 46, n_delete).astype("timedelta64[D]")
    builder.write(
        "trust", "privacy_request",
        {
            "privacy_request_id": np.arange(1, n_delete + 1, dtype=np.int64),
            "account_id": rng.choice(c["account_id"], n_delete),
            "request_type_code": _enum(rng, ["ACCESS", "DELETE", "CORRECT", "RESTRICT", "PORTABILITY"], n_delete),
            "requested_at": request_at,
            "statutory_due_at": due_at,
            "completed_at": nullable(due_at + rng.integers(-8, 24, n_delete).astype("timedelta64[D]"), rng.random(n_delete) < 0.12),
            "status_code": _enum(rng, ["COMPLETED", "IN_PROGRESS", "DENIED", "IDENTITY_CHECK"], n_delete, [0.82, 0.09, 0.04, 0.05]),
            "jurisdiction_code": _enum(rng, ["US-GENERAL", "CA", "VA", "CO", "CT", "CANADA"], n_delete),
            "case_owner_employee_id": rng.choice(c["employee_id"], n_delete),
        },
        description="Synthetic privacy rights requests and fulfillment status.", grain="One privacy request case.",
        primary_key=["privacy_request_id"],
        foreign_keys=[_fk("account_id", "crm.account"), _fk("case_owner_employee_id", "workforce.employee", "employee_id")],
        owner="Privacy Office", sensitivity="restricted",
    )
    n_access = 540_000
    accessed_at = random_timestamps(rng, n_access)
    builder.write(
        "trust", "data_access_log",
        {
            "data_access_log_id": np.arange(1, n_access + 1, dtype=np.int64),
            "employee_id": rng.choice(c["employee_id"], n_access),
            "accessed_at": accessed_at,
            "asset_name": _enum(rng, ["crm.account", "billing.invoice", "support.message", "iot.sensor_reading", "platform.account_feature_snapshot"], n_access),
            "action_code": _enum(rng, ["SELECT", "EXPORT", "UPDATE", "DELETE", "ADMIN"], n_access, [0.79, 0.11, 0.06, 0.01, 0.03]),
            "row_count_estimate": rng.lognormal(5, 2.1, n_access).clip(1, 5_000_000).astype(np.int64),
            "client_application_code": _enum(rng, ["BI", "NOTEBOOK", "SERVICE", "ADMIN_UI", "SQL_CLIENT"], n_access),
            "approved_purpose_code": _enum(rng, ["OPERATIONS", "SUPPORT", "ANALYTICS", "AUDIT", "UNKNOWN"], n_access),
            "break_glass_flag": rng.random(n_access) < 0.002,
            "ip_risk_band": _enum(rng, ["LOW", "MEDIUM", "HIGH"], n_access, [0.95, 0.045, 0.005]),
        },
        description="Synthetic audit log of governed employee access to data products.", grain="One logical access event.",
        primary_key=["data_access_log_id"], foreign_keys=[_fk("employee_id", "workforce.employee", "employee_id")],
        owner="Security", sensitivity="restricted", reliability="caution",
        quality_notes=["row_count_estimate is produced by clients and is not authoritative usage metering."],
    )


def _generate_platform(builder):
    c = builder.context
    rng = rng_for("platform")
    source_names = np.array([
        "crm-postgres", "billing-core", "care-zendesk", "iot-kafka", "field-mobile", "warehouse-erp",
        "fleet-telematics", "web-events", "identity", "consent-hub", "finance-erp", "weather-provider",
        "traffic-provider", "hris", "learning-platform", "feature-store",
    ])
    n_source = len(source_names)
    source_id = np.arange(1, n_source + 1, dtype=np.int16)
    builder.write(
        "platform", "source_registry",
        {
            "source_id": source_id,
            "source_name": source_names,
            "source_type_code": _enum(rng, ["DATABASE", "API", "STREAM", "SFTP", "SAAS"], n_source),
            "owner_team_code": _enum(rng, ["DATA", "CARE", "FINANCE", "IOT", "FIELD", "SECURITY"], n_source),
            "expected_latency_minutes": rng.integers(1, 1441, n_source, dtype=np.int32),
            "contains_restricted_data_flag": rng.random(n_source) < 0.5,
            "active_flag": np.ones(n_source, dtype=bool),
        },
        description="Registry of operational and third-party data sources.", grain="One source system or provider integration.",
        primary_key=["source_id"], owner="Data Platform",
    )
    n_pipeline = 72
    pipeline_id = np.arange(1, n_pipeline + 1, dtype=np.int16)
    builder.write(
        "platform", "pipeline",
        {
            "pipeline_id": pipeline_id,
            "pipeline_name": np.array([f"pipeline_{x:03d}" for x in pipeline_id]),
            "source_id": rng.choice(source_id, n_pipeline),
            "target_layer_code": _enum(rng, ["RAW", "STAGING", "CURATED", "FEATURE", "REPORTING"], n_pipeline),
            "schedule_code": _enum(rng, ["5_MIN", "HOURLY", "DAILY", "WEEKLY", "EVENT"], n_pipeline),
            "sla_minutes": rng.integers(5, 1441, n_pipeline, dtype=np.int32),
            "owner_team_code": _enum(rng, ["DATA_ENG", "ANALYTICS_ENG", "ML_PLATFORM", "DOMAIN"], n_pipeline),
            "criticality_code": _enum(rng, ["TIER0", "TIER1", "TIER2", "TIER3"], n_pipeline),
            "active_flag": rng.random(n_pipeline) > 0.04,
        },
        description="Batch and streaming pipeline definitions with operational ownership.", grain="One logical data pipeline.",
        primary_key=["pipeline_id"], foreign_keys=[_fk("source_id", "platform.source_registry")], owner="Data Platform",
    )
    n_run = 92_000
    pipeline_run_id = np.arange(1, n_run + 1, dtype=np.int64)
    started = random_timestamps(rng, n_run)
    failed = rng.random(n_run) < 0.035
    builder.write(
        "platform", "pipeline_run",
        {
            "pipeline_run_id": pipeline_run_id,
            "pipeline_id": rng.choice(pipeline_id, n_run),
            "started_at": started,
            "ended_at": started + rng.integers(1, 420, n_run).astype("timedelta64[m]"),
            "status_code": np.where(failed, _enum(rng, ["FAILED", "CANCELLED", "TIMEOUT"], n_run), "SUCCEEDED"),
            "input_row_count": rng.lognormal(9, 2, n_run).clip(0, 50_000_000).astype(np.int64),
            "output_row_count": rng.lognormal(9, 2, n_run).clip(0, 50_000_000).astype(np.int64),
            "retry_number": rng.choice([0, 0, 0, 0, 1, 2], n_run).astype(np.int16),
            "compute_seconds": rng.lognormal(5, 1, n_run).astype(np.float32),
            "orchestrator_run_key": np.array([f"RUN-{x:012d}" for x in pipeline_run_id]),
            "error_class": nullable(_enum(rng, ["UPSTREAM", "SCHEMA", "TIMEOUT", "CAPACITY", "CODE"], n_run), ~failed),
        },
        description="Execution history for registered data pipelines.", grain="One orchestrator attempt for one pipeline.",
        primary_key=["pipeline_run_id"], foreign_keys=[_fk("pipeline_id", "platform.pipeline")],
        owner="Data Platform", reliability="verified",
    )
    n_quality = 260_000
    quality_time = random_timestamps(rng, n_quality)
    builder.write(
        "platform", "data_quality_result",
        {
            "data_quality_result_id": np.arange(1, n_quality + 1, dtype=np.int64),
            "pipeline_run_id": rng.choice(pipeline_run_id, n_quality),
            "checked_at": quality_time,
            "asset_name": _enum(rng, ["crm.account", "billing.invoice", "support.ticket", "iot.sensor_reading", "field_ops.work_order", "supply.inventory_movement"], n_quality),
            "check_name": _enum(rng, ["not_null", "unique", "accepted_values", "freshness", "volume", "referential_integrity", "distribution_shift"], n_quality),
            "dimension_code": _enum(rng, ["COMPLETENESS", "UNIQUENESS", "VALIDITY", "TIMELINESS", "CONSISTENCY"], n_quality),
            "status_code": _enum(rng, ["PASS", "WARN", "FAIL", "ERROR"], n_quality, [0.89, 0.075, 0.028, 0.007]),
            "observed_value": rng.lognormal(0, 1.2, n_quality).astype(np.float32),
            "threshold_value": rng.lognormal(0, 1.0, n_quality).astype(np.float32),
            "sample_row_count": rng.integers(1_000, 2_000_000, n_quality, dtype=np.int64),
            "incident_ticket": nullable(np.array([f"DQ-{x % 15000:07d}" for x in range(n_quality)]), rng.random(n_quality) < 0.94),
        },
        description="Automated and sampled quality checks emitted by pipeline runs.", grain="One check result for one asset in one run.",
        primary_key=["data_quality_result_id"], foreign_keys=[_fk("pipeline_run_id", "platform.pipeline_run")],
        owner="Data Reliability", reliability="caution",
        quality_notes=["A PASS is evidence about a named check, not certification of an entire asset."],
    )

    n_model = 18
    model_id = np.arange(1, n_model + 1, dtype=np.int16)
    model_names = np.array([
        "churn_risk", "payment_failure", "work_order_duration", "first_time_fix", "asset_failure_30d",
        "ticket_escalation", "inventory_stockout", "route_duration", "lead_conversion", "lifetime_value",
        "csat_low_score", "fraud_review", "appointment_no_show", "demand_forecast", "parts_recommendation",
        "email_propensity", "renewal_offer", "technician_capacity",
    ])
    builder.write(
        "platform", "model_registry",
        {
            "model_id": model_id,
            "model_name": model_names,
            "business_owner_team": _enum(rng, ["CARE", "FIELD", "FINANCE", "GROWTH", "SUPPLY", "PRODUCT"], n_model),
            "model_type_code": _enum(rng, ["BINARY", "REGRESSION", "FORECAST", "RANKING"], n_model),
            "decision_criticality_code": _enum(rng, ["LOW", "MEDIUM", "HIGH"], n_model),
            "current_stage_code": _enum(rng, ["PRODUCTION", "SHADOW", "DEVELOPMENT", "RETIRED"], n_model),
            "human_review_required_flag": rng.random(n_model) < 0.44,
            "registered_date": random_dates(rng, n_model),
        },
        description="Registry of analytical models and decision-support systems.", grain="One logical model product.",
        primary_key=["model_id"], owner="ML Governance", sensitivity="confidential",
    )
    n_version = 76
    model_version_id = np.arange(1, n_version + 1, dtype=np.int32)
    version_model = rng.choice(model_id, n_version)
    builder.write(
        "platform", "model_version",
        {
            "model_version_id": model_version_id,
            "model_id": version_model,
            "semantic_version": np.array([f"{1 + x % 4}.{x % 12}.{x % 7}" for x in model_version_id]),
            "trained_at": random_timestamps(rng, n_version),
            "training_cutoff_date": random_dates(rng, n_version, "2023-03-01", "2025-11-01"),
            "algorithm_code": _enum(rng, ["LOGISTIC", "RANDOM_FOREST", "XGBOOST", "LIGHTGBM", "ELASTIC_NET", "PROPHET"], n_version),
            "feature_set_version": np.array([f"FS-{x % 14:02d}" for x in model_version_id]),
            "git_commit_short": np.array([f"{int(x) * 982451653 % 16**8:08x}" for x in model_version_id]),
            "approval_state_code": _enum(rng, ["APPROVED", "PENDING", "REJECTED", "EXPIRED"], n_version),
            "validation_auc": rng.uniform(0.56, 0.91, n_version).astype(np.float32),
            "validation_rmse": rng.uniform(0.08, 1.8, n_version).astype(np.float32),
        },
        description="Versioned model artifacts with training lineage and validation summaries.", grain="One trained model version.",
        primary_key=["model_version_id"], foreign_keys=[_fk("model_id", "platform.model_registry")],
        owner="ML Platform", sensitivity="confidential",
    )

    n_snapshot = 165_000
    snapshot_account = rng.choice(c["account_id"], n_snapshot)
    snapshot_at = random_timestamps(rng, n_snapshot, "2024-01-01", "2025-12-31")
    wide = {
        "account_feature_snapshot_id": np.arange(1, n_snapshot + 1, dtype=np.int64),
        "account_id": snapshot_account,
        "feature_as_of_at": snapshot_at,
        "feature_set_version": _enum(rng, ["FS-09", "FS-10", "FS-11", "FS-12", "FS-13"], n_snapshot),
        "source_watermark_at": snapshot_at - rng.integers(0, 96, n_snapshot).astype("timedelta64[h]"),
        "region_id": rng.choice(c["region_id"], n_snapshot),
        "account_tenure_days": rng.integers(1, 5_000, n_snapshot, dtype=np.int32),
        "active_site_count": rng.poisson(1.4, n_snapshot).astype(np.int16),
        "active_subscription_count": rng.poisson(1.2, n_snapshot).astype(np.int16),
        "current_monthly_value_cents": rng.integers(0, 90_000, n_snapshot, dtype=np.int64),
    }
    domains = [
        "billing", "payment", "order", "service", "asset", "alert", "ticket", "message", "visit", "route",
        "inventory", "marketing", "web", "consent", "weather", "product", "technician", "quality", "renewal", "usage",
    ]
    windows = [1, 3, 7, 14, 30, 60, 90, 180, 365, 730]
    for domain in domains:
        for window in windows:
            feature_name = f"{domain}_{window}d_value"
            if domain in {"payment", "order", "service", "alert", "ticket", "message", "visit", "route", "consent"}:
                wide[feature_name] = rng.poisson(max(0.2, window / 45), n_snapshot).astype(np.int16)
            elif domain in {"weather", "quality", "product", "technician", "renewal"}:
                wide[feature_name] = rng.normal(0, 1, n_snapshot).astype(np.float32)
            else:
                wide[feature_name] = rng.gamma(2, max(0.5, window / 30), n_snapshot).astype(np.float32)
    wide["future_90d_cancelled_flag"] = rng.random(n_snapshot) < 0.08
    wide["future_90d_payment_failure_count"] = rng.poisson(0.12, n_snapshot).astype(np.int16)
    wide["eventual_lifetime_value_cents"] = rng.integers(5_000, 8_000_000, n_snapshot, dtype=np.int64)
    builder.write(
        "platform", "account_feature_snapshot", wide,
        description="Wide point-in-time account feature store with outcomes intentionally co-located for auditing exercises.",
        grain="One account at one feature-as-of timestamp; multiple snapshots per account are expected.",
        primary_key=["account_feature_snapshot_id"], foreign_keys=[_fk("account_id", "crm.account")],
        owner="ML Platform", sensitivity="restricted", reliability="caution",
        use_when="Point-in-time feature inspection after checking source watermarks and excluding outcome columns.",
        do_not_use_when="Selecting columns by convenience for a training cutoff or claiming a current customer state.",
        quality_notes=[
            "The final three columns are future outcomes and constitute target leakage if used as predictors.",
            "Some upstream features arrive up to 96 hours after their event; source_watermark_at records availability.",
        ],
    )
    n_prediction = 370_000
    prediction_id = np.arange(1, n_prediction + 1, dtype=np.int64)
    pred_model_version = rng.choice(model_version_id, n_prediction)
    pred_model = version_model[pred_model_version - 1]
    score = rng.beta(2, 5, n_prediction).astype(np.float32)
    prediction_at = random_timestamps(rng, n_prediction, "2024-01-01", "2025-12-31")
    builder.write(
        "platform", "model_prediction",
        {
            "model_prediction_id": prediction_id,
            "model_version_id": pred_model_version,
            "model_id": pred_model,
            "account_id": rng.choice(c["account_id"], n_prediction),
            "prediction_at": prediction_at,
            "feature_as_of_at": prediction_at - rng.integers(0, 48, n_prediction).astype("timedelta64[h]"),
            "prediction_score": score,
            "predicted_class": (score >= 0.42),
            "decision_threshold": np.full(n_prediction, 0.42, dtype=np.float32),
            "decision_code": np.where(score >= 0.72, "PRIORITY_ACTION", np.where(score >= 0.42, "STANDARD_ACTION", "NO_ACTION")),
            "experiment_arm_code": _enum(rng, ["CONTROL", "MODEL", "RULES"], n_prediction, [0.1, 0.8, 0.1]),
            "explanation_top_feature": _enum(rng, ["payment_30d_value", "ticket_90d_value", "asset_30d_value", "billing_180d_value", "usage_7d_value"], n_prediction),
            "latency_ms": rng.lognormal(3.2, 0.8, n_prediction).astype(np.float32),
            "request_trace_id": np.array([f"TRC-{x:012d}" for x in prediction_id]),
        },
        description="Online and batch model scores with version, threshold, and decision lineage.", grain="One scored account request by one model version.",
        primary_key=["model_prediction_id"],
        foreign_keys=[_fk("model_version_id", "platform.model_version"), _fk("model_id", "platform.model_registry"), _fk("account_id", "crm.account")],
        owner="ML Platform", sensitivity="restricted",
    )
    builder.add_anomaly(
        anomaly_id="A13", name="Future-outcome columns in feature extract",
        affected_tables=["platform.account_feature_snapshot"], date_range="2024-01-01/2025-12-31",
        mechanism="A convenience export places realized outcomes beside point-in-time features.",
        breadcrumb="Columns prefixed future_ and eventual_ appear at the end of the table.",
        learning_objective="Build an explicit predictor allow-list and reason about observation availability.",
    )
