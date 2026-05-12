alter type public.user_list_tag_type add value 'assistir_com';

alter table public.user_list_tags
  add column partner_user_id uuid references auth.users(id) on delete set null;

alter table public.user_list_tags
  add constraint check_partner_only_for_assistir_com
  check (
    (tag = 'assistir_com' and partner_user_id is not null)
    or (tag != 'assistir_com' and partner_user_id is null)
  );
