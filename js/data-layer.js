export async function fetchTop3Events(client) {
  return client
    .from("event_vote_counts")
    .select("event_id,votes,events(title,country_code,is_active)")
    .order("votes", { ascending: false })
    .limit(3);
}

export async function fetchUserVotesForEvents(client, userId, eventIds) {
  return client
    .from("votes")
    .select("event_id")
    .eq("user_id", userId)
    .in("event_id", eventIds);
}

export async function fetchEventById(client, eventId) {
  return client
    .from("events")
    .select("id,title,description,country_code,is_active,ends_at,created_at")
    .eq("id", eventId)
    .single();
}

export async function fetchEventResults(client, eventIds) {
  return client.rpc("get_event_results", { event_ids: eventIds });
}

export async function fetchCountryTopEvent(client, eventIds) {
  return client
    .from("event_vote_counts")
    .select("event_id,votes")
    .in("event_id", eventIds)
    .order("votes", { ascending: false })
    .limit(1);
}

export async function fetchContinents(client) {
  return client
    .from("continents")
    .select("id,name,code")
    .order("id", { ascending: true });
}

export async function fetchCountries(client) {
  return client
    .from("countries")
    .select("code,name,continent_id")
    .order("name", { ascending: true });
}

export async function searchEvents(client, term, limit = 8) {
  return client
    .from("events")
    .select("id,title,country_code")
    .ilike("title", `%${term}%`)
    .limit(limit);
}


export async function fetchCountryStatsEvents(client) {
  return client
    .from("events")
    .select("id,country_code");
}

export async function fetchCountryStatsVotes(client) {
  return client
    .from("event_vote_counts")
    .select("votes,events(country_code)");
}

export async function insertVote(client, payload) {
  return client.from("votes").insert(payload);
}

export async function fetchEventsByCountry(client, countryCode) {
  return client
    .from("events")
    .select("id,title,description,country_code,is_active,is_top,ends_at,created_at")
    .eq("country_code", countryCode)
    .order("created_at", { ascending: false });
}
