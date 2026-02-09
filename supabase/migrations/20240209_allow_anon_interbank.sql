-- Enable RLS
ALTER TABLE "public"."interbank_rates" ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert
CREATE POLICY "Enable insert for anon (public) users" ON "public"."interbank_rates"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

-- Allow anonymous update
CREATE POLICY "Enable update for anon (public) users" ON "public"."interbank_rates"
AS PERMISSIVE FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
