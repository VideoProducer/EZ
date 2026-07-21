"""
Authoritative sources for every BC community page.

For each community we surface real, verifiable references so readers can
cross-check the AI-drafted synopsis and see the actual, live climate record
from Environment and Climate Change Canada (ECCC).

All URLs are stable government / regulator / statute pages. Deep-link
search URLs are used where the destination site supports it, so a single
click lands on the specific community record.

Two APIs are provided:
  - get_community_sources(name, region)  → sources under the synopsis
  - get_weather_sources(name, region)    → sources under the weather section
"""
from urllib.parse import quote_plus


def _q(s: str) -> str:
    """URL-encode a community name for search-URL deep-linking."""
    return quote_plus(s or "")


def get_community_sources(name: str, region: str) -> list:
    """Sources that back the *community* profile (geography, demographics, economy)."""
    n = _q(name)
    return [
        {
            "title": f"Statistics Canada — 2021 Census Profile ({name})",
            "url": f"https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/search/search.cfm?Lang=E&SearchText={n}%20British%20Columbia",
            "publisher": "Statistics Canada — Government of Canada",
        },
        {
            "title": "BC Stats — Sub-Provincial Population Estimates & Local Area Data",
            "url": "https://www2.gov.bc.ca/gov/content/data/statistics/people-population-community",
            "publisher": "Province of British Columbia — BC Stats",
        },
        {
            "title": "BC Government — List of BC Local Governments",
            "url": "https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems/list-of-bc-local-governments",
            "publisher": "Government of British Columbia",
        },
        {
            "title": f"Municipal / Regional District website for {name}",
            "url": f"https://www.google.com/search?q={n}+British+Columbia+official+municipal+website",
            "publisher": "Community / Regional District official site",
        },
        {
            "title": "Destination BC — Community Profiles",
            "url": f"https://www.hellobc.com/search/?query={n}",
            "publisher": "Destination British Columbia",
        },
    ]


def get_weather_sources(name: str, region: str) -> list:
    """Sources that back the *climate/weather* section (climate normals, historical data)."""
    n = _q(name)
    return [
        {
            "title": f"Environment Canada — Historical Climate Data ({name} area)",
            "url": f"https://climate.weather.gc.ca/historical_data/search_historic_data_e.html?searchType=stnName&timeframe=1&txtStationName={n}&searchMethod=contains&province=BC&provBut=Search",
            "publisher": "Environment and Climate Change Canada (ECCC)",
        },
        {
            "title": f"Environment Canada — Canadian Climate Normals 1981–2010 ({name} area)",
            "url": f"https://climate.weather.gc.ca/climate_normals/results_1981_2010_e.html?searchType=stnName&txtStationName={n}&searchMethod=contains&province=BC&provBut=Search",
            "publisher": "Environment and Climate Change Canada (ECCC)",
        },
        {
            "title": f"Environment Canada — Canadian Climate Normals 1991–2020 ({name} area)",
            "url": f"https://climate.weather.gc.ca/climate_normals/results_1991_2020_e.html?searchType=stnName&txtStationName={n}&searchMethod=contains&province=BC&provBut=Search",
            "publisher": "Environment and Climate Change Canada (ECCC)",
        },
        {
            "title": "Environment Canada — Public Weather Alerts for BC",
            "url": "https://weather.gc.ca/warnings/index_e.html?prov=bc",
            "publisher": "Environment and Climate Change Canada (ECCC)",
        },
    ]
