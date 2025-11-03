update public.conversations c
set preview = sub.first_message,
    title = coalesce(c.title, sub.first_message),
    last_message_at = coalesce(c.last_message_at, sub.last_sent_at)
from (
  select conversation_id,
         min(created_at) filter (where role = 'user') as first_user_created,
         (array_agg(content order by created_at))[1] filter (where role = 'user') as first_message,
         max(created_at) as last_sent_at
  from public.messages
  group by conversation_id
) sub
where sub.conversation_id = c.id
  and sub.first_message is not null;
