-- Allow anonymous users (using the public key) to insert bond data
-- Required because the ingestion script uses the public key found in the project.

create policy "Enable insert for anon key"
on gov_yield_curve for insert
with check (true);

-- Optional: Allow update/delete if needed
create policy "Enable update for anon key"
on gov_yield_curve for update
using (true);
