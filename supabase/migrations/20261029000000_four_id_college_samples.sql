alter table public.id_college_samples
  drop constraint id_college_samples_slot_check,
  add constraint id_college_samples_slot_check check (slot between 1 and 4);
