const SUPABASE_URL = "https://fotcnfwkzncsxbbvpdpw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdGNuZndrem5jc3hiYnZwZHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY0MDgsImV4cCI6MjA4ODA2MjQwOH0.0Y1OazcLFBP_FOg-_CIodPbt7-eepZ7CIDaib4E-XK0";

const headers = (extra = {}) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  ...extra,
});

const jsonHeaders = headers({ "Content-Type": "application/json", Prefer: "return=representation" });

async function request(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: opts.body ? jsonHeaders : headers(),
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  if (opts.method === "DELETE") return true;
  return res.json();
}

const supabase = {
  from: (table) => ({
    select:      (cols = "*") => request(`${table}?select=${encodeURIComponent(cols)}`),
    insert:      (rows)       => request(table, { method: "POST", body: JSON.stringify(Array.isArray(rows) ? rows : [rows]) }),
    update:      (id, data)   => request(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete:      (id)         => request(`${table}?id=eq.${id}`, { method: "DELETE" }),
    deleteWhere: (col, val)   => request(`${table}?${col}=eq.${val}`, { method: "DELETE" }),
  }),
};

export default supabase;
