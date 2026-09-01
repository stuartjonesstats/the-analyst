# Case-pack validation: progression cases 04–06

**Status: PASS**

3 cases / 25 exact checks / 0 failures.

| Result | Case | Check | Detail |
|---|---|---|---|
| PASS | `rollback-before-dawn` | manifest hashes, row counts, and byte counts match every Parquet | files=14; rows=193,898; bytes=7,205,974 |
| PASS | `rollback-before-dawn` | DuckDB and Python mappings resolve to the same public files | mapped_tables=14 |
| PASS | `the-730-capacity-call` | manifest hashes, row counts, and byte counts match every Parquet | files=15; rows=91,946; bytes=3,064,869 |
| PASS | `the-730-capacity-call` | DuckDB and Python mappings resolve to the same public files | mapped_tables=15 |
| PASS | `forty-eight-hours-of-stock` | manifest hashes, row counts, and byte counts match every Parquet | files=14; rows=1,056,905; bytes=19,783,206 |
| PASS | `forty-eight-hours-of-stock` | DuckDB and Python mappings resolve to the same public files | mapped_tables=14 |
| PASS | `rollback-before-dawn` | asset denominator is balanced, unique, and independent of received telemetry | assets=18,000; per_region={'REG001': 3000, 'REG002': 3000, 'REG003': 3000, 'REG004': 3000, 'REG005': 3000, 'REG006': 3000} |
| PASS | `rollback-before-dawn` | asset, sensor, reading, and alert keys close without orphans | assets=21,823; sensors=27,549; readings=41,224; alerts=6,297 |
| PASS | `rollback-before-dawn` | silent assets remain visible in the incident denominator | incident_readings=2,829; silent_assets=15,567 |
| PASS | `rollback-before-dawn` | firmware transition and post-cutoff leakage candidates are both retained | firmware=[4, 5]; post_cutoff_telemetry=13,506; future_labels=19,741 |
| PASS | `rollback-before-dawn` | the incident weather footprint resolves to the three exposed regions | severe_winter_rows=1,008; regions=['REG001', 'REG002', 'REG003'] |
| PASS | `rollback-before-dawn` | work-order event fanout is complete and must be reconciled before joining | work_orders=2,886; status_events=17,316; min_max_events=6..6 |
| PASS | `the-730-capacity-call` | current roster is exact, unique, and outcome-withheld | roster_rows=7; forbidden_columns_present=[] |
| PASS | `the-730-capacity-call` | appointment, work order, visit, status, and privacy-safe geography close relationally | appointments=3,517; work_orders=3,517; visits=3,517; status_events=21,102 |
| PASS | `the-730-capacity-call` | event fanout and matured first-arrival target are both non-degenerate | event_fanout=6..6; matured=2,530; breach_rate=0.212253 |
| PASS | `the-730-capacity-call` | retrospective source retains forbidden fields so point-in-time discipline is testable | completed_at=2,555; final_resolution_code=3,517; visit_arrival=3,517; realized_storm=32 |
| PASS | `the-730-capacity-call` | traffic provider revisions are retained at an explicit revision grain | revised_area_hours=393; max_revisions=3 |
| PASS | `the-730-capacity-call` | approved bulletin publishes capacity and action limits without employee-level absence data | roster=7; reviews=4; contacts=3 |
| PASS | `forty-eight-hours-of-stock` | 2,400 scanner replays form exact one-to-one linked technical pairs | replays=2,400; distinct_originals=2,400; physical=517,600; openings=2,160; invalid=0; flag_link=0 |
| PASS | `forty-eight-hours-of-stock` | split and rejected receipts post accepted quantity exactly once | receipts=82,000; rejected_rows=11,573; invalid_rejections=0; split_lines=16,080; movement_mismatches=0 |
| PASS | `forty-eight-hours-of-stock` | purchase-order status reconciles to accepted line quantity | status_mismatches=0 |
| PASS | `forty-eight-hours-of-stock` | 330,000 sparse positions have a unique grain and reconcile to physical on-hand | positions=330,000; complete_spine_rows=2,367,360; on_hand_mismatches=0 |
| PASS | `forty-eight-hours-of-stock` | intermittent active days and winter/summer seasonality survive extraction | inactive_day_violations=0; winter=16.037/5.330; summer=14.674/5.534 |
| PASS | `forty-eight-hours-of-stock` | realized final-receipt lead time varies around promise | received_lines=65,920; early=20,214; >7d_late=12,478; distinct=81; range=1..83 |
| PASS | `forty-eight-hours-of-stock` | watchlist mixes demand families and approved opening balances recompute exactly | watchlist=30; products=27; families=5; under_48h=2; opening_rows=81 |
