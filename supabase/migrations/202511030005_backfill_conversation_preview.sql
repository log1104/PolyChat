update public.conversations c
set preview = sub.first_message,
    title = coalesce(c.title, sub.first_message),
    last_message_at = coalesce(c.last_message_at, sub.last_sent_at)
from (
  select conversation_id,
         min(CASE WHEN role = 'user' THEN created_at END) as first_user_created,
         (array_agg(CASE WHEN role = 'user' THEN content END ORDER BY created_at))[1] as first_message,
         max(created_at) as last_sent_at
  from public.messages
  group by conversation_id
) sub
where sub.conversation_id = c.id
  and sub.first_message is not null;
