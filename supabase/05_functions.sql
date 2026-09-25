-- ============================================================================
-- ORDER NUMBER GENERATOR
-- Produces sequential, human-readable order numbers like PM-260921-0001
-- ============================================================================

create sequence if not exists order_number_seq;

create or replace function generate_order_number()
returns text
language plpgsql
as $$
declare
  next_val bigint;
  begin
    next_val := nextval('order_number_seq');
      return 'PM-' || to_char(now(), 'YYMMDD') || '-' || lpad(next_val::text, 4, '0');
      end;
      $$;

      -- Auto-fill order_number on insert if not provided
      create or replace function set_order_number()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.order_number is null or new.order_number = '' then
            new.order_number := generate_order_number();
              end if;
                return new;
                end;
                $$;

                create trigger trg_orders_order_number
                  before insert on orders
                    for each row execute function set_order_number();

                    -- Log every order status change into order_status_events automatically
                    create or replace function log_order_status_change()
                    returns trigger
                    language plpgsql
                    as $$
                    begin
                      if (tg_op = 'INSERT') or (old.order_status is distinct from new.order_status) then
                          insert into order_status_events (order_id, status, created_by)
                              values (new.id, new.order_status::text, auth.uid());
                                end if;
                                  return new;
                                  end;
                                  $$;

                                  create trigger trg_orders_status_log
                                    after insert or update on orders
                                      for each row execute function log_order_status_change();

                                      -- ============================================================================
                                      -- AUTO-CREATE PACKING TASK once an order is confirmed (COD orders are
                                      -- confirmed immediately; UPI QR orders reach 'confirmed' after payment
                                      -- verification — see app/actions/payments.ts). Runs as owner (security
                                      -- definer) so it works regardless of the customer's own RLS grants.
                                      -- ============================================================================

                                      create or replace function create_packing_task_on_order_confirm()
                                      returns trigger
                                      language plpgsql
                                      security definer
                                      set search_path = public
                                      as $$
                                      begin
                                        if new.order_status = 'confirmed' and
                                             (tg_op = 'INSERT' or old.order_status is distinct from 'confirmed') then
                                                 insert into packing_tasks (order_id, status)
                                                     values (new.id, 'pending_packing')
                                                         on conflict do nothing;
                                                           end if;
                                                             return new;
                                                             end;
                                                             $$;

                                                             create trigger trg_orders_create_packing_task
                                                               after insert or update on orders
                                                                 for each row execute function create_packing_task_on_order_confirm();
                                                                 