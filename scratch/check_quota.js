import { supabase } from "../src/supabaseClient";

async function checkColumns() {
  const { data, error } = await supabase.from("yearly_quota").select("*").limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log(Object.keys(data[0] || {}));
  }
}

checkColumns();
