-- Cover foreign keys flagged by Supabase performance advisors.

create index if not exists score_snapshots_symbol_id_idx
  on public.score_snapshots (symbol_id);

create index if not exists storyline_sets_symbol_id_idx
  on public.storyline_sets (symbol_id);

create index if not exists storyline_sets_input_score_snapshot_id_idx
  on public.storyline_sets (input_score_snapshot_id);

create index if not exists storyline_sets_llm_run_id_idx
  on public.storyline_sets (llm_run_id);

create index if not exists storyline_outcomes_storyline_scenario_id_idx
  on public.storyline_outcomes (storyline_scenario_id);

create index if not exists storyline_revisions_previous_storyline_set_id_idx
  on public.storyline_revisions (previous_storyline_set_id);

create index if not exists storyline_revisions_new_storyline_set_id_idx
  on public.storyline_revisions (new_storyline_set_id);

create index if not exists user_decisions_score_snapshot_id_idx
  on public.user_decisions (score_snapshot_id);

create index if not exists user_decisions_storyline_set_id_idx
  on public.user_decisions (storyline_set_id);

create index if not exists review_events_score_snapshot_id_idx
  on public.review_events (score_snapshot_id);

create index if not exists review_events_storyline_set_id_idx
  on public.review_events (storyline_set_id);

create index if not exists data_quality_observations_analysis_run_id_idx
  on public.data_quality_observations (analysis_run_id);
