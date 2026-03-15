INSERT INTO storage.buckets (id, name, public) VALUES ('bot-images', 'bot-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read bot-images" ON storage.objects FOR SELECT USING (bucket_id = 'bot-images');
CREATE POLICY "Auth insert bot-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'bot-images');
CREATE POLICY "Auth update bot-images" ON storage.objects FOR UPDATE USING (bucket_id = 'bot-images');
CREATE POLICY "Auth delete bot-images" ON storage.objects FOR DELETE USING (bucket_id = 'bot-images');