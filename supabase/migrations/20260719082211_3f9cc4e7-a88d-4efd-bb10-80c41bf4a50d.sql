
REVOKE ALL ON FUNCTION public.purge_expired_chats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_chat_expiry() FROM PUBLIC, anon, authenticated;
