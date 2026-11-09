// Calls a Supabase Edge Function (deployed in the same project as VITE_SUPABASE_URL)
// Returns { success: true, data } or { success: false, error }
export const callEdgeFunction = async (functionName, body = {}, queryParams = {}) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY is not set in .env");
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const base = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
    const query = new URLSearchParams(
      Object.entries(queryParams).filter(([, v]) => v !== undefined && v !== null)
    ).toString();
    const url = `${base}/functions/v1/${functionName}${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : { message: await response.text() };

    if (!response.ok) {
      throw new Error(
        data?.error?.message || data?.error || data?.message ||
          `${functionName} failed: ${response.status} ${response.statusText}`
      );
    }

    console.log(`${functionName} succeeded:`, data);
    return { success: true, data };
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    return { success: false, error: error.message };
  }
};

export default callEdgeFunction;
